(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./data.js'));else root.PennyDiagnostics=factory(root.PennyData);})(typeof globalThis!=='undefined'?globalThis:this,function(D){
'use strict';
const CODES=new Set(['RUNTIME_ERROR','RUNTIME_REJECTION','SAVE_FAILED','VOICE_START','VOICE_CAPTURE_FAILED','VOICE_PARSE','VOICE_AMOUNT_INTEGRITY','VOICE_APPLY','IMPORT_FAILED','IMPORT_PREVIEW','IMPORT_APPLY','SETTINGS_SAVE','DATA_CHANGE','DATA_CHANGE_FAILED','RATE_FAILED','LINK_FAILED']);
const COMPONENTS=new Set(['runtime','storage','voice','parser','translator','import','export','settings','reset','currency']);
const bytes=x=>new TextEncoder().encode(JSON.stringify(x)).length;
function prune(value,now){let removed=0,events=value.events.filter(e=>{const valid=now-Date.parse(e.timestampUtc)<(e.level==='debug'?86400000:604800000)&&Date.parse(e.timestampUtc)<=now+300000;if(!valid)removed++;return valid;});while(events.length>1000||bytes(events)>2*1024*1024){events.shift();removed++;}return {...value,events,dropped:(value.dropped||0)+removed};}
function create(options={}){
 const time=options.now||Date.now,mono=options.monotonic||(()=>globalThis.performance?.now?.()??Date.now());let adapter=null,epoch=null,sessionId=D.freshId(),sequence=0,deadline=0,unavailable=false;
 let pending=0;let memory={epoch:D.freshId(),events:[],dropped:0},chain=Promise.resolve();
 function mode(){if(deadline&&mono()>=deadline)deadline=0;return deadline?'debug':'error';}
 async function attach(value){adapter=value;try{const r=await adapter.diagnostic(v=>prune(v,time()));epoch=r.epoch;memory=r;unavailable=false;}catch(_){unavailable=true;epoch=memory.epoch;}}
 function setDebug(value){deadline=value?mono()+1800000:0;}
 function rotate(){deadline=0;sessionId=D.freshId();sequence=0;}
 function event(component,code,level,metadata,actionId){
  if(!COMPONENTS.has(component)||!CODES.has(code)||!['debug','error'].includes(level)||level==='debug'&&mode()!=='debug')return null;
  const safe={};for(const [key,val]of Object.entries(metadata||{})){if(['count','durationMs'].includes(key)&&Number.isSafeInteger(val)&&val>=0&&val<=10000000)safe[key]=val;if(key==='language'&&['en','hi','es'].includes(val))safe[key]=val;if(key==='scope'&&['month','all','reset','undo'].includes(val))safe[key]=val;}
  const e={schemaVersion:1,appVersion:'3.2.0',eventId:D.freshId(),sessionId,sequence:++sequence,actionId:typeof actionId==='string'&&/^[a-z0-9-]{8,80}$/i.test(actionId)?actionId:D.freshId(),timestampUtc:new Date(time()).toISOString(),component,level,code,outcome:level==='error'?'failure':'stage',logEpoch:epoch,metadata:safe,repeatCount:1};return bytes(e)<=2048?e:null;
 }
 function emit(component,code,level='error',metadata={},actionId){const e=event(component,code,level,metadata,actionId);if(!e||pending>=100)return Promise.resolve(false);pending++;chain=chain.then(async()=>{const update=v=>{if(e.logEpoch!==v.epoch)return prune(v,time());const next=prune(v,time()),last=next.events.at(-1);if(last&&last.code===e.code&&last.actionId===e.actionId&&last.sessionId===e.sessionId)last.repeatCount=Math.min(10000,last.repeatCount+1);else next.events.push(e);return prune(next,time());};try{if(adapter&&!unavailable)memory=await adapter.diagnostic(update);else{memory=update(memory);while(memory.events.length>100||bytes(memory.events)>204800)memory.events.shift();}}catch(_){unavailable=true;memory=update(memory);while(memory.events.length>100||bytes(memory.events)>204800)memory.events.shift();}return true;}).catch(()=>{unavailable=true;return false;}).finally(()=>{pending--;});return chain;}
 async function list(){await chain;try{if(adapter&&!unavailable){const r=await adapter.diagnostic(v=>prune(v,time()));if(epoch!==r.epoch){rotate();epoch=r.epoch;}memory=r;}}catch(_){unavailable=true;}return [...prune(memory,time()).events].reverse();}
 async function clear(){await chain;const newEpoch=D.freshId();if(adapter){try{memory=await adapter.diagnostic(()=>({epoch:newEpoch,events:[],dropped:0}));unavailable=false;}catch(error){unavailable=true;throw Error('Persistent logs could not be cleared. Try again when storage is available.');}}else memory={epoch:newEpoch,events:[],dropped:0};rotate();epoch=newEpoch;return true;}
 async function afterReset(){rotate();memory={epoch:D.freshId(),events:[],dropped:0};epoch=memory.epoch;if(adapter)await attach(adapter);}
 return {attach,emit,list,clear,afterReset,setDebug,mode,action:()=>D.freshId(),getSession:()=>sessionId,remaining:()=>mode()==='debug'?Math.ceil((deadline-mono())/1000):0,isUnavailable:()=>unavailable,async export(){return {format:'penny-diagnostics',schemaVersion:1,appVersion:'3.2.0',events:await list(),dropped:memory.dropped,memoryOnly:unavailable};}};
}
return {create,prune};
});
