import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createSiteApi,seal,unseal} from '../lib/site-api.mjs';
const secret='synthetic-session-key-not-a-live-credential-1234';

test('visitor sessions cannot be substituted, read as plaintext, or moved across cookie identities',()=>{
  const encrypted=seal({token:'visitor-A-token'},'visitor-A',secret);
  assert.ok(!encrypted.includes('visitor-A-token'));
  assert.deepEqual(unseal(encrypted,'visitor-A',secret),{token:'visitor-A-token'});
  assert.equal(unseal(encrypted,'visitor-B',secret),null);
  assert.equal(unseal(encrypted.slice(0,-4)+'AAAA','visitor-A',secret),null);
});

test('public CrowBot AI is independent, keyless, and does not expose upstream identity',async()=>{
  let admitted;
  const api=createSiteApi({secret,crowbot:async function*(messages){admitted=messages;yield{type:'chunk',content:'Actual result'};yield{type:'done'};}});
  const server=createServer(api);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try{
    const base=`http://127.0.0.1:${server.address().port}/api/`;
    const rows=await(await fetch(base+'crowbot/models')).json();assert.equal(rows.data[0].display_name,'CrowBot AI');
    const messages=[{role:'system',content:'Keep this complete instruction'},{role:'user',content:'Whole question'}];
    const response=await fetch(base+'crowbot/chat/completions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages,stream:true})});
    const text=await response.text();assert.equal(response.status,200);assert.match(text,/Actual result/);assert.match(text,/\[DONE\]/);assert.deepEqual(admitted,messages);
    const noAccount=await fetch(base+'membership/models');assert.equal(noAccount.status,401);
    const foreign=await fetch(base+'membership/sign-in',{method:'POST',headers:{Origin:'https://foreign.example','Content-Type':'application/json'},body:'{}'});assert.equal(foreign.status,403);
  }finally{await new Promise(resolve=>server.close(resolve));}
});
