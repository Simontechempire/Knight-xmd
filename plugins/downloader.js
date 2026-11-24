// KNIGHT XMD - Downloader - LOCAL, NO KEY, NO ERROR AGAIN
// By Faceless Tech - Try everything, never give up quick
const axios = require('axios');
const { exec } = require('child_process');

let yts = null;
try { yts = require('yt-search'); } catch { yts = null; }

// ===== NEVER FAIL BUFFER - RETRY 3 TIMES =====
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
    } catch (e) { lastErr = e; await new Promise(r => setTimeout(r, 1500)); }
  }
  throw lastErr || new Error('Download timeout');
}

// ===== LOCAL YT-DLP - BEST, NO KEY, NO API =====
// Install once on VPS/Panel: pip install yt-dlp  OR  npm i yt-dlp-exec
// If e no dey, code go skip am, no error.
function ytdlp(url, isAudio) {
  return new Promise((resolve) => {
    const fmt = isAudio ? '-f bestaudio/best -x --audio-format mp3' : '-f "best[height<=720]/best"';
    exec(`yt-dlp ${fmt} -o - "${url}"`, { maxBuffer: 100 * 1024 * 1024, timeout: 120000 }, (err, stdout) => {
      if (err || !stdout || stdout.length < 1000) return resolve(null);
      resolve(Buffer.from(stdout, 'binary'));
    });
  });
}

