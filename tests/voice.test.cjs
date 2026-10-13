const test = require('node:test');
const assert = require('node:assert/strict');
const V = require('../voice.js');
function setup() {
  const statuses=[],transcripts=[],previews=[],instances=[];
  class FakeRecognition {
    constructor(){instances.push(this);this.starts=0;this.stops=0;this.aborts=0;}
    start(){this.starts++;this.onstart();}
    stop(){this.stops++;this.onend();}
    abort(){this.aborts++;}
    result(text,final=true){this.onresult({resultIndex:0,results:[Object.assign([{transcript:text}],{isFinal:final})]});}
  }
  const controller=V.create(FakeRecognition,{status:(...args)=>statuses.push(args),transcript:text=>transcripts.push(text),preview:text=>previews.push(text)});
  return {controller,statuses,transcripts,previews,instances};
}
test('Voice never starts a microphone on creation',()=>{const s=setup();assert.equal(s.instances.length,0);assert.equal(s.controller.isActive(),false);});
test('Unsupported speech produces a clear keyboard fallback',()=>{const statuses=[];const c=V.create(null,{status:(...x)=>statuses.push(x)});assert.equal(c.start(),false);assert.equal(statuses.at(-1)[0],'unsupported');assert.equal(c.supported,false);});
test('Explicit start configures English India and mobile-friendly partial results',()=>{const s=setup();assert.equal(s.controller.start(),true);assert.equal(s.instances[0].lang,'en-IN');assert.equal(s.instances[0].continuous,false);assert.equal(s.instances[0].interimResults,true);assert.equal(s.controller.isActive(),true);assert.equal(s.controller.start(),false);});
test('Final voice result creates a draft and ends cleanly',()=>{const s=setup();s.controller.start();s.instances[0].result('Spent 250 rupees');assert.deepEqual(s.transcripts,['Spent 250 rupees']);s.instances[0].onend();assert.equal(s.statuses.at(-1)[0],'complete');});
test('Interim result is shown live and becomes the draft if mobile ends without a final event',()=>{const s=setup();s.controller.start();s.instances[0].result('Spent 250 rupees',false);assert.deepEqual(s.previews,['Spent 250 rupees']);assert.equal(s.transcripts.length,0);s.instances[0].onend();assert.deepEqual(s.transcripts,['Spent 250 rupees']);});
test('A second voice attempt works after the first completes',()=>{const s=setup();s.controller.start('hi-IN');s.instances[0].result('पहला खर्च');s.instances[0].onend();assert.equal(s.controller.start('es-ES'),true);s.instances[1].result('segundo gasto');s.instances[1].onend();assert.deepEqual(s.transcripts,['पहला खर्च','segundo gasto']);assert.equal(s.instances[1].lang,'es-ES');});
for(const code of ['not-allowed','service-not-allowed','audio-capture','no-speech','network','language-not-supported','aborted','unknown'])test(`Voice error ${code} keeps keyboard entry available`,()=>{const s=setup();s.controller.start();s.instances[0].onerror({error:code});s.instances[0].onend();assert.equal(s.statuses.at(-1)[0],'error');assert.ok(s.statuses.at(-1)[1].length);assert.equal(s.controller.isActive(),false);});
test('Stop finishes listening',()=>{const s=setup();s.controller.start();s.controller.stop();assert.equal(s.instances[0].stops,1);assert.equal(s.controller.isActive(),false);});
test('Cancel aborts capture and ignores late results',()=>{const s=setup();s.controller.start();s.controller.cancel();s.instances[0].result('late expense');s.instances[0].onend();assert.equal(s.instances[0].aborts,1);assert.equal(s.transcripts.length,0);assert.equal(s.statuses.at(-1)[0],'idle');});
test('A cancelled session cannot overwrite a new session',()=>{const s=setup();s.controller.start();s.controller.cancel();s.controller.start();s.instances[0].result('old draft');s.instances[1].result('new draft');assert.deepEqual(s.transcripts,['new draft']);});
test('Speech service start failure is caught',()=>{class Broken {start(){throw Error('blocked');}}const statuses=[];const c=V.create(Broken,{status:(...x)=>statuses.push(x)});assert.equal(c.start(),false);assert.equal(statuses.at(-1)[0],'error');});
test('A result after a speech error is ignored',()=>{const s=setup();s.controller.start();s.instances[0].onerror({error:'network'});s.instances[0].result('invalid late result');assert.equal(s.transcripts.length,0);});
test('A microphone that never starts times out and a fresh attempt can start',()=>{const timers=[];class Stalled{constructor(){Stalled.items.push(this);}start(){}abort(){this.aborted=true;}}Stalled.items=[];const statuses=[];const controller=V.create(Stalled,{status:(...args)=>statuses.push(args)},{startTimeoutMs:1,setTimeout:fn=>{timers.push(fn);return timers.length;},clearTimeout:()=>{}});assert.equal(controller.start(),true);timers.shift()();assert.equal(statuses.at(-1)[0],'error');assert.equal(Stalled.items[0].aborted,true);assert.equal(controller.start(),true);assert.equal(Stalled.items.length,2);});
test('Listening timeout asks the browser to finish so a partial mobile transcript is kept',()=>{const timers=[];class Partial{constructor(){Partial.item=this;}start(){this.onstart();}stop(){this.stopped=true;this.onend();}abort(){}}const transcripts=[];const controller=V.create(Partial,{status:()=>{},transcript:text=>transcripts.push(text)},{listenTimeoutMs:1,setTimeout:fn=>{timers.push(fn);return timers.length;},clearTimeout:()=>{}});controller.start();Partial.item.onresult({resultIndex:0,results:[Object.assign([{transcript:'Gasté 250 rupias en comida'}],{isFinal:false})]});timers.at(-1)();assert.equal(Partial.item.stopped,true);assert.deepEqual(transcripts,['Gasté 250 rupias en comida']);});
