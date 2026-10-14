'use strict';
(() => {
  if(window.self!==window.top){document.body.textContent='Open Penny directly in a browser tab to use your expense data.';return;}
  const C = PennyCore, D = PennyData, $ = id => document.getElementById(id), KEY = 'penny-expenses-v1';
  const colors = ['#28745b', '#9aac80', '#dab06c', '#91b9bc', '#ad9cc2', '#d39170', '#adb4a2'];
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const current = today().slice(0, 7);
  const money = paise => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(paise / 100);
  const foreignMoney = (amount, currency) => new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount);
  const monthName = month => new Date(`${month}-15T12:00:00`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const dateName = date => new Date(`${date}T12:00:00`).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
  const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const tagHue = tag => { let hash = 0; for (const char of tag) hash = (hash * 31 + char.codePointAt(0)) >>> 0; return hash % 360; };
  let state = {
    schemaVersion: 2, currency: 'INR',
    expenses: [
      ['Rent', 1050000, 'Housing', 1, ['housing']],
      ['Weekly groceries', 86400, 'Food & groceries', 3, ['groceries', 'family']],
      ['Train pass', 45000, 'Transport', 4, ['travel']],
      ['Coffee with a friend', 12500, 'Food & groceries', 5, ['weekend']],
      ['New sneakers', 65000, 'Shopping', 6, ['personal']],
      ['Movie night', 24000, 'Entertainment', 8, ['weekend', 'family']],
      ['Pharmacy', 18750, 'Health', 9, ['medical']],
      ['Fresh produce', 32200, 'Food & groceries', 10, ['groceries']]
    ].map((x, i) => ({ id: `sample-${i}`, description: x[0], cents: x[1], category: x[2], date: `${current}-${String(x[3]).padStart(2, '0')}`, tags: x[4] }))
      .concat([{ id: 'sample-previous', description: 'Dinner out', cents: 38000, category: 'Food & groceries', date: `${C.previousMonth(today())}-15`, tags: ['family'] }]),
    budgets: { [current]: 1800000 }
  };
  let editing=null,deleting=null,tagEditing=null,timer,rateRequest=0,rateController=null,rate=null;
  let store=null,ready=false,busy=false,importState=null,importName='',voiceGeneration=0,translator=null,translatorPromise=null,voiceText='',voiceSource='en',voiceDraftBase='',voiceNeedsCorrection=false;
  let channel=null,visibleLimit=50;
  function storageError(message){$('storage-error').hidden=false;$('storage-error').textContent=message;}
  function storeStatus(message){$('storage-status').textContent=message;$('data-store-detail').textContent=message;$('disconnect-file').hidden=!store?.isLinked();}
  async function commit(next,message,backup=false){
    if(!ready){notify('The data store is not ready. Your records have not changed.');return false;}
    if(busy){notify('Please wait for the current save.');return false;}
    busy=true;document.body.classList.add('saving');$('apply-import').disabled=true;
    try{const result=await store.save(next,{backup});state=result.state;render();if(result.fileWarning){storageError(result.fileWarning);notify('Saved locally. The linked file needs attention.');}else{notify(message);storeStatus(store.isLinked()?'Local database + connected data file':store.getKind());}return true;}
    catch(error){storageError(error.message);notify('Not saved: '+error.message);if(error.name==='ConflictError'){const latest=await store.load();if(latest){state=latest.state;store.adoptRevision(latest.revision);render();}}return false;}
    finally{busy=false;document.body.classList.remove('saving');if($('import-dialog').open)updateImportPlan();else $('apply-import').disabled=false;}
  }
  async function initialise(){
    const paymentExamples=['bank-transfer','upi','upi','cash','credit-card','cash','upi','upi','cash'];
    state=D.migrateState({...state,expenses:state.expenses.map((row,i)=>({...row,paymentMethod:paymentExamples[i],tags:[...row.tags,paymentExamples[i]]}))});
    render();
    try{
      let adapter;
      try{if(!window.indexedDB)throw Error('Unavailable');adapter=PennyStorage.indexedAdapter(window.indexedDB);await adapter.open();}
      catch(error){adapter=PennyStorage.fallbackAdapter(localStorage);}
      try{channel=new BroadcastChannel('penny-data-changes');}catch(error){}
      store=PennyStorage.create(adapter,{status:storeStatus,announce:revision=>channel?.postMessage({revision})});
      state=await store.init(state,localStorage.getItem(KEY));ready=true;storeStatus(store.getKind());render();if(adapter.kind==='Browser storage fallback'&&!navigator.locks)storageError('This browser uses a storage fallback without tab locking. Keep one Penny tab open and download regular backups.');
      if(state.expenses.some(x=>x.legacyRailConflict))storageError('Some older expenses have conflicting payment tags. They were preserved; edit their payment method to resolve them.');
      if(channel)channel.onmessage=async()=>{if(!ready||busy)return;const latest=await store.load();if(!latest||latest.revision===store.getRevision())return;if($('expense-dialog').open||$('budget-dialog').open||$('import-dialog').open){storageError('Another tab changed your records. Review your open draft before saving; a stale save will be rejected.');return;}state=latest.state;store.adoptRevision(latest.revision);render();notify('Updated from another Penny tab');};
    }catch(error){ready=false;storeStatus('Data store unavailable');storageError('Saved data was left untouched: '+error.message+' You can still export the visible records, but edits cannot be saved.');}
  }
  function notify(message) { $('notice').textContent = message; $('notice').hidden = false; clearTimeout(timer); timer = setTimeout(() => $('notice').hidden = true, 3200); }
  function chip(tag, id, editable = true) {
    return `<span class="tag-chip" style="--tag-hue:${tagHue(tag)}">${editable ? `<button type="button" data-search-tag="${escape(tag)}" aria-label="Search tag ${escape(tag)}">#${escape(tag)}</button><button type="button" class="tag-remove" data-remove-tag="${escape(tag)}" data-expense="${escape(id)}" aria-label="Remove tag ${escape(tag)} from ${escape(state.expenses.find(x => x.id === id)?.description || '')}">×</button>` : `<span>#${escape(tag)}</span>`}</span>`;
  }
  function renderList() {
    const query = $('search').value.trim(), result = C.searchExpenses(state.expenses, query, today()); let all=result.expenses;
    const filterError=applyFilters(all);all=filterError.rows;result.errors.push(...filterError.errors);const filtered=query||activeFilters();
    $('list-title').textContent = filtered ? 'Search results' : 'All expenses';
    $('clear-search').hidden = !query;
    $('search-error').hidden = !result.errors.length; $('search-error').textContent = result.errors.join(' ');
    $('show-more').hidden=all.length<=visibleLimit;
    $('expenses').innerHTML = all.slice(0,visibleLimit).map(x => `<tr><td class="description"><span class="expense-name">${escape(x.description)}</span><span class="method-label">${escape(D.rails.find(r=>r[0]===x.paymentMethod)?.[1]||'Not specified')}</span>${x.legacyRailConflict?'<span class="legacy-warning">Review payment method</span>':''}<div class="tag-list">${x.tags.map(tag => chip(tag, x.id)).join('')}<button type="button" class="add-tag" data-add-tag="${escape(x.id)}" aria-label="Add tag to ${escape(x.description)}">＋ Tag</button></div>${tagEditing === x.id ? `<form class="inline-tag-form" data-tag-form="${escape(x.id)}"><label class="sr-only" for="inline-tag">Tag name</label><input id="inline-tag" placeholder="#tag" maxlength="34" list="known-tags" required autocomplete="off"><button type="submit">Add</button><button type="button" class="quiet" data-cancel-tag>Cancel</button><span class="error" id="inline-tag-error" role="alert" hidden></span></form>` : ''}</td><td>${dateName(x.date)}</td><td><span class="category">${escape(x.category)}</span></td><td class="amount">${money(x.cents)}</td><td class="actions"><button type="button" class="quiet" data-edit="${escape(x.id)}" aria-label="Edit ${escape(x.description)}">Edit</button><button type="button" class="quiet delete" data-delete="${escape(x.id)}" aria-label="Delete ${escape(x.description)}">Delete</button></td></tr>`).join('');
    $('empty').hidden = all.length > 0;
    $('empty').textContent = filtered ? (result.errors.length ? 'Check the search format above.' : 'No matching expenses. Try fewer words, or clear your search.') : 'No expenses yet. Add your first purchase above.';
    const matchingTotal = all.reduce((sum, x) => sum + x.cents, 0);
    $('list-footer').textContent = filtered ? `${all.length} of ${state.expenses.length} expenses · Matching total ${money(matchingTotal)} · Monthly overview stays unchanged` : `${all.length} expenses · All months shown`;
    const tags = [...new Set(state.expenses.flatMap(x => x.tags))].sort();
    $('known-tags').innerHTML = tags.map(tag => `<option value="#${escape(tag)}"></option>`).join('');
  }
  function render() {
    const month = $('month').value, s = C.summary(state, month), hasBudget = s.budget !== undefined;
    $('total').textContent = money(s.total); $('count').textContent = `${s.rows.length} expense${s.rows.length === 1 ? '' : 's'} in ${monthName(month)}`;
    $('budget-value').textContent = hasBudget ? money(s.budget) : 'Not set';
    $('remaining-label').textContent = s.exceeded ? 'Over budget' : 'Left to spend';
    $('remaining').textContent = hasBudget ? money(Math.abs(s.remaining)) : '—'; $('remaining').classList.toggle('negative', s.exceeded);
    $('remaining-note').textContent = hasBudget ? (s.exceeded ? 'Above your monthly limit' : 'Within your monthly limit') : 'Set a budget to get started';
    const percent = hasBudget && s.budget > 0 ? Math.round(s.total / s.budget * 100) : 0;
    $('budget-period').textContent = monthName(month); $('budget-percent').textContent = hasBudget ? (s.budget === 0 ? (s.total > 0 ? 'Budget exceeded' : 'No spending yet') : `${percent}% used`) : 'No budget set';
    $('budget-fill').style.width = `${hasBudget ? (s.budget === 0 && s.total > 0 ? 100 : Math.min(percent, 100)) : 0}%`;
    $('budget-fill').style.background = s.exceeded ? 'var(--red)' : 'var(--green)';
    $('budget-message').textContent = hasBudget ? `${money(s.total)} spent of ${money(s.budget)}` : 'Set your limit for this month.';
    $('warning').hidden = !s.exceeded; $('warning').textContent = `You’re ${money(Math.max(0, -s.remaining))} over your monthly budget.`;
    $('chart').innerHTML = s.byCategory.length ? s.byCategory.map(x => `<div class="chart-row"><div class="chart-label"><span>${x.category}</span><strong>${money(x.cents)} · ${Math.round(x.cents / s.total * 100)}%</strong></div><div class="bar"><span style="width:${x.cents / s.total * 100}%;background:${colors[C.categories.indexOf(x.category)]}"></span></div></div>`).join('') : '<p class="empty">No spending this month.</p>';
    $('chart').setAttribute('aria-label', `Spending for ${monthName(month)}: ${s.byCategory.map(x => `${x.category} ${money(x.cents)}`).join(', ') || 'No expenses'}`);
    renderList();
  }
  function draftTags() {
    try { const tags = C.extractTags($('description').value, $('expense-tags').value).tags; $('draft-tags').innerHTML = tags.map(tag => chip(tag, '', false)).join(''); }
    catch (e) { $('draft-tags').textContent = e.message; }
  }
  async function processVoiceText(text){
    if(!$('expense-dialog').open||$('voice-panel').hidden)return;
    const generation=voiceGeneration;voiceText=text;voiceSource=$('voice-language').value;$('voice-transcript').hidden=false;$('voice-transcript').textContent='Heard: “'+text+'”';$('translation-status').textContent='Preparing an English draft…';
    try{let activeTranslator=translator;if(voiceSource!=='en'&&translatorPromise&&!activeTranslator){const pending=translatorPromise;activeTranslator=await Promise.race([pending,new Promise(resolve=>setTimeout(()=>resolve(null),2500))]);}if(generation!==voiceGeneration)return;const result=await PennyTranslation.translate(text,voiceSource,activeTranslator);if(generation!==voiceGeneration)return;voiceDraftBase=result.text.trim();voiceNeedsCorrection=!result.complete;$('voice-english').value=result.text;$('voice-draft-label').hidden=false;$('voice-accept').checked=false;if(voiceSource==='en'){$('voice-accept-label').hidden=true;$('apply-voice').hidden=true;applyVoiceFields(result.text);$('translation-status').textContent='English transcript applied to the form. Check every field before saving.';}else{$('voice-status').textContent='Transcript captured. Check the English draft before using it.';$('voice-accept-label').hidden=false;$('apply-voice').hidden=false;$('apply-voice').disabled=true;if(result.complete)$('translation-status').textContent=result.source==='offline expense parser'?'Offline expense parser found the amount and expense details on this device. Check them before using this draft.':'English draft · '+result.source+'. Check it before using it.';else $('translation-status').textContent=(result.source==='on-device translation'?'Translation needs correction: ':'Transcript captured. The offline expense parser needs help with: ')+result.unknown.join(', ')+'. Correct these parts in English before accepting.';if(voiceSource==='hi'&&/कल/.test(text))$('translation-status').textContent+=' कल can mean yesterday or tomorrow; choose the expense date yourself.';}}
    catch(error){if(generation===voiceGeneration){$('translation-status').textContent='Translation failed. Use keyboard entry; no expense was saved.';}}
  }
  function beginTranslator(language,generation=voiceGeneration){
    if(language==='en'||translator||translatorPromise)return;
    translatorPromise=PennyTranslation.prepare(window.Translator,language).then(prepared=>{if(generation!==voiceGeneration){prepared?.destroy?.();return null;}translator=prepared;return prepared;}).catch(()=>null);
  }
  function revealPhoneDictation(){ $('phone-dictation-label').hidden=false;$('prepare-dictation').hidden=false; }
  const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
  const voice=PennyVoice.create(Recognition,{
    status(status,message){const fallback=status==='unsupported'||status==='error';if(fallback){revealPhoneDictation();if(!/phone keyboard/i.test(message))message+=' Use phone keyboard microphone below.';}$('voice-status').textContent=status==='complete'?($('voice-draft-label').hidden?'Speech captured. Preparing the English draft…':'English draft ready. Check it before using it.'):message;const active=status==='starting'||status==='listening';$('start-voice').hidden=active;$('start-voice').disabled=!voice.supported;$('start-voice').textContent=['complete','error','processing'].includes(status)?'Try voice again':'Start listening';$('stop-voice').hidden=!active;},
    preview(text){$('voice-transcript').hidden=false;$('voice-transcript').textContent='Hearing: “'+text+'”';},
    transcript:processVoiceText
  });
  function resetVoiceDraft(){voiceGeneration++;translatorPromise=null;$('voice-draft-label').hidden=true;$('voice-accept-label').hidden=true;$('apply-voice').hidden=true;$('voice-transcript').hidden=true;$('voice-accept').checked=false;$('voice-english').value='';$('phone-dictation-label').hidden=true;$('prepare-dictation').hidden=true;$('phone-dictation').value='';$('translation-status').textContent='';}
  function closeVoice(){voiceGeneration++;voice.cancel();translator?.destroy?.();translator=null;translatorPromise=null;$('voice-panel').hidden=true;$('use-voice').setAttribute('aria-expanded','false');$('start-voice').textContent='Start listening';}
  function paymentFromVoice(text){const match=text.match(/\b(?:via|by|using|with|from|through)\s+(upi|credit card|debit card|cash|bank transfer|wallet)\b/i);return match?{method:match[1].toLowerCase().replace(/ /g,'-'),text:text.replace(match[0],'').trim()}:{method:'unspecified',text};}
  function applyVoiceFields(text){
    const payment=paymentFromVoice(text),draft=C.parseVoice(payment.text,today());
    $('amount').value=draft.amount!==null?draft.amount.toFixed(2):'';
    if(draft.date)$('date').value=draft.date;
    if(voiceSource==='hi'&&/कल/.test(voiceText)){$('date').value='';draft.warnings.push('Choose the date: कल can mean yesterday or tomorrow.');}
    $('description').value=draft.description;$('category').value=draft.category||'Other';$('payment-method').value=payment.method;
    $('expense-tags').value=draft.tags.filter(tag=>!D.reserved.includes(tag)).map(tag=>'#'+tag).join(' ');
    $('form-error').hidden=!draft.warnings.length;$('form-error').textContent=draft.warnings.join(' ');draftTags();$('voice-status').textContent='Voice fields filled. Check them and save when correct.';
    return draft;
  }
  $('voice-accept').onchange=()=>{$('apply-voice').disabled=!$('voice-accept').checked||(voiceNeedsCorrection&&$('voice-english').value.trim()===voiceDraftBase);};
  $('voice-english').oninput=()=>{$('voice-accept').checked=false;$('apply-voice').disabled=true;};
  $('use-phone-dictation').onclick=()=>{voice.cancel();resetVoiceDraft();$('phone-dictation-label').hidden=false;$('prepare-dictation').hidden=false;$('voice-status').textContent='Use the microphone on your phone keyboard, then prepare the dictated expense.';$('phone-dictation').focus();};
  $('prepare-dictation').onclick=()=>{const text=$('phone-dictation').value.trim();if(!text){notify('Dictate or type the expense first.');$('phone-dictation').focus();return;}beginTranslator($('voice-language').value);processVoiceText(text);};
  $('apply-voice').onclick=()=>{
    if(!$('voice-accept').checked||(voiceNeedsCorrection&&$('voice-english').value.trim()===voiceDraftBase)){notify('Correct the incomplete English draft before accepting it.');return;}
    const text=$('voice-english').value.trim();if(!text||/[\u0900-\u097f]/u.test(text)){notify('Correct the draft to English before applying it.');return;}
    applyVoiceFields(text);
  };
  function openExpense(id = null) {
    editing = id; const expense = state.expenses.find(x => x.id === id);
    $('expense-form').reset(); $('form-error').hidden = true; closeVoice();resetVoiceDraft(); $('voice-transcript').hidden = true;
    $('form-title').textContent = expense ? 'Edit expense' : 'Add an expense'; $('save-expense').textContent = expense ? 'Save changes' : 'Save expense';
    $('date').value = expense ? expense.date : ($('month').value === current ? today() : `${$('month').value}-01`);
    $('amount').value = expense ? (expense.cents / 100).toFixed(2) : ''; $('category').value = expense ? expense.category : C.categories[0];
    $('payment-method').value=expense?expense.paymentMethod:'unspecified';$('description').value = expense ? expense.description : ''; $('expense-tags').value = expense ? expense.tags.map(tag => `#${tag}`).join(' ') : '';
    draftTags(); $('expense-dialog').showModal();
  }
  $('payment-method').innerHTML=D.rails.map(([value,label])=>`<option value="${value}">${label}</option>`).join('');$('filter-rail').innerHTML+=D.rails.map(([value,label])=>`<option value="${value}">${label}</option>`).join('');$('filter-category').innerHTML+=C.categories.map(value=>`<option>${value}</option>`).join('');
  $('category').innerHTML = C.categories.map(x => `<option>${x}</option>`).join(''); $('month').value = current;
  $('month').onchange = () => { if (!C.validMonth($('month').value)) $('month').value = current; render(); };
  $('search').oninput = () => { tagEditing = null;visibleLimit=50; renderList(); };
  $('clear-search').onclick = () => { $('search').value = ''; tagEditing = null; renderList(); $('search').focus(); };
  $('search-help-button').onclick = () => { const open = $('search-help').hidden; $('search-help').hidden = !open; $('search-help-button').setAttribute('aria-expanded', String(open)); };
  $('add').onclick = () => openExpense();
  $('description').oninput = draftTags; $('expense-tags').oninput = draftTags;
  $('expense-form').onsubmit = async event => {
    event.preventDefault();
    try {
      const expense = D.validateExpense({ id: editing || (window.crypto?.randomUUID ? crypto.randomUUID() : `expense-${Date.now()}-${Math.random().toString(36).slice(2)}`), date: $('date').value, amount: $('amount').value, category: $('category').value, description: $('description').value, tags: $('expense-tags').value,paymentMethod:$('payment-method').value });
      if(editing&&!state.expenses.some(x=>x.id===editing))throw Error('This expense was removed in another tab.');
      const next=D.clone(state);if(editing)next.expenses=next.expenses.map(x=>x.id===editing?expense:x);else next.expenses.push(expense);
      if(await commit(next,editing?'Expense updated':'Expense added')){tagEditing=null;render();$('expense-dialog').close();}
    } catch (e) { $('form-error').textContent = e.message; $('form-error').hidden = false; }
  };
  $('expenses').onclick = async event => {try{
    const button = event.target.closest('button'); if (!button) return;
    if (button.dataset.edit) openExpense(button.dataset.edit);
    if (button.dataset.delete) { deleting = button.dataset.delete; $('delete-description').textContent = state.expenses.find(x => x.id === deleting).description; $('delete-dialog').showModal(); }
    if (button.dataset.addTag) { tagEditing = button.dataset.addTag; renderList(); $('inline-tag').focus(); }
    if (button.hasAttribute('data-cancel-tag')) { tagEditing = null; renderList(); }
    if (button.dataset.removeTag) {
      const expense = state.expenses.find(x => x.id === button.dataset.expense);
      const next=D.clone(state);next.expenses=next.expenses.map(x=>x.id===expense.id?D.validateExpense({...x,amount:(x.cents/100).toFixed(2),tags:x.tags.filter(tag=>tag!==button.dataset.removeTag),paymentMethod:D.reserved.includes(button.dataset.removeTag)?'unspecified':x.paymentMethod}):x);await commit(next,'Tag removed');
    }
    if (button.dataset.searchTag) { $('search').value = `#${button.dataset.searchTag}`; tagEditing = null; renderList(); $('search').focus(); }
  }catch(error){notify(error.message);}};
  $('expenses').onsubmit = async event => {
    const form = event.target.closest('[data-tag-form]'); if (!form) return; event.preventDefault();
    try {
      const tags = C.parseTags($('inline-tag').value);
      if (tags.length !== 1) throw Error('Enter one tag at a time.');
      const expense = state.expenses.find(x => x.id === form.dataset.tagForm);
      if (expense.tags.includes(tags[0])) { notify('This expense already has that tag'); return; }
      const next=D.clone(state);const rail=D.reserved.includes(tags[0])?tags[0]:expense.paymentMethod;const newTags=D.reserved.includes(tags[0])?[...expense.tags.filter(tag=>!D.reserved.includes(tag)),...tags]:[...expense.tags,...tags];next.expenses=next.expenses.map(x=>x.id===expense.id?D.validateExpense({...x,amount:(x.cents/100).toFixed(2),tags:newTags,paymentMethod:rail}):x);if(await commit(next,'Tag added')){tagEditing=null;renderList();}
    } catch (e) { $('inline-tag-error').hidden = false; $('inline-tag-error').textContent = e.message; }
  };
  $('delete-form').onsubmit=async event=>{event.preventDefault();const next=D.clone(state);next.expenses=next.expenses.filter(x=>x.id!==deleting);if(await commit(next,'Expense deleted')){tagEditing=null;render();$('delete-dialog').close();}};
  $('edit-budget').onclick = () => { $('budget-dialog-period').textContent = monthName($('month').value); $('budget-input').value = state.budgets[$('month').value] !== undefined ? (state.budgets[$('month').value] / 100).toFixed(2) : ''; $('budget-input').setCustomValidity(''); $('budget-dialog').showModal(); };
  $('budget-input').oninput = () => $('budget-input').setCustomValidity('');
  $('budget-form').onsubmit = async event => {
    event.preventDefault();
    try { const next=D.clone(state);next.budgets[$('month').value]=C.toPaise($('budget-input').value,true);if(await commit(next,'Monthly budget saved'))$('budget-dialog').close(); }
    catch (e) { $('budget-input').setCustomValidity(e.message); $('budget-input').reportValidity(); }
  };
  $('use-voice').onclick = () => { $('voice-panel').hidden = false; $('use-voice').setAttribute('aria-expanded', 'true'); $('start-voice').disabled = !voice.supported;if(!voice.supported)revealPhoneDictation();$('voice-status').textContent = voice.supported ? 'Ready when you are. Select Start listening to use your microphone.' : 'This mobile browser has no direct speech recognition. Use phone keyboard microphone below, or type the expense.'; };
  $('start-voice').onclick = ()=>{const generation=++voiceGeneration,language=$('voice-language').value;translator?.destroy?.();translator=null;translatorPromise=null;beginTranslator(language,generation);voice.start({en:'en-IN',hi:'hi-IN',es:'es-ES'}[language]);}; $('stop-voice').onclick = () => voice.stop(); $('return-keyboard').onclick = () => { closeVoice(); $('description').focus(); };
  $('expense-dialog').addEventListener('close', closeVoice); $('expense-dialog').addEventListener('cancel', closeVoice);
  document.addEventListener('visibilitychange', () => { if (document.hidden) voice.cancel(); });
  window.addEventListener('pagehide', () => voice.cancel());
  document.querySelectorAll('[data-close]').forEach(button => button.onclick = () => button.closest('dialog').close());
  function updateConversion() {
    const value = rate ? C.convert($('convert-amount').value, rate.rate) : null;
    $('convert-result').textContent = value === null ? '—' : foreignMoney(value, $('convert-currency').value);
    if (!$('convert-amount').validity.valid || $('convert-amount').value === '') $('convert-result').textContent = 'Enter a valid amount';
  }
  function changeCurrency() {
    rateRequest++; if (rateController) rateController.abort(); rateController = null; rate = null;
    $('fetch-rate').disabled = false; $('fetch-rate').textContent = 'Get latest rate';
    $('rate-base').textContent = $('convert-from').value; $('rate-currency').textContent = $('convert-currency').value; $('conversion-rate').value = '';
    if ($('convert-currency').value === $('convert-from').value) { rate = { rate: 1 }; $('conversion-rate').value = '1'; $('conversion-rate').disabled = true; $('fetch-rate').disabled = true; $('rate-status').textContent = `${$('convert-from').value} to ${$('convert-currency').value} · no conversion needed.`; }
    else { $('conversion-rate').disabled = false; $('rate-status').textContent = 'Get a daily reference rate, or enter a rate below.'; }
    updateConversion();
  }
  $('convert-amount').oninput = updateConversion; $('convert-currency').onchange = changeCurrency; $('convert-from').onchange = changeCurrency;
  $('conversion-rate').oninput = () => {
    rateRequest++; if (rateController) rateController.abort(); rateController = null;
    $('fetch-rate').disabled = false; $('fetch-rate').textContent = 'Get latest rate';
    const value = Number($('conversion-rate').value);
    rate = value > 0 && Number.isFinite(value) && value <= 1e9 ? { rate: value } : null;
    $('rate-status').textContent = rate ? 'Using your manual rate. This changes only the estimate.' : 'Enter a rate greater than zero, or get the latest rate.';
    updateConversion();
  };
  $('fetch-rate').onclick = async () => {
    const quote = $('convert-currency').value, base = $('convert-from').value, token = ++rateRequest;
    if (rateController) rateController.abort(); rateController = new AbortController();
    const controller = rateController, timeout = setTimeout(() => controller.abort(), 10000);
    $('fetch-rate').disabled = true; $('fetch-rate').textContent = 'Getting rate…'; $('rate-status').textContent = 'Getting a reference rate from Frankfurter…';
    try {
      // Only a currency pair is sent. The amount and all expense data stay in the browser.
      const response = await fetch(`https://api.frankfurter.dev/v2/rate/${base}/${quote}`, { signal: controller.signal, referrerPolicy: 'no-referrer' });
      if (!response.ok) throw Error('Rate unavailable'); const validated = C.validateRate(await response.json(), quote, base);
      if (token !== rateRequest) return;
      rate = validated; $('conversion-rate').value = rate.rate;
      $('rate-status').textContent = `Frankfurter · ${rate.date} · 1 ${base} = ${rate.rate} ${quote}. Daily reference rate; fees may differ.`;
      updateConversion();
    } catch (e) {
      if (token !== rateRequest) return;
      $('rate-status').textContent = rate ? `Latest rate unavailable. ${rate.date?'Previous reference rate dated '+rate.date:'Your previous manual rate'} is still shown; enter another rate if needed.` : 'Rate unavailable. Enter a rate manually to convert, or try again.';
      $('manual-rate').open = true; updateConversion();
    } finally { clearTimeout(timeout); if (token === rateRequest) { $('fetch-rate').disabled = false; $('fetch-rate').textContent = 'Get latest rate'; rateController = null; } }
  };
  function activeFilters(){return ['filter-category','filter-rail','filter-from','filter-to','filter-min','filter-max'].some(id=>$(id).value!=='');}
  function applyFilters(rows){const errors=[];const from=$('filter-from').value,to=$('filter-to').value;let min=null,max=null;try{if($('filter-min').value!=='')min=C.toPaise($('filter-min').value,true);if($('filter-max').value!=='')max=C.toPaise($('filter-max').value,true);}catch(error){errors.push('Use valid INR amount limits.');}if(from&&!C.validDate(from)||to&&!C.validDate(to))errors.push('Choose valid filter dates.');if(from&&to&&from>to)errors.push('From date must not be after To date.');if(min!==null&&max!==null&&min>max)errors.push('Minimum amount must not exceed maximum.');return{errors,rows:errors.length?[]:rows.filter(x=>(!$('filter-category').value||x.category===$('filter-category').value)&&(!$('filter-rail').value||x.paymentMethod===$('filter-rail').value)&&(!from||x.date>=from)&&(!to||x.date<=to)&&(min===null||x.cents>=min)&&(max===null||x.cents<=max))};}
  $('filter-toggle').onclick=()=>{const show=$('filters').hidden;$('filters').hidden=!show;$('filter-toggle').setAttribute('aria-expanded',String(show));};
  ['filter-category','filter-rail','filter-from','filter-to','filter-min','filter-max'].forEach(id=>$(id).oninput=()=>{visibleLimit=50;renderList();});
  $('clear-filters').onclick=()=>{['filter-category','filter-rail','filter-from','filter-to','filter-min','filter-max'].forEach(id=>$(id).value='');visibleLimit=50;renderList();};
  $('show-more').onclick=()=>{visibleLimit+=50;renderList();};
  $('payment-method').onchange=()=>{try{$('expense-tags').value=C.parseTags($('expense-tags').value).filter(tag=>!D.reserved.includes(tag)).map(tag=>'#'+tag).join(' ');}catch(error){}draftTags();};
  $('voice-language').onchange=()=>{voice.cancel();translator?.destroy?.();translator=null;translatorPromise=null;resetVoiceDraft();if(!voice.supported)revealPhoneDictation();$('voice-example').textContent={en:'Try: “Spent 250 rupees on groceries today via UPI.”',hi:'कहें: “मैंने आज किराने पर 250 रुपये खर्च किए यूपीआई से।”',es:'Prueba: “Gasté 250 rupias en comida hoy con UPI.”'}[$('voice-language').value];};
  function download(data,name,type){const url=URL.createObjectURL(new Blob([data],{type}));const link=document.createElement('a');link.href=url;link.download=name;link.hidden=true;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
  const exportDate=()=>today();
  $('whats-new-button').onclick=()=>$('whats-new-dialog').showModal();
  $('data-manager').onclick=()=>{$('data-error').hidden=true;storeStatus(store?.isLinked()?'Local database + connected data file':store?.getKind()||'Data store unavailable');$('data-dialog').showModal();};
  $('export-csv').onclick=()=>{try{download(D.exportCsv(state),'penny-expenses-'+exportDate()+'.csv','text/csv;charset=utf-8');notify('CSV export downloaded');}catch(error){dataError(error.message);}};
  $('export-excel').onclick=()=>{try{download(PennySheets.write(state),'penny-expenses-'+exportDate()+'.xlsx','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');notify('Excel export downloaded');}catch(error){dataError(error.message);}};
  $('export-backup').onclick=()=>{try{download(D.exportBackup(state),'penny-data-'+exportDate()+'.json','application/json');notify('Full backup downloaded');}catch(error){dataError(error.message);}};
  function dataError(message){$('data-error').hidden=false;$('data-error').textContent=message;}
  async function readImportFile(file){if(!file||file.size>D.MAX_FILE_BYTES)throw Error('Choose a file smaller than 32 MB.');const extension=file.name.toLowerCase().split('.').pop();if(!['csv','xlsx','json'].includes(extension))throw Error('Choose CSV, Excel (.xlsx), or JSON. Legacy .xls and macro-enabled workbooks are not supported.');if(extension==='json')return D.importBackup(await file.text());if(extension==='csv')return D.importCsv(await file.text());const buffer=await file.arrayBuffer();PennySheets.inspectZip(buffer);return new Promise((resolve,reject)=>{let worker;try{worker=new Worker('import-worker.js');}catch(error){reject(Error('Safe Excel import needs the hosted HTTPS app or a local HTTP server. CSV and JSON import are available here.'));return;}const timeout=setTimeout(()=>{worker.terminate();reject(Error('Excel parsing exceeded the safety timeout. Try a smaller workbook.'));},5000);worker.onmessage=event=>{clearTimeout(timeout);worker.terminate();if(event.data.error)reject(Error(event.data.error));else{try{resolve(D.migrateState(event.data.state));}catch(error){reject(error);}}};worker.onerror=()=>{clearTimeout(timeout);worker.terminate();reject(Error('Workbook could not be parsed safely. No records changed.'));};worker.postMessage({kind:'xlsx',buffer},[buffer]);});}
  function reviewImport(incoming,name,restore=false){importState=D.migrateState(incoming);importName=name;$('data-dialog').close();$('import-error').hidden=true;$('import-mode').value=restore?'replace':'merge';$('import-budgets').checked=restore;$('import-budgets').disabled=Object.keys(importState.budgets).length===0;$('replace-confirm').checked=false;$('import-summary').textContent=`${name} · ${importState.expenses.length} expenses · ${Object.keys(importState.budgets).length} monthly budgets. Nothing has changed yet.`;$('import-preview').innerHTML=importState.expenses.slice(0,5).map(x=>`<div><strong>${escape(x.description)}</strong><br>${escape(x.date)} · ${money(x.cents)} · ${escape(x.category)} · ${escape(D.rails.find(r=>r[0]===x.paymentMethod)?.[1]||'Not specified')}</div>`).join('')||'<div>No expense rows. Budgets may still be imported.</div>';updateImportPlan();$('import-dialog').showModal();}
  $('import-file').onchange=async()=>{const file=$('import-file').files[0];if(!file)return;$('data-error').hidden=true;$('import-file').disabled=true;try{const incoming=await readImportFile(file);reviewImport(incoming,file.name);}catch(error){dataError(error.message+' No records changed.');}finally{$('import-file').disabled=false;$('import-file').value='';}};
  function updateImportPlan(){if(!importState)return;const replace=$('import-mode').value==='replace';$('replace-label').hidden=!replace;try{const plan=D.planImport(state,importState,$('import-mode').value,$('import-budgets').checked);$('import-error').hidden=true;$('import-impact').textContent=`${replace?'Replace '+plan.removed+' current expenses with':'Add'} ${plan.added} expenses · ${plan.skipped} duplicate records skipped · ${plan.changedBudgets} budgets changed. An undo copy will be kept.`;$('apply-import').disabled=busy||(replace&&!$('replace-confirm').checked);}catch(error){$('import-error').hidden=false;$('import-error').textContent=error.message;$('apply-import').disabled=true;}}
  $('import-mode').onchange=()=>{$('replace-confirm').checked=false;updateImportPlan();};$('import-budgets').onchange=updateImportPlan;$('replace-confirm').onchange=updateImportPlan;
  $('apply-import').onclick=async()=>{if(!importState||$('apply-import').disabled)return;try{if($('import-mode').value==='replace'&&!$('replace-confirm').checked)return;const plan=D.planImport(state,importState,$('import-mode').value,$('import-budgets').checked);if(await commit(plan.state,'Import saved · '+plan.added+' new expenses',true)){$('import-dialog').close();importState=null;visibleLimit=50;render();}}catch(error){$('import-error').hidden=false;$('import-error').textContent=error.message;}};
  $('undo-import').onclick=async()=>{try{if(!store)throw Error('Data store is not ready.');const backup=await store.backup();if(!backup)throw Error('No previous import backup is available.');reviewImport(backup,'Local copy saved before your last import',true);}catch(error){dataError(error.message);}};
  $('connect-file').onclick=async()=>{try{if(!ready)throw Error('Wait for the local data store before connecting a file.');if(!window.showSaveFilePicker)throw Error('This browser cannot connect a live file. Use Download full backup to keep a portable JSON copy.');const handle=await window.showSaveFilePicker({suggestedName:'penny-data.json',types:[{description:'Penny JSON data file',accept:{'application/json':['.json']}}]});await store.connect(handle,state);$('disconnect-file').hidden=false;notify('Portable data file connected');}catch(error){if(error.name!=='AbortError')dataError(error.message);}};
  $('disconnect-file').onclick=()=>{store?.detach();$('disconnect-file').hidden=true;notify('Data file disconnected. Local database remains saved.');};

  changeCurrency(); initialise();
})();
