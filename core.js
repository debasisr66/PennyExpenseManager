/* Shared, deterministic expense logic. No network, microphone, or storage access. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PennyCore = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const categories = ['Food & groceries', 'Housing', 'Transport', 'Shopping', 'Health', 'Entertainment', 'Other'];
  const MAX_AMOUNT = 999999999;
  const normalize = value => String(value).normalize('NFKC').toLowerCase();
  function validDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(value + 'T12:00:00Z');
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value && Number(value.slice(0, 4)) >= 1900;
  }
  const validMonth = value => /^\d{4}-\d{2}$/.test(value) && validDate(value + '-01');
  function shiftDate(value, days) {
    const date = new Date(value + 'T12:00:00Z');
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  }
  function previousMonth(value) {
    const date = new Date(value.slice(0, 7) + '-15T12:00:00Z');
    date.setUTCMonth(date.getUTCMonth() - 1);
    return date.toISOString().slice(0, 7);
  }
  function toPaise(value, allowZero = false) {
    const raw = String(value).trim();
    if (!/^\d+(?:\.\d{1,2})?$/.test(raw)) throw Error('Use a positive amount with no more than two decimal places.');
    const number = Number(raw), paise = Math.round(number * 100);
    if (!Number.isSafeInteger(paise) || number > MAX_AMOUNT || (allowZero ? paise < 0 : paise <= 0)) throw Error(allowZero ? 'Enter a budget from 0 to 999999999.' : 'Enter an amount greater than zero and no more than 999999999.');
    return paise;
  }
  function parseTags(value) {
    const tokens = Array.isArray(value) ? value : String(value || '').split(/[\s,]+/u);
    const tags = [];
    for (let token of tokens) {
      token = normalize(token).replace(/^#/, '');
      if (!token) continue;
      if (!/^[\p{L}\p{N}][\p{L}\p{M}\p{N}_-]{0,31}$/u.test(token)) throw Error('Tags can use 1–32 letters, numbers, underscores or hyphens.');
      if (!tags.includes(token)) tags.push(token);
    }
    if (tags.length > 12) throw Error('Use up to 12 tags per expense.');
    return tags;
  }
  function extractTags(description, extraTags = '') {
    const inline = description.match(/#[\p{L}\p{M}\p{N}_-]+/gu) || [];
    const text = description.replace(/#[\p{L}\p{M}\p{N}_-]+/gu, '').replace(/\s+/g, ' ').trim();
    return { description: text, tags: parseTags([...inline, ...parseTags(extraTags)]) };
  }
  function validateExpense(input) {
    const { description, tags } = extractTags(String(input.description || ''), input.tags || []);
    if (!description || description.length > 100) throw Error('Enter a description of 1–100 characters, in addition to your tags.');
    if (!validDate(input.date)) throw Error('Choose a valid date (year 1900 or later).');
    if (!categories.includes(input.category)) throw Error('Choose a category from the list.');
    return { id: String(input.id), description, tags, date: input.date, category: input.category, cents: toPaise(input.amount) };
  }
  function migrateState(raw) {
    if (!raw || !Array.isArray(raw.expenses) || !raw.budgets || typeof raw.budgets !== 'object' || Array.isArray(raw.budgets)) throw Error('Saved data has an invalid structure.');
    if (raw.schemaVersion && raw.schemaVersion > 2) throw Error('This data needs a newer version of Penny.');
    const ids = new Set();
    const expenses = raw.expenses.map(x => {
      if (!x || typeof x.id !== 'string' || !x.id || ids.has(x.id) || typeof x.description !== 'string' || !x.description.trim() || x.description.length > 100 || !validDate(x.date) || !categories.includes(x.category) || !Number.isSafeInteger(x.cents) || x.cents <= 0 || x.cents > MAX_AMOUNT * 100 || (x.tags !== undefined && !Array.isArray(x.tags))) throw Error('A saved expense is invalid.');
      ids.add(x.id);
      return { id: x.id, description: x.description, date: x.date, category: x.category, cents: x.cents, tags: parseTags(x.tags || []) };
    });
    const budgets = {};
    for (const [month, amount] of Object.entries(raw.budgets)) {
      if (!validMonth(month) || !Number.isSafeInteger(amount) || amount < 0 || amount > MAX_AMOUNT * 100) throw Error('A saved budget is invalid.');
      budgets[month] = amount;
    }
    // V1 amounts were mislabeled USD. Preserve numerical values; all records are INR in V2.
    return { schemaVersion: 2, currency: 'INR', expenses, budgets };
  }
  function summary(state, month) {
    const rows = state.expenses.filter(x => x.date.startsWith(month));
    const total = rows.reduce((sum, x) => sum + x.cents, 0);
    const budget = state.budgets[month];
    const byCategory = categories.map(category => ({ category, cents: rows.filter(x => x.category === category).reduce((sum, x) => sum + x.cents, 0) })).filter(x => x.cents > 0).sort((a, b) => b.cents - a.cents);
    return { rows, total, budget, remaining: budget === undefined ? null : budget - total, exceeded: budget !== undefined && total > budget, byCategory };
  }
  function editDistanceAtMostOne(a, b) {
    if (Math.abs(a.length - b.length) > 1) return false;
    let i = 0, j = 0, edits = 0;
    while (i < a.length && j < b.length) {
      if (a[i] === b[j]) { i++; j++; continue; }
      if (++edits > 1) return false;
      if (a.length >= b.length) i++;
      if (b.length >= a.length) j++;
    }
    return edits + (a.length - i) + (b.length - j) <= 1;
  }
  function parseSearch(query, referenceDate) {
    let input = normalize(query).trim(), predicates = [], errors = [];
    input = input.replace(/\b(this|last) month\b/g, (_, when) => `month:${when === 'this' ? referenceDate.slice(0, 7) : previousMonth(referenceDate)}`);
    input = input.replace(/\b(over|under)\s+(?:₹|rs\.?\s*)?(\d+(?:\.\d{1,2})?)\b/g, (_, op, amount) => `${op}:${amount}`);
    const tokens = input.match(/(?:[^\s"]*"[^"]*"[^\s"]*|[^\s"]+)/g) || [];
    if ((input.match(/"/g) || []).length % 2) errors.push('Close the quotation mark to search a phrase.');
    for (const token of tokens) {
      const term = token.replace(/"/g, '');
      const match = term.match(/^(category|tag|month|after|before|min|max|over|under):(.+)$/);
      if (match) {
        const [, key, value] = match;
        if (['min', 'max', 'over', 'under'].includes(key)) {
          try { const amount = toPaise(value, true); predicates.push(x => key === 'min' ? x.cents >= amount : key === 'max' ? x.cents <= amount : key === 'over' ? x.cents > amount : x.cents < amount); } catch (e) { errors.push(`Invalid ${key} amount.`); }
        } else if (key === 'month') {
          if (!validMonth(value)) errors.push('Use month:YYYY-MM.'); else predicates.push(x => x.date.startsWith(value));
        } else if (key === 'after' || key === 'before') {
          if (!validDate(value)) errors.push(`Use ${key}:YYYY-MM-DD with a valid date.`); else predicates.push(x => key === 'after' ? x.date >= value : x.date <= value);
        } else if (key === 'tag') {
          predicates.push(x => (x.tags || []).some(tag => normalize(tag).startsWith(value.replace(/^#/, ''))));
        } else predicates.push(x => normalize(x.category).includes(value));
      } else if (term.startsWith('#')) {
        predicates.push(x => (x.tags || []).some(tag => normalize(tag).startsWith(term.slice(1))));
      } else {
        predicates.push(x => {
          const dateText = new Date(x.date + 'T12:00:00Z').toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' });
          const haystack = normalize(`${x.description} ${x.category} ${(x.tags || []).join(' ')} ${x.date} ${dateText} ${(x.cents / 100).toFixed(2)}`);
          const cleanTerm = term.replace(/^₹/, '');
          return haystack.includes(cleanTerm) || (!token.includes('"') && /^[\p{L}]{5,}$/u.test(cleanTerm) && haystack.split(/[^\p{L}]+/u).some(word => editDistanceAtMostOne(word, cleanTerm)));
        });
      }
    }
    return { errors, matches: x => !errors.length && predicates.every(predicate => predicate(x)) };
  }
  function searchExpenses(expenses, query, referenceDate) {
    const parsed = parseSearch(query, referenceDate);
    return { errors: parsed.errors, expenses: expenses.filter(parsed.matches).sort((a, b) => b.date.localeCompare(a.date)) };
  }
  const numberMap = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
  const numberWords = Object.keys(numberMap).concat(['hundred', 'thousand', 'lakh', 'million', 'and', 'point']);
  function spokenNumber(value) {
    const raw = value.trim().replace(/,/g, '');
    if (/^-?\d+(?:\.\d+)?$/.test(raw)) return Number(raw);
    const words = normalize(raw).replace(/-/g, ' ').split(/\s+/);
    let total = 0, group = 0, decimal = '', afterPoint = false, hasNumber = false;
    for (const word of words) {
      if (word === 'and') continue;
      if (word === 'point' && !afterPoint) { afterPoint = true; continue; }
      if (afterPoint) {
        if (!(word in numberMap) || numberMap[word] > 9) return null;
        decimal += numberMap[word]; continue;
      }
      if (word in numberMap) { group += numberMap[word]; hasNumber = true; }
      else if (word === 'hundred') group = (group || 1) * 100;
      else if (['thousand', 'lakh', 'million'].includes(word)) { total += (group || 1) * ({ thousand: 1000, lakh: 100000, million: 1000000 }[word]); group = 0; }
      else return null;
    }
    return hasNumber ? total + group + (decimal ? Number('0.' + decimal) : 0) : null;
  }
  function parseVoice(transcript, referenceDate) {
    const raw = String(transcript).trim();
    let text = raw, date = null, amount = null, warnings = [], tags = [];
    const inlineTags = raw.match(/#[\p{L}\p{M}\p{N}_-]+/gu) || [];
    text = text.replace(/#[\p{L}\p{M}\p{N}_-]+/gu, '');
    const tagClause = text.match(/\b(?:tags?|hashtags?|hash tag)\s+(.+)$/i);
    if (tagClause) {
      const tagWords = tagClause[1].replace(/\band\b/gi, ' ').replace(/[.!?]/g, '').trim();
      try { tags = parseTags([...inlineTags, ...parseTags(tagWords)]); } catch (e) { warnings.push(e.message); }
      text = text.slice(0, tagClause.index);
    } else { try { tags = parseTags(inlineTags); } catch (e) { warnings.push(e.message); } }
    const dateMatch = text.match(/\b\d{4}-\d{2}-\d{2}\b/);
    if (dateMatch) { if (validDate(dateMatch[0])) date = dateMatch[0]; else warnings.push('The spoken date is invalid; choose a date below.'); text = text.replace(dateMatch[0], ''); }
    else if (/\byesterday\b/i.test(text)) { date = shiftDate(referenceDate, -1); text = text.replace(/\byesterday\b/gi, ''); }
    else if (/\btoday\b/i.test(text)) { date = referenceDate; text = text.replace(/\btoday\b/gi, ''); }
    const numberPattern = `(?:-?\\d[\\d,]*(?:\\.\\d+)?|(?:${numberWords.join('|')})(?:[ -]+(?:${numberWords.join('|')}))*)`;
    // An amount must have a rupee marker or follow an explicit spending/amount cue.
    const currencyMatch = text.match(new RegExp(`(?:₹\\s*(${numberPattern})|\\b(?:rs\\.?|inr)\\s+(${numberPattern})|(?<![\\w.-])(${numberPattern})\\s+(?:rupees?|inr|rs\\.?)(?=\\s|[,!.]|$))`, 'i'));
    const amountMatch = currencyMatch || text.match(new RegExp(`\\b(?:spent|paid|amount)\\s+(${numberPattern})(?=\\s|[,!.]|$)`, 'i')) || text.match(new RegExp(`^\\s*(${numberPattern})\\s+(?:on|for)\\b`, 'i'));
    if (amountMatch) {
      const captured = amountMatch.slice(1).find(Boolean), number = spokenNumber(captured);
      try { amount = toPaise(String(number)) / 100; } catch (e) { warnings.push('The spoken amount is invalid; enter the correct amount below.'); }
      text = text.replace(amountMatch[0], ' ');
    } else warnings.push('No amount was recognised; enter it below.');
    text = text.replace(/^\s*(?:i\s+)?(?:spent|paid|add an? expense|expense|amount)\b\s*/i, '').replace(/^\s*(?:on|for)\b\s*/i, '').trim().replace(/[,.!?]+$/g, '').replace(/\s+/g, ' ').trim();
    const categorySignals = [
      ['Housing', /\b(rent|housing|maintenance|electricity|utilities)\b/i],
      ['Food & groceries', /\b(food|groceries|grocery|coffee|lunch|dinner|produce|restaurant)\b/i],
      ['Transport', /\b(transport|petrol|fuel|taxi|train|bus|uber|travel)\b/i],
      ['Health', /\b(health|medical|medicine|pharmacy|doctor)\b/i],
      ['Entertainment', /\b(entertainment|movie|cinema|concert)\b/i],
      ['Shopping', /\b(shopping|clothes|sneakers|shoes)\b/i]
    ];
    if (/\b(dollars?|usd|euros?|eur|pounds?|gbp)\b/i.test(raw)) { amount = null; warnings.push('Voice expenses use INR. Convert the foreign amount to rupees and enter it below.'); }
    const category = (categorySignals.find(([, pattern]) => pattern.test(text)) || [null])[0];
    return { amount, date, description: text.slice(0, 100), category, tags, warnings };
  }
  function convert(amount, rate) {
    const value = Number(amount), multiplier = Number(rate);
    if (String(amount).trim() === '' || !Number.isFinite(value) || value < 0 || value > MAX_AMOUNT || !Number.isFinite(multiplier) || multiplier <= 0 || multiplier > 1e9) return null;
    return Math.round((value * multiplier + Number.EPSILON) * 100) / 100;
  }
  function validateRate(data, quote, base = 'INR') {
    if (!data || data.base !== base || data.quote !== quote || !validDate(data.date) || typeof data.rate !== 'number' || !Number.isFinite(data.rate) || data.rate <= 0 || data.rate > 1e9) throw Error('Invalid exchange-rate response.');
    return { rate: data.rate, date: data.date, quote };
  }
  return { categories, MAX_AMOUNT, validDate, validMonth, shiftDate, previousMonth, toPaise, parseTags, extractTags, validateExpense, migrateState, summary, parseSearch, searchExpenses, spokenNumber, parseVoice, convert, validateRate };
});
