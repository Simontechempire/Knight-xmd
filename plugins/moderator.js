// KNIGHT XMD - Moderator System - FIXED LID + BotAdmin - Connected to handler.js
// By Faceless Tech
const config = require('../config');
const CREATOR = '2348071569915';

const clean = (jid) => (jid || '').split('@')[0].split(':')[0].replace(/[^0-9]/g, '');

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

// Get target - Mention > Reply > Number - returns JID as-is (keep LID!)
function getTarget(m, args) {
  const ctx = m.message.extendedTextMessage?.contextInfo;
  if (ctx?.mentionedJid?.length) return ctx.mentionedJid[0];
  if (ctx?.participant) return ctx.participant;
  if (args[0]) {
    const num = clean(args[0]);
    if (num.length >= 7) return num + '@s.whatsapp.net';
  }
  return null;
}

// Find participant by ANY id: id / pn / lid / clean number
function findParticipant(meta, targetJid) {
  if (!meta || !targetJid) return null;
  const tClean = clean(targetJid);
  const tRaw = targetJid;
  return meta.participants.find(p => {
    if (p.id === tRaw) return true;
    if (clean(p.id) === tClean) return true;
    if (p.pn && clean(p.pn) === tClean) return true;
    if (p.pn === tRaw) return true;
    if (p.lid && clean(p.lid) === tClean) return true;
    if (p.lid === tRaw) return true;
    return false;
  });
}

async function checkCanAct(sock, from, target, sender, botNumber, reply, action, groupMeta) {
  if (!target) { await reply(`❌ Mention user, reply to their message, or give number.\nExample: .${action} @user`); return false; }
  const targetClean = clean(target);
  const senderClean = clean(sender);
  if (targetClean === senderClean) { await reply('❌ You cannot do this to yourself.'); return false; }
  if (targetClean === clean(botNumber)) { await reply('❌ You cannot do this to the bot.'); return false; }
  if (targetClean === CREATOR) { await reply('❌ You cannot do this to the Creator.'); return false; }
  try {
    const meta = groupMeta || await sock.groupMetadata(from);
    const person = findParticipant(meta, target);
    if (!person) { await reply('❌ That user is not in this group.'); return false; }
    if (action === 'promote' && person.admin) { await reply('❌ That user is already admin.'); return false; }
    if (action === 'demote' && !person.admin) { await reply('❌ That user is not admin.'); return false; }
    // Cannot kick/demote admin unless you be group owner or bot owner/creator
    if ((action === 'kick' || action === 'demote') && person.admin) {
      const me = findParticipant(meta, sender);
      const isBotOwner = senderClean === clean(botNumber) || senderClean === CREATOR;
      // group owner = participant with admin === 'superadmin'
      if (me?.admin !== 'superadmin' && !isBotOwner) {
        await reply('❌ You cannot kick/demote another admin. Only group owner can.'); return false;
      }
    }
  } catch {}
  return true;
}

function getWarnings(from) {
  if (!global.db) global.db = {};
  if (!global.db.warnings) global.db.warnings = {};
  if (!global.db.warnings[from]) global.db.warnings[from] = {};
  return global.db.warnings[from];
}

// Use real JID from group metadata for groupParticipantsUpdate - LID fix
function realJid(meta, target) {
  const p = findParticipant(meta, target);
  return p ? p.id : target;
}

