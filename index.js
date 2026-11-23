const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const config = require('./config');
const { startBot, activeSockets } = require('./src/connection');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

// Dashboard API - Pairing
app.post('/api/pair', async (req, res) => {
  try {
    const { number } = req.body;
    if (!number) return res.json({ success: false, message: 'Number required' });
    const clean = number.replace(/[^0-9]/g, '');
    const result = await startBot(clean);
    res.json(result);
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
});

app.get('/api/status', (req, res) => {
  res.json({ online: Object.keys(activeSockets).length, bots: Object.keys(activeSockets) });
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public/index.html')));

app.listen(config.port, () => {
  console.log(`⚔️ Knight XMD Dashboard running on port ${config.port}`);
  console.log(`🌐 Open: http://localhost:${config.port}`);
});

// Auto restart if crash
process.on('uncaughtException', (e) => console.log('Error:', e.message));
