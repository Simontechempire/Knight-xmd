// KNIGHT XMD - Main Handler - Connected to group.js + anti.js + auto.js + Multi-Owner
// Creator = controls ALL bots, no cap
// Owner = person wey link THIS bot only
const fs = require('fs');
const path = require('path');
const config = require('../config');

if (!global.db) global.db = {};
if (!global.db.banned) global.db.banned = [];
if (!global.db.warnings) global.db.warnings = {};
if (!global.db.settings) global.db.settings = { mode: config.mode, prefix: config.prefix, language: config.language };
if (!global.db.anti) global.db.anti = {};
if (!global.botStart) global.botStart = Date.now();

const DB_PATH = path.join(__dirname, '..', 'database.json');
function loadDB() {
  try {
    if (fs.existsSync(DB_PATH)) {
      const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
      global.db = { ...global.db, ...data };
      if (!global.db.banned) global.db.banned = [];
      if (!global.db.warnings) global.db.warnings = {};
      if (!global.db.settings) global.db.settings = {};
      if (!global.db.anti) global.db.anti = {};
      if (global.db.settings.mode) config.mode = global.db.settings.mode;
      if (global.db.settings.prefix) config.prefix = global.db.settings.prefix;
      if (global.db.settings.language) config.language = global.db.settings.language;
    }
  } catch (e) { console.log('DB load failed:', e.message); }
}
function saveDB() {
  try { fs.writeFileSync(DB_PATH, JSON.stringify(global.db, null, 2)); } catch {}
}
global.dbSave = saveDB;
loadDB();

let plugins = [];
function loadPlugins() {
  plugins = [];
  const dir = path.join(__dirname, '..', 'plugins');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));
  for (const f of files) {
    try {
      delete require.cache[require.resolve(path.join(dir, f))];
      const p = require(path.join(dir, f));
      if (Array.isArray(p)) plugins.push(...p);
      else plugins.push(p);
    } catch (e) { console.log('Plugin fail', f, e.message); }
  }
  console.log(`📦 Loaded ${plugins.length} commands from ${files.length} plugin files`);
}
loadPlugins();

// ===== ANTI + AUTO HANDLER INSIDE - CONNECTED =====
let antiPlugin = null;
try { antiPlugin = require('../plugins/anti'); } catch (e) { console.log('Anti plugin not loaded:', e.message); }
let autoPlugin = null;
try { autoPlugin = require('../plugins/auto'); } catch (e) { console.log('Auto plugin not loaded:', e.message); }

const tiny = (t) => {
  const map = { a:'ᴀ', b:'ʙ', c:'ᴄ', d:'ᴅ', e:'ᴇ', f:'ꜰ', g:'ɢ', h:'ʜ', i:'ɪ', j:'ᴊ', k:'ᴋ', l:'ʟ', m:'ᴍ', n:'ɴ', o:'ᴏ', p:'ᴘ', q:'ǫ', r:'ʀ', s:'ꜱ', t:'ᴛ', u:'ᴜ', v:'ᴠ', w:'ᴡ', x:'x', y:'ʏ', z:'ᴢ', '0':'0','1':'1','2':'2','3':'3','4':'4','5':'5','6':'6','7':'7','8':'8','9':'9' };
  return String(t).toLowerCase().split('').map(c => map[c] || c).join('');
};

function formatRuntime(ms) {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60), sec = s % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

function box(title, lines) {
  let t = `> ╭══〘 ${title} 〙══⊷❍\n> ┃✯╭──────────────\n`;
  lines.forEach(l => t += `> ┃✯│ ${l}\n`);
  t += `> ┃✯╰───────────────\n> ╰═══════════════════⊷❍`;
  return t;
}

const cleanNum = (jid) => (jid || '').split('@')[0].split(':')[0].replace(/[^0-9]/g, '');

