// KNIGHT XMD - Moderator System - Real Handler
// By Faceless Tech

function box(title, lines) {
  let t = `> ╭══〘 ${title} 〙══⊷❍\n> ┃✯╭──────────────\n`;
  lines.forEach(l => t += `> ┃✯│ ${l}\n`);
  t += `> ┃✯╰───────────────\n> ╰═══════════════════⊷❍`;
  return t;
}

function onlyGroup(isGroup, reply) {
  if (!isGroup) { reply('❌ This command only works in a group.'); return false; }
  return true;
}

// Get target - Mention > Reply > Number
function getTarget(m, args) {
  const ctx = m.message.extendedTextMessage?.contextInfo;
  // 1. Mention
  if (ctx?.mentionedJid?.length) return ctx.mentionedJid[0];
  // 2. Reply to person message
  if (ctx?.participant) return ctx.participant;
  // 3. Number: .kick 234807...
  if (args[0]) {
    const num = args[0].replace(/[^0-9]/g, '');
    if (num.length >= 7) return num + '@s.whatsapp.net';
  }
  return null;
}

async function checkCanAct(sock, from, target, sender, botNumber, reply, action) {
  if (!target) { await reply(`❌ Mention user, reply to their message, or give number.\nExample: .${action} @user`); return false; }
  const targetNum = target.split('@')[0];
  // Cannot act on self
  if (targetNum === sender.split('@')[0]) { await reply('❌ You cannot do this to yourself.'); return false; }
  // Cannot act on bot
  if (targetNum === botNumber) { await reply('❌ You cannot do this to the bot.'); return false; }
  // Cannot act on creator
  if (targetNum === '2348071569915') { await reply('❌ You cannot do this to the Creator.'); return false; }
  // Check if target dey group
  try {
    const meta = await sock.groupMetadata(from);
    const person = meta.participants.find(p => p.id === target);
    if (!person) { await reply('❌ That user is not in this group.'); return false; }
    // Cannot kick/promote/demote another admin unless you be owner/creator
    if ((action === 'kick' || action === 'demote') && person.admin) {
      const me = meta.participants.find(p => p.id === sender);
      const iAmOwner = sender.split('@')[0] === botNumber;
      if (!me?.admin || me.admin !== 'superadmin') {
        if (!iAmOwner) { await reply('❌ You cannot kick/demote another admin. Only group owner can.'); return false; }
      }
    }
    if (action === 'promote' && person.admin) { await reply('❌ That user is already admin.'); return false; }
    if (action === 'demote' && !person.admin) { await reply('❌ That user is not admin.'); return false; }
  } catch {}
  return true;
}

function getWarnings(from) {
  if (!global.db) global.db = {};
  if (!global.db.warnings) global.db.warnings = {};
  if (!global.db.warnings[from]) global.db.warnings[from] = {};
  return global.db.warnings[from];
}

