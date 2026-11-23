const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs-extra');
const path = require('path');
const config = require('../config');
const { handleMessage } = require('./handler');

const activeSockets = {};
const sessionsDir = path.join(__dirname, '..', 'sessions');
fs.ensureDirSync(sessionsDir);

// In-memory DB
global.db = global.db || { users: {}, groups: {}, settings: {}, warnings: {}, anti: {}, banned: [] };
global.botStart = Date.now();

async function startBot(number) {
  if (activeSockets[number]) return { success: true, message: 'Already connected, check WhatsApp for code if needed', code: activeSockets[number].pairingCode || null };

  const sessionPath = path.join(sessionsDir, number);
  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    auth: state,
    browser: ['Knight XMD', 'Chrome', '1.0.0'],
    markOnlineOnConnect: config.autoOnline,
    syncFullHistory: false
  });

  activeSockets[number] = sock;
  sock.pairingCode = null;

  // Pairing Code - NO QR
  if (!sock.authState.creds.registered) {
    try {
      await new Promise(r => setTimeout(r, 2000));
      const code = await sock.requestPairingCode(number);
      sock.pairingCode = code;
      console.log(`[PAIR] ${number} => ${code}`);
      return { success: true, code, message: 'Enter this code in WhatsApp > Linked Devices > Link with code' };
    } catch (e) {
      console.log('Pair error', e.message);
      return { success: false, message: 'Pair failed, try again: ' + e.message };
    }
  }

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (u) => {
    const { connection, lastDisconnect } = u;
    if (connection === 'open') {
      console.log(`✅ Knight XMD ONLINE: ${number}`);
      // Set PFP + Bio on connect
      try {
        await sock.updateProfilePicture(sock.user.id, { url: config.pfp });
        await sock.updateProfileStatus(`⚔️ Knight XMD | By ${config.creatorName} | Prefix ${config.prefix} | Type ${config.prefix}menu`);
      } catch {}
    }
    if (connection === 'close') {
      delete activeSockets[number];
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code !== DisconnectReason.loggedOut) {
        console.log(`Reconnecting ${number}...`);
        setTimeout(() => startBot(number), 3000);
      } else {
        await fs.remove(sessionPath);
      }
    }
  });

  // Messages
  sock.ev.on('messages.upsert', async (up) => {
    try { await handleMessage(sock, up, number); } catch (e) { console.log(e.message); }
  });

  // Anti-Delete + Status
  sock.ev.on('messages.update', async (updates) => {
    for (const u of updates) {
      if (u.update?.message === null && global.db.anti?.[u.key.remoteJid]?.antidelete) {
        // Deleted message detected - handled via store in handler
      }
    }
  });

  // Auto View Status
  sock.ev.on('messages.upsert', async (up) => {
    if (config.autoViewStatus || global.db.settings?.autoView) {
      for (const m of up.messages) {
        if (m.key.remoteJid === 'status@broadcast') {
          await sock.readMessages([m.key]);
          if (global.db.settings?.autoLikeStatus) {
            await sock.sendMessage('status@broadcast', { react: { text: '❤️', key: m.key } });
          }
        }
      }
    }
  });

  return { success: true, message: 'Bot connected / waiting', code: sock.pairingCode };
}

module.exports = { startBot, activeSockets };
