// KNIGHT XMD - VV - NEW WhatsApp View Once Method - 2026
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

// ===== NEW METHOD: Find View Once anywhere - recursive =====
function findViewOnce(obj) {
  if (!obj || typeof obj !== 'object') return null;

  // 1. Direct viewOnce containers
  if (obj.viewOnceMessageV2?.message) return findViewOnce(obj.viewOnceMessageV2.message) || obj.viewOnceMessageV2.message;
  if (obj.viewOnceMessage?.message) return findViewOnce(obj.viewOnceMessage.message) || obj.viewOnceMessage.message;
  if (obj.viewOnceMessageV2Extension?.message) return obj.viewOnceMessageV2Extension.message;

  // 2. Ephemeral wrapper - new WhatsApp dey hide am inside here
  if (obj.ephemeralMessage?.message) {
    const f = findViewOnce(obj.ephemeralMessage.message);
    if (f) return f;
  }

  // 3. New format: image/video with viewOnce: true
  if (obj.imageMessage?.viewOnce === true) return obj;
  if (obj.videoMessage?.viewOnce === true) return obj;
  if (obj.audioMessage?.viewOnce === true) return obj;

  // 4. Normal image/video inside viewOnce wrapper
  if (obj.imageMessage) return obj;
  if (obj.videoMessage) return obj;
  if (obj.audioMessage) return obj;

  // 5. Deep search - check all keys
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    if (v && typeof v === 'object') {
      const found = findViewOnce(v);
      if (found) return found;
    }
  }
  return null;
}

module.exports = [
  {
    command: ['vv', 'viewonce', 'reveal'],
    run: async ({ sock, m, from, reply }) => {
      // Get quoted OR direct message
      const ctx = m.message.extendedTextMessage?.contextInfo;
      const quoted = ctx?.quotedMessage;
      const quotedParticipant = ctx?.participant;

      // Try quoted first, then direct
      let target = null;
      if (quoted) target = findViewOnce(quoted);
      if (!target) target = findViewOnce(m.message);

      if (!target) return reply('❌ Reply to a View Once photo/video with .vv\n\nMake sure you reply the View Once message, no be screenshot.');

      const type = Object.keys(target)[0]; // imageMessage / videoMessage / audioMessage
      try {
        await reply('👁️ Recovering View Once...');

        // ===== NEW METHOD: downloadContentFromMessage with correct type =====
        const mediaType = type.includes('image') ? 'image' : type.includes('video') ? 'video' : type.includes('audio') ? 'audio' : 'image';
        const mediaObj = target[type];

        // Fix: Baileys need full message object, not just mediaObj - use downloadMediaMessage if available
        let buf = Buffer.from([]);
        try {
          // Method 1 - New Baileys: downloadMediaMessage (handles viewOnce)
          if (sock.downloadMediaMessage) {
            // Build fake message for download
            const fakeMsg = { message: target, key: m.key };
            buf = await sock.downloadMediaMessage(fakeMsg, 'buffer', {}, { logger: undefined });
          }
        } catch {}
        // Method 2 - Fallback: downloadContentFromMessage
        if (!buf || buf.length < 100) {
          const stream = await downloadContentFromMessage(mediaObj, mediaType);
          buf = Buffer.from([]);
          for await (const c of stream) buf = Buffer.concat([buf, c]);
        }

        if (!buf || buf.length < 100) return reply('❌ Failed - View Once don expire or WhatsApp don block am. Try am quick next time.');

        const caption = '👁️ *View Once Recovered*\nBy Knight XMD ⚔️';

        if (type.includes('image')) {
          await sock.sendMessage(from, { image: buf, caption }, { quoted: m });
        } else if (type.includes('video')) {
          await sock.sendMessage(from, { video: buf, caption }, { quoted: m });
        } else if (type.includes('audio')) {
          await sock.sendMessage(from, { audio: buf, mimetype: 'audio/mp4', ptt: mediaObj.ptt || false }, { quoted: m });
        } else {
          await sock.sendMessage(from, { document: buf, fileName: 'viewonce.bin', caption }, { quoted: m });
        }
      } catch (e) {
        await reply('❌ Failed: ' + e.message + '\nTry reply again quick, View Once fit don expire.');
      }
    }
  },
];
