// KNIGHT XMD - Downloader - Real File Download - FIXED
// By Faceless Tech
const axios = require('axios');

// FIXED: yt-search optional - if e no dey, bot no go crash, e go use API fallback
let yts = null;
try { yts = require('yt-search'); } catch { yts = null; }

const LOCAL_KEY = process.env.DOWNLOAD_API_KEY || process.env.YT_API_KEY || '';
const TIKWM_KEY = process.env.TIKWM_KEY || '';

// Helper: download file as buffer
async function getBuffer(url) {
  const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 60000, headers: { 'User-Agent': 'Mozilla/5.0' } });
  return Buffer.from(res.data);
}

// FIXED: Safe YouTube search - try yt-search first, then API fallback
async function searchYT(query) {
  // 1. Try yt-search if installed
  if (yts) {
    try {
      const r = await yts(query);
      if (r?.videos?.[0]) {
        const v = r.videos[0];
        return { title: v.title, url: v.url, timestamp: v.timestamp, views: v.views, thumbnail: v.thumbnail, author: v.author };
      }
    } catch {}
  }
  // 2. Fallback - free API search
  const apis = [
    `https://api.siputzx.my.id/api/search/youtube?query=${encodeURIComponent(query)}`,
    `https://api.zenzxz.my.id/api/search/yt?query=${encodeURIComponent(query)}`,
  ];
  for (const api of apis) {
    try {
      const { data } = await axios.get(api, { timeout: 20000 });
      const list = data?.result || data?.data || data?.result?.videos || [];
      const v = Array.isArray(list) ? list[0] : list;
      if (v && (v.url || v.videoId)) {
        return {
          title: v.title || query,
          url: v.url || `https://youtu.be/${v.videoId}`,
          timestamp: v.duration || v.timestamp || 'Unknown',
          views: v.views || '',
          thumbnail: v.thumbnail || v.image || '',
          author: v.author || {},
        };
      }
    } catch {}
  }
  return null;
}

// Helper: try many free YT MP3 APIs, return download url
async function getYtMp3(ytUrl) {
  const apis = [
    `https://api.siputzx.my.id/api/d/ytmp3?url=${encodeURIComponent(ytUrl)}`,
    `https://api.zenzxz.my.id/api/download/ytmp3?url=${encodeURIComponent(ytUrl)}`,
    `https://api.davidcyriltech.my.id/download/ytmp3?url=${encodeURIComponent(ytUrl)}`,
    LOCAL_KEY ? `https://api.your-local-api.com/ytmp3?apikey=${LOCAL_KEY}&url=${encodeURIComponent(ytUrl)}` : null,
  ].filter(Boolean);
  for (const api of apis) {
    try {
      const { data } = await axios.get(api, { timeout: 30000 });
      const url = data?.result?.download || data?.download || data?.data?.download || data?.url || data?.result?.url || data?.data?.url;
      if (url) return url;
    } catch {}
  }
  return null;
}

async function getYtMp4(ytUrl) {
  const apis = [
    `https://api.siputzx.my.id/api/d/ytmp4?url=${encodeURIComponent(ytUrl)}`,
    `https://api.zenzxz.my.id/api/download/ytmp4?url=${encodeURIComponent(ytUrl)}`,
    `https://api.davidcyriltech.my.id/download/ytmp4?url=${encodeURIComponent(ytUrl)}`,
    LOCAL_KEY ? `https://api.your-local-api.com/ytmp4?apikey=${LOCAL_KEY}&url=${encodeURIComponent(ytUrl)}` : null,
  ].filter(Boolean);
  for (const api of apis) {
    try {
      const { data } = await axios.get(api, { timeout: 30000 });
      const url = data?.result?.download || data?.download || data?.data?.download || data?.url || data?.result?.url || data?.data?.url;
      if (url) return url;
    } catch {}
  }
  return null;
}

function box(title, lines) {
  let t = `> ╭══〘 ${title} 〙══⊷❍\n> ┃✯╭──────────────\n`;
  lines.forEach(l => t += `> ┃✯│ ${l}\n`);
  t += `> ┃✯╰───────────────\n> ╰═══════════════════⊷❍`;
  return t;
}

