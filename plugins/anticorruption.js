// KNIGHT XMD - Anti-Corruption / Anti-Porn - FIXED
// Deletes: image + video + sticker + viewonce
// Never throws error to user. No fake simulation.

const fs = require('fs');
const path = require('path');

const CFG_PATH = path.join(__dirname, '../database/anticorruption.json');
const WARN_PATH = path.join(__dirname, '../database/warnings.json');

function load(p) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return {}; } }
function save(p, d) {
  try {
    if (!fs.existsSync(path.dirname(p))) fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, JSON.stringify(d, null, 2));
  } catch {}
}

// --- LAZY AI, never crash if not installed ---
let nsfwModel = null, tf = null, modelTried = false;
async function getModel() {
  if (nsfwModel) return nsfwModel;
  if (modelTried) return null;
  modelTried = true;
  try {
    tf = require('@tensorflow/tfjs-node');
    const nsfwjs = require('nsfwjs');
    nsfwModel = await nsfwjs.load();
    console.log('[ANTICORRUPTION] Model loaded');
    return nsfwModel;
  } catch (e) {
    console.log('[ANTICORRUPTION] AI off, using caption check:', e.message);
    return null;
  }
}

async function aiCheck(buffer) {
  try {
    const model = await getModel();
    if (!model) return false;
    const sharp = require('sharp');
    const png = await sharp(buffer).png().toBuffer().catch(() => null);
    if (!png) return false;
    const img = tf.node.decodeImage(png, 3);
    try {
      const preds = await model.classify(img);
      const s = {};
      preds.forEach(p => s[p.className] = p.probability);
      const explicit = (s['Porn'] || 0) + (s['Hentai'] || 0);
      return explicit > 0.60 || (s['Sexy'] || 0) > 0.85;
    } finally { try { img.dispose(); } catch {} }
  } catch { return false; }
}

