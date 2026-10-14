const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../core.js');
const T=require('../translation.js');

function verify(cases,language){
  assert.equal(cases.length,100);
  const categories=new Set();
  for(const entry of cases){
    const result=T.fallback(entry.text,language);
    assert.equal(result.complete,true,entry.text+' => '+result.text+'; '+result.unknown.join(', '));
    assert.equal(result.source,'offline expense parser');
    assert.match(result.text,new RegExp('\\bvia '+entry.payment+'\\b','i'),entry.text+' => '+result.text);
    assert.match(result.text,/\btoday\b/i,entry.text+' => '+result.text);
    const withoutPayment=result.text.replace(/\s+via\s+(?:upi|cash|credit card|debit card|bank transfer|wallet)\b/i,'');
    const parsed=C.parseVoice(withoutPayment,'2026-10-14');
    assert.equal(parsed.amount,entry.amount,entry.text+' => '+result.text);
    assert.ok(parsed.category,entry.text+' => '+result.text);
    categories.add(parsed.category);
  }
  assert.ok(categories.size>=6,'Expected broad category coverage');
}

const hindiItems=['किराने','सब्जियों','दवा','पेट्रोल','किराये','बिजली','कपड़े','फिल्म','कॉफी','ट्रेन'];
const hindiPayments=[['यूपीआई','upi'],['नकद','cash'],['क्रेडिट कार्ड','credit card'],['डेबिट कार्ड','debit card'],['बैंक ट्रांसफर','bank transfer']];
const hindi=[];
for(let item=0;item<hindiItems.length;item++)for(let payment=0;payment<hindiPayments.length;payment++){
  const amount=101+item*10+payment;
  hindi.push({text:'मैंने आज '+hindiItems[item]+' पर '+amount+' रुपये खर्च किए '+hindiPayments[payment][0]+' से',amount,payment:hindiPayments[payment][1]});
  hindi.push({text:'आज '+hindiPayments[payment][0]+' से '+hindiItems[item]+' के लिए '+amount+' रुपये दिए',amount,payment:hindiPayments[payment][1]});
}

const spanishItems=['supermercado','verduras','medicina','gasolina','alquiler','electricidad','ropa','película','café','tren'];
const spanishPayments=[['UPI','upi'],['efectivo','cash'],['tarjeta de crédito','credit card'],['tarjeta de débito','debit card'],['transferencia bancaria','bank transfer']];
const spanish=[];
for(let item=0;item<spanishItems.length;item++)for(let payment=0;payment<spanishPayments.length;payment++){
  const amount=201+item*10+payment;
  spanish.push({text:'Gasté '+amount+' rupias en '+spanishItems[item]+' hoy con '+spanishPayments[payment][0],amount,payment:spanishPayments[payment][1]});
  spanish.push({text:'Hoy pagué '+amount+' rupias por '+spanishItems[item]+' usando '+spanishPayments[payment][0],amount,payment:spanishPayments[payment][1]});
}

test('Offline Hindi parser handles 100 expense phrases across categories and payment methods',()=>verify(hindi,'hi'));
test('Offline Spanish parser handles 100 expense phrases across categories and payment methods',()=>verify(spanish,'es'));
test('Offline parser supports Hindi digits and common spoken-number amounts',()=>{
  const digit=T.fallback('मैंने आज किराने पर २५० रुपये खर्च किए यूपीआई से','hi');
  assert.match(digit.text,/Spent 250 rupees/);
  const spoken=T.fallback('मैंने आज किराने पर दो सौ पचास रुपये खर्च किए नकद से','hi');
  assert.match(spoken.text,/Spent 250 rupees/);
});
test('Offline parser keeps unknown vocabulary visible for correction',()=>{
  const hindi=T.fallback('मैंने आज सदस्यता पर 250 रुपये खर्च किए यूपीआई से','hi');
  const spanish=T.fallback('Gasté 250 rupias en odontología hoy con UPI','es');
  assert.equal(hindi.complete,false);
  assert.ok(hindi.unknown.includes('सदस्यता'));
  assert.equal(spanish.complete,false);
  assert.ok(spanish.unknown.includes('odontología'));
});
test('Offline parser rejects foreign currency and unsafe spoken decimals as INR',()=>{
  const foreign=T.fallback('Gasté 250 dólares en comida hoy','es');
  assert.equal(C.parseVoice(foreign.text,'2026-10-14').amount,null);
  const decimal=T.fallback('Gasté cien coma quince rupias en comida hoy','es');
  assert.equal(decimal.complete,false);
  assert.ok(decimal.unknown.includes('quince'));
});
