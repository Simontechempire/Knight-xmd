// KNIGHT XMD - Auto System - FULLY HANDLED - Connected to handler.js
// By Faceless Tech

function getSettings() {
  if (!global.db) global.db = {};
  if (!global.db.settings) {
    global.db.settings = {
      autoRead: false, autoTyping: false, autoOnline: true,
      autoRecording: false, autoReact: false, autoReply: false,
      autoSticker: false, autoView: false, autoBio: false, autoLikeStatus: false,
    };
  }
  // Fill missing keys
  const def = { autoRead:false, autoTyping:false, autoOnline:true, autoRecording:false, autoReact:false, autoReply:false, autoSticker:false, autoView:false, autoBio:false, autoLikeStatus:false };
  for (const k of Object.keys(def)) if (global.db.settings[k] === undefined) global.db.settings[k] = def[k];
  return global.db.settings;
}

function parseToggle(args) {
  if (!args || !args[0]) return null;
  const v = String(args[0]).toLowerCase().trim();
  if (['on','enable','activate','1','true','yes'].includes(v)) return true;
  if (['off','disable','deactivate','0','false','no'].includes(v)) return false;
  return 'invalid';
}

function toggle({ reply, args, key, label, emoji, onMsg, offMsg, onRun, offRun }) {
  const s = getSettings();
  const parsed = parseToggle(args);
  if (parsed === null) {
    return reply(`> ╭══〘 ${emoji} ${label} 〙══⊷❍\n> ┃✯╭──────────────\n> ┃✯│ Status: ${s[key] ? 'ON ✅' : 'OFF ❌'}\n> ┃✯│ Usage: .${key} on / off\n> ┃✯╰───────────────\n> ╰═══════════════════⊷❍`);
  }
  if (parsed === 'invalid') return reply(`❌ Invalid. Use: .${key} on  OR  .${key} off`);
  s[key] = parsed;
  if (global.dbSave) global.dbSave();
  if (parsed && onRun) onRun();
  if (!parsed && offRun) offRun();
  return reply(`> ╭══〘 ${emoji} ${label} 〙══⊷❍\n> ┃✯╭──────────────\n> ┃✯│ Status: ${parsed ? 'ON ✅' : 'OFF ❌'}\n> ┃✯│ ${parsed ? onMsg : offMsg}\n> ┃✯╰───────────────\n> ╰═══════════════════⊷❍`);
}

// ===== AUTO-BIO =====
let bioInterval = null;
function startBio(sock) {
  if (bioInterval) clearInterval(bioInterval);
  const update = async () => {
    try { await sock.updateProfileStatus(`⚔️ Knight XMD | ${new Date().toLocaleTimeString('en-NG')} | By Faceless Tech`); } catch {}
  };
  update();
  bioInterval = setInterval(update, 60000);
}
function stopBio() { if (bioInterval) { clearInterval(bioInterval); bioInterval = null; } }

