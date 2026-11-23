// KNIGHT XMD - Connection - Fixed, Connects to Handler
// By Faceless Tech
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs-extra');
const path = require('path');
const config = require('../config');
const { handleMessage } = require('./handler');

const activeSockets = {};
const sessionsDir = path.join(__dirname, '..', 'sessions');
fs.ensureDirSync(sessionsDir);

// In-memory DB - FIXED: Don't overwrite handler's DB. Handler already loads database.json
// If connection loads first, handler will merge. If handler loads first, keep it.
if (!global.db) global.db = { users: {}, groups: {}, settings: {}, warnings: {}, anti: {}, banned: [] };
if (!global.db.banned) global.db.banned = [];
if (!global.db.warnings) global.db.warnings = {};
if (!global.db.anti) global.db.anti = {};
if (!global.db.settings) global.db.settings = {};
if (!global.botStart) global.botStart = Date.now();

async function startBot(number) {
  const clean = String(number).replace(/[^0-9]/g, '');

  // FIXED: If already connected, return real pairing code if still waiting, else say connected
  if (activeSockets[clean]) {
    return { success: true, message: 'Already connected, check WhatsApp for code if needed', code: activeSockets[clean].pairingCode || null, alreadyConnected: true };
  }

  const sessionPath = path.join(sessionsDir, clean);
  await fs.ensureDir(sessionPath);
  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

  let version = [2, 3000, 0];
  try {
    const v = await fetchLatestBaileysVersion();
    version = v.version;
  } catch {}

  const sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    auth: state,
    browser: ['Knight XMD', 'Chrome', '1.0.0'],
    markOnlineOnConnect: config.autoOnline || false,
    syncFullHistory: false
  });

  activeSockets[clean] = sock;
  sock.pairingCode = null;

  // FIXED: creds.update MUST be registered immediately, before pairing.
  // Before, e was only after pairing check, so if user pair fast, creds no go save and bot go ask pairing again on restart.
  sock.ev.on('creds.update', saveCreds);

  // FIXED: connection.update MUST be registered before pairing too, else 'open' event go miss
  sock.ev.on('connection.update', async (u) => {
    const { connection, lastDisconnect } = u;
    if (connection === 'open') {
      console.log(`✅ Knight XMD ONLINE: ${clean}`);
      sock.pairingCode = null; // Clear code once connected
      // Set PFP + Bio on connect - FIXED: only once, and don't crash if PFP link dead
      try {
        if (config.pfp && config.pfp.startsWith('http')) {
          await sock.updateProfilePicture(sock.user.id, { url: config.pfp }).catch(() => {});
        }
        await sock.updateProfileStatus(`⚔️ Knight XMD | By ${config.creatorName} | Prefix ${config.prefix} | Type ${config.prefix}menu`).catch(() => {});
      } catch {}
    }
    if (connection === 'close') {
      delete activeSockets[clean];
      const code = lastDisconnect?.error?.output?.statusCode;
      console.log(`[KNIGHT ${clean}] Closed:`, code);
      if (code !== DisconnectReason.loggedOut) {
        console.log(`Reconnecting ${clean}...`);
        setTimeout(() => startBot(clean).catch(() => {}), 3000);
      } else {
        // Logged out - delete session so next pair go fresh
        await fs.remove(sessionPath).catch(() => {});
      }
    }
  });

  // FIXED: ONE messages.upsert listener only. Before you get TWO - one for handleMessage, one for status view.
  // Two listeners mean handler go run twice for status messages, and bot go double-reply / double-read.
  // Now single listener handles both.
  sock.ev.on('messages.upsert', async (up) => {
    try {
      // Auto View Status - inside same listener
      if (config.autoViewStatus || global.db.settings?.autoView) {
        for (const m of up.messages) {
          if (m.key.remoteJid === 'status@broadcast') {
            try {
              await sock.readMessages([m.key]);
              if (global.db.settings?.autoLikeStatus) {
                await sock.sendMessage('status@broadcast', { react: { text: '❤️', key: m.key } }).catch(() => {});
              }
            } catch {}
          }
        }
      }
      // Normal messages -> handler
      await handleMessage(sock, up, clean);
    } catch (e) { console.log('[UP ERROR]', e.message); }
  });

  // Anti-Delete - keep, but don't crash if db no get anti
  sock.ev.on('messages.update', async (updates) => {
    try {
      for (const u of updates) {
        if (u.update?.message === null && global.db.anti?.[u.key.remoteJid]?.antidelete) {
          // TODO: need message store to resend deleted msg. For now just log.
          console.log(`[ANTI-DELETE] Deleted in ${u.key.remoteJid}`);
        }
      }
    } catch {}
  });

  // ========== PAIRING CODE - FIXED ORDER ==========
  // FIXED: Before, if NOT registered, you return early and NEVER register connection.update / messages.upsert.
  // So bot go generate code, but when user enter code, bot no go know say e don connect, and no go receive messages.
  // Now listeners dey already registered above, so we fit safely return code.
  if (!state.creds.registered) {
    try {
      await new Promise(r => setTimeout(r, 2000));
      const code = await sock.requestPairingCode(clean);
      sock.pairingCode = code;
      console.log(`[PAIR] ${clean} => ${code}`);
      return { success: true, code, message: 'Enter this code in WhatsApp > Linked Devices > Link with code' };
    } catch (e) {
      console.log('Pair error', e.message);
      delete activeSockets[clean];
      return { success: false, message: 'Pair failed, try again: ' + e.message };
    }
  }

  return { success: true, message: 'Bot connected / waiting', code: null };
}

module.exports = { startBot, activeSockets };
