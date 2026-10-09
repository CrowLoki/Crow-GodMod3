import {createCipheriv, createDecipheriv, randomBytes, randomUUID, createHash} from 'node:crypto';
import {streamOriginalText} from './crowbot/upstream/original_text.js';

const AUTH = 'https://auth.openai.com';
const CODEX = 'https://chatgpt.com/backend-api/codex';
const CLIENT = 'app_EMoamEEZ73f0CkXaXp7hrann'; // Public Codex device-flow client, as used by Hermes.
const MAX_BODY = 4 * 1024 * 1024;

export class ApiError extends Error {
  constructor(code, status = 400) { super(code); this.code = code; this.status = status; }
}

function key(secret) {
  if (!secret || secret.length < 32) throw new ApiError('membership_session_not_configured', 503);
  return createHash('sha256').update(secret).digest();
}

export function seal(value, name, secret) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(secret), iv);
  cipher.setAAD(Buffer.from(name));
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value)), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64url');
}

export function unseal(value, name, secret) {
  if (typeof value !== 'string' || value.length > 24000 || !/^[A-Za-z0-9_-]+$/.test(value)) return null;
  try {
    const bytes = Buffer.from(value, 'base64url');
    const decipher = createDecipheriv('aes-256-gcm', key(secret), bytes.subarray(0, 12));
    decipher.setAAD(Buffer.from(name));
    decipher.setAuthTag(bytes.subarray(12, 28));
    return JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString());
  } catch { return null; }
}

function cookies(req) {
  return Object.fromEntries(String(req.headers.cookie || '').split(';').map(row => {
    const index = row.indexOf('=');
    return index < 0 ? ['', ''] : [row.slice(0, index).trim(), row.slice(index + 1).trim()];
  }));
}

export function cookie(res, name, value, req, age = 2592000) {
  const secure = !/^(?:127\.0\.0\.1|localhost)(?::\d+)?$/.test(req.headers.host || '');
  const line = `${name}=${value}; Path=/api; HttpOnly; SameSite=Strict; Max-Age=${age}${secure ? '; Secure' : ''}`;
  const current = res.getHeader('Set-Cookie') || [];
  res.setHeader('Set-Cookie', [...(Array.isArray(current) ? current : [current]), line]);
}

function accountCookies(req, secret) {
  const stored = cookies(req), accounts = [];
  for (const name of Object.keys(stored).filter(name => /^cg_account_[a-f0-9-]{36}$/.test(name))) {
    const value = Array.from({length:8}, (_, i) => stored[`${name}_${i}`] || '').join('');
    const account = unseal(value, name, secret);
    if (account?.token && account?.accountId && account?.expiresAt) accounts.push({...account, id:name.slice(11)});
  }
  return {accounts, selected:stored.cg_selected};
}

export function saveAccount(res, account, req, secret) {
  const name = `cg_account_${account.id}`;
  const encrypted = seal(account, name, secret);
  if (encrypted.length > 24000) throw new ApiError('credential_session_too_large');
  cookie(res, name, '1', req);
  for (let i = 0; i < 8; i++) cookie(res, `${name}_${i}`, encrypted.slice(i * 3000, (i + 1) * 3000), req,
    encrypted.length > i * 3000 ? 2592000 : 0);
  cookie(res, 'cg_selected', account.id, req);
}

function selectedAccount(req, secret) {
  const state = accountCookies(req, secret);
  const account = state.accounts.find(row => row.id === state.selected);
  if (!account) throw new ApiError('sign_in_with_chatgpt', 401);
  if (account.expiresAt <= Date.now() + 30000) throw new ApiError('renew_membership_connection', 401);
  return account;
}

function tokenClaims(value) {
  try { return JSON.parse(Buffer.from(value.split('.')[1], 'base64url').toString()); }
  catch { throw new ApiError('invalid_token_response', 502); }
}

export function accountFromTokens(tokens) {
  if (typeof tokens.access_token !== 'string' || !tokens.access_token) throw new ApiError('invalid_token_response', 502);
  // Tokens arrive only from the fixed OpenAI TLS endpoint after device consent.
  // Claims supply routing/display metadata; the backend still verifies the bearer.
  const claims = tokenClaims(tokens.access_token);
  const auth = claims['https://api.openai.com/auth'] || {};
  const identity = tokens.id_token ? tokenClaims(tokens.id_token) : claims;
  if (!auth.chatgpt_account_id) throw new ApiError('account_identity_missing', 502);
  return {id:randomUUID(), token:tokens.access_token, refresh:tokens.refresh_token,
    accountId:auth.chatgpt_account_id, plan:auth.chatgpt_plan_type || 'unknown',
    residency:auth.chatgpt_data_residency || auth.chatgpt_compute_residency || null,
    email:identity.email || claims['https://api.openai.com/profile']?.email || 'ChatGPT account',
    expiresAt:Math.min((claims.exp || Infinity) * 1000, Date.now() + Number(tokens.expires_in || 3600) * 1000)};
}

