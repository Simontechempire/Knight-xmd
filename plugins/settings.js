// KNIGHT XMD - Settings System - FIXED, No Duplicate Commands
// By Faceless Tech - This file = prefix + language + settings view only
// Mode commands (public/private/self/mode) dey for owner.js - no duplicate here
// ✅ FIXED: Per-session - each bot get him own prefix/mode/language
const config = require('../config');

function box(title, lines) {
  let t = `> ╭══〘 ${title} 〙══⊷❍\n> ┃✯╭──────────────\n`;
  lines.forEach(l => t += `> ┃✯│ ${l}\n`);
  t += `> ┃✯╰───────────────\n> ╰═══════════════════⊷❍`;
  return t;
}

// ✅ REMOVED: Old saveSettings() wey dey write to global.db + global config
// Old: global.db.settings.prefix = config.prefix -> affect all 20 bots
// New: we use context.saveSession() -> save to sessions/<yourNumber>/settings.json only

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
    run: async ({ reply, args, prefix, sessionSettings, saveSession, config: sessionConfig }) => {
      // ✅ Use this session prefix, not global config.prefix
      const myPrefix = sessionSettings?.prefix || sessionConfig?.prefix || prefix || config.prefix;
      if (!args[0]) {
        return reply(box('⚙️ PREFIX', [
          `Current Prefix: ${myPrefix}`,
          `Example: ${myPrefix}menu`,
          `Change: ${myPrefix}setprefix !  OR  ${myPrefix}prefix !`,
        ]));
      }
      const p = args[0];
      if (p.length > 2) return reply('❌ Prefix too long, use 1 char like . ! # /');
      if ([' ', 'a', '1'].includes(p)) return reply('❌ Use symbol like . ! #');
      // ✅ FIXED: Save to ONLY this session file - sessions/<yourNumber>/settings.json
      if (saveSession) saveSession({ prefix: p });
      await reply(box('✅ PREFIX CHANGED', [
        `New Prefix: ${p}`,
        `Example: ${p}menu`,
        'Saved - only for YOUR bot, go survive restart',
      ]));
    }
  },

  // ========== SETMODE - VALIDATED ==========
  {
    command: ['setmode'],
    ownerOnly: true,
    run: async ({ reply, args, sessionSettings, saveSession, config: sessionConfig }) => {
      const myMode = sessionSettings?.mode || sessionConfig?.mode || config.mode;
      const myPrefix = sessionSettings?.prefix || sessionConfig?.prefix || config.prefix;
      const m = (args[0] || '').toLowerCase().trim();
      if (!m) {
        const info = getModeInfo(myMode);
        return reply(box('⚙️ CURRENT MODE', [
          `Mode: ${info.emoji} ${info.text}`,
          `${info.desc}`,
          `Change: ${myPrefix}setmode public / private / self`,
          `Or: ${myPrefix}public / ${myPrefix}private / ${myPrefix}self`,
        ]));
      }
      if (!['public', 'private', 'self'].includes(m)) {
        return reply('❌ Invalid mode.\nUse: .setmode public\nOr: .setmode private\nOr: .setmode self');
      }
      // ✅ FIXED: Save mode to only this session
      if (saveSession) saveSession({ mode: m });
      const info = getModeInfo(m);
      await reply(box('✅ MODE CHANGED', [
        `Mode: ${info.emoji} ${info.text}`,
        `${info.desc}`,
        'Only for YOUR bot',
      ]));
    }
  },

  // ========== LANGUAGE ==========
  {
    command: ['language', 'lang', 'setlang'],
    ownerOnly: true,
    run: async ({ reply, args, sessionSettings, saveSession, config: sessionConfig }) => {
      const myLang = sessionSettings?.language || sessionConfig?.language || config.language || 'en';
      const lang = (args[0] || '').toLowerCase().trim();
      if (!lang) {
        let list = Object.entries(LANGUAGES).map(([k, v]) => `${k} = ${v}`).join('\n');
        return reply(box('🌐 LANGUAGE', [
          `Current: ${myLang} = ${LANGUAGES[myLang] || 'English'}`,
          'Available:',
          ...list.split('\n'),
          'Change: .language fr',
        ]));
      }
      if (!LANGUAGES[lang]) {
        return reply(`❌ Language "${lang}" no dey.\nAvailable: ${Object.keys(LANGUAGES).join(', ')}\nExample: .language en`);
      }
      // ✅ FIXED: Save language to only this session
      if (saveSession) saveSession({ language: lang });
      await reply(box('✅ LANGUAGE CHANGED', [
        `Language: ${LANGUAGES[lang]}`,
        `Code: ${lang}`,
        'Only for YOUR bot',
      ]));
    }
  },

  // ========== SETTINGS - SHOW ALL ==========
  {
    command: ['settings', 'setting', 'config'],
    ownerOnly: true,
    run: async ({ reply, botNumber, sessionSettings, sessionDB, config: sessionConfig, prefix }) => {
      // ✅ Use session data, not global
      const myPrefix = sessionSettings?.prefix || sessionConfig?.prefix || prefix || config.prefix;
      const myMode = sessionSettings?.mode || sessionConfig?.mode || config.mode;
      const myLang = sessionSettings?.language || sessionConfig?.language || config.language;
      const info = getModeInfo(myMode);
      const s = sessionDB?.settings || global.db.settings || {};
      const anti = sessionDB?.anti || global.db.anti || {};
      const antiOnCount = Object.values(anti).filter(a => a && typeof a === 'object' && Object.keys(a).some(k => k.startsWith('anti') && a[k] === true)).length;
      await reply(box('⚙️ BOT SETTINGS', [
        `Bot: ${sessionConfig?.botName || config.botName}`,
        `Bot Number: +${botNumber || 'Unknown'}`,
        `Owner: +${sessionSettings?.owner || botNumber || 'Unknown'}`,
        `Creator: ${config.creatorName}`,
        `Prefix: ${myPrefix}`,
        `Mode: ${info.emoji} ${info.text} - ${info.desc}`,
        `Language: ${LANGUAGES[myLang] || myLang}`,
        `AutoRead: ${s.autoRead ? 'ON ✅' : 'OFF ❌'}`,
        `AutoReply: ${s.autoReply ? 'ON ✅' : 'OFF ❌'}`,
        `AutoReact: ${s.autoReact ? 'ON ✅' : 'OFF ❌'}`,
        `AutoView: ${s.autoView ? 'ON ✅' : 'OFF ❌'}`,
        `AutoBio: ${s.autoBio ? 'ON ✅' : 'OFF ❌'}`,
        `Groups with Anti ON: ${antiOnCount}`,
        `Banned: ${sessionDB?.banned?.length || global.db.banned?.length || 0} users`,
      ]));
    }
  },

  // ========== RESET SETTINGS - NEW ==========
  {
    command: ['resetsettings'],
    ownerOnly: true,
    run: async ({ reply, saveSession }) => {
      // ✅ FIXED: Reset only this session, not all 20 bots
      if (saveSession) saveSession({ mode: 'public', prefix: '.', language: 'en' });
      await reply(box('✅ SETTINGS RESET', [
        'Mode: PUBLIC',
        'Prefix: .',
        'Language: English',
        'Only for YOUR bot - Restart bot to apply fully',
      ]));
    }
  },
];
