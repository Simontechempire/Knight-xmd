// KNIGHT XMD - Connection - Fixed with SIMON MD Engine
const { 
  default: makeWASocket, 
  useMultiFileAuthState, 
  DisconnectReason, 
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  Browsers 
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs-extra');
const path = require('path');
const config = require('../config');
const { handleMessage } = require('./handler');

const activeSockets = {};
const sessionsDir = path.join(__dirname, '..', 'sessions');
fs.ensureDirSync(sessionsDir);

if (!global.db) global.db = { users: {}, groups: {}, settings: {}, warnings: {}, anti: {}, banned: [] };
if (!global.db.banned) global.db.banned = [];
if (!global.db.warnings) global.db.warnings = {};
if (!global.db.anti) global.db.anti = {};
if (!global.db.settings) global.db.settings = {};
if (!global.botStart) global.botStart = Date.now();

// ===== ✅ ADDED: PER-SESSION ISOLATION - 20 DEVICES =====
// Each paired number = him own bot, him own owner, him own prefix, him own DB
// sessions/23480.../settings.json -> { owner: "23480...", prefix: ".", mode: "public" }
// sessions/23490.../settings.json -> { owner: "23490...", prefix: ".", mode: "public" }
// If David change him prefix to "!", na only him file go change. Yours go remain ".".

function getSessionSettingsPath(clean) {
  return path.join(sessionsDir, clean, 'settings.json');
}

function loadSessionSettings(clean) {
  try {
    const file = getSessionSettingsPath(clean);
    if (fs.existsSync(file)) {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      // Ensure owner always = paired number, no fit change
      data.owner = clean;
      if (!data.prefix) data.prefix = config.prefix || '.';
      if (!data.mode) data.mode = config.mode || 'public';
      return data;
    }
  } catch {}
  // First time pairing - create him own settings from default config
  const fresh = {
    owner: clean, // ✅ Owner = who pair
    prefix: config.prefix || '.',
    mode: config.mode || 'public',
    language: config.language || 'en',
    botName: config.botName || 'Knight XMD',
    creatorNumber: clean // ✅ For this session, creator = owner
  };
  try { fs.writeFileSync(getSessionSettingsPath(clean), JSON.stringify(fresh, null, 2)); } catch {}
  return fresh;
}

function saveSessionSettings(clean, settings) {
  try {
    settings.owner = clean; // Never allow owner change
    fs.writeFileSync(getSessionSettingsPath(clean), JSON.stringify(settings, null, 2));
  } catch {}
}

// Make am available for handler.js + other files
global.getSessionSettings = loadSessionSettings;
global.saveSessionSettings = saveSessionSettings;

// SIMON LOCK - per number
const pairingLocks = {}; // { number: { inProgress, lastCode, lastTime } }

function getLock(clean) {
  if (!pairingLocks[clean]) pairingLocks[clean] = { inProgress: false, lastCode: null, lastTime: 0 };
  return pairingLocks[clean];
}

async function startBot(number) {
  const clean = String(number).replace(/[^0-9]/g, '');
  const lock = getLock(clean);

  // FIX: If socket exists BUT not connected, delete am make we fit pair again
  if (activeSockets[clean]) {
    const old = activeSockets[clean];
    // If still waiting for code, return SAME code - no request new one
    if (old.pairingCode && lock.lastCode && Date.now() - lock.lastTime < 25000) {
      return { success: true, message: 'Use this same code, no refresh', code: lock.lastCode, alreadyConnected: true };
    }
    // If socket dead, remove am
    if (!old.user) {
      try { old.end(); } catch {}
      delete activeSockets[clean];
    } else {
      return { success: true, message: 'Already connected', code: null, alreadyConnected: true };
    }
  }

  const sessionPath = path.join(sessionsDir, clean);
  await fs.ensureDir(sessionPath);

  // ✅ ADDED: Load this session own settings - NOT global config
  const sessionSettings = loadSessionSettings(clean);

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
    // SIMON FIX 1: Safari browser
    browser: Browsers.macOS('Safari'),
    // SIMON FIX 2: Proper auth with keys store
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
    },
    markOnlineOnConnect: config.autoOnline || false,
    syncFullHistory: false,
    connectTimeoutMs: 60000,
    keepAliveIntervalMs: 10000,
    retryRequestDelayMs: 2000
  });

  activeSockets[clean] = sock;
  sock.pairingCode = null;
  // ✅ ADDED: Attach session info to socket - handler go use am
  sock.sessionOwner = clean;
  sock.sessionSettings = sessionSettings;
  sock.sessionNumber = clean;

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (u) => {
    const { connection, lastDisconnect } = u;
    if (connection === 'open') {
      console.log(`✅ Knight XMD ONLINE: ${clean} | Owner: ${clean} | Prefix: ${sessionSettings.prefix}`);
      sock.pairingCode = null;
      lock.lastCode = null;
      lock.inProgress = false;
      try {
        if (config.pfp && config.pfp.startsWith('http')) {
          await sock.updateProfilePicture(sock.user.id, { url: config.pfp }).catch(() => {});
        }
        // ✅ ADDED: Use session prefix for status, not global
        await sock.updateProfileStatus(`⚔️ Knight XMD | By ${config.creatorName} | Prefix ${sessionSettings.prefix} | Type ${sessionSettings.prefix}menu`).catch(() => {});
      } catch {}
    }
    if (connection === 'close') {
      delete activeSockets[clean];
      const code = lastDisconnect?.error?.output?.statusCode;
      console.log(`[KNIGHT ${clean}] Closed:`, code);
      // SIMON FIX: Don't auto-reconnect if logged out / bad session
      if ([DisconnectReason.loggedOut, 401, 440, 405].includes(code)) {
        await fs.remove(sessionPath).catch(() => {});
        lock.lastCode = null;
        console.log(`[KNIGHT ${clean}] Logged out - session cleared, get new code`);
      } else if (code !== DisconnectReason.loggedOut) {
        console.log(`Reconnecting ${clean} in 10s...`);
        setTimeout(() => startBot(clean).catch(() => {}), 10000);
      }
    }
  });

  sock.ev.on('messages.upsert', async (up) => {
    try {
      // ✅ ADDED: Use session settings for autoView, not global.db
      // Reload each time so if owner change him own prefix/mode, e go reflect immediately
      const liveSettings = loadSessionSettings(clean);
      sock.sessionSettings = liveSettings;

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
      // ✅ ADDED: Pass sessionSettings to handler - 4th argument
      await handleMessage(sock, up, clean, liveSettings);
    } catch (e) { console.log('[UP ERROR]', e.message); }
  });

  sock.ev.on('messages.update', async (updates) => {
    try {
      for (const u of updates) {
        if (u.update?.message === null && global.db.anti?.[u.key.remoteJid]?.antidelete) {
          console.log(`[ANTI-DELETE] Deleted in ${u.key.remoteJid}`);
        }
      }
    } catch {}
  });

  // ========== PAIRING - SIMON LOCK ==========
  if (!state.creds.registered) {
    // Return same code if we just generated one < 25 sec ago
    if (lock.lastCode && Date.now() - lock.lastTime < 25000) {
      sock.pairingCode = lock.lastCode;
      return { success: true, code: lock.lastCode, message: 'Use this same code, no refresh' };
    }
    if (lock.inProgress) {
      return { success: false, message: 'Code already generating, wait 5 sec and refresh' };
    }
    lock.inProgress = true;
    try {
      await new Promise(r => setTimeout(r, 2000));
      const code = await sock.requestPairingCode(clean);
      sock.pairingCode = code;
      lock.lastCode = code;
      lock.lastTime = Date.now();
      console.log(`[PAIR] ${clean} => ${code}`);
      return { success: true, code, message: 'Enter this code in WhatsApp > Linked Devices > Link with code' };
    } catch (e) {
      console.log('Pair error', e.message);
      delete activeSockets[clean];
      return { success: false, message: 'Pair failed, try again: ' + e.message };
    } finally {
      lock.inProgress = false;
    }
  }

  return { success: true, message: 'Bot connected / waiting', code: null };
}

module.exports = { startBot, activeSockets, loadSessionSettings, saveSessionSettings };
