// KNIGHT XMD - Screenshot - SS
// By Faceless Tech
const axios = require('axios');

async function getBuffer(url) {
  const res = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 60000,
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
  });
  return Buffer.from(res.data);
}

module.exports = [
  {
    command: ['ss', 'screenshot', 'shot', 'webshot'],
    run: async ({ sock, from, m, text, reply }) => {
      if (!text) return reply('Usage: .ss https://google.com\n\nExample:\n.ss google.com\n.ss youtube.com');

      try {
        let url = text.trim().split(' ')[0];
        if (!url.startsWith('http')) url = 'https://' + url;

        await reply('📸 Taking screenshot... wait small');

        // Free screenshot API - no key needed
        const shotUrl = `https://image.thum.io/get/width/1280/crop/900/noanimate/${url}`;

        let buf = null;
        try { buf = await getBuffer(shotUrl); } catch {}

        // Fallback API 2
        if (!buf || buf.length < 1000) {
          try { buf = await getBuffer(`https://mini.s-shot.ru/1280x720/JPEG/1280/Z100/?${url}`); } catch {}
        }

        if (!buf || buf.length < 1000) return reply('❌ Screenshot failed - try another link');

        await sock.sendMessage(from, {
          image: buf,
          caption: `📸 *SCREENSHOT*\n\n🔗 Link: ${url}\n\nBy Knight XMD ⚔️`
        }, { quoted: m });

      } catch (e) { await reply('❌ Failed: ' + e.message); }
    }
  },
  {
    command: ['ssfull', 'fullshot'],
    run: async ({ sock, from, m, text, reply }) => {
      if (!text) return reply('Usage: .ssfull https://google.com');
      try {
        let url = text.trim().split(' ')[0];
        if (!url.startsWith('http')) url = 'https://' + url;
        await reply('📸 Taking full screenshot...');
        const shotUrl = `https://image.thum.io/get/width/1280/fullpage/${url}`;
        const buf = await getBuffer(shotUrl);
        if (!buf || buf.length < 1000) return reply('❌ Screenshot failed');
        await sock.sendMessage(from, { image: buf, caption: `📸 *FULL SCREENSHOT*\n\n🔗 ${url}\n\nBy Knight XMD ⚔️` }, { quoted: m });
      } catch (e) { await reply('❌ Failed: ' + e.message); }
    }
  },
];
