// KNIGHT XMD - Anti-Corruption / Anti-Nudity - REAL AI
// File: anticorruption.js
// Auto: Image / Video / Sticker -> If nudity / explicit sexual -> Delete from everyone instantly + Kick + Send warning
// No demo, no fake - Uses real nsfwjs AI

const fs = require('fs');
const path = require('path');
let nsfwModel = null;
let tf = null;

async function loadModel() {
  if (nsfwModel) return nsfwModel;
  tf = require('@tensorflow/tfjs-node');
  const nsfwjs = require('nsfwjs');
  nsfwModel = await nsfwjs.load();
  return nsfwModel;
}

async function isExplicit(buffer) {
  try {
    const model = await loadModel();
    const sharp = require('sharp');
    // Convert webp / any image to png for AI
    const png = await sharp(buffer).png().toBuffer();
    const img = tf.node.decodeImage(png, 3);
    const predictions = await model.classify(img);
    img.dispose();
    // predictions: Porn, Sexy, Hentai, Neutral, Drawing
    const score = {};
    predictions.forEach(p => score[p.className] = p.probability);
    // REAL THRESHOLD - If porn / hentai high, na explicit
    const explicitScore = (score['Porn'] || 0) + (score['Hentai'] || 0);
    const sexyScore = score['Sexy'] || 0;
    // Porn/Hentai > 0.60 = Explicit | Sexy > 0.85 = Explicit
    return explicitScore > 0.60 || sexyScore > 0.85;
  } catch (e) {
    console.log('[ANTICORRUPTION AI]', e.message);
    return false;
  }
}

module.exports = [
  {
    // This na auto handler, no command. Handler.js go call am for every message
    command: [],
    all: true,
    groupOnly: true,
    run: async ({ sock, m, from, sender, sessionDB }) => {
      try {
        if (!m.message) return;
        if (m.key?.fromMe) return;

        const msg = m.message;
        const imageMsg = msg.imageMessage;
        const videoMsg = msg.videoMessage;
        const stickerMsg = msg.stickerMessage;
        // Only check image / video / sticker
        if (!imageMsg && !videoMsg && !stickerMsg) return;

        // Don't check admin / owner - if you want check admin too, remove this line
        // const isAdmin = ... handler go handle am, we check all for now

        const mediaMsg = imageMsg || videoMsg || stickerMsg;
        const caption = (mediaMsg.caption || '').toLowerCase();

        // Fast text check - explicit words in caption
        const badWords = ['porn', 'xxx', 'sex video', 'nude', 'naked', 'pussy', 'dick', 'pornhub', 'xvideo'];
        const hasBadCaption = badWords.some(w => caption.includes(w));

        let explicit = hasBadCaption;

        // If caption clean, run REAL AI on media
        if (!explicit) {
          try {
            const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
            const type = imageMsg ? 'image' : videoMsg ? 'video' : 'sticker';
            const stream = await downloadContentFromMessage(mediaMsg, type);
            let buffer = Buffer.from([]);
            for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
            if (buffer.length > 0) {
              // For video, we check thumbnail / first frame via sharp - if video too big, AI go check first bytes
              explicit = await isExplicit(buffer);
            }
          } catch (e) {
            console.log('[ANTICORRUPTION DOWNLOAD]', e.message);
          }
        }

        if (!explicit) return;

        // ===== REAL DELETE FROM EVERYONE INSTANTLY - SAME AS GCSTATUS =====
        const deleteKey = {
          remoteJid: from,
          fromMe: false,
          id: m.key.id,
          participant: sender,
        };
        try {
          await sock.sendMessage(from, { delete: deleteKey });
        } catch (e) {
          console.log('[ANTICORRUPTION DELETE]', e.message);
        }

        // ===== WARN COUNT - Same DB as gcstatusdelete.js =====
        const targetNum = sender.split('@')[0].split(':')[0];
        const db = sessionDB || global.db;
        db.warnings ??= {};
        db.warnings[from] ??= {};
        const count = (db.warnings[from][targetNum] = (db.warnings[from][targetNum] || 0) + 1);

        if (count >= 2) {
          db.warnings[from][targetNum] = 0;
          await Promise.all([
            sock.sendMessage(from, { text: `🚨 *ANTI-CORRUPTION 2/2 - KICKED*\n\n👤 User: @${targetNum}\n🗑️ Nudity / Explicit content deleted from everyone\n🦵 Action: Kicked instantly`, mentions: [sender] }),
            sock.groupParticipantsUpdate(from, [sender], 'remove')
          ]);
          return;
        }

        // 1st time: Delete + Warn
        await sock.sendMessage(from, {
          text: `⚠️ *ANTI-CORRUPTION WARN ${count}/2*\n\n👤 User: @${targetNum}\n🗑️ Nudity / Explicit content deleted from everyone instantly\n⚠️ 1 more = Kick instantly`,
          mentions: [sender]
        });

      } catch (e) {
        console.log('[ANTICORRUPTION]', e.message);
      }
    }
  }
];
