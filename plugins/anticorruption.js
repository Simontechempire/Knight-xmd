// KNIGHT XMD - Anti-Corruption / Anti-Nudity - REAL
// File: plugins/anticorruption.js
// Commands + Auto in ONE file. No sessionDB guess, no global.db guess.

const fs = require('fs');
const path = require('path');

const CFG_PATH = path.join(__dirname, '../database/anticorruption.json');
const WARN_PATH = path.join(__dirname, '../database/warnings.json');

function load(p) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return {}; } }
function save(p, d) {
  if (!fs.existsSync(path.dirname(p))) fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(d, null, 2));
}

let nsfwModel = null;
let tf = null;
let modelFailed = false;

async function loadModel() {
  if (nsfwModel) return nsfwModel;
  if (modelFailed) throw new Error('NSFW model failed to load before - check Render logs');
  try {
    tf = require('@tensorflow/tfjs-node');
    const nsfwjs = require('nsfwjs');
    console.log('[ANTICORRUPTION] Loading nsfwjs model... may take 20-30s first time');
    nsfwModel = await nsfwjs.load();
    console.log('[ANTICORRUPTION] Model loaded ✅');
    return nsfwModel;
  } catch (e) {
    modelFailed = true;
    console.log('[ANTICORRUPTION MODEL FAIL]', e.message);
    throw e;
  }
}

async function isExplicitImage(buffer) {
  const model = await loadModel();
  const sharp = require('sharp');
  // REAL: convert webp/jpg/png to raw for tf
  const png = await sharp(buffer).png().toBuffer();
  const img = tf.node.decodeImage(png, 3);
  try {
    const preds = await model.classify(img);
    const s = {};
    preds.forEach(p => s[p.className] = p.probability);
    console.log('[ANTICORRUPTION AI]', JSON.stringify(s));
    const explicit = (s['Porn'] || 0) + (s['Hentai'] || 0);
    return explicit > 0.60 || (s['Sexy'] || 0) > 0.85;
  } finally {
    img.dispose();
  }
}

async function isBotAdminReal(sock, from) {
  try {
    const meta = await sock.groupMetadata(from);
    const meNum = (sock.user?.id || '').split(':')[0].split('@')[0];
    const entry = meta.participants.find(p => (p.id || '').split(':')[0].split('@')[0] === meNum);
    return entry?.admin === 'admin' || entry?.admin === 'superadmin';
  } catch { return null; }
}

