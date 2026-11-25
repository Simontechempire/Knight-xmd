// KNIGHT XMD - Anime - REAL, NO KEY
// Removed all fake fallback URLs. Only verified endpoints.
// Jikan v4 + AniList + waifu.pics + waifu.im + nekos.best + animechan.xyz

const axios = require('axios');

async function getJson(url, timeout = 15000) {
  const res = await axios.get(url, {
    timeout, maxRedirects: 5,
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Knight-XMD' }
  });
  return res.data;
}

function box(title, lines) {
  let t = `> ╭══〘 ${title} 〙══⊷❍\n> ┃✯╭──────────────\n`;
  lines.forEach(l => t += `> ┃✯│ ${l}\n`);
  t += `> ┃✯╰───────────────\n> ╰═══════════════════⊷❍`;
  return t;
}

async function sendImage(sock, from, m, url, caption) {
  const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000, headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.data || res.data.length < 1000) throw new Error('Empty image');
  await sock.sendMessage(from, { image: Buffer.from(res.data), caption }, { quoted: m });
}

async function sendVideo(sock, from, m, url, caption) {
  const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000, headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.data || res.data.length < 1000) throw new Error('Empty video');
  // nekos.best returns .gif - WhatsApp need video + gifPlayback
  const isGif = url.toLowerCase().endsWith('.gif');
  await sock.sendMessage(from, { video: Buffer.from(res.data), caption, gifPlayback: isGif, mimetype: isGif ? 'video/mp4' : 'video/mp4' }, { quoted: m });
}

// REAL waifu.pics SFW categories - from waifu.pics docs
const WAIFU_CATS = ['waifu','neko','shinobu','megumin','bully','cuddle','cry','hug','awoo','kiss','lick','pat','smug','bonk','yeet','blush','smile','wave','highfive','handhold','nom','bite','glomp','slap','kill','kick','happy','wink','poke','dance','cringe'];
// REAL nekos.best v2 categories - from nekos.best docs
const NEKOS_CATS = ['baka','bite','blush','bored','cry','cuddle','dance','facepalm','feed','happy','highfive','hug','kiss','laugh','lurk','nod','nom','nope','pat','peck','poke','pout','shrug','sip','slap','sleep','smile','smug','stare','think','thumbsup','tickle','wave','wink','yeet'];
// REAL waifu.im tags - only these work
const WAIFUIM_TAGS = ['waifu','neko','maid','uniform','oppai','selfie'];

const NSFW_BLOCK = ['hentai','porn','sex','xxx','pussy','dick','nude'];

