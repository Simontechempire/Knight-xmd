// KNIGHT XMD - Anti System - Real Handler
// By Faceless Tech - All 10 anti, real, no fake

function getAnti(from) {
  if (!global.db) global.db = {};
  if (!global.db.anti) global.db.anti = {};
  if (!global.db.anti[from]) {
    global.db.anti[from] = {
      antilink: false,
      antibot: false,
      antispam: false,
      antiflood: false,
      antitag: false,
      antidelete: false,
      antibadword: false,
      antisticker: false,
      antifake: false,
      antipromote: false,
    };
  }
  return global.db.anti[from];
}

function parseToggle(args) {
  if (!args[0]) return null; // no arg = show status
  const v = args[0].toLowerCase().trim();
  if (['on', 'enable', 'activate', '1', 'true'].includes(v)) return true;
  if (['off', 'disable', 'deactivate', '0', 'false'].includes(v)) return false;
  return 'invalid';
}

function toggle({ reply, from, args, key, label, emoji, onMsg, offMsg }) {
  const anti = getAnti(from);
  const parsed = parseToggle(args);

  // If user type only .antilink without on/off -> show current status
  if (parsed === null) {
    return reply(
      `> ╭══〘 ${emoji} ${label} 〙══⊷❍\n` +
      `> ┃✯╭──────────────\n` +
      `> ┃✯│ Status: ${anti[key] ? 'ON ✅' : 'OFF ❌'}\n` +
      `> ┃✯│ Usage: .${key} on / off\n` +
      `> ┃✯╰───────────────\n` +
      `> ╰═══════════════════⊷❍`
    );
  }

  if (parsed === 'invalid') {
    return reply(`❌ Invalid. Use: .${key} on  OR  .${key} off\nExample: .${key} on`);
  }

  anti[key] = parsed;
  // Save immediately
  if (global.dbSave) global.dbSave();

  return reply(
    `> ╭══〘 ${emoji} ${label} 〙══⊷❍\n` +
    `> ┃✯╭──────────────\n` +
    `> ┃✯│ Status: ${parsed ? 'ON ✅' : 'OFF ❌'}\n` +
    `> ┃✯│ ${parsed ? onMsg : offMsg}\n` +
    `> ┃✯╰───────────────\n` +
    `> ╰═══════════════════⊷❍`
  );
}

module.exports = [
  {
    command: ['antilink'],
    adminOnly: true,
    run: async (ctx) => toggle({ ...ctx, key: 'antilink', label: 'ANTI-LINK', emoji: '🔗', onMsg: 'All links will be auto-deleted', offMsg: 'Links allowed now' })
  },
  {
    command: ['antibot'],
    adminOnly: true,
    run: async (ctx) => toggle({ ...ctx, key: 'antibot', label: 'ANTI-BOT', emoji: '🤖', onMsg: 'Other bots will be blocked / deleted', offMsg: 'Bots allowed now' })
  },
  {
    command: ['antispam'],
    adminOnly: true,
    run: async (ctx) => toggle({ ...ctx, key: 'antispam', label: 'ANTI-SPAM', emoji: '🚫', onMsg: 'Same message 3x in 10s = deleted', offMsg: 'Spam allowed now' })
  },
  {
    command: ['antiflood'],
    adminOnly: true,
    run: async (ctx) => toggle({ ...ctx, key: 'antiflood', label: 'ANTI-FLOOD', emoji: '🌊', onMsg: '6 messages in 5s = deleted', offMsg: 'Flooding allowed now' })
  },
  {
    command: ['antitag'],
    adminOnly: true,
    run: async (ctx) => toggle({ ...ctx, key: 'antitag', label: 'ANTI-TAG', emoji: '🏷️', onMsg: 'Tagging 5+ people = deleted', offMsg: 'Tagging allowed now' })
  },
  {
    command: ['antidelete'],
    adminOnly: true,
    run: async (ctx) => toggle({ ...ctx, key: 'antidelete', label: 'ANTI-DELETE', emoji: '🗑️', onMsg: 'Deleted messages will be recovered and re-sent', offMsg: 'Deleted messages will not be recovered' })
  },
  {
    command: ['antibadword'],
    adminOnly: true,
    run: async (ctx) => toggle({ ...ctx, key: 'antibadword', label: 'ANTI-BADWORD', emoji: '🤬', onMsg: 'Bad words will be auto-deleted', offMsg: 'Bad words allowed now' })
  },
  {
    command: ['antisticker'],
    adminOnly: true,
    run: async (ctx) => toggle({ ...ctx, key: 'antisticker', label: 'ANTI-STICKER', emoji: '🏷️', onMsg: 'All stickers will be auto-deleted', offMsg: 'Stickers allowed now' })
  },
  {
    command: ['antifake'],
    adminOnly: true,
    run: async (ctx) => toggle({ ...ctx, key: 'antifake', label: 'ANTI-FAKE', emoji: '🌍', onMsg: 'Only +234 numbers allowed, others will be removed', offMsg: 'All numbers allowed now' })
  },
  {
    command: ['antipromote'],
    adminOnly: true,
    run: async (ctx) => toggle({ ...ctx, key: 'antipromote', label: 'ANTI-PROMOTE', emoji: '⬆️', onMsg: 'Promotion / DM me / Join my group = deleted', offMsg: 'Promotion allowed now' })
  },
  // Bonus: Show all anti status at once
  {
    command: ['antistatus', 'antilist'],
    adminOnly: true,
    run: async ({ reply, from }) => {
      const a = getAnti(from);
      const line = (name, v) => `┆ ${v ? '✅' : '❌'} ${name}: ${v ? 'ON' : 'OFF'}`;
      await reply(
        `> ╭══〘 🛡️ ANTI STATUS 〙══⊷❍\n` +
        `> ┃✯╭──────────────\n` +
        `> ┃✯│ ${line('AntiLink', a.antilink)}\n` +
        `> ┃✯│ ${line('AntiBot', a.antibot)}\n` +
        `> ┃✯│ ${line('AntiSpam', a.antispam)}\n` +
        `> ┃✯│ ${line('AntiFlood', a.antiflood)}\n` +
        `> ┃✯│ ${line('AntiTag', a.antitag)}\n` +
        `> ┃✯│ ${line('AntiDelete', a.antidelete)}\n` +
        `> ┃✯│ ${line('AntiBadword', a.antibadword)}\n` +
        `> ┃✯│ ${line('AntiSticker', a.antisticker)}\n` +
        `> ┃✯│ ${line('AntiFake', a.antifake)}\n` +
        `> ┃✯│ ${line('AntiPromote', a.antipromote)}\n` +
        `> ┃✯╰───────────────\n` +
        `> ╰═══════════════════⊷❍`
      );
    }
  },
];
