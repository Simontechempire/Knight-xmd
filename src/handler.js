// Knight XMD message handler - FIXED: No global.db swap, Cached DB, More message types
const fs = require('fs');
const path = require('path');
const config = require('../config');

if (!global.db) global.db = {};
if (!Array.isArray(global.db.banned)) global.db.banned = [];
if (!global.db.warnings) global.db.warnings = {};
if (!global.db.settings) global.db.settings = {};
if (!global.db.anti) global.db.anti = {};
if (!global.botStart) global.botStart = Date.now();

// ===== FIX 1: Cache session DB in memory - no file read per message =====
const sessionDBCache = new Map();
function getSessionDBPath(botNum) {
  return path.join(__dirname, '..', 'sessions', String(botNum), 'db.json');
}
function loadSessionDB(botNum) {
  const key = String(botNum);
  if (sessionDBCache.has(key)) return sessionDBCache.get(key);
  let data = { banned: [], warnings: {}, settings: {}, anti: {}, users: {}, groups: {} };
  try {
    const file = getSessionDBPath(botNum);
    if (fs.existsSync(file)) {
      const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
      data = {
        banned: Array.isArray(parsed.banned) ? parsed.banned : [],
        warnings: parsed.warnings || {},
        settings: parsed.settings || {},
        anti: parsed.anti || {},
        users: parsed.users || {},
        groups: parsed.groups || {}
      };
    }
  } catch {}
  sessionDBCache.set(key, data);
  return data;
}
let saveTimer = null;
function saveSessionDB(botNum, db) {
  // Debounce: save max once per 2 sec, not per message
  sessionDBCache.set(String(botNum), db);
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    for (const [num, d] of sessionDBCache.entries()) {
      try {
        const dir = path.dirname(getSessionDBPath(num));
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(getSessionDBPath(num), JSON.stringify(d, null, 2));
      } catch {}
    }
  }, 2000);
}

const DB_PATH = path.join(__dirname, '..', 'database.json');
function loadDB() {
  try {
    if (!fs.existsSync(DB_PATH)) return;
    const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    global.db = { ...global.db, ...data };
    if (!Array.isArray(global.db.banned)) global.db.banned = [];
    global.db.warnings ||= {};
    global.db.settings ||= {};
    global.db.anti ||= {};
  } catch (error) { console.error('[DB] Could not load database:', error.message); }
}
function saveDB() {
  try { fs.writeFileSync(DB_PATH, JSON.stringify(global.db, null, 2)); } catch (error) { console.error('[DB] Could not save database:', error.message); }
}
global.dbSave = saveDB;
loadDB();

let plugins = [];
const pluginDir = path.join(__dirname, '..', 'plugins');
function loadPlugins() {
  plugins = [];
  const files = fs.readdirSync(pluginDir).filter(file => file.endsWith('.js')).sort();
  for (const file of files) {
    const fullPath = path.join(pluginDir, file);
    try {
      delete require.cache[require.resolve(fullPath)];
      const loaded = require(fullPath);
      if (Array.isArray(loaded)) plugins.push(...loaded);
      else if (loaded && typeof loaded === 'object') plugins.push(loaded);
    } catch (error) { console.error(`[PLUGIN] Failed to load ${file}:`, error.stack || error.message); }
  }
  console.log(`[PLUGINS] Loaded ${plugins.length} commands from ${files.length} files`);
}
loadPlugins();

let antiPlugin = null;
try { antiPlugin = require('../plugins/anti'); } catch (error) { console.error('[ANTI] Plugin not loaded:', error.message); }
let autoPlugin = null;
try { autoPlugin = require('../plugins/auto'); } catch (error) { console.error('[AUTO] Plugin not loaded:', error.message); }

const cleanNum = jid => String(jid || '').split('@')[0].split(':')[0].replace(/[^0-9]/g, '');

function findParticipant(meta, jid) {
  if (!meta?.participants || !jid) return null;
  const raw = String(jid);
  const number = cleanNum(raw);
  return meta.participants.find(participant => {
    if (participant.id === raw || participant.pn === raw || participant.lid === raw) return true;
    if (!number) return false;
    return [participant.id, participant.pn].some(value => value && cleanNum(value) === number);
  }) || null;
}

