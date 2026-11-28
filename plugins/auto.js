// KNIGHT XMD - Auto System - REAL - 100% Toggle
// File: plugins/auto.js
// Toggle is saved to database/auto.json - survives restart, no guessing

const fs = require('fs');
const path = require('path');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

const CFG_PATH = path.join(__dirname, '../database/auto.json');

function bold(str) {
  const A = '𝐀𝐁𝐂𝐃𝐄𝐅𝐆𝐇𝐈𝐉𝐊𝐋𝐌𝐍𝐎𝐏𝐐𝐑𝐒𝐓𝐔𝐕𝐖𝐗𝐘𝐙';
  const a = '𝐚𝐛𝐜𝐝𝐞𝐟𝐠𝐡𝐢𝐣𝐤𝐥𝐦𝐧𝐨𝐩𝐪𝐫𝐬𝐭𝐮𝐯𝐰𝐱𝐲𝐳';
  const n = '𝟎𝟏𝟐𝟑𝟒𝟓𝟔𝟕𝟖𝟗';
  const map = {};
  for (let i = 0; i < 26; i++) { map[String.fromCharCode(65+i)] = A[i]; map[String.fromCharCode(97+i)] = a[i]; }
  for (let i = 0; i < 10; i++) map[String(i)] = n[i];
  return String(str).split('').map(c => map[c] || c).join('');
}

const ALL_KEYS = ['autoRead','autoTyping','autoOnline','autoRecording','autoReact','autoReply','autoSticker','autoView','autoBio','autoLikeStatus'];

const DEFAULTS = {
  autoRead: false, autoTyping: false, autoOnline: false, autoRecording: false,
  autoReact: false, autoReply: false, autoSticker: false,
  autoView: false, autoBio: false, autoLikeStatus: false
};

// FIX: REAL persistence - file, not global.db + fake dbSave()
function getSettings() {
  try {
    if (fs.existsSync(CFG_PATH)) {
      const data = JSON.parse(fs.readFileSync(CFG_PATH, 'utf8'));
      for (const k of ALL_KEYS) if (data[k] === undefined) data[k] = DEFAULTS[k];
      return data;
    }
  } catch {}
  return { ...DEFAULTS };
}

function saveSettings(s) {
  try {
    if (!fs.existsSync(path.dirname(CFG_PATH))) fs.mkdirSync(path.dirname(CFG_PATH), { recursive: true });
    fs.writeFileSync(CFG_PATH, JSON.stringify(s, null, 2));
    // Keep global in sync for old code that reads global.db.settings
    if (!global.db) global.db = {};
    global.db.settings = { ...global.db.settings, ...s };
  } catch (e) { console.log('[AUTO SAVE]', e.message); }
  return s;
}

function setToggle(key, value) {
  const s = getSettings();
  s[key] = value;
  saveSettings(s);
  return s;
}

function parseToggle(args) {
  if (!args || !args[0]) return null;
  const v = String(args[0]).toLowerCase().trim();
  if (['on','enable','activate','1','true','yes'].includes(v)) return true;
  if (['off','disable','deactivate','0','false','no'].includes(v)) return false;
  return 'invalid';
}

function toggle({ reply, args, sock, key, label, emoji, onMsg, offMsg, onRun, offRun }) {
  const s = getSettings();
  const parsed = parseToggle(args);
  if (parsed === null) {
    return reply(`> ╭══〘 ${emoji} ${bold(label)} 〙══⊷❍\n> ┃✯╭──────────────\n> ┃✯│ ${bold('Status:')} ${s[key] ? bold('ON ✅') : bold('OFF ❌')}\n> ┃✯│ ${bold('Usage:')} .${key} ${bold('on / off')}\n> ┃✯╰───────────────\n> ╰═══════════════════⊷❍`);
  }
  if (parsed === 'invalid') return reply(`❌ ${bold('Invalid. Use:')} .${key} ${bold('on')} ${bold('OR')} .${key} ${bold('off')}`);
  // FIX: Save REAL, not fake global.dbSave()
  setToggle(key, parsed);
  if (parsed && onRun) { try { onRun(); } catch {} }
  if (!parsed && offRun) { try { offRun(); } catch {} }
  return reply(`> ╭══〘 ${emoji} ${bold(label)} 〙══⊷❍\n> ┃✯╭──────────────\n> ┃✯│ ${bold('Status:')} ${parsed ? bold('ON ✅') : bold('OFF ❌')}\n> ┃✯│ ${parsed ? onMsg : offMsg}\n> ┃✯╰───────────────\n> ╰═══════════════════⊷❍`);
}

