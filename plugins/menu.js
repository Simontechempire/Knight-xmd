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
  {
    command: ['menu', 'help'],
    run: async ({ sock, from, m, prefix }) => {
      const botName = config.BOT_NAME || 'KNIGHT XMD';
      const developer = config.DEVELOPER || 'FACELESS TECH';
      const version = config.VERSION || 'V1';
      const mode = config.MODE || 'PUBLIC';
      const menuPic = config.MENU_PIC || '';

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
      try {
        if (menuPic && menuPic.startsWith('http')) {
          await sock.sendMessage(from, { image: { url: menuPic }, caption: menu }, { quoted: m });
        } else {
          throw new Error('no pic');
        }
      } catch (e) {
        // Catbox / image fails -> send text only, never crash
        await sock.sendMessage(from, { text: menu }, { quoted: m });
      }
    }
  },
  {
    command: ['menulist'],
    run: async ({ sock, from, m, prefix }) => {
      const text = `📋 *KNIGHT XMD MENU*\n\n` + Object.keys(categories).map(c => `📂 *${c}* - ${categories[c].length} cmds\n➜ ${prefix}menucategory ${c}`).join('\n\n');
      await sock.sendMessage(from, { text }, { quoted: m });
    }
  },
  {
    command: ['menucategory'],
    run: async ({ sock, from, m, args, prefix }) => {
      const category = (args || []).join(' ').trim().toUpperCase();
      const commands = categories[category];
      if (!commands) {
        return sock.sendMessage(from, { text: '❌ Category not found. Type .menulist' }, { quoted: m });
      }
      const text = `
╭══〘 ⚔️ ${category} 〙══⊷❍
┃✯╭──────────────
${commands.map(cmd => `┃✯│ ⌨️ ${prefix}${cmd}`).join('\n')}
┃✯╰───────────────
╰═══════════════════⊷❍

👑 Developer: ${config.DEVELOPER || 'FACELESS TECH'}
⚡ Bot: ${config.BOT_NAME || 'KNIGHT XMD'}
`;
      await sock.sendMessage(from, { text }, { quoted: m });
    }
  }
];
