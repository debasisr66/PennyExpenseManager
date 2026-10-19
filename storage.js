(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./data.js'));else root.PennyStorage=factory(root.PennyData);})(typeof globalThis!=='undefined'?globalThis:this,function(D){
'use strict';
const DB='penny-local-database',KEY='penny-expenses-v1';
class ConflictError extends Error{constructor(){super('Another tab changed your data. Reload and review before confirming again.');this.name='ConflictError';}}
function indexedAdapter(idb){
 let db;async function open(){if(db)return;db=await new Promise((resolve,reject)=>{const q=idb.open(DB,1);q.onupgradeneeded=()=>{if(!q.result.objectStoreNames.contains('documents'))q.result.createObjectStore('documents');};q.onerror=()=>reject(q.error);q.onblocked=()=>reject(Error('Close other Penny tabs to open the database.'));q.onsuccess=()=>resolve(q.result);});db.onversionchange=()=>{db.close();db=null;};}
 async function get(key){await open();return new Promise((resolve,reject)=>{const q=db.transaction('documents','readonly').objectStore('documents').get(key);q.onsuccess=()=>resolve(q.result||null);q.onerror=()=>reject(q.error);});}
 async function write(record,expected,backup=false,options={}){await open();return new Promise((resolve,reject)=>{const t=db.transaction('documents','readwrite'),s=t.objectStore('documents'),q=s.get('main');let conflict=false;
 q.onsuccess=()=>{const old=q.result;if((old?.revision||null)!==expected){conflict=true;t.abort();return;}if(backup&&old)s.put(old,'backup');if(options.recovery&&old)s.put({state:old.state,resultingRevision:record.revision,kind:options.recovery,createdAt:new Date().toISOString()},'recovery');if(options.reset){s.put({epoch:D.freshId(),events:[],dropped:0},'diagnostics');}s.put(record,'main');};t.oncomplete=()=>resolve();t.onabort=()=>reject(conflict?new ConflictError():t.error||Error('Database transaction failed.'));t.onerror=()=>{};});}
 async function diagnostic(update){await open();return new Promise((resolve,reject)=>{const t=db.transaction('documents','readwrite'),s=t.objectStore('documents'),q=s.get('diagnostics');let result;q.onsuccess=()=>{const old=q.result||{epoch:D.freshId(),events:[],dropped:0};result=update(old);s.put(result,'diagnostics');};t.oncomplete=()=>resolve(result);t.onabort=()=>reject(t.error||Error('Diagnostics unavailable.'));t.onerror=()=>{};});}
 return {open,read:()=>get('main'),readBackup:()=>get('backup'),readRecovery:()=>get('recovery'),write,diagnostic,kind:'Local database'};
}
function fallbackAdapter(storage){
 const key='penny-v32-envelope';const envelope=()=>{const value=storage.getItem(key);return value?JSON.parse(value):{main:JSON.parse(storage.getItem('penny-v3-document')||'null'),backup:JSON.parse(storage.getItem('penny-v3-backup')||'null'),recovery:null,diagnostics:{epoch:D.freshId(),events:[],dropped:0}};};
 const lock=async fn=>{if(!globalThis.navigator?.locks)return Promise.resolve().then(fn);const result=await navigator.locks.request('penny-v3-fallback',async()=>{try{return {value:await fn()};}catch(error){return {error};}});if(result.error)throw result.error;return result.value;};
 return {kind:'Browser storage fallback',async open(){},async read(){return envelope().main;},async readBackup(){return envelope().backup;},async readRecovery(){return envelope().recovery;},async write(record,expected,backup=false,options={}){return lock(()=>{const e=envelope();if((e.main?.revision||null)!==expected)throw new ConflictError();if(backup)e.backup=e.main;if(options.recovery)e.recovery={state:e.main.state,resultingRevision:record.revision,kind:options.recovery,createdAt:new Date().toISOString()};if(options.reset)e.diagnostics={epoch:D.freshId(),events:[],dropped:0};e.main=record;storage.setItem(key,JSON.stringify(e));});},async diagnostic(update){return lock(()=>{const e=envelope();const next=update(e.diagnostics);e.diagnostics=next;storage.setItem(key,JSON.stringify(e));return next;});}};
}
function create(adapter,options={}){
 let revision=null,linked=null,linkedText=null,ready=false;const status=options.status||(()=>{}),announce=options.announce||(()=>{});
 async function init(seed,legacy){await adapter.open();const saved=await adapter.read();if(saved){if(typeof saved.revision!=='string'||!saved.revision)throw Error('Invalid revision.');revision=saved.revision;ready=true;return D.migrateState(saved.state);}const state=D.migrateState(legacy?JSON.parse(legacy):seed);revision=D.freshId();await adapter.write({revision,state},null);ready=true;return state;}
 async function load(){const x=await adapter.read();return x?{state:D.migrateState(x.state),revision:x.revision}:null;}
 async function save(next,options={}){
  if(!ready)throw Error('The local data store is unavailable.');if(options.expectedRevision&&options.expectedRevision!==revision)throw new ConflictError();
  const state=D.migrateState(next),nextRevision=D.freshId();await adapter.write({revision:nextRevision,state},revision,!!options.backup,options);revision=nextRevision;
  if(options.reset){linked=null;linkedText=null;}
  try{announce(revision);}catch(_){}let fileWarning=null;
  if(linked){try{const current=await linked.getFile();if(current.size>D.MAX_FILE_BYTES||await current.text()!==linkedText)throw Error('Linked file changed outside Penny; it was not overwritten.');const output=D.exportBackup(state),w=await linked.createWritable();try{await w.write(output);await w.close();linkedText=output;}catch(e){try{await w.abort();}catch(_){}throw e;}}catch(e){fileWarning='Saved locally, but linked file needs attention: '+e.message;linked=null;linkedText=null;try{status(fileWarning);}catch(_){}}}
  return {state,revision,fileWarning};
 }
 async function connect(handle,state){const file=await handle.getFile();if(file.size>D.MAX_FILE_BYTES)throw Error('Data file exceeds 32 MB.');const text=await file.text();if(text.trim()&&JSON.stringify(D.importBackup(text))!==JSON.stringify(D.migrateState(state)))throw Error('This file has different records. Import it first or choose an empty file.');const output=D.exportBackup(state);if(D.byteLength(output)>D.MAX_FILE_BYTES)throw Error('Data exceeds portable limit.');const w=await handle.createWritable();try{await w.write(output);await w.close();}catch(e){try{await w.abort();}catch(_){}throw e;}linked=handle;linkedText=output;status('Connected data file: '+file.name);return file.name;}
 async function recovery(){const r=await adapter.readRecovery?.();if(!r||r.resultingRevision!==revision)return null;return {...r,state:D.migrateState(r.state)};}
 async function restore(){const r=await recovery();if(!r)throw Error('Undo is unavailable after newer edits.');const current=await load();return save({...r.state,tagCatalog:D.catalog([...r.state.tagCatalog,...current.state.tagCatalog])});}
 return {init,save,load,connect,recovery,restore,async backup(){const r=await adapter.readBackup?.();return r?D.migrateState(r.state):null;},detach(){linked=null;linkedText=null;status(adapter.kind);},adoptRevision:v=>{revision=v;},getRevision:()=>revision,getKind:()=>adapter.kind,isLinked:()=>!!linked};
}
return {DB,KEY,ConflictError,indexedAdapter,fallbackAdapter,create};
});
