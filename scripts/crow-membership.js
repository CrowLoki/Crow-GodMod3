// Visitor-owned sessions. OAuth credentials are never readable by JavaScript.
const _membershipCatalog = {};
let _membershipAccounts=[], _membershipAccountId='', _membershipGeneration=0;
let _membershipChoices={};
try{_membershipChoices=JSON.parse(localStorage.getItem('crow-godmod3-membership-choices')||'{}');}catch{_membershipChoices={};}
if(!_membershipChoices||typeof _membershipChoices!=='object'||Array.isArray(_membershipChoices))_membershipChoices={};
function getMembershipModels(){return Object.keys(_membershipCatalog);}
function getSelectedMembershipAccount(){return _membershipAccountId;}
function getMembershipChoice(model){const saved=_membershipChoices[model]||{};return{effort:typeof saved.effort==='string'?saved.effort:'default',tier:typeof saved.tier==='string'?saved.tier:'default',account:_membershipAccountId};}

async function membershipRequest(path,body){
  const response=await fetch(`/api/membership/${path}`,body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const value=await response.json();
  if(!response.ok)throw new Error(value.error?.message||`HTTP ${response.status}`);
  return value;
}

function membershipPanel(){
  let panel=document.getElementById('membershipAccountsPanel');if(panel)return panel;
  panel=document.createElement('div');panel.id='membershipAccountsPanel';panel.style.cssText='padding:12px;border:1px solid var(--border);border-radius:8px;margin:12px 0;';
  const title=document.createElement('strong');title.textContent='Your ChatGPT membership';
  const explanation=document.createElement('p');explanation.textContent='Sign in to your own account. Its models and usage limits apply. Connect another account and choose which one to use.';explanation.style.cssText='font-size:12px;color:var(--text-dim);';
  const accounts=document.createElement('select');accounts.id='membershipAccountSelect';accounts.className='model-select';accounts.setAttribute('aria-label','ChatGPT account');
  accounts.addEventListener('change',async()=>{try{await membershipRequest('select',{id:accounts.value});await refreshMembershipAccounts();}catch(error){membershipStatus(error.message);}});
  const connect=document.createElement('button');connect.className='api-key-btn';connect.type='button';connect.textContent='Connect another ChatGPT account';connect.addEventListener('click',connectChatGPTMembership);
  const renew=document.createElement('button');renew.className='api-key-btn';renew.type='button';renew.textContent='Renew selected connection';
  renew.addEventListener('click',async()=>{renew.disabled=true;try{await membershipRequest('renew',{});await refreshMembershipAccounts();membershipStatus('Connection renewed.');}catch(error){membershipStatus(error.message);}finally{renew.disabled=false;}});
  const status=document.createElement('p');status.id='membershipAccountStatus';status.style.cssText='font-size:12px;color:var(--text-dim);';
  panel.append(title,explanation,accounts,connect,renew,status);document.getElementById('panel-api')?.prepend(panel);return panel;
}
function membershipStatus(message){membershipPanel();document.getElementById('membershipAccountStatus').textContent=message;}

async function refreshMembershipAccounts(){
  const generation=++_membershipGeneration;for(const key of Object.keys(_membershipCatalog))delete _membershipCatalog[key];
  try{
    const state=await membershipRequest('accounts');if(generation!==_membershipGeneration)return;
    _membershipAccounts=state.accounts||[];_membershipAccountId=_membershipAccounts.find(row=>row.selected)?.id||'';
    membershipPanel();const select=document.getElementById('membershipAccountSelect');select.replaceChildren();
    for(const row of _membershipAccounts){const option=document.createElement('option');option.value=row.id;option.textContent=`${row.email} · ${row.plan}${row.renewal_required?' · renew connection':''}`;select.appendChild(option);}select.value=_membershipAccountId;
    if(_membershipAccountId){const result=await membershipRequest('models');if(generation!==_membershipGeneration)return;for(const row of result.data||[])if(typeof row.id==='string')_membershipCatalog[row.id]=row;membershipStatus(`${getMembershipModels().length} models loaded for the selected account.`);}
    else membershipStatus('Use CrowBot AI immediately, or sign in to use your own ChatGPT membership.');
  }catch(error){membershipStatus(error.message);}
  refreshModeModelSelect();
}

async function connectChatGPTMembership(){
  membershipStatus('Starting OpenAI sign-in…');
  try{
    const flow=await membershipRequest('sign-in',{});
    if(flow.verification_url!=='https://auth.openai.com/codex/device')throw new Error('Unexpected sign-in destination.');
    const status=document.getElementById('membershipAccountStatus');status.replaceChildren();
    const code=document.createElement('strong');code.textContent=`Enter this code on OpenAI: ${flow.user_code}`;
    const link=document.createElement('a');link.href=flow.verification_url;link.target='_blank';link.rel='noopener noreferrer';link.textContent='Open ChatGPT sign-in';link.style.cssText='display:block;color:var(--accent);margin-top:8px;';status.append(code,link);
    const deadline=Date.now()+15*60*1000;
    const poll=async()=>{if(Date.now()>deadline){membershipStatus('Sign-in expired. Start it again when ready.');return;}try{const result=await membershipRequest('poll',{});if(result.state==='ready'){await refreshMembershipAccounts();return;}setTimeout(poll,Math.max(3,flow.interval)*1000);}catch(error){membershipStatus(`Sign-in stopped: ${error.message}`);}};
    setTimeout(poll,Math.max(3,flow.interval)*1000);
  }catch(error){membershipStatus(error.message);}
}

function refreshMembershipControls(){
  const modelSelect=document.getElementById('modelSelect');if(!modelSelect)return;
  let controls=document.getElementById('membershipModelControls');if(!controls){controls=document.createElement('span');controls.id='membershipModelControls';controls.style.cssText='display:inline-flex;gap:4px;flex-wrap:wrap;';modelSelect.insertAdjacentElement('afterend',controls);}
  const selection=getModeModelSelection();controls.replaceChildren();
  if(selection.provider!=='chatgpt'){
    const button=document.createElement('button');button.type='button';button.className='api-key-btn';button.textContent='Sign in with ChatGPT';
    button.addEventListener('click',()=>{openSettings();switchSettingsTab('api');membershipPanel();connectChatGPTMembership();});controls.appendChild(button);return;
  }
  const row=_membershipCatalog[selection.model],choice=getMembershipChoice(selection.model);
  const levels=[{id:'default',name:'Model default'},...(row?.reasoning_efforts||[]).map(level=>({id:level.effort,name:level.effort}))];
  if(selection.model==='gpt-6-luna'&&!levels.some(level=>level.id==='none'))levels.push({id:'none',name:'none'});
  for(const[field,label,options]of[['effort','Membership reasoning',levels],['tier','Membership speed',[{id:'default',name:'Standard'},...(row?.service_tiers||[]).filter(tier=>tier.id!=='default').map(tier=>({id:tier.id,name:tier.name}))]]]){
    const select=document.createElement('select');select.className='model-select';select.setAttribute('aria-label',label);select.title=label;
    for(const optionRow of options){const option=document.createElement('option');option.value=optionRow.id;option.textContent=optionRow.name;select.appendChild(option);}select.value=options.some(option=>option.id===choice[field])?choice[field]:'default';
    select.addEventListener('change',()=>{_membershipChoices[selection.model]={...getMembershipChoice(selection.model),[field]:select.value};localStorage.setItem('crow-godmod3-membership-choices',JSON.stringify(_membershipChoices));});controls.appendChild(select);
  }
}
document.addEventListener('DOMContentLoaded',refreshMembershipAccounts);
