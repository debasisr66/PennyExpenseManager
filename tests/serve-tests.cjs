// Loopback-only browser test server. /voice-harness uses simulated speech and rate failures.
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.md': 'text/plain; charset=utf-8', '.txt': 'text/plain; charset=utf-8' };
http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    const harness = url.pathname === '/voice-harness', mobileHarness=url.pathname === '/mobile-voice-harness';
    const relative = harness || mobileHarness || url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname).replace(/^\//, '');
    const file = path.resolve(root, relative);
    if (!file.startsWith(root + path.sep) || relative.startsWith('.git/')) { response.writeHead(403); response.end(); return; }
    let data = await fs.readFile(file);
    if (harness) data = Buffer.from(data.toString().replace('<script src="core.js">', '<script src="tests/browser-fixtures.js"></script>\n<script src="core.js">').replace('<script src="app.js">','<script src="tests/translation-fixture.js"></script>\n<script src="tests/import-fixtures.js"></script>\n<script src="app.js">'));
    if (mobileHarness) data = Buffer.from(data.toString().replace('<script src="core.js">', '<script src="tests/no-speech-fixture.js"></script>\n<script src="core.js">').replace('<script src="app.js">','<script src="tests/translation-fixture.js"></script>\n<script src="app.js">'));
    response.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); response.end(data);
  } catch (e) { response.writeHead(404); response.end('Not found'); }
}).listen(8767, '127.0.0.1', () => console.log('Test app: http://127.0.0.1:8767/\nSimulated voice: http://127.0.0.1:8767/voice-harness\nMobile fallback: http://127.0.0.1:8767/mobile-voice-harness'));
