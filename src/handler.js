// KNIGHT XMD - Main Handler - Fixed Multi-Owner
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

// FIX: clean number - remove :xx LID part
const cleanNum = (jid) => (jid || '').split('@')[0].split(':')[0].replace(/[^0-9]/g, '');

async function handleMessage(sock, up, botNumber) {
  const m = up.messages[0];
  if (!m.message) return;

  const from = m.key.remoteJid;
  const isGroup = from.endsWith('@g.us');
  const sender = isGroup ? m.key.participant : from;
  if (!sender) return;
  const senderNum = cleanNum(sender);

  // FIX: botNum = person wey link THIS bot (Session Owner)
  // botNumber dey come from connection.js as clean number, e.g "2349012345678" for David
  const botNum = cleanNum(botNumber || sock.user?.id || '');
  const botJid = sock.user ? cleanNum(sock.user.id) + '@s.whatsapp.net' : '';

  // ===== OWNER LOGIC - THE MAIN FIX =====
  const CREATOR = cleanNum(config.creatorNumber || config.creator || "2348071569915");
  const SESSION_OWNER = botNum; // David if David link, Ada if Ada link

  const isCreator = senderNum === CREATOR; // You - control ALL bots, no cap
  const isSessionOwner = senderNum === SESSION_OWNER && SESSION_OWNER !== ""; // Linker only for THIS bot
  const isOwner = isCreator || isSessionOwner;

  // FIX: Don't block fromMe completely.
  // If message na from bot itself (owner dey use bot number to send command), allow am if na owner/creator
  // If na from other person, fromMe go be false anyway
  const isSelfMsg = !!m.key.fromMe;
  if (isSelfMsg && !isOwner && senderNum !== botNum) return; // ignore bot own status etc
  // If isSelfMsg but sender is botNum, we continue - na owner dey use am

  const msg = m.message;
  const type = Object.keys(msg)[0];
  const body = msg.conversation || msg.extendedTextMessage?.text || msg.imageMessage?.caption || msg.videoMessage?.caption || msg.viewOnceMessageV2?.message?.imageMessage?.caption || msg.viewOnceMessageV2?.message?.videoMessage?.caption || '';
  const quoted = msg.extendedTextMessage?.contextInfo?.quotedMessage;

  try {
    if (global.db.settings?.autoRead) await sock.readMessages([m.key]);
    if (global.db.settings?.autoTyping && body.startsWith(config.prefix)) await sock.sendPresenceUpdate('composing', from);
    if (global.db.settings?.autoRecording && body.startsWith(config.prefix)) await sock.sendPresenceUpdate('recording', from);
  } catch {}

  let groupMeta = null;
  let isAdmin = false;
  let isBotAdmin = false;
  if (isGroup) {
    try {
      groupMeta = await sock.groupMetadata(from);
      isAdmin = !!groupMeta.participants.find(p => cleanNum(p.id) === senderNum)?.admin;
      isBotAdmin = !!groupMeta.participants.find(p => cleanNum(p.id) === botNum)?.admin;
    } catch {}
  }

  // ANTI FEATURES - Owner/Creator/Admin bypass
  if (isGroup && !isOwner && !isAdmin) {
    const gAnti = global.db.anti?.[from] || {};
    const textLower = body.toLowerCase();
    if (gAnti.antilink && /(https?:\/\/|wa\.me\/|chat\.whatsapp\.com|t\.me\/|instagram\.com)/i.test(body)) {
      try {
        await sock.sendMessage(from, { delete: m.key });
        await sock.sendMessage(from, { text: box('⚠️ ANTI-LINK', [`@${senderNum} link not allowed`, 'Message deleted']), mentions: [sender] });
      } catch {}
      return;
    }
    const bad = ['fuck','shit','bitch','sex','porn','dick','pussy'];
    if (gAnti.antibadword && bad.some(w => textLower.includes(w))) {
      try { await sock.sendMessage(from, { delete: m.key }); await sock.sendMessage(from, { text: `🚫 Bad word deleted @${senderNum}`, mentions: [sender] }); } catch {}
      return;
    }
    if (gAnti.antisticker && type === 'stickerMessage') {
      try { await sock.sendMessage(from, { delete: m.key }); } catch {}
      return;
    }
    if (gAnti.antifake) {
      const allowed = gAnti.antifakeCodes || ['234'];
      if (!allowed.some(p => senderNum.startsWith(p))) {
        try { await sock.groupParticipantsUpdate(from, [sender], 'remove'); } catch {}
        return;
      }
    }
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

  if (global.db.banned.includes(senderNum)) {
    if (!isOwner) {
      if (body.startsWith(config.prefix)) {
        await sock.sendMessage(from, { text: '🚫 You are banned from using Knight XMD.\nContact owner: wa.me/' + CREATOR }, { quoted: m });
      }
      return;
    }
  }

  if (!body.startsWith(config.prefix)) {
    if (global.db.settings?.autoReply && !isGroup) {
      const last = global.lastAutoReply?.[from] || 0;
      if (Date.now() - last > 30000) {
        if (!global.lastAutoReply) global.lastAutoReply = {};
        global.lastAutoReply[from] = Date.now();
        await sock.sendMessage(from, { text: `👋 Hi! I am Knight XMD. Type ${config.prefix}menu for commands.` });
      }
    }
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

  const plugin = plugins.find(p => {
    if (!p.command) return false;
    if (Array.isArray(p.command)) return p.command.includes(cmdName);
    return p.command === cmdName;
  });
  if (!plugin) return;

  // ========== MODE CHECK - FIXED ==========
  // private = only Owner/Creator for OWNER cmds, but GROUP cmds still work for group members? 
  // If you want private to block everything, keep this. If you want group cmds to work in private, comment am.
  if (config.mode === 'private' && !isOwner) {
    // FIX: silent ignore, no "you are not my owner" reply
    // Ada wey no link no get right to get reply
    return;
  }
  if (config.mode === 'self' && !isOwner) return; // self = only bot owner + creator

  // ========== PERMISSION CHECK - FIXED SILENT ==========
  // OWNER CMD: e.g .mode, .ban, .restart
  if (plugin.ownerOnly && !isOwner) return; // SILENT - no reply, Ada no get right

  // CREATOR ONLY: e.g .broadcast-all, .shutdown-all
  // Only YOU, even Session Owner no fit
  if (plugin.creatorOnly && !isCreator) return; // SILENT

  // ADMIN / GROUP CMD: e.g .kick, .tagall, .promote
  if (plugin.adminOnly) {
    if (!isGroup) return; // silent, no reply
    // Owner/Creator bypass admin check - they fit use group cmd even if no be admin
    if (!isAdmin && !isOwner) return; // silent
    if (!isBotAdmin) {
      // This one we reply because na real user wey need help, no be owner check
      return sock.sendMessage(from, { text: `❌ Bot must be admin to do this. Make bot admin first.` }, { quoted: m });
    }
  }

  // GROUP CMD: e.g .tagall if plugin.groupOnly = true
  if (plugin.groupOnly && !isGroup) return;

  const ctx = {
    sock, m, from, sender, senderNum,
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
    console.log(`[CMD] ${senderNum} -> ${config.prefix}${cmdName} | Owner:${isOwner} Creator:${isCreator} SessionOwner:${isSessionOwner} Bot:${botNum}`);
    await plugin.run(ctx);
  } catch (e) {
    console.log('CMD error', cmdName, e.message);
    await sock.sendMessage(from, { text: `❌ Error: ${e.message}` }, { quoted: m });
  }
}

module.exports = { handleMessage, loadPlugins, plugins: () => plugins };