function formatRuntime(milliseconds) {
  const seconds = Math.floor(milliseconds / 1000);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  if (days) return `${days}d ${hours}h ${minutes}m`;
  if (hours) return `${hours}h ${minutes}m ${remainder}s`;
  if (minutes) return `${minutes}m ${remainder}s`;
  return `${remainder}s`;
}
function box(title, lines) {
  return `> ╭══〘 ${title} 〙══⊷❍\n> ┃✯╭──────────────\n${lines.map(line => `> ┃✯│ ${line}`).join('\n')}\n> ┃✯╰───────────────\n> ╰═══════════════════⊷❍`;
}

// ===== FIX 2: Handle ALL message types - poll, reaction, viewOnce, ephemeral, etc =====
function getMessageText(message) {
  const content = message?.message;
  if (!content) return '';
  if (content.buttonsResponseMessage?.selectedButtonId) return content.buttonsResponseMessage.selectedButtonId;
  if (content.listResponseMessage?.singleSelectReply?.selectedRowId) return content.listResponseMessage.singleSelectReply.selectedRowId;
  if (content.pollUpdateMessage?.name) return content.pollUpdateMessage.name;
  if (content.reactionMessage?.text) return content.reactionMessage.text;
  // Unwrap wrappers
  let inner = content;
  if (inner.viewOnceMessage?.message) inner = inner.viewOnceMessage.message;
  if (inner.viewOnceMessageV2?.message) inner = inner.viewOnceMessageV2.message;
  if (inner.viewOnceMessageV2Extension?.message) inner = inner.viewOnceMessageV2Extension.message;
  if (inner.ephemeralMessage?.message) inner = inner.ephemeralMessage.message;
  if (inner.documentWithCaptionMessage?.message) inner = inner.documentWithCaptionMessage.message;
  const candidates = [
    inner.conversation,
    inner.extendedTextMessage?.text,
    inner.imageMessage?.caption,
    inner.videoMessage?.caption,
    inner.documentMessage?.caption,
    inner.pollCreationMessage?.name,
    inner.contactMessage?.displayName,
    inner.locationMessage?.comment,
    inner.liveLocationMessage?.caption,
    inner.stickerMessage ? '' : null,
  ];
  return candidates.find(value => typeof value === 'string' && value) || '';
}

// ===== FIX 3: Cache group metadata 30s - no fetch per message =====
const metaCache = new Map();
async function getGroupMeta(sock, from){
  const now = Date.now();
  const c = metaCache.get(from);
  if(c && now - c.time < 30000) return c.meta;
  try{
    const meta = await sock.groupMetadata(from);
    metaCache.set(from, { meta, time: now });
    return meta;
  }catch(e){ return c?.meta || null; }
}

