'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const base=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(base,name),'utf8');
const rootJs=fs.readdirSync(base).filter(name=>name.endsWith('.js')).sort();
const runtimeFiles=['index.html','styles.css',...rootJs];

test('Excel runtime files and the vendor directory do not exist',()=>{
  for(const name of ['spreadsheet.js','import-worker.js','vendor'])assert.equal(fs.existsSync(path.join(base,name)),false,name+' must not exist');
});

test('No first-party runtime file refers to Excel, SheetJS, vendor files or workers',()=>{
  const banned=['XLSX','PennySheets','spreadsheet.js','import-worker','vendor/','new Worker'];
  for(const name of runtimeFiles){const text=read(name);for(const word of banned)assert.equal(text.includes(word),false,name+' must not contain '+word);}
});

test('The import picker accepts only CSV and JSON and there is no Excel export button',()=>{
  const html=read('index.html'),input=html.match(/<input\b[^>]*\bid="import-file"[^>]*>/);
  assert.ok(input,'#import-file input exists');
  assert.ok(/\baccept="\.csv,\.json"/.test(input[0]),'accept is exactly .csv,.json');
  assert.equal(/\bid="export-excel"/.test(html),false);
});

test('Both CSPs set worker-src \'none\' and no other worker-src value',()=>{
  const html=read('index.html'),nginx=read('nginx.conf');
  const meta=html.match(/http-equiv="Content-Security-Policy"[^>]*content="([^"]*)"/);
  assert.ok(meta,'meta CSP exists');
  const header=nginx.match(/add_header\s+Content-Security-Policy\s+"([^"]*)"/);
  assert.ok(header,'nginx CSP header exists');
  for(const [name,csp] of [['index.html',meta[1]],['nginx.conf',header[1]]]){
    const values=[...csp.matchAll(/worker-src\s+([^;]*)/g)].map(m=>m[1].trim());
    assert.deepEqual(values,["'none'"],name+' worker-src');
  }
});

test('Dockerfile, Pages workflow and index.html list the same runtime files',t=>{
  const html=read('index.html');
  const scripts=[...html.matchAll(/<script\s+src="([^"]+)"/g)].map(m=>m[1]);
  const fromHtml=['index.html','styles.css',...scripts].sort();
  assert.deepEqual(fromHtml,[...runtimeFiles].sort(),'index.html script tags cover every root .js file');
  const docker=read('Dockerfile');
  const copied=[];
  for(const line of docker.split('\n').filter(l=>/^COPY\s+--from=verify\s/.test(l))){
    const parts=line.trim().split(/\s+/).slice(2);parts.pop();
    for(const p of parts)copied.push(p.replace(/^\/app\//,''));
  }
  assert.deepEqual(copied.sort(),fromHtml,'Dockerfile runtime COPY');
  const workflowPath=path.join(base,'.github','workflows','pages.yml');
  if(!fs.existsSync(workflowPath)){t.skip('pages.yml not in Docker build context; enforced in CI');return;}
  const yml=fs.readFileSync(workflowPath,'utf8');
  const paths=[...yml.split(/\n\s*paths:\s*\n/)[1].split('\n\n')[0].matchAll(/^\s*-\s*'([^']+)'/gm)].map(m=>m[1]).sort();
  assert.deepEqual(paths,fromHtml,'pages.yml paths trigger');
  const cp=[];
  for(const line of yml.split('\n').map(l=>l.trim()).filter(l=>/^cp\s/.test(l))){
    const parts=line.split(/\s+/).slice(1).filter(p=>!p.startsWith('-'));parts.pop();cp.push(...parts);
  }
  assert.deepEqual(cp.sort(),fromHtml,'pages.yml cp list');
});
