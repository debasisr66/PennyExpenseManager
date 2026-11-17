'use strict';
// One version source: VERSION holds the app version; every copy below must match it.
// To bump: edit VERSION, run the tests, update each file a failure names.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
const version=read('VERSION').trim();
const N='(\\d+\\.\\d+\\.\\d+)';
const copies=[
  {file:'index.html',pattern:'(?<![A-Za-z0-9])V'+N+'\\b',count:2,what:'header and What\'s New badge'},
  {file:'index.html',pattern:'Version\\s+'+N+'\\b',count:1,what:'Settings › About'},
  {file:'diagnostics.js',pattern:"appVersion:\\s*['\"]"+N+"['\"]",count:2,what:'diagnostic events and export'},
  {file:'scripts/penny',pattern:'PENNY_VERSION="'+N+'"',count:1,what:'launcher'},
  {file:'compose.yaml',pattern:'penny-expense-manager:'+N+'\\b',count:1,what:'Docker image tag'}
];
test('VERSION is MAJOR.MINOR.PATCH',()=>assert.match(version,/^\d+\.\d+\.\d+$/,'VERSION must contain one version such as 3.2.0'));
for(const copy of copies)test(`version copy in ${copy.file} (${copy.what}) matches VERSION`,()=>{
  const found=[...read(copy.file).matchAll(new RegExp(copy.pattern,'g'))].map(m=>m[1]);
  assert.equal(found.length,copy.count,`${copy.file}: expected ${copy.count} copies of /${copy.pattern}/ (${copy.what}), found ${found.length}`);
  for(const value of found)assert.equal(value,version,`${copy.file} (${copy.what}) says ${value}; VERSION says ${version}. Update ${copy.file}.`);
});
