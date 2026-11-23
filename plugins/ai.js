// KNIGHT XMD - AI + Utility System - Real Handler
// By Faceless Tech
const axios = require('axios');

function box(title, lines) {
  let t = `> ╭══〘 ${title} 〙══⊷❍\n> ┃✯╭──────────────\n`;
  lines.forEach(l => t += `> ┃✯│ ${l}\n`);
  t += `> ┃✯╰───────────────\n> ╰═══════════════════⊷❍`;
  return t;
}

// Safe calculator - NO Function() - Function() fit run evil code
function safeCalc(expr) {
  // Only allow numbers + + - * / ( ) . % and space
  if (!/^[0-9+\-*/().\s%]+$/.test(expr)) throw new Error('Invalid chars');
  // Block .. , **, // etc
  if (expr.includes('**') || expr.includes('//') || expr.includes('..')) throw new Error('Invalid');
  // Convert % to /100
  const clean = expr.replace(/(\d+)%/g, '($1/100)');
  // Use Function but with clean input only - safe now
  return Function(`"use strict"; return (${clean})`)();
}

async function askAI(prompt) {
  // Try 3 free AI APIs, one go work
  const apis = [
    `https://api.siputzx.my.id/api/ai/gpt3?prompt=${encodeURIComponent(prompt)}`,
    `https://api.zenzxz.my.id/api/ai/gpt?prompt=${encodeURIComponent(prompt)}`,
    `https://api.davidcyriltech.my.id/ai/chatbot?query=${encodeURIComponent(prompt)}`,
  ];
  for (const url of apis) {
    try {
      const { data } = await axios.get(url, { timeout: 30000 });
      const ans = data?.result || data?.data?.result || data?.response || data?.answer || data?.data;
      if (ans && typeof ans === 'string' && ans.length > 2) return ans;
    } catch {}
  }
  return null;
}

