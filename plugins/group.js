// KNIGHT XMD - Group System - Real Handler
// By Faceless Tech

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
    adminOnly: true,
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

  // ========== REVOKE LINK - NEW ==========
  {
    command: ['revokelink', 'resetlink'],
    adminOnly: true,
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

  // ========== SET GROUP NAME - FIXED (not profile name) ==========
  {
    command: ['setname', 'setgname', 'groupname'],
    adminOnly: true,
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
    adminOnly: true,
    run: async ({ sock, from, isGroup, text, reply }) => {
      if (!onlyGroup(isGroup, reply)) return;
      if (!text) return reply('Usage: .setdesc This is our group rules...');
      try {
        await sock.groupUpdateDescription(from, text);
        await reply(box('📝 DESC UPDATED', [`${text.slice(0, 100)}`]));
      } catch { await reply('❌ Bot must be admin'); }
    }
  },

  // ========== SET GROUP PP - NEW ==========
  {
    command: ['setgpp', 'setgrouppp'],
    adminOnly: true,
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
    adminOnly: true,
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
    adminOnly: true,
    run: async ({ sock, from, isGroup, reply }) => {
      if (!onlyGroup(isGroup, reply)) return;
      try {
        await sock.groupSettingUpdate(from, 'announcement');
        await reply(box('🔒 GROUP CLOSED', ['Only admins can send message now']));
      } catch { await reply('❌ Bot must be admin'); }
    }
  },

  // ========== TAG ALL - FIXED (no crash on big group, split) ==========
  {
    command: ['tagall'],
    adminOnly: true,
    run: async ({ sock, from, isGroup, text, reply }) => {
      if (!onlyGroup(isGroup, reply)) return;
      try {
        const g = await sock.groupMetadata(from);
        const mentions = g.participants.map(p => p.id);
        let t = `📣 *TAG ALL*\n\n${text || 'Attention everybody!'}\n\n`;
        g.participants.forEach(p => t += `@${p.id.split('@')[0]} `);
        // WhatsApp limit - if group too big, split
        if (t.length > 4000) {
          await sock.sendMessage(from, { text: `📣 *TAG ALL* - ${g.participants.length} members\n\n${text || ''}`, mentions });
        } else {
          await sock.sendMessage(from, { text: t, mentions });
        }
      } catch (e) { await reply('❌ TagAll failed: ' + e.message); }
    }
  },

  // ========== HIDE TAG ==========
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
          t += `${i + 1}. @${p.id.split('@')[0]} - ${role}\n`;
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
          t += `${i + 1}. @${p.id.split('@')[0]} ${p.admin === 'superadmin' ? '(Owner)' : ''}\n`;
        });
        await sock.sendMessage(from, { text: t, mentions: admins.map(p => p.id) });
      } catch { await reply('❌ Failed'); }
    }
  },

  // ========== GROUP SETTINGS - NEW ==========
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
];
