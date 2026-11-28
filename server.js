// KNIGHT XMD - Dashboard Server - FIXED STATUS + PAIR + CACHED
const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const config = require('./config');
const { startBot, activeSockets } = require('./src/connection');
const devicesApi = require('./src/devicesApi');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ========== PAIRING - MUST BE BEFORE devicesApi ==========
app.post('/api/pair', async (req, res) => {
  try {
    const { number } = req.body;
    if (!number) return res.json({ success: false, message: 'Number required. Example: 2348071569915' });
    const clean = number.replace(/[^0-9]/g, '');
    if (clean.length < 7 || clean.length > 15) {
      return res.json({ success: false, message: 'Invalid number. Use full number with country code, e.g. 2348071569915' });
    }
    const result = await startBot(clean);
    res.json({ ...result, number: clean });
  } catch (e) {
    console.log('[PAIR ERROR]', e.message);
    res.json({ success: false, message: e.message });
  }
});

app.get('/getcode', async (req, res) => {
  try {
    let phone = (req.query.number || req.query.phone || '').replace(/[^0-9]/g, '');
    if (!phone) return res.json({ success: false, message: 'Add ?number=2348071569915' });
    const result = await startBot(phone);
    if (result.code) {
      return res.json({ success: true, code: result.code, phone, codeFormatted: result.code.match(/.{1,4}/g)?.join("-") });
    }
    res.json(result);
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
});

// ========== STATUS - FIXED: bots as STRINGS + detailed separate ==========
app.get('/api/status', (req, res) => {
  const all = Object.keys(activeSockets);
  const connected = all.filter(b => activeSockets[b]?.user);
  const detailed = all.map(n => ({
    number: n,
    connected: !!activeSockets[n]?.user,
    waitingForCode: !!activeSockets[n]?.pairingCode,
    code: activeSockets[n]?.pairingCode || null
  }));
  res.json({
    success: true,
    online: connected.length,
    waiting: all.length - connected.length,
    bots: connected, // <-- FIX: strings only, so .includes(number) works
    allBots: all,
    detailed: detailed, // <-- for devices page
    uptime: Math.floor((Date.now() - (global.botStart || Date.now())) / 1000),
    prefix: config.prefix,
    mode: config.mode,
    botName: config.botName,
  });
});

// ========== LOGOUT ==========
app.post('/api/logout', async (req, res) => {
  try {
    const { number } = req.body;
    const clean = (number || '').replace(/[^0-9]/g, '');
    const sock = activeSockets[clean];
    if (sock) {
      try { await sock.logout(); } catch {}
      try { sock.end(); } catch {}
      delete activeSockets[clean];
    }
    await fs.remove(path.join(__dirname, 'sessions', clean)).catch(() => {});
    res.json({ success: true, message: 'Logged out, session cleared. Get new code now.' });
  } catch (e) { res.json({ success: false, message: e.message }); }
});

// Devices API AFTER pair/status - so it no hijack them
app.use('/api', devicesApi);

app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));
app.get('/api/ping', (req, res) => res.json({ success: true, message: 'pong' }));

app.get('/', (req, res) => {
  const file = path.join(__dirname, 'public/index.html');
  if (fs.existsSync(file)) return res.sendFile(file);
  res.send(`
    <h1>⚔️ Knight XMD Dashboard</h1>
    <p>Bot is running. Use /api/pair to pair.</p>
    <p>Prefix: ${config.prefix} | Mode: ${config.mode}</p>
    <p>Online bots: ${Object.keys(activeSockets).length}</p>
  `);
});

async function autoRestoreBots() {
  try {
    const sessionsDir = path.join(__dirname, 'sessions');
    if (!await fs.pathExists(sessionsDir)) return;
    const folders = await fs.readdir(sessionsDir);
    for (const folder of folders) {
      const clean = String(folder).replace(/[^0-9]/g, '');
      if (!clean) continue;
      const credsPath = path.join(sessionsDir, folder, 'creds.json');
      if (!await fs.pathExists(credsPath)) continue;
      console.log(`[RESTORE] Auto-starting saved bot: ${clean}`);
      try { await startBot(clean); } catch (e) { console.log(`[RESTORE] Failed ${clean}:`, e.message); }
      await new Promise(r => setTimeout(r, 1000));
    }
  } catch (e) { console.log('[RESTORE] Error:', e.message); }
}

const PORT = process.env.PORT || config.port || 3000;
app.listen(PORT, () => {
  console.log(`⚔️ Knight XMD Dashboard running on port ${PORT}`);
  console.log(`🌐 Open: http://localhost:${PORT}`);
  setTimeout(() => autoRestoreBots(), 2000);
});

process.on('uncaughtException', (e) => console.log('[UNCAUGHT]', e.message, e.stack?.split('\n')[1] || ''));
process.on('unhandledRejection', (e) => console.log('[REJECTION]', e?.message || e));
