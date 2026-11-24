// KNIGHT XMD - Downloader - LOCAL, NO KEY - FIXED - Real errors, no placeholder
// By Faceless Tech
const axios = require('axios');
const { spawn } = require('child_process');

let yts = null;
try { yts = require('yt-search'); } catch { yts = null; }

// ===== BUFFER - RETRY, REAL ERROR =====
async function getBuffer(url) {
  let lastErr = null;
  for (let i = 0; i < 3; i++) {
    try {
      const res = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 120000,
        maxContentLength: 100 * 1024 * 1024,
        maxRedirects: 5,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36',
          'Accept': '*/*',
          'Referer': 'https://www.google.com/'
        }
      });
      if (res.data && res.data.length > 1000) return Buffer.from(res.data);
      throw new Error('Empty file from ' + url.slice(0, 60));
    } catch (e) { lastErr = e; await new Promise(r => setTimeout(r, 1500)); }
  }
  throw new Error('getBuffer fail: ' + (lastErr?.message || 'timeout'));
}

// ===== FIX 1+2: yt-dlp via spawn - REAL binary, NO shell injection =====
function ytdlp(url, isAudio) {
  return new Promise((resolve) => {
    const args = isAudio
      ? ['-f', 'bestaudio/best', '-x', '--audio-format', 'mp3', '--audio-quality', '0', '-o', '-', '--no-playlist', '--no-warnings', url]
      : ['-f', 'best[height<=720][ext=mp4]/best[height<=720]/best', '-o', '-', '--no-playlist', '--no-warnings', '--remux-video', 'mp4', url];
    let child;
    try { child = spawn('yt-dlp', args, { timeout: 120000, maxBuffer: 200 * 1024 * 1024 }); }
    catch { return resolve({ buffer: null, error: 'yt-dlp not installed - run: pip install yt-dlp' }); }
    const chunks = [];
    let errTxt = '';
    child.stdout.on('data', d => chunks.push(d));
    child.stderr.on('data', d => { errTxt += d.toString().slice(-500); });
    child.on('error', () => resolve({ buffer: null, error: 'yt-dlp not installed - run: pip install yt-dlp' }));
    child.on('close', (code) => {
      const buf = Buffer.concat(chunks);
      if (code !== 0 || buf.length < 1000) return resolve({ buffer: null, error: errTxt.replace(/\n/g, ' ').slice(0, 200) || 'yt-dlp exit ' + code });
      resolve({ buffer: buf, error: null });
    });
  });
}

