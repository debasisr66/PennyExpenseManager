const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../core.js');
const reference = '2026-10-12';
const rows = [
  { id:'a', description:'Weekly groceries', date:'2026-10-03', cents:86400, category:'Food & groceries', tags:['groceries','family'] },
  { id:'b', description:'Fresh produce', date:'2026-10-10', cents:32200, category:'Food & groceries', tags:['groceries'] },
  { id:'c', description:'Train pass', date:'2026-10-04', cents:45000, category:'Transport', tags:['travel'] },
  { id:'d', description:'Dinner out', date:'2026-09-15', cents:38000, category:'Food & groceries', tags:['family'] }
];
const ids = query => C.searchExpenses(rows, query, reference).expenses.map(x => x.id);
const expense = overrides => ({ id:'new', description:'Lunch', amount:'25.50', date:reference, category:'Food & groceries', tags:'', ...overrides });
test('Amounts retain exact paise precision', () => { assert.equal(C.toPaise('0.01'),1); assert.equal(C.toPaise('25.50'),2550); assert.throws(() => C.toPaise('999999999.99')); assert.equal(C.toPaise('999999999'),99999999900); });
for (const amount of ['', '0', '-1', 'NaN', 'Infinity', '1.999', '1e4', '1000000000']) test(`Reject invalid expense amount ${JSON.stringify(amount)}`, () => assert.throws(() => C.toPaise(amount)));
test('Zero budget is allowed', () => assert.equal(C.toPaise('0',true),0));
test('Tags normalize case, commas and duplicates', () => assert.deepEqual(C.parseTags('#Groceries, family #groceries'),['groceries','family']));
test('Unicode and hyphenated tags are supported', () => assert.deepEqual(C.parseTags('#किराना #work-trip'),['किराना','work-trip']));
for (const tag of ['#bad!', '#<script>', '#'+'a'.repeat(33), Array.from({length:13},(_,i)=>'tag'+i).join(' ')]) test(`Reject malformed or excessive tags ${tag.slice(0,20)}`, () => assert.throws(() => C.parseTags(tag)));
test('Description hashtags become searchable tags', () => assert.deepEqual(C.extractTags('Weekly groceries #groceries #family', '#groceries #weekend'), {description:'Weekly groceries',tags:['groceries','family','weekend']}));
test('Tags alone are not a description', () => assert.throws(() => C.validateExpense(expense({description:'#groceries'}))));
test('Validate expense collects fields and extracts inline tags', () => assert.deepEqual(C.validateExpense(expense({description:'Lunch #food',tags:'#family'})),{id:'new',description:'Lunch',date:reference,cents:2550,category:'Food & groceries',tags:['food','family']}));
for (const date of ['2026-02-30','2025-02-29','2026-13-01','1899-01-01','not a date']) test(`Reject invalid calendar date ${date}`,()=>assert.throws(()=>C.validateExpense(expense({date}))));
test('Leap days and year rollover work', () => { assert.equal(C.validDate('2024-02-29'),true); assert.equal(C.previousMonth('2026-01-12'),'2025-12'); assert.equal(C.shiftDate('2026-01-01',-1),'2025-12-31'); });
test('Unknown categories are rejected',()=>assert.throws(()=>C.validateExpense(expense({category:'Fake'}))));
test('V1 migration preserves all amounts, IDs, dates, budgets and descriptions',()=>{const v1={expenses:rows.map(({tags,...x})=>x),budgets:{'2026-10':100000}};const copy=JSON.stringify(v1);const migrated=C.migrateState(v1);assert.equal(migrated.currency,'INR');assert.equal(migrated.schemaVersion,2);assert.deepEqual(migrated.expenses.map(({tags,...x})=>x),v1.expenses);assert.deepEqual(migrated.budgets,v1.budgets);assert.ok(migrated.expenses.every(x=>x.tags.length===0));assert.equal(JSON.stringify(v1),copy);});
test('V2 migration retains tags',()=>assert.deepEqual(C.migrateState({schemaVersion:2,expenses:rows,budgets:{}}).expenses,rows));
test('Corrupt state and duplicate IDs are rejected',()=>{assert.throws(()=>C.migrateState({expenses:[rows[0],rows[0]],budgets:{}}));assert.throws(()=>C.migrateState({expenses:rows,budgets:{'2026-13':1}}));assert.throws(()=>C.migrateState({expenses:rows,budgets:{'2026-10':-1}}));assert.throws(()=>C.migrateState({expenses:rows.map(x=>({...x,tags:'bad'})),budgets:{}}));});
test('Monthly totals and categories exclude other months',()=>{const result=C.summary({expenses:rows,budgets:{'2026-10':200000}},'2026-10');assert.equal(result.total,163600);assert.equal(result.remaining,36400);assert.equal(result.exceeded,false);assert.deepEqual(result.byCategory,[{category:'Food & groceries',cents:118600},{category:'Transport',cents:45000}]);});
test('Budget warning boundaries include zero, equal and unset budgets',()=>{assert.equal(C.summary({expenses:rows,budgets:{'2026-10':0}},'2026-10').exceeded,true);assert.equal(C.summary({expenses:rows,budgets:{'2026-10':163600}},'2026-10').exceeded,false);assert.equal(C.summary({expenses:rows,budgets:{}},'2026-10').remaining,null);});
const searches = [
  ['', ['b','c','a','d']], ['GROCERIES',['b','a','d']], ['#groceries',['b','a']], ['#grocer',['b','a']],
  ['#groceries #family',['a']], ['groceries over 500',['a']], ['this month #family',['a']], ['last month',['d']],
  ['"weekly groceries"',['a']], ['groceris',['b','a','d']], ['category:transport',['c']], ['min:322 max:450',['b','c','d']],
  ['after:2026-10-04 before:2026-10-10',['b','c']], ['month:2026-09',['d']], ['tag:family',['a','d']],
  ['864',['a']], ['2026-10-10',['b']], ['under 400',['b','d']], ['min:450 max:450',['c']], ['nothingmatches',[]]
];
for (const [query,expected] of searches) test(`Smart search ${JSON.stringify(query)}`,()=>assert.deepEqual(ids(query),expected));
for (const query of ['month:2026-13','after:2026-02-30','min:nope','"unclosed']) test(`Invalid search has an explanation: ${query}`,()=>{const result=C.searchExpenses(rows,query,reference);assert.ok(result.errors.length);assert.equal(result.expenses.length,0);});
test('Voice: digit amount, date, category, description and tags',()=>assert.deepEqual(C.parseVoice('Spent 250 rupees on groceries today, tags groceries and family',reference),{amount:250,date:reference,description:'groceries',category:'Food & groceries',tags:['groceries','family'],warnings:[]}));
test('Voice: spoken number words and yesterday',()=>{const draft=C.parseVoice('Paid two hundred fifty rupees for train pass yesterday tag travel',reference);assert.equal(draft.amount,250);assert.equal(draft.date,'2026-10-11');assert.equal(draft.category,'Transport');assert.equal(draft.description,'train pass');assert.deepEqual(draft.tags,['travel']);});
test('Voice: decimals and hashtags',()=>{const draft=C.parseVoice('Spent twenty five point five zero rupees on coffee #weekend',reference);assert.equal(draft.amount,25.5);assert.deepEqual(draft.tags,['weekend']);});
test('Voice: explicit ISO date does not become the amount',()=>{const draft=C.parseVoice('Spent 90 rupees on medicine 2026-10-01',reference);assert.equal(draft.amount,90);assert.equal(draft.date,'2026-10-01');assert.equal(draft.category,'Health');});
test('Voice: missing amount never guesses from a date',()=>{const draft=C.parseVoice('Groceries 2026-10-10',reference);assert.equal(draft.amount,null);assert.ok(draft.warnings.length);});
test('Voice: invalid amount cannot become a positive expense',()=>{const draft=C.parseVoice('Spent -25 rupees on groceries',reference);assert.equal(draft.amount,null);assert.ok(draft.warnings.length);});
test('Voice: foreign currency is not silently treated as INR',()=>{const draft=C.parseVoice('Spent 25 dollars on groceries',reference);assert.equal(draft.amount,null);assert.ok(draft.warnings.some(x=>x.includes('INR')));});
test('Voice: invalid dates require review',()=>{const draft=C.parseVoice('Spent 25 rupees on lunch 2026-02-30',reference);assert.equal(draft.date,null);assert.ok(draft.warnings.length);});
test('Conversion computes exact manual examples without touching records',()=>{const before=JSON.stringify(rows);assert.equal(C.convert(1000,0.01),10);assert.equal(C.convert(250,1),250);assert.equal(C.convert(0,0.01),0);assert.equal(JSON.stringify(rows),before);});
for(const [amount,rate] of [['',1],[-1,1],[10,0],[10,-1],[10,Infinity],[Infinity,1]])test(`Invalid conversion ${amount}/${rate}`,()=>assert.equal(C.convert(amount,rate),null));
test('Exchange-rate payload checks currency pair, date and number',()=>{assert.deepEqual(C.validateRate({base:'INR',quote:'USD',date:reference,rate:0.01},'USD'),{quote:'USD',date:reference,rate:0.01});for(const payload of [{base:'USD',quote:'USD',date:reference,rate:1},{base:'INR',quote:'EUR',date:reference,rate:1},{base:'INR',quote:'USD',date:'bad',rate:1},{base:'INR',quote:'USD',date:reference,rate:-1}])assert.throws(()=>C.validateRate(payload,'USD'));});
