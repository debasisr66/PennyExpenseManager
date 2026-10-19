/* Expense-domain Hindi understanding. Financial facts are parsed before wording. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.PennyHindi=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const norm=s=>String(s).normalize('NFD').replace(/\u093c/g,'').normalize('NFC').toLowerCase().replace(/[०-९]/g,c=>String(c.charCodeAt(0)-0x0966)).replace(/[।!?]/g,' ').replace(/\s+/g,' ').trim();
const names='शून्य एक दो तीन चार पांच छह सात आठ नौ दस ग्यारह बारह तेरह चौदह पंद्रह सोलह सत्रह अठारह उन्नीस बीस इक्कीस बाईस तेईस चौबीस पच्चीस छब्बीस सत्ताईस अट्ठाईस उनतीस तीस इकतीस बत्तीस तैंतीस चौंतीस पैंतीस छत्तीस सैंतीस अड़तीस उनतालीस चालीस इकतालीस बयालीस तैंतालीस चवालीस पैंतालीस छियालीस सैंतालीस अड़तालीस उनचास पचास इक्यावन बावन तिरपन चौवन पचपन छप्पन सत्तावन अट्ठावन उनसठ साठ इकसठ बासठ तिरसठ चौंसठ पैंसठ छियासठ सड़सठ अड़सठ उनहत्तर सत्तर इकहत्तर बहत्तर तिहत्तर चौहत्तर पचहत्तर छिहत्तर सतहत्तर अठहत्तर उनासी अस्सी इक्यासी बयासी तिरासी चौरासी पचासी छियासी सत्तासी अट्ठासी नवासी नब्बे इक्यानवे बानवे तिरानवे चौरानवे पंचानवे छियानवे सत्तानवे अट्ठानवे निन्यानवे'.split(' ');
const nums=new Map(names.map((s,i)=>[norm(s),i]));
Object.entries({'पाँच':5,'छ:':6,'छः':6,'पन्द्रह':15,'अठाइस':28,'पचास':50,'निन्यानबे':99,'पैसठ':65,'पैंसठ':65,'pachas':50,'sau':100}).forEach(([k,v])=>nums.set(norm(k),v));
const latin={spend:'खर्च',spent:'खर्च',paid:'दिए',on:'पर',for:'लिए',today:'आज',donation:'दान',donations:'दान',nahi:'नहीं',nahin:'नहीं',lagbhag:'लगभग',karib:'करीब',wapas:'वापस',zyada:'ज्यादा',jyada:'ज्यादा',kam:'कम',adhik:'अधिक',refund:'रिफंड',paise:'पैसे',aaj:'आज',kal:'कल',maine:'मैंने',main:'मैं',par:'पर',pe:'पर',ke:'के',liye:'लिए',mein:'में',me:'में',se:'से',ka:'का',ki:'की',aur:'और',kharch:'खर्च',kharcha:'खर्च',kiye:'किए',kiya:'किया',diye:'दिए',diya:'दिया',khareeda:'खरीदा',kharida:'खरीदा',rupaye:'रुपये',rupay:'रुपये',rupees:'रुपये',rs:'रुपये',rupaiye:'रुपये',nakad:'नकद',cash:'नकद',doodh:'दूध',dudh:'दूध',kirana:'किराना',kirane:'किराने',ration:'राशन',sabzi:'सब्जी',sabji:'सब्जी',sabziyan:'सब्जियां',phal:'फल',chawal:'चावल',atta:'आटा',dal:'दाल',tel:'तेल',chai:'चाय',coffee:'कॉफी',petrol:'पेट्रोल',taxi:'टैक्सी',bus:'बस',train:'ट्रेन',rent:'किराया',kiraya:'किराया',bijli:'बिजली',pani:'पानी',dawai:'दवाई',dava:'दवा',medicine:'दवा',kapde:'कपड़े',movie:'फिल्म',fees:'फीस',school:'स्कूल',subscription:'सदस्यता',upi:'यूपीआई',credit:'क्रेडिट',debit:'डेबिट',card:'कार्ड',bank:'बैंक',transfer:'ट्रांसफर',wallet:'वॉलेट',ek:'एक',do:'दो',teen:'तीन',char:'चार',paanch:'पांच',panch:'पांच',chhe:'छह',saat:'सात',aath:'आठ',nau:'नौ',das:'दस',bees:'बीस',pachis:'पच्चीस',pachees:'पच्चीस',pachas:'पचास',sau:'सौ',hazar:'हजार',hazaar:'हजार',lakh:'लाख',dedh:'डेढ़',dhai:'ढाई',saadhe:'साढ़े',sadhe:'साढ़े',sava:'सवा',paune:'पौने'};
const groups=[
 ['Other',{दान:'donation',चंदा:'donation'}],
 ['Food & groceries',{किराना:'groceries',किराने:'groceries',राशन:'groceries',सुपरमार्केट:'groceries',सब्जी:'produce groceries',सब्जियां:'produce groceries',सब्जियाँ:'produce groceries',सब्जियों:'produce groceries',फल:'fruit groceries',दूध:'milk groceries',दही:'curd groceries',चावल:'rice groceries',आटा:'flour groceries',दाल:'lentils groceries',तेल:'oil groceries',खाना:'food',खाने:'food',नाश्ता:'breakfast food',चाय:'tea',कॉफी:'coffee',रेस्तरां:'restaurant food',भोजन:'food'}],
 ['Health',{दवा:'medicine',दवाई:'medicine',दवाइयां:'medicine',दवाइयाँ:'medicine',दवाइयों:'medicine',फार्मेसी:'pharmacy',डॉक्टर:'doctor',अस्पताल:'hospital',जांच:'medical tests'}],
 ['Transport',{पेट्रोल:'petrol',डीजल:'fuel',टैक्सी:'taxi',ऑटो:'taxi',बस:'bus',ट्रेन:'train',मेट्रो:'train',टिकट:'travel ticket',ईंधन:'fuel'}],
 ['Housing',{किराया:'rent',किराये:'rent',बिजली:'electricity',पानी:'utilities',मेंटेनेंस:'maintenance',रखरखाव:'maintenance',सोसायटी:'maintenance'}],
 ['Shopping',{कपड़े:'clothes shopping',कपड़ा:'clothes shopping',जूते:'shoes shopping',खरीदारी:'shopping',मोबाइल:'shopping',फोन:'shopping'}],
 ['Entertainment',{फिल्म:'movie',फिल्में:'movies',सिनेमा:'cinema',मनोरंजन:'entertainment',गेम:'entertainment'}],
 [null,{फीस:'school fees',स्कूल:'school',पढ़ाई:'education',सदस्यता:'subscription',रिचार्ज:'recharge'}]
];
const items=new Map();for(const [category,list]of groups)for(const [word,english]of Object.entries(list))items.set(norm(word),{category,english});
const filler=new Set('मैंने मैं मेरे आज कल खर्च खर्चा किए किये किया दिए दिये दिया भुगतान खरीदा खरीदी खरीदे खरीदने खरीदे हैं है था थी हुआ हुए कुल पर के लिए से का की को में और कर करके वाला रुपये रुपए रुपया रु यूपीआई नकद नगद कैश क्रेडिट डेबिट कार्ड वॉलेट बैंक ट्रांसफर टैग टैग्स'.split(' ').map(norm));
function numeric(s){if(!/^(?:\d+|\d{1,3}(?:,\d{3})+|\d{1,2}(?:,\d{2})*,\d{3})(?:\.\d{1,2})?$/.test(s))return null;const [whole,decimal='']=s.replace(/,/g,'').split('.');const p=Number(whole)*100+Number(decimal.padEnd(2,'0'));return Number.isSafeInteger(p)&&p>0&&p<=99999999900?p:null;}
function wordsNumber(s){
 const tokens=norm(s).split(' ').filter(Boolean);let qualifier=null;
 if(['डेढ','ढाई','सवा','साढे','पौने'].includes(tokens[0]))qualifier=tokens.shift();
 if(!tokens.length)return null;let total=0,chunk=0,lastScale=Infinity,lastNumber=false;
 for(const t of tokens){if(nums.has(t)){const n=nums.get(t);if(n>=100)return null;if(lastNumber)return null;chunk+=n;lastNumber=true;}else if(t==='सौ'){if(chunk>=100)return null;chunk=(chunk||1)*100;lastNumber=false;}else if(t==='हजार'||t==='लाख'){const scale=t==='हजार'?1000:100000;if(scale>=lastScale)return null;total+=(chunk||1)*scale;chunk=0;lastScale=scale;lastNumber=false;}else if(/^\d+$/.test(t)){if(chunk)return null;chunk=Number(t);lastNumber=true;}else return null;}
 let value=total+chunk;
 if(qualifier){let scale=1;if(tokens.includes('लाख'))scale=100000;else if(tokens.includes('हजार'))scale=1000;else if(tokens.includes('सौ'))scale=100;
  if(qualifier==='डेढ'||qualifier==='ढाई'){if(tokens.length!==1||!['सौ','हजार','लाख'].includes(tokens[0]))return null;value=(qualifier==='डेढ'?1.5:2.5)*scale;}
  else if(qualifier==='सवा'){if(value/scale<1)return null;value+=.25*scale;}
  else if(qualifier==='साढे'){if(value/scale<1)return null;value+=.5*scale;}
  else{if(value/scale<1)return null;value-=.25*scale;}
 }
 return Number.isSafeInteger(Math.round(value*100))&&value>0?Math.round(value*100):null;
}
function parse(original,date='2000-01-01'){
 const raw=String(original||'');if(!raw.trim()||raw.length>1000)throw Error('Use a short expense phrase, up to 1,000 characters.');
 let text=norm(raw).replace(/(?:^|\s)(?:rs\.?|inr|rupees?)\s*(?=\d)/gi,m=>m.startsWith(' ')?' ₹':'₹').replace(/(?:^|\s)(?:रू\.?|रु\.?)\s*(?=\d)/gu,m=>m.startsWith(' ')?' ₹':'₹').replace(/रूपये|रूपए|रुपयों|रू(?=\s|$|[.,])/gu,'रुपये').replace(/[a-z]+/g,w=>latin[w]?norm(latin[w]):w);
 const issues=[],unknown=[],evidence=[];let amountPaise=null;
 const currency=/(?:₹\s*([\d,.]+)|([\d,.]+)\s*(?:रुपये|रुपए|रुपया|रु)(?=\s|$|[.,]))/gu;
 const matches=[...text.matchAll(currency)];
 // Numeric spans must be maximal: never consume a suffix from grouped or malformed money.
 if(matches.length===1){const m=matches[0];const before=text.slice(0,m.index);if(/[\d,.-]$/.test(before)||/(?:साढे|सवा|पौने|डेढ|ढाई)\s*$/u.test(before))issues.push('amount');else amountPaise=numeric(m[1]||m[2]);evidence.push(m[0]);}
 else if(matches.length>1)issues.push('multiple amounts');
 const markers=[...text.matchAll(/₹|(?:रुपये|रुपए|रुपया|रु)(?=\s|$|[.,])/gu)];if(markers.length>1)issues.push('multiple amounts');
 const end=text.search(/(?:रुपये|रुपए|रुपया|रु)(?=\s|$)/u);
 let used=new Set(),wordPhrase=[];
 if(end>=0&&matches.length===0){const prefix=text.slice(0,end).trim().split(' ');const phrase=[];for(let i=prefix.length-1;i>=0;i--){const t=prefix[i];if(nums.has(t)||['सौ','हजार','लाख','डेढ','ढाई','सवा','साढे','पौने'].includes(t)||/^\d+$/.test(t))phrase.unshift(t);else break;}if(phrase.length){wordPhrase=phrase;amountPaise=wordsNumber(phrase.join(' '));phrase.forEach(t=>used.add(t));evidence.push(phrase.join(' '));}}
 const prefix=end>=0?text.slice(0,end):'';const numericWords=prefix.split(' ').filter(t=>nums.has(t)||['सौ','हजार','लाख','डेढ','ढाई','सवा','साढे','पौने'].includes(t));if(markers.length>1||matches.length===1&&numericWords.length||matches.length===0&&numericWords.length>wordPhrase.length){amountPaise=null;issues.push('amount: incomplete or multiple monetary spans');}
 if(/(?:डॉलर|डालर|यूरो|पाउंड|dollars?|euros?|usd|eur)|[$€£¥]/iu.test(raw)){amountPaise=null;issues.push('foreign currency: enter INR');}
 if(/(?:नहीं|नही|लगभग|करीब|ज्यादा|अधिक|कम|न्यूनतम|अधिकतम|वापस|रिफंड|नहीँ|नहीं बल्कि)|(?:\bapproximately\b)/u.test(text)||text.includes('दशमलव')||/(?:^|\s)[+-]\s*\d/.test(text)){amountPaise=null;issues.push('amount needs explicit correction');}
 const withoutMoney=matches.reduce((v,m)=>v.replace(m[0],' '),text).replace(/\b\d{4}-\d{2}-\d{2}\b/g,' ').replace(/#[\p{L}\p{M}\p{N}_-]+/gu,' ');if(matches.length===1&&/\d/.test(withoutMoney)){amountPaise=null;issues.push('multiple numbers: verify amount');}
 if(/(?:पैसे|पैसा|पैसों)/u.test(text)){amountPaise=null;issues.push('amount: rupees and paise need explicit correction');}
 let residual=text;for(const span of evidence)residual=residual.replace(span,' ');residual=residual.replace(/\b\d{4}-\d{2}-\d{2}\b/g,' ').replace(/#[\p{L}\p{M}\p{N}_-]+/gu,' ');if(residual.split(/\s+/u).some(t=>/\d/.test(t)||nums.has(t)||['सौ','हजार','लाख','डेढ','ढाई','सवा','साढे','पौने'].includes(t))){amountPaise=null;issues.push('amount: extra numeric evidence');}
 if(amountPaise===null)issues.push('amount');
 let dateValue=null;if(/(?:^|\s)कल(?:\s|$)/u.test(text))issues.push('date: choose yesterday or tomorrow');else if(/(?:^|\s)आज(?:\s|$)/u.test(text))dateValue=date||null;
 const dates=text.match(/\b\d{4}-\d{2}-\d{2}\b/g)||[];const iso=dates.length===1?[dates[0]]:null;if(dates.length>1){dateValue=null;issues.push('date: choose one of the spoken dates');}if(iso){const d=new Date(iso[0]+'T12:00:00Z');if(Number.isNaN(d.getTime())||d.toISOString().slice(0,10)!==iso[0])issues.push('date: invalid date');else dateValue=iso[0];}
 const rails=[];if(/क्रेडिट\s+कार्ड/u.test(text))rails.push('credit-card');if(/डेबिट\s+कार्ड/u.test(text))rails.push('debit-card');if(/बैंक\s+ट्रांसफर/u.test(text))rails.push('bank-transfer');if(/यूपीआई/u.test(text))rails.push('upi');if(/(?:नकद|नगद|कैश)/u.test(text))rails.push('cash');if(/वॉलेट/u.test(text))rails.push('wallet');
 const paymentMethod=rails.length===1?rails[0]:'unspecified';if(rails.length>1)issues.push('payment method');
 const tags=(raw.match(/#[\p{L}\p{M}\p{N}_-]+/gu)||[]).map(x=>x.slice(1));let knownItems=[],categories=new Set();
 for(const t of text.replace(/\b\d{4}-\d{2}-\d{2}\b/g,' ').replace(/#[\p{L}\p{M}\p{N}_-]+/gu,' ').replace(/[\d,.₹]+/g,' ').split(/\s+/u).filter(Boolean)){
  if(items.has(t)){const it=items.get(t);if(!knownItems.includes(it.english))knownItems.push(it.english);if(it.category)categories.add(it.category);else issues.push('category');}
  else if(!filler.has(t)&&!used.has(t)&&!nums.has(t)&&!['सौ','हजार','लाख','साढे','सवा','पौने','डेढ','ढाई'].includes(t)&&!/^\d/.test(t)&&!unknown.includes(t))unknown.push(t);
 }
 if(!knownItems.length)issues.push('expense type');if(categories.size>1)issues.push('category');
 const category=categories.size===1?[...categories][0]:null;
 if(/(?:^|\s)न(?:\s|$)/u.test(text)){amountPaise=null;issues.push('amount needs explicit correction');}
 const description=knownItems.join(' and ');const uniq=[...new Set([...issues,...unknown])];
 const englishDraft=(amountPaise!==null?'Spent '+(amountPaise/100)+' rupees':'Spent an amount')+' on '+(description||'expense')+(dateValue===date?' today':dateValue?' on '+dateValue:'')+(paymentMethod!=='unspecified'?' via '+paymentMethod.replace(/-/g,' '):'')+(tags.length?' '+tags.map(x=>'#'+x).join(' '):'');
 return {originalTranscript:raw,normalizedTranscript:text,fields:{amountPaise,date:dateValue,category,paymentMethod,descriptionItems:knownItems,tags},evidence,unknownSpans:unknown,issues:uniq,englishDraft,reviewState:uniq.length?'needs-correction':'review-ready'};
}

// A correction is accepted only when the reviewed draft explicitly changes the
// monetary evidence. Editing punctuation/description must not approve a guess.
function draftAmount(text){
 const value=String(text||'').normalize('NFKC').toLowerCase().replace(/[०-९]/g,c=>String(c.charCodeAt(0)-0x0966));
 if(value.length>1000||/[$€£¥]|\b(?:usd|eur|gbp|dollars?|euros?|pounds?|approximately|about|refund|not|no|least|more|less|paise|paisa)\b/u.test(value))return null;
 const pattern=/(?:₹|rs\.?|inr|rupees?)\s*([\d][\d,.]*)|([\d][\d,.]*)\s*(?:rupees?|rs\.?|inr)(?![a-z])/gu;
 const matches=[...value.matchAll(pattern)];if(matches.length!==1)return null;
 const m=matches[0],before=value.slice(0,m.index);if(/[\p{L}\p{N},.+-]$/u.test(before))return null;
 const amount=numeric(m[1]||m[2]);if(amount===null)return null;
 const rest=(value.slice(0,m.index)+' '+value.slice(m.index+m[0].length)).replace(/\b\d{4}-\d{2}-\d{2}\b/g,' ').replace(/#[\p{L}\p{M}\p{N}_-]+/gu,' ');
 if(/\d|₹|\b(?:rs|inr|rupees?|zero|one|two|three|four|five|six|seven|eight|nine|ten|twenty|thirty|forty|fifty|hundred|thousand|lakh)\b/u.test(rest))return null;
 return amount;
}
function reviewedAmount(structured,base,draft){
 const amount=draftAmount(draft),original=draftAmount(base);
 if(amount===null)return null;
 const unresolved=structured.fields.amountPaise===null||structured.issues.some(x=>x.startsWith('amount')||x.startsWith('multiple')||x.startsWith('foreign currency'));
 if(unresolved&&amount===original)return null;
 return amount;
}

return {parse,numeric,wordsNumber,draftAmount,reviewedAmount,normalize:norm};
});
