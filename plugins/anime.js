// KNIGHT XMD - Anime Free - NO API KEY - Video + Image
// APIs: Jikan (MAL) + waifu.pics + nekos.best - all free, no key
const config = require('../config');

function box(title, lines) {
  let t = `> ╭══〘 ${title} 〙══⊷❍\n> ┃✯╭──────────────\n`;
  lines.forEach(l => t += `> ┃✯│ ${l}\n`);
  t += `> ┃✯╰───────────────\n> ╰═══════════════════⊷❍`;
  return t;
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Knight-XMD/1.0' } });
  if (!res.ok) throw new Error('API failed: ' + res.status);
  return await res.json();
}

// Send image from URL
async function sendImage(sock, from, m, url, caption) {
  try { await sock.sendMessage(from, { image: { url }, caption }, { quoted: m }); }
  catch { await sock.sendMessage(from, { text: caption + '\n\n🔗 ' + url }, { quoted: m }); }
}
// Send video/gif from URL
async function sendVideo(sock, from, m, url, caption) {
  try { await sock.sendMessage(from, { video: { url }, caption, gifPlayback: url.endsWith('.gif') }, { quoted: m }); }
  catch { await sock.sendMessage(from, { text: caption + '\n\n🔗 ' + url }, { quoted: m }); }
}

const SFW_CATS = ['waifu','neko','shinobu','megumin','bully','cuddle','cry','hug','awoo','kiss','lick','pat','smug','bonk','yeet','blush','smile','wave','highfive','handhold','nom','bite','glomp','slap','kill','kick','happy','wink','poke','dance','cringe'];
const NSFW_BLOCK = ['hentai','porn','sex','xxx','pussy','dick'];

