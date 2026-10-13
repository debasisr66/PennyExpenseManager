(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PennyVoice = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const messages = {
    'not-allowed': 'Microphone permission was denied. Allow it in browser settings, then try again.',
    'service-not-allowed': 'Your browser blocked its speech service. Use the phone keyboard microphone below.',
    'audio-capture': 'No microphone was found. Check the phone microphone, then try again.',
    'no-speech': 'No speech was heard. Try again and speak after Listening appears.',
    network: 'The browser speech service lost its connection. Try again, or use the phone keyboard microphone below.',
    'language-not-supported': 'This browser cannot recognize the selected language. Use the phone keyboard microphone below.',
    aborted: 'Listening stopped. You can try again.'
  };

  function create(Recognition, handlers = {}, options = {}) {
    const startTimeoutMs = options.startTimeoutMs || 12000;
    const listenTimeoutMs = options.listenTimeoutMs || 25000;
    const schedule = options.setTimeout || setTimeout;
    const unschedule = options.clearTimeout || clearTimeout;
    let recognition = null, session = 0, active = false, startTimer = null, listenTimer = null;

    const clearTimers = () => {
      if (startTimer !== null) unschedule(startTimer);
      if (listenTimer !== null) unschedule(listenTimer);
      startTimer = listenTimer = null;
    };
    const makeTimer = (callback, delay) => {
      const timer = schedule(callback, delay);
      timer?.unref?.();
      return timer;
    };
    const update = (status, message) => {
      active = status === 'listening' || status === 'starting';
      handlers.status?.(status, message);
    };
    const transcriptFrom = result => result?.[0]?.transcript?.trim?.() || '';

    function start(language = 'en-IN') {
      if (!Recognition) {
        update('unsupported', 'Direct speech recognition is unavailable. Use the phone keyboard microphone below.');
        return false;
      }
      if (active) return false;

      clearTimers();
      const token = ++session;
      if (recognition) {
        try { recognition.abort(); } catch (error) {}
        recognition = null;
      }

      let finalText = '', partialText = '', delivered = false, failed = false;
      const isCurrent = () => token === session;
      const bestText = () => [finalText, partialText].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
      const deliver = text => {
        const clean = String(text || '').replace(/\s+/g, ' ').trim();
        if (!clean || delivered || failed || !isCurrent()) return false;
        delivered = true;
        handlers.transcript?.(clean);
        update('processing', 'Speech captured. Preparing the English draft…');
        return true;
      };
      const fail = message => {
        if (!isCurrent() || failed) return;
        failed = true;
        clearTimers();
        update('error', message);
      };

      try {
        const current = new Recognition();
        recognition = current;
        current.lang = language;
        current.continuous = false;
        current.interimResults = true;
        current.maxAlternatives = 1;

        current.onstart = () => {
          if (!isCurrent()) return;
          if (startTimer !== null) unschedule(startTimer);
          startTimer = null;
          update('listening', 'Listening… speak one expense, then pause.');
          listenTimer = makeTimer(() => {
            if (!isCurrent() || delivered || failed) return;
            try { current.stop(); } catch (error) {
              fail('Listening became stuck. Tap Try voice again, or use the phone keyboard microphone below.');
            }
          }, listenTimeoutMs);
        };

        current.onresult = event => {
          if (!isCurrent() || failed) return;
          let sawFinal = false;
          const startAt = Number.isInteger(event.resultIndex) ? event.resultIndex : 0;
          for (let index = startAt; index < event.results.length; index++) {
            const result = event.results[index], text = transcriptFrom(result);
            if (!text) continue;
            if (result.isFinal !== false) {
              finalText = [finalText, text].filter(Boolean).join(' ');
              partialText = '';
              sawFinal = true;
            } else {
              partialText = text;
            }
          }
          const heard = bestText();
          if (heard) handlers.preview?.(heard);
          if (sawFinal) deliver(finalText);
        };

        current.onerror = event => {
          if (!isCurrent()) return;
          fail(messages[event.error] || 'Voice entry failed. Tap Try voice again, or use the phone keyboard microphone below.');
        };

        current.onend = () => {
          if (!isCurrent()) return;
          clearTimers();
          recognition = null;
          if (failed) return;
          const captured = delivered || deliver(bestText());
          update(captured ? 'complete' : 'idle', captured
            ? 'English draft ready. Check it before using it.'
            : 'Nothing was captured. Tap Try voice again and speak after Listening appears.');
        };

        update('starting', 'Starting microphone…');
        startTimer = makeTimer(() => {
          if (!isCurrent() || delivered || failed) return;
          fail('The microphone did not start. Tap Try voice again, or use the phone keyboard microphone below.');
          try { current.abort(); } catch (error) {}
        }, startTimeoutMs);
        current.start();
        return true;
      } catch (error) {
        recognition = null;
        fail('Voice entry could not start. Tap Try voice again, or use the phone keyboard microphone below.');
        return false;
      }
    }

    function stop() {
      if (!recognition || !active) return;
      clearTimers();
      update('processing', 'Finishing this voice entry…');
      try { recognition.stop(); } catch (error) {
        const old = recognition;
        recognition = null;
        session++;
        try { old.abort(); } catch (abortError) {}
        update('error', 'Listening could not finish. Tap Try voice again.');
      }
    }

    function cancel() {
      session++;
      clearTimers();
      const old = recognition;
      recognition = null;
      active = false;
      if (old) { try { old.abort(); } catch (error) {} }
      update('idle', 'Keyboard entry is ready.');
    }

    return { start, stop, cancel, supported: !!Recognition, isActive: () => active };
  }
  return { create, messages };
});
