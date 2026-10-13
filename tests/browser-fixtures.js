/* Test-only fixture. It does not capture audio and is never loaded by the normal app. */
(() => {
  'use strict';
  let lastRecognition = null;
  class FakeRecognition {
    constructor() { lastRecognition = this; }
    start() { this.onstart?.(); }
    stop() { this.onend?.(); }
    abort() { /* Keep reference so cancellation tests can deliver a late result. */ }
  }
  window.SpeechRecognition = FakeRecognition;
  // Deterministic offline translation path; no language model download in tests.
  window.Translator = {availability: async()=> 'unavailable'};
  const banner = document.createElement('section');
  banner.id = 'fixture-controls';
  banner.style.cssText = 'background:#fff4cc;border:2px solid #b98a22;padding:12px;margin:12px;font:14px sans-serif';
  banner.innerHTML = '<strong>TEST HARNESS — simulated speech, no microphone</strong><p>These controls are available only on /voice-harness.</p><label>Test transcript <input id="fixture-transcript" value="Spent 250 rupees on groceries today, tags groceries and family"></label><button id="fixture-result" type="button">Deliver transcript</button><button id="fixture-partial" type="button">Deliver partial then end</button><button id="fixture-deny" type="button">Simulate permission denied</button><label>Rate fixture <select id="fixture-rate"><option value="live">Live API</option><option value="failure">Network failure</option><option value="malformed">Malformed response</option><option value="delay">Delayed response</option></select></label>';
  document.body.prepend(banner);
  function deliver(inputId = 'fixture-transcript', isFinal = true) {
    const result = Object.assign([{ transcript: document.getElementById(inputId).value }], { isFinal });
    lastRecognition?.onresult?.({ resultIndex: 0, results: [result] }); lastRecognition?.onend?.();
  }
  document.getElementById('fixture-result').onclick = () => deliver();
  document.getElementById('fixture-partial').onclick = () => deliver('fixture-transcript', false);
  document.getElementById('fixture-deny').onclick = () => { lastRecognition?.onerror?.({ error: 'not-allowed' }); lastRecognition?.onend?.(); };
  // App dialog makes the outside controls inert; provide identical controls inside it.
  const inner = banner.cloneNode(true);
  inner.id = 'fixture-dialog-controls';
  inner.querySelector('#fixture-transcript').id = 'fixture-dialog-transcript';
  inner.querySelector('#fixture-result').id = 'fixture-dialog-result';
  inner.querySelector('#fixture-partial').id = 'fixture-dialog-partial';
  inner.querySelector('#fixture-deny').id = 'fixture-dialog-deny';
  inner.querySelectorAll('label')[1].remove();
  inner.querySelector('strong').textContent = 'Simulated voice controls';
  document.getElementById('voice-panel').append(inner);
  document.getElementById('fixture-dialog-result').onclick = () => deliver('fixture-dialog-transcript');
  document.getElementById('fixture-dialog-partial').onclick = () => deliver('fixture-dialog-transcript', false);
  document.getElementById('fixture-dialog-deny').onclick = document.getElementById('fixture-deny').onclick;
  const realFetch = window.fetch.bind(window);
  window.fetch = (url, options) => {
    if (!String(url).startsWith('https://api.frankfurter.dev/')) return realFetch(url, options);
    const mode = document.getElementById('fixture-rate').value;
    if (mode === 'failure') return Promise.reject(Error('Simulated network failure'));
    if (mode === 'malformed') return Promise.resolve({ ok: true, json: async () => ({ base: 'FAKE', quote: 'USD', date: '2026-10-12', rate: -1 }) });
    if (mode === 'delay') return new Promise(resolve => setTimeout(() => resolve({ ok: true, json: async () => ({ base: 'INR', quote: 'USD', date: '2026-10-12', rate: 0.01 }) }), 500));
    return realFetch(url, options);
  };
})();
