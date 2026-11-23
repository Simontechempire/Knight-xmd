// KNIGHT XMD - Group System - Fixed Admin Check
// By Faceless Tech
// FIX: .tagall, .hidetag no need bot admin
// Only .kick, .promote, .close, .setname, .grouplink need bot admin

function box(title, lines) {
  let t = `> ╭══〘 ${title} 〙══⊷❍\n> ┃✯╭──────────────\n`;
  lines.forEach(l => t += `> ┃✯│ ${l}\n`);
  t += `> ┃✯╰───────────────\n> ╰═══════════════════⊷❍`;
  return t;
}

function onlyGroup(isGroup, reply) {
  if (!isGroup) {
    reply('❌ This command only works in a group.\nAdd bot to group first.');
    return false;
  }
  return true;
}

const clean = (jid) => (jid || '').split('@')[0].split(':')[0].replace(/[^0-9]/g, '');

// Get target from reply / mention / number
function getTarget(m, text, from) {
  // 1. Reply
  const quoted = m.message.extendedTextMessage?.contextInfo?.quotedMessage;
  const participant = m.message.extendedTextMessage?.contextInfo?.participant;
  if (participant) return participant;
  // 2. Mention
  const mentioned = m.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
  if (mentioned) return mentioned;
  // 3. Number in text
  if (text) {
    const num = text.replace(/[^0-9]/g, '');
    if (num.length >= 10) return num + '@s.whatsapp.net';
  }
  return null;
}