async function handleMessage(sock, up, botNumber) {
  const m = up.messages[0];
  if (!m.message) return;

  const from = m.key.remoteJid;
  const isGroup = from.endsWith('@g.us');
  const sender = isGroup ? m.key.participant : from;
  if (!sender && !m.key.fromMe) return;

  const botNum = cleanNum(botNumber || sock.user?.id || '');
  const botJid = sock.user ? cleanNum(sock.user.id) + '@s.whatsapp.net' : '';
  const sockUserRaw = sock.user?.id || '';

  let senderNum = cleanNum(sender);
  if (m.key.fromMe) senderNum = botNum;

  // ===== OWNER LOGIC - CONNECTED =====
  const CREATOR = cleanNum(config.creatorNumber || config.creator || "2348071569915");
  const SESSION_OWNER = botNum;

  const isCreator = senderNum === CREATOR;
  const isSessionOwner = senderNum === SESSION_OWNER && SESSION_OWNER !== "";
  const isOwner = isCreator || isSessionOwner;

  if (m.key.fromMe && !isOwner) return;

  const msg = m.message;
  const type = Object.keys(msg)[0];
  const body = msg.conversation || msg.extendedTextMessage?.text || msg.imageMessage?.caption || msg.videoMessage?.caption || msg.viewOnceMessageV2?.message?.imageMessage?.caption || msg.viewOnceMessageV2?.message?.videoMessage?.caption || '';
  const quoted = msg.extendedTextMessage?.contextInfo?.quotedMessage;

  // ===== AUTO HANDLER INSIDE - REPLACES OLD autoRead/autoTyping/autoRecording BLOCK =====
  // This one handle: autoRead, autoTyping, autoRecording, autoOnline, autoReact, autoReply, autoSticker
  if (autoPlugin?.handleAuto) {
    try { await autoPlugin.handleAuto(sock, m, { from, body, type, msg, isGroup, prefix: config.prefix }); } catch (e) { console.log('Auto error', e.message); }
  }

  let groupMeta = null;
  let isAdmin = false;
  let isBotAdmin = false;
  if (isGroup) {
    try {
      groupMeta = await sock.groupMetadata(from);
      const senderPart = groupMeta.participants.find(p => {
        if (cleanNum(p.id) === senderNum) return true;
        if (p.id === sender) return true;
        if (p.pn && cleanNum(p.pn) === senderNum) return true;
        return false;
      });
      isAdmin = !!senderPart?.admin;

      const botPart = groupMeta.participants.find(p => {
        if (cleanNum(p.id) === botNum) return true;
        if (p.id === sockUserRaw) return true;
        if (p.id === botJid) return true;
        if (p.pn && cleanNum(p.pn) === botNum) return true;
        if (cleanNum(p.pn || '') === botNum) return true;
        return false;
      });
      isBotAdmin = !!botPart?.admin;
    } catch {}
  }

  // ===== ANTI HANDLER INSIDE =====
  if (isGroup && antiPlugin?.cacheMessage) {
    try { antiPlugin.cacheMessage(from, m, body, type); } catch {}
  }
  if (isGroup && antiPlugin?.handleAnti) {
    try {
      const blocked = await antiPlugin.handleAnti(sock, m, {
        from, sender: sender || botJid, senderNum,
        isGroup, isOwner, isAdmin, isBotAdmin,
        body, type, msg
      });
      if (blocked) return;
    } catch (e) { console.log('Anti error', e.message); }
  }
  // ===== END ANTI HANDLER =====

  if (global.db.banned.includes(senderNum)) {
    if (!isOwner) {
      if (body.startsWith(config.prefix)) {
        await sock.sendMessage(from, { text: '🚫 You are banned from using Knight XMD.\nContact owner: wa.me/' + CREATOR }, { quoted: m });
      }
      return;
    }
  }

  // If no be command, stop here - autoReply + autoSticker don already run for handleAuto above
  if (!body.startsWith(config.prefix)) return;

  const args = body.slice(config.prefix.length).trim().split(/\s+/);
  const cmdName = args.shift().toLowerCase();
  const text = args.join(' ');

  const plugin = plugins.find(p => {
    if (!p.command) return false;
    if (Array.isArray(p.command)) return p.command.includes(cmdName);
    return p.command === cmdName;
  });
  if (!plugin) return;

  // ========== MODE CHECK ==========
  if (config.mode === 'private' && !isOwner) return;
  if (config.mode === 'self' && !isOwner) return;

  // ========== PERMISSION CHECK - CONNECTED TO group.js ==========
  if (plugin.ownerOnly && !isOwner) return;
  if (plugin.creatorOnly && !isCreator) return;

  if (plugin.adminOnly) {
    if (!isGroup) return;
    if (!isAdmin && !isOwner) return;
  }

  if (plugin.botAdminOnly && !isBotAdmin) {
    return sock.sendMessage(from, { text: `❌ Bot must be admin to do this. Make bot admin first.` }, { quoted: m });
  }

  if (plugin.groupOnly && !isGroup) return;

  const ctx = {
    sock, m, from, sender: sender || botJid, senderNum,
    botNumber: botNum, botJid,
    isGroup, isOwner, isCreator, isSessionOwner,
    isAdmin, isBotAdmin,
    groupMetadata: groupMeta,
    groupMeta,
    args, text, body, quoted, type,
    tiny, config, prefix: config.prefix,
    command: cmdName,
    runtime: formatRuntime,
    box,
    reply: async (txt, opts = {}) => {
      if (typeof txt !== 'string') txt = String(txt);
      return sock.sendMessage(from, { text: txt, mentions: opts.mentions || [] }, { quoted: m });
    },
    replyImage: async (url, caption) => {
      try { return sock.sendMessage(from, { image: { url }, caption }, { quoted: m }); }
      catch { return sock.sendMessage(from, { text: caption }, { quoted: m }); }
    }
  };

  try {
    console.log(`[CMD] ${senderNum} -> ${config.prefix}${cmdName} | Owner:${isOwner} Creator:${isCreator} SessionOwner:${isSessionOwner} Bot:${botNum} isAdmin:${isAdmin} isBotAdmin:${isBotAdmin}`);
    await plugin.run(ctx);
  } catch (e) {
    console.log('CMD error', cmdName, e.message);
    await sock.sendMessage(from, { text: `❌ Error: ${e.message}` }, { quoted: m });
  }
}

// ===== ANTI-DELETE + AUTO-STATUS LISTENER - for connection.js =====
function setupAntiDelete(sock) {
  try {
    sock.ev.on('messages.update', async (updates) => {
      try {
        if (!antiPlugin?.handleDelete) return;
        for (const u of updates) {
          if (u.update?.message === null) await antiPlugin.handleDelete(sock, u);
        }
      } catch {}
    });
  } catch {}
}

function setupAuto(sock) {
  try {
    if (autoPlugin?.restoreAuto) autoPlugin.restoreAuto(sock);
  } catch {}
}

// One call for connection.js - setup both
function setupHandlers(sock) {
  setupAntiDelete(sock);
  setupAuto(sock);
}

module.exports = { handleMessage, loadPlugins, setupAntiDelete, setupAuto, setupHandlers, plugins: () => plugins, antiPlugin, autoPlugin };
