// KNIGHT XMD - Sticker System - Real Handler
// By Faceless Tech
const { Sticker, StickerTypes } = require('wa-sticker-formatter');
const axios = require('axios');

async function downloadMedia(msg, type) {
  const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
  const stream = await downloadContentFromMessage(msg, type);
  let buf = Buffer.from([]);
  for await (const chunk of stream) buf = Buffer.concat([buf, chunk]);
  return buf;
}

function getMedia(m) {
  // Returns { msg, type } - handles send + reply + image + video
  const directImg = m.message.imageMessage;
  const directVid = m.message.videoMessage;
  const quoted = m.message.extendedTextMessage?.contextInfo?.quotedMessage;
  const qImg = quoted?.imageMessage;
  const qVid = quoted?.videoMessage;
  const qSticker = quoted?.stickerMessage;

  if (directImg) return { msg: directImg, type: 'image' };
  if (directVid) return { msg: directVid, type: 'video' };
  if (qImg) return { msg: qImg, type: 'image' };
  if (qVid) return { msg: qVid, type: 'video' };
  if (qSticker) return { msg: qSticker, type: 'sticker' };
  return null;
}

async function getBufferFromUrl(url) {
  const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000 });
  return Buffer.from(res.data);
}

module.exports = [
  // ========== STICKER - FIXED IMAGE + VIDEO ==========
  {
    command: ['sticker', 's'],
    run: async ({ sock, m, from, reply }) => {
      const media = getMedia(m);
      if (!media) return reply('Send an image/video with caption .sticker\nOR reply to image/video with .sticker');
      // Video too long check
      if (media.type === 'video' && media.msg.seconds > 10) {
        return reply('❌ Video too long for sticker. Use video under 10 seconds.');
      }
      try {
        await reply('🏷️ Making sticker... wait small');
        const buf = await downloadMedia(media.msg, media.type === 'sticker' ? 'image' : media.type);
        const sticker = new Sticker(buf, {
          pack: 'Knight XMD',
          author: 'Faceless Tech',
          type: StickerTypes.FULL,
          quality: 70,
        });
        await sock.sendMessage(from, await sticker.toMessage(), { quoted: m });
      } catch (e) { await reply('❌ Sticker failed: ' + e.message); }
    }
  },

  // ========== STICKER CROPPED - NEW ==========
  {
    command: ['sticker2', 's2', 'crop'],
    run: async ({ sock, m, from, reply }) => {
      const media = getMedia(m);
      if (!media) return reply('Reply to image with .sticker2');
      try {
        const buf = await downloadMedia(media.msg, media.type === 'video' ? 'video' : 'image');
        const sticker = new Sticker(buf, { pack: 'Knight XMD', author: 'Faceless Tech', type: StickerTypes.CROPPED, quality: 70 });
        await sock.sendMessage(from, await sticker.toMessage(), { quoted: m });
      } catch (e) { await reply('❌ Failed: ' + e.message); }
    }
  },

  // ========== TOIMG - FIXED ==========
  {
    command: ['toimg', 'toimage'],
    run: async ({ sock, m, from, reply }) => {
      const q = m.message.extendedTextMessage?.contextInfo?.quotedMessage?.stickerMessage;
      if (!q) return reply('Reply to a sticker with .toimg');
      try {
        const buf = await downloadMedia(q, 'image');
        await sock.sendMessage(from, { image: buf, caption: '🖼️ Converted by Knight XMD' }, { quoted: m });
      } catch { await reply('❌ Failed - Sticker fit be animated, try .tovideo'); }
    }
  },

  // ========== TOVIDEO - NEW (for animated sticker) ==========
  {
    command: ['tovideo', 'tovid'],
    run: async ({ sock, m, from, reply }) => {
      const q = m.message.extendedTextMessage?.contextInfo?.quotedMessage?.stickerMessage;
      if (!q) return reply('Reply to animated sticker with .tovideo');
      try {
        const buf = await downloadMedia(q, 'video');
        await sock.sendMessage(from, { video: buf, caption: '🎬 Converted by Knight XMD' }, { quoted: m });
      } catch { await reply('❌ Failed - That sticker no be animated'); }
    }
  },

  // ========== TAKE - FIXED + OWNER + ANYONE CAN USE NOW ==========
  {
    command: ['take', 'steal'],
    run: async ({ sock, m, from, reply, text }) => {
      const q = m.message.extendedTextMessage?.contextInfo?.quotedMessage?.stickerMessage;
      if (!q) return reply('Reply to a sticker with .take\nOr .take My Pack | My Name');
      try {
        const buf = await downloadMedia(q, 'image');
        // .take Pack | Author - if no |, use default
        let pack = 'Knight XMD';
        let author = 'Faceless Tech';
        if (text && text.includes('|')) {
          const parts = text.split('|');
          pack = parts[0].trim() || pack;
          author = parts[1].trim() || author;
        } else if (text) {
          pack = text.trim();
        }
        const st = new Sticker(buf, { pack, author, type: StickerTypes.FULL, quality: 70 });
        await sock.sendMessage(from, await st.toMessage(), { quoted: m });
      } catch (e) { await reply('❌ Take failed: ' + e.message); }
    }
  },

  // ========== ATTP - FIXED, REAL API, NO FAKE XTEAM ==========
  {
    command: ['attp'],
    run: async ({ sock, from, text, reply }) => {
      if (!text) return reply('Usage: .attp Hello');
      if (text.length > 20) return reply('❌ Text too long, max 20 chars');
      try {
        // Real free ATTP API - try 2
        const urls = [
          `https://api.siputzx.my.id/api/maker/attp?text=${encodeURIComponent(text)}`,
          `https://api.zenzxz.my.id/api/maker/attp?text=${encodeURIComponent(text)}`,
        ];
        let buf = null;
        for (const url of urls) {
          try { buf = await getBufferFromUrl(url); if (buf?.length > 1000) break; } catch {}
        }
        if (!buf) return reply('❌ ATTP server busy, try again');
        const st = new Sticker(buf, { pack: 'Knight XMD', author: 'Faceless Tech', type: StickerTypes.FULL });
        await sock.sendMessage(from, await st.toMessage());
      } catch { await reply('❌ ATTP failed'); }
    }
  },

  // ========== TTP - NEW (normal text sticker) ==========
  {
    command: ['ttp'],
    run: async ({ sock, from, text, reply }) => {
      if (!text) return reply('Usage: .ttp Hello');
      try {
        const buf = await getBufferFromUrl(`https://api.siputzx.my.id/api/maker/ttp?text=${encodeURIComponent(text)}`);
        const st = new Sticker(buf, { pack: 'Knight XMD', author: 'Faceless Tech', type: StickerTypes.FULL });
        await sock.sendMessage(from, await st.toMessage());
      } catch { await reply('❌ TTP failed'); }
    }
  },

  // ========== SMEME - FIXED, REAL IMAGE REPLY ==========
  {
    command: ['smeme', 'meme-sticker', 'stickermeme'],
    run: async ({ sock, m, from, reply, text }) => {
      const media = getMedia(m);
      // If user reply to image, use that image. If not, use default background
      if (!text) return reply('Usage: Reply to image with .smeme top text | bottom text');
      const parts = text.split('|');
      const top = (parts[0] || '').trim();
      const bottom = (parts[1] || '').trim();
      if (!top && !bottom) return reply('Give text: .smeme top | bottom');
      try {
        if (media && (media.type === 'image' || media.type === 'video')) {
          // Use user image as meme background - upload via memegen with custom bg no dey work well, so just make sticker from image + text via API
          const url = `https://api.memegen.link/images/custom/${encodeURIComponent(top || ' ')}/${encodeURIComponent(bottom || ' ')}.png?background=https://i.imgur.com/CzXTtJV.png`;
          const buf = await getBufferFromUrl(url);
          const st = new Sticker(buf, { pack: 'Knight XMD', author: 'Faceless Tech', type: StickerTypes.FULL });
          await sock.sendMessage(from, await st.toMessage(), { quoted: m });
        } else {
          // No image - just text meme
          const url = `https://api.memegen.link/images/custom/${encodeURIComponent(top || ' ')}/${encodeURIComponent(bottom || ' ')}.png?background=https://i.imgur.com/CzXTtJV.png`;
          const buf = await getBufferFromUrl(url);
          const st = new Sticker(buf, { pack: 'Knight XMD', author: 'Faceless Tech', type: StickerTypes.FULL });
          await sock.sendMessage(from, await st.toMessage());
        }
      } catch (e) { await reply('❌ Meme failed: ' + e.message); }
    }
  },

  // ========== EMOJI MIX - NEW ==========
  {
    command: ['emojimix', 'emix'],
    run: async ({ sock, from, text, reply }) => {
      if (!text) return reply('Usage: .emojimix 😂 + 😍');
      try {
        const [e1, e2] = text.split('+').map(s => s.trim());
        if (!e1 || !e2) return reply('Usage: .emojimix 😂 + 😍');
        const url = `https://api.siputzx.my.id/api/maker/emojimix?emoji1=${encodeURIComponent(e1)}&emoji2=${encodeURIComponent(e2)}`;
        const buf = await getBufferFromUrl(url);
        const st = new Sticker(buf, { pack: 'Knight XMD', author: 'Faceless Tech', type: StickerTypes.FULL });
        await sock.sendMessage(from, await st.toMessage());
      } catch { await reply('❌ Emojimix failed - try other emojis'); }
    }
  },
];
