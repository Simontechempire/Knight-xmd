// KNIGHT XMD - Settings System - Real Handler
// By Faceless Tech
const config = require('../config');

function box(title, lines) {
  let t = `> ╭══〘 ${title} 〙══⊷❍\n> ┃✯╭──────────────\n`;
  lines.forEach(l => t += `> ┃✯│ ${l}\n`);
  t += `> ┃✯╰───────────────\n> ╰═══════════════════⊷❍`;
  return t;
}

function saveSettings() {
  if (!global.db) global.db = {};
  if (!global.db.settings) global.db.settings = {};
  // Save mode + prefix + language inside DB so restart no go reset am
  global.db.settings.mode = config.mode;
  global.db.settings.prefix = config.prefix;
  global.db.settings.language = config.language;
  if (global.dbSave) global.dbSave();
}

function getModeInfo(mode) {
  if (mode === 'public') return { emoji: '🌐', text: 'PUBLIC', desc: 'Everybody can use bot' };
  if (mode === 'private') return { emoji: '🔒', text: 'PRIVATE', desc: 'Only owner can use bot' };
  if (mode === 'self') return { emoji: '👤', text: 'SELF', desc: 'Only bot number can use bot' };
  return { emoji: '🌐', text: mode.toUpperCase(), desc: '' };
}

const LANGUAGES = {
  en: 'English 🇬🇧',
  fr: 'French 🇫🇷',
  es: 'Spanish 🇪🇸',
  pt: 'Portuguese 🇵🇹',
  ar: 'Arabic 🇸🇦',
  ha: 'Hausa 🇳🇬',
  yo: 'Yoruba 🇳🇬',
  ig: 'Igbo 🇳🇬',
  sw: 'Swahili 🇰🇪',
};

module.exports = [
  // ========== PREFIX - SHOW + SET ==========
  {
    command: ['prefix'],
    ownerOnly: true,
    run: async ({ reply, args }) => {
      // .prefix alone = show
      if (!args[0]) {
        return reply(box('⚙️ PREFIX', [
          `Current Prefix: ${config.prefix}`,
          `Example: ${config.prefix}menu`,
          `Change: .setprefix !`,
        ]));
      }
      // .prefix ! = set
      const p = args[0];
      if (p.length > 2) return reply('❌ Prefix too long, use 1 char like . ! # /');
      config.prefix = p;
      saveSettings();
      await reply(box('✅ PREFIX CHANGED', [
        `New Prefix: ${p}`,
        `Example: ${p}menu`,
      ]));
    }
  },

  // ========== PUBLIC ==========
  {
    command: ['public'],
    ownerOnly: true,
    run: async ({ reply }) => {
      config.mode = 'public';
      saveSettings();
      await reply(box('🌐 MODE', [
        'Mode: PUBLIC',
        'Everybody can use bot',
        'Any group / DM fit use commands',
      ]));
    }
  },

  // ========== PRIVATE ==========
  {
    command: ['private'],
    ownerOnly: true,
    run: async ({ reply }) => {
      config.mode = 'private';
      saveSettings();
      await reply(box('🔒 MODE', [
        'Mode: PRIVATE',
        'Only owner can use bot',
        'Others go get "Only owner" message',
      ]));
    }
  },

  // ========== SELF - NEW ==========
  {
    command: ['self'],
    ownerOnly: true,
    run: async ({ reply }) => {
      config.mode = 'self';
      saveSettings();
      await reply(box('👤 MODE', [
        'Mode: SELF',
        'Only bot number can use bot',
        'Even owner number no go work if e no be bot number',
      ]));
    }
  },

  // ========== SETMODE - VALIDATED ==========
  {
    command: ['setmode'],
    ownerOnly: true,
    run: async ({ reply, args }) => {
      const m = (args[0] || '').toLowerCase().trim();
      if (!m) {
        const info = getModeInfo(config.mode);
        return reply(box('⚙️ CURRENT MODE', [
          `Mode: ${info.emoji} ${info.text}`,
          `${info.desc}`,
          'Change: .setmode public / private / self',
        ]));
      }
      if (!['public', 'private', 'self'].includes(m)) {
        return reply('❌ Invalid mode.\nUse: .setmode public\nOr: .setmode private\nOr: .setmode self');
      }
      config.mode = m;
      saveSettings();
      const info = getModeInfo(m);
      await reply(box('✅ MODE CHANGED', [
        `Mode: ${info.emoji} ${info.text}`,
        `${info.desc}`,
      ]));
    }
  },

  // ========== LANGUAGE - VALIDATED ==========
  {
    command: ['language', 'lang', 'setlang'],
    ownerOnly: true,
    run: async ({ reply, args }) => {
      const lang = (args[0] || '').toLowerCase().trim();
      if (!lang) {
        let list = Object.entries(LANGUAGES).map(([k, v]) => `${k} = ${v}`).join('\n');
        return reply(box('🌐 LANGUAGE', [
          `Current: ${config.language || 'en'} = ${LANGUAGES[config.language] || 'English'}`,
          'Available:',
          ...list.split('\n'),
          'Change: .language fr',
        ]));
      }
      if (!LANGUAGES[lang]) {
        return reply(`❌ Language "${lang}" no dey.\nAvailable: ${Object.keys(LANGUAGES).join(', ')}\nExample: .language en`);
      }
      config.language = lang;
      saveSettings();
      await reply(box('✅ LANGUAGE CHANGED', [
        `Language: ${LANGUAGES[lang]}`,
        `Code: ${lang}`,
      ]));
    }
  },

  // ========== SETTINGS - SHOW ALL AT ONCE - NEW ==========
  {
    command: ['settings', 'setting', 'config'],
    ownerOnly: true,
    run: async ({ reply }) => {
      const info = getModeInfo(config.mode);
      await reply(box('⚙️ BOT SETTINGS', [
        `Bot: ${config.botName}`,
        `Creator: ${config.creatorName}`,
        `Prefix: ${config.prefix}`,
        `Mode: ${info.emoji} ${info.text} - ${info.desc}`,
        `Language: ${LANGUAGES[config.language] || config.language}`,
        `AutoRead: ${global.db.settings?.autoRead ? 'ON ✅' : 'OFF ❌'}`,
        `AutoReply: ${global.db.settings?.autoReply ? 'ON ✅' : 'OFF ❌'}`,
        `AutoView: ${global.db.settings?.autoView ? 'ON ✅' : 'OFF ❌'}`,
        `Banned: ${global.db.banned?.length || 0} users`,
      ]));
    }
  },
];
