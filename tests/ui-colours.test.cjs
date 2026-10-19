const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const css=fs.readFileSync(path.join(__dirname,'../styles.css'),'utf8'),value=name=>css.match(new RegExp('--'+name+':(#[a-f0-9]{3,6})'))[1];
function luminance(hex){if(hex.length===4)hex='#'+[...hex.slice(1)].map(c=>c+c).join('');const c=hex.slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return .2126*c[0]+.7152*c[1]+.0722*c[2];}
function contrast(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
for(const fg of ['ink','muted','red'])for(const bg of ['white','bg'])test('UI normal text contrast '+fg+' / '+bg,()=>assert.ok(contrast(value(fg),value(bg))>=4.5));
test('UI primary button white text contrast',()=>assert.ok(contrast(value('white'),value('green'))>=4.5));
