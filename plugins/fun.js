// KNIGHT XMD - Fun + Game System - Real Handler
// By Faceless Tech
const axios = require('axios');

function box(title, lines) {
  let t = `> ╭══〘 ${title} 〙══⊷❍\n> ┃✯╭──────────────\n`;
  lines.forEach(l => t += `> ┃✯│ ${l}\n`);
  t += `> ┃✯╰───────────────\n> ╰═══════════════════⊷❍`;
  return t;
}

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function getTarget(m, args) {
  const ctx = m.message.extendedTextMessage?.contextInfo;
  if (ctx?.mentionedJid?.length) return ctx.mentionedJid[0];
  if (ctx?.participant) return ctx.participant;
  if (args[0]) { const n = args[0].replace(/[^0-9]/g, ''); if (n.length >= 7) return n + '@s.whatsapp.net'; }
  return null;
}

const PICKUPS = [
  "Are you WiFi? Because I’m really feeling the connection.",
  "Are you Google? Because you have everything I’ve been searching for.",
  "Do you have a map? I keep getting lost in your eyes.",
  "Are you a charger? Because without you, I’m dying.",
  "If beauty was time, you’d be eternity.",
  "Are you from Lagos? Because you’ve got that fine girl/boy energy.",
  "You must be tired, you’ve been running through my mind all day.",
  "Are you a bank loan? Because you have my interest.",
  "Even if there was no gravity on Earth, I’d still fall for you.",
  "Are you MTN? Because you’re always on my mind - Everywhere you go.",
  "Your name must be Asake, because you’re Lonely at the Top of my heart.",
  "Are you jollof rice? Because everybody wants you, but I got you.",
  "Forget Wizkid, you’re the real Starboy in my life.",
  "Are you NEPA? Because when you leave, my world goes dark.",
  "You’re like data - I can never have enough of you.",
  "Are you a pastor? Because you just blessed my day.",
  "If you were a song, you’d be on repeat forever.",
  "Are you a thief? Because you just stole my heart.",
  "Do you believe in love at first sight, or should I walk by again?",
  "You + Me = Perfect match, no calculation needed.",
  "Are you a mirror? Because I see my future with you.",
  "Your smile must be a crime, because you just arrested my heart.",
  "Are you a dream? Because I don’t want to wake up.",
  "You’re hotter than Lagos sun at noon.",
  "Are you a lottery ticket? Because meeting you feels like winning.",
];

const RIZZ = [
  "Rizz Level: 100% 🔥 - Even Wizkid go ask you for advice.",
  "Rizz Level: 95% 😏 - You talk, everybody go listen.",
  "Rizz Level: 87% 😎 - Smooth like Asake verse.",
  "Rizz Level: 72% ✨ - You get small game, just add confidence.",
  "Rizz Level: 60% 🙂 - You dey try, no give up.",
  "Rizz Level: 40% 😅 - Your rizz need update, go practice.",
  "Rizz Level: 10% 💀 - Bro, even your shadow dey run from you.",
  "Rizz Level: 999% 👑 - FACeless Tech level. Illegal rizz.",
  "Rizz Level: 0% 🧊 - Ice block get more rizz than you.",
  "Rizz Level: 50% 🤷 - Mid. You fit do better.",
];

const ROASTS = [
  "Your brain is like NEPA light - e dey go off when we need am most.",
  "You’re so slow, even snail dey overtake you.",
  "Your face na why WhatsApp add block button.",
  "You’re like 2G network - nobody wants you in 2026.",
  "If ugly was a job, you go be CEO.",
  "Your rizz is so low, even your mirror dey avoid you.",
  "You talk too much, even your phone battery dey tire for you.",
  "You’re the reason group admin dey add mute button.",
  "Your sense of humour na like MTN data - e dey finish fast.",
  "You’re so broke, even your shadow dey beg for money.",
  "If I wanted to hear from you, I for ask NEPA for light.",
  "You’re like a WhatsApp status - nobody really cares.",
];

const COMPLIMENTS = [
  "You’re genuinely one of the finest people in this group ✨",
  "Your energy dey light up everywhere you go 🔥",
  "You get sense pass Google, no cap 🧠",
  "Your smile fit cure NEPA wahala 😍",
  "You’re the reason this group still dey alive ❤️",
  "You’re smart, fine, and funny - triple threat 👑",
  "If fine was a crime, you for don dey prison for life 😏",
  "You dey give main character energy every day 🌟",
];