function identityHeaders(account) {
  return {'Authorization':`Bearer ${account.token}`, 'ChatGPT-Account-ID':account.accountId,
    'originator':'crow-godmod3', 'User-Agent':'Crow-GodMod3/0.1.0',
    ...(account.residency ? {'x-openai-internal-codex-residency':account.residency} : {})};
}

async function boundedJson(response, limit = MAX_BODY) {
  let size = 0; const parts = [];
  for await (const bytes of response.body) {
    size += bytes.length;
    if (size > limit) throw new ApiError('provider_response_limit', 502);
    parts.push(bytes);
  }
  try { return JSON.parse(Buffer.concat(parts).toString()); }
  catch { throw new ApiError('invalid_provider_response', 502); }
}

async function callJson(url, init, fetchImpl, timeout = 20000, limit = MAX_BODY) {
  const response = await fetchImpl(url, {...init, redirect:'error', signal:AbortSignal.timeout(timeout)});
  const value = await boundedJson(response, limit);
  if (!response.ok) throw new ApiError(`provider_http_${response.status}`, [401,403,429].includes(response.status) ? response.status : 502);
  return value;
}

async function catalog(account, fetchImpl) {
  const result = await callJson(`${CODEX}/models?client_version=0.162.0`, {headers:identityHeaders(account)}, fetchImpl);
  if (!Array.isArray(result.models)) throw new ApiError('invalid_model_catalog', 502);
  return result.models.filter(row => row.visibility === 'list').map(row => ({
    id:row.slug, display_name:row.display_name || row.slug, object:'model', owned_by:'ChatGPT membership',
    reasoning_efforts:row.supported_reasoning_levels || [], default_reasoning_effort:row.default_reasoning_level,
    service_tiers:row.service_tiers || [], capabilities:['chat', 'image'],
  }));
}

function requireMessages(body) {
  if (!body || typeof body !== 'object' || !Array.isArray(body.messages) || !body.messages.length) throw new ApiError('invalid_messages');
  if (body.stream !== undefined && typeof body.stream !== 'boolean') throw new ApiError('invalid_stream');
  for (const row of body.messages) {
    if (!row || !['system','user','assistant'].includes(row.role) || !(typeof row.content === 'string' || Array.isArray(row.content))) throw new ApiError('invalid_messages');
  }
  return body.messages;
}

function completion(res, body, text, metadata = {}) {
  const id = `chatcmpl-${randomUUID()}`;
  if (body.stream) {
    res.setHeader('Content-Type','text/event-stream');
    res.write(`data: ${JSON.stringify({id,object:'chat.completion.chunk',model:body.model,
      choices:[{index:0,delta:{content:text},finish_reason:null}],crowgodmod3:metadata})}\n\n`);
    res.write(`data: ${JSON.stringify({id,object:'chat.completion.chunk',model:body.model,
      choices:[{index:0,delta:{},finish_reason:'stop'}]})}\n\ndata: [DONE]\n\n`);
    res.end();
  } else send(res, {id,object:'chat.completion',model:body.model,crowgodmod3:metadata,
    choices:[{index:0,message:{role:'assistant',content:text},finish_reason:'stop'}]});
}

function send(res, value, status = 200) {
  res.statusCode = status;
  res.setHeader('Content-Type','application/json');
  res.end(JSON.stringify(value));
}

async function requestBody(req) {
  if (req.method !== 'POST') return {};
  if (!String(req.headers['content-type'] || '').startsWith('application/json')) throw new ApiError('json_required');
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  let size = 0; const parts = [];
  for await (const bytes of req) {
    size += bytes.length;
    if (size > MAX_BODY) throw new ApiError('request_too_large', 413);
    parts.push(bytes);
  }
  try { return JSON.parse(Buffer.concat(parts).toString() || '{}'); }
  catch { throw new ApiError('invalid_json'); }
}