async function handleMessage(sock, update, botNumber, sessionSettings) {
  for (const message of update?.messages || []) {
    if (!message?.message || !message.key?.remoteJid) continue;
    // Skip status - handled in connection.js
    if (message.key.remoteJid === 'status@broadcast') continue;
    // Skip own bot messages unless needed
    // if (message.key.fromMe) continue; // keep if you want self commands

    const from = message.key.remoteJid;
    const isGroup = from.endsWith('@g.us');
    const sender = isGroup ? (message.key.participant || message.key.participantPn || '') : from;
    if (!sender && !message.key.fromMe) continue;

    const botJid = sock.user?.id || '';
    const botNum = cleanNum(botNumber || botJid);
    const sess = sessionSettings || sock.sessionSettings || (global.getSessionSettings ? global.getSessionSettings(botNum) : null) || {};
    const sessionPrefix = sess.prefix || config.prefix || '.';
    const sessionMode = sess.mode || config.mode || 'public';
    const sessionOwner = cleanNum(sess.owner || sess.creatorNumber || botNum);
    const creatorNum = sessionOwner;

    // ===== FIX: NO global.db swap - use sessionDB only =====
    const sessionDB = loadSessionDB(botNum);

    let senderNum = message.key.fromMe ? botNum : cleanNum(sender);
    const body = getMessageText(message);
    const messageType = Object.keys(message.message)[0] || '';

    if (autoPlugin?.handleAuto) {
      try { await autoPlugin.handleAuto(sock, message, { from, body, type: messageType, msg: message.message, isGroup, prefix: sessionPrefix }); } catch (error) { console.error('[AUTO] Message handler failed:', error.message); }
    }

    let groupMeta = null, senderParticipant = null, isAdmin = false, isBotAdmin = false;
    if (isGroup) {
      try {
        groupMeta = await getGroupMeta(sock, from);
        senderParticipant = findParticipant(groupMeta, sender);
        if (senderParticipant?.pn) senderNum = cleanNum(senderParticipant.pn);
        else if (senderParticipant?.id?.endsWith('@s.whatsapp.net')) senderNum = cleanNum(senderParticipant.id);
        isAdmin = Boolean(senderParticipant?.admin);
        const botCandidates = [sock.user?.id, sock.user?.lid, botNumber].filter(Boolean).map(String);
        const botNumbers = botCandidates.map(cleanNum).filter(Boolean);
        const botParticipant = groupMeta?.participants?.find(p => {
          if (botCandidates.includes(p.id) || botCandidates.includes(p.pn) || botCandidates.includes(p.lid)) return true;
          return [p.id, p.pn].some(v => v && botNumbers.includes(cleanNum(v)));
        });
        isBotAdmin = Boolean(botParticipant?.admin);
      } catch (error) { console.error('[GROUP] Could not load metadata:', error.message); }
    }

    const isCreator = Boolean(creatorNum && senderNum === creatorNum);
    const isSessionOwner = Boolean(botNum && senderNum === botNum);
    const isOwner = isCreator || isSessionOwner;

    if (isGroup && antiPlugin?.cacheMessage) {
      try { await antiPlugin.cacheMessage(sock, from, message, body, messageType); } catch (error) { console.error('[ANTI-DELETE] Cache failed:', error.message); }
    }

    if (isGroup) {
      for (const p of plugins) {
        if (p.all) {
          try { await p.run({ sock, m: message, from, sender, senderNum, sessionDB, db: sessionDB, args: [], text: body, body, reply: async (content) => sock.sendMessage(from, { text: String(content) }, { quoted: message }) }); } catch (e) { console.log('[AUTO PLUGIN]', e.message); }
        }
      }
    }

    if (isGroup && antiPlugin?.handleAnti) {
      try {
        const blocked = await antiPlugin.handleAnti(sock, message, { from, sender, senderNum, isGroup, isOwner, isAdmin, isBotAdmin, body, type: messageType, msg: message.message, groupMeta });
        if (blocked) { saveSessionDB(botNum, sessionDB); continue; }
      } catch (error) { console.error('[ANTI] Message checks failed:', error.message); }
    }

    if (sessionDB.banned.includes(senderNum) && !isOwner) {
      if (body.startsWith(sessionPrefix)) {
        await sock.sendMessage(from, { text: `🚫 You are banned from using Knight XMD.\nContact owner: wa.me/${creatorNum}` }, { quoted: message });
      }
      saveSessionDB(botNum, sessionDB); continue;
    }

    const isButtonClick = Boolean(message.message?.buttonsResponseMessage?.selectedButtonId || message.message?.listResponseMessage?.singleSelectReply?.selectedRowId);
    if (!body) { saveSessionDB(botNum, sessionDB); continue; }
    if (!isButtonClick && (!sessionPrefix || !body.startsWith(sessionPrefix))) { saveSessionDB(botNum, sessionDB); continue; }

    let parts;
    if (isButtonClick) parts = body.trim().split(/\s+/).filter(Boolean);
    else parts = body.slice(sessionPrefix.length).trim().split(/\s+/).filter(Boolean);
    const commandName = parts.shift()?.toLowerCase();
    if (!commandName) { saveSessionDB(botNum, sessionDB); continue; }
    const args = parts;
    const text = args.join(' ');

    const plugin = plugins.find(candidate => {
      if (!candidate?.command) return false;
      return Array.isArray(candidate.command) ? candidate.command.includes(commandName) : candidate.command === commandName;
    });
    if (!plugin) { saveSessionDB(botNum, sessionDB); continue; }

    if ((sessionMode === 'private' || sessionMode === 'self') && !isOwner) { saveSessionDB(botNum, sessionDB); continue; }
    if (plugin.ownerOnly && !isOwner) { saveSessionDB(botNum, sessionDB); continue; }
    if (plugin.creatorOnly && !isCreator) { saveSessionDB(botNum, sessionDB); continue; }
    if (plugin.groupOnly && !isGroup) { saveSessionDB(botNum, sessionDB); continue; }
    if (plugin.adminOnly && (!isGroup || (!isAdmin && !isOwner))) {
      await sock.sendMessage(from, { text: isGroup ? '❌ Only group admins can use this command.' : '❌ This command only works in a group.' }, { quoted: message });
      saveSessionDB(botNum, sessionDB); continue;
    }

    const sessionConfig = { ...config, prefix: sessionPrefix, mode: sessionMode, creatorNumber: sessionOwner, creator: sessionOwner };
    const context = {
      sock, m: message, from, sender, senderNum, botNumber: botNum, botJid,
      isGroup, isOwner, isCreator, isSessionOwner, isAdmin, isBotAdmin,
      groupMetadata: groupMeta, groupMeta, args, text, body,
      quoted: message.message.extendedTextMessage?.contextInfo?.quotedMessage,
      type: messageType, tiny: value => String(value),
      config: sessionConfig, sessionSettings: sess, sessionDB, db: sessionDB,
      saveSession: (newSettings) => {
        const merged = { ...sess, ...newSettings, owner: sessionOwner };
        if (global.saveSessionSettings) global.saveSessionSettings(botNum, merged);
        return merged;
      },
      prefix: sessionPrefix, command: commandName, runtime: formatRuntime, box,
      reply: async (content, options = {}) => sock.sendMessage(from, { text: String(content), mentions: options.mentions || [] }, { quoted: message }),
      replyImage: async (url, caption) => sock.sendMessage(from, { image: { url }, caption }, { quoted: message })
    };
    try {
      console.log(`[CMD] [${botNum}] ${senderNum} -> ${sessionPrefix}${commandName} | owner:${isOwner} admin:${isAdmin} botAdmin:${isBotAdmin}`);
      await plugin.run(context);
    } catch (error) {
      console.error(`[CMD] ${commandName} failed:`, error.stack || error.message);
      await sock.sendMessage(from, { text: `❌ Command failed: ${error.message}` }, { quoted: message });
    }
    saveSessionDB(botNum, sessionDB);
  }
}