let bioInterval = null;
function startBio(sock) {
  if (bioInterval) clearInterval(bioInterval);
  if (!sock) return;
  const update = async () => {
    try { await sock.updateProfileStatus(`⚔️ ${bold('Knight XMD')} | ${new Date().toLocaleTimeString('en-NG')} | ${bold('By Faceless Tech')}`); } catch {}
  };
  update();
  bioInterval = setInterval(update, 60000);
}
function stopBio() { if (bioInterval) { clearInterval(bioInterval); bioInterval = null; } }

function isStatusJid(jid) {
  return jid === 'status@broadcast' || String(jid || '').endsWith('@broadcast');
}

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

    // autoOnline - throttle 60s
    if (s.autoOnline && Date.now() - lastOnline > 60000) {
      lastOnline = Date.now();
      try { await sock.sendPresenceUpdate('available'); } catch {}
    }

    // Typing / Recording - show then paused after 2s
    if (isCmd && (s.autoTyping || s.autoRecording)) {
      try {
        await sock.sendPresenceUpdate(s.autoTyping ? 'composing' : 'recording', from);
        setTimeout(() => sock.sendPresenceUpdate('paused', from).catch(() => {}), 2000);
      } catch {}
    }

    // AutoReact - DM only + 1 react per chat per 60s
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
        await sock.sendMessage(from, { text: `👋 ${bold('Hi! I am Knight XMD. Type')} ${prefix}menu ${bold('for commands.')}` });
      }
    }

    // AutoSticker - DM only + cooldown
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

