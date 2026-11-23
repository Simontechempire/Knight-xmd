const fs = require('fs');
const path = require('path');
const config = require('../config');

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
  return t.toLowerCase().split('').map(c => map[c] || c).join('');
};

async function handleMessage(sock, up, botNumber) {
  const m = up.messages[0];
  if (!m.message) return;
  const from = m.key.remoteJid;
  const isGroup = from.endsWith('@g.us');
  const sender = isGroup ? m.key.participant : from;
  const senderNum = sender.split('@')[0];
  const botJid = sock.user.id.split(':')[0];
  const isOwner = senderNum === botNumber; // Person wey link = owner
  const isCreator = senderNum === config.creatorNumber;
  const isBotAdmin = isGroup ? true : false;

  // Body
  const type = Object.keys(m.message)[0];
  const body = m.message.conversation || m.message.extendedTextMessage?.text || m.message.imageMessage?.caption || m.message.videoMessage?.caption || '';
  const quoted = m.message.extendedTextMessage?.contextInfo?.quotedMessage;

  // Auto Read / Typing
  if (global.db.settings?.autoRead) await sock.readMessages([m.key]);
  if (global.db.settings?.autoTyping) await sock.sendPresenceUpdate('composing', from);
  if (global.db.settings?.autoRecording) await sock.sendPresenceUpdate('recording', from);

  // Anti-Link / Anti-Badword / Anti-Spam etc - check before command
  if (isGroup && !isOwner && !isCreator) {
    const gAnti = global.db.anti?.[from] || {};
    const textLower = body.toLowerCase();
    // AntiLink
    if (gAnti.antilink && /(https?:\/\/|wa\.me\/|chat\.whatsapp\.com)/i.test(body)) {
      try {
        const meta = await sock.groupMetadata(from);
        const isAdmin = meta.participants.find(p => p.id === sender)?.admin;
        if (!isAdmin) {
          await sock.sendMessage(from, { delete: m.key });
          await sock.sendMessage(from, { text: `> ╭══〘 ⚠️ 𝗔𝗡𝗧𝗜-𝗟𝗜𝗡𝗞 〙══⊷❍\n> ┃✯╭──────────────\n> ┃✯│ @${senderNum} link not allowed\n> ┃✯│ Message deleted\n> ┃✯╰───────────────\n> ╰═══════════════════⊷❍`, mentions: [sender] });
          return;
        }
      } catch {}
    }
    // AntiBadword
    const bad = ['fuck','shit','bitch','sex','porn','dick','pussy'];
    if (gAnti.antibadword && bad.some(w => textLower.includes(w))) {
      await sock.sendMessage(from, { delete: m.key });
      await sock.sendMessage(from, { text: `🚫 Bad word deleted @${senderNum}`, mentions: [sender] });
      return;
    }
    // AntiSticker
    if (gAnti.antisticker && type === 'stickerMessage') {
      await sock.sendMessage(from, { delete: m.key });
      return;
    }
    // AntiFake - block fake numbers (not +234 etc) - simple check if sender starts with 1, 44, etc and group set
    if (gAnti.antifake) {
      const allowed = ['234'];
      if (!allowed.some(p => senderNum.startsWith(p))) {
        try { await sock.groupParticipantsUpdate(from, [sender], 'remove'); } catch {}
        return;
      }
    }
  }

  // AutoSticker
  if (global.db.settings?.autoSticker && (type === 'imageMessage' || type === 'videoMessage')) {
    // handled in plugin via auto flag
  }

  // Must start with prefix
  if (!body.startsWith(config.prefix)) {
    // AutoReply
    if (global.db.settings?.autoReply && !isGroup) {
      await sock.sendMessage(from, { text: `👋 Hi! I am Knight XMD. Type ${config.prefix}menu for commands.` });
    }
    return;
  }

  const args = body.slice(config.prefix.length).trim().split(/\s+/);
  const cmdName = args.shift().toLowerCase();
  const text = args.join(' ');

  // Find plugin
  const plugin = plugins.find(p => p.command && p.command.includes(cmdName));
  if (!plugin) return;

  // Permission check
  if (plugin.ownerOnly && !isOwner && !isCreator) return sock.sendMessage(from, { text: `❌ Only owner can use this.` });
  if (plugin.creatorOnly && !isCreator) return sock.sendMessage(from, { text: `❌ Only Creator (Faceless Tech) can use this.` });
  if (plugin.adminOnly && isGroup) {
    try {
      const meta = await sock.groupMetadata(from);
      const isAdmin = meta.participants.find(p => p.id === sender)?.admin;
      if (!isAdmin && !isOwner && !isCreator) return sock.sendMessage(from, { text: `❌ Admin only.` });
    } catch {}
  }

  const ctx = {
    sock, m, from, sender, senderNum, isGroup, isOwner, isCreator, botNumber,
    args, text, body, quoted, type, tiny, config, prefix: config.prefix,
    reply: async (txt, opts={}) => sock.sendMessage(from, { text: txt, ...opts }, { quoted: m }),
    replyImage: async (url, caption) => sock.sendMessage(from, { image: { url }, caption }, { quoted: m })
  };

  try { await plugin.run(ctx); }
  catch (e) { console.log('CMD error', cmdName, e.message); await sock.sendMessage(from, { text: `❌ Error: ${e.message}` }); }
}

module.exports = { handleMessage, loadPlugins };
