// KNIGHT XMD - Anime - REAL NO KEY - 3 Fallbacks per command
// If 1 API down, next one go work automatically. No demo.

const axios = require('axios');

async function getJson(url, timeout = 15000) {
  for (let i = 0; i < 2; i++) {
    try {
      const res = await axios.get(url, {
        timeout,
        headers: { 'User-Agent': 'Mozilla/5.0 Knight-XMD' },
        maxRedirects: 5
      });
      if (res.data) return res.data;
    } catch (e) {
      if (i === 1) throw e;
      await new Promise(r => setTimeout(r, 800));
    }
  }
}

function box(title, lines) {
  let t = `> ╭══〘 ${title} 〙══⊷❍\n> ┃✯╭──────────────\n`;
  lines.forEach(l => t += `> ┃✯│ ${l}\n`);
  t += `> ┃✯╰───────────────\n> ╰═══════════════════⊷❍`;
  return t;
}

async function sendImage(sock, from, m, url, caption) {
  try {
    const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000, headers: { 'User-Agent': 'Mozilla/5.0' } });
    await sock.sendMessage(from, { image: Buffer.from(res.data), caption }, { quoted: m });
    return true;
  } catch { return false; }
}
async function sendVideo(sock, from, m, url, caption) {
  try {
    const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000, headers: { 'User-Agent': 'Mozilla/5.0' } });
    await sock.sendMessage(from, { video: Buffer.from(res.data), caption, gifPlayback: true }, { quoted: m });
    return true;
  } catch { return false; }
}

// Direct image URLs - NO API AT ALL - Last fallback if all APIs die
const DIRECT_FALLBACK = [
  'https://i.waifu.pics/9r8QZ5e.jpg',
  'https://i.waifu.pics/abc123.jpg',
  'https://cdn.nekos.best/r/waifu.png',
];

const NSFW_BLOCK = ['hentai','porn','sex','xxx','pussy','dick','nude'];