const TRUTHS = [
  "What is your biggest secret?", "Who is your crush?", "What is the most embarrassing thing you did?",
  "Have you ever lied to your best friend?", "Who is the last person you stalked on WhatsApp?",
  "Have you ever cheated in exam?", "What is the craziest thing you did for love?",
  "Who do you secretly hate in this group?", "Have you ever sent a message to wrong person?",
  "What is your biggest fear?", "Have you ever cried because of a movie?",
  "What is the worst lie you told your parents?", "Who is your celebrity crush?",
  "Have you ever pretended to be sick to avoid school/work?",
  "What is one thing you will never tell your parents?",
];

const DARES = [
  "Send a voice note singing a song", "Change your DP to a funny pic for 1 hour",
  "Text your crush Hi", "Do 10 pushups and send video",
  "Send your last screenshot to the group", "Call someone in this group and say I love you",
  "Dance to Asake song and send video", "Speak in Yoruba for next 5 messages",
  "Send a selfie with funny face", "Type 'I am the finest in this group' in the group",
  "Send voice note saying you are single and searching",
  "Post 'I miss my ex' as your status for 10 mins",
  "Do an impression of the group admin",
  "Send your gallery 5th picture to the group",
];

const JOKES_FALLBACK = [
  { setup: "Why did the chicken cross the road?", punchline: "To get to the other side!" },
  { setup: "Why did NEPA take light?", punchline: "Because you no pay bill!" },
  { setup: "What do you call a fish without eyes?", punchline: "A fsh!" },
  { setup: "Why is Lagos traffic so long?", punchline: "Because everybody dey go where you dey go!" },
];

