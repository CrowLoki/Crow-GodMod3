import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {localRuntimeIds,localRuntimePresets} from '../scripts/local-runtime-config.mjs';
const html=await readFile(process.env.PUBLIC_DEFAULT_HTML || new URL('../public/crow-godmod3.html',import.meta.url),'utf8');
function source(name){
  const start=html.search(new RegExp(`    (?:async )?function ${name}\\(`));
  assert.ok(start>=0,`Missing ${name}`);
  const end=html.indexOf('\n    }',start)+6;
  return html.slice(start,end);
}
function element(){return{children:[],appendChild(child){this.children.push(child);},replaceChildren(){this.children=[];},setAttribute(){},get options(){return this.children.flatMap(child=>child.children?.length?child.children:[child]);}};}
function harness(){
  const state={apiKey:'synthetic-saved-visitor-key',veniceApiKey:'synthetic-venice-key',localEnabled:true,localOnly:true,
    localRuntime:'ollama',localModels:'local-model',model:'test-or',modeModelSelections:{ultraplinian:{provider:'openrouter',model:'test-or'}}};
  const select=element(),requests=[];
  const context=vm.createContext({state,JSON,URL,Object,Set,WeakMap,encodeURIComponent,decodeURIComponent,
    MODE_MODEL_PROVIDERS:new Set(['auto','crowbot','chatgpt','openrouter','venice','local']),MODE_MODEL_IDS:new Set(['ultraplinian','parseltongue','pliny']),
    LOCAL_RUNTIME_IDS:new Set(localRuntimeIds),LOCAL_RUNTIME_PRESETS:localRuntimePresets,
    OPENROUTER_FREE_CHAT_MODEL_SET:new Set(['test-or']),OPENROUTER_FREE_CHAT_MODELS:['test-or'],OPENROUTER_LEGACY_MODEL_MIGRATIONS:{},OPENROUTER_DEFAULT_MODEL:'test-or',VENICE_MODELS:['venice-model'],
    getLocalModels:()=>['local-model'],hasLocalProvider:()=>true,getLocalAutomaticRaceModels:()=>['local-model'],
    normalizeLocalRuntime:()=>state.localRuntime,getLocalRuntimeProfile:()=>({models:'local-model',baseUrl:'http://localhost:11434/v1'}),
    parseLocalModelIds:value=>String(value||'').split(',').filter(Boolean),getLocalTransportSnapshot:()=>null,attachLocalTransportSnapshot(){},
    normalizeLocalBaseUrl:value=>value,normalizeOpenRouterModel:value=>value,normalizeOpenRouterRequestBody:value=>value,
    getCurrentMode:()=>state.mode,refreshModeModelSelect(){},updateApiWarning(){},
    document:{getElementById:()=>select,createElement:()=>element()},window:{location:{origin:'https://example.test'}},
    fetch:async(url,options)=>{requests.push({url,options});return{ok:true};},
  });
  for(const name of ['normalizeModeModelSelection','normalizeModeModelSelections','getDefaultModelSelection','initializePublicModelDefault',
    'defaultModeModelSelections','getModeModelSelection','getModeExecutionSelection','getModeAuxiliaryTarget','createModeTarget',
    'encodeModeModelSelection','decodeModeModelSelection','appendModeModelOptions','refreshDefaultModelSelect','setGlobalDefaultModel',
    'resolveChatTarget','getModeRaceTargets','fetchChatCompletion'])vm.runInContext(source(name),context);
  return{context,state,select,requests};
}
test('General shows CrowBot AI as the shared default while retaining a visitor key',()=>{
  const{context,state,select}=harness();context.initializePublicModelDefault();context.refreshDefaultModelSelect();
  assert.equal(select.options[0].textContent,'CrowBot AI');
  assert.equal(select.value,encodeURIComponent(JSON.stringify(['crowbot','crowbot-auto'])));
  assert.equal(state.apiKey,'synthetic-saved-visitor-key');
  for(const mode of ['ultraplinian','parseltongue','pliny'])assert.deepEqual(structuredClone(state.modeModelSelections[mode]),{provider:'crowbot',model:'crowbot-auto'});
});
test('all modes, Automatic selections, and auxiliary strategy requests use only CrowBot AI by default',async()=>{
  const{context,state,requests}=harness();context.initializePublicModelDefault();
  for(const mode of ['ultraplinian','parseltongue','pliny']){
    state.mode=mode;state.modeModelSelections[mode]={provider:'auto',model:''};
    const execution=context.getModeExecutionSelection(mode);
    const targets=context.getModeRaceTargets(mode,'test-or',execution);
    assert.equal(targets.length,1);assert.equal(targets[0].provider,'crowbot');
    assert.equal(context.getModeAuxiliaryTarget(execution).provider,'crowbot');
    await context.fetchChatCompletion({model:'test-or',messages:[{role:'user',content:mode}]},{provider:'openrouter'});
  }
  assert.equal(requests.length,3);
  for(const request of requests){assert.equal(request.url,'/api/crowbot/chat/completions');assert.equal(request.options.headers.Authorization,undefined);assert.equal(JSON.parse(request.options.body).model,'crowbot-auto');}
});
test('another provider is used only after an explicit General selection, and survives reload normalization',()=>{
  const{context,state}=harness();context.initializePublicModelDefault();
  context.setGlobalDefaultModel(encodeURIComponent(JSON.stringify(['openrouter','test-or'])));
  context.initializePublicModelDefault();
  for(const mode of ['ultraplinian','parseltongue','pliny'])assert.equal(state.modeModelSelections[mode].provider,'openrouter');
  assert.equal(context.getDefaultModelSelection().model,'test-or');
});

 test('CrowBot tier races retain separate candidates and never change the provider wire model',async()=>{
  const {context,state,requests}=harness();context.initializePublicModelDefault();state.mode='ultraplinian';
  context.TIER_SIZES={fast:3,standard:5,smart:8,power:11,ultra:13};
  vm.runInContext(source('getCrowBotRaceEntries')+'\n'+source('getUltraplinianThinkingModelKey'),context);
  for(const [tier,count] of Object.entries(context.TIER_SIZES)){
    const entries=context.getCrowBotRaceEntries(tier);
    assert.equal(entries.length,count);assert.equal(new Set(entries.map(context.getUltraplinianThinkingModelKey)).size,count);
    for(const entry of entries){const copied=context.createModeTarget(entry.provider,entry.model,null,entry);assert.equal(copied.candidate,entry.candidate);assert.equal(copied.model,'crowbot-auto');}
  }
  await Promise.all(context.getCrowBotRaceEntries('standard').map(modeTarget=>context.fetchChatCompletion({model:modeTarget.model,messages:[{role:'user',content:'2+2'}]},{modeTarget})));
  assert.equal(requests.length,5);assert.ok(requests.every(r=>r.url==='/api/crowbot/chat/completions' && JSON.parse(r.options.body).model==='crowbot-auto' && !r.options.headers.Authorization));
  assert.match(html,/raceEntries.push\(\.\.\.getCrowBotRaceEntries\(state.ultraSpeedTier\)\)/);
  assert.equal((html.match(/candidate: modeTarget\?\.candidate/g)||[]).length,2);
});
