// KNIGHT XMD - Settings System - FIXED, No Duplicate Commands
// By Faceless Tech - This file = prefix + language + settings view only
// Mode commands (public/private/self/mode) dey for owner.js - no duplicate here
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
  global.db.settings.mode = config.mode;
  global.db.settings.prefix = config.prefix;
  global.db.settings.language = config.language;
  // Also save autos so settings view no lose am
  if (global.dbSave) global.dbSave();
}

function getModeInfo(mode) {
  if (mode === 'public') return { emoji: '🌐', text: 'PUBLIC', desc: 'Everybody can use bot' };
  if (mode === 'private') return { emoji: '🔒', text: 'PRIVATE', desc: 'Only Owner + Creator can use bot' };
  if (mode === 'self') return { emoji: '👤', text: 'SELF', desc: 'Only Owner + Creator can use bot' };
  return { emoji: '🌐', text: String(mode).toUpperCase(), desc: '' };
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
      if (!args[0]) {
        return reply(box('⚙️ PREFIX', [
          `Current Prefix: ${config.prefix}`,
          `Example: ${config.prefix}menu`,
          `Change: .setprefix !  OR  .prefix !`,
        ]));
      }
      const p = args[0];
      if (p.length > 2) return reply('❌ Prefix too long, use 1 char like . ! # /');
      if ([' ', 'a', '1'].includes(p)) return reply('❌ Use symbol like . ! #');
      config.prefix = p;
      saveSettings();
      await reply(box('✅ PREFIX CHANGED', [
        `New Prefix: ${p}`,
        `Example: ${p}menu`,
        'Saved - go survive restart',
      ]));
    }
  },

  // ========== SETMODE - VALIDATED (mode/public/private/self dey for owner.js, this na alias) ==========
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
          'Or: .public / .private / .self',
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

  // ========== LANGUAGE ==========
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

  // ========== SETTINGS - SHOW ALL ==========
  {
    command: ['settings', 'setting', 'config'],
    ownerOnly: true,
    run: async ({ reply, botNumber }) => {
      const info = getModeInfo(config.mode);
      const s = global.db.settings || {};
      const anti = global.db.anti || {};
      const antiOnCount = Object.values(anti).filter(a => a && typeof a === 'object' && Object.keys(a).some(k => k.startsWith('anti') && a[k] === true)).length;
      await reply(box('⚙️ BOT SETTINGS', [
        `Bot: ${config.botName}`,
        `Bot Number: +${botNumber || 'Unknown'}`,
        `Creator: ${config.creatorName}`,
        `Prefix: ${config.prefix}`,
        `Mode: ${info.emoji} ${info.text} - ${info.desc}`,
        `Language: ${LANGUAGES[config.language] || config.language}`,
        `AutoRead: ${s.autoRead ? 'ON ✅' : 'OFF ❌'}`,
        `AutoReply: ${s.autoReply ? 'ON ✅' : 'OFF ❌'}`,
        `AutoReact: ${s.autoReact ? 'ON ✅' : 'OFF ❌'}`,
        `AutoView: ${s.autoView ? 'ON ✅' : 'OFF ❌'}`,
        `AutoBio: ${s.autoBio ? 'ON ✅' : 'OFF ❌'}`,
        `Groups with Anti ON: ${antiOnCount}`,
        `Banned: ${global.db.banned?.length || 0} users`,
      ]));
    }
  },

  // ========== RESET SETTINGS - NEW ==========
  {
    command: ['resetsettings'],
    ownerOnly: true,
    run: async ({ reply }) => {
      config.mode = 'public';
      config.prefix = '.';
      config.language = 'en';
      saveSettings();
      await reply(box('✅ SETTINGS RESET', [
        'Mode: PUBLIC',
        'Prefix: .',
        'Language: English',
        'Restart bot to apply fully',
      ]));
    }
  },
];
