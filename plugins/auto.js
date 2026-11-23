// KNIGHT XMD - Auto System - Real Handler
// By Faceless Tech

function getSettings() {
  if (!global.db) global.db = {};
  if (!global.db.settings) {
    global.db.settings = {
      autoRead: false,
      autoTyping: false,
      autoOnline: true,
      autoRecording: false,
      autoReact: false,
      autoReply: false,
      autoSticker: false,
      autoView: false,
      autoBio: false,
      autoLikeStatus: false,
    };
  }
  return global.db.settings;
}

function parseToggle(args) {
  if (!args[0]) return null;
  const v = args[0].toLowerCase().trim();
  if (['on', 'enable', 'activate', '1', 'true'].includes(v)) return true;
  if (['off', 'disable', 'deactivate', '0', 'false'].includes(v)) return false;
  return 'invalid';
}

function toggle({ reply, args, key, label, emoji, onMsg, offMsg, onRun, offRun }) {
  const s = getSettings();
  const parsed = parseToggle(args);

  // .autoread alone = show status, no go turn OFF by mistake
  if (parsed === null) {
    return reply(
      `> ╭══〘 ${emoji} ${label} 〙══⊷❍\n` +
      `> ┃✯╭──────────────\n` +
      `> ┃✯│ Status: ${s[key] ? 'ON ✅' : 'OFF ❌'}\n` +
      `> ┃✯│ Usage: .${key} on / off\n` +
      `> ┃✯╰───────────────\n` +
      `> ╰═══════════════════⊷❍`
    );
  }

  if (parsed === 'invalid') {
    return reply(`❌ Invalid. Use: .${key} on  OR  .${key} off`);
  }

  s[key] = parsed;
  if (global.dbSave) global.dbSave();

  // Extra action for special ones
  if (parsed && onRun) onRun();
  if (!parsed && offRun) offRun();

  return reply(
    `> ╭══〘 ${emoji} ${label} 〙══⊷❍\n` +
    `> ┃✯╭──────────────\n` +
    `> ┃✯│ Status: ${parsed ? 'ON ✅' : 'OFF ❌'}\n` +
    `> ┃✯│ ${parsed ? onMsg : offMsg}\n` +
    `> ┃✯╰───────────────\n` +
    `> ╰═══════════════════⊷❍`
  );
}

// For AutoBio - make sure we no create many intervals
let bioInterval = null;
function startBio(sock) {
  if (bioInterval) clearInterval(bioInterval);
  bioInterval = setInterval(async () => {
    try {
      await sock.updateProfileStatus(`⚔️ Knight XMD | ${new Date().toLocaleTimeString()} | By Faceless Tech`);
    } catch {}
  }, 60000);
  // Update once immediately
  sock.updateProfileStatus(`⚔️ Knight XMD | ${new Date().toLocaleTimeString()} | By Faceless Tech`).catch(()=>{});
}
function stopBio() {
  if (bioInterval) { clearInterval(bioInterval); bioInterval = null; }
}

module.exports = [
  {
    command: ['autoread'],
    ownerOnly: true,
    run: async (ctx) => toggle({ ...ctx, key: 'autoRead', label: 'AUTO-READ', emoji: '👀', onMsg: 'All messages will be marked as read', offMsg: 'Messages will not be marked as read' })
  },
  {
    command: ['autotyping'],
    ownerOnly: true,
    run: async (ctx) => toggle({ ...ctx, key: 'autoTyping', label: 'AUTO-TYPING', emoji: '⌨️', onMsg: 'Bot will show typing... on every chat', offMsg: 'Typing indicator off' })
  },
  {
    command: ['autoonline'],
    ownerOnly: true,
    run: async (ctx) => toggle({ ...ctx, key: 'autoOnline', label: 'AUTO-ONLINE', emoji: '🟢', onMsg: 'Bot will always appear online', offMsg: 'Bot will appear offline when idle' })
  },
  {
    command: ['autorecording'],
    ownerOnly: true,
    run: async (ctx) => toggle({ ...ctx, key: 'autoRecording', label: 'AUTO-RECORDING', emoji: '🎙️', onMsg: 'Bot will show recording... on every chat', offMsg: 'Recording indicator off' })
  },
  {
    command: ['autoreact'],
    ownerOnly: true,
    run: async (ctx) => toggle({ ...ctx, key: 'autoReact', label: 'AUTO-REACT', emoji: '❤️', onMsg: 'Bot will auto react to messages', offMsg: 'Auto react off' })
  },
  {
    command: ['autoreply'],
    ownerOnly: true,
    run: async (ctx) => toggle({ ...ctx, key: 'autoReply', label: 'AUTO-REPLY', emoji: '💬', onMsg: 'Bot will reply Hi + menu to new DM', offMsg: 'Auto reply off' })
  },
  {
    command: ['autosticker'],
    ownerOnly: true,
    run: async (ctx) => toggle({ ...ctx, key: 'autoSticker', label: 'AUTO-STICKER', emoji: '🏷️', onMsg: 'All images/videos will become sticker', offMsg: 'Auto sticker off' })
  },
  {
    command: ['autoview'],
    ownerOnly: true,
    run: async (ctx) => toggle({ ...ctx, key: 'autoView', label: 'AUTO-VIEW STATUS', emoji: '👁️', onMsg: 'Bot will auto view all status', offMsg: 'Status view off' })
  },
  {
    command: ['autobio'],
    ownerOnly: true,
    run: async (ctx) => toggle({
      ...ctx,
      key: 'autoBio',
      label: 'AUTO-BIO',
      emoji: '📝',
      onMsg: 'Bio will update every 60s with time',
      offMsg: 'Bio will not update again',
      onRun: () => startBio(ctx.sock),
      offRun: () => stopBio()
    })
  },
  {
    command: ['autolikestatus'],
    ownerOnly: true,
    run: async (ctx) => toggle({ ...ctx, key: 'autoLikeStatus', label: 'AUTO-LIKE STATUS', emoji: '💖', onMsg: 'Bot will auto like all status', offMsg: 'Auto like off' })
  },
  // Bonus: show all auto status
  {
    command: ['autostatus', 'autolist'],
    ownerOnly: true,
    run: async ({ reply }) => {
      const s = getSettings();
      const line = (name, v) => `> ┃✯│ ${v ? '✅' : '❌'} ${name}: ${v ? 'ON' : 'OFF'}`;
      await reply(
        `> ╭══〘 ⚙️ AUTO STATUS 〙══⊷❍\n` +
        `> ┃✯╭──────────────\n` +
        `${line('AutoRead', s.autoRead)}\n` +
        `${line('AutoTyping', s.autoTyping)}\n` +
        `${line('AutoOnline', s.autoOnline)}\n` +
        `${line('AutoRecording', s.autoRecording)}\n` +
        `${line('AutoReact', s.autoReact)}\n` +
        `${line('AutoReply', s.autoReply)}\n` +
        `${line('AutoSticker', s.autoSticker)}\n` +
        `${line('AutoView Status', s.autoView)}\n` +
        `${line('AutoBio', s.autoBio)}\n` +
        `${line('AutoLike Status', s.autoLikeStatus)}\n` +
        `> ┃✯╰───────────────\n` +
        `> ╰═══════════════════⊷❍`
      );
    }
  },
];
