// KNIGHT XMD - Auto System - FIXED - Status = status@broadcast
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

function getSettings() {
  if (!global.db) global.db = {};
  if (!global.db.settings) global.db.settings = {};
  const def = { autoRead: false, autoTyping: false, autoOnline: false, autoRecording: false, autoReact: false, autoReply: false, autoSticker: false, autoView: false, autoBio: false, autoLikeStatus: false };
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
  if (parsed && onRun) { try { onRun(); } catch {} }
  if (!parsed && offRun) { try { offRun(); } catch {} }
  return reply(`> ╭══〘 ${emoji} ${label} 〙══⊷❍\n> ┃✯╭──────────────\n> ┃✯│ Status: ${parsed ? 'ON ✅' : 'OFF ❌'}\n> ┃✯│ ${parsed ? onMsg : offMsg}\n> ┃✯╰───────────────\n> ╰═══════════════════⊷❍`);
}

let bioInterval = null;
function startBio(sock) {
  if (bioInterval) clearInterval(bioInterval);
  if (!sock) return;
  const update = async () => {
    try { await sock.updateProfileStatus(`⚔️ Knight XMD | ${new Date().toLocaleTimeString('en-NG')} | By Faceless Tech`); } catch {}
  };
  update();
  bioInterval = setInterval(update, 60000);
}
function stopBio() { if (bioInterval) { clearInterval(bioInterval); bioInterval = null; } }

function isStatusJid(jid) {
  return jid === 'status@broadcast' || String(jid || '').endsWith('@broadcast');
}

// FIX: Throttle presence + react + sticker - no spam = no ban
let lastOnline = 0;
if (!global.autoReactMap) global.autoReactMap = new Map();
if (!global.autoStickerMap) global.autoStickerMap = new Map();

async function handleAuto(sock, m, ctx) {
  const s = getSettings();
  const { from, body, type, msg, isGroup } = ctx || {};
  try {
    if (m.key?.fromMe) return;
    if (isStatusJid(from)) return;

    const prefix = ctx.prefix || '.';
    const isCmd = body?.startsWith(prefix);

    if (s.autoRead) { try { await sock.readMessages([m.key]); } catch {} }

    // FIX 1: autoOnline - throttle 60s, no chatId for 'available'
    if (s.autoOnline && Date.now() - lastOnline > 60000) {
      lastOnline = Date.now();
      try { await sock.sendPresenceUpdate('available'); } catch {}
    }

    // FIX 5: Typing / Recording - show then paused after 2s, no hang
    if (isCmd && (s.autoTyping || s.autoRecording)) {
      try {
        await sock.sendPresenceUpdate(s.autoTyping ? 'composing' : 'recording', from);
        setTimeout(() => sock.sendPresenceUpdate('paused', from).catch(() => {}), 2000);
      } catch {}
    }

    // FIX 2: AutoReact - DM only + 1 react per chat per 60s
    if (s.autoReact && !isCmd && !isGroup) {
      const last = global.autoReactMap.get(from) || 0;
      if (Date.now() - last > 60000) {
        global.autoReactMap.set(from, Date.now());
        try {
          const emojis = ['❤️','🔥','👍','😂','😍','🙌','😎','🤩','🥰','💯','✨','🎉','👏','🙏','💪','🫶'];
          const pick = emojis[Math.floor(Math.random()*emojis.length)];
          await sock.sendMessage(from, { react: { text: pick, key: m.key } });
        } catch {}
      }
    }

    if (s.autoReply && !isGroup && !isCmd && body?.trim()) {
      const last = global.lastAutoReply?.[from] || 0;
      if (Date.now() - last > 30000) {
        if (!global.lastAutoReply) global.lastAutoReply = {};
        global.lastAutoReply[from] = Date.now();
        await sock.sendMessage(from, { text: `👋 Hi! I am Knight XMD. Type ${prefix}menu for commands.` });
      }
    }

    // FIX 3: AutoSticker - DM only + cooldown, no group spam
    if (s.autoSticker && !isGroup && (type === 'imageMessage' || type === 'videoMessage')) {
      const last = global.autoStickerMap.get(from) || 0;
      if (Date.now() - last < 10000) return;
      global.autoStickerMap.set(from, Date.now());
      try {
        const { Sticker, StickerTypes } = require('wa-sticker-formatter');
        const media = msg.imageMessage || msg.videoMessage;
        const mType = msg.imageMessage ? 'image' : 'video';
        if (mType === 'video' && media.seconds > 10) return;
        const stream = await downloadContentFromMessage(media, mType);
        let buf = Buffer.from([]); for await (const c of stream) buf = Buffer.concat([buf, c]);
        const st = new Sticker(buf, { pack: 'Knight XMD', author: 'Faceless Tech', type: StickerTypes.FULL, quality: 70 });
        await sock.sendMessage(from, await st.toMessage(), { quoted: m });
      } catch (e) { console.log('AutoSticker fail:', e.message); }
    }
  } catch (e) { console.log('Auto error:', e.message); }
}

