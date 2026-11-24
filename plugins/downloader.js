// KNIGHT XMD - Downloader - REAL, NO KEY, NO yt-dlp NEEDED
// Primary: davidcyriltech (free, no key) | Backup: tikwm + cobalt v10
const axios = require('axios');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36';
const API = 'https://api.davidcyriltech.my.id';

// ===== BUFFER =====
async function getBuffer(url) {
  const res = await axios.get(url, {
    responseType: 'arraybuffer', timeout: 120000, maxRedirects: 5,
    headers: { 'User-Agent': UA, 'Accept': '*/*', 'Referer': 'https://www.google.com/' }
  });
  if (!res.data || res.data.length < 1000) throw new Error('Empty file from server');
  return Buffer.from(res.data);
}

function box(title, lines) {
  let t = `> ╭══〘 ${title} 〙══⊷❍\n> ┃✯╭──────────────\n`;
  lines.forEach(l => t += `> ┃✯│ ${l}\n`);
  t += `> ┃✯╰───────────────\n> ╰═══════════════════⊷❍`;
  return t;
}

async function sendMedia(sock, from, m, buf, kind, caption, filename) {
  const name = (filename || 'KnightXMD').replace(/[^a-zA-Z0-9 _.-]/g, '').slice(0, 50) || 'KnightXMD';
  if (kind === 'audio') {
    if (buf.length > 16 * 1024 * 1024) return sock.sendMessage(from, { document: buf, fileName: name + '.mp3', mimetype: 'audio/mpeg', caption }, { quoted: m });
    return sock.sendMessage(from, { audio: buf, mimetype: 'audio/mpeg', fileName: name + '.mp3' }, { quoted: m });
  }
  if (kind === 'image') return sock.sendMessage(from, { image: buf, caption }, { quoted: m });
  if (buf.length > 16 * 1024 * 1024) return sock.sendMessage(from, { document: buf, fileName: name + '.mp4', mimetype: 'video/mp4', caption }, { quoted: m });
  return sock.sendMessage(from, { video: buf, caption }, { quoted: m });
}

async function safeRun(reply, fn) {
  try { await fn(); }
  catch (e) {
    console.log('[DL]', e.message);
    await reply(`❌ Download fail:\n${e.message}`);
  }
}