module.exports = [
  // ========== GROUP INFO ==========
  {
    command: ['groupinfo', 'ginfo'],
    run: async ({ sock, from, isGroup, reply }) => {
      if (!onlyGroup(isGroup, reply)) return;
      try {
        const g = await sock.groupMetadata(from);
        const admins = g.participants.filter(p => p.admin).length;
        const created = g.creation ? new Date(g.creation * 1000).toLocaleDateString('en-NG') : 'Unknown';
        await reply(box('👥 GROUP INFO', [
          `Name: ${g.subject}`,
          `ID: ${from.split('@')[0]}`,
          `Members: ${g.participants.length}`,
          `Admins: ${admins}`,
          `Created: ${created}`,
          `Desc: ${(g.desc || 'No desc').slice(0, 80)}`,
          `Locked: ${g.announce ? 'Yes 🔒' : 'No 🔓'}`,
          `Restricted: ${g.restrict ? 'Yes' : 'No'}`,
        ]));
      } catch (e) { await reply('❌ Failed to get group info: ' + e.message); }
    }
  },

  // ========== GROUP LINK ==========
  {
    command: ['grouplink', 'link', 'invite'],
    adminOnly: true, botAdminOnly: true,
    run: async ({ sock, from, isGroup, reply }) => {
      if (!onlyGroup(isGroup, reply)) return;
      try {
        const code = await sock.groupInviteCode(from);
        await reply(box('🔗 GROUP LINK', [
          `https://chat.whatsapp.com/${code}`,
          'Share this link to invite people',
        ]));
      } catch { await reply('❌ Bot must be admin to get link'); }
    }
  },

  // ========== REVOKE LINK ==========
  {
    command: ['revokelink', 'resetlink'],
    adminOnly: true, botAdminOnly: true,
    run: async ({ sock, from, isGroup, reply }) => {
      if (!onlyGroup(isGroup, reply)) return;
      try {
        const code = await sock.groupRevokeInvite(from);
        await reply(box('🔗 LINK REVOKED', [
          `New Link: https://chat.whatsapp.com/${code}`,
          'Old link no longer works',
        ]));
      } catch { await reply('❌ Bot must be admin'); }
    }
  },

  // ========== SET GROUP NAME ==========
  {
    command: ['setname', 'setgname', 'groupname'],
    adminOnly: true, botAdminOnly: true,
    run: async ({ sock, from, isGroup, text, reply }) => {
      if (!onlyGroup(isGroup, reply)) return;
      if (!text) return reply('Usage: .setname New Group Name');
      if (text.length > 25) return reply('❌ Group name too long, max 25 chars');
      try {
        await sock.groupUpdateSubject(from, text);
        await reply(box('✏️ NAME UPDATED', [`New Name: ${text}`]));
      } catch { await reply('❌ Bot must be admin'); }
    }
  },

  // ========== SET DESC ==========
  {
    command: ['setdesc', 'setdescription', 'groupdesc'],
    adminOnly: true, botAdminOnly: true,
    run: async ({ sock, from, isGroup, text, reply }) => {
      if (!onlyGroup(isGroup, reply)) return;
      if (!text) return reply('Usage: .setdesc This is our group rules...');
      try {
        await sock.groupUpdateDescription(from, text);
        await reply(box('📝 DESC UPDATED', [`${text.slice(0, 100)}`]));
      } catch { await reply('❌ Bot must be admin'); }
    }
  },

  // ========== SET GROUP PP ==========
  {
    command: ['setgpp', 'setgrouppp'],
    adminOnly: true, botAdminOnly: true,
    run: async ({ sock, from, isGroup, m, reply }) => {
      if (!onlyGroup(isGroup, reply)) return;
      const img = m.message.imageMessage || m.message.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;
      if (!img) return reply('Reply to an image with .setgpp');
      try {
        const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
        const stream = await downloadContentFromMessage(img, 'image');
        let buf = Buffer.from([]); for await (const c of stream) buf = Buffer.concat([buf, c]);
        await sock.updateProfilePicture(from, buf);
        await reply('✅ Group DP updated');
      } catch { await reply('❌ Bot must be admin'); }
    }
  },

  // ========== OPEN / CLOSE ==========
  {
    command: ['open', 'opengroup', 'unlock'],
    adminOnly: true, botAdminOnly: true,
    run: async ({ sock, from, isGroup, reply }) => {
      if (!onlyGroup(isGroup, reply)) return;
      try {
        await sock.groupSettingUpdate(from, 'not_announcement');
        await reply(box('🔓 GROUP OPENED', ['Everybody can send message now']));
      } catch { await reply('❌ Bot must be admin'); }
    }
  },
  {
    command: ['close', 'closegroup', 'lock'],
    adminOnly: true, botAdminOnly: true,
    run: async ({ sock, from, isGroup, reply }) => {
      if (!onlyGroup(isGroup, reply)) return;
      try {
        await sock.groupSettingUpdate(from, 'announcement');
        await reply(box('🔒 GROUP CLOSED', ['Only admins can send message now']));
      } catch { await reply('❌ Bot must be admin'); }
    }
  },

  // ========== TAG ALL - FIXED: No bot admin needed ==========
  {
    command: ['tagall'],
    adminOnly: true,
    run: async ({ sock, from, isGroup, text, reply }) => {
      if (!onlyGroup(isGroup, reply)) return;
      try {
        const g = await sock.groupMetadata(from);
        const mentions = g.participants.map(p => p.id);
        let t = `📣 *TAG ALL*\n\n${text || 'Attention everybody!'}\n\n`;
        g.participants.forEach(p => t += `@${clean(p.id)} `);
        if (t.length > 4000) {
          await sock.sendMessage(from, { text: `📣 *TAG ALL* - ${g.participants.length} members\n\n${text || ''}`, mentions });
        } else {
          await sock.sendMessage(from, { text: t, mentions });
        }
      } catch (e) { await reply('❌ TagAll failed: ' + e.message); }
    }
  },

  // ========== HIDE TAG - FIXED: No bot admin needed ==========
  {
    command: ['hidetag', 'hiddentag', 'tag'],
    adminOnly: true,
    run: async ({ sock, from, isGroup, text, reply, m }) => {
      if (!onlyGroup(isGroup, reply)) return;
      if (!text && !m.message.extendedTextMessage?.contextInfo?.quotedMessage) {
        return reply('Usage: .hidetag Hello everybody - e go tag all but no show name');
      }
      try {
        const g = await sock.groupMetadata(from);
        const mentions = g.participants.map(p => p.id);
        await sock.sendMessage(from, { text: text || '👋', mentions });
      } catch (e) { await reply('❌ HideTag failed'); }
    }
  },

  // ========== LIST MEMBERS ==========
  {
    command: ['listmembers', 'members', 'list'],
    run: async ({ sock, from, isGroup, reply }) => {
      if (!onlyGroup(isGroup, reply)) return;
      try {
        const g = await sock.groupMetadata(from);
        let t = `👥 *MEMBERS (${g.participants.length})*\n\n`;
        g.participants.forEach((p, i) => {
          const role = p.admin === 'superadmin' ? '👑 Owner' : p.admin === 'admin' ? '⭐ Admin' : '👤 Member';
          t += `${i + 1}. @${clean(p.id)} - ${role}\n`;
        });
        await sock.sendMessage(from, { text: t, mentions: g.participants.map(p => p.id) });
      } catch { await reply('❌ Failed'); }
    }
  },

  // ========== ADMINS ==========
  {
    command: ['admins'],
    run: async ({ sock, from, isGroup, reply }) => {
      if (!onlyGroup(isGroup, reply)) return;
      try {
        const g = await sock.groupMetadata(from);
        const admins = g.participants.filter(p => p.admin);
        if (!admins.length) return reply('No admins found');
        let t = `👑 *ADMINS (${admins.length})*\n\n`;
        admins.forEach((p, i) => {
          t += `${i + 1}. @${clean(p.id)} ${p.admin === 'superadmin' ? '(Owner)' : ''}\n`;
        });
        await sock.sendMessage(from, { text: t, mentions: admins.map(p => p.id) });
      } catch { await reply('❌ Failed'); }
    }
  },

  // ========== GROUP SETTINGS ==========
  {
    command: ['groupsettings', 'gsettings'],
    adminOnly: true,
    run: async ({ sock, from, isGroup, reply }) => {
      if (!onlyGroup(isGroup, reply)) return;
      const g = await sock.groupMetadata(from);
      await reply(box('⚙️ GROUP SETTINGS', [
        `Name: ${g.subject}`,
        `Members: ${g.participants.length}`,
        `Chat: ${g.announce ? 'Closed 🔒' : 'Open 🔓'}`,
        `Edit Info: ${g.restrict ? 'Admins only' : 'All members'}`,
        `Join Approval: ${g.joinApprovalMode ? 'ON' : 'OFF'}`,
        `Member Add Mode: ${g.memberAddMode || 'All'}`,
      ]));
    }
  },

  // ========== KICK ==========
  {
    command: ['kick', 'remove'],
    adminOnly: true, botAdminOnly: true,
    run: async ({ sock, from, isGroup, m, text, reply, isOwner }) => {
      if (!onlyGroup(isGroup, reply)) return;
      const target = getTarget(m, text, from);
      if (!target) return reply('Usage: Reply to person with .kick\nOr .kick @user\nOr .kick 234...');
      try {
        const g = await sock.groupMetadata(from);
        const targetClean = clean(target);
        const targetInfo = g.participants.find(p => clean(p.id) === targetClean);
        if (!targetInfo) return reply('❌ Person no dey for group');
        if (targetInfo.admin && !isOwner) return reply('❌ You no fit kick admin, only owner fit');
        await sock.groupParticipantsUpdate(from, [target], 'remove');
        await reply(box('👢 KICKED', [`User: @${targetClean}`, 'Removed from group']));
      } catch (e) { await reply('❌ Kick failed: Bot must be admin'); }
    }
  },

  // ========== PROMOTE ==========
  {
    command: ['promote', 'makeadmin'],
    adminOnly: true, botAdminOnly: true,
    run: async ({ sock, from, isGroup, m, text, reply }) => {
      if (!onlyGroup(isGroup, reply)) return;
      const target = getTarget(m, text, from);
      if (!target) return reply('Usage: Reply with .promote\nOr .promote @user');
      try {
        await sock.groupParticipantsUpdate(from, [target], 'promote');
        await reply(`✅ @${clean(target)} don become admin`, { mentions: [target] });
      } catch { await reply('❌ Promote failed: Bot must be admin'); }
    }
  },

  // ========== DEMOTE ==========
  {
    command: ['demote', 'removeadmin'],
    adminOnly: true, botAdminOnly: true,
    run: async ({ sock, from, isGroup, m, text, reply }) => {
      if (!onlyGroup(isGroup, reply)) return;
      const target = getTarget(m, text, from);
      if (!target) return reply('Usage: Reply with .demote\nOr .demote @user');
      try {
        await sock.groupParticipantsUpdate(from, [target], 'demote');
        await reply(`✅ @${clean(target)} no be admin again`, { mentions: [target] });
      } catch { await reply('❌ Demote failed: Bot must be admin'); }
    }
  },

  // ========== ADD ==========
  {
    command: ['add'],
    adminOnly: true, botAdminOnly: true,
    run: async ({ sock, from, isGroup, text, reply }) => {
      if (!onlyGroup(isGroup, reply)) return;
      if (!text) return reply('Usage: .add 2348071569915');
      const num = text.replace(/[^0-9]/g, '');
      if (num.length < 10) return reply('❌ Invalid number');
      try {
        await sock.groupParticipantsUpdate(from, [num + '@s.whatsapp.net'], 'add');
        await reply(`✅ Added @${num}`);
      } catch (e) { await reply('❌ Add failed: Number must allow add or bot must be admin'); }
    }
  },
];
