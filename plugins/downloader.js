// KNIGHT XMD - Downloader - REAL - No Demo, No Placeholder, No Guessing
const axios = require('axios');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36';
const SIP = 'https://api.siputzx.my.id/api';

let yts = null;
try { yts = require('yt-search'); } catch { yts = null; }

// Bold keyboard style
function bold(str) {
  const A = '𝐀𝐁𝐂𝐃𝐄𝐅𝐆𝐇𝐈𝐉𝐊𝐋𝐌𝐍𝐎𝐏𝐐𝐑𝐒𝐓𝐔𝐕𝐖𝐗𝐘𝐙';
  const a = '𝐚𝐛𝐜𝐝𝐞𝐟𝐠𝐡𝐢𝐣𝐤𝐥𝐦𝐧𝐨𝐩𝐪𝐫𝐬𝐭𝐮𝐯𝐰𝐱𝐲𝐳';
  const n = '𝟎𝟏𝟐𝟑𝟒𝟓𝟔𝟕𝟖𝟗';
  const map = {};
  for (let i = 0; i < 26; i++) { map[String.fromCharCode(65+i)] = A[i]; map[String.fromCharCode(97+i)] = a[i]; }
  for (let i = 0; i < 10; i++) map[String(i)] = n[i];
  return String(str).split('').map(c => map[c] || c).join('');
}

async function getBuffer(url) {
  const res = await axios.get(url, {
    responseType: 'arraybuffer', timeout: 120000, maxRedirects: 5,
    headers: { 'User-Agent': UA, 'Accept': '*/*' }
  });
  if (!res.data || res.data.length < 1000) throw new Error('The file is empty.');
  return Buffer.from(res.data);
}

function box(title, lines) {
  let t = `> ╭══〘 ${bold(title)} 〙══⊷❍\n> ┃✯╭──────────────\n`;
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
    await reply(`❌ ${bold('Download Failed:')} ${e.message}`);
  }
}

// LOCAL: Extract first real URL from any response shape - no guessing
function pickUrl(obj) {
  if (!obj) return null;
  if (typeof obj === 'string' && obj.startsWith('http')) return obj;
  if (Array.isArray(obj)) { for (const x of obj) { const u = pickUrl(x); if (u) return u; } return null; }
  if (typeof obj === 'object') {
    for (const k of ['dl','download','url','link','play','no_watermark','video','hd','sd','music','audio']) {
      if (typeof obj[k] === 'string' && obj[k].startsWith('http')) return obj[k];
    }
    for (const v of Object.values(obj)) { const u = pickUrl(v); if (u) return u; }
  }
  return null;
}

async function searchYT(query) {
  if (yts) {
    try {
      const r = await yts(query);
      if (r?.videos?.[0]) return { title: r.videos[0].title, url: r.videos[0].url };
    } catch (e) { console.log('[YT SEARCH]', e.message); }
  }
  try {
    const { data } = await axios.get('https://inv.nadeko.net/api/v1/search', { params: { q: query, type: 'video' }, timeout: 15000 });
    if (data?.[0]?.videoId) return { title: data[0].title, url: `https://youtu.be/${data[0].videoId}` };
  } catch {}
  if (query.includes('http')) return { title: 'YouTube Video', url: query };
  return null;
}

