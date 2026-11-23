// KNIGHT XMD - Main Handler - FIXED LID + BotAdmin - Connected to group.js + anti.js + auto.js + moderator.js + Multi-Owner
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

// ===== LID FIX - Find participant by id / pn / lid =====
function findParticipant(meta, jid) {
  if (!meta || !jid) return null;
  const c = cleanNum(jid);
  return meta.participants.find(p => {
    if (p.id === jid) return true;
    if (cleanNum(p.id) === c) return true;
    if (p.pn && cleanNum(p.pn) === c) return true;
    if (p.pn === jid) return true;
    if (p.lid && cleanNum(p.lid) === c) return true;
    if (p.lid === jid) return true;
    return false;
  });
}
// Get real phone number from participant (pn > id if na real number)
function realNumFromParticipant(p, fallbackJid) {
  if (!p) return cleanNum(fallbackJid);
  if (p.pn && cleanNum(p.pn).length >= 10 && cleanNum(p.pn).startsWith('234')) return cleanNum(p.pn);
  if (p.pn && cleanNum(p.pn).length >= 7) return cleanNum(p.pn);
  // If p.id na s.whatsapp.net, na real number
  if (p.id && p.id.endsWith('@s.whatsapp.net')) return cleanNum(p.id);
  return cleanNum(fallbackJid);
}

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
  const botLid = sock.user?.lid || '';

  let senderNum = cleanNum(sender);
  if (m.key.fromMe) senderNum = botNum;

  const CREATOR = cleanNum(config.creatorNumber || config.creator || "2348071569915");

  const msg = m.message;
  const type = Object.keys(msg)[0];
  const body = msg.conversation || msg.extendedTextMessage?.text || msg.imageMessage?.caption || msg.videoMessage?.caption || msg.viewOnceMessageV2?.message?.imageMessage?.caption || msg.viewOnceMessageV2?.message?.videoMessage?.caption || '';
  const quoted = msg.extendedTextMessage?.contextInfo?.quotedMessage;

  if (autoPlugin?.handleAuto) {
    try { await autoPlugin.handleAuto(sock, m, { from, body, type, msg, isGroup, prefix: config.prefix }); } catch (e) { console.log('Auto error', e.message); }
  }

  // ===== GROUP META FIRST - so we fit resolve LID to real number BEFORE owner/admin check =====
  let groupMeta = null;
  let isAdmin = false;
  let isBotAdmin = false;
  if (isGroup) {
    try {
      groupMeta = await sock.groupMetadata(from);
      // Resolve sender real number via pn
      const senderPartEarly = findParticipant(groupMeta, sender);
      if (senderPartEarly) {
        const real = realNumFromParticipant(senderPartEarly, sender);
        // Only replace if real look like phone (not LID short)
        if (real && real.length >= 7) senderNum = real;
      }
      if (m.key.fromMe) senderNum = botNum;

      // ===== ADMIN CHECK - LID FIX =====
      const senderPart = findParticipant(groupMeta, sender) || senderPartEarly;
      isAdmin = !!senderPart?.admin;

      // ===== BOT ADMIN CHECK - LID FIX - THIS NA THE BUG =====
      const botIds = [botNum, cleanNum(sockUserRaw), cleanNum(botJid), cleanNum(botLid), sockUserRaw, botLid, botJid];
      const botPart = groupMeta.participants.find(p => {
        if (botIds.includes(cleanNum(p.id))) return true;
        if (botIds.includes(p.id)) return true;
        if (p.pn && botIds.includes(cleanNum(p.pn))) return true;
        if (p.pn && botIds.includes(p.pn)) return true;
        if (p.lid && botIds.includes(cleanNum(p.lid))) return true;
        if (p.lid && botIds.includes(p.lid)) return true;
        return false;
      });
      isBotAdmin = !!botPart?.admin;
      if (!isBotAdmin) console.log('[BOTADMIN DEBUG] botNum:', botNum, '| sockUser:', sockUserRaw, '| lid:', botLid, '| botPart found:', !!botPart, '| botPart admin:', botPart?.admin);
    } catch (e) { console.log('GroupMeta fail', e.message); }
  }

  // ===== OWNER LOGIC - AFTER LID resolve =====
  const SESSION_OWNER = botNum;
  const isCreator = senderNum === CREATOR;
  const isSessionOwner = senderNum === SESSION_OWNER && SESSION_OWNER !== "";
  const isOwner = isCreator || isSessionOwner;

  if (m.key.fromMe && !isOwner) return;

  // ===== ANTI HANDLER =====
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

  if (global.db.banned.includes(senderNum)) {
    if (!isOwner) {
      if (body.startsWith(config.prefix)) {
        await sock.sendMessage(from, { text: '🚫 You are banned from using Knight XMD.\nContact owner: wa.me/' + CREATOR }, { quoted: m });
      }
      return;
    }
  }

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

  if (config.mode === 'private' && !isOwner) return;
  if (config.mode === 'self' && !isOwner) return;

  if (plugin.ownerOnly && !isOwner) return;
  if (plugin.creatorOnly && !isCreator) return;

  if (plugin.adminOnly) {
    if (!isGroup) return;
    if (!isAdmin && !isOwner) {
      return sock.sendMessage(from, { text: `❌ Only group admins can use this.` }, { quoted: m });
    }
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
  try { if (autoPlugin?.restoreAuto) autoPlugin.restoreAuto(sock); } catch {}
}

function setupHandlers(sock) {
  setupAntiDelete(sock);
  setupAuto(sock);
}

module.exports = { handleMessage, loadPlugins, setupAntiDelete, setupAuto, setupHandlers, plugins: () => plugins, antiPlugin, autoPlugin };