// ===== MAIN AUTO HANDLER - Handler go call this for every message =====
async function handleAuto(sock, m, ctx) {
  const s = getSettings();
  const { from, body, type, msg, isGroup } = ctx;
  try {
    // AUTO-READ
    if (s.autoRead) { try { await sock.readMessages([m.key]); } catch {} }
    // AUTO-TYPING / RECORDING - only when na command
    if (body?.startsWith(ctx.prefix || '.')) {
      if (s.autoTyping) { try { await sock.sendPresenceUpdate('composing', from); } catch {} }
      else if (s.autoRecording) { try { await sock.sendPresenceUpdate('recording', from); } catch {} }
    }
    // AUTO-ONLINE - keep online
    if (s.autoOnline) { try { await sock.sendPresenceUpdate('available', from); } catch {} }
    // AUTO-REACT - react ❤️ to every message (not commands, not status)
    if (s.autoReact && !from.endsWith('@status')) {
      try {
        const emojis = ['❤️','🔥','👍','😂','😍','🙌'];
        const pick = emojis[Math.floor(Math.random()*emojis.length)];
        await sock.sendMessage(from, { react: { text: pick, key: m.key } });
      } catch {}
    }
    // AUTO-REPLY - DM only, once per 30s
    if (s.autoReply && !isGroup && !body?.startsWith(ctx.prefix || '.')) {
      const last = global.lastAutoReply?.[from] || 0;
      if (Date.now() - last > 30000) {
        if (!global.lastAutoReply) global.lastAutoReply = {};
        global.lastAutoReply[from] = Date.now();
        await sock.sendMessage(from, { text: `👋 Hi! I am Knight XMD. Type ${ctx.prefix || '.'}menu for commands.` });
      }
    }
    // AUTO-STICKER - image/video -> sticker
    if (s.autoSticker && (type === 'imageMessage' || type === 'videoMessage')) {
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
  } catch {}
}

// ===== AUTO-VIEW + AUTO-LIKE STATUS - Call from connection.js =====
function setupAutoStatus(sock) {
  try {
    sock.ev.on('messages.upsert', async ({ messages }) => {
      const s = getSettings();
      if (!s.autoView && !s.autoLikeStatus) return;
      for (const m of messages) {
        if (!m.key.remoteJid?.endsWith('@status')) continue;
        try {
          // AUTO-VIEW
          if (s.autoView) await sock.readMessages([m.key]);
          // AUTO-LIKE STATUS - like with ❤️
          if (s.autoLikeStatus) {
            await sock.sendMessage(m.key.remoteJid, { react: { text: '❤️', key: m.key } }, { participant: m.key.participant });
          }
        } catch {}
      }
    });
  } catch {}
}

// Restore autobio after restart
function restoreAuto(sock) {
  const s = getSettings();
  if (s.autoBio) startBio(sock);
  setupAutoStatus(sock);
}

const commands = [
  { command: ['autoread'], ownerOnly: true, run: async (ctx) => toggle({ ...ctx, key: 'autoRead', label: 'AUTO-READ', emoji: '👀', onMsg: 'All messages will be marked as read', offMsg: 'Messages will not be marked as read' }) },
  { command: ['autotyping'], ownerOnly: true, run: async (ctx) => toggle({ ...ctx, key: 'autoTyping', label: 'AUTO-TYPING', emoji: '⌨️', onMsg: 'Bot will show typing... on every chat', offMsg: 'Typing indicator off' }) },
  { command: ['autoonline'], ownerOnly: true, run: async (ctx) => toggle({ ...ctx, key: 'autoOnline', label: 'AUTO-ONLINE', emoji: '🟢', onMsg: 'Bot will always appear online', offMsg: 'Bot will appear offline when idle' }) },
  { command: ['autorecording'], ownerOnly: true, run: async (ctx) => toggle({ ...ctx, key: 'autoRecording', label: 'AUTO-RECORDING', emoji: '🎙️', onMsg: 'Bot will show recording... on every chat', offMsg: 'Recording indicator off' }) },
  { command: ['autoreact'], ownerOnly: true, run: async (ctx) => toggle({ ...ctx, key: 'autoReact', label: 'AUTO-REACT', emoji: '❤️', onMsg: 'Bot will auto react to messages', offMsg: 'Auto react off' }) },
  { command: ['autoreply'], ownerOnly: true, run: async (ctx) => toggle({ ...ctx, key: 'autoReply', label: 'AUTO-REPLY', emoji: '💬', onMsg: 'Bot will reply Hi + menu to new DM', offMsg: 'Auto reply off' }) },
  { command: ['autosticker'], ownerOnly: true, run: async (ctx) => toggle({ ...ctx, key: 'autoSticker', label: 'AUTO-STICKER', emoji: '🏷️', onMsg: 'All images/videos will become sticker', offMsg: 'Auto sticker off' }) },
  { command: ['autoview'], ownerOnly: true, run: async (ctx) => toggle({ ...ctx, key: 'autoView', label: 'AUTO-VIEW STATUS', emoji: '👁️', onMsg: 'Bot will auto view all status', offMsg: 'Status view off' }) },
  { command: ['autobio'], ownerOnly: true, run: async (ctx) => toggle({ ...ctx, key: 'autoBio', label: 'AUTO-BIO', emoji: '📝', onMsg: 'Bio will update every 60s with time', offMsg: 'Bio will not update again', onRun: () => startBio(ctx.sock), offRun: () => stopBio() }) },
  { command: ['autolikestatus'], ownerOnly: true, run: async (ctx) => toggle({ ...ctx, key: 'autoLikeStatus', label: 'AUTO-LIKE STATUS', emoji: '💖', onMsg: 'Bot will auto like all status', offMsg: 'Auto like off' }) },
  {
    command: ['autostatus', 'autolist'],
    ownerOnly: true,
    run: async ({ reply }) => {
      const s = getSettings();
      const line = (name, v) => `> ┃✯│ ${v ? '✅' : '❌'} ${name}: ${v ? 'ON' : 'OFF'}`;
      await reply(`> ╭══〘 ⚙️ AUTO STATUS 〙══⊷❍\n> ┃✯╭──────────────\n${line('AutoRead', s.autoRead)}\n${line('AutoTyping', s.autoTyping)}\n${line('AutoOnline', s.autoOnline)}\n${line('AutoRecording', s.autoRecording)}\n${line('AutoReact', s.autoReact)}\n${line('AutoReply', s.autoReply)}\n${line('AutoSticker', s.autoSticker)}\n${line('AutoView Status', s.autoView)}\n${line('AutoBio', s.autoBio)}\n${line('AutoLike Status', s.autoLikeStatus)}\n> ┃✯╰───────────────\n> ╰═══════════════════⊷❍`);
    }
  },
  {
    command: ['autoall', 'autoon', 'autooff'],
    ownerOnly: true,
    run: async ({ reply, command }) => {
      const s = getSettings();
      const val = command === 'autooff' ? false : true;
      ['autoRead','autoTyping','autoRecording','autoReact','autoReply','autoSticker','autoView','autoLikeStatus'].forEach(k => s[k] = val);
      if (!val) stopBio(); s.autoBio = false;
      if (global.dbSave) global.dbSave();
      await reply(val ? '✅ All auto ON (except Bio)' : '❌ All auto OFF');
    }
  },
];

module.exports = commands;
module.exports.handleAuto = handleAuto;
module.exports.setupAutoStatus = setupAutoStatus;
module.exports.restoreAuto = restoreAuto;
module.exports.getSettings = getSettings;
module.exports.startBio = startBio;
module.exports.stopBio = stopBio;
