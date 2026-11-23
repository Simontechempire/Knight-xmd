// KNIGHT XMD - Downloader - Fixed with Cobalt (Free, No Key)
// By Faceless Tech - Cobalt supports YT, TikTok, IG, FB, Twitter
const axios = require('axios');

let yts = null;
try { yts = require('yt-search'); } catch { yts = null; }

async function getBuffer(url) {
  const res = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 120000,
    maxContentLength: 100 * 1024 * 1024, // 100MB max - WhatsApp limit
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
  });
  return Buffer.from(res.data);
}

// ===== COBALT - Universal Downloader, No Key =====
async function cobaltDownload(url, isAudioOnly = false) {
  const instances = [
    'https://api.cobalt.tools/api/json',
    'https://co.wuk.sh/api/json',
    'https://cobalt.canine.tools/api/json'
  ];
  for (const api of instances) {
    try {
      const { data } = await axios.post(api, {
        url,
        vCodec: 'h264',
        vQuality: '720',
        aFormat: isAudioOnly ? 'mp3' : 'best',
        isAudioOnly,
        filenamePattern: 'basic'
      }, {
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        timeout: 60000
      });
      // Cobalt returns { status: 'stream'|'redirect', url: '...' }
      if (data?.url) return data.url;
      if (data?.status === 'picker' && data?.picker?.[0]?.url) return data.picker[0].url;
    } catch (e) { console.log('[Cobalt fail]', api, e.message); }
  }
  return null;
}