// ===== COBALT v10 - CORRECT FORMAT =====
async function cobaltV10(url, isAudio) {
  // Cobalt v10 endpoint + payload
  const { data } = await axios.post('https://api.cobalt.tools/api/json', {
    url, downloadMode: isAudio ? 'audio' : 'auto',
    videoQuality: '720', audioFormat: 'mp3', filenamePattern: 'basic'
  }, { headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' }, timeout: 30000 });
  if (data?.status === 'error') throw new Error('cobalt: ' + (data?.error?.code || 'error'));
  if (data?.url) return data.url;
  if (data?.picker?.length) {
    const p = data.picker.find(x => x.url) || data.picker[0];
    if (p?.url) return p.url;
  }
  throw new Error('cobalt: no url returned');
}

module.exports = [
  // ===== PLAY / SONG - YOUTUBE AUDIO =====
  {
    command: ['play', 'song'],
    run: async ({ sock, from, m, reply, text }) => {
      if (!text) return reply('Usage: .play Asake Lonely At The Top');
      await safeRun(reply, async () => {
        await reply('🎵 Searching... wait small');
        // 1. Real YT search via davidcyril - no yt-search needed
        let videoUrl = text, title = text;
        if (!text.includes('http')) {
          const { data } = await axios.get(`${API}/search/youtube?q=${encodeURIComponent(text)}`, { timeout: 30000 });
          const v = data?.result?.[0] || data?.results?.[0] || data?.[0];
          if (!v?.url && !v?.link) throw new Error('Not found: "' + text + '" - try full name or YT link');
          videoUrl = v.url || v.link; title = v.title || text;
        }
        await reply(box('🎵 FOUND', [`Title: ${title}`, `Downloading audio...`]));
        // 2. Real ytmp3 - no key
        let dlUrl = null, lastErr = '';
        try {
          const { data } = await axios.get(`${API}/download/ytmp3?url=${encodeURIComponent(videoUrl)}`, { timeout: 60000 });
          dlUrl = data?.result?.download_url || data?.result?.url || data?.download_url || data?.url;
          if (data?.result?.title) title = data.result.title;
        } catch (e) { lastErr = e.message; }
        if (!dlUrl) { // Backup: cobalt v10 audio
          dlUrl = await cobaltV10(videoUrl, true).catch(e => { lastErr += ' | ' + e.message; return null; });
        }
        if (!dlUrl) throw new Error('Audio server fail: ' + lastErr + '\nLink: ' + videoUrl);
        const buf = await getBuffer(dlUrl);
        await sendMedia(sock, from, m, buf, 'audio', '', title);
      });
    }
  },
  // ===== VIDEO - YOUTUBE VIDEO =====
  {
    command: ['video'],
    run: async ({ sock, from, m, reply, text }) => {
      if (!text) return reply('Usage: .video <youtube link or name>');
      await safeRun(reply, async () => {
        await reply('🎬 Searching video...');
        let url = text, title = 'Knight XMD Video';
        if (!text.includes('http')) {
          const { data } = await axios.get(`${API}/search/youtube?q=${encodeURIComponent(text)}`, { timeout: 30000 });
          const v = data?.result?.[0] || data?.results?.[0] || data?.[0];
          if (!v?.url && !v?.link) throw new Error('Not found: "' + text + '"');
          url = v.url || v.link; title = v.title || title;
        }
        let dlUrl = null, lastErr = '';
        try {
          const { data } = await axios.get(`${API}/download/ytmp4?url=${encodeURIComponent(url)}`, { timeout: 60000 });
          dlUrl = data?.result?.download_url || data?.result?.url || data?.download_url || data?.url;
          if (data?.result?.title) title = data.result.title;
        } catch (e) { lastErr = e.message; }
        if (!dlUrl) dlUrl = await cobaltV10(url, false).catch(e => { lastErr += ' | ' + e.message; return null; });
        if (!dlUrl) throw new Error('Video server fail: ' + lastErr + '\nLink: ' + url);
        const buf = await getBuffer(dlUrl);
        await sendMedia(sock, from, m, buf, 'video', box('🎬 DOWNLOADED', [title, 'By Knight XMD']), title);
      });
    }
  },
  // ===== TIKTOK - tikwm na real, still dey work =====
  {
    command: ['tiktok', 'tt'],
    run: async ({ sock, from, m, reply, text }) => {
      if (!text || !text.includes('tiktok')) return reply('Usage: .tiktok <tiktok link>');
      await safeRun(reply, async () => {
        await reply('🎵 Downloading TikTok...');
        let play = null, music = null, lastErr = '';
        try {
          const { data } = await axios.get(`${API}/download/tiktok?url=${encodeURIComponent(text)}`, { timeout: 30000 });
          play = data?.result?.video || data?.result?.play || data?.result?.no_watermark || data?.video;
          music = data?.result?.music || data?.result?.audio;
        } catch (e) { lastErr = e.message; }
        if (!play) { // Backup tikwm
          try {
            const { data } = await axios.get(`https://www.tikwm.com/api/?url=${encodeURIComponent(text)}`, { timeout: 30000 });
            play = data?.data?.play || data?.data?.wmplay; music = data?.data?.music;
          } catch (e) { lastErr += ' | tikwm: ' + e.message; }
        }
        if (!play) throw new Error('TikTok fail: ' + lastErr + '\nMake sure video na PUBLIC, no be private/draft');
        const buf = await getBuffer(play);
        await sendMedia(sock, from, m, buf, 'video', '🎵 TikTok by Knight XMD', 'tiktok');
        if (music) { try { const mb = await getBuffer(music); await sendMedia(sock, from, m, mb, 'audio', '', 'tiktok-audio'); } catch {} }
      });
    }
  },
  // ===== INSTAGRAM =====
  {
    command: ['instagram', 'ig'],
    run: async ({ sock, from, m, reply, text }) => {
      if (!text || !text.includes('instagram.com')) return reply('Usage: .instagram <instagram reel/post link>');
      await safeRun(reply, async () => {
        await reply('📸 Downloading Instagram...');
        let dl = null, lastErr = '';
        try {
          const { data } = await axios.get(`${API}/download/instagram?url=${encodeURIComponent(text)}`, { timeout: 30000 });
          const r = data?.result || data;
          dl = r?.download_url || r?.url || (Array.isArray(r) ? r[0]?.url : null) || r?.video || r?.image;
        } catch (e) { lastErr = e.message; }
        if (!dl) dl = await cobaltV10(text, false).catch(e => { lastErr += ' | ' + e.message; return null; });
        if (!dl) throw new Error('Instagram fail: ' + lastErr + '\nMake sure reel na PUBLIC + no be login-only');
        const buf = await getBuffer(dl);
        const isImg = buf[0] === 0xFF && buf[1] === 0xD8 || buf[0] === 0x89 && buf[1] === 0x50;
        await sendMedia(sock, from, m, buf, isImg ? 'image' : 'video', '📸 Instagram by Knight XMD', 'instagram');
      });
    }
  },
  // ===== FACEBOOK =====
  {
    command: ['facebook', 'fb'],
    run: async ({ sock, from, m, reply, text }) => {
      if (!text || (!text.includes('facebook.com') && !text.includes('fb.watch'))) return reply('Usage: .facebook <facebook video link>');
      await safeRun(reply, async () => {
        await reply('📘 Downloading Facebook...');
        let dl = null, lastErr = '';
        try {
          const { data } = await axios.get(`${API}/download/facebook?url=${encodeURIComponent(text)}`, { timeout: 30000 });
          dl = data?.result?.download_url || data?.result?.url || data?.result?.hd || data?.result?.sd || data?.download_url || data?.url;
        } catch (e) { lastErr = e.message; }
        if (!dl) dl = await cobaltV10(text, false).catch(e => { lastErr += ' | ' + e.message; return null; });
        if (!dl) throw new Error('Facebook fail: ' + lastErr + '\nMake sure video na PUBLIC');
        const buf = await getBuffer(dl);
        await sendMedia(sock, from, m, buf, 'video', '📘 Facebook by Knight XMD', 'facebook');
      });
    }
  },
  // ===== TWITTER / X =====
  {
    command: ['twitter', 'x', 'twt'],
    run: async ({ sock, from, m, reply, text }) => {
      if (!text || (!text.includes('x.com') && !text.includes('twitter.com'))) return reply('Usage: .twitter <x link>');
      await safeRun(reply, async () => {
        await reply('🐦 Downloading X...');
        let dl = null, lastErr = '';
        try {
          const { data } = await axios.get(`${API}/download/twitter?url=${encodeURIComponent(text)}`, { timeout: 30000 });
          dl = data?.result?.download_url || data?.result?.url || data?.download_url || data?.url;
        } catch (e) { lastErr = e.message; }
        if (!dl) dl = await cobaltV10(text, false).catch(e => { lastErr += ' | ' + e.message; return null; });
        if (!dl) throw new Error('X fail: ' + lastErr + '\nMake sure tweet na PUBLIC');
        const buf = await getBuffer(dl);
        await sendMedia(sock, from, m, buf, 'video', '🐦 X by Knight XMD', 'twitter');
      });
    }
  },
  // ===== MEDIAFIRE - REAL API, no HTML guess =====
  {
    command: ['mediafire', 'mf'],
    run: async ({ sock, from, m, reply, text }) => {
      if (!text || !text.includes('mediafire.com')) return reply('Usage: .mediafire <mediafire link>');
      await safeRun(reply, async () => {
        await reply('📁 Fetching MediaFire...');
        const { data } = await axios.get(`${API}/download/mediafire?url=${encodeURIComponent(text)}`, { timeout: 30000 });
        const r = data?.result || data;
        const dl = r?.download_url || r?.url || r?.link;
        const filename = (r?.filename || r?.title || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
        if (!dl) throw new Error('MediaFire fail: ' + (data?.message || 'no download link') + ' - link fit be expired / password / removed');
        const buf = await getBuffer(dl);
        await sock.sendMessage(from, { document: buf, fileName: filename, mimetype: 'application/octet-stream' }, { quoted: m });
      });
    }
  },
  // ===== APK - REAL SEARCH, REAL LINK =====
  {
    command: ['apk'],
    run: async ({ reply, text }) => {
      if (!text) return reply('Usage: .apk WhatsApp');
      await safeRun(reply, async () => {
        await reply(`📱 Searching APK for: ${text}...`);
        const { data } = await axios.get(`${API}/search/apk?q=${encodeURIComponent(text)}`, { timeout: 30000 });
        const r = data?.result?.[0] || data?.results?.[0] || data?.result || data?.[0];
        if (!r) throw new Error('APK not found for: ' + text);
        const dl = r.download_url || r.url || r.link;
        const name = r.name || r.title || text;
        if (dl) await reply(box('📱 APK FOUND', [`App: ${name}`, `Size: ${r.size || 'Unknown'}`, `Download: ${dl}`]));
        else await reply(box('📱 APK FOUND', [`App: ${name}`, `Link: ${r.url || r.link || 'No direct link'}`, `Open link to download`]));
      });
    }
  },
  // ===== PINTEREST - REAL API =====
  {
    command: ['pinterest', 'pin'],
    run: async ({ sock, from, m, reply, text }) => {
      if (!text) return reply('Usage: .pinterest girl baddies');
      await safeRun(reply, async () => {
        await reply(`📌 Downloading 5 images for: ${text}...`);
        const { data } = await axios.get(`${API}/search/pinterest?q=${encodeURIComponent(text)}`, { timeout: 30000 });
        let images = data?.result || data?.results || data || [];
        if (!Array.isArray(images)) images = [images];
        images = images.map(x => typeof x === 'string' ? x : (x?.image || x?.url || x?.download_url)).filter(Boolean).slice(0, 5);
        if (!images.length) throw new Error('No images found for: ' + text);
        let sent = 0;
        for (let i = 0; i < images.length; i++) {
          try {
            const buf = await getBuffer(images[i]);
            if (buf.length < 1000) continue;
            await sock.sendMessage(from, { image: buf, caption: box('📌 PINTEREST', [`Search: ${text}`, `Image ${i + 1} / ${images.length}`, 'By Knight XMD']) }, { quoted: m });
            sent++; await new Promise(r => setTimeout(r, 800));
          } catch {}
        }
        if (!sent) throw new Error('All images fail to download - network slow, try again');
      });
    }
  },
  // ===== GITHUB =====
  {
    command: ['github', 'gh'],
    run: async ({ reply, text }) => {
      if (!text || !text.includes('/')) return reply('Usage: .github username/repo');
      await safeRun(reply, async () => {
        const { data } = await axios.get(`https://api.github.com/repos/${text}`, { headers: { 'User-Agent': 'Knight-XMD' }, timeout: 20000 });
        await reply(box('🐙 GITHUB', [`Repo: ${data.full_name}`, `⭐ Stars: ${data.stargazers_count}`, `🍴 Forks: ${data.forks_count}`, `📝 ${data.description || 'No desc'}`, `🔗 ${data.html_url}`, `Clone: git clone ${data.clone_url}`]));
      });
    }
  },
];