module.exports = [
  // ========== JOKE - REAL API + FALLBACK ==========
  {
    command: ['joke'],
    run: async ({ reply }) => {
      try {
        const { data } = await axios.get('https://official-joke-api.appspot.com/random_joke', { timeout: 10000 });
        await reply(box('😂 JOKE', [`${data.setup}`, '', `${data.punchline}`]));
      } catch {
        const j = pick(JOKES_FALLBACK);
        await reply(box('😂 JOKE', [`${j.setup}`, '', `${j.punchline}`]));
      }
    }
  },

  // ========== QUOTE - REAL API ==========
  {
    command: ['quote'],
    run: async ({ reply }) => {
      try {
        const { data } = await axios.get('https://api.quotable.io/random', { timeout: 10000 });
        await reply(box('💭 QUOTE', [`"${data.content}"`, '', `- ${data.author}`]));
      } catch {
        const qs = ["Success is not final, failure is not fatal.", "Be yourself, everyone else is taken.", "Dream big, work hard.", "Knight never gives up.", "No gree for anybody this year."];
        await reply(box('💭 QUOTE', [`"${pick(qs)}"`, '', '- Knight XMD']));
      }
    }
  },

  // ========== MEME ==========
  {
    command: ['meme'],
    run: async ({ sock, from, reply }) => {
      try {
        const { data } = await axios.get('https://meme-api.com/gimme', { timeout: 15000 });
        if (!data?.url) throw new Error('No meme');
        await sock.sendMessage(from, { image: { url: data.url }, caption: box('😂 MEME', [data.title || 'Funny Meme', 'By Knight XMD']) });
      } catch { await reply('😂 Meme failed, try again'); }
    }
  },

  // ========== TRUTH ==========
  {
    command: ['truth'],
    run: async ({ reply }) => {
      await reply(box('🎯 TRUTH', [pick(TRUTHS)]));
    }
  },

  // ========== DARE ==========
  {
    command: ['dare'],
    run: async ({ reply }) => {
      await reply(box('🔥 DARE', [pick(DARES)]));
    }
  },

  // ========== PICKUP LINE - NEW ==========
  {
    command: ['pickup', 'pickupline', 'pick'],
    run: async ({ reply, m, args }) => {
      const t = getTarget(m, args);
      const line = pick(PICKUPS);
      if (t) await reply(box('💘 PICKUP LINE', [`For @${t.split('@')[0]}:`, '', `${line}`]), { mentions: [t] });
      else await reply(box('💘 PICKUP LINE', [line]));
    }
  },

  // ========== RIZZ - NEW ==========
  {
    command: ['rizz', 'rizzcheck'],
    run: async ({ reply, m, args, sender }) => {
      const t = getTarget(m, args) || sender;
      const score = pick(RIZZ);
      await reply(box('😏 RIZZ CHECK', [`@${t.split('@')[0]}`, '', `${score}`]), { mentions: [t] });
    }
  },

  // ========== ROAST - NEW ==========
  {
    command: ['roast', 'insult'],
    run: async ({ reply, m, args }) => {
      const t = getTarget(m, args);
      if (!t) return reply('Mention person to roast: .roast @user');
      await reply(box('🔥 ROAST', [`@${t.split('@')[0]}`, '', `${pick(ROASTS)}`]), { mentions: [t] });
    }
  },

  // ========== COMPLIMENT - NEW ==========
  {
    command: ['compliment', 'praise', 'hype'],
    run: async ({ reply, m, args }) => {
      const t = getTarget(m, args);
      if (!t) return reply('Mention person: .compliment @user');
      await reply(box('🥰 COMPLIMENT', [`@${t.split('@')[0]}`, '', `${pick(COMPLIMENTS)}`]), { mentions: [t] });
    }
  },

  // ========== SHIP / LOVE CALC - NEW ==========
  {
    command: ['ship', 'love', 'compatibility'],
    run: async ({ reply, m, args, sender }) => {
      // .ship @user1 @user2 OR .ship @user (ship with sender)
      const ctx = m.message.extendedTextMessage?.contextInfo;
      const mentioned = ctx?.mentionedJid || [];
      let p1, p2;
      if (mentioned.length >= 2) { p1 = mentioned[0]; p2 = mentioned[1]; }
      else if (mentioned.length === 1) { p1 = sender; p2 = mentioned[0]; }
      else if (args[0]) { p1 = sender; p2 = getTarget(m, args); }
      else return reply('Usage: .ship @user1 @user2\nOr .ship @your crush');
      const percent = Math.floor(Math.random() * 101);
      const bar = '❤️'.repeat(Math.floor(percent / 20)) + '🤍'.repeat(5 - Math.floor(percent / 20));
      const msg = percent > 80 ? 'Perfect Match! Marry now 💍' : percent > 60 ? 'Strong love, e go work ❤️' : percent > 40 ? 'Manageable, try small 😅' : percent > 20 ? 'E go hard o 💔' : 'Forget am, no match at all 💀';
      await reply(box('💘 SHIP', [
        `@${p1.split('@')[0]} ❤️ @${p2.split('@')[0]}`,
        '',
        `Love: ${percent}%`,
        `${bar}`,
        `${msg}`,
      ]), { mentions: [p1, p2] });
    }
  },

  // ========== 8BALL - NEW ==========
  {
    command: ['8ball', 'askball', 'magic'],
    run: async ({ reply, text }) => {
      if (!text) return reply('Usage: .8ball Will I be rich?');
      const answers = ["Yes, definitely! ✅", "No, forget am ❌", "Maybe, if you work hard 🤔", "100% yes! 🔥", "Ask again later...", "My spirit say YES 😍", "No, even NEPA no go agree", "Signs point to YES ✨", "Very doubtful 💀", "Without a doubt! 👑"];
      await reply(box('🎱 8BALL', [`Q: ${text}`, '', `A: ${pick(answers)}`]));
    }
  },

  // ========== COINFLIP - NEW ==========
  {
    command: ['coinflip', 'coin', 'flip'],
    run: async ({ reply }) => {
      const res = Math.random() > 0.5 ? 'Heads 👑' : 'Tails 💫';
      await reply(box('🪙 COINFLIP', [`Result: ${res}`]));
    }
  },

  // ========== DICE - NEW ==========
  {
    command: ['dice', 'roll'],
    run: async ({ reply, m, args }) => {
      const t = getTarget(m, args);
      const num = Math.floor(Math.random() * 6) + 1;
      const dice = ['🎲 1', '🎲 2', '🎲 3', '🎲 4', '🎲 5', '🎲 6'][num - 1];
      if (t) await reply(box('🎲 DICE', [`@${t.split('@')[0]} rolled:`, '', `${dice}`]), { mentions: [t] });
      else await reply(box('🎲 DICE', [`You rolled: ${dice}`]));
    }
  },

  // ========== ROCK PAPER SCISSORS - NEW ==========
  {
    command: ['rps', 'rock', 'game'],
    run: async ({ reply, text }) => {
      if (!text) return reply('Usage: .rps rock\nOr .rps paper\nOr .rps scissors');
      const choice = text.trim().toLowerCase();
      const map = { rock: '🪨 Rock', paper: '📄 Paper', scissors: '✂️ Scissors' };
      if (!map[choice]) return reply('Choose: rock, paper, or scissors');
      const bot = pick(['rock', 'paper', 'scissors']);
      let result = 'Draw 🤝';
      if ((choice === 'rock' && bot === 'scissors') || (choice === 'paper' && bot === 'rock') || (choice === 'scissors' && bot === 'paper')) result = 'You Win! 🎉';
      else if (choice !== bot) result = 'You Lose! 💀 Bot wins';
      await reply(box('🎮 RPS', [`You: ${map[choice]}`, `Bot: ${map[bot]}`, '', `Result: ${result}`]));
    }
  },

  // ========== HOW GAY / HOW FINE / HOW STUPID - FUN RATING - NEW ==========
  {
    command: ['howfine', 'howgay', 'howdumb', 'howrich', 'howhot', 'rate'],
    run: async ({ reply, m, args, sender, command }) => {
      const t = getTarget(m, args) || sender;
      const pct = Math.floor(Math.random() * 101);
      const label = { howfine: 'Fine 😍', howgay: 'Gay 🌈', howdumb: 'Dumb 🤪', howrich: 'Rich 💰', howhot: 'Hot 🔥', rate: 'Fine 😍' }[command] || 'Fine';
      await reply(box(`📊 ${label.toUpperCase()} CHECK`, [`@${t.split('@')[0]} is ${pct}% ${label}`]), { mentions: [t] });
    }
  },

  // ========== WOULD YOU RATHER - NEW ==========
  {
    command: ['wyr', 'wouldyou'],
    run: async ({ reply }) => {
      const q = pick([
        "Be rich but lonely OR be poor but loved?",
        "Have unlimited data OR unlimited food?",
        "Be famous for 1 day OR unknown but rich forever?",
        "Live in Lagos forever OR live in village with peace?",
        "Have 1M followers OR 1M naira?",
        "Never use WhatsApp again OR never eat jollof again?",
        "Be able to fly OR be invisible?",
        "Marry your crush OR get 10M naira?",
      ]);
      await reply(box('🤔 WOULD YOU RATHER', [q]));
    }
  },

  // ========== NEVER HAVE I EVER - NEW ==========
  {
    command: ['nhie', 'never'],
    run: async ({ reply }) => {
      const q = pick([
        "Never have I ever stalked my ex.",
        "Never have I ever lied to my parents about where I was.",
        "Never have I ever sent a message to the wrong person.",
        "Never have I ever cheated in exam.",
        "Never have I ever cried because of a Nigerian movie.",
        "Never have I ever pretended to be asleep to avoid work.",
        "Never have I ever eaten another person’s food without permission.",
        "Never have I ever had a crush on my teacher.",
      ]);
      await reply(box('🙈 NEVER HAVE I EVER', [q, '', 'Reply ✅ if you have, ❌ if you never']));
    }
  },

  // ========== FACT - NEW ==========
  {
    command: ['fact'],
    run: async ({ reply }) => {
      try {
        const { data } = await axios.get('https://uselessfacts.jsph.pl/api/v2/facts/random', { timeout: 10000 });
        await reply(box('🧠 RANDOM FACT', [data.text]));
      } catch {
        await reply(box('🧠 RANDOM FACT', ["Honey never spoils. Archaeologists found 3000 year old honey still good."]));
      }
    }
  },

  // ========== ANIMAL - NEW ==========
  {
    command: ['dog', 'cat'],
    run: async ({ sock, from, reply, command }) => {
      try {
        const url = command === 'dog' ? 'https://dog.ceo/api/breeds/image/random' : 'https://api.thecatapi.com/v1/images/search';
        const { data } = await axios.get(url, { timeout: 15000 });
        const img = command === 'dog' ? data.message : data[0].url;
        await sock.sendMessage(from, { image: { url: img }, caption: box(command === 'dog' ? '🐶 DOG' : '🐱 CAT', ['Cute one for you', 'By Knight XMD']) });
      } catch { await reply('Failed, try again'); }
    }
  },
];