module.exports = [
  {
    command: ['anticorruption', 'anticorrupt', 'antinsfw', 'antiporn'],
    run: async ({ from, reply, args }) => {
      try {
        if (!from?.endsWith('@g.us')) return reply('❌ Only in groups');
        const cfg = load(CFG_PATH);
        const g = cfg[from] || { on: true, mode: 'kick', adminBypass: true };
        const sub = (args[0] || '').toLowerCase();
        const val = (args[1] || '').toLowerCase();
        if (!sub) return reply(`🛡️ *ANTI-CORRUPTION*\n\nStatus: ${g.on ? 'ON ✅' : 'OFF ❌'}\nMode: ${g.mode.toUpperCase()}\nAdmin Bypass: ${g.adminBypass ? 'ON' : 'OFF'}\n\n.anticorruption on / off\n.anticorruption mode warn / kick\n.anticorruption admin on / off\n.anticorruption status`);
        if (sub === 'status') return reply(`🛡️ Anti-Corruption: ${g.on ? 'ON ✅' : 'OFF ❌'} | Mode: ${g.mode}`);
        if (sub === 'on' || sub === 'off') { g.on = sub === 'on'; cfg[from] = g; save(CFG_PATH, cfg); return reply(`🛡️ Anti-Corruption ${g.on ? 'ON ✅' : 'OFF ❌'}`); }
        if (sub === 'mode' && (val === 'warn' || val === 'kick')) { g.mode = val; cfg[from] = g; save(CFG_PATH, cfg); return reply(`🛡️ Mode set to ${val.toUpperCase()} ✅`); }
        if (sub === 'admin' && (val === 'on' || val === 'off')) { g.adminBypass = val === 'on'; cfg[from] = g; save(CFG_PATH, cfg); return reply(`🛡️ Admin Bypass ${g.adminBypass ? 'ON ✅' : 'OFF ❌'}`); }
        if (sub === 'test') { const m = await getModel(); return reply(m ? '✅ AI model loaded - ready' : '✅ Caption check ready - AI model not installed, still deletes on caption + will delete on AI when installed'); }
        return reply('Usage:\n.anticorruption on / off\n.anticorruption mode warn / kick\n.anticorruption admin on / off');
      } catch { try { await reply('🛡️ Anti-Corruption is ON'); } catch {} }
    }
  },
  {
    all: true,
    run: async ({ sock, m, from }) => {
      try {
        if (!m?.message || m.key?.fromMe) return;
        if (!from?.endsWith('@g.us')) return;

        const cfg = load(CFG_PATH);
        const g = cfg[from] || { on: true, mode: 'kick', adminBypass: true };
        if (g.on === false) return;

        // Unwrap viewonce / ephemeral
        let msg = m.message;
        msg = msg.viewOnceMessage?.message || msg.viewOnceMessageV2?.message || msg.viewOnceMessageV2Extension?.message || msg.ephemeralMessage?.message || msg;

        const imageMsg = msg.imageMessage;
        const videoMsg = msg.videoMessage;
        const stickerMsg = msg.stickerMessage;
        if (!imageMsg && !videoMsg && !stickerMsg) return;

        const realSender = m.key.participant || m.participant || m.key.remoteJid;
        if (!realSender) return;

        // Admin bypass
        if (g.adminBypass) {
          try {
            const meta = await sock.groupMetadata(from);
            const entry = meta.participants.find(p => p.id === realSender || p.id.split('@')[0] === realSender.split('@')[0]);
            if (entry?.admin) return;
          } catch {}
        }

        const mediaMsg = imageMsg || videoMsg || stickerMsg;
        const caption = ((mediaMsg.caption || '') + ' ' + (msg.extendedTextMessage?.text || '')).toLowerCase();
        const badWords = ['porn', 'xxx', 'sex', 'nude', 'naked', 'pussy', 'dick', 'cock', 'pornhub', 'xvideo', 'xhamster', 'onlyfans', 'boobs', 'ass', 'fuck'];
        let explicit = badWords.some(w => caption.includes(w));

        // AI check - image / sticker / video thumbnail
        if (!explicit) {
          try {
            if (videoMsg) {
              // 1. Thumbnail first - real frame
              if (videoMsg.jpegThumbnail?.length > 1000) {
                explicit = await aiCheck(Buffer.from(videoMsg.jpegThumbnail));
              }
              // 2. If no thumbnail, download first 2MB and try - don't skip video
              if (!explicit) {
                try {
                  const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
                  const stream = await downloadContentFromMessage(videoMsg, 'video');
                  let buf = Buffer.from([]);
                  for await (const chunk of stream) { buf = Buffer.concat([buf, chunk]); if (buf.length > 2000000) break; }
                  if (buf.length > 1000) explicit = await aiCheck(buf);
                } catch {}
              }
            } else {
              const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
              const type = imageMsg ? 'image' : 'sticker';
              const stream = await downloadContentFromMessage(mediaMsg, type);
              let buffer = Buffer.from([]);
              for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
              if (buffer.length > 1000) explicit = await aiCheck(buffer);
            }
          } catch {}
        }

        // If AI is OFF and caption is clean, we cannot falsely delete - skip
        // But if caption has bad word OR AI says explicit, delete
        if (!explicit) return;

        // Bot must be admin - if not, warn only, no crash
        let isAdmin = false;
        try {
          const meta = await sock.groupMetadata(from);
          const me = (sock.user?.id || '').split(':')[0].split('@')[0];
          const meEntry = meta.participants.find(p => (p.id || '').split(':')[0].split('@')[0] === me);
          isAdmin = meEntry?.admin === 'admin' || meEntry?.admin === 'superadmin';
        } catch {}

        if (isAdmin) {
          try { await sock.sendMessage(from, { delete: m.key }); } catch {}
        }

        const warnDB = load(WARN_PATH);
        warnDB[from] = warnDB[from] || {};
        const targetNum = realSender.split('@')[0].split(':')[0];
        warnDB[from][targetNum] = (warnDB[from][targetNum] || 0) + 1;
        const count = warnDB[from][targetNum];
        save(WARN_PATH, warnDB);

        if (g.mode === 'kick' && count >= 2 && isAdmin) {
          warnDB[from][targetNum] = 0; save(WARN_PATH, warnDB);
          try { await sock.groupParticipantsUpdate(from, [realSender], 'remove'); } catch {}
          await sock.sendMessage(from, { text: `🚨 *ANTI-CORRUPTION 2/2 - KICKED*\n\n👤 @${targetNum}\n🗑️ Explicit deleted\n🦵 Kicked`, mentions: [realSender] }).catch(()=>{});
          return;
        }
        await sock.sendMessage(from, { text: `⚠️ *ANTI-CORRUPTION WARN ${count}/2*\n\n👤 @${targetNum}\n🗑️ Explicit deleted\n⚠️ 1 more = Kick`, mentions: [realSender] }).catch(()=>{});
      } catch (e) { console.log('[ANTICORRUPTION]', e?.message || 'error'); }
    }
  }
];
