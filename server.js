// KNIGHT XMD - Dashboard Server - Fixed
// By Faceless Tech
const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const config = require('./config');
const { startBot, activeSockets } = require('./src/connection');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ========== PAIRING - FIXED ==========
app.post('/api/pair', async (req, res) => {
  try {
    const { number } = req.body;
    if (!number) return res.json({ success: false, message: 'Number required. Example: 2348071569915' });

    const clean = number.replace(/[^0-9]/g, '');
    if (clean.length < 7 || clean.length > 15) {
      return res.json({ success: false, message: 'Invalid number. Use full number with country code, e.g. 2348071569915' });
    }

    // If already connected, don't start again - return existing
    if (activeSockets[clean]) {
      return res.json({ success: true, message: 'Bot already connected for this number', number: clean, alreadyConnected: true });
    }

    const result = await startBot(clean);
    res.json(result);
  } catch (e) {
    console.log('[PAIR ERROR]', e.message);
    res.json({ success: false, message: e.message });
  }
});

// ========== STATUS - FIXED, REAL DATA ==========
app.get('/api/status', (req, res) => {
  const bots = Object.keys(activeSockets);
  res.json({
    success: true,
    online: bots.length,
    bots,
    uptime: Math.floor((Date.now() - global.botStart) / 1000),
    prefix: config.prefix,
    mode: config.mode,
    botName: config.botName,
  });
});

// ========== LOGOUT / STOP BOT - NEW ==========
app.post('/api/logout', async (req, res) => {
  try {
    const { number } = req.body;
    const clean = (number || '').replace(/[^0-9]/g, '');
    const sock = activeSockets[clean];
    if (!sock) return res.json({ success: false, message: 'No bot found for this number' });
    try { await sock.logout(); } catch {}
    delete activeSockets[clean];
    // Delete session folder so next pair go fresh
    await fs.remove(path.join(__dirname, 'sessions', clean)).catch(() => {});
    res.json({ success: true, message: 'Logged out' });
  } catch (e) { res.json({ success: false, message: e.message }); }
});

// ========== HEALTH - FOR RENDER / UPTIME ROBOT ==========
app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));
app.get('/api/ping', (req, res) => res.json({ success: true, message: 'pong' }));

app.get('/', (req, res) => {
  const file = path.join(__dirname, 'public/index.html');
  if (fs.existsSync(file)) return res.sendFile(file);
  // Fallback if public/index.html no exist - so page no go 404
  res.send(`
    <h1>⚔️ Knight XMD Dashboard</h1>
    <p>Bot is running. Use /api/pair to pair.</p>
    <p>Prefix: ${config.prefix} | Mode: ${config.mode}</p>
    <p>Online bots: ${Object.keys(activeSockets).length}</p>
  `);
});

// FIXED: Render uses process.env.PORT, not config.port only
const PORT = process.env.PORT || config.port || 3000;
app.listen(PORT, () => {
  console.log(`⚔️ Knight XMD Dashboard running on port ${PORT}`);
  console.log(`🌐 Open: http://localhost:${PORT}`);
});

// FIXED: Don't swallow errors silently, log full stack for debug
process.on('uncaughtException', (e) => console.log('[UNCAUGHT]', e.message, e.stack?.split('\n')[1] || ''));
process.on('unhandledRejection', (e) => console.log('[REJECTION]', e?.message || e));
