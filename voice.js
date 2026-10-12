(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PennyVoice = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const messages = {
    'not-allowed': 'Microphone permission was denied. You can keep typing, or allow the microphone in your browser settings.',
    'service-not-allowed': 'Your browser blocked its speech service. Please use keyboard entry.',
    'audio-capture': 'No microphone was found. Please use keyboard entry.',
    'no-speech': 'No speech was heard. Try again, or type the expense.',
    network: 'The speech service could not connect. Check your connection or use keyboard entry.',
    'language-not-supported': 'English speech recognition is unavailable. Please use keyboard entry.',
    aborted: 'Listening cancelled. You can keep typing.'
  };
  function create(Recognition, handlers = {}) {
    let recognition = null, session = 0, active = false;
    const update = (status, message) => { active = status === 'listening' || status === 'starting'; if (handlers.status) handlers.status(status, message); };
    function start() {
      if (!Recognition) { update('unsupported', 'Voice entry is unavailable in this browser. Use keyboard entry, or try a browser with speech recognition support over HTTPS.'); return false; }
      if (active) return false;
      const token = ++session;
      if (recognition) { try { recognition.abort(); } catch (e) {} recognition = null; }
      let delivered = false, failed = false;
      try {
        recognition = new Recognition();
        recognition.lang = 'en-IN'; recognition.continuous = false; recognition.interimResults = false; recognition.maxAlternatives = 1;
        recognition.onstart = () => { if (token === session) update('listening', 'Listening… say your expense, then pause.'); };
        recognition.onresult = event => {
          if (token !== session || failed) return;
          const result = event.results[event.resultIndex || 0];
          if (!result || !result.isFinal || !result[0] || !result[0].transcript.trim()) return;
          delivered = true;
          if (handlers.transcript) handlers.transcript(result[0].transcript);
          update('complete', 'Draft filled. Review every field, then choose Save expense.');
        };
        recognition.onerror = event => { if (token !== session) return; failed = true; update('error', messages[event.error] || 'Voice entry failed. Please use keyboard entry.'); };
        recognition.onend = () => { if (token !== session) return; recognition = null; if (!failed) update(delivered ? 'complete' : 'idle', delivered ? 'Draft filled. Review every field, then save.' : 'Listening stopped. Try again, or type the expense.'); };
        update('starting', 'Starting microphone…'); recognition.start(); return true;
      } catch (e) { failed = true; recognition = null; update('error', 'Voice entry could not start. Please use keyboard entry.'); return false; }
    }
    function stop() { if (recognition && active) { try { recognition.stop(); } catch (e) { cancel(); } } }
    function cancel() {
      session++; active = false;
      const old = recognition; recognition = null;
      if (old) { try { old.abort(); } catch (e) {} }
      update('idle', 'Keyboard entry is ready.');
    }
    return { start, stop, cancel, supported: !!Recognition, isActive: () => active };
  }
  return { create, messages };
});
