/* Test-only: simulate a mobile browser without the Web Speech recognition API. */
window.SpeechRecognition=undefined;
window.webkitSpeechRecognition=undefined;
window.Translator={availability:async()=> 'unavailable'};
