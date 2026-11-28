// KNIGHT XMD - Connection - Fixed with SIMON MD Engine + ANTI WIRED
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
const anti = require('../plugins/anti.js');
// FIX 1: Correct file - was antigcstatusmention.js (old, never deleted)
const gcStatus = require('../plugins/gcstatusdelete.js');

const activeSockets = {};
const sessionsDir = path.join(__dirname, '..', 'sessions');
fs.ensureDirSync(sessionsDir);

if (!global.db) global.db = { users: {}, groups: {}, settings: {}, warnings: {}, anti: {}, banned: [] };
if (!global.db.banned) global.db.banned = [];
if (!global.db.warnings) global.db.warnings = {};
if (!global.db.anti) global.db.anti = {};
if (!global.db.settings) global.db.settings = {};
if (!global.botStart) global.botStart = Date.now();

function getSessionSettingsPath(clean) {
  return path.join(sessionsDir, clean, 'settings.json');
}

function loadSessionSettings(clean) {
  try {
    const file = getSessionSettingsPath(clean);
    if (fs.existsSync(file)) {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      data.owner = clean;
      if (!data.prefix) data.prefix = config.prefix || '.';
      if (!data.mode) data.mode = config.mode || 'public';
      return data;
    }
  } catch {}
  const fresh = {
    owner: clean,
    prefix: config.prefix || '.',
    mode: config.mode || 'public',
    language: config.language || 'en',
    botName: config.botName || 'Knight XMD',
    creatorNumber: clean
  };
  try { fs.writeFileSync(getSessionSettingsPath(clean), JSON.stringify(fresh, null, 2)); } catch {}
  return fresh;
}

function saveSessionSettings(clean, settings) {
  try {
    settings.owner = clean;
    fs.writeFileSync(getSessionSettingsPath(clean), JSON.stringify(settings, null, 2));
  } catch {}
}

global.getSessionSettings = loadSessionSettings;
global.saveSessionSettings = saveSessionSettings;

const pairingLocks = {};

function getLock(clean) {
  if (!pairingLocks[clean]) pairingLocks[clean] = { inProgress: false, lastCode: null, lastTime: 0 };
  return pairingLocks[clean];
}

async function startBot(number) {
  const clean = String(number).replace(/[^0-9]/g, '');
  const lock = getLock(clean);

  if (activeSockets[clean]) {
    const old = activeSockets[clean];
    if (old.user) {
      return { success: true, message: 'Already connected', code: null, alreadyConnected: true };
    }
    try { old.end(); } catch {}
    delete activeSockets[clean];
    lock.lastCode = null;
    lock.lastTime = 0;
    lock.inProgress = false;
  }

  const sessionPath = path.join(sessionsDir, clean);
  await fs.ensureDir(sessionPath);
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
    browser: Browsers.macOS('Safari'),
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
        await sock.updateProfileStatus(`⚔️ Knight XMD | By ${config.creatorName} | Prefix ${sessionSettings.prefix} | Type ${sessionSettings.prefix}menu`).catch(() => {});
      } catch {}
    }
    if (connection === 'close') {
      delete activeSockets[clean];
      lock.lastCode = null;
      lock.lastTime = 0;
      lock.inProgress = false;
      sock.pairingCode = null;
      const code = lastDisconnect?.error?.output?.statusCode;
      console.log(`[KNIGHT ${clean}] Closed:`, code);
      if ([DisconnectReason.loggedOut, 401, 440, 405].includes(code)) {
        await fs.remove(sessionPath).catch(() => {});
        console.log(`[KNIGHT ${clean}] Logged out - session cleared, get new code`);
      } else if (code !== DisconnectReason.loggedOut) {
        console.log(`Reconnecting ${clean} in 10s...`);
        setTimeout(() => startBot(clean).catch(() => {}), 10000);
      }
    }
  });

  // ===== ANTI - FIXED: Cache + Check BEFORE handler =====
  sock.ev.on('messages.upsert', async (up) => {
    try {
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

      // ===== FIX 2: GCSTATUS INSTANT DELETE - FIRST, BEFORE ANTI, BEFORE HANDLER =====
      // If this fails, it will NOT crash - try/catch inside, bot continues
      for (const m of up.messages) {
        try {
          if (!m?.message) continue;
          const from = m.key.remoteJid;
          if (!from?.endsWith('@g.us')) continue;
          const blocked = await gcStatus.handleGroupStatus(sock, m, from);
          if (blocked) {
            up.messages = up.messages.filter(x => x.key.id !== m.key.id);
          }
        } catch (e) { console.log('[GCSTATUS UPSERT]', e.message); }
      }

      // ANTI: Run for every message in group, before commands
      for (const m of up.messages) {
        try {
          if (!m.message) continue;
          const from = m.key.remoteJid;
          if (!from?.endsWith('@g.us')) continue;
          const type = Object.keys(m.message)[0] || '';
          const body = m.message?.conversation || m.message?.extendedTextMessage?.text || m.message?.imageMessage?.caption || m.message?.videoMessage?.caption || m.message?.documentMessage?.caption || '';
          await anti.cacheMessage(sock, from, m, body, type);
          const blocked = await anti.handleAnti(sock, m, { from, body, type });
          if (blocked) {
            // Remove this message from up.messages so handler does not process it
            up.messages = up.messages.filter(x => x.key.id !== m.key.id);
          }
        } catch (e) { console.log('[ANTI UPSERT]', e.message); }
      }
      if (up.messages.length) await handleMessage(sock, up, clean, liveSettings);
    } catch (e) { console.log('[UP ERROR]', e.message); }
  });

  // ===== ANTI-DELETE - FIXED: Was only console.log, now really recovers =====
  sock.ev.on('messages.update', async (updates) => {
    try {
      for (const u of updates) {
        if (u.update?.message === null) {
          await anti.handleDelete(sock, u);
        }
      }
    } catch (e) { console.log('[ANTI DELETE]', e.message); }
  });

  // ===== ANTI-FAKE ON JOIN - FIXED: Was missing completely =====
  sock.ev.on('group-participants.update', async (update) => {
    try {
      await anti.handleParticipantUpdate(sock, update);
    } catch (e) { console.log('[ANTI JOIN]', e.message); }
  });

  if (!state.creds.registered) {
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
