'use strict';
importScripts('vendor/xlsx-0.20.3.min.js','core.js','data.js','spreadsheet.js');
onmessage=event=>{try{const result=event.data.kind==='xlsx'?PennySheets.read(event.data.buffer):PennyData.importCsv(event.data.text);postMessage({state:result});}catch(e){postMessage({error:e.message});}};