// ===== AUTO-VIEW + AUTO-LIKE STATUS - FIXED =====
function setupAutoStatus(sock) {
  // FIX 4: Per-sock flag, no be global - reconnect go re-attach
  if (!sock || sock.__autoStatusAttached) return;
  sock.__autoStatusAttached = true;
  try {
    sock.ev.on('messages.upsert', async ({ messages }) => {
      const s = getSettings();
      if (!s.autoView && !s.autoLikeStatus) return;
      for (const m of messages) {
        if (!isStatusJid(m.key.remoteJid)) continue;
        if (m.key.fromMe) continue;
        if (!m.message?.imageMessage && !m.message?.videoMessage && !m.message?.extendedTextMessage) continue;
        try {
          if (s.autoView) await sock.readMessages([m.key]);
          if (s.autoLikeStatus) {
            // FIX: Status react - key must carry participant, send to status@broadcast
            await sock.sendMessage('status@broadcast', {
              react: { text: '❤️', key: { ...m.key, remoteJid: 'status@broadcast', participant: m.key.participant } }
            });
          }
        } catch (e) { console.log('AutoStatus fail:', e.message); }
      }
    });
  } catch {}
}

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
  { command: ['autoreact'], ownerOnly: true, run: async (ctx) => toggle({ ...ctx, key: 'autoReact', label: 'AUTO-REACT', emoji: '❤️', onMsg: 'Bot will auto react to messages (DM only)', offMsg: 'Auto react off' }) },
  { command: ['autoreply'], ownerOnly: true, run: async (ctx) => toggle({ ...ctx, key: 'autoReply', label: 'AUTO-REPLY', emoji: '💬', onMsg: 'Bot will reply Hi + menu to new DM', offMsg: 'Auto reply off' }) },
  { command: ['autosticker'], ownerOnly: true, run: async (ctx) => toggle({ ...ctx, key: 'autoSticker', label: 'AUTO-STICKER', emoji: '🏷️', onMsg: 'DM images/videos will become sticker', offMsg: 'Auto sticker off' }) },
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
  // FIX 6: Split autoon / autooff - no rely on ctx.command
  {
    command: ['autoall', 'autoon'],
    ownerOnly: true,
    run: async ({ reply }) => {
      const s = getSettings();
      ['autoRead','autoTyping','autoRecording','autoReact','autoReply','autoSticker','autoView','autoLikeStatus'].forEach(k => s[k] = true);
      if (global.dbSave) global.dbSave();
      await reply('✅ All auto ON (except Bio)');
    }
  },
  {
    command: ['autooff'],
    ownerOnly: true,
    run: async ({ reply }) => {
      const s = getSettings();
      ['autoRead','autoTyping','autoRecording','autoReact','autoReply','autoSticker','autoView','autoLikeStatus'].forEach(k => s[k] = false);
      stopBio(); s.autoBio = false;
      if (global.dbSave) global.dbSave();
      await reply('❌ All auto OFF');
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