// ===== YouTube Search - Invidious (Free, No Key) =====
async function searchYT(query) {
  // 1. yt-search if installed
  if (yts) {
    try {
      const r = await yts(query);
      if (r?.videos?.[0]) {
        const v = r.videos[0];
        return { title: v.title, url: v.url, timestamp: v.timestamp, views: v.views, thumbnail: v.thumbnail, author: v.author };
      }
    } catch {}
  }
  // 2. Invidious search - free, no key
  const invidious = [
    'https://inv.nadeko.net',
    'https://invidious.privacyredirect.com',
    'https://iv.datura.network',
    'https://yewtu.be'
  ];
  for (const base of invidious) {
    try {
      const { data } = await axios.get(`${base}/api/v1/search`, {
        params: { q: query, type: 'video' },
        timeout: 20000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      const v = data?.[0];
      if (v?.videoId) {
        return {
          title: v.title,
          url: `https://youtu.be/${v.videoId}`,
          timestamp: v.lengthSeconds ? `${Math.floor(v.lengthSeconds/60)}:${String(v.lengthSeconds%60).padStart(2,'0')}` : 'Unknown',
          views: v.viewCount?.toLocaleString() || '',
          thumbnail: `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
          author: { name: v.author || '' }
        };
      }
    } catch {}
  }
  // 3. If query na direct link, return am
  if (query.includes('youtu') || query.includes('youtube')) {
    return { title: 'YouTube Video', url: query, timestamp: 'Unknown', views: '', thumbnail: '' };
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
  // ===== PLAY - YouTube Audio =====
  {
    command: ['play', 'song'],
    run: async ({ sock, from, m, reply, text }) => {
      if (!text) return reply('Usage: .play Asake Lonely At The Top');
      await reply('🎵 Searching... wait small');
      try {
        const v = await searchYT(text);
        if (!v) return reply('❌ Not found, try another name or send YouTube link\nExample: .play Asake Lonely');
        await reply(box('🎵 FOUND', [`Title: ${v.title}`, `Time: ${v.timestamp}`, `Views: ${v.views}`, `Downloading audio...`]));
        // FIX: Cobalt for audio
        const mp3Url = await cobaltDownload(v.url, true);
        if (!mp3Url) return reply(`🎵 *${v.title}*\n🔗 ${v.url}\n\n❌ Audio server busy, try again in 1 min`);
        const buf = await getBuffer(mp3Url);
        await sock.sendMessage(from, { audio: buf, mimetype: 'audio/mp4', fileName: `${v.title.replace(/[^a-zA-Z0-9 ]/g,'')}.mp3` }, { quoted: m });
      } catch (e) { await reply('❌ Play failed: ' + e.message); }
    }
  },
  // ===== VIDEO - YouTube Video =====
  {
    command: ['video'],
    run: async ({ sock, from, m, reply, text }) => {
      if (!text) return reply('Usage: .video <youtube link or name>');
      await reply('🎬 Searching video...');
      try {
        let url = text, title = 'Knight XMD Video';
        if (!text.includes('http')) {
          const v = await searchYT(text);
          if (!v) return reply('❌ Not found');
          url = v.url; title = v.title;
        }
        const mp4Url = await cobaltDownload(url, false);
        if (!mp4Url) return reply(`🎬 ${title}\n🔗 ${url}\n\n❌ Video server busy, try again`);
        const buf = await getBuffer(mp4Url);
        await sock.sendMessage(from, { video: buf, caption: box('🎬 DOWNLOADED', [title, 'By Knight XMD']) }, { quoted: m });
      } catch (e) { await reply('❌ Video failed: ' + e.message); }
    }
  },
  // ===== TIKTOK - Cobalt + TikWM backup =====
  {
    command: ['tiktok', 'tt'],
    run: async ({ sock, from, m, reply, text }) => {
      if (!text) return reply('Usage: .tiktok <tiktok link>');
      await reply('🎵 Downloading TikTok...');
      try {
        // 1. Cobalt first - most stable
        const cobaltUrl = await cobaltDownload(text, false);
        if (cobaltUrl) {
          const buf = await getBuffer(cobaltUrl);
          return await sock.sendMessage(from, { video: buf, caption: '🎵 TikTok by Knight XMD' }, { quoted: m });
        }
        // 2. TikWM backup
        const { data } = await axios.get(`https://api.tikwm.com/api/?url=${encodeURIComponent(text)}`, { timeout: 30000 });
        const d = data.data;
        if (!d?.play) return reply('❌ TikTok not found, check link - must be public video');
        const buf = await getBuffer(d.play);
        await sock.sendMessage(from, { video: buf, caption: box('🎵 TIKTOK', [`👤 @${d.author?.nickname || 'Unknown'}`, `📝 ${(d.title || '').slice(0,100)}`, 'By Knight XMD']) }, { quoted: m });
        if (d.music) {
          try { const mBuf = await getBuffer(d.music); await sock.sendMessage(from, { audio: mBuf, mimetype: 'audio/mp4' }, { quoted: m }); } catch {}
        }
      } catch (e) { await reply('❌ TikTok failed: ' + e.message); }
    }
  },
  // ===== INSTAGRAM - Cobalt =====
  {
    command: ['instagram', 'ig'],
    run: async ({ sock, from, m, reply, text }) => {
      if (!text) return reply('Usage: .instagram <link>');
      await reply('📸 Downloading Instagram...');
      try {
        const dl = await cobaltDownload(text, false);
        if (!dl) return reply(`📸 Link: ${text}\n❌ Instagram server busy - make sure reel is public, not private`);
        const buf = await getBuffer(dl);
        try { await sock.sendMessage(from, { image: buf, caption: '📸 Instagram by Knight XMD' }, { quoted: m }); }
        catch { await sock.sendMessage(from, { video: buf, caption: '📸 Instagram by Knight XMD' }, { quoted: m }); }
      } catch (e) { await reply('❌ Instagram failed: ' + e.message); }
    }
  },
  // ===== FACEBOOK - Cobalt =====
  {
    command: ['facebook', 'fb'],
    run: async ({ sock, from, m, reply, text }) => {
      if (!text) return reply('Usage: .facebook <link>');
      await reply('📘 Downloading Facebook...');
      try {
        const dl = await cobaltDownload(text, false);
        if (!dl) return reply(`📘 Link: ${text}\n❌ FB server busy - make sure video is public`);
        const buf = await getBuffer(dl);
        await sock.sendMessage(from, { video: buf, caption: '📘 Facebook by Knight XMD' }, { quoted: m });
      } catch (e) { await reply('❌ Facebook failed: ' + e.message); }
    }
  },
  // ===== TWITTER / X - NEW, Cobalt =====
  {
    command: ['twitter', 'x', 'twt'],
    run: async ({ sock, from, m, reply, text }) => {
      if (!text) return reply('Usage: .twitter <x link>');
      await reply('🐦 Downloading X...');
      try {
        const dl = await cobaltDownload(text, false);
        if (!dl) return reply('❌ X failed - make sure tweet is public');
        const buf = await getBuffer(dl);
        await sock.sendMessage(from, { video: buf, caption: '🐦 X by Knight XMD' }, { quoted: m });
      } catch { await reply('❌ X failed'); }
    }
  },
  // ===== MEDIAFIRE - Direct scrape, no API =====
  {
    command: ['mediafire', 'mf'],
    run: async ({ sock, from, m, reply, text }) => {
      if (!text) return reply('Usage: .mediafire <link>');
      await reply('📁 Fetching MediaFire...');
      try {
        const { data: html } = await axios.get(text, { timeout: 30000, headers: { 'User-Agent': 'Mozilla/5.0' } });
        const linkMatch = html.match(/href="(https:\/\/download[^"]+)"/);
        const nameMatch = html.match(/<div class="dl-btn-label"[^>]*>([^<]+)</);
        if (!linkMatch) return reply(`📁 Link: ${text}\nOpen link to download`);
        const dl = linkMatch[1];
        const filename = (nameMatch?.[1]?.trim() || 'file.zip').replace(/[^a-zA-Z0-9._-]/g, '_');
        await reply(box('📁 MEDIAFIRE', [`Name: ${filename}`, 'Downloading...']));
        const buf = await getBuffer(dl);
        await sock.sendMessage(from, { document: buf, fileName: filename, mimetype: 'application/octet-stream' }, { quoted: m });
      } catch { await reply(`📁 Link: ${text}`); }
    }
  },
  // ===== APK - Direct APKPure search link =====
  {
    command: ['apk'],
    run: async ({ sock, from, m, reply, text }) => {
      if (!text) return reply('Usage: .apk WhatsApp');
      await reply('📱 Searching APK...');
      try {
        // Use APKCombo API - free, no key
        const { data } = await axios.get(`https://api.apkcombo.com/v1/search?q=${encodeURIComponent(text)}`, { timeout: 20000 }).catch(() => ({ data: null }));
        await reply(box('📱 APK', [`Search: ${text}`, `Link: https://apkpure.com/search?q=${encodeURIComponent(text)}`, `Or: https://play.google.com/store/search?q=${encodeURIComponent(text)}`]));
      } catch { await reply(`📱 https://apkpure.com/search?q=${encodeURIComponent(text)}`); }
    }
  },
  // ===== PINTEREST - Auto Download 5 PFP =====
{
  command: ['pinterest', 'pinterests', 'pin'],
  run: async ({ sock, from, m, reply, text }) => {
    if (!text) return reply('Usage: .pinterest girl baddies\nOr .pin cat\nOr .pinterest anime girl');
    await reply(`📌 Downloading 5 pfp for: ${text}... wait small`);
    try {
      let images = [];

      // 1. Openverse - Free, No Key - get 5 images
      try {
        const { data } = await axios.get(`https://api.openverse.org/v1/images/?q=${encodeURIComponent(text)}&page_size=10`, { timeout: 20000 });
        if (data?.results?.length) {
          images = data.results.filter(r => r.url).slice(0, 5).map(r => r.url);
        }
      } catch {}

      // 2. Fallback - Wikimedia - if Openverse give 0
      if (images.length === 0) {
        try {
          const { data } = await axios.get(`https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrsearch=${encodeURIComponent(text)}&gsrnamespace=6&gsrlimit=10&prop=imageinfo&iiprop=url&origin=*`, { timeout: 20000 });
          const pages = Object.values(data?.query?.pages || {});
          images = pages.filter(p => p.imageinfo?.[0]?.url).slice(0, 5).map(p => p.imageinfo[0].url);
        } catch {}
      }

      if (images.length === 0) return reply('❌ No pfp found, try another word\nExample: .pinterest girl');

      // 3. Download and send all one by one
      let sent = 0;
      for (let i = 0; i < images.length; i++) {
        try {
          const buf = await getBuffer(images[i]);
          if (!buf || buf.length < 1000) continue;
          await sock.sendMessage(from, { image: buf, caption: box('📌 PINTEREST', [`Search: ${text}`, `PFP ${i + 1} / ${images.length}`, 'By Knight XMD']) }, { quoted: m });
          sent++;
          // Small delay so WhatsApp no block am as spam
          await new Promise(r => setTimeout(r, 800));
        } catch {}
      }

      if (sent === 0) return reply('❌ Download failed, try again');
      // No extra reply, images don already send

    } catch (e) {
      await reply('❌ Pinterest failed, try again');
    }
  },
},
  // ===== GITHUB =====
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
