/* Test-only buttons create disposable files in memory; no personal file is read. */
(()=>{
  const box=document.createElement('section');box.className='data-section';box.innerHTML='<strong>TEST ONLY · malicious file fixtures</strong><div class="data-buttons"><button type="button" id="fixture-bad-csv">Test invalid CSV</button></div>';
  document.getElementById('data-dialog').append(box);
  function choose(file){const transfer=new DataTransfer();transfer.items.add(file);const input=document.getElementById('import-file');input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));}
  document.getElementById('fixture-bad-csv').onclick=()=>choose(new File(['date,amount,category,description\n2026-10-13,10,Other,Valid\n2026-10-13,-10,Other,Invalid'],'malicious-test.csv',{type:'text/csv'}));
})();
