
const config = require('../config');

const startedAt = Date.now();

const categories = {
  OWNER: [
    'menu', 'help', 'ping', 'alive', 'owner',
    'runtime', 'botinfo', 'restart', 'shutdown',
    'broadcast', 'setprefix', 'setname', 'setbio',
    'setpp', 'join', 'leave', 'block', 'unblock',
    'ban', 'unban'
  ],

  AUTO: [
    'autoread', 'autotyping', 'autoonline',
    'autorecording', 'autoreact', 'autoreply',
    'autosticker', 'autoview', 'autobio',
    'autolikestatus'
  ],

  ANTI: [
    'antilink', 'antibot', 'antispam', 'antiflood',
    'antitag', 'antidelete', 'antibadword',
    'antisticker', 'antifake', 'antipromote'
  ],

  MODERATOR: [
    'kick', 'add', 'promote', 'demote', 'warn',
    'warnings', 'resetwarn', 'mute', 'unmute', 'delete'
  ],

  GROUP: [
    'groupinfo', 'grouplink', 'setname', 'setdesc',
    'open', 'close', 'tagall', 'hidetag',
    'listmembers', 'admins'
  ],

  VV: ['vv'],

  DOWNLOADER: [
    'play', 'song', 'video', 'tiktok',
    'instagram', 'facebook', 'mediafire',
    'apk', 'pinterest', 'github'
  ],

  TOOLS: [
    'weather', 'translate', 'calculate', 'shorturl'
  ],

  SETTINGS: [
    'prefix', 'public', 'private',
    'setmode', 'language'
  ],

  STICKER: [
    'sticker', 'toimg', 'take', 'attp', 'smeme'
  ],

  FUN: [
    'joke', 'quote', 'meme', 'truth', 'dare'
  ]
};

const uptime = () => {
  const seconds = Math.floor((Date.now() - startedAt) / 1000);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  return `${days}d ${hours}h ${minutes}m ${secs}s`;
};

const totalCommands = Object.values(categories)
  .reduce((total, commands) => total + commands.length, 0);

module.exports = [

  // MAIN MENU
  {
    command: ['menu', 'help'],

    run: async ({ sock, from, m, prefix }) => {
      const botName = config.BOT_NAME || 'KNIGHT XMD';
      const developer = config.DEVELOPER || 'FACELESS TECH';
      const version = config.VERSION || 'V1';
      const mode = config.MODE || 'PUBLIC';
      const menuPic = config.MENU_PIC ||
        'https://files.catbox.moe/4nbm9j.jpg';

      const menu = `
╭══〘 ⚔️ ${botName} ⚔️ 〙══⊷❍
┃✯╭──────────────
┃✯│ 👑 BOT PANEL
┃✯│
┃✯│ 👑 Owner ➜ ${developer}
┃✯│ ⏱️ Uptime ➜ ${uptime()}
┃✯│ 🔧 Prefix ➜ [ ${prefix} ]
┃✯│ 🌐 Mode ➜ ${mode}
┃✯│ 📦 Cmds ➜ ${totalCommands}
┃✯│ 🗂️ Cats ➜ ${Object.keys(categories).length}
┃✯│ 🚀 Version ➜ ${version}
┃✯╰───────────────

╭══〘 🚀 QUICK START 〙══⊷❍
┃✯╭──────────────
┃✯│ ➜ ${prefix}menu
┃✯│ ➜ ${prefix}menulist
┃✯│ ➜ ${prefix}menucategory OWNER
┃✯╰───────────────

╭══〘 ⚔️ ${botName} 〙══⊷❍
┃✯│ POWER • LOYALTY
┃✯│ EXCELLENCE
╰═══════════════════⊷❍
`;

      await sock.sendMessage(from, {
        image: { url: menuPic },
        caption: menu,

        footer: `${botName} • ${developer}`,

        templateButtons: [
          {
            index: 1,
            urlButton: {
              displayText: '📢 Channel',
              url: config.CHANNEL_URL || 'https://whatsapp.com/'
            }
          },
          {
            index: 2,
            quickReplyButton: {
              displayText: '👑 Owner',
              id: `${prefix}owner`
            }
          },
          {
            index: 3,
            quickReplyButton: {
              displayText: '📋 Open Menu',
              id: `${prefix}menulist`
            }
          }
        ]
      }, { quoted: m });
    }
  },

  // CATEGORY LIST
  {
    command: ['menulist'],

    run: async ({ sock, from, m, prefix }) => {

      const sections = [
        {
          title: '⚔️ KNIGHT XMD CATEGORIES',
          rows: Object.keys(categories).map(category => ({
            title: `📂 ${category}`,
            description: `${categories[category].length} commands`,
            rowId: `${prefix}menucategory ${category}`
          }))
        }
      ];

      await sock.sendMessage(from, {
        text: 'Select a command category below.',
        footer: 'KNIGHT XMD • FACELESS TECH',
        title: '📋 OPEN MENU',
        buttonText: 'SELECT CATEGORY',
        sections
      }, { quoted: m });
    }
  },

  // CATEGORY COMMANDS
  {
    command: ['menucategory'],

    run: async ({ sock, from, m, args, prefix }) => {

      const category = (args || [])
        .join(' ')
        .trim()
        .toUpperCase();

      const commands = categories[category];

      if (!commands) {
        return sock.sendMessage(from, {
          text: '❌ Category not found. Type .menulist'
        }, { quoted: m });
      }

      const text = `
╭══〘 ⚔️ ${category} 〙══⊷❍
┃✯╭──────────────
${commands.map(cmd => `┃✯│ ⌨️ ${prefix}${cmd}`).join('\n')}
┃✯╰───────────────
╰═══════════════════⊷❍

👑 Developer: ${config.DEVELOPER || 'FACELESS TECH'}
⚡ Bot: ${config.BOT_NAME || 'KNIGHT XMD'}

Select another category from the menu.`;

      await sock.sendMessage(from, {
        text,
        footer: 'KNIGHT XMD • POWER AND LOYALTY',
        title: `${category} COMMANDS`,
        buttonText: 'OPEN CATEGORIES',
        sections: [
          {
            title: 'COMMAND CATEGORIES',
            rows: Object.keys(categories).map(name => ({
              title: `📂 ${name}`,
              rowId: `${prefix}menucategory ${name}`
            }))
          }
        ]
      }, { quoted: m });
    }
  }
];
    