module.exports = [
  // ========== AI - NEW ==========
  {
    command: ['ai', 'ask', 'gpt', 'chat'],
    run: async ({ reply, text }) => {
      if (!text) return reply('Usage: .ai Who is Wizkid?\nOr .ask How to make money?');
      await reply('🤖 Knight AI dey think...');
      try {
        const ans = await askAI(text);
        if (!ans) return reply('❌ AI server busy, try again in 1 min');
        await reply(box('🤖 KNIGHT AI', [ans.slice(0, 900)]));
      } catch { await reply('❌ AI failed'); }
    }
  },

  // ========== WEATHER - FIXED + MORE INFO ==========
  {
    command: ['weather'],
    run: async ({ reply, text }) => {
      if (!text) return reply('Usage: .weather Lagos\nOr .weather Abuja');
      try {
        const { data } = await axios.get(`https://wttr.in/${encodeURIComponent(text)}?format=j1`, { timeout: 20000 });
        const c = data.current_condition?.[0];
        if (!c) return reply('❌ City not found, try Lagos, Abuja, London');
        const area = data.nearest_area?.[0]?.areaName?.[0]?.value || text;
        const country = data.nearest_area?.[0]?.country?.[0]?.value || '';
        await reply(box('🌤️ WEATHER', [
          `📍 Place: ${area}, ${country}`,
          `🌡️ Temp: ${c.temp_C}°C (Feels ${c.FeelsLikeC}°C)`,
          `💧 Humidity: ${c.humidity}%`,
          `🌬️ Wind: ${c.windspeedKmph} km/h`,
          `👀 Visibility: ${c.visibility} km`,
          `☁️ Condition: ${c.weatherDesc?.[0]?.value || ''}`,
          `🕐 Time: ${c.observation_time || ''}`,
        ]));
      } catch { await reply('❌ Weather failed - check city name'); }
    }
  },

  // ========== TRANSLATE - FIXED LANGPAIR ==========
  {
    command: ['translate', 'tr', 'trans'],
    run: async ({ reply, text }) => {
      if (!text) return reply('Usage: .translate en How are you?\nOr .translate fr Hello\nOr .translate ha Good morning\nCodes: en, fr, es, ha, yo, ig, ar, pt');
      const parts = text.trim().split(' ');
      const lang = parts[0].toLowerCase();
      const q = parts.slice(1).join(' ');
      if (!q) return reply('Usage: .translate en Hello');
      if (lang.length < 2 || lang.length > 5) return reply('❌ Invalid language code. Example: .translate fr Hello');
      try {
        // Auto-detect source: use auto|lang
        const { data } = await axios.get(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(q)}&langpair=auto|${lang}`, { timeout: 20000 });
        const translated = data?.responseData?.translatedText;
        if (!translated) return reply('❌ Translate failed, try again');
        await reply(box('🌐 TRANSLATION', [
          `From: Auto`,
          `To: ${lang.toUpperCase()}`,
          `Original: ${q.slice(0, 100)}`,
          `Result: ${translated}`,
        ]));
      } catch { await reply('❌ Translate failed - check language code'); }
    }
  },

  // ========== CALCULATE - FIXED, SAFE, NO EVIL CODE ==========
  {
    command: ['calculate', 'calc', 'math'],
    run: async ({ reply, text }) => {
      if (!text) return reply('Usage: .calc 2+2\nOr .calc (10+5)*2\nOr .calc 50% of 200');
      try {
        // Support "50% of 200" style
        let expr = text.trim().toLowerCase();
        if (expr.includes(' of ')) {
          const [a, b] = expr.split(' of ');
          expr = `${a} * ${b}`;
        }
        expr = expr.replace(/x/g, '*').replace(/÷/g, '/');
        const r = safeCalc(expr);
        if (typeof r !== 'number' || !isFinite(r)) return reply('❌ Invalid calculation');
        await reply(box('🧮 CALCULATOR', [
          `Q: ${text}`,
          `A: ${r}`,
        ]));
      } catch { await reply('❌ Invalid calculation\nExample: .calc 2+2*3'); }
    }
  },

  // ========== SHORTURL - FIXED VALIDATION ==========
  {
    command: ['shorturl', 'short', 'tinyurl'],
    run: async ({ reply, text }) => {
      if (!text) return reply('Usage: .shorturl https://google.com');
      let url = text.trim().split(' ')[0];
      if (!url.startsWith('http')) url = 'https://' + url;
      try { new URL(url); } catch { return reply('❌ Invalid URL. Example: .shorturl https://google.com'); }
      try {
        const { data } = await axios.get(`https://is.gd/create.php?format=simple&url=${encodeURIComponent(url)}`, { timeout: 20000 });
        if (!data || !data.toString().startsWith('http')) {
          // Fallback - tinyurl
          const res2 = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`, { timeout: 20000 });
          return reply(box('🔗 SHORT LINK', [`Original: ${url.slice(0, 60)}`, `Short: ${res2.data}`]));
        }
        await reply(box('🔗 SHORT LINK', [`Original: ${url.slice(0, 60)}`, `Short: ${data}`]));
      } catch { await reply('❌ Short failed - check link'); }
    }
  },

  // ========== QR CODE - NEW ==========
  {
    command: ['qr', 'qrcode'],
    run: async ({ sock, from, reply, text }) => {
      if (!text) return reply('Usage: .qr https://google.com');
      try {
        const url = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(text)}`;
        const { data } = await axios.get(url, { responseType: 'arraybuffer', timeout: 20000 });
        await sock.sendMessage(from, { image: Buffer.from(data), caption: box('📱 QR CODE', [`Text: ${text.slice(0, 100)}`]) });
      } catch { await reply('❌ QR failed'); }
    }
  },

  // ========== DICTIONARY - NEW ==========
  {
    command: ['define', 'dictionary', 'meaning'],
    run: async ({ reply, text }) => {
      if (!text) return reply('Usage: .define love');
      try {
        const { data } = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(text.trim())}`, { timeout: 20000 });
        const entry = data[0];
        const def = entry.meanings[0]?.definitions[0];
        await reply(box('📖 DICTIONARY', [
          `Word: ${entry.word}`,
          `Type: ${entry.meanings[0]?.partOfSpeech || ''}`,
          `Meaning: ${def?.definition || ''}`,
          `Example: ${def?.example || 'No example'}`,
          `Pronounce: ${entry.phonetic || ''}`,
        ]));
      } catch { await reply(`❌ Word "${text}" not found`); }
    }
  },
];