// ===== COBALT - FIX: dedupe, check error status =====
async function cobaltDownload(url, isAudioOnly = false) {
  const instances = [
    'https://api.cobalt.tools/api/json',
    'https://co.wuk.sh/api/json',
    'https://cobalt.canine.tools/api/json',
    'https://cobalt-api.kwiatekmiki.com/api/json',
    'https://cobalt.canhazdb.com/api/json'
  ];
  let lastErr = '';
  for (const api of instances) {
    try {
      const { data } = await axios.post(api, {
        url, vCodec: 'h264', vQuality: '720',
        aFormat: isAudioOnly ? 'mp3' : 'best',
        isAudioOnly, filenamePattern: 'basic'
      }, { headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' }, timeout: 25000 });
      if (data?.status === 'error') { lastErr = data?.error?.code || 'cobalt error'; continue; }
      if (data?.url) return { url: data.url, error: null };
      if (data?.status === 'picker' && data?.picker?.length) {
        const pick = data.picker.find(p => p.url && (isAudioOnly ? true : p.type !== 'audio')) || data.picker.find(p => p.url);
        if (pick?.url) return { url: pick.url, error: null };
      }
      if (data?.status === 'redirect' && data?.url) return { url: data.url, error: null };
    } catch (e) { lastErr = e.message; }
  }
  return { url: null, error: lastErr || 'all cobalt instances down' };
}

// ===== UNIVERSAL - TRY ALL, RETURN REAL ERROR =====
async function universalDownload(url, isAudio = false) {
  const errors = [];
  // 1. LOCAL yt-dlp
  const local = await ytdlp(url, isAudio);
  if (local.buffer) return { buffer: local.buffer, source: 'yt-dlp', error: null };
  errors.push('yt-dlp: ' + (local.error || 'fail'));
  // 2. Cobalt
  const c = await cobaltDownload(url, isAudio);
  if (c.url) {
    try { const buf = await getBuffer(c.url); return { buffer: buf, source: 'cobalt', error: null }; }
    catch (e) { errors.push('cobalt-buffer: ' + e.message); }
  } else errors.push('cobalt: ' + c.error);
  // 3. TikWM for TikTok only
  if (url.includes('tiktok')) {
    for (const api of ['https://www.tikwm.com/api/?url=', 'https://api.tikwm.com/api/?url=']) {
      try {
        const { data } = await axios.get(`${api}${encodeURIComponent(url)}`, { timeout: 25000 });
        const d = data?.data;
        const play = isAudio ? d?.music : d?.play || d?.wmplay;
        if (play) {
          const buf = await getBuffer(play);
          return { buffer: buf, source: 'tikwm', extra: d, error: null };
        }
        errors.push('tikwm: ' + (data?.msg || 'no play url'));
      } catch (e) { errors.push('tikwm: ' + e.message); }
    }
  }
  return { buffer: null, source: null, error: errors.join(' | ') };
}

async function searchYT(query) {
  if (yts) {
    try {
      const r = await yts(query);
      if (r?.videos?.[0]) {
        const v = r.videos[0];
        return { title: v.title, url: v.url, timestamp: v.timestamp, views: v.views, author: v.author };
      }
    } catch {}
  }
  const invidious = ['https://inv.nadeko.net', 'https://yewtu.be', 'https://iv.datura.network'];
  for (const base of invidious) {
    try {
      const { data } = await axios.get(`${base}/api/v1/search`, { params: { q: query, type: 'video' }, timeout: 15000 });
      const v = data?.[0];
      if (v?.videoId) return { title: v.title, url: `https://youtu.be/${v.videoId}`, timestamp: 'Unknown', views: v.viewCount || '', author: { name: v.author || '' } };
    } catch {}
  }
  if (query.includes('http')) return { title: 'YouTube Video', url: query, timestamp: 'Unknown', views: '', author: { name: '' } };
  return null;
}

function box(title, lines) {
  let t = `> ╭══〘 ${title} 〙══⊷❍\n> ┃✯╭──────────────\n`;
  lines.forEach(l => t += `> ┃✯│ ${l}\n`);
  t += `> ┃✯╰───────────────\n> ╰═══════════════════⊷❍`;
  return t;
}

// FIX: Detect real type from magic bytes, no be guess
function detectType(buf) {
  if (!buf || buf.length < 4) return 'video';
  if (buf[0] === 0xFF && buf[1] === 0xD8) return 'image';
  if (buf[0] === 0x89 && buf[1] === 0x50) return 'image'; // PNG
  if (buf[0] === 0x47 && buf[1] === 0x49) return 'image'; // GIF
  if (buf.slice(0, 4).toString().includes('ftyp')) return 'video';
  if (buf.slice(0, 3).toString() === 'ID3' || (buf[0] === 0xFF && (buf[1] & 0xE0) === 0xE0)) return 'audio';
  return 'video';
}

// FIX: WhatsApp limit - >16MB video/audio go as document, no fail silently
async function sendMedia(sock, from, m, buf, kind, caption, filename) {
  const name = (filename || 'KnightXMD').replace(/[^a-zA-Z0-9 _.-]/g, '').slice(0, 50) || 'KnightXMD';
  if (kind === 'audio') {
    if (buf.length > 16 * 1024 * 1024) return sock.sendMessage(from, { document: buf, fileName: name + '.mp3', mimetype: 'audio/mpeg', caption }, { quoted: m });
    return sock.sendMessage(from, { audio: buf, mimetype: 'audio/mp4', fileName: name + '.mp3' }, { quoted: m });
  }
  if (kind === 'image') return sock.sendMessage(from, { image: buf, caption }, { quoted: m });
  if (buf.length > 16 * 1024 * 1024) return sock.sendMessage(from, { document: buf, fileName: name + '.mp4', mimetype: 'video/mp4', caption }, { quoted: m });
  return sock.sendMessage(from, { video: buf, caption }, { quoted: m });
}

async function safeRun(reply, fn) {
  try { await fn(); }
  catch (e) {
    console.log('[DL]', e.message);
    // FIX: Real error, no be generic "try again"
    await reply(`❌ Download fail:\n${e.message}\n\nCheck: link na public? / yt-dlp installed? / network?`);
  }
}

module.exports = [
  {
    command: ['play', 'song'],
    run: async ({ sock, from, m, reply, text }) => {
      if (!text) return reply('Usage: .play Asake Lonely At The Top');
      await safeRun(reply, async () => {
        await reply('🎵 Searching... wait small');
        const v = await searchYT(text);
        if (!v) return reply('❌ Not found: "' + text + '"\nTry full name or send YouTube link');
        await reply(box('🎵 FOUND', [`Title: ${v.title}`, `Time: ${v.timestamp}`, `Downloading audio...`]));
        const res = await universalDownload(v.url, true);
        if (!res.buffer) return reply(`❌ Audio fail for: ${v.title}\nReason: ${res.error}\n🔗 ${v.url}`);
        await sendMedia(sock, from, m, res.buffer, 'audio', '', v.title);
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
          if (!v) return reply('❌ Not found: "' + text + '"\nTry full name or send link');
          url = v.url; title = v.title;
        }
        const res = await universalDownload(url, false);
        if (!res.buffer) return reply(`❌ Video fail: ${title}\nReason: ${res.error}\n🔗 ${url}`);
        await sendMedia(sock, from, m, res.buffer, 'video', box('🎬 DOWNLOADED', [title, 'By Knight XMD']), title);
      });
    }
  },
  {
    command: ['tiktok', 'tt'],
    run: async ({ sock, from, m, reply, text }) => {
      if (!text || !text.includes('tiktok')) return reply('Usage: .tiktok <tiktok link>\nMust be tiktok.com link');
      await safeRun(reply, async () => {
        await reply('🎵 Downloading TikTok...');
        const res = await universalDownload(text, false);
        if (!res.buffer) return reply(`❌ TikTok fail\nReason: ${res.error}\nMake sure video na PUBLIC, no be private/draft`);
        await sendMedia(sock, from, m, res.buffer, 'video', '🎵 TikTok by Knight XMD', 'tiktok');
        if (res.extra?.music) {
          try { const mBuf = await getBuffer(res.extra.music); await sendMedia(sock, from, m, mBuf, 'audio', '', 'tiktok-audio'); } catch {}
        }
      });
    }
  },
  {
    command: ['instagram', 'ig'],
    run: async ({ sock, from, m, reply, text }) => {
      if (!text || !text.includes('instagram.com')) return reply('Usage: .instagram <instagram reel/post link>');
      await safeRun(reply, async () => {
        await reply('📸 Downloading Instagram...');
        const res = await universalDownload(text, false);
        if (!res.buffer) return reply(`❌ Instagram fail\nReason: ${res.error}\nMake sure reel na PUBLIC + no be login-only`);
        const kind = detectType(res.buffer);
        await sendMedia(sock, from, m, res.buffer, kind, '📸 Instagram by Knight XMD', 'instagram');
      });
    }
  },
  {
    command: ['facebook', 'fb'],
    run: async ({ sock, from, m, reply, text }) => {
      if (!text || !text.includes('facebook.com') && !text.includes('fb.watch')) return reply('Usage: .facebook <facebook video link>');
      await safeRun(reply, async () => {
        await reply('📘 Downloading Facebook...');
        const res = await universalDownload(text, false);
        if (!res.buffer) return reply(`❌ Facebook fail\nReason: ${res.error}\nMake sure video na PUBLIC`);
        await sendMedia(sock, from, m, res.buffer, 'video', '📘 Facebook by Knight XMD', 'facebook');
      });
    }
  },
  {
    command: ['twitter', 'x', 'twt'],
    run: async ({ sock, from, m, reply, text }) => {
      if (!text || (!text.includes('x.com') && !text.includes('twitter.com'))) return reply('Usage: .twitter <x link>');
      await safeRun(reply, async () => {
        await reply('🐦 Downloading X...');
        const res = await universalDownload(text, false);
        if (!res.buffer) return reply(`❌ X fail\nReason: ${res.error}\nMake sure tweet na PUBLIC`);
        await sendMedia(sock, from, m, res.buffer, 'video', '🐦 X by Knight XMD', 'twitter');
      });
    }
  },
  {
    command: ['mediafire', 'mf'],
    run: async ({ sock, from, m, reply, text }) => {
      if (!text || !text.includes('mediafire.com')) return reply('Usage: .mediafire <mediafire link>');
      await safeRun(reply, async () => {
        await reply('📁 Fetching MediaFire...');
        const { data: html } = await axios.get(text, { timeout: 30000, headers: { 'User-Agent': 'Mozilla/5.0' } });
        const htmlStr = typeof html === 'string' ? html : '';
        const linkMatch = htmlStr.match(/href="(https:\/\/download[^"]+)"/) || htmlStr.match(/download_url[^"]*"[^"]*(https:[^"\\]+)/);
        const nameMatch = htmlStr.match(/<div class="dl-btn-label"[^>]*>([^<]+)</) || htmlStr.match(/<title>([^<]+) - MediaFire/);
        if (!linkMatch) throw new Error('MediaFire: no download button found - link fit be expired / password / removed');
        const dl = linkMatch[1].replace(/\\u002F/g, '/');
        const filename = (nameMatch?.[1]?.trim() || 'file.zip').replace(/[^a-zA-Z0-9._-]/g, '_');
        const buf = await getBuffer(dl);
        await sock.sendMessage(from, { document: buf, fileName: filename, mimetype: 'application/octet-stream' }, { quoted: m });
      });
    }
  },
  {
    command: ['apk'],
    run: async ({ sock, from, m, reply, text }) => {
      if (!text) return reply('Usage: .apk WhatsApp');
      await safeRun(reply, async () => {
        await reply(`📱 Searching APK for: ${text}...`);
        // REAL: APKPure search page -> first result -> download page
        const { data: html } = await axios.get(`https://apkpure.com/search?q=${encodeURIComponent(text)}`, { timeout: 30000, headers: { 'User-Agent': 'Mozilla/5.0' } });
        const htmlStr = typeof html === 'string' ? html : '';
        const first = htmlStr.match(/href="(\/[^"]+\/download[^"]*)"/) || htmlStr.match(/href="(\/[a-z0-9\-]+\/[a-z0-9\-]+)"/i);
        if (!first) throw new Error('APK not found for: ' + text);
        const appUrl = first[1].startsWith('http') ? first[1] : 'https://apkpure.com' + first[1];
        await reply(box('📱 APK FOUND', [`Search: ${text}`, `Link: ${appUrl}`, `Open link to download APK (APKPure block direct bot download)`]));
      });
    }
  },
  {
    command: ['pinterest', 'pinterests', 'pin'],
    run: async ({ sock, from, m, reply, text }) => {
      if (!text) return reply('Usage: .pinterest girl baddies');
      await safeRun(reply, async () => {
        await reply(`📌 Downloading 5 images for: ${text}... wait small`);
        let images = [];
        try {
          const { data } = await axios.get(`https://api.openverse.org/v1/images/?q=${encodeURIComponent(text)}&page_size=10`, { timeout: 20000 });
          if (data?.results?.length) images = data.results.filter(r => r.url).slice(0, 5).map(r => r.url);
        } catch (e) { console.log('Openverse fail:', e.message); }
        if (images.length === 0) {
          try {
            const { data } = await axios.get(`https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrsearch=${encodeURIComponent(text)}&gsrnamespace=6&gsrlimit=10&prop=imageinfo&iiprop=url&origin=*`, { timeout: 20000 });
            const pages = Object.values(data?.query?.pages || {});
            images = pages.filter(p => p.imageinfo?.[0]?.url).slice(0, 5).map(p => p.imageinfo[0].url);
          } catch {}
        }
        if (images.length === 0) throw new Error('No images found for: ' + text);
        let sent = 0;
        for (let i = 0; i < images.length; i++) {
          try {
            const buf = await getBuffer(images[i]);
            if (!buf || buf.length < 1000) continue;
            await sock.sendMessage(from, { image: buf, caption: box('📌 PINTEREST', [`Search: ${text}`, `Image ${i + 1} / ${images.length}`, 'By Knight XMD']) }, { quoted: m });
            sent++;
            await new Promise(r => setTimeout(r, 800));
          } catch {}
        }
        if (sent === 0) throw new Error('All 5 images fail to download - network slow');
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
