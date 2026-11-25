// KNIGHT XMD - Downloader - REAL, NO KEY - FIXED ENDPOINTS
// Primary: siputzx (no key) | Backup: tikwm + cobalt co.wuk.sh
const axios = require('axios');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36';
const SIP = 'https://api.siputzx.my.id/api';

let yts = null;
try { yts = require('yt-search'); } catch { yts = null; }

async function getBuffer(url) {
  const res = await axios.get(url, {
    responseType: 'arraybuffer', timeout: 120000, maxRedirects: 5,
    headers: { 'User-Agent': UA, 'Accept': '*/*' }
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

// ===== REAL YT SEARCH - yt-search, no API =====
async function searchYT(query) {
  if (yts) {
    try {
      const r = await yts(query);
      if (r?.videos?.[0]) return { title: r.videos[0].title, url: r.videos[0].url, timestamp: r.videos[0].timestamp };
    } catch (e) { console.log('[YT SEARCH]', e.message); }
  }
  // Fallback: Invidious search - real endpoint
  try {
    const { data } = await axios.get(`https://inv.nadeko.net/api/v1/search`, { params: { q: query, type: 'video' }, timeout: 15000 });
    if (data?.[0]?.videoId) return { title: data[0].title, url: `https://youtu.be/${data[0].videoId}`, timestamp: 'Unknown' };
  } catch {}
  if (query.includes('http')) return { title: 'YouTube Video', url: query, timestamp: 'Unknown' };
  return null;
}

// ===== REAL COBALT v10 - co.wuk.sh (working instance) =====
async function cobalt(url, isAudio) {
  const { data } = await axios.post('https://co.wuk.sh/api/json', {
    url,
    downloadMode: isAudio ? 'audio' : 'auto',
    videoQuality: '720',
    audioFormat: 'mp3',
    filenamePattern: 'basic'
  }, { headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' }, timeout: 30000 });
  if (data?.status === 'error') throw new Error('cobalt: ' + (data?.error?.code || 'error'));
  if (data?.url) return data.url;
  if (data?.picker?.length) {
    const p = data.picker.find(x => x.url);
    if (p?.url) return p.url;
  }
  throw new Error('cobalt: no url');
}

// ===== REAL YT AUDIO: siputzx -> cobalt =====
async function getYTAudio(url) {
  // TRY 1: siputzx - REAL shape: { status:true, data:{ dl, title } }
  try {
    const { data } = await axios.get(`${SIP}/d/ytmp3?url=${encodeURIComponent(url)}`, { timeout: 60000 });
    const dl = data?.data?.dl || data?.data?.download || data?.data?.url;
    if (dl) return { url: dl, title: data?.data?.title };
  } catch (e) { console.log('[YTMP3 siputzx]', e.message); }
  // TRY 2: cobalt
  const c = await cobalt(url, true);
  return { url: c, title: null };
}
async function getYTVideo(url) {
  try {
    const { data } = await axios.get(`${SIP}/d/ytmp4?url=${encodeURIComponent(url)}`, { timeout: 60000 });
    const dl = data?.data?.dl || data?.data?.download || data?.data?.url;
    if (dl) return { url: dl, title: data?.data?.title };
  } catch (e) { console.log('[YTMP4 siputzx]', e.message); }
  const c = await cobalt(url, false);
  return { url: c, title: null };
}

module.exports = [
  {
    command: ['play', 'song'],
    run: async ({ sock, from, m, reply, text }) => {
      if (!text) return reply('Usage: .play Asake Lonely At The Top');
      await safeRun(reply, async () => {
        await reply('🎵 Searching... wait small');
        let videoUrl = text, title = text;
        if (!text.includes('http')) {
          const v = await searchYT(text);
          if (!v) throw new Error('Not found: "' + text + '" - try full name or YT link');
          videoUrl = v.url; title = v.title;
        }
        await reply(box('🎵 FOUND', [`Title: ${title}`, `Downloading audio...`]));
        const res = await getYTAudio(videoUrl);
        if (res.title) title = res.title;
        const buf = await getBuffer(res.url);
        await sendMedia(sock, from, m, buf, 'audio', '', title);
      });
    }
  },
  {
    command: ['video'],
    run: async ({ sock, from, m, reply, text }) => {
      if (!text) return reply('Usage: .video <youtube link or name>');
      await safeRun(reply, async () => {
        await reply('🎬 Searching video...');
        let url = text, title = 'Knight XMD Video';
        if (!text.includes('http')) {
          const v = await searchYT(text);
          if (!v) throw new Error('Not found: "' + text + '"');
          url = v.url; title = v.title;
        }
        const res = await getYTVideo(url);
        if (res.title) title = res.title;
        const buf = await getBuffer(res.url);
        await sendMedia(sock, from, m, buf, 'video', box('🎬 DOWNLOADED', [title, 'By Knight XMD']), title);
      });
    }
  },
  {
    command: ['tiktok', 'tt'],
    run: async ({ sock, from, m, reply, text }) => {
      if (!text || !text.includes('tiktok')) return reply('Usage: .tiktok <tiktok link>');
      await safeRun(reply, async () => {
        await reply('🎵 Downloading TikTok...');
        let play = null, music = null, lastErr = '';
        // TRY 1: siputzx tiktok - REAL
        try {
          const { data } = await axios.get(`${SIP}/d/tiktok?url=${encodeURIComponent(text)}`, { timeout: 30000 });
          play = data?.data?.play || data?.data?.no_watermark || data?.data?.video || data?.data?.dl;
          music = data?.data?.music || data?.data?.audio;
        } catch (e) { lastErr = e.message; }
        // TRY 2: tikwm - REAL, still works
        if (!play) {
          try {
            const { data } = await axios.get(`https://www.tikwm.com/api/?url=${encodeURIComponent(text)}`, { timeout: 30000 });
            play = data?.data?.play || data?.data?.wmplay; music = data?.data?.music;
          } catch (e) { lastErr += ' | tikwm: ' + e.message; }
        }
        if (!play) throw new Error('TikTok fail: ' + lastErr + '\nMake sure video na PUBLIC');
        const buf = await getBuffer(play);
        await sendMedia(sock, from, m, buf, 'video', '🎵 TikTok by Knight XMD', 'tiktok');
        if (music) { try { const mb = await getBuffer(music); await sendMedia(sock, from, m, mb, 'audio', '', 'tiktok-audio'); } catch {} }
      });
    }
  },
  {
    command: ['instagram', 'ig'],
    run: async ({ sock, from, m, reply, text }) => {
      if (!text || !text.includes('instagram.com')) return reply('Usage: .instagram <instagram reel/post link>');
      await safeRun(reply, async () => {
        await reply('📸 Downloading Instagram...');
        let dl = null, lastErr = '';
        try {
          const { data } = await axios.get(`${SIP}/d/igdl?url=${encodeURIComponent(text)}`, { timeout: 30000 });
          const d = data?.data;
          dl = Array.isArray(d) ? d[0]?.url : (d?.url || d?.dl || d?.download);
        } catch (e) { lastErr = e.message; }
        if (!dl) dl = await cobalt(text, false).catch(e => { lastErr += ' | ' + e.message; return null; });
        if (!dl) throw new Error('Instagram fail: ' + lastErr + '\nMake sure reel na PUBLIC');
        const buf = await getBuffer(dl);
        const isImg = (buf[0] === 0xFF && buf[1] === 0xD8) || (buf[0] === 0x89 && buf[1] === 0x50);
        await sendMedia(sock, from, m, buf, isImg ? 'image' : 'video', '📸 Instagram by Knight XMD', 'instagram');
      });
    }
  },
  {
    command: ['facebook', 'fb'],
    run: async ({ sock, from, m, reply, text }) => {
      if (!text || (!text.includes('facebook.com') && !text.includes('fb.watch'))) return reply('Usage: .facebook <facebook video link>');
      await safeRun(reply, async () => {
        await reply('📘 Downloading Facebook...');
        let dl = null, lastErr = '';
        try {
          const { data } = await axios.get(`${SIP}/d/fbdl?url=${encodeURIComponent(text)}`, { timeout: 30000 });
          dl = data?.data?.hd || data?.data?.sd || data?.data?.url || data?.data?.dl;
        } catch (e) { lastErr = e.message; }
        if (!dl) dl = await cobalt(text, false).catch(e => { lastErr += ' | ' + e.message; return null; });
        if (!dl) throw new Error('Facebook fail: ' + lastErr + '\nMake sure video na PUBLIC');
        const buf = await getBuffer(dl);
        await sendMedia(sock, from, m, buf, 'video', '📘 Facebook by Knight XMD', 'facebook');
      });
    }
  },
  {
    command: ['twitter', 'x', 'twt'],
    run: async ({ sock, from, m, reply, text }) => {
      if (!text || (!text.includes('x.com') && !text.includes('twitter.com'))) return reply('Usage: .twitter <x link>');
      await safeRun(reply, async () => {
        await reply('🐦 Downloading X...');
        let dl = null, lastErr = '';
        try {
          const { data } = await axios.get(`${SIP}/d/twitter?url=${encodeURIComponent(text)}`, { timeout: 30000 });
          const d = data?.data;
          dl = Array.isArray(d) ? d[0]?.url : (d?.url || d?.dl);
        } catch (e) { lastErr = e.message; }
        if (!dl) dl = await cobalt(text, false).catch(e => { lastErr += ' | ' + e.message; return null; });
        if (!dl) throw new Error('X fail: ' + lastErr + '\nMake sure tweet na PUBLIC');
        const buf = await getBuffer(dl);
        await sendMedia(sock, from, m, buf, 'video', '🐦 X by Knight XMD', 'twitter');
      });
    }
  },
  {
    command: ['mediafire', 'mf'],
    run: async ({ sock, from, m, reply, text }) => {
      if (!text || !text.includes('mediafire.com')) return reply('Usage: .mediafire <mediafire link>');
      await safeRun(reply, async () => {
        await reply('📁 Fetching MediaFire...');
        const { data } = await axios.get(`${SIP}/d/mediafire?url=${encodeURIComponent(text)}`, { timeout: 30000 });
        const d = data?.data || data?.result;
        const dl = d?.dl || d?.download || d?.url || d?.link;
        const filename = (d?.filename || d?.title || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
        if (!dl) throw new Error('MediaFire fail: no download link - link fit be expired / password / removed');
        const buf = await getBuffer(dl);
        await sock.sendMessage(from, { document: buf, fileName: filename, mimetype: 'application/octet-stream' }, { quoted: m });
      });
    }
  },
  {
    command: ['apk'],
    run: async ({ reply, text }) => {
      if (!text) return reply('Usage: .apk WhatsApp');
      await safeRun(reply, async () => {
        await reply(`📱 Searching APK for: ${text}...`);
        // REAL: APKPure search page scrape - no API needed
        const { data: html } = await axios.get(`https://apkpure.com/search?q=${encodeURIComponent(text)}`, { timeout: 30000, headers: { 'User-Agent': UA } });
        const htmlStr = typeof html === 'string' ? html : '';
        const first = htmlStr.match(/href="(\/[^"]+\/download[^"]*)"/) || htmlStr.match(/href="(\/[a-z0-9\-]+\/[a-z0-9\-]+)"/i);
        if (!first) throw new Error('APK not found for: ' + text);
        const appUrl = first[1].startsWith('http') ? first[1] : 'https://apkpure.com' + first[1];
        await reply(box('📱 APK FOUND', [`Search: ${text}`, `Link: ${appUrl}`, `Open link to download APK (APKPure block direct bot download)`]));
      });
    }
  },
  {
    command: ['pinterest', 'pin'],
    run: async ({ sock, from, m, reply, text }) => {
      if (!text) return reply('Usage: .pinterest girl baddies');
      await safeRun(reply, async () => {
        await reply(`📌 Downloading 5 images for: ${text}...`);
        let images = [];
        // TRY 1: siputzx pinterest
        try {
          const { data } = await axios.get(`${SIP}/s/pinterest?query=${encodeURIComponent(text)}`, { timeout: 30000 });
          const arr = data?.data || data?.result || [];
          if (Array.isArray(arr)) images = arr.map(x => typeof x === 'string' ? x : (x?.image || x?.url)).filter(Boolean);
        } catch {}
        // TRY 2: Openverse - REAL free, no key
        if (!images.length) {
          try {
            const { data } = await axios.get(`https://api.openverse.org/v1/images/?q=${encodeURIComponent(text)}&page_size=10`, { timeout: 20000 });
            images = (data?.results || []).map(r => r.url).filter(Boolean);
          } catch {}
        }
        images = images.slice(0, 5);
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
        if (!sent) throw new Error('All images fail - network slow, try again');
      });
    }
  },
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