module.exports = [
  // ========== ANIME SEARCH - Jikan, no key ==========
  {
    command: ['anime', 'animesearch', 'mal'],
    run: async ({ reply, text, sock, from, m }) => {
      if (!text) return reply('Usage: .anime Naruto\nExample: .anime One Piece');
      if (NSFW_BLOCK.some(w => text.toLowerCase().includes(w))) return reply('❌ No NSFW');
      try {
        const data = await fetchJson(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(text)}&limit=1`);
        const a = data.data?.[0];
        if (!a) return reply('❌ Anime not found, try another name');
        const cap = box('🎌 ANIME', [
          `Title: ${a.title}`,
          `Japanese: ${a.title_japanese || 'N/A'}`,
          `⭐ Score: ${a.score || 'N/A'} | Rank #${a.rank || 'N/A'}`,
          `📺 Episodes: ${a.episodes || 'N/A'} | ${a.status || ''}`,
          `📅 Aired: ${a.aired?.string || 'N/A'}`,
          `🎭 Genres: ${(a.genres || []).map(g => g.name).join(', ') || 'N/A'}`,
          `🏢 Studio: ${(a.studios || []).map(s => s.name).join(', ') || 'N/A'}`,
          '',
          `${(a.synopsis || '').slice(0, 400)}...`,
        ]);
        if (a.images?.jpg?.large_image_url) await sendImage(sock, from, m, a.images.jpg.large_image_url, cap);
        else await reply(cap);
      } catch (e) { await reply('❌ Failed, try again: ' + e.message); }
    }
  },

  // ========== TOP ANIME ==========
  {
    command: ['topanime', 'top'],
    run: async ({ reply }) => {
      try {
        const data = await fetchJson('https://api.jikan.moe/v4/top/anime?limit=10');
        let t = `🏆 *TOP 10 ANIME (MyAnimeList)*\n\n`;
        data.data.forEach((a, i) => t += `${i+1}. ${a.title} - ⭐ ${a.score} | ${a.episodes} eps\n`);
        t += `\nSearch: .anime <name>`;
        await reply(t);
      } catch { await reply('❌ Failed, try again'); }
    }
  },

  // ========== ANIME IMAGE - waifu.pics, no key ==========
  {
    command: ['animepic', 'animeimg', 'waifu'],
    run: async ({ reply, sock, from, m, text }) => {
      try {
        // .waifu neko / .waifu waifu / .waifu shinobu
        let cat = (text || 'waifu').toLowerCase().trim();
        if (!['waifu','neko','shinobu','megumin','bully','cuddle','cry','hug','awoo','kiss','lick','pat','smug','bonk','yeet','blush','smile','wave','highfive','handhold','nom','bite','glomp','slap','kill','kick','happy','wink','poke','dance','cringe'].includes(cat)) cat = 'waifu';
        const data = await fetchJson(`https://api.waifu.pics/sfw/${cat}`);
        await sendImage(sock, from, m, data.url, `✨ *${cat.toUpperCase()}*\n\n> Knight XMD Anime`);
      } catch { await reply('❌ Failed, try again'); }
    }
  },

  // ========== NEKO ==========
  {
    command: ['neko'],
    run: async ({ sock, from, m }) => {
      try {
        const data = await fetchJson('https://api.waifu.pics/sfw/neko');
        await sendImage(sock, from, m, data.url, `🐱 *NEKO*\n\n> Knight XMD Anime`);
      } catch { await sock.sendMessage(from, { text: '❌ Failed' }); }
    }
  },

  // ========== ANIME GIF / VIDEO - nekos.best, no key - VIDEO ==========
  {
    command: ['animegif', 'animevideo', 'animvid', 'amv'],
    run: async ({ reply, sock, from, m, text }) => {
      try {
        // Categories wey get gif/video: hug, kiss, pat, dance, etc
        const cats = ['hug','kiss','pat','cuddle','slap','tickle','poke','bite','highfive','handhold','wave','smile','happy','dance','cry','blush','smug','wink','yeet','bonk','nom','lurk','shoot','sleep','stare','think','bored','facepalm'];
        let cat = (text || 'hug').toLowerCase().trim();
        if (!cats.includes(cat)) cat = 'hug';
        const data = await fetchJson(`https://nekos.best/api/v2/${cat}?amount=1`);
        const url = data.results?.[0]?.url;
        if (!url) return reply('❌ No video found, try again');
        await sendVideo(sock, from, m, url, `🎬 *ANIME ${cat.toUpperCase()} VIDEO*\n\n> Knight XMD Anime\n> Use: .animevideo dance / kiss / hug`);
      } catch { await reply('❌ Failed, try again'); }
    }
  },

  // ========== ANIME ACTIONS - All video/gif ==========
  ...['hug','kiss','pat','cuddle','slap','poke','bite','dance','cry','smile','happy','wink','highfive','bonk','nom'].map(cat => ({
    command: [cat],
    run: async ({ sock, from, m }) => {
      try {
        const data = await fetchJson(`https://nekos.best/api/v2/${cat}?amount=1`);
        const url = data.results?.[0]?.url;
        if (!url) return sock.sendMessage(from, { text: '❌ Failed' }, { quoted: m });
        await sendVideo(sock, from, m, url, `🎬 *${cat.toUpperCase()}*\n\n> Knight XMD Anime`);
      } catch { await sock.sendMessage(from, { text: '❌ Failed' }, { quoted: m }); }
    }
  })),

  // ========== ANIME QUOTE ==========
  {
    command: ['animequote', 'aquotes'],
    run: async ({ reply }) => {
      try {
        const data = await fetchJson('https://animechan.io/api/v1/quotes/random');
        const q = data.data;
        await reply(box('💬 ANIME QUOTE', [
          `"${q.content}"`,
          ``,
          `— ${q.character.name} (${q.anime.name})`,
        ]));
      } catch { await reply('❌ Failed, try again'); }
    }
  },

  // ========== ANIME WALLPAPER - waifu.im, no key ==========
  {
    command: ['wallpaper', 'animewall', 'awall'],
    run: async ({ sock, from, m }) => {
      try {
        const data = await fetchJson('https://api.waifu.im/search/?included_tags=waifu&is_nsfw=false');
        const img = data.images?.[0];
        if (!img?.url) return sock.sendMessage(from, { text: '❌ Failed' }, { quoted: m });
        await sendImage(sock, from, m, img.url, `🖼️ *ANIME WALLPAPER*\n\n> Knight XMD`);
      } catch { await sock.sendMessage(from, { text: '❌ Failed' }, { quoted: m }); }
    }
  },

  // ========== RANDOM ANIME IMAGE ==========
  {
    command: ['randomanime', 'ranime'],
    run: async ({ sock, from, m }) => {
      try {
        const data = await fetchJson('https://api.waifu.pics/sfw/waifu');
        await sendImage(sock, from, m, data.url, `🎲 *RANDOM ANIME*\n\n> Knight XMD`);
      } catch { await sock.sendMessage(from, { text: '❌ Failed' }, { quoted: m }); }
    }
  },

  // ========== ANIME MENU ==========
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
