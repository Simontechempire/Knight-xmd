// KNIGHT XMD - AI + Utility System - FIXED - Real AI, No Key
// By Faceless Tech - Pollinations AI (Free, No Key)

const axios = require('axios');

function bold(str) {
  const A = '𝐀𝐁𝐂𝐃𝐄𝐅𝐆𝐇𝐈𝐉𝐊𝐋𝐌𝐍𝐎𝐏𝐐𝐑𝐒𝐓𝐔𝐕𝐖𝐗𝐘𝐙';
  const a = '𝐚𝐛𝐜𝐝𝐞𝐟𝐠𝐡𝐢𝐣𝐤𝐥𝐦𝐧𝐨𝐩𝐪𝐫𝐬𝐭𝐮𝐯𝐰𝐱𝐲𝐳';
  const n = '𝟎𝟏𝟐𝟑𝟒𝟓𝟔𝟕𝟖𝟗';
  const map = {};
  for (let i = 0; i < 26; i++) { map[String.fromCharCode(65+i)] = A[i]; map[String.fromCharCode(97+i)] = a[i]; }
  for (let i = 0; i < 10; i++) map[String(i)] = n[i];
  return String(str).split('').map(c => map[c] || c).join('');
}

function box(title, lines) {
  let t = `> ╭══〘 ${title} 〙══⊷❍\n> ┃✯╭──────────────\n`;
  lines.forEach(l => {
    // FIX: Wrap long lines, don't put 2000 chars on 1 line - WhatsApp cuts it
    const chunks = String(l).match(/.{1,65}/g) || [l];
    chunks.forEach(c => t += `> ┃✯│ ${c}\n`);
  });
  t += `> ┃✯╰───────────────\n> ╰═══════════════════⊷❍`;
  return t;
}

function safeCalc(expr) {
  if (!/^[0-9+\-*/().\s%]+$/.test(expr)) throw new Error('Invalid chars');
  if (expr.includes('**') || expr.includes('//') || expr.includes('..')) throw new Error('Invalid');
  const clean = expr.replace(/(\d+)%/g, '($1/100)');
  return Function(`"use strict"; return (${clean})`)();
}

// ===== FREE AI - NO API KEY - REAL =====
async function askAI(prompt) {
  const system = "You are Knight XMD, a helpful smart WhatsApp AI assistant created by Faceless Tech. Answer short, clear, and friendly. Use simple English unless user speaks another language. Keep answer under 800 words.";

  // 1. FIX: Pollinations POST is the real one - GET with ?model=openai is dead
  try {
    const { data } = await axios.post('https://text.pollinations.ai/openai', {
      model: 'openai',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt }
      ],
      max_tokens: 1000
    }, { timeout: 45000, headers: { 'Content-Type': 'application/json' } });
    const ans = data?.choices?.[0]?.message?.content;
    if (ans && ans.length > 2) return ans.trim();
  } catch (e) { console.log('[AI Pollinations POST fail]', e.message); }

  // 2. Pollinations GET - new format, no ?model=
  try {
    const url = `https://text.pollinations.ai/${encodeURIComponent(prompt)}?system=${encodeURIComponent(system)}`;
    const { data } = await axios.get(url, { timeout: 45000, responseType: 'text', headers: { 'User-Agent': 'Knight-XMD' } });
    if (data && typeof data === 'string' && data.length > 2 && !data.toLowerCase().includes('<!doctype')) {
      return data.trim();
    }
  } catch (e) { console.log('[AI Pollinations GET fail]', e.message); }

  // 3. Backup APIs
  const backups = [
    `https://api.davidcyriltech.my.id/ai/chatbot?query=${encodeURIComponent(prompt)}`,
    `https://api.siputzx.my.id/api/ai/gpt3?prompt=${encodeURIComponent(prompt)}`,
  ];
  for (const url of backups) {
    try {
      const { data } = await axios.get(url, { timeout: 25000 });
      const ans = data?.result || data?.data?.result || data?.response || data?.answer || data?.data;
      if (ans && typeof ans === 'string' && ans.length > 2) return ans;
    } catch {}
  }
  return null;
}

