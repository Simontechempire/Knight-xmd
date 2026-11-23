// KNIGHT XMD - Main Handler - Fixed + Connects ALL Plugins
// By Faceless Tech
const fs = require('fs');
const path = require('path');
const config = require('../config');

// ========== GLOBAL DB + SAVE ==========
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
      // Apply saved settings - restart no go reset mode/prefix
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

// ========== LOAD PLUGINS ==========
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

// ========== HELPERS ==========
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

async function handleMessage(sock, up, botNumber) {
  const m = up.messages[0];
  if (!m.message) return;
  if (m.key.fromMe) return; // FIXED: no reply to self, else loop

  const from = m.key.remoteJid;
  const isGroup = from.endsWith('@g.us');
  const sender = isGroup ? m.key.participant : from;
  if (!sender) return;
  const senderNum = sender.split('@')[0];
  const botJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
  const botNum = botNumber || sock.user.id.split(':')[0];

  // FIXED: Owner = bot number OR creator number. Before, only bot number was owner, creator fit get blocked.
  const isOwner = senderNum === botNum || senderNum === config.creatorNumber;
  const isCreator = senderNum === config.creatorNumber;

  // Body - FIXED: also handle viewOnce, sticker caption etc
  const msg = m.message;
  const type = Object.keys(msg)[0];
  const body = msg.conversation || msg.extendedTextMessage?.text || msg.imageMessage?.caption || msg.videoMessage?.caption || msg.viewOnceMessageV2?.message?.imageMessage?.caption || msg.viewOnceMessageV2?.message?.videoMessage?.caption || '';
  const quoted = msg.extendedTextMessage?.contextInfo?.quotedMessage;

  // Auto Read / Typing
  try {
    if (global.db.settings?.autoRead) await sock.readMessages([m.key]);
    if (global.db.settings?.autoTyping && body.startsWith(config.prefix)) await sock.sendPresenceUpdate('composing', from);
    if (global.db.settings?.autoRecording && body.startsWith(config.prefix)) await sock.sendPresenceUpdate('recording', from);
  } catch {}

  // ========== GROUP METADATA - FETCH ONCE, REUSE ==========
  let groupMeta = null;
  let isAdmin = false;
  let isBotAdmin = false;
  if (isGroup) {
    try {
      groupMeta = await sock.groupMetadata(from);
      isAdmin = !!groupMeta.participants.find(p => p.id === sender)?.admin;
      // FIXED: Before isBotAdmin was always true. Now real check.
      isBotAdmin = !!groupMeta.participants.find(p => p.id === botJid || p.id.split('@')[0] === botNum)?.admin;
    } catch {}
  }

  // ========== ANTI FEATURES - BEFORE COMMAND ==========
  if (isGroup && !isOwner && !isCreator && !isAdmin) {
    const gAnti = global.db.anti?.[from] || {};
    const textLower = body.toLowerCase();

    // AntiLink - FIXED: allow admin + owner, allow bot own messages
    if (gAnti.antilink && /(https?:\/\/|wa\.me\/|chat\.whatsapp\.com|t\.me\/|instagram\.com)/i.test(body)) {
      try {
        await sock.sendMessage(from, { delete: m.key });
        await sock.sendMessage(from, { text: box('⚠️ ANTI-LINK', [`@${senderNum} link not allowed`, 'Message deleted']), mentions: [sender] });
      } catch {}
      return;
    }
    // AntiBadword
    const bad = ['fuck','shit','bitch','sex','porn','dick','pussy'];
    if (gAnti.antibadword && bad.some(w => textLower.includes(w))) {
      try {
        await sock.sendMessage(from, { delete: m.key });
        await sock.sendMessage(from, { text: `🚫 Bad word deleted @${senderNum}`, mentions: [sender] });
      } catch {}
      return;
    }
    // AntiSticker
    if (gAnti.antisticker && type === 'stickerMessage') {
      try { await sock.sendMessage(from, { delete: m.key }); } catch {}
      return;
    }
    // AntiFake - FIXED: before e go kick everybody wey no be 234, even if group no set am well. Now check if anti ON + allow list from DB
    if (gAnti.antifake) {
      const allowed = gAnti.antifakeCodes || ['234'];
      if (!allowed.some(p => senderNum.startsWith(p))) {
        try { await sock.groupParticipantsUpdate(from, [sender], 'remove'); } catch {}
        return;
      }
    }
    // AntiSpam - NEW: 5 messages in 10 sec = warn
    if (gAnti.antispam) {
      if (!global.spamMap) global.spamMap = {};
      const key = from + sender;
      const now = Date.now();
      if (!global.spamMap[key]) global.spamMap[key] = [];
      global.spamMap[key] = global.spamMap[key].filter(t => now - t < 10000);
      global.spamMap[key].push(now);
      if (global.spamMap[key].length > 5) {
        try { await sock.sendMessage(from, { delete: m.key }); } catch {}
        return;
      }
    }
  }

  // ========== BANNED CHECK - NEW, BEFORE COMMAND ==========
  if (global.db.banned.includes(senderNum)) {
    // Owner/Creator can never be banned
    if (!isOwner) {
      if (body.startsWith(config.prefix)) {
        await sock.sendMessage(from, { text: '🚫 You are banned from using Knight XMD.\nContact owner: wa.me/' + config.creatorNumber }, { quoted: m });
      }
      return;
    }
  }

  // ========== MUST START WITH PREFIX ==========
  if (!body.startsWith(config.prefix)) {
    // AutoReply - FIXED: before e dey reply every DM message, even Hi. Now only once per 30s to avoid spam loop
    if (global.db.settings?.autoReply && !isGroup) {
      const last = global.lastAutoReply?.[from] || 0;
      if (Date.now() - last > 30000) {
        if (!global.lastAutoReply) global.lastAutoReply = {};
        global.lastAutoReply[from] = Date.now();
        await sock.sendMessage(from, { text: `👋 Hi! I am Knight XMD. Type ${config.prefix}menu for commands.` });
      }
    }
    // AutoSticker - FIXED: actually do am, before e do nothing
    if (global.db.settings?.autoSticker && (type === 'imageMessage' || type === 'videoMessage')) {
      try {
        const { Sticker, StickerTypes } = require('wa-sticker-formatter');
        const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
        const media = msg.imageMessage || msg.videoMessage;
        const mType = msg.imageMessage ? 'image' : 'video';
        if (mType === 'video' && media.seconds > 10) return;
        const stream = await downloadContentFromMessage(media, mType);
        let buf = Buffer.from([]); for await (const c of stream) buf = Buffer.concat([buf, c]);
        const st = new Sticker(buf, { pack: 'Knight XMD', author: 'Faceless Tech', type: StickerTypes.FULL, quality: 70 });
        await sock.sendMessage(from, await st.toMessage(), { quoted: m });
      } catch {}
    }
    return;
  }

  const args = body.slice(config.prefix.length).trim().split(/\s+/);
  const cmdName = args.shift().toLowerCase();
  const text = args.join(' ');

  // Find plugin - FIXED: support string command too, not only array
  const plugin = plugins.find(p => {
    if (!p.command) return false;
    if (Array.isArray(p.command)) return p.command.includes(cmdName);
    return p.command === cmdName;
  });
  if (!plugin) return;

  // ========== MODE CHECK - NEW ==========
  if (config.mode === 'private' && !isOwner && !plugin.ownerOnly) {
    return sock.sendMessage(from, { text: '🔒 Bot is in PRIVATE mode - Only owner can use it.' }, { quoted: m });
  }
  if (config.mode === 'self' && senderNum !== botNum) {
    return sock.sendMessage(from, { text: '👤 Bot is in SELF mode - Only bot number can use it.' }, { quoted: m });
  }

  // Permission check
  if (plugin.ownerOnly && !isOwner && !isCreator) return sock.sendMessage(from, { text: `❌ Only owner can use this.` }, { quoted: m });
  if (plugin.creatorOnly && !isCreator) return sock.sendMessage(from, { text: `❌ Only Creator (Faceless Tech) can use this.` }, { quoted: m });
  if (plugin.adminOnly) {
    if (!isGroup) return sock.sendMessage(from, { text: `❌ This command only works in a group.` }, { quoted: m });
    if (!isAdmin && !isOwner) return sock.sendMessage(from, { text: `❌ Admin only.` }, { quoted: m });
    // FIXED: Tell user if bot no be admin, before plugin try and fail with ugly error
    if (!isBotAdmin) return sock.sendMessage(from, { text: `❌ Bot must be admin to do this. Make bot admin first.` }, { quoted: m });
  }

  // ========== CTX - CONNECTS ALL PLUGINS ==========
  const ctx = {
    sock, m, from, sender, senderNum,
    botNumber: botNum, botJid,
    isGroup, isOwner, isCreator,
    isAdmin, isBotAdmin, // NEW - moderator/group need am
    groupMetadata: groupMeta, // NEW - group.js need am
    groupMeta,
    args, text, body, quoted, type,
    tiny, config, prefix: config.prefix,
    command: cmdName, // NEW - fun.js .howfine etc need am
    runtime: formatRuntime, // NEW - owner.js .alive/.runtime need am
    box, // NEW - all plugins fit use box()
    // FIXED: reply now support mentions + any opts, and replyImage fallback if PFP die
    reply: async (txt, opts = {}) => {
      if (typeof txt !== 'string') txt = String(txt);
      return sock.sendMessage(from, { text: txt, mentions: opts.mentions || [] }, { quoted: m });
    },
    replyImage: async (url, caption) => {
      try {
        return sock.sendMessage(from, { image: { url }, caption }, { quoted: m });
      } catch {
        return sock.sendMessage(from, { text: caption }, { quoted: m });
      }
    }
  };

  try {
    console.log(`[CMD] ${senderNum} -> ${config.prefix}${cmdName} ${text.slice(0, 30)}`);
    await plugin.run(ctx);
  } catch (e) {
    console.log('CMD error', cmdName, e.message);
    await sock.sendMessage(from, { text: `❌ Error: ${e.message}` }, { quoted: m });
  }
}

module.exports = { handleMessage, loadPlugins, plugins: () => plugins };
