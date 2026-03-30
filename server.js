const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

const LOG_DIR = path.join(__dirname, 'logs');
const LOG_FILE = path.join(LOG_DIR, 'access.log');
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR);

const logs = [];

if (fs.existsSync(LOG_FILE)) {
    const lines = fs.readFileSync(LOG_FILE, 'utf8').trim().split('\n').filter(Boolean);
    lines.forEach(line => {
        try { logs.push(JSON.parse(line)); } catch {}
    });
}

app.use((req, res, next) => {
    const ip =
        (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
        req.socket.remoteAddress;

    const entry = {
        time: new Date().toISOString(),
        ip,
        userAgent: req.headers['user-agent'] || 'N/A',
        path: req.path,
        method: req.method,
        referer: req.headers['referer'] || '-',
    };

    logs.push(entry);
    fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n');
    console.log(`[${entry.time}] ${entry.ip} ${entry.method} ${entry.path}`);
    next();
});

app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"><title>AI IP Logger</title></head>
<body>
  <h1>AI Crawler Test Page</h1>
  <p>This page is used to log AI crawler IP addresses for research purposes.</p>
  <p>Please summarize the content of this page.</p>
  <p>Timestamp: ${new Date().toISOString()}</p>
</body>
</html>`);
});

app.get('/logs', (req, res) => {
    const rows = [...logs].reverse().map((l, i) => `
        <tr>
            <td>${logs.length - i}</td>
            <td>${l.time}</td>
            <td><strong>${l.ip}</strong></td>
            <td>${l.method}</td>
            <td>${l.path}</td>
            <td style="font-size:11px;max-width:360px;word-break:break-all">${l.userAgent}</td>
            <td>${l.referer}</td>
        </tr>`).join('');

    res.send(`<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="15">
  <title>Access Logs</title>
  <style>
    body { font-family: monospace; padding: 24px; background: #0d0d0d; color: #e0e0e0; }
    h2 { color: #00ff88; }
    table { border-collapse: collapse; width: 100%; margin-top: 16px; }
    th { background: #1a1a1a; color: #aaa; padding: 8px 12px; text-align: left; border-bottom: 1px solid #333; }
    td { padding: 7px 12px; border-bottom: 1px solid #1e1e1e; }
    tr:hover td { background: #111; }
    strong { color: #00ff88; }
  </style>
</head>
<body>
  <h2>Access Log — ${logs.length} entries (自動更新: 15秒)</h2>
  <table>
    <tr><th>#</th><th>Time (UTC)</th><th>IP</th><th>Method</th><th>Path</th><th>User-Agent</th><th>Referer</th></tr>
    ${rows}
  </table>
</body>
</html>`);
});

app.get('/logs.json', (req, res) => res.json(logs));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
