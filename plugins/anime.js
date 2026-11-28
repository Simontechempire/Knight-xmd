// KNIGHT XMD - Anime - REAL, NO KEY, NO DEMO
const axios = require('axios');

async function getJson(url, timeout = 15000) {
  const res = await axios.get(url, {
    timeout, maxRedirects: 5,
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Knight-XMD', 'Accept': 'application/json' }
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
  const isGif = url.toLowerCase().endsWith('.gif');
  await sock.sendMessage(from, { video: Buffer.from(res.data), caption, gifPlayback: true, mimetype: 'video/mp4' }, { quoted: m });
}

const WAIFU_CATS = ['waifu','neko','shinobu','megumin','bully','cuddle','cry','hug','awoo','kiss','lick','pat','smug','bonk','yeet','blush','smile','wave','highfive','handhold','nom','bite','glomp','slap','kill','kick','happy','wink','poke','dance','cringe'];
const NEKOS_CATS = ['baka','bite','blush','bored','cry','cuddle','dance','facepalm','feed','happy','highfive','hug','kiss','laugh','lurk','nod','nom','nope','pat','peck','poke','pout','shrug','sip','slap','sleep','smile','smug','stare','think','thumbsup','tickle','wave','wink','yeet'];
const WAIFUIM_TAGS = ['waifu','neko','maid','uniform','oppai','selfie'];
const NSFW_BLOCK = ['hentai','porn','sex','xxx','pussy','dick','nude'];

module.exports = [
  {
    command: ['anime', 'animesearch', 'mal'],
    run: async ({ reply, text, sock, from, m }) => {
      if (!text) return reply('Usage: .anime Naruto');
      if (NSFW_BLOCK.some(w => text.toLowerCase().includes(w))) return reply('❌ No NSFW');
      try {
        const data = await getJson(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(text)}&limit=1&sfw=true`);
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
      return reply('❌ Anime not found. Try full name e.g .anime One Piece');
    }
  },
  {
    command: ['topanime', 'top'],
    run: async ({ reply }) => {
      try {
        const data = await getJson('https://api.jikan.moe/v4/top/anime?limit=10&filter=bypopularity');
        let t = `🏆 *TOP 10 ANIME (MyAnimeList)*\n\n`;
        data.data.forEach((a, i) => t += `${i+1}. ${a.title} - ⭐ ${a.score} | ${a.episodes} eps\n`);
        return reply(t + `\nSearch: .anime <name>`);
      } catch (e) {
        try {
          const { data } = await axios.post('https://graphql.anilist.co', { query: `query{ Page(perPage:10,sort:SCORE_DESC){ media(type:ANIME){ title{romaji} averageScore episodes } } }` }, { timeout: 15000 });
          let t = `🏆 *TOP 10 ANIME (AniList)*\n\n`;
          data.data.Page.media.forEach((a,i) => t += `${i+1}. ${a.title.romaji} - ⭐ ${a.averageScore/10} | ${a.episodes} eps\n`);
          return reply(t);
        } catch (e2) { return reply(`❌ Top anime fail, try again in 10s`); }
      }
    }
  },
  {
    command: ['animepic', 'animeimg', 'waifu'],
    run: async ({ reply, sock, from, m, text }) => {
      let cat = (text || 'waifu').toLowerCase().trim();
      if (!WAIFU_CATS.includes(cat)) cat = 'waifu';
      // Try waifu.pics, then waifu.im, then nekos.best image - REAL retry, no guessing
      const tries = [
        async () => { const d = await getJson(`https://api.waifu.pics/sfw/${cat}`); if (!d?.url) throw new Error('no url'); return d.url; },
        async () => { const tag = WAIFUIM_TAGS.includes(cat) ? cat : 'waifu'; const d = await getJson(`https://api.waifu.im/search/?included_tags=${tag}&is_nsfw=false`); if (!d?.images?.[0]?.url) throw new Error('no url'); return d.images[0].url; },
        async () => { const d = await getJson(`https://api.waifu.pics/sfw/waifu`); return d.url; },
      ];
      for (const fn of tries) {
        try { const url = await fn(); await sendImage(sock, from, m, url, `✨ *${cat.toUpperCase()}*`); return; } catch (e) { console.log('[WAIFU try]', e.message); }
      }
      return reply(`❌ Waifu fail, try again in 10s`);
    }
  },
  {
    command: ['neko'],
    run: async ({ sock, from, m }) => {
      try { const d = await getJson('https://api.waifu.pics/sfw/neko'); await sendImage(sock, from, m, d.url, `🐱 *NEKO*`); return; } catch {}
      try { const d = await getJson('https://api.waifu.im/search/?included_tags=neko&is_nsfw=false'); await sendImage(sock, from, m, d.images[0].url, `🐱 *NEKO*`); return; } catch (e) { await sock.sendMessage(from, { text: `❌ Neko fail, try again in 10s` }, { quoted: m }); }
    }
  },
  {
    command: ['animegif', 'animevideo', 'animvid', 'amv'],
    run: async ({ reply, sock, from, m, text }) => {
      let cat = (text || 'hug').toLowerCase().trim();
      if (!NEKOS_CATS.includes(cat) && !WAIFU_CATS.includes(cat)) cat = 'hug';
      try {
        const d = await getJson(`https://nekos.best/api/v2/${cat}?amount=1`);
        const url = d?.results?.[0]?.url;
        if (!url) throw new Error('nekos.best empty');
        await sendVideo(sock, from, m, url, `🎬 *${cat.toUpperCase()}*`);
        return;
      } catch (e) { console.log('[ANIMEVIDEO]', e.response?.status || e.message); }
      try {
        const wcat = WAIFU_CATS.includes(cat) ? cat : 'hug';
        const d = await getJson(`https://api.waifu.pics/sfw/${wcat}`);
        await sendImage(sock, from, m, d.url, `🎬 *${cat.toUpperCase()}*`);
        return;
      } catch (e2) { return reply(`❌ Video fail, try again in 10s`); }
    }
  },
  ...['hug','kiss','pat','cuddle','slap','poke','bite','dance','cry','smile','happy','wink','highfive','bonk','nom'].map(cat => ({
    command: [cat],
    run: async ({ sock, from, m }) => {
      if (cat === 'bonk' || cat === 'nom') {
        try { const d = await getJson(`https://api.waifu.pics/sfw/${cat}`); await sendImage(sock, from, m, d.url, `🎬 *${cat.toUpperCase()}*`); return; } catch {}
      }
      try { const d = await getJson(`https://nekos.best/api/v2/${cat}?amount=1`); if (!d?.results?.[0]?.url) throw new Error('empty'); await sendVideo(sock, from, m, d.results[0].url, `🎬 *${cat.toUpperCase()}*`); return; } catch {}
      try { const d = await getJson(`https://api.waifu.pics/sfw/${cat}`); await sendImage(sock, from, m, d.url, `🎬 *${cat.toUpperCase()}*`); return; } catch (e) { await sock.sendMessage(from, { text: `❌ ${cat} fail, try again in 10s` }, { quoted: m }); }
    }
  })),
  {
    command: ['animequote', 'aquotes'],
    run: async ({ reply }) => {
      // FIXED: Old animechan.xyz/api/random is dead / needs key. Use v1 + Jikan quotes fallback
      const tries = [
        async () => { const d = await getJson('https://animechan.xyz/api/v1/random'); if (!d?.data?.quote) throw new Error('empty'); return d.data; },
        async () => { const d = await getJson('https://animechan.xyz/api/random/v1'); if (!d?.quote) throw new Error('empty'); return d; },
        async () => { const d = await getJson('https://api.jikan.moe/v4/quotes?limit=1'); const q = d.data?.[0]; if (!q?.quote) throw new Error('empty'); return { quote: q.quote, character: q.character, anime: q.anime }; },
      ];
      for (const fn of tries) {
        try { const q = await fn(); return reply(box('💬 ANIME QUOTE', [`"${q.quote}"`, ``, `— ${q.character} (${q.anime})`])); } catch (e) { console.log('[QUOTE try]', e.message); }
      }
      return reply(`❌ Quote fail, try again in 10s`);
    }
  },
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
      try { const d = await getJson('https://api.waifu.pics/sfw/waifu'); await sendImage(sock, from, m, d.url, `🖼️ *WALLPAPER*`); return; } catch (e2) { await sock.sendMessage(from, { text: `❌ Wallpaper fail, try again in 10s` }, { quoted: m }); }
    }
  },
  {
    command: ['randomanime', 'ranime'],
    run: async ({ sock, from, m }) => {
      try { const d = await getJson('https://api.waifu.pics/sfw/waifu'); await sendImage(sock, from, m, d.url, `🎲 *RANDOM ANIME*`); return; } catch {}
      try { const d = await getJson('https://api.waifu.im/search/?included_tags=waifu&is_nsfw=false'); await sendImage(sock, from, m, d.images[0].url, `🎲 *RANDOM ANIME*`); return; } catch (e) { await sock.sendMessage(from, { text: `❌ Failed, try again in 10s` }, { quoted: m }); }
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