module.exports = [
  // ===== 1. REAL COMMANDS - Control =====
  {
    command: ['anticorruption', 'anticorrupt', 'antinsfw', 'antiporn'],
    run: async ({ from, reply, args, m }) => {
      if (!from?.endsWith('@g.us')) return reply('❌ Only in groups');
      const cfg = load(CFG_PATH);
      const g = cfg[from] || { on: true, mode: 'kick', adminBypass: true };
      const sub = (args[0] || '').toLowerCase();
      const val = (args[1] || '').toLowerCase();

      // .anticorruption - show status
      if (!sub) {
        return reply(
          `🛡️ *ANTI-CORRUPTION*\n\n` +
          `Status: ${g.on ? 'ON ✅' : 'OFF ❌'}\n` +
          `Mode: ${g.mode.toUpperCase()} (warn = only warn, kick = 2 warns = kick)\n` +
          `Admin Bypass: ${g.adminBypass ? 'ON - Admins no go delete' : 'OFF - Admins go delete too'}\n\n` +
          `Commands:\n` +
          `.anticorruption on / off\n` +
          `.anticorruption mode warn / kick\n` +
          `.anticorruption admin on / off\n` +
          `.anticorruption status`
        );
      }

      if (sub === 'status') {
        return reply(`🛡️ Anti-Corruption: ${g.on ? 'ON ✅' : 'OFF ❌'} | Mode: ${g.mode} | AdminBypass: ${g.adminBypass ? 'ON' : 'OFF'}`);
      }
      if (sub === 'on' || sub === 'off') {
        g.on = sub === 'on';
        cfg[from] = g; save(CFG_PATH, cfg);
        return reply(`🛡️ Anti-Corruption ${g.on ? 'ON ✅' : 'OFF ❌'} for this group`);
      }
      if (sub === 'mode' && (val === 'warn' || val === 'kick')) {
        g.mode = val; cfg[from] = g; save(CFG_PATH, cfg);
        return reply(`🛡️ Mode set to ${val.toUpperCase()} ✅\n${val === 'warn' ? 'E go delete + warn only, no kick' : '2 warns = Kick'}`);
      }
      if (sub === 'admin' && (val === 'on' || val === 'off')) {
        g.adminBypass = val === 'on'; cfg[from] = g; save(CFG_PATH, cfg);
        return reply(`🛡️ Admin Bypass ${g.adminBypass ? 'ON ✅ - Admins safe' : 'OFF ❌ - Admins go delete too'}`);
      }
      if (sub === 'test') {
        // REAL test - no simulation, e go tell you if model fit load
        try {
          await loadModel();
          return reply('✅ NSFW model loaded - Anti-Corruption ready');
        } catch (e) {
          return reply(`❌ Model fail to load: ${e.message}\nCheck Render logs, check package.json get @tensorflow/tfjs-node + nsfwjs + sharp`);
        }
      }
      return reply('Usage:\n.anticorruption on / off\n.anticorruption mode warn / kick\n.anticorruption admin on / off\n.anticorruption status\n.anticorruption test');
    }
  },

  // ===== 2. AUTO - Delete + Warn + Kick =====
  {
    all: true,
    run: async ({ sock, m, from }) => {
      try {
        if (!m?.message) return;
        if (m.key?.fromMe) return;
        if (!from?.endsWith('@g.us')) return;

        const cfg = load(CFG_PATH);
        const g = cfg[from] || { on: true, mode: 'kick', adminBypass: true };
        if (g.on === false) return;

        const raw = m.message;
        const msg = raw.viewOnceMessage?.message || raw.viewOnceMessageV2?.message || raw.ephemeralMessage?.message || raw;

        const imageMsg = msg.imageMessage;
        const videoMsg = msg.videoMessage;
        const stickerMsg = msg.stickerMessage;
        if (!imageMsg && !videoMsg && !stickerMsg) return;

        const realSender = m.key.participant || m.key.remoteJid;
        if (!realSender) return;

        // Admin bypass - REAL check, no guess
        if (g.adminBypass) {
          try {
            const meta = await sock.groupMetadata(from);
            const entry = meta.participants.find(p => p.id === realSender || (p.id || '').split(':')[0] === realSender.split(':')[0]);
            if (entry?.admin) return; // admin/owner - skip
          } catch {}
        }

        const mediaMsg = imageMsg || videoMsg || stickerMsg;
        const caption = (mediaMsg.caption || '').toLowerCase();
        const badWords = ['porn', 'xxx', 'sex video', 'nude', 'naked', 'pussy', 'dick', 'pornhub', 'xvideo'];
        let explicit = badWords.some(w => caption.includes(w));
        let aiScore = null;

        // If caption clean, run REAL AI - IMAGE / STICKER only for now
        // VIDEO: use thumbnail (videoMsg.jpegThumbnail) - REAL, no sharp on video buffer
        if (!explicit) {
          try {
            if (videoMsg) {
              // Video thumbnail na real first frame wey WhatsApp send
              if (videoMsg.jpegThumbnail?.length > 1000) {
                explicit = await isExplicitImage(Buffer.from(videoMsg.jpegThumbnail));
              } else {
                // No thumbnail - cannot check video without ffmpeg, skip, no fake
                console.log('[ANTICORRUPTION] Video no thumbnail, skip AI');
                return;
              }
            } else {
              const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
              const type = imageMsg ? 'image' : 'sticker';
              const stream = await downloadContentFromMessage(mediaMsg, type);
              let buffer = Buffer.from([]);
              for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
              if (buffer.length < 1000) return;
              explicit = await isExplicitImage(buffer);
            }
          } catch (e) {
            console.log('[ANTICORRUPTION AI/DOWNLOAD]', e.message);
            return; // If AI fail, NO delete - no false delete
          }
        }

        if (!explicit) return;

        console.log(`[ANTICORRUPTION] Explicit detected from ${realSender} in ${from}`);

        // Bot must be admin to delete
        const admin = await isBotAdminReal(sock, from);
        if (admin === false) return;

        // ===== REAL DELETE - Use m.key DIRECTLY =====
        try {
          await sock.sendMessage(from, { delete: m.key });
        } catch (e) {
          console.log('[ANTICORRUPTION DELETE FAIL]', e.message);
        }

        // ===== WARN - File DB, no sessionDB guess =====
        const warnDB = load(WARN_PATH);
        warnDB[from] = warnDB[from] || {};
        const targetNum = realSender.split('@')[0].split(':')[0];
        warnDB[from][targetNum] = (warnDB[from][targetNum] || 0) + 1;
        const count = warnDB[from][targetNum];
        save(WARN_PATH, warnDB);

        if (g.mode === 'kick' && count >= 2) {
          warnDB[from][targetNum] = 0;
          save(WARN_PATH, warnDB);
          try { await sock.groupParticipantsUpdate(from, [realSender], 'remove'); } catch (e) { console.log('[ANTICORRUPTION KICK FAIL]', e.message); }
          await sock.sendMessage(from, { text: `🚨 *ANTI-CORRUPTION 2/2 - KICKED*\n\n👤 @${targetNum}\n🗑️ Nudity / Explicit deleted\n🦵 Kicked`, mentions: [realSender] });
          return;
        }

        await sock.sendMessage(from, {
          text: `⚠️ *ANTI-CORRUPTION WARN ${count}/2*\n\n👤 @${targetNum}\n🗑️ Nudity / Explicit deleted for everyone\n⚠️ 1 more = Kick`,
          mentions: [realSender]
        });

      } catch (e) {
        console.log('[ANTICORRUPTION]', e.message);
      }
    }
  }
];