module.exports = [
  {
    command: ['ai', 'ask', 'gpt', 'chat'],
    run: async ({ reply, text, sock, from, m }) => {
      if (!text) return reply(`${bold('Usage:')} .ai ${bold('Who is Wizkid?')}\n${bold('Or')} .ask ${bold('How to make money?')}`);
      try {
        const ans = await askAI(text);
        if (!ans) return reply(`❌ ${bold('AI server busy, try again in 30 sec')}\n${bold('Try:')} .ai ${bold('hello')}`);
        // FIX: Send full answer, no box for long AI - box cuts it. Send plain + bold header
        if (ans.length <= 3500) {
          await reply(`🤖 ${bold('KNIGHT AI')}\n\n${ans}`);
        } else {
          await reply(ans.slice(0, 3500));
          if (ans.length > 3500) await reply(ans.slice(3500, 7000));
          if (ans.length > 7000) await reply(ans.slice(7000, 10000));
        }
      } catch (e) { await reply(`❌ ${bold('AI failed:')} ` + e.message); }
    }
  },

  // ========== WEATHER ==========
  {
    command: ['weather'],
    run: async ({ reply, text }) => {
      if (!text) return reply(`${bold('Usage:')} .weather ${bold('Lagos')}\n${bold('Or')} .weather ${bold('Abuja')}`);
      try {
        const { data } = await axios.get(`https://wttr.in/${encodeURIComponent(text)}?format=j1`, { timeout: 20000 });
        const c = data.current_condition?.[0];
        if (!c) return reply(`❌ ${bold('City not found, try Lagos, Abuja, London')}`);
        const area = data.nearest_area?.[0]?.areaName?.[0]?.value || text;
        const country = data.nearest_area?.[0]?.country?.[0]?.value || '';
        await reply(box(`🌤️ ${bold('WEATHER')}`, [
          `${bold('Place:')} ${area}, ${country}`,
          `${bold('Temp:')} ${c.temp_C}°C (${bold('Feels')} ${c.FeelsLikeC}°C)`,
          `${bold('Humidity:')} ${c.humidity}%`,
          `${bold('Wind:')} ${c.windspeedKmph} km/h`,
          `${bold('Visibility:')} ${c.visibility} km`,
          `${bold('Condition:')} ${c.weatherDesc?.[0]?.value || ''}`,
          `${bold('Time:')} ${c.observation_time || ''}`,
        ]));
      } catch { await reply(`❌ ${bold('Weather failed - check city name')}`); }
    }
  },

  // ========== TRANSLATE ==========
  {
    command: ['translate', 'tr', 'trans'],
    run: async ({ reply, text }) => {
      if (!text) return reply(`${bold('Usage:')} .translate ${bold('en How are you?')}\n${bold('Or')} .translate ${bold('fr Hello')}\n${bold('Codes:')} en, fr, es, ha, yo, ig, ar, pt`);
      const parts = text.trim().split(' ');
      const lang = parts[0].toLowerCase();
      const q = parts.slice(1).join(' ');
      if (!q) return reply(`${bold('Usage:')} .translate ${bold('en Hello')}`);
      if (lang.length < 2 || lang.length > 5) return reply(`❌ ${bold('Invalid language code. Example:')} .translate ${bold('fr Hello')}`);
      try {
        const { data } = await axios.get(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(q)}&langpair=auto|${lang}`, { timeout: 20000 });
        const translated = data?.responseData?.translatedText;
        if (!translated) return reply(`❌ ${bold('Translate failed, try again')}`);
        await reply(box(`🌐 ${bold('TRANSLATION')}`, [
          `${bold('From:')} Auto`,
          `${bold('To:')} ${lang.toUpperCase()}`,
          `${bold('Original:')} ${q.slice(0, 100)}`,
          `${bold('Result:')} ${translated}`,
        ]));
      } catch { await reply(`❌ ${bold('Translate failed - check language code')}`); }
    }
  },

  // ========== CALCULATE ==========
  {
    command: ['calculate', 'calc', 'math'],
    run: async ({ reply, text }) => {
      if (!text) return reply(`${bold('Usage:')} .calc ${bold('2+2')}\n${bold('Or')} .calc ${bold('(10+5)*2')}\n${bold('Or')} .calc ${bold('50% of 200')}`);
      try {
        let expr = text.trim().toLowerCase();
        if (expr.includes(' of ')) {
          const [a, b] = expr.split(' of ');
          expr = `${a} * ${b}`;
        }
        expr = expr.replace(/x/g, '*').replace(/÷/g, '/');
        const r = safeCalc(expr);
        if (typeof r !== 'number' || !isFinite(r)) return reply(`❌ ${bold('Invalid calculation')}`);
        await reply(box(`🧮 ${bold('CALCULATOR')}`, [`${bold('Q:')} ${text}`, `${bold('A:')} ${r}`]));
      } catch { await reply(`❌ ${bold('Invalid calculation')}\n${bold('Example:')} .calc ${bold('2+2*3')}`); }
    }
  },

  // ========== SHORTURL ==========
  {
    command: ['shorturl', 'short', 'tinyurl'],
    run: async ({ reply, text }) => {
      if (!text) return reply(`${bold('Usage:')} .shorturl ${bold('https://google.com')}`);
      let url = text.trim().split(' ')[0];
      if (!url.startsWith('http')) url = 'https://' + url;
      try { new URL(url); } catch { return reply(`❌ ${bold('Invalid URL. Example:')} .shorturl ${bold('https://google.com')}`); }
      try {
        const { data } = await axios.get(`https://is.gd/create.php?format=simple&url=${encodeURIComponent(url)}`, { timeout: 20000 });
        if (!data || !data.toString().startsWith('http')) {
          const res2 = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`, { timeout: 20000 });
          return reply(box(`🔗 ${bold('SHORT LINK')}`, [`${bold('Original:')} ${url.slice(0, 60)}`, `${bold('Short:')} ${res2.data}`]));
        }
        await reply(box(`🔗 ${bold('SHORT LINK')}`, [`${bold('Original:')} ${url.slice(0, 60)}`, `${bold('Short:')} ${data}`]));
      } catch { await reply(`❌ ${bold('Short failed - check link')}`); }
    }
  },

  // ========== QR CODE ==========
  {
    command: ['qr', 'qrcode'],
    run: async ({ sock, from, reply, text }) => {
      if (!text) return reply(`${bold('Usage:')} .qr ${bold('https://google.com')}`);
      try {
        const url = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(text)}`;
        const { data } = await axios.get(url, { responseType: 'arraybuffer', timeout: 20000 });
        await sock.sendMessage(from, { image: Buffer.from(data), caption: box(`📱 ${bold('QR CODE')}`, [`${bold('Text:')} ${text.slice(0, 100)}`]) });
      } catch { await reply(`❌ ${bold('QR failed')}`); }
    }
  },

  // ========== DICTIONARY ==========
  {
    command: ['define', 'dictionary', 'meaning'],
    run: async ({ reply, text }) => {
      if (!text) return reply(`${bold('Usage:')} .define ${bold('love')}`);
      try {
        const { data } = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(text.trim())}`, { timeout: 20000 });
        const entry = data[0];
        const def = entry.meanings[0]?.definitions[0];
        await reply(box(`📖 ${bold('DICTIONARY')}`, [
          `${bold('Word:')} ${entry.word}`,
          `${bold('Type:')} ${entry.meanings[0]?.partOfSpeech || ''}`,
          `${bold('Meaning:')} ${def?.definition || ''}`,
          `${bold('Example:')} ${def?.example || bold('No example')}`,
          `${bold('Pronounce:')} ${entry.phonetic || ''}`,
        ]));
      } catch { await reply(`❌ ${bold('Word')} "${text}" ${bold('not found')}`); }
    }
  },
];