module.exports = [
  {
    command: ['play', 'song'],
    run: async ({ sock, from, m, reply, text }) => {
      if (!text) return reply('Usage: .play Asake Lonely At The Top');
      await reply('🎵 Searching... wait small');
      try {
        const v = await searchYT(text); // FIXED: was yts(text)
        if (!v) return reply('❌ Not found');
        await reply(box('🎵 FOUND', [`Title: ${v.title}`, `Time: ${v.timestamp}`, `Views: ${v.views}`, `Downloading audio...`]));
        const mp3Url = await getYtMp3(v.url);
        if (!mp3Url) {
          return reply(`🎵 *${v.title}*\n🔗 ${v.url}\n\n❌ Audio server busy, try .video ${v.url} or try again`);
        }
        const buf = await getBuffer(mp3Url);
        await sock.sendMessage(from, { audio: buf, mimetype: 'audio/mp4', fileName: `${v.title}.mp3` }, { quoted: m });
        if (v.thumbnail) {
          try { await sock.sendMessage(from, { image: { url: v.thumbnail }, caption: box('🎵 DOWNLOADED', [`${v.title}`, `By Knight XMD`]) }); } catch {}
        }
      } catch (e) { await reply('❌ Play failed: ' + e.message); }
    }
  },
  {
    command: ['video'],
    run: async ({ sock, from, m, reply, text }) => {
      if (!text) return reply('Usage: .video <youtube link or name>');
      await reply('🎬 Searching video...');
      try {
        let url = text;
        let title = 'Knight XMD Video';
        if (!text.includes('http')) {
          const v = await searchYT(text); // FIXED: was yts(text)
          if (!v) return reply('❌ Not found');
          url = v.url; title = v.title;
        }
        const mp4Url = await getYtMp4(url);
        if (!mp4Url) return reply(`🎬 ${title}\n🔗 ${url}\n\n❌ Video server busy, try again`);
        const buf = await getBuffer(mp4Url);
        await sock.sendMessage(from, { video: buf, caption: box('🎬 DOWNLOADED', [title, 'By Knight XMD']) }, { quoted: m });
      } catch (e) { await reply('❌ Video failed: ' + e.message); }
    }
  },
  {
    command: ['tiktok', 'tt'],
    run: async ({ sock, from, m, reply, text }) => {
      if (!text) return reply('Usage: .tiktok <tiktok link>');
      await reply('🎵 Downloading TikTok...');
      try {
        const { data } = await axios.get(`https://api.tikwm.com/api/?url=${encodeURIComponent(text)}`, { timeout: 30000 });
        const d = data.data;
        if (!d?.play) return reply('❌ TikTok not found');
        const buf = await getBuffer(d.play);
        await sock.sendMessage(from, { video: buf, caption: box('🎵 TIKTOK', [`👤 @${d.author?.nickname || 'Unknown'}`, `📝 ${d.title || ''}`, 'By Knight XMD']) }, { quoted: m });
        if (d.music) {
          try {
            const mBuf = await getBuffer(d.music);
            await sock.sendMessage(from, { audio: mBuf, mimetype: 'audio/mp4' }, { quoted: m });
          } catch {}
        }
      } catch { await reply('❌ TikTok failed, check link'); }
    }
  },
  {
    command: ['instagram', 'ig'],
    run: async ({ sock, from, m, reply, text }) => {
      if (!text) return reply('Usage: .instagram <link>');
      await reply('📸 Downloading Instagram...');
      try {
        const apis = [
          `https://api.siputzx.my.id/api/d/igdl?url=${encodeURIComponent(text)}`,
          `https://api.zenzxz.my.id/api/download/igdl?url=${encodeURIComponent(text)}`,
        ];
        let dl = null;
        for (const api of apis) {
          try {
            const { data } = await axios.get(api, { timeout: 30000 });
            dl = data?.result?.[0]?.url || data?.data?.[0]?.url || data?.result?.url;
            if (dl) break;
          } catch {}
        }
        if (!dl) return reply(`📸 Link: ${text}\n❌ Instagram server busy, open link to download`);
        const buf = await getBuffer(dl);
        try { await sock.sendMessage(from, { image: buf, caption: '📸 Instagram by Knight XMD' }, { quoted: m }); }
        catch { await sock.sendMessage(from, { video: buf, caption: '📸 Instagram by Knight XMD' }, { quoted: m }); }
      } catch { await reply('❌ Instagram failed'); }
    }
  },
  {
    command: ['facebook', 'fb'],
    run: async ({ sock, from, m, reply, text }) => {
      if (!text) return reply('Usage: .facebook <link>');
      await reply('📘 Downloading Facebook...');
      try {
        const { data } = await axios.get(`https://api.siputzx.my.id/api/d/fbdl?url=${encodeURIComponent(text)}`, { timeout: 30000 });
        const dl = data?.result?.hd || data?.result?.sd || data?.data?.hd;
        if (!dl) return reply(`📘 Link: ${text}\n❌ FB server busy, open link`);
        const buf = await getBuffer(dl);
        await sock.sendMessage(from, { video: buf, caption: '📘 Facebook by Knight XMD' }, { quoted: m });
      } catch { await reply('❌ Facebook failed'); }
    }
  },
  {
    command: ['mediafire', 'mf'],
    run: async ({ sock, from, m, reply, text }) => {
      if (!text) return reply('Usage: .mediafire <link>');
      await reply('📁 Fetching MediaFire...');
      try {
        const { data } = await axios.get(`https://api.siputzx.my.id/api/d/mediafire?url=${encodeURIComponent(text)}`, { timeout: 30000 });
        const d = data?.result || data?.data;
        if (!d?.link) return reply(`📁 Link: ${text}\nOpen link to download`);
        await reply(box('📁 MEDIAFIRE', [`Name: ${d.filename || 'File'}`, `Size: ${d.size || 'Unknown'}`, 'Downloading...']));
        const buf = await getBuffer(d.link);
        await sock.sendMessage(from, { document: buf, fileName: d.filename || 'file.zip', mimetype: 'application/octet-stream' }, { quoted: m });
      } catch { await reply(`📁 Link: ${text}`); }
    }
  },
  {
    command: ['apk'],
    run: async ({ sock, from, m, reply, text }) => {
      if (!text) return reply('Usage: .apk WhatsApp');
      await reply('📱 Searching APK...');
      try {
        const { data } = await axios.get(`https://api.siputzx.my.id/api/d/apk?query=${encodeURIComponent(text)}`, { timeout: 30000 }).catch(() => ({ data: null }));
        const d = data?.result || data?.data;
        if (d?.download) {
          await reply(box('📱 APK FOUND', [`Name: ${d.name || text}`, `Size: ${d.size || ''}`, 'Downloading...']));
          const buf = await getBuffer(d.download);
          await sock.sendMessage(from, { document: buf, fileName: `${text}.apk`, mimetype: 'application/vnd.android.package-archive' }, { quoted: m });
        } else {
          await reply(box('📱 APK', [`Search: ${text}`, `Link: https://apkpure.com/search?q=${encodeURIComponent(text)}`, `Or: https://play.google.com/store/search?q=${encodeURIComponent(text)}`]));
        }
      } catch { await reply(`📱 https://apkpure.com/search?q=${encodeURIComponent(text)}`); }
    }
  },
  {
    command: ['pinterest', 'pin'],
    run: async ({ sock, from, m, reply, text }) => {
      if (!text) return reply('Usage: .pinterest cat');
      await reply('📌 Searching Pinterest...');
      try {
        const { data } = await axios.get(`https://api.siputzx.my.id/api/d/pinterest?query=${encodeURIComponent(text)}`, { timeout: 30000 });
        const list = data?.result || data?.data || [];
        if (!list.length) return reply('❌ No image found');
        const pick = list[Math.floor(Math.random() * Math.min(list.length, 5))];
        const imgUrl = pick?.image || pick?.url || pick;
        const buf = await getBuffer(imgUrl);
        await sock.sendMessage(from, { image: buf, caption: box('📌 PINTEREST', [`Search: ${text}`, 'By Knight XMD']) }, { quoted: m });
      } catch { await reply(`📌 https://pinterest.com/search/pins/?q=${encodeURIComponent(text)}`); }
    }
  },
  {
    command: ['github', 'gh'],
    run: async ({ reply, text }) => {
      if (!text) return reply('Usage: .github username/repo');
      try {
        const { data } = await axios.get(`https://api.github.com/repos/${text}`, { headers: { 'User-Agent': 'Knight-XMD' }, timeout: 20000 });
        await reply(box('🐙 GITHUB', [`Repo: ${data.full_name}`, `⭐ Stars: ${data.stargazers_count}`, `🍴 Forks: ${data.forks_count}`, `📝 ${data.description || 'No desc'}`, `🔗 ${data.html_url}`, `Clone: git clone ${data.clone_url}`]));
      } catch { await reply(`🐙 https://github.com/${text}`); }
    }
  },
];