// ===== AUTO-VIEW + AUTO-LIKE STATUS - REAL =====
function setupAutoStatus(sock) {
  if (!sock || sock.__autoStatusAttached) return;
  sock.__autoStatusAttached = true;
  try {
    sock.ev.on('messages.upsert', async ({ messages }) => {
      const s = getSettings();
      if (!s.autoView && !s.autoLikeStatus) return;
      for (const m of messages) {
        if (!isStatusJid(m.key.remoteJid)) continue;
        if (m.key.fromMe) continue;
        if (!m.message?.imageMessage && !m.message?.videoMessage && !m.message?.extendedTextMessage && !m.message?.videoMessage) continue;
        try {
          if (s.autoView) await sock.readMessages([m.key]);
          if (s.autoLikeStatus) {
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
  // FIX: If autoOnline is ON, start showing online immediately on reconnect
  if (s.autoOnline) {
    try { sock.sendPresenceUpdate('available'); } catch {}
  }
}

const commands = [
  { command: ['autoread'], ownerOnly: true, run: async (ctx) => toggle({ ...ctx, key: 'autoRead', label: 'AUTO-READ', emoji: '👀', onMsg: bold('All messages will be marked as read'), offMsg: bold('Messages will not be marked as read') }) },
  { command: ['autotyping'], ownerOnly: true, run: async (ctx) => toggle({ ...ctx, key: 'autoTyping', label: 'AUTO-TYPING', emoji: '⌨️', onMsg: bold('Bot will show typing... on every chat'), offMsg: bold('Typing indicator off') }) },
  { command: ['autoonline'], ownerOnly: true, run: async (ctx) => toggle({ ...ctx, key: 'autoOnline', label: 'AUTO-ONLINE', emoji: '🟢', onMsg: bold('Bot will always appear online'), offMsg: bold('Bot will appear offline when idle') }) },
  { command: ['autorecording'], ownerOnly: true, run: async (ctx) => toggle({ ...ctx, key: 'autoRecording', label: 'AUTO-RECORDING', emoji: '🎙️', onMsg: bold('Bot will show recording... on every chat'), offMsg: bold('Recording indicator off') }) },
  { command: ['autoreact'], ownerOnly: true, run: async (ctx) => toggle({ ...ctx, key: 'autoReact', label: 'AUTO-REACT', emoji: '❤️', onMsg: bold('Bot will auto react to messages (DM only)'), offMsg: bold('Auto react off') }) },
  { command: ['autoreply'], ownerOnly: true, run: async (ctx) => toggle({ ...ctx, key: 'autoReply', label: 'AUTO-REPLY', emoji: '💬', onMsg: bold('Bot will reply Hi + menu to new DM'), offMsg: bold('Auto reply off') }) },
  { command: ['autosticker'], ownerOnly: true, run: async (ctx) => toggle({ ...ctx, key: 'autoSticker', label: 'AUTO-STICKER', emoji: '🏷️', onMsg: bold('DM images/videos will become sticker'), offMsg: bold('Auto sticker off') }) },
  { command: ['autoview'], ownerOnly: true, run: async (ctx) => toggle({ ...ctx, key: 'autoView', label: 'AUTO-VIEW STATUS', emoji: '👁️', onMsg: bold('Bot will auto view all status'), offMsg: bold('Status view off') }) },
  { command: ['autobio'], ownerOnly: true, run: async (ctx) => toggle({ ...ctx, key: 'autoBio', label: 'AUTO-BIO', emoji: '📝', onMsg: bold('Bio will update every 60s with time'), offMsg: bold('Bio will not update again'), onRun: () => startBio(ctx.sock), offRun: () => stopBio() }) },
  { command: ['autolikestatus'], ownerOnly: true, run: async (ctx) => toggle({ ...ctx, key: 'autoLikeStatus', label: 'AUTO-LIKE STATUS', emoji: '💖', onMsg: bold('Bot will auto like all status'), offMsg: bold('Auto like off') }) },
  {
    command: ['autostatus', 'autolist'],
    ownerOnly: true,
    run: async ({ reply }) => {
      const s = getSettings();
      const line = (name, v) => `> ┃✯│ ${v ? '✅' : '❌'} ${bold(name)}: ${v ? bold('ON') : bold('OFF')}`;
      await reply(`> ╭══〘 ⚙️ ${bold('AUTO STATUS')} 〙══⊷❍\n> ┃✯╭──────────────\n${line('AutoRead', s.autoRead)}\n${line('AutoTyping', s.autoTyping)}\n${line('AutoOnline', s.autoOnline)}\n${line('AutoRecording', s.autoRecording)}\n${line('AutoReact', s.autoReact)}\n${line('AutoReply', s.autoReply)}\n${line('AutoSticker', s.autoSticker)}\n${line('AutoView Status', s.autoView)}\n${line('AutoBio', s.autoBio)}\n${line('AutoLike Status', s.autoLikeStatus)}\n> ┃✯╰───────────────\n> ╰═══════════════════⊷❍`);
    }
  },
  // FIX: autoon = ALL 10, autooff = ALL 10 - no guessing, no leaving autoOnline ON
  {
    command: ['autoall', 'autoon'],
    ownerOnly: true,
    run: async ({ reply, sock }) => {
      const s = getSettings();
      for (const k of ALL_KEYS) s[k] = true;
      saveSettings(s);
      startBio(sock);
      await reply(`✅ ${bold('All auto ON')} - ${bold('10/10')}\n${bold('AutoRead, Typing, Online, Recording, React, Reply, Sticker, View, Bio, Like Status')}`);
    }
  },
  {
    command: ['autooff'],
    ownerOnly: true,
    run: async ({ reply }) => {
      const s = getSettings();
      for (const k of ALL_KEYS) s[k] = false;
      saveSettings(s);
      stopBio();
      await reply(`❌ ${bold('All auto OFF')} - ${bold('0/10')}`);
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