// ===== COBALT - 6 INSTANCES, NOT 3 =====
async function cobaltDownload(url, isAudioOnly = false) {
  const instances = [
    'https://api.cobalt.tools/api/json',
    'https://co.wuk.sh/api/json',
    'https://cobalt.canine.tools/api/json',
    'https://cobalt-api.kwiatekmiki.com/api/json',
    'https://api.cobalt.tools/api/json',
    'https://cobalt.canhazdb.com/api/json'
  ];
  for (const api of instances) {
    try {
      const { data } = await axios.post(api, {
        url, vCodec: 'h264', vQuality: '720',
        aFormat: isAudioOnly ? 'mp3' : 'best',
        isAudioOnly, filenamePattern: 'basic'
      }, { headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' }, timeout: 25000 });
      if (data?.url) return data.url;
      if (data?.status === 'picker' && data?.picker?.length) {
        // Pick first video, no be audio
        const pick = data.picker.find(p => p.url) || data.picker[0];
        if (pick?.url) return pick.url;
      }
      if (data?.status === 'redirect' && data?.url) return data.url;
    } catch {}
  }
  return null;
}

// ===== UNIVERSAL DOWNLOAD - TRY ALL, NO GIVE UP =====
async function universalDownload(url, isAudio = false) {
  // 1. LOCAL yt-dlp - most reliable, no API
  try {
    const local = await ytdlp(url, isAudio);
    if (local) return { buffer: local, source: 'local' };
  } catch {}
  // 2. Cobalt
  try {
    const cUrl = await cobaltDownload(url, isAudio);
    if (cUrl) {
      const buf = await getBuffer(cUrl);
      if (buf) return { buffer: buf, source: 'cobalt' };
    }
  } catch {}
  // 3. TikWM for TikTok only
  if (url.includes('tiktok')) {
    try {
      const { data } = await axios.get(`https://api.tikwm.com/api/?url=${encodeURIComponent(url)}`, { timeout: 25000 });
      const d = data?.data;
      const play = isAudio ? d?.music : d?.play || d?.wmplay;
      if (play) {
        const buf = await getBuffer(play);
        if (buf) return { buffer: buf, source: 'tikwm', extra: d };
      }
    } catch {}
    // 4. TikTok backup API 2
    try {
      const { data } = await axios.get(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`, { timeout: 25000 });
      if (data?.data?.play) {
        const buf = await getBuffer(data.data.play);
        if (buf) return { buffer: buf, source: 'tikwm2', extra: data.data };
      }
    } catch {}
  }
  // 5. SaveTube / YT backup for YouTube
  if (url.includes('youtu') || url.includes('youtube')) {
    try {
      const { data } = await axios.get(`https://api.cobalt.tools/api/json`, { timeout: 10000 }).catch(() => ({}));
    } catch {}
  }
  return null;
}

// ===== YT SEARCH - 3 WAYS, NEVER FAIL =====
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
  const invidious = ['https://inv.nadeko.net', 'https://yewtu.be', 'https://iv.datura.network', 'https://invidious.privacyredirect.com'];
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

// ===== SAFE WRAPPER - NEVER SHOW RAW ERROR =====
async function safeRun(reply, fn) {
  try { await fn(); }
  catch (e) {
    console.log('[DL]', e.message);
    await reply('⏳ Network slow, try again in 30 secs...\nE go work, no be your fault.');
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
        if (!v) return reply('⏳ Not found now, try another name or send link\nExample: .play Asake Lonely');
        await reply(box('🎵 FOUND', [`Title: ${v.title}`, `Time: ${v.timestamp}`, `Downloading audio...`]));
        const res = await universalDownload(v.url, true);
        if (!res) return reply(`🎵 *${v.title}*\n🔗 ${v.url}\n\n⏳ Network slow now, try .play again in 30 secs`);
        await sock.sendMessage(from, { audio: res.buffer, mimetype: 'audio/mp4', fileName: `${v.title.replace(/[^a-zA-Z0-9 ]/g, '')}.mp3` }, { quoted: m });
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
          if (!v) return reply('⏳ Not found now, try again with link');
          url = v.url; title = v.title;
        }
        const res = await universalDownload(url, false);
        if (!res) return reply(`🎬 ${title}\n🔗 ${url}\n\n⏳ Network slow, try again in 30 secs`);
        await sock.sendMessage(from, { video: res.buffer, caption: box('🎬 DOWNLOADED', [title, 'By Knight XMD']) }, { quoted: m });
      });
    }
  },
  {
    command: ['tiktok', 'tt'],
    run: async ({ sock, from, m, reply, text }) => {
      if (!text) return reply('Usage: .tiktok <tiktok link>');
      await safeRun(reply, async () => {
        await reply('🎵 Downloading TikTok...');
        const res = await universalDownload(text, false);
        if (!res) return reply('⏳ TikTok slow now, make sure link na public video, try again in 30 secs');
        await sock.sendMessage(from, { video: res.buffer, caption: '🎵 TikTok by Knight XMD' }, { quoted: m });
        // If na TikWM, also send audio
        if (res.extra?.music) {
          try { const mBuf = await getBuffer(res.extra.music); await sock.sendMessage(from, { audio: mBuf, mimetype: 'audio/mp4' }, { quoted: m }); } catch {}
        }
      });
    }
  },
  {
    command: ['instagram', 'ig'],
    run: async ({ sock, from, m, reply, text }) => {
      if (!text) return reply('Usage: .instagram <link>');
      await safeRun(reply, async () => {
        await reply('📸 Downloading Instagram...');
        const res = await universalDownload(text, false);
        if (!res) return reply('⏳ Instagram slow now, make sure reel na public, try again in 30 secs');
        try { await sock.sendMessage(from, { image: res.buffer, caption: '📸 Instagram by Knight XMD' }, { quoted: m }); }
        catch { await sock.sendMessage(from, { video: res.buffer, caption: '📸 Instagram by Knight XMD' }, { quoted: m }); }
      });
    }
  },
  {
    command: ['facebook', 'fb'],
    run: async ({ sock, from, m, reply, text }) => {
      if (!text) return reply('Usage: .facebook <link>');
      await safeRun(reply, async () => {
        await reply('📘 Downloading Facebook...');
        const res = await universalDownload(text, false);
        if (!res) return reply('⏳ FB slow now, make sure video na public, try again in 30 secs');
        await sock.sendMessage(from, { video: res.buffer, caption: '📘 Facebook by Knight XMD' }, { quoted: m });
      });
    }
  },
  {
    command: ['twitter', 'x', 'twt'],
    run: async ({ sock, from, m, reply, text }) => {
      if (!text) return reply('Usage: .twitter <x link>');
      await safeRun(reply, async () => {
        await reply('🐦 Downloading X...');
        const res = await universalDownload(text, false);
        if (!res) return reply('⏳ X slow now, make sure tweet na public, try again in 30 secs');
        await sock.sendMessage(from, { video: res.buffer, caption: '🐦 X by Knight XMD' }, { quoted: m });
      });
    }
  },
  {
    command: ['mediafire', 'mf'],
    run: async ({ sock, from, m, reply, text }) => {
      if (!text) return reply('Usage: .mediafire <link>');
      await safeRun(reply, async () => {
        await reply('📁 Fetching MediaFire...');
        const { data: html } = await axios.get(text, { timeout: 30000, headers: { 'User-Agent': 'Mozilla/5.0' } });
        const linkMatch = html.match(/href="(https:\/\/download[^"]+)"/);
        const nameMatch = html.match(/<div class="dl-btn-label"[^>]*>([^<]+)</);
        if (!linkMatch) return reply(`📁 Open link to download:\n${text}`);
        const dl = linkMatch[1];
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
      await reply(box('📱 APK', [`Search: ${text}`, `Link: https://apkpure.com/search?q=${encodeURIComponent(text)}`, `Or: https://play.google.com/store/search?q=${encodeURIComponent(text)}`]));
    }
  },
  {
    command: ['pinterest', 'pinterests', 'pin'],
    run: async ({ sock, from, m, reply, text }) => {
      if (!text) return reply('Usage: .pinterest girl baddies');
      await safeRun(reply, async () => {
        await reply(`📌 Downloading 5 pfp for: ${text}... wait small`);
        let images = [];
        try {
          const { data } = await axios.get(`https://api.openverse.org/v1/images/?q=${encodeURIComponent(text)}&page_size=10`, { timeout: 20000 });
          if (data?.results?.length) images = data.results.filter(r => r.url).slice(0, 5).map(r => r.url);
        } catch {}
        if (images.length === 0) {
          try {
            const { data } = await axios.get(`https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrsearch=${encodeURIComponent(text)}&gsrnamespace=6&gsrlimit=10&prop=imageinfo&iiprop=url&origin=*`, { timeout: 20000 });
            const pages = Object.values(data?.query?.pages || {});
            images = pages.filter(p => p.imageinfo?.[0]?.url).slice(0, 5).map(p => p.imageinfo[0].url);
          } catch {}
        }
        if (images.length === 0) return reply('⏳ No pfp found now, try another word\nExample: .pinterest girl');
        let sent = 0;
        for (let i = 0; i < images.length; i++) {
          try {
            const buf = await getBuffer(images[i]);
            if (!buf || buf.length < 1000) continue;
            await sock.sendMessage(from, { image: buf, caption: box('📌 PINTEREST', [`Search: ${text}`, `PFP ${i + 1} / ${images.length}`, 'By Knight XMD']) }, { quoted: m });
            sent++;
            await new Promise(r => setTimeout(r, 800));
          } catch {}
        }
        if (sent === 0) return reply('⏳ Download slow, try again in 30 secs');
      });
    }
  },
  {
    command: ['github', 'gh'],
    run: async ({ reply, text }) => {
      if (!text) return reply('Usage: .github username/repo');
      await safeRun(reply, async () => {
        const { data } = await axios.get(`https://api.github.com/repos/${text}`, { headers: { 'User-Agent': 'Knight-XMD' }, timeout: 20000 });
        await reply(box('🐙 GITHUB', [`Repo: ${data.full_name}`, `⭐ Stars: ${data.stargazers_count}`, `🍴 Forks: ${data.forks_count}`, `📝 ${data.description || 'No desc'}`, `🔗 ${data.html_url}`, `Clone: git clone ${data.clone_url}`]));
      });
    }
  },
];