async function cobalt(url, isAudio) {
  const { data } = await axios.post('https://co.wuk.sh/api/json', {
    url, downloadMode: isAudio ? 'audio' : 'auto', videoQuality: '720', audioFormat: 'mp3', filenamePattern: 'basic'
  }, { headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' }, timeout: 30000 });
  if (data?.status === 'error') throw new Error('Server error: ' + (data?.error?.code || 'Unknown error'));
  const u = pickUrl(data);
  if (!u) throw new Error('Server did not return a download link.');
  return u;
}

async function getYTAudio(url) {
  try {
    const { data } = await axios.get(`${SIP}/d/ytmp3?url=${encodeURIComponent(url)}`, { timeout: 60000 });
    const dl = pickUrl(data?.data);
    if (dl) return { url: dl, title: data?.data?.title };
  } catch (e) { console.log('[YTMP3]', e.message); }
  const c = await cobalt(url, true);
  return { url: c, title: null };
}
async function getYTVideo(url) {
  try {
    const { data } = await axios.get(`${SIP}/d/ytmp4?url=${encodeURIComponent(url)}`, { timeout: 60000 });
    const dl = pickUrl(data?.data);
    if (dl) return { url: dl, title: data?.data?.title };
  } catch (e) { console.log('[YTMP4]', e.message); }
  const c = await cobalt(url, false);
  return { url: c, title: null };
}

module.exports = [
  {
    command: ['play', 'song'],
    run: async ({ sock, from, m, reply, text }) => {
      if (!text) return reply(`❌ ${bold('Usage:')} .play Asake Lonely At The Top`);
      await safeRun(reply, async () => {
        await reply(`🎵 ${bold('Searching. Please wait...')}`);
        let videoUrl = text, title = text;
        if (!text.includes('http')) {
          const v = await searchYT(text);
          if (!v) throw new Error(`Not found: "${text}". Please try the full name or a YouTube link.`);
          videoUrl = v.url; title = v.title;
        }
        await reply(box('🎵 FOUND', [`${bold('Title:')} ${title}`, bold('Downloading audio...')]));
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
      if (!text) return reply(`❌ ${bold('Usage:')} .video <YouTube link or name>`);
      await safeRun(reply, async () => {
        await reply(`🎬 ${bold('Searching video. Please wait...')}`);
        let url = text, title = 'Knight XMD Video';
        if (!text.includes('http')) {
          const v = await searchYT(text);
          if (!v) throw new Error(`Not found: "${text}"`);
          url = v.url; title = v.title;
        }
        const res = await getYTVideo(url);
        if (res.title) title = res.title;
        const buf = await getBuffer(res.url);
        await sendMedia(sock, from, m, buf, 'video', box('🎬 DOWNLOADED', [title, bold('By Knight XMD')]), title);
      });
    }
  },
  {
    command: ['tiktok', 'tt'],
    run: async ({ sock, from, m, reply, text }) => {
      if (!text || !text.includes('tiktok')) return reply(`❌ ${bold('Usage:')} .tiktok <TikTok link>`);
      await safeRun(reply, async () => {
        await reply(`🎵 ${bold('Downloading TikTok. Please wait...')}`);
        let play = null, music = null, lastErr = '';
        try {
          const { data } = await axios.get(`${SIP}/d/tiktok?url=${encodeURIComponent(text)}`, { timeout: 30000 });
          play = pickUrl(data?.data); music = data?.data?.music;
        } catch (e) { lastErr = e.message; }
        if (!play) {
          try {
            const { data } = await axios.get(`https://www.tikwm.com/api/?url=${encodeURIComponent(text)}`, { timeout: 30000 });
            play = data?.data?.play || data?.data?.wmplay; music = data?.data?.music;
          } catch (e) { lastErr += ' | ' + e.message; }
        }
        if (!play) throw new Error('TikTok failed. ' + lastErr + ' Please make sure the video is public.');
        const buf = await getBuffer(play);
        await sendMedia(sock, from, m, buf, 'video', `🎵 ${bold('TikTok by Knight XMD')}`, 'tiktok');
        if (music) { try { const mb = await getBuffer(music); await sendMedia(sock, from, m, mb, 'audio', '', 'tiktok-audio'); } catch {} }
      });
    }
  },
  {
    command: ['instagram', 'ig'],
    run: async ({ sock, from, m, reply, text }) => {
      if (!text || !text.includes('instagram.com')) return reply(`❌ ${bold('Usage:')} .instagram <Instagram reel/post link>`);
      await safeRun(reply, async () => {
        await reply(`📸 ${bold('Downloading Instagram. Please wait...')}`);
        let dl = null, lastErr = '';
        try {
          const { data } = await axios.get(`${SIP}/d/igdl?url=${encodeURIComponent(text)}`, { timeout: 30000 });
          dl = pickUrl(data?.data);
        } catch (e) { lastErr = e.message; }
        if (!dl) dl = await cobalt(text, false).catch(e => { lastErr += ' | ' + e.message; return null; });
        if (!dl) throw new Error('Instagram failed. ' + lastErr + ' Please make sure the reel is public.');
        const buf = await getBuffer(dl);
        const isImg = (buf[0] === 0xFF && buf[1] === 0xD8) || (buf[0] === 0x89 && buf[1] === 0x50);
        await sendMedia(sock, from, m, buf, isImg ? 'image' : 'video', `📸 ${bold('Instagram by Knight XMD')}`, 'instagram');
      });
    }
  },
  {
    command: ['facebook', 'fb'],
    run: async ({ sock, from, m, reply, text }) => {
      if (!text || (!text.includes('facebook.com') && !text.includes('fb.watch'))) return reply(`❌ ${bold('Usage:')} .facebook <Facebook video link>`);
      await safeRun(reply, async () => {
        await reply(`📘 ${bold('Downloading Facebook. Please wait...')}`);
        let dl = null, lastErr = '';
        try {
          const { data } = await axios.get(`${SIP}/d/fbdl?url=${encodeURIComponent(text)}`, { timeout: 30000 });
          dl = pickUrl(data?.data);
        } catch (e) { lastErr = e.message; }
        if (!dl) dl = await cobalt(text, false).catch(e => { lastErr += ' | ' + e.message; return null; });
        if (!dl) throw new Error('Facebook failed. ' + lastErr + ' Please make sure the video is public.');
        const buf = await getBuffer(dl);
        await sendMedia(sock, from, m, buf, 'video', `📘 ${bold('Facebook by Knight XMD')}`, 'facebook');
      });
    }
  },
  {
    command: ['twitter', 'x', 'twt'],
    run: async ({ sock, from, m, reply, text }) => {
      if (!text || (!text.includes('x.com') && !text.includes('twitter.com'))) return reply(`❌ ${bold('Usage:')} .twitter <X link>`);
      await safeRun(reply, async () => {
        await reply(`🐦 ${bold('Downloading X. Please wait...')}`);
        let dl = null, lastErr = '';
        try {
          const { data } = await axios.get(`${SIP}/d/twitter?url=${encodeURIComponent(text)}`, { timeout: 30000 });
          dl = pickUrl(data?.data);
        } catch (e) { lastErr = e.message; }
        if (!dl) dl = await cobalt(text, false).catch(e => { lastErr += ' | ' + e.message; return null; });
        if (!dl) throw new Error('X failed. ' + lastErr + ' Please make sure the post is public.');
        const buf = await getBuffer(dl);
        await sendMedia(sock, from, m, buf, 'video', `🐦 ${bold('X by Knight XMD')}`, 'twitter');
      });
    }
  },
  {
    command: ['mediafire', 'mf'],
    run: async ({ sock, from, m, reply, text }) => {
      if (!text || !text.includes('mediafire.com')) return reply(`❌ ${bold('Usage:')} .mediafire <MediaFire link>`);
      await safeRun(reply, async () => {
        await reply(`📁 ${bold('Fetching MediaFire. Please wait...')}`);
        const { data } = await axios.get(`${SIP}/d/mediafire?url=${encodeURIComponent(text)}`, { timeout: 30000 });
        const d = data?.data || data?.result;
        const dl = pickUrl(d);
        const filename = (d?.filename || d?.title || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
        if (!dl) throw new Error('MediaFire failed: No download link found. The link may be expired, password protected, or removed.');
        const buf = await getBuffer(dl);
        await sock.sendMessage(from, { document: buf, fileName: filename, mimetype: 'application/octet-stream' }, { quoted: m });
      });
    }
  },
  {
    command: ['apk'],
    run: async ({ sock, from, m, reply, text }) => {
      if (!text) return reply(`❌ ${bold('Usage:')} .apk WhatsApp`);
      await safeRun(reply, async () => {
        await reply(`📱 ${bold('Searching APK for:')} ${text}...`);
        // REMOVED fake APKPure scrape - it only guessed HTML and never downloaded.
        // REAL: Use APKPure direct search via siputzx, fallback to link
        let dl = null, appName = text;
        try {
          const { data } = await axios.get(`${SIP}/d/apk?query=${encodeURIComponent(text)}`, { timeout: 30000 });
          dl = pickUrl(data?.data); appName = data?.data?.title || text;
        } catch {}
        if (!dl) {
          // Honest fallback - do not fake a download
          return reply(box('📱 APK', [`${bold('Search:')} ${text}`, `${bold('Download:')} https://apkpure.com/search?q=${encodeURIComponent(text)}`, bold('Open the link to download the APK.')]));
        }
        const buf = await getBuffer(dl);
        await sock.sendMessage(from, { document: buf, fileName: appName.replace(/[^a-zA-Z0-9]/g,'_') + '.apk', mimetype: 'application/vnd.android.package-archive', caption: `📱 ${bold(appName)}` }, { quoted: m });
      });
    }
  },
  {
    command: ['pinterest', 'pin'],
    run: async ({ sock, from, m, reply, text }) => {
      if (!text) return reply(`❌ ${bold('Usage:')} .pinterest girl baddies`);
      await safeRun(reply, async () => {
        await reply(`📌 ${bold('Downloading 5 images for:')} ${text}...`);
        let images = [];
        try {
          const { data } = await axios.get(`${SIP}/s/pinterest?query=${encodeURIComponent(text)}`, { timeout: 30000 });
          const arr = data?.data || data?.result || [];
          if (Array.isArray(arr)) images = arr.map(x => typeof x === 'string' ? x : (x?.image || x?.url)).filter(Boolean);
        } catch {}
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
            await sock.sendMessage(from, { image: buf, caption: box('📌 PINTEREST', [`${bold('Search:')} ${text}`, `${bold('Image')} ${i + 1} / ${images.length}`, bold('By Knight XMD')]) }, { quoted: m });
            sent++; await new Promise(r => setTimeout(r, 800));
          } catch {}
        }
        if (!sent) throw new Error('All images failed. The network is slow. Please try again.');
      });
    }
  },
  {
    command: ['github', 'gh'],
    run: async ({ reply, text }) => {
      if (!text || !text.includes('/')) return reply(`❌ ${bold('Usage:')} .github username/repo`);
      await safeRun(reply, async () => {
        const { data } = await axios.get(`https://api.github.com/repos/${text}`, { headers: { 'User-Agent': 'Knight-XMD' }, timeout: 20000 });
        await reply(box('🐙 GITHUB', [`${bold('Repo:')} ${data.full_name}`, `⭐ ${bold('Stars:')} ${data.stargazers_count}`, `🍴 ${bold('Forks:')} ${data.forks_count}`, `📝 ${data.description || 'No description'}`, `🔗 ${data.html_url}`, `${bold('Clone:')} git clone ${data.clone_url}`]));
      });
    }
  },
];