module.exports = [
  // ========== .anime ==========
  {
    command: ['anime', 'animesearch', 'mal'],
    run: async ({ reply, text, sock, from, m }) => {
      if (!text) return reply('Usage: .anime Naruto');
      if (NSFW_BLOCK.some(w => text.toLowerCase().includes(w))) return reply('❌ No NSFW');
      // 1. Jikan - REAL https://api.jikan.moe/v4/anime
      try {
        const data = await getJson(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(text)}&limit=1`);
        const a = data.data?.[0];
        if (a) {
          const cap = box('🎌 ANIME', [
            `Title: ${a.title}`,
            `Japanese: ${a.title_japanese || 'N/A'}`,
            `⭐ Score: ${a.score || 'N/A'} | Rank #${a.rank || 'N/A'}`,
            `📺 Episodes: ${a.episodes || 'N/A'} | ${a.status || ''}`,
            `📅 Aired: ${a.aired?.string || 'N/A'}`,
            `🎭 Genres: ${(a.genres || []).map(g => g.name).join(', ') || 'N/A'}`,
            `🏢 Studio: ${(a.studios || []).map(s => s.name).join(', ') || 'N/A'}`,
            ``,
            `${(a.synopsis || '').slice(0, 400)}`,
          ]);
          if (a.images?.jpg?.large_image_url) {
            try { await sendImage(sock, from, m, a.images.jpg.large_image_url, cap); return; } catch {}
          }
          return reply(cap);
        }
      } catch (e) { console.log('[ANIME Jikan]', e.response?.status || e.message); }

      // 2. AniList GraphQL - REAL https://graphql.anilist.co
      try {
        const { data } = await axios.post('https://graphql.anilist.co', {
          query: `query($s:String){ Page(perPage:1){ media(search:$s,type:ANIME){ title{romaji english native} averageScore episodes status genres studios{nodes{name}} description } } }`,
          variables: { s: text }
        }, { timeout: 15000, headers: { 'Content-Type': 'application/json' } });
        const a = data?.data?.Page?.media?.[0];
        if (a) {
          return reply(box('🎌 ANIME', [
            `Title: ${a.title.english || a.title.romaji}`,
            `Japanese: ${a.title.native || 'N/A'}`,
            `⭐ Score: ${a.averageScore ? (a.averageScore/10) : 'N/A'}`,
            `📺 Episodes: ${a.episodes || 'N/A'} | ${a.status || ''}`,
            `🎭 Genres: ${(a.genres || []).join(', ')}`,
            `🏢 Studio: ${(a.studios?.nodes || []).map(s=>s.name).join(', ') || 'N/A'}`,
            ``,
            `${(a.description || '').replace(/<[^>]*>/g,'').slice(0,400)}`,
          ]));
        }
      } catch (e) { console.log('[ANIME AniList]', e.response?.status || e.message); }
      return reply('❌ Anime not found. Try full name e.g .anime One Piece\nError: Jikan rate-limit (429) or AniList down');
    }
  },

  // ========== .topanime ==========
  {
    command: ['topanime', 'top'],
    run: async ({ reply }) => {
      try {
        const data = await getJson('https://api.jikan.moe/v4/top/anime?limit=10');
        let t = `🏆 *TOP 10 ANIME (MyAnimeList)*\n\n`;
        data.data.forEach((a, i) => t += `${i+1}. ${a.title} - ⭐ ${a.score} | ${a.episodes} eps\n`);
        return reply(t + `\nSearch: .anime <name>`);
      } catch (e) { console.log('[TOP Jikan]', e.response?.status || e.message); }
      try {
        const { data } = await axios.post('https://graphql.anilist.co', { query: `query{ Page(perPage:10,sort:SCORE_DESC){ media(type:ANIME){ title{romaji} averageScore episodes } } }` }, { timeout: 15000 });
        let t = `🏆 *TOP 10 ANIME (AniList)*\n\n`;
        data.data.Page.media.forEach((a,i) => t += `${i+1}. ${a.title.romaji} - ⭐ ${a.averageScore/10} | ${a.episodes} eps\n`);
        return reply(t);
      } catch (e) { return reply(`❌ Top anime fail: ${e.response?.status || e.message}`); }
    }
  },

  // ========== .waifu / .animepic - REAL waifu.pics only, correct cats ==========
  {
    command: ['animepic', 'animeimg', 'waifu'],
    run: async ({ reply, sock, from, m, text }) => {
      let cat = (text || 'waifu').toLowerCase().trim();
      if (!WAIFU_CATS.includes(cat)) cat = 'waifu';
      // REAL: https://api.waifu.pics/sfw/{cat} -> {url}
      try {
        const d = await getJson(`https://api.waifu.pics/sfw/${cat}`);
        if (!d?.url) throw new Error('waifu.pics no url');
        await sendImage(sock, from, m, d.url, `✨ *${cat.toUpperCase()}*`);
        return;
      } catch (e) { console.log('[WAIFU]', e.response?.status || e.message); }
      // Fallback: waifu.im only if cat na valid waifu.im tag, else use waifu
      try {
        const tag = WAIFUIM_TAGS.includes(cat) ? cat : 'waifu';
        const d = await getJson(`https://api.waifu.im/search/?included_tags=${tag}&is_nsfw=false`);
        const url = d?.images?.[0]?.url;
        if (!url) throw new Error('waifu.im empty');
        await sendImage(sock, from, m, url, `✨ *${cat.toUpperCase()}*`);
        return;
      } catch (e) { return reply(`❌ Waifu fail: ${e.response?.status || e.message} - Try again, waifu.pics fit dey rate-limit`); }
    }
  },

  // ========== .neko ==========
  {
    command: ['neko'],
    run: async ({ sock, from, m }) => {
      try { const d = await getJson('https://api.waifu.pics/sfw/neko'); await sendImage(sock, from, m, d.url, `🐱 *NEKO*`); return; } catch (e) { console.log('[NEKO]', e.message); }
      try { const d = await getJson('https://api.waifu.im/search/?included_tags=neko&is_nsfw=false'); await sendImage(sock, from, m, d.images[0].url, `🐱 *NEKO*`); return; } catch (e) { await sock.sendMessage(from, { text: `❌ Neko fail: ${e.message}` }, { quoted: m }); }
    }
  },

  // ========== .animevideo + actions - REAL nekos.best cats only ==========
  {
    command: ['animegif', 'animevideo', 'animvid', 'amv'],
    run: async ({ reply, sock, from, m, text }) => {
      let cat = (text || 'hug').toLowerCase().trim();
      if (!NEKOS_CATS.includes(cat)) cat = 'hug';
      try {
        const d = await getJson(`https://nekos.best/api/v2/${cat}?amount=1`);
        const url = d?.results?.[0]?.url;
        if (!url) throw new Error('nekos.best empty');
        await sendVideo(sock, from, m, url, `🎬 *${cat.toUpperCase()}*`);
        return;
      } catch (e) { console.log('[ANIMEVIDEO]', e.response?.status || e.message); }
      // Fallback: waifu.pics image if cat dey for waifu.pics
      try {
        const wcat = WAIFU_CATS.includes(cat) ? cat : 'hug';
        const d = await getJson(`https://api.waifu.pics/sfw/${wcat}`);
        await sendImage(sock, from, m, d.url, `🎬 *${cat.toUpperCase()}*`);
        return;
      } catch (e2) { return reply(`❌ Video fail: ${e2.message}`); }
    }
  },

  ...['hug','kiss','pat','cuddle','slap','poke','bite','dance','cry','smile','happy','wink','highfive','bonk','nom'].map(cat => ({
    command: [cat],
    run: async ({ sock, from, m }) => {
      // bonk/nom no dey for nekos.best - use waifu.pics directly for those
      if (cat === 'bonk' || cat === 'nom') {
        try { const d = await getJson(`https://api.waifu.pics/sfw/${cat}`); await sendImage(sock, from, m, d.url, `🎬 *${cat.toUpperCase()}*`); return; } catch {}
      }
      try { const d = await getJson(`https://nekos.best/api/v2/${cat}?amount=1`); await sendVideo(sock, from, m, d.results[0].url, `🎬 *${cat.toUpperCase()}*`); return; } catch {}
      try { const d = await getJson(`https://api.waifu.pics/sfw/${cat}`); await sendImage(sock, from, m, d.url, `🎬 *${cat.toUpperCase()}*`); return; } catch (e) { await sock.sendMessage(from, { text: `❌ ${cat} fail: ${e.message}` }, { quoted: m }); }
    }
  })),

  // ========== .animequote - REAL animechan.xyz ==========
  {
    command: ['animequote', 'aquotes'],
    run: async ({ reply }) => {
      // REAL: https://animechan.xyz/api/random -> {quote, character, anime}
      try {
        const d = await getJson('https://animechan.xyz/api/random');
        if (!d?.quote) throw new Error('empty');
        return reply(box('💬 ANIME QUOTE', [`"${d.quote}"`, ``, `— ${d.character} (${d.anime})`]));
      } catch (e) { return reply(`❌ Quote fail: ${e.response?.status || e.message}`); }
    }
  },

  // ========== .wallpaper ==========
  {
    command: ['wallpaper', 'animewall', 'awall'],
    run: async ({ sock, from, m }) => {
      try {
        const d = await getJson('https://api.waifu.im/search/?included_tags=waifu&is_nsfw=false');
        const url = d?.images?.[0]?.url;
        if (!url) throw new Error('waifu.im empty');
        await sendImage(sock, from, m, url, `🖼️ *WALLPAPER*`);
        return;
      } catch (e) { console.log('[WALL]', e.message); }
      try { const d = await getJson('https://api.waifu.pics/sfw/waifu'); await sendImage(sock, from, m, d.url, `🖼️ *WALLPAPER*`); return; } catch (e2) { await sock.sendMessage(from, { text: `❌ Wallpaper fail: ${e2.message}` }, { quoted: m }); }
    }
  },

  // ========== .randomanime ==========
  {
    command: ['randomanime', 'ranime'],
    run: async ({ sock, from, m }) => {
      try { const d = await getJson('https://api.waifu.pics/sfw/waifu'); await sendImage(sock, from, m, d.url, `🎲 *RANDOM ANIME*`); return; } catch {}
      try { const d = await getJson('https://api.waifu.im/search/?included_tags=waifu&is_nsfw=false'); await sendImage(sock, from, m, d.images[0].url, `🎲 *RANDOM ANIME*`); return; } catch (e) { await sock.sendMessage(from, { text: `❌ Failed: ${e.message}` }, { quoted: m }); }
    }
  },

  {
    command: ['animemenu', 'animelist'],
    run: async ({ reply }) => {
      await reply(box('🎌 ANIME MENU - FREE, NO KEY', [
        '.anime <name> - Search anime info',
        '.topanime - Top 10 anime',
        '.animepic <cat> - Anime image',
        '.waifu / .neko - Waifu / Neko image',
        '.animevideo <cat> - Anime video/gif',
        '.hug .kiss .pat .dance .slap - Action video',
        '.animequote - Random anime quote',
        '.wallpaper - Anime wallpaper',
        '.randomanime - Random anime pic',
        '',
        'Video cats: hug, kiss, pat, dance, cry, smile',
      ]));
    }
  },
];
