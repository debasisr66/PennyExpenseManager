'use strict';
(() => {
  const C = PennyCore, $ = id => document.getElementById(id), KEY = 'penny-expenses-v1';
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
  let storageBlocked = false, editing = null, deleting = null, tagEditing = null, timer, rateRequest = 0, rateController = null, rate = null;
  function storageError(message) { $('storage-error').hidden = false; $('storage-error').textContent = message; }
  try {
    const saved = localStorage.getItem(KEY);
    if (saved) state = C.migrateState(JSON.parse(saved));
  } catch (e) {
    storageBlocked = true;
    storageError('Saved data could not be loaded. It has been left untouched. Sample data is shown for this session; changes cannot be saved here.');
  }
  function persist() {
    if (storageBlocked) return false;
    try { localStorage.setItem(KEY, JSON.stringify(state)); return true; }
    catch (e) { storageError('Your browser could not save these changes. Keep this tab open; changes may be lost after closing it.'); return false; }
  }
  function notify(message) { $('notice').textContent = message; $('notice').hidden = false; clearTimeout(timer); timer = setTimeout(() => $('notice').hidden = true, 3200); }
  function savedNotice(success, sessionMessage) { notify(persist() ? success : sessionMessage); }
  function chip(tag, id, editable = true) {
    return `<span class="tag-chip" style="--tag-hue:${tagHue(tag)}">${editable ? `<button type="button" data-search-tag="${escape(tag)}" aria-label="Search tag ${escape(tag)}">#${escape(tag)}</button><button type="button" class="tag-remove" data-remove-tag="${escape(tag)}" data-expense="${escape(id)}" aria-label="Remove tag ${escape(tag)} from ${escape(state.expenses.find(x => x.id === id)?.description || '')}">×</button>` : `<span>#${escape(tag)}</span>`}</span>`;
  }
  function renderList() {
    const query = $('search').value.trim(), result = C.searchExpenses(state.expenses, query, today()), all = result.expenses;
    $('list-title').textContent = query ? 'Search results' : 'All expenses';
    $('clear-search').hidden = !query;
    $('search-error').hidden = !result.errors.length; $('search-error').textContent = result.errors.join(' ');
    $('expenses').innerHTML = all.map(x => `<tr><td class="description"><span class="expense-name">${escape(x.description)}</span><div class="tag-list">${x.tags.map(tag => chip(tag, x.id)).join('')}<button type="button" class="add-tag" data-add-tag="${escape(x.id)}" aria-label="Add tag to ${escape(x.description)}">＋ Tag</button></div>${tagEditing === x.id ? `<form class="inline-tag-form" data-tag-form="${escape(x.id)}"><label class="sr-only" for="inline-tag">Tag name</label><input id="inline-tag" placeholder="#tag" maxlength="34" list="known-tags" required autocomplete="off"><button type="submit">Add</button><button type="button" class="quiet" data-cancel-tag>Cancel</button><span class="error" id="inline-tag-error" role="alert" hidden></span></form>` : ''}</td><td>${dateName(x.date)}</td><td><span class="category">${escape(x.category)}</span></td><td class="amount">${money(x.cents)}</td><td class="actions"><button type="button" class="quiet" data-edit="${escape(x.id)}" aria-label="Edit ${escape(x.description)}">Edit</button><button type="button" class="quiet delete" data-delete="${escape(x.id)}" aria-label="Delete ${escape(x.description)}">Delete</button></td></tr>`).join('');
    $('empty').hidden = all.length > 0;
    $('empty').textContent = query ? (result.errors.length ? 'Check the search format above.' : 'No matching expenses. Try fewer words, or clear your search.') : 'No expenses yet. Add your first purchase above.';
    const matchingTotal = all.reduce((sum, x) => sum + x.cents, 0);
    $('list-footer').textContent = query ? `${all.length} of ${state.expenses.length} expenses · Matching total ${money(matchingTotal)} · Monthly overview stays unchanged` : `${all.length} expenses · All months shown`;
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
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const voice = PennyVoice.create(Recognition, {
    status(status, message) {
      $('voice-status').textContent = message;
      const active = status === 'starting' || status === 'listening';
      $('start-voice').hidden = active; $('start-voice').disabled = !voice.supported; $('stop-voice').hidden = !active;
    },
    transcript(text) {
      if (!$('expense-dialog').open || $('voice-panel').hidden) return;
      $('voice-transcript').hidden = false; $('voice-transcript').textContent = `Heard: “${text}”`;
      const draft = C.parseVoice(text, today());
      if (draft.amount !== null) $('amount').value = draft.amount.toFixed(2);
      if (draft.date) $('date').value = draft.date;
      if (draft.description) $('description').value = draft.description;
      if (draft.category) $('category').value = draft.category;
      if (draft.tags.length) {
        try { $('expense-tags').value = C.parseTags([...C.parseTags($('expense-tags').value), ...draft.tags]).map(tag => `#${tag}`).join(' '); }
        catch (e) { draft.warnings.push(e.message); }
      }
      $('form-error').hidden = !draft.warnings.length; $('form-error').textContent = draft.warnings.join(' '); draftTags();
    }
  });
  function closeVoice() { voice.cancel(); $('voice-panel').hidden = true; $('use-voice').setAttribute('aria-expanded', 'false'); }
  function openExpense(id = null) {
    editing = id; const expense = state.expenses.find(x => x.id === id);
    $('expense-form').reset(); $('form-error').hidden = true; closeVoice(); $('voice-transcript').hidden = true;
    $('form-title').textContent = expense ? 'Edit expense' : 'Add an expense'; $('save-expense').textContent = expense ? 'Save changes' : 'Save expense';
    $('date').value = expense ? expense.date : ($('month').value === current ? today() : `${$('month').value}-01`);
    $('amount').value = expense ? (expense.cents / 100).toFixed(2) : ''; $('category').value = expense ? expense.category : C.categories[0];
    $('description').value = expense ? expense.description : ''; $('expense-tags').value = expense ? expense.tags.map(tag => `#${tag}`).join(' ') : '';
    draftTags(); $('expense-dialog').showModal();
  }
  $('category').innerHTML = C.categories.map(x => `<option>${x}</option>`).join(''); $('month').value = current;
  $('month').onchange = () => { if (!C.validMonth($('month').value)) $('month').value = current; render(); };
  $('search').oninput = () => { tagEditing = null; renderList(); };
  $('clear-search').onclick = () => { $('search').value = ''; tagEditing = null; renderList(); $('search').focus(); };
  $('search-help-button').onclick = () => { const open = $('search-help').hidden; $('search-help').hidden = !open; $('search-help-button').setAttribute('aria-expanded', String(open)); };
  $('add').onclick = () => openExpense();
  $('description').oninput = draftTags; $('expense-tags').oninput = draftTags;
  $('expense-form').onsubmit = event => {
    event.preventDefault();
    try {
      const expense = C.validateExpense({ id: editing || (window.crypto?.randomUUID ? crypto.randomUUID() : `expense-${Date.now()}-${Math.random().toString(36).slice(2)}`), date: $('date').value, amount: $('amount').value, category: $('category').value, description: $('description').value, tags: $('expense-tags').value });
      if (editing) state.expenses = state.expenses.map(x => x.id === editing ? expense : x); else state.expenses.push(expense);
      savedNotice(editing ? 'Expense updated' : 'Expense added', 'Changes apply to this session only'); tagEditing = null; render(); $('expense-dialog').close();
    } catch (e) { $('form-error').textContent = e.message; $('form-error').hidden = false; }
  };
  $('expenses').onclick = event => {
    const button = event.target.closest('button'); if (!button) return;
    if (button.dataset.edit) openExpense(button.dataset.edit);
    if (button.dataset.delete) { deleting = button.dataset.delete; $('delete-description').textContent = state.expenses.find(x => x.id === deleting).description; $('delete-dialog').showModal(); }
    if (button.dataset.addTag) { tagEditing = button.dataset.addTag; renderList(); $('inline-tag').focus(); }
    if (button.hasAttribute('data-cancel-tag')) { tagEditing = null; renderList(); }
    if (button.dataset.removeTag) {
      const expense = state.expenses.find(x => x.id === button.dataset.expense);
      expense.tags = expense.tags.filter(tag => tag !== button.dataset.removeTag);
      savedNotice('Tag removed', 'Tag removed for this session only'); renderList();
    }
    if (button.dataset.searchTag) { $('search').value = `#${button.dataset.searchTag}`; tagEditing = null; renderList(); $('search').focus(); }
  };
  $('expenses').onsubmit = event => {
    const form = event.target.closest('[data-tag-form]'); if (!form) return; event.preventDefault();
    try {
      const tags = C.parseTags($('inline-tag').value);
      if (tags.length !== 1) throw Error('Enter one tag at a time.');
      const expense = state.expenses.find(x => x.id === form.dataset.tagForm);
      if (expense.tags.includes(tags[0])) { notify('This expense already has that tag'); return; }
      expense.tags = C.parseTags([...expense.tags, ...tags]); tagEditing = null;
      savedNotice('Tag added', 'Tag added for this session only'); renderList();
    } catch (e) { $('inline-tag-error').hidden = false; $('inline-tag-error').textContent = e.message; }
  };
  $('delete-form').onsubmit = event => { event.preventDefault(); state.expenses = state.expenses.filter(x => x.id !== deleting); tagEditing = null; savedNotice('Expense deleted', 'Expense deleted for this session only'); render(); $('delete-dialog').close(); };
  $('edit-budget').onclick = () => { $('budget-dialog-period').textContent = monthName($('month').value); $('budget-input').value = state.budgets[$('month').value] !== undefined ? (state.budgets[$('month').value] / 100).toFixed(2) : ''; $('budget-input').setCustomValidity(''); $('budget-dialog').showModal(); };
  $('budget-input').oninput = () => $('budget-input').setCustomValidity('');
  $('budget-form').onsubmit = event => {
    event.preventDefault();
    try { state.budgets[$('month').value] = C.toPaise($('budget-input').value, true); savedNotice('Monthly budget saved', 'Budget updated for this session only'); render(); $('budget-dialog').close(); }
    catch (e) { $('budget-input').setCustomValidity(e.message); $('budget-input').reportValidity(); }
  };
  $('use-voice').onclick = () => { $('voice-panel').hidden = false; $('use-voice').setAttribute('aria-expanded', 'true'); $('start-voice').disabled = !voice.supported; $('voice-status').textContent = voice.supported ? 'Ready when you are. Select Start listening to use your microphone.' : 'Voice entry is unavailable in this browser. You can type below, or try a browser with speech recognition over HTTPS.'; };
  $('start-voice').onclick = () => voice.start(); $('stop-voice').onclick = () => voice.stop(); $('return-keyboard').onclick = () => { closeVoice(); $('description').focus(); };
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
      $('rate-status').textContent = rate ? 'Latest rate unavailable. Your previous manual rate is still shown; enter another rate if needed.' : 'Rate unavailable. Enter a rate manually to convert, or try again.';
      $('manual-rate').open = true; updateConversion();
    } finally { clearTimeout(timeout); if (token === rateRequest) { $('fetch-rate').disabled = false; $('fetch-rate').textContent = 'Get latest rate'; rateController = null; } }
  };
  changeCurrency(); render();
})();
