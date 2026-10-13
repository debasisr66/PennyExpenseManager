/* Test-only: model preparation never resolves, so voice must start and use the bounded offline fallback. */
PennyTranslation.prepare=async()=>new Promise(()=>{});