export function createSiteApi({secret, fetchImpl = fetch, crowbot = streamOriginalText, nativeAgent = null, browserLogin = null} = {}) {
  return async function api(req, res) {
    res.setHeader('Cache-Control','no-store');
    res.setHeader('X-Content-Type-Options','nosniff');
    try {
      const origin = req.headers.origin;
      const host = req.headers.host;
      if (origin && ![`https://${host}`, `http://${host}`].includes(origin)) throw new ApiError('foreign_origin', 403);
      const url = new URL(req.url, `http://${host}`);
      const path = url.searchParams.get('path') || url.pathname.replace(/^\/api\//,'');
      const body = await requestBody(req);
      if (path === 'status' && req.method === 'GET') return send(res,{product:'Crow-GodMod3',
        revision:process.env.VERCEL_GIT_COMMIT_SHA || null,crowbot:'standalone-anonymous',membership_configured:!!secret});
      if (path === 'membership/browser-sign-in' && req.method === 'POST') {
        if (!browserLogin) throw new ApiError('browser_sign_in_requires_desktop',503);
        return browserLogin.start(req,res);
      }
      if (path === 'membership/browser-poll' && req.method === 'POST') {
        if (!browserLogin) throw new ApiError('browser_sign_in_requires_desktop',503);
        return browserLogin.poll(req,res);
      }
      if (path === 'crowbot/models' && req.method === 'GET') return send(res,{object:'list',data:[{id:'crowbot-auto',display_name:'CrowBot AI',object:'model',owned_by:'Crow'}]});
      if (path === 'crowbot/chat/completions' && req.method === 'POST') {
        body.model = 'crowbot-auto';
        const messages = requireMessages(body);
        if (messages.some(row => typeof row.content !== 'string')) throw new ApiError('crowbot_text_content_required');
        const parts = []; let done = false;
        for await (const event of crowbot(messages, {platform:'web',locale:'en',timeoutMs:90000})) {
          if (event.type === 'chunk') parts.push(event.content);
          if (event.type === 'done') done = true;
        }
        if (!done || !parts.join('').trim()) throw new ApiError('crowbot_ai_unavailable', 502);
        return completion(res, body, parts.join(''));
      }
      if (path === 'membership/sign-in' && req.method === 'POST') {
        key(secret);
        const flow = await callJson(`${AUTH}/api/accounts/deviceauth/usercode`, {method:'POST',
          headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CLIENT})},fetchImpl);
        if (!flow.device_auth_id || !flow.user_code) throw new ApiError('invalid_login_response', 502);
        cookie(res,'cg_flow',seal({...flow,expiresAt:Date.now()+900000},'cg_flow',secret),req,900);
        return send(res,{verification_url:`${AUTH}/codex/device`,user_code:flow.user_code,interval:Math.max(3,Number(flow.interval)||5)});
      }
      if (path === 'membership/poll' && req.method === 'POST') {
        const flow = unseal(cookies(req).cg_flow,'cg_flow',secret);
        if (!flow || flow.expiresAt <= Date.now()) throw new ApiError('login_expired', 401);
        const response = await fetchImpl(`${AUTH}/api/accounts/deviceauth/token`, {method:'POST',
          headers:{'Content-Type':'application/json'},redirect:'error',signal:AbortSignal.timeout(20000),
          body:JSON.stringify({device_auth_id:flow.device_auth_id,user_code:flow.user_code})});
        if ([403,404].includes(response.status)) return send(res,{state:'pending'});
        if (!response.ok) throw new ApiError(`login_http_${response.status}`, 502);
        const code = await boundedJson(response);
        if (!code.authorization_code || !code.code_verifier) throw new ApiError('invalid_login_response',502);
        const tokens = await callJson(`${AUTH}/oauth/token`, {method:'POST',
          headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'authorization_code',
            code:code.authorization_code,redirect_uri:`${AUTH}/deviceauth/callback`,client_id:CLIENT,code_verifier:code.code_verifier}).toString()},fetchImpl);
        const account = accountFromTokens(tokens);
        const old = accountCookies(req,secret).accounts.find(row => row.accountId === account.accountId);
        if (old) account.id = old.id;
        saveAccount(res,account,req,secret);
        cookie(res,'cg_flow','',req,0);
        return send(res,{state:'ready',account:{id:account.id,email:account.email,plan:account.plan}});
      }
      if (path === 'membership/accounts' && req.method === 'GET') {
        const state = accountCookies(req,secret);
        return send(res,{native_tools:!!nativeAgent,browser_sign_in:!!browserLogin,accounts:state.accounts.map(row=>({id:row.id,email:row.email,plan:row.plan,
          selected:row.id===state.selected,renewal_required:row.expiresAt<=Date.now()+30000}))});
      }
      if (path === 'membership/select' && req.method === 'POST') {
        if (!accountCookies(req,secret).accounts.some(row=>row.id===body.id)) throw new ApiError('account_not_connected',401);
        cookie(res,'cg_selected',body.id,req);
        return send(res,{state:'selected'});
      }
      if (path === 'membership/renew' && req.method === 'POST') {
        const state = accountCookies(req,secret), old = state.accounts.find(row=>row.id===state.selected);
        if (!old?.refresh) throw new ApiError('sign_in_with_chatgpt',401);
        // Explicit renewal is serialized by the client. Inference never races
        // refresh-token rotation or silently switches to another account.
        const tokens = await callJson(`${AUTH}/oauth/token`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
          body:new URLSearchParams({grant_type:'refresh_token',refresh_token:old.refresh,client_id:CLIENT}).toString()},fetchImpl);
        const renewed = accountFromTokens({...tokens,refresh_token:tokens.refresh_token || old.refresh});
        if (renewed.accountId !== old.accountId) throw new ApiError('account_identity_mismatch',401);
        saveAccount(res,{...renewed,id:old.id},req,secret);
        return send(res,{state:'ready'});
      }
      if (path === 'membership/models' && req.method === 'GET') return send(res,{object:'list',data:await catalog(selectedAccount(req,secret),fetchImpl)});
      if (path === 'membership/images/generations' && req.method === 'POST') {
        const account = selectedAccount(req,secret);
        if (typeof body.prompt !== 'string' || !body.prompt.trim()) throw new ApiError('prompt_required');
        const value = await callJson(`${CODEX}/images/generations`, {method:'POST',headers:{...identityHeaders(account),
          'Content-Type':'application/json','x-codex-image-turn-id':randomUUID()},body:JSON.stringify({prompt:body.prompt,
            model:'gpt-image-2',n:1,quality:'medium',size:'1024x1024',background:'opaque'})},fetchImpl,250000,24*1024*1024);
        const image = value.data?.[0]?.b64_json;
        if (!image || typeof image !== 'string') throw new ApiError('image_response_missing',502);
        return send(res,{data:[{url:`data:image/png;base64,${image}`}],reported_size:value.size,reported_quality:value.quality});
      }
      if (path === 'membership/chat/completions' && req.method === 'POST') {
        requireMessages(body);
        const account = selectedAccount(req,secret);
        const rows = await catalog(account,fetchImpl);
        const model = rows.find(row=>row.id===body.model);
        if (!model) throw new ApiError('model_not_available_for_account',403);
        const effort = body.reasoning_effort;
        if (effort && !model.reasoning_efforts.some(row=>row.effort===effort) && !(model.id==='gpt-6-luna' && effort==='none')) throw new ApiError('reasoning_not_supported');
        if (nativeAgent) {
          const result = await nativeAgent(account,body,model);
          return completion(res,body,result.text,result.metadata);
        }
        const input = body.messages.map(row => ({role:row.role==='system'?'developer':row.role,
          content:typeof row.content==='string' ? row.content : row.content.map(part=>part.type==='image_url'
            ? {type:'input_image',image_url:part.image_url.url} : {type:'input_text',text:part.text})}));
        const instructions = typeof body.messages[0]?.content === 'string' && body.messages[0].role === 'system'
          ? body.messages[0].content : 'Respond to the user’s request using the supplied conversation.';
        const response = await fetchImpl(`${CODEX}/responses`,{method:'POST',headers:{...identityHeaders(account),
          'Content-Type':'application/json'},redirect:'error',signal:AbortSignal.timeout(250000),body:JSON.stringify({
            model:model.id,input,instructions,store:false,stream:true,tools:[{type:'web_search'}],
            ...(effort ? {reasoning:{effort}} : {})})});
        if (!response.ok) throw new ApiError(`membership_http_${response.status}`,response.status===429?429:502);
        let pending='',text='',done=false;const decoder=new TextDecoder();
        for await (const bytes of response.body) {
          pending += decoder.decode(bytes,{stream:true});
          if (pending.length + text.length > 16*1024*1024) throw new ApiError('response_limit',502);
          let index;
          while ((index=pending.indexOf('\n\n'))>=0) {
            const frame = pending.slice(0,index); pending=pending.slice(index+2);
            const data=frame.split('\n').filter(line=>line.startsWith('data:')).map(line=>line.slice(5).trim()).join('\n');
            if (!data || data==='[DONE]') continue;
            const event=JSON.parse(data);
            if (['response.output_text.delta','response.refusal.delta'].includes(event.type)) text+=event.delta || '';
            if (event.type==='response.completed') done=true;
            if (['response.failed','response.incomplete','error'].includes(event.type)) throw new ApiError('membership_inference_failed',502);
          }
        }
        if (!done || !text.trim()) throw new ApiError('membership_incomplete',502);
        return completion(res,body,text,{transport:'codex-oauth',tools:'web_search'});
      }
      throw new ApiError('not_found',404);
    } catch (error) {
      const known = error instanceof ApiError;
      send(res,{error:{code:known?error.code:'provider_unavailable',message:known?error.code:'The selected service is temporarily unavailable.'}},known?error.status:502);
    }
  };
}