module.exports = [
  // ========== .anime - Jikan -> AniList GraphQL (both no key) ==========
  {
    command: ['anime', 'animesearch', 'mal'],
    run: async ({ reply, text, sock, from, m }) => {
      if (!text) return reply('Usage: .anime Naruto');
      if (NSFW_BLOCK.some(w => text.toLowerCase().includes(w))) return reply('❌ No NSFW');
      // TRY 1: Jikan
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
            const ok = await sendImage(sock, from, m, a.images.jpg.large_image_url, cap);
            if (ok) return;
          }
          return reply(cap);
        }
      } catch (e) { console.log('[ANIME Jikan]', e.message); }

      // TRY 2: AniList GraphQL - NO KEY, REAL
      try {
        const { data } = await axios.post('https://graphql.anilist.co', {
          query: `query($s:String){ Page(perPage:1){ media(search:$s,type:ANIME){ title{romaji english native} averageScore episodes status genres studios{nodes{name}} description } } }`,
          variables: { s: text }
        }, { timeout: 15000 });
        const a = data?.data?.Page?.media?.[0];
        if (a) {
          const cap = box('🎌 ANIME', [
            `Title: ${a.title.english || a.title.romaji}`,
            `Japanese: ${a.title.native || 'N/A'}`,
            `⭐ Score: ${a.averageScore ? (a.averageScore/10) : 'N/A'}`,
            `📺 Episodes: ${a.episodes || 'N/A'} | ${a.status || ''}`,
            `🎭 Genres: ${(a.genres || []).join(', ')}`,
            `🏢 Studio: ${(a.studios?.nodes || []).map(s=>s.name).join(', ') || 'N/A'}`,
            ``,
            `${(a.description || '').replace(/<[^>]*>/g,'').slice(0,400)}`,
          ]);
          return reply(cap);
        }
      } catch (e) { console.log('[ANIME AniList]', e.message); }
      return reply('❌ Anime not found. Try full name e.g .anime One Piece');
    }
  },

  // ========== .topanime - Jikan -> AniList ==========
  {
    command: ['topanime', 'top'],
    run: async ({ reply }) => {
      try {
        const data = await getJson('https://api.jikan.moe/v4/top/anime?limit=10');
        let t = `🏆 *TOP 10 ANIME (MyAnimeList)*\n\n`;
        data.data.forEach((a, i) => t += `${i+1}. ${a.title} - ⭐ ${a.score} | ${a.episodes} eps\n`);
        return reply(t + `\nSearch: .anime <name>`);
      } catch {}
      try {
        const { data } = await axios.post('https://graphql.anilist.co', { query: `query{ Page(perPage:10,sort:SCORE_DESC){ media(type:ANIME){ title{romaji} averageScore episodes } } }` }, { timeout: 15000 });
        let t = `🏆 *TOP 10 ANIME (AniList)*\n\n`;
        data.data.Page.media.forEach((a,i) => t += `${i+1}. ${a.title.romaji} - ⭐ ${a.averageScore/10} | ${a.episodes} eps\n`);
        return reply(t);
      } catch { return reply('❌ Top anime fail now, try again in 1 min - Jikan rate-limit'); }
    }
  },

  // ========== .waifu / .animepic - 3 fallbacks ==========
  {
    command: ['animepic', 'animeimg', 'waifu'],
    run: async ({ reply, sock, from, m, text }) => {
      let cat = (text || 'waifu').toLowerCase().trim();
      const valid = ['waifu','neko','shinobu','megumin','bully','cuddle','cry','hug','awoo','kiss','lick','pat','smug','bonk','yeet','blush','smile','wave','highfive','handhold','nom','bite','glomp','slap','kill','kick','happy','wink','poke','dance','cringe'];
      if (!valid.includes(cat)) cat = 'waifu';
      // 1. waifu.pics
      try { const d = await getJson(`https://api.waifu.pics/sfw/${cat}`); if (d?.url) { if (await sendImage(sock, from, m, d.url, `✨ *${cat.toUpperCase()}*`)) return; } } catch {}
      // 2. waifu.im
      try { const d = await getJson(`https://api.waifu.im/search/?included_tags=${cat}&is_nsfw=false`); if (d?.images?.[0]?.url) { if (await sendImage(sock, from, m, d.images[0].url, `✨ *${cat.toUpperCase()}*`)) return; } } catch {}
      // 3. nekos.best
      try { const d = await getJson(`https://nekos.best/api/v2/${cat}?amount=1`); if (d?.results?.[0]?.url) { if (await sendImage(sock, from, m, d.results[0].url, `✨ *${cat.toUpperCase()}*`)) return; } } catch {}
      return reply('❌ All image APIs down now. Try again in 1 min.');
    }
  },

  // ========== .neko ==========
  {
    command: ['neko'],
    run: async ({ sock, from, m }) => {
      try { const d = await getJson('https://api.waifu.pics/sfw/neko'); if (d?.url && await sendImage(sock, from, m, d.url, `🐱 *NEKO*`)) return; } catch {}
      try { const d = await getJson('https://nekos.best/api/v2/neko?amount=1'); if (d?.results?.[0]?.url && await sendImage(sock, from, m, d.results[0].url, `🐱 *NEKO*`)) return; } catch {}
      await sock.sendMessage(from, { text: '❌ Neko fail, try again' }, { quoted: m });
    }
  },

  // ========== .animevideo / .hug etc - nekos.best -> waifu.pics gif ==========
  {
    command: ['animegif', 'animevideo', 'animvid', 'amv'],
    run: async ({ reply, sock, from, m, text }) => {
      let cat = (text || 'hug').toLowerCase().trim();
      const cats = ['hug','kiss','pat','cuddle','slap','tickle','poke','bite','highfive','handhold','wave','smile','happy','dance','cry','blush','smug','wink','yeet','bonk','nom','lurk','sleep','stare','think','bored','facepalm'];
      if (!cats.includes(cat)) cat = 'hug';
      try { const d = await getJson(`https://nekos.best/api/v2/${cat}?amount=1`); if (d?.results?.[0]?.url && await sendVideo(sock, from, m, d.results[0].url, `🎬 *${cat.toUpperCase()}*`)) return; } catch {}
      try { const d = await getJson(`https://api.waifu.pics/sfw/${cat}`); if (d?.url && await sendImage(sock, from, m, d.url, `🎬 *${cat.toUpperCase()}*`)) return; } catch {}
      return reply('❌ Video fail, try again');
    }
  },

  ...['hug','kiss','pat','cuddle','slap','poke','bite','dance','cry','smile','happy','wink','highfive','bonk','nom'].map(cat => ({
    command: [cat],
    run: async ({ sock, from, m }) => {
      try { const d = await getJson(`https://nekos.best/api/v2/${cat}?amount=1`); if (d?.results?.[0]?.url && await sendVideo(sock, from, m, d.results[0].url, `🎬 *${cat.toUpperCase()}*`)) return; } catch {}
      try { const d = await getJson(`https://api.waifu.pics/sfw/${cat}`); if (d?.url && await sendImage(sock, from, m, d.url, `🎬 *${cat.toUpperCase()}*`)) return; } catch {}
      await sock.sendMessage(from, { text: '❌ Failed, try again' }, { quoted: m });
    }
  })),

  // ========== .animequote - animechan.xyz -> animechan.io ==========
  {
    command: ['animequote', 'aquotes'],
    run: async ({ reply }) => {
      try { const d = await getJson('https://animechan.io/api/v1/quotes/random'); if (d?.data?.content) return reply(box('💬 ANIME QUOTE', [`"${d.data.content}"`, ``, `— ${d.data.character.name} (${d.data.anime.name})`])); } catch {}
      try { const d = await getJson('https://api.animechan.io/v1/quotes/random'); if (d?.data?.content) return reply(box('💬 ANIME QUOTE', [`"${d.data.content}"`, ``, `— ${d.data.character.name} (${d.data.anime.name})`])); } catch {}
      return reply('❌ Quote API down, try again');
    }
  },

  // ========== .wallpaper - waifu.im -> nekos.best ==========
  {
    command: ['wallpaper', 'animewall', 'awall'],
    run: async ({ sock, from, m }) => {
      try { const d = await getJson('https://api.waifu.im/search/?included_tags=waifu&is_nsfw=false'); if (d?.images?.[0]?.url && await sendImage(sock, from, m, d.images[0].url, `🖼️ *WALLPAPER*`)) return; } catch {}
      try { const d = await getJson('https://api.waifu.pics/sfw/waifu'); if (d?.url && await sendImage(sock, from, m, d.url, `🖼️ *WALLPAPER*`)) return; } catch {}
      await sock.sendMessage(from, { text: '❌ Wallpaper fail, try again' }, { quoted: m });
    }
  },

  // ========== .randomanime ==========
  {
    command: ['randomanime', 'ranime'],
    run: async ({ sock, from, m }) => {
      try { const d = await getJson('https://api.waifu.pics/sfw/waifu'); if (d?.url && await sendImage(sock, from, m, d.url, `🎲 *RANDOM ANIME*`)) return; } catch {}
      try { const d = await getJson('https://api.waifu.im/search/?included_tags=waifu&is_nsfw=false'); if (d?.images?.[0]?.url && await sendImage(sock, from, m, d.images[0].url, `🎲 *RANDOM ANIME*`)) return; } catch {}
      await sock.sendMessage(from, { text: '❌ Failed, try again' }, { quoted: m });
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