module.exports = [
  {
    command: ['kick', 'remove'],
    adminOnly: true, botAdminOnly: true, groupOnly: true,
    run: async ({ sock, from, m, args, reply, sender, botNumber, isGroup, groupMeta }) => {
      if (!onlyGroup(isGroup, reply)) return;
      const t = getTarget(m, args);
      if (!await checkCanAct(sock, from, t, sender, botNumber, reply, 'kick', groupMeta)) return;
      try {
        await sock.groupParticipantsUpdate(from, [realJid(groupMeta, t)], 'remove');
        await reply(box('👢 KICKED', [`@${clean(t)} has been kicked`, 'By Knight XMD']), { mentions: [t] });
      } catch (e) { await reply('❌ Kick failed - ' + e.message); }
    }
  },
  {
    command: ['add'],
    adminOnly: true, botAdminOnly: true, groupOnly: true,
    run: async ({ sock, from, args, reply, isGroup }) => {
      if (!onlyGroup(isGroup, reply)) return;
      if (!args[0]) return reply('Usage: .add 2348071569915\nOr .add 2348071569915 234... (many)');
      const targets = args.map(a => clean(a)).filter(n => n.length >= 7).map(n => n + '@s.whatsapp.net');
      if (!targets.length) return reply('❌ Invalid number. Example: .add 2348071569915');
      try {
        await sock.groupParticipantsUpdate(from, targets, 'add');
        await reply(box('✅ ADDED', [`Tried to add ${targets.length} user(s)`, 'If e no enter, e fit be privacy setting']));
      } catch (e) { await reply('❌ Add failed - Bot must be admin, and number must not block group add'); }
    }
  },
  {
    command: ['promote', 'makeadmin'],
    adminOnly: true, botAdminOnly: true, groupOnly: true,
    run: async ({ sock, from, m, args, reply, sender, botNumber, isGroup, groupMeta }) => {
      if (!onlyGroup(isGroup, reply)) return;
      const t = getTarget(m, args);
      if (!await checkCanAct(sock, from, t, sender, botNumber, reply, 'promote', groupMeta)) return;
      try {
        await sock.groupParticipantsUpdate(from, [realJid(groupMeta, t)], 'promote');
        await reply(box('⬆️ PROMOTED', [`@${clean(t)} is now admin 👑`]), { mentions: [t] });
      } catch { await reply('❌ Promote failed - Bot must be admin'); }
    }
  },
  {
    command: ['demote', 'removeadmin'],
    adminOnly: true, botAdminOnly: true, groupOnly: true,
    run: async ({ sock, from, m, args, reply, sender, botNumber, isGroup, groupMeta }) => {
      if (!onlyGroup(isGroup, reply)) return;
      const t = getTarget(m, args);
      if (!await checkCanAct(sock, from, t, sender, botNumber, reply, 'demote', groupMeta)) return;
      try {
        await sock.groupParticipantsUpdate(from, [realJid(groupMeta, t)], 'demote');
        await reply(box('⬇️ DEMOTED', [`@${clean(t)} is no longer admin`]), { mentions: [t] });
      } catch { await reply('❌ Demote failed - Bot must be admin'); }
    }
  },
  {
    command: ['warn'],
    adminOnly: true, groupOnly: true,
    run: async ({ sock, from, m, args, reply, sender, botNumber, isGroup, groupMeta }) => {
      if (!onlyGroup(isGroup, reply)) return;
      const t = getTarget(m, args);
      if (!await checkCanAct(sock, from, t, sender, botNumber, reply, 'warn', groupMeta)) return;
      const warns = getWarnings(from);
      const key = clean(t); // Use clean number as key so LID/number no double count
      warns[key] = (warns[key] || 0) + 1;
      if (global.dbSave) global.dbSave();
      const w = warns[key];
      await reply(box('⚠️ WARNING', [`@${key} warned`, `Warnings: ${w}/3`, w >= 3 ? 'Reached 3 - Kicking...' : 'One more warning = Kick']), { mentions: [t] });
      if (w >= 3) {
        try {
          await new Promise(r => setTimeout(r, 1000));
          await sock.groupParticipantsUpdate(from, [realJid(groupMeta, t)], 'remove');
          warns[key] = 0;
          if (global.dbSave) global.dbSave();
          await reply(`👢 @${key} kicked for reaching 3 warnings`, { mentions: [t] });
        } catch { await reply('❌ Auto-kick failed - Bot must be admin'); }
      }
    }
  },
  {
    command: ['warnings', 'warns'],
    adminOnly: true, groupOnly: true,
    run: async ({ from, m, args, reply, isGroup }) => {
      if (!onlyGroup(isGroup, reply)) return;
      const t = getTarget(m, args);
      if (!t) return reply('Mention user to check warnings');
      const w = getWarnings(from)[clean(t)] || 0;
      await reply(box('⚠️ WARNINGS', [`@${clean(t)} has ${w}/3 warnings`]), { mentions: [t] });
    }
  },
  {
    command: ['resetwarn', 'unwarn', 'clearwarn'],
    adminOnly: true, groupOnly: true,
    run: async ({ from, m, args, reply, isGroup }) => {
      if (!onlyGroup(isGroup, reply)) return;
      const t = getTarget(m, args);
      if (!t) return reply('Mention user');
      getWarnings(from)[clean(t)] = 0;
      if (global.dbSave) global.dbSave();
      await reply(box('✅ WARNING RESET', [`@${clean(t)} warnings cleared`]), { mentions: [t] });
    }
  },
  {
    command: ['mute'],
    adminOnly: true, botAdminOnly: true, groupOnly: true,
    run: async ({ sock, from, reply, isGroup }) => {
      if (!onlyGroup(isGroup, reply)) return;
      try { await sock.groupSettingUpdate(from, 'announcement'); await reply(box('🔇 MUTED', ['Only admins can send message now'])); }
      catch { await reply('❌ Bot must be admin'); }
    }
  },
  {
    command: ['unmute'],
    adminOnly: true, botAdminOnly: true, groupOnly: true,
    run: async ({ sock, from, reply, isGroup }) => {
      if (!onlyGroup(isGroup, reply)) return;
      try { await sock.groupSettingUpdate(from, 'not_announcement'); await reply(box('🔊 UNMUTED', ['Everybody can send message now'])); }
      catch { await reply('❌ Bot must be admin'); }
    }
  },
  {
    command: ['delete', 'del', 'd'],
    adminOnly: true, botAdminOnly: true, groupOnly: true,
    run: async ({ sock, from, m, reply, isGroup }) => {
      if (!onlyGroup(isGroup, reply)) return;
      const ctx = m.message.extendedTextMessage?.contextInfo;
      if (!ctx?.stanzaId) return reply('Reply to the message you want to delete with .delete');
      try {
        await sock.sendMessage(from, { delete: { remoteJid: from, fromMe: ctx.participant ? false : true, id: ctx.stanzaId, participant: ctx.participant } });
        await reply('🗑️ Deleted');
      } catch {
        try { await sock.sendMessage(from, { delete: m.key }); await reply('🗑️ Deleted'); }
        catch { await reply('❌ Delete failed - Message too old or bot not admin'); }
      }
    }
  },
];