module.exports = [
  // ========== KICK ==========
  {
    command: ['kick', 'remove'],
    adminOnly: true,
    run: async ({ sock, from, m, args, reply, sender, botNumber, isGroup }) => {
      if (!onlyGroup(isGroup, reply)) return;
      const t = getTarget(m, args);
      if (!await checkCanAct(sock, from, t, sender, botNumber, reply, 'kick')) return;
      try {
        await sock.groupParticipantsUpdate(from, [t], 'remove');
        await reply(box('👢 KICKED', [`@${t.split('@')[0]} has been kicked`, 'By Knight XMD']), { mentions: [t] });
      } catch { await reply('❌ Kick failed - Bot must be admin'); }
    }
  },

  // ========== ADD ==========
  {
    command: ['add'],
    adminOnly: true,
    run: async ({ sock, from, args, reply, isGroup }) => {
      if (!onlyGroup(isGroup, reply)) return;
      if (!args[0]) return reply('Usage: .add 2348071569915\nOr .add 2348071569915 234... (many)');
      // Support many numbers: .add 234... 234...
      const targets = args.map(a => a.replace(/[^0-9]/g, '')).filter(n => n.length >= 7).map(n => n + '@s.whatsapp.net');
      if (!targets.length) return reply('❌ Invalid number. Example: .add 2348071569915');
      try {
        const res = await sock.groupParticipantsUpdate(from, targets, 'add');
        await reply(box('✅ ADDED', [`Tried to add ${targets.length} user(s)`, 'If e no enter, e fit be privacy setting']));
      } catch { await reply('❌ Add failed - Bot must be admin, and number must not block group add'); }
    }
  },

  // ========== PROMOTE ==========
  {
    command: ['promote', 'makeadmin'],
    adminOnly: true,
    run: async ({ sock, from, m, args, reply, sender, botNumber, isGroup }) => {
      if (!onlyGroup(isGroup, reply)) return;
      const t = getTarget(m, args);
      if (!await checkCanAct(sock, from, t, sender, botNumber, reply, 'promote')) return;
      try {
        await sock.groupParticipantsUpdate(from, [t], 'promote');
        await reply(box('⬆️ PROMOTED', [`@${t.split('@')[0]} is now admin 👑`]), { mentions: [t] });
      } catch { await reply('❌ Promote failed - Bot must be admin'); }
    }
  },

  // ========== DEMOTE ==========
  {
    command: ['demote', 'removeadmin'],
    adminOnly: true,
    run: async ({ sock, from, m, args, reply, sender, botNumber, isGroup }) => {
      if (!onlyGroup(isGroup, reply)) return;
      const t = getTarget(m, args);
      if (!await checkCanAct(sock, from, t, sender, botNumber, reply, 'demote')) return;
      try {
        await sock.groupParticipantsUpdate(from, [t], 'demote');
        await reply(box('⬇️ DEMOTED', [`@${t.split('@')[0]} is no longer admin`]), { mentions: [t] });
      } catch { await reply('❌ Demote failed - Bot must be admin'); }
    }
  },

  // ========== WARN - REAL AUTO KICK AT 3 ==========
  {
    command: ['warn'],
    adminOnly: true,
    run: async ({ sock, from, m, args, reply, sender, botNumber, isGroup }) => {
      if (!onlyGroup(isGroup, reply)) return;
      const t = getTarget(m, args);
      if (!await checkCanAct(sock, from, t, sender, botNumber, reply, 'warn')) return;
      const warns = getWarnings(from);
      warns[t] = (warns[t] || 0) + 1;
      if (global.dbSave) global.dbSave();
      const w = warns[t];
      await reply(box('⚠️ WARNING', [`@${t.split('@')[0]} warned`, `Warnings: ${w}/3`, w >= 3 ? 'Reached 3 - Kicking...' : 'One more warning = Kick']), { mentions: [t] });
      if (w >= 3) {
        try {
          await new Promise(r => setTimeout(r, 1000));
          await sock.groupParticipantsUpdate(from, [t], 'remove');
          warns[t] = 0;
          if (global.dbSave) global.dbSave();
          await reply(`👢 @${t.split('@')[0]} kicked for reaching 3 warnings`, { mentions: [t] });
        } catch { await reply('❌ Auto-kick failed - Bot must be admin'); }
      }
    }
  },

  // ========== WARNINGS ==========
  {
    command: ['warnings', 'warns'],
    adminOnly: true,
    run: async ({ from, m, args, reply, isGroup }) => {
      if (!onlyGroup(isGroup, reply)) return;
      const t = getTarget(m, args);
      if (!t) return reply('Mention user to check warnings');
      const w = getWarnings(from)[t] || 0;
      await reply(box('⚠️ WARNINGS', [`@${t.split('@')[0]} has ${w}/3 warnings`]), { mentions: [t] });
    }
  },

  // ========== RESET WARN ==========
  {
    command: ['resetwarn', 'unwarn', 'clearwarn'],
    adminOnly: true,
    run: async ({ from, m, args, reply, isGroup }) => {
      if (!onlyGroup(isGroup, reply)) return;
      const t = getTarget(m, args);
      if (!t) return reply('Mention user');
      getWarnings(from)[t] = 0;
      if (global.dbSave) global.dbSave();
      await reply(box('✅ WARNING RESET', [`@${t.split('@')[0]} warnings cleared`]), { mentions: [t] });
    }
  },

  // ========== MUTE / UNMUTE ==========
  {
    command: ['mute'],
    adminOnly: true,
    run: async ({ sock, from, reply, isGroup }) => {
      if (!onlyGroup(isGroup, reply)) return;
      try {
        await sock.groupSettingUpdate(from, 'announcement');
        await reply(box('🔇 MUTED', ['Only admins can send message now']));
      } catch { await reply('❌ Bot must be admin'); }
    }
  },
  {
    command: ['unmute'],
    adminOnly: true,
    run: async ({ sock, from, reply, isGroup }) => {
      if (!onlyGroup(isGroup, reply)) return;
      try {
        await sock.groupSettingUpdate(from, 'not_announcement');
        await reply(box('🔊 UNMUTED', ['Everybody can send message now']));
      } catch { await reply('❌ Bot must be admin'); }
    }
  },

  // ========== DELETE - FIXED ==========
  {
    command: ['delete', 'del', 'd'],
    adminOnly: true,
    run: async ({ sock, from, m, reply, isGroup }) => {
      if (!onlyGroup(isGroup, reply)) return;
      const ctx = m.message.extendedTextMessage?.contextInfo;
      if (!ctx?.stanzaId) return reply('Reply to the message you want to delete with .delete');
      try {
        await sock.sendMessage(from, {
          delete: {
            remoteJid: from,
            fromMe: false,
            id: ctx.stanzaId,
            participant: ctx.participant
          }
        });
        await reply('🗑️ Deleted');
      } catch {
        // Try second method - delete bot own message
        try {
          await sock.sendMessage(from, { delete: m.key });
          await reply('🗑️ Deleted');
        } catch { await reply('❌ Delete failed - Message too old or bot not admin'); }
      }
    }
  },
];