function setupAntiDelete(sock) {
  if (!sock?.ev || sock.__antiDeleteHandlerAttached) return;
  sock.__antiDeleteHandlerAttached = true;
  sock.ev.on('messages.update', async updates => {
    for (const update of updates || []) {
      if (update.update?.message !== null && update.update?.messageStubType !== 68) continue;
      try { await antiPlugin?.handleDelete?.(sock, update); } catch (error) { console.error('[ANTI-DELETE] Recovery failed:', error.message); }
    }
  });
}
function setupParticipantUpdates(sock) {
  if (!sock?.ev || sock.__antiParticipantHandlerAttached) return;
  sock.__antiParticipantHandlerAttached = true;
  sock.ev.on('group-participants.update', async update => {
    try { await antiPlugin?.handleParticipantUpdate?.(sock, update); } catch (error) { console.error('[ANTI-FAKE] Participant update failed:', error.message); }
  });
}
function setupHandlers(sock) {
  setupAntiDelete(sock);
  setupParticipantUpdates(sock);
  try { const wlc = require('../plugins/welcome'); if (wlc.attachEngine) wlc.attachEngine(sock); } catch {}
  try { autoPlugin?.restoreAuto?.(sock); } catch (error) { console.error('[AUTO] Could not restore automation:', error.message); }
}
module.exports = { handleMessage, loadPlugins, setupAntiDelete, setupParticipantUpdates, setupHandlers, plugins: () => plugins, antiPlugin, autoPlugin, loadSessionDB, saveSessionDB };
