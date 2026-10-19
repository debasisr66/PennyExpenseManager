/* Deterministic Hindi/Spanish expense parser plus the desktop Translator API when available. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./core.js'),require('./hindi.js'));else root.PennyTranslation=factory(root.PennyCore,root.PennyHindi);})(typeof globalThis!=='undefined'?globalThis:this,function(C,H){
'use strict';
const words={
hi:{
'मैंने':'','मैं':'','मेरे':'','आज':'today','कल':'yesterday','खर्च':'spent','खर्चा':'spent','किए':'','किया':'','दिए':'paid','दिया':'paid','भुगतान':'paid','खरीदा':'bought','खरीदी':'bought','जोड़ो':'add','कुल':'amount',
'रुपये':'rupees','रुपए':'rupees','रुपया':'rupees','रु':'rupees','पर':'on','के':'','लिए':'for','से':'by','का':'','की':'','को':'','में':'','और':'and','कर':'','करके':'','हुआ':'','वाला':'',
'किराना':'groceries','किराने':'groceries','राशन':'groceries','सुपरमार्केट':'groceries','सब्जी':'produce','सब्ज़ी':'produce','सब्जियां':'produce','सब्जियाँ':'produce','सब्जियों':'produce','फल':'groceries','दूध':'groceries',
'खाना':'food','खाने':'food','नाश्ता':'food','दोपहर':'lunch','रात':'dinner','रेस्तरां':'restaurant','कॉफी':'coffee','चाय':'tea',
'किराया':'rent','किराये':'rent','बिजली':'electricity','पानी':'utilities','मेंटेनेंस':'maintenance','रखरखाव':'maintenance','सोसायटी':'maintenance',
'दवा':'medicine','दवाई':'medicine','दवाइयाँ':'medicine','फार्मेसी':'pharmacy','डॉक्टर':'doctor','अस्पताल':'hospital','जाँच':'medical','जांच':'medical',
'पेट्रोल':'petrol','डीजल':'fuel','डीज़ल':'fuel','टैक्सी':'taxi','ऑटो':'taxi','बस':'bus','ट्रेन':'train','मेट्रो':'train','टिकट':'ticket','ईंधन':'fuel',
'कपड़े':'clothes','कपड़ा':'clothes','कपड़ा':'clothes','जूते':'shoes','खरीदारी':'shopping','मोबाइल':'shopping','फोन':'shopping',
'फिल्म':'movie','फिल्में':'movies','सिनेमा':'cinema','मनोरंजन':'entertainment','गेम':'entertainment','परिवार':'family','यात्रा':'travel','टैग':'tags',
'नकद':'cash','नगद':'cash','कैश':'cash','यूपीआई':'upi','क्रेडिट':'credit','डेबिट':'debit','कार्ड':'card','वॉलेट':'wallet','बैंक':'bank','ट्रांसफर':'transfer',
'शून्य':'zero','एक':'one','दो':'two','तीन':'three','चार':'four','पांच':'five','पाँच':'five','छह':'six','सात':'seven','आठ':'eight','नौ':'nine','दस':'ten',
'ग्यारह':'eleven','बारह':'twelve','तेरह':'thirteen','चौदह':'fourteen','पंद्रह':'fifteen','सोलह':'sixteen','सत्रह':'seventeen','अठारह':'eighteen','उन्नीस':'nineteen',
'बीस':'twenty','तीस':'thirty','चालीस':'forty','पचास':'fifty','साठ':'sixty','सत्तर':'seventy','अस्सी':'eighty','नब्बे':'ninety','सौ':'hundred','हजार':'thousand','हज़ार':'thousand','लाख':'lakh','दशमलव':'point',
'पच्चीस':'twenty five','पचहत्तर':'seventy five','ढाई':'two point five'
},
es:{
'gasté':'spent','gaste':'spent','gastado':'spent','gasto':'spent','pagué':'paid','pague':'paid','pagar':'paid','pagado':'paid','compré':'bought','compre':'bought','comprado':'bought','costó':'amount','costo':'amount','cuesta':'amount',
'he':'','yo':'','mi':'','hoy':'today','ayer':'yesterday','rupias':'rupees','rupia':'rupees','en':'on','por':'for','para':'for','con':'by','usando':'using','mediante':'using','de':'','del':'','al':'','la':'','el':'','los':'','las':'','una':'one','un':'one','unos':'','fueron':'',
'comida':'food','alimentos':'groceries','comestibles':'groceries','supermercado':'groceries','verduras':'produce','fruta':'groceries','frutas':'groceries','leche':'groceries','desayuno':'food','café':'coffee','cafe':'coffee','almuerzo':'lunch','cena':'dinner','restaurante':'restaurant',
'alquiler':'rent','renta':'rent','electricidad':'electricity','agua':'utilities','mantenimiento':'maintenance','vivienda':'housing',
'medicina':'medicine','medicinas':'medicine','farmacia':'pharmacy','médico':'doctor','medico':'doctor','doctor':'doctor','hospital':'hospital','análisis':'medical','analisis':'medical',
'gasolina':'petrol','combustible':'fuel','taxi':'taxi','autobús':'bus','autobus':'bus','tren':'train','metro':'train','billete':'ticket','transporte':'transport',
'ropa':'clothes','zapatos':'shoes','compras':'shopping','móvil':'shopping','movil':'shopping','teléfono':'shopping','telefono':'shopping',
'cine':'movie','película':'movie','pelicula':'movie','entretenimiento':'entertainment','juego':'entertainment','familia':'family','viaje':'travel','etiqueta':'tag','etiquetas':'tags',
'efectivo':'cash','upi':'upi','tarjeta':'card','crédito':'credit','credito':'credit','débito':'debit','debito':'debit','transferencia':'transfer','bancaria':'bank','banco':'bank','billetera':'wallet',
'cero':'zero','uno':'one','dos':'two','tres':'three','cuatro':'four','cinco':'five','seis':'six','siete':'seven','ocho':'eight','nueve':'nine','diez':'ten',
'once':'eleven','doce':'twelve','trece':'thirteen','catorce':'fourteen','quince':'fifteen','dieciséis':'sixteen','dieciseis':'sixteen','diecisiete':'seventeen','dieciocho':'eighteen','diecinueve':'nineteen',
'veinte':'twenty','treinta':'thirty','cuarenta':'forty','cincuenta':'fifty','sesenta':'sixty','setenta':'seventy','ochenta':'eighty','noventa':'ninety','cien':'hundred','ciento':'hundred','doscientos':'two hundred','trescientos':'three hundred','cuatrocientos':'four hundred','quinientos':'five hundred','seiscientos':'six hundred','setecientos':'seven hundred','ochocientos':'eight hundred','novecientos':'nine hundred','mil':'thousand',
'coma':'point','punto':'point','veinticinco':'twenty five','veintidós':'twenty two','veintidos':'twenty two','dólares':'dollars','dolares':'dollars','dólar':'dollar','dolar':'dollar','euros':'euros','pesos':'pesos','libras':'pounds'
}};
const descriptions={
hi:[
[/किरान|राशन|सुपरमार्केट/u,'groceries'],[/सब्ज/u,'produce groceries'],[/फल/u,'fruit groceries'],[/दूध/u,'milk groceries'],
[/दवा|दवाई/u,'medicine'],[/फार्मेसी/u,'pharmacy'],[/डॉक्टर/u,'doctor'],[/अस्पताल/u,'hospital'],[/जाँच|जांच/u,'medical tests'],
[/पेट्रोल/u,'petrol'],[/डी[ज़ज]ल|ईंधन/u,'fuel'],[/टैक्सी|ऑटो/u,'taxi'],[/बस/u,'bus'],[/ट्रेन|मेट्रो/u,'train'],[/टिकट/u,'travel ticket'],
[/किराय/u,'rent'],[/बिजली/u,'electricity'],[/पानी/u,'utilities'],[/मेंटेनेंस|रखरखाव|सोसायटी/u,'maintenance'],
[/कपड़/u,'clothes shopping'],[/जूते/u,'shoes shopping'],[/मोबाइल|फोन|खरीदारी/u,'shopping'],
[/फिल्म|सिनेमा/u,'movie'],[/मनोरंजन|गेम/u,'entertainment'],[/कॉफी/u,'coffee'],[/चाय/u,'tea'],[/नाश्ता/u,'food breakfast'],[/दोपहर/u,'lunch'],[/रात/u,'dinner'],[/रेस्तरां/u,'restaurant food'],[/खान/u,'food']
],
es:[
[/supermercado|alimentos|comestibles/u,'groceries'],[/verduras/u,'produce groceries'],[/frutas?/u,'fruit groceries'],[/leche/u,'milk groceries'],
[/medicinas?/u,'medicine'],[/farmacia/u,'pharmacy'],[/médico|medico|doctor/u,'doctor'],[/hospital/u,'hospital'],[/análisis|analisis/u,'medical tests'],
[/gasolina/u,'petrol'],[/combustible/u,'fuel'],[/taxi/u,'taxi'],[/autobús|autobus/u,'bus'],[/tren|metro/u,'train'],[/billete|viaje/u,'travel ticket'],[/transporte/u,'transport'],
[/alquiler|renta/u,'rent'],[/electricidad/u,'electricity'],[/agua/u,'utilities'],[/mantenimiento|vivienda/u,'maintenance'],
[/ropa/u,'clothes shopping'],[/zapatos/u,'shoes shopping'],[/móvil|movil|teléfono|telefono|compras/u,'shopping'],
[/película|pelicula|cine/u,'movie'],[/entretenimiento|juego/u,'entertainment'],[/café|cafe/u,'coffee'],[/desayuno/u,'food breakfast'],[/almuerzo/u,'lunch'],[/cena/u,'dinner'],[/restaurante/u,'restaurant food'],[/comida/u,'food']
]};
const payments={
hi:[[/क्रेडिट\s+कार्ड/u,'credit card'],[/डेबिट\s+कार्ड/u,'debit card'],[/बैंक\s+ट्रांसफर/u,'bank transfer'],[/यूपीआई|\bupi\b/u,'upi'],[/नकद|नगद|कैश/u,'cash'],[/वॉलेट/u,'wallet']],
es:[[/tarjeta\s+(?:de\s+)?crédito|tarjeta\s+(?:de\s+)?credito/u,'credit card'],[/tarjeta\s+(?:de\s+)?débito|tarjeta\s+(?:de\s+)?debito/u,'debit card'],[/transferencia\s+bancaria|transferencia\s+de\s+banco/u,'bank transfer'],[/\bupi\b/u,'upi'],[/efectivo|\bcash\b/u,'cash'],[/billetera/u,'wallet']]
};
const numberTerms='zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|lakh|million|point|and';
const numberPattern='(?:-?\\d+(?:\\.\\d+)?|(?:'+numberTerms+')(?:[ -]+(?:'+numberTerms+'))*)';
function normalize(text,language){
let raw=String(text).normalize('NFKC').toLowerCase();
if(language==='es')raw=raw.replace(/\b\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?\b/g,value=>value.replace(/\./g,'').replace(',','.')).replace(/\b(\d+),(\d{1,2})\b/g,'$1.$2');
if(language==='hi')raw=raw.replace(/ढाई\s+सौ/g,'250').replace(/ढाई\s+ह[ज़ज]ार/g,'2500').replace(/[०-९]/g,ch=>String(ch.charCodeAt(0)-0x0966)).replace(/।/g,' ');
return raw.replace(/\s+/g,' ').trim();
}
function tokenize(raw){return raw.match(/#[\p{L}\p{M}\p{N}_-]+|\d{4}-\d{2}-\d{2}|-?\d+(?:\.\d+)?|[\p{L}\p{M}]+|[₹$€£¥,.!?]/gu)||[];}
function translateTokens(raw,language){
const dictionary=words[language],unknown=[];
const translated=tokenize(raw).map(token=>{const lower=token.toLowerCase();if(Object.hasOwn(dictionary,lower))return dictionary[lower];if(/^#|^-?\d|^[₹$€£¥,.!?]$/.test(token)||['upi','inr','rs','cash'].includes(lower))return token;if(!unknown.includes(token))unknown.push(token);return token;}).filter(Boolean).join(' ').replace(/\s+([,.!?])/g,'$1').replace(/\bcard (credit|debit)\b/g,'$1 card');
return{translated,unknown};
}
function englishNumber(value,language){
let number=C.spokenNumber(value);
if(number===null&&language==='es'&&value.includes(' point ')){const parts=value.split(' point '),whole=C.spokenNumber(parts[0]),decimal=C.spokenNumber(parts[1]);if(whole!==null&&decimal!==null&&decimal>=0&&decimal<=99)number=whole+decimal/Math.pow(10,String(Math.trunc(decimal)).length);}
return number;
}
function amountFrom(translated,language){
const patterns=[new RegExp('₹\\s*('+numberPattern+')','i'),new RegExp('\\b(?:rs\\.?|inr)\\s*('+numberPattern+')','i'),new RegExp('('+numberPattern+')\\s+rupees?\\b','i')];
for(const pattern of patterns){const match=translated.match(pattern);if(match){const amount=englishNumber(match[1],language);if(Number.isFinite(amount)&&amount>0&&amount<=C.MAX_AMOUNT)return amount;}}
return null;
}
function firstMatch(raw,list){for(const pair of list)if(pair[0].test(raw))return pair[1];return null;}
function fallback(text,language){
if(language==='hi'){const result=H.parse(text);return{text:result.englishDraft,complete:result.reviewState==='review-ready',unknown:result.issues,source:'offline expense parser',structured:result};}
if(!words[language])return{text:String(text),complete:true,source:'original',unknown:[]};
const raw=normalize(text,language),tokenResult=translateTokens(raw,language);
const foreign=/\b(?:dollars?|euros?|pounds?|pesos?)\b/i.test(tokenResult.translated)||/[$€£¥]/.test(raw);
const unsafeDecimal=language==='es'&&raw.match(/\b(?:coma|punto)\s+(once|doce|trece|catorce|quince|dieciséis|dieciseis|diecisiete|dieciocho|diecinueve)\b/u);
const numericSpans=raw.match(/\d[\d.,]*/g)||[];const unsafeNumber=numericSpans.some(v=>!/^\d+(?:\.\d{1,2})?$/.test(v))||numericSpans.length>1||(raw.match(/\brupias?\b/g)||[]).length>1;
const amount=foreign||unsafeDecimal||unsafeNumber||tokenResult.unknown.length?null:amountFrom(tokenResult.translated,language);
const foundDescriptions=descriptions[language].filter(pair=>pair[0].test(raw)).map(pair=>pair[1]),foundPayments=payments[language].filter(pair=>pair[0].test(raw)).map(pair=>pair[1]);const description=[...new Set(foundDescriptions)].join(' and ')||null,payment=foundPayments.length===1?foundPayments[0]:null;
const day=language==='hi'?(/(?:^|\s)आज(?:\s|$)/u.test(raw)?'today':/(?:^|\s)कल(?:\s|$)/u.test(raw)?'yesterday':null):(/\bhoy\b/u.test(raw)?'today':/\bayer\b/u.test(raw)?'yesterday':null);
const tags=(raw.match(/#[\p{L}\p{M}\p{N}_-]+/gu)||[]).map(tag=>tag.slice(1)),unknown=tokenResult.unknown.slice();
if(foundPayments.length>1)unknown.push('payment method');if((raw.match(/\brupias?\b/g)||[]).length>1)unknown.push('multiple amounts');
if(unsafeDecimal)unknown.push(unsafeDecimal[1]);
if(amount===null&&!foreign)unknown.push('amount');
if(!description)unknown.push('expense type');
if(foreign)return{text:tokenResult.translated,complete:unknown.length===0,unknown:[...new Set(unknown)],source:'offline expense parser'};
const safeDescription=description||tokenResult.unknown.join(' ')||'expense';
const draft=(amount===null?'Spent an amount':'Spent '+amount+' rupees')+' on '+safeDescription+(day?' '+day:'')+(payment?' via '+payment:'')+(tags.length?' tags '+tags.join(' '):'');
return{text:draft,complete:unknown.length===0,unknown:[...new Set(unknown)],source:'offline expense parser'};
}
async function prepare(api,language){if(language==='en'||!api)return null;const availability=await api.availability({sourceLanguage:language,targetLanguage:'en'});if(availability==='unavailable')return null;return api.create({sourceLanguage:language,targetLanguage:'en'});}
async function translate(text,language,translator){
if(language==='en')return{text:String(text),complete:true,source:'original',unknown:[]};
if(translator&&language!=='hi'){const normalizedSource=language==='es'?normalize(text,language):String(text);const result=await Promise.race([translator.translate(normalizedSource),new Promise((_,reject)=>setTimeout(()=>reject(Error('Translation timed out.')),3500))]);if(typeof result!=='string'||!result.trim()||result.length>1000)throw Error('Translation did not return a usable English draft.');const local=fallback(String(text),language),sourceAmount=C.parseVoice(local.text,'2026-01-01').amount,translatedAmount=C.parseVoice(result,'2026-01-01').amount;const mismatch=local.complete&&sourceAmount!==null&&sourceAmount!==translatedAmount;return{text:result,complete:local.complete&&!mismatch,source:'on-device translation',unknown:[...local.unknown,...(mismatch?['amount differs from the source; correct it before using this draft']:[])]};}
return fallback(text,language);
}
return{fallback,prepare,translate};
});
