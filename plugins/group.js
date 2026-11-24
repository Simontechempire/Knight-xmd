// KNIGHT XMD - Group commands - REAL FIX - Try first, no fake admin check
function box(title, lines) {
  const body = lines.map(line => `> ┃✯│ ${line}`).join('\n');
  return `> ╭══〘 ${title} 〙══⊷❍\n> ┃✯╭──────────────\n${body}\n> ┃✯╰───────────────\n> ╰═══════════════════⊷❍`;
}
function onlyGroup(isGroup, reply) {
  if (!isGroup) { reply('❌ *this commands only work in group*.'); return false; }
  return true;
}
const clean = jid => String(jid || '').split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
const participantsOf = group => Array.isArray(group?.participants) ? group.participants : [];

// Normalize JID: remove :device suffix, keep user + server
const normJid = (jid) => {
  if (!jid) return '';
  const s = String(jid).trim();
  const [userPart, server] = s.split('@');
  const user = userPart.split(':')[0];
  return server ? `${user}@${server}` : user;
};

function displayNum(p) {
  if (!p) return '';
  if (typeof p === 'string') return clean(p);
  return clean(p.pn || p.id || p.lid);
}
function isAdmin(p) {
  return p?.admin === true || p?.admin === 'admin' || p?.admin === 'superadmin';
}
function findParticipant(group, target) {
  if (!target) return null;
  const participants = participantsOf(group);
  const rawTarget = String(target);
  const targetNumber = clean(rawTarget);
  const targetNorm = normJid(rawTarget);
  return participants.find(p => {
    if (!p) return false;
    if ([p.id, p.pn, p.lid].some(id => id && (String(id) === rawTarget || normJid(id) === targetNorm))) return true;
    return Boolean(targetNumber && (
      (p.pn && clean(p.pn) === targetNumber) ||
      (p.id?.endsWith('@s.whatsapp.net') && clean(p.id) === targetNumber)
    ));
  }) || null;
}
function getTarget(message, text, group) {
  const context = message?.message?.extendedTextMessage?.contextInfo;
  if (context?.mentionedJid?.length) return context.mentionedJid[0];
  if (context?.participant) return context.participant;
  const number = clean(text);
  if (number.length < 7 || number.length > 15) return null;
  const participant = findParticipant(group, number);
  return participant?.id || participant?.pn || `${number}@s.whatsapp.net`;
}

function needAdmin(reply) {
  return reply(`⚠️ *Make me admin first*\n\nThis command needs admin permissions to work.\n\nOpen group info, select the bot, tap *Make Admin*, then try again.`);
}

// REAL: Check if WhatsApp error na truly admin error
function isAdminError(e) {
  const s = String(e?.message || e || '').toLowerCase();
  return s.includes('not admin') || s.includes('admin') && s.includes('403') || s.includes('403') || s.includes('401') || s.includes('not-authorized') || s.includes('not authorized') || s.includes('forbidden') || s.includes('participant is not an admin') || s.includes('not-participant');
}

async function actionFailed(reply, action, e) {
  if (isAdminError(e)) return needAdmin(reply);
  return reply(`❌ Could not ${action}. Try again.`);
}

// DEBUG: See wetin WhatsApp truly think bot be
async function debugBot(sock, from) {
  const group = await sock.groupMetadata(from);
  const botRaw = [sock.user?.id, sock.user?.lid].filter(Boolean);
  const found = participantsOf(group).find(p => {
    return botRaw.some(b => normJid(b) === normJid(p.id) || normJid(b) === normJid(p.pn) || normJid(b) === normJid(p.lid) || clean(b) === clean(p.pn) || clean(b) === clean(p.id));
  });
  return { group, found, botRaw, isBotAdmin: isAdmin(found) };
}

module.exports = [
  {
    command: ['groupinfo', 'ginfo'],
    run: async ({ sock, from, isGroup, reply }) => {
      if (!onlyGroup(isGroup, reply)) return;
      try {
        const group = await sock.groupMetadata(from);
        const participants = participantsOf(group);
        await reply(box('👥 GROUP INFO', [`Name: ${group.subject || 'Unknown'}`, `Members: ${participants.length}`, `Admins: ${participants.filter(isAdmin).length}`, `Locked: ${group.announce ? 'Yes 🔒' : 'No 🔓'}`, `Desc: ${(group.desc || 'No description').slice(0, 80)}`]));
      } catch { await reply('⏳ Could not get group information. Try again shortly.'); }
    }
  },
  {
    // NEW: Use this to prove bot admin status - .checkbotadmin
    command: ['checkbotadmin', 'checkadmin', 'botadmin'],
    run: async ({ sock, from, isGroup, reply, isBotAdmin }) => {
      if (!onlyGroup(isGroup, reply)) return;
      try {
        const { found, botRaw } = await debugBot(sock, from);
        await reply(`🔍 *BOT ADMIN CHECK - REAL*\n\nBot JID: ${botRaw.join(' | ')}\nFound in group: ${found ? 'YES ✅' : 'NO ❌'}\nFound ID: ${found?.id || 'none'}\nFound PN: ${found?.pn || 'none'}\nAdmin value: ${JSON.stringify(found?.admin)}\nIsBotAdmin (handler): ${isBotAdmin}\nIsBotAdmin (group.js): ${isAdmin(found)}\n\nIf Found = NO, bot number no match group list - na LID wahala. If Admin = null, bot no be admin truly.`);
      } catch (e) { await reply('Check failed: ' + e.message); }
    }
  },
  {
    command: ['tagall', 'everyone', 'all'],
    adminOnly: true,
    run: async ({ sock, from, isGroup, text, reply, m }) => {
      if (!onlyGroup(isGroup, reply)) return;
      try {
        const group = await sock.groupMetadata(from);
        const participants = participantsOf(group);
        if (!participants.length) return reply('❌ No members found.');
        const message = (text || 'Attention everybody!').trim();
        for (let i = 0; i < participants.length; i += 30) {
          const chunk = participants.slice(i, i + 30);
          const mentions = chunk.map(p => p.id).filter(Boolean);
          const list = chunk.map(p => `👤 @${displayNum(p)}`).join('\n');
          await sock.sendMessage(from, { text: `╭───〘 TAG ALL 〙───⊷\n│ Members: ${participants.length}\n│ Message: ${message}\n╰───────────────\n\n${list}\n\n> Knight XMD ⚔️`, mentions }, i === 0 && m ? { quoted: m } : undefined);
          if (i + 30 < participants.length) await new Promise(r => setTimeout(r, 1000));
        }
      } catch { await reply('⏳ Could not tag the group. Try again shortly.'); }
    }
  },
  {
    command: ['hidetag', 'hiddentag'],
    adminOnly: true,
    run: async ({ sock, from, isGroup, text, reply }) => {
      if (!onlyGroup(isGroup, reply)) return;
      if (!text?.trim()) return reply('Usage: .hidetag Hello everybody');
      try {
        const group = await sock.groupMetadata(from);
        await sock.sendMessage(from, { text: text.trim(), mentions: participantsOf(group).map(p => p.id).filter(Boolean) });
      } catch { await reply('⏳ Could not send the hidden tag. Try again shortly.'); }
    }
  },
  {
    command: ['listmembers', 'members', 'list'],
    run: async ({ sock, from, isGroup, reply }) => {
      if (!onlyGroup(isGroup, reply)) return;
      try {
        const group = await sock.groupMetadata(from);
        const participants = participantsOf(group);
        const list = participants.map((p, i) => `${i + 1}. @${displayNum(p)} ${isAdmin(p) ? '⭐' : ''}`).join('\n');
        await sock.sendMessage(from, { text: `👥 *MEMBERS (${participants.length})*\n\n${list}`, mentions: participants.map(p => p.id).filter(Boolean) });
      } catch { await reply('⏳ Could not get the member list. Try again shortly.'); }
    }
  },
  {
    command: ['admins'],
    run: async ({ sock, from, isGroup, reply }) => {
      if (!onlyGroup(isGroup, reply)) return;
      try {
        const group = await sock.groupMetadata(from);
        const admins = participantsOf(group).filter(isAdmin);
        await sock.sendMessage(from, { text: `👑 *ADMINS (${admins.length})*\n\n${admins.map((p, i) => `${i + 1}. @${displayNum(p)}`).join('\n') || 'No admins found.'}`, mentions: admins.map(p => p.id).filter(Boolean) });
      } catch { await reply('⏳ Could not get the admin list. Try again shortly.'); }
    }
  },
  // ===== ADMIN COMMANDS - NO PRE-CHECK, TRY FIRST =====
  {
    command: ['grouplink', 'link', 'invite'],
    adminOnly: true,
    run: async ({ sock, from, isGroup, reply }) => {
      if (!onlyGroup(isGroup, reply)) return;
      try {
        const code = await sock.groupInviteCode(from);
        await reply(box('🔗 GROUP LINK', [`https://chat.whatsapp.com/${code}`]));
      } catch (e) { await actionFailed(reply, 'get the group invite link', e); }
    }
  },
  {
    command: ['revokelink', 'resetlink'],
    adminOnly: true,
    run: async ({ sock, from, isGroup, reply }) => {
      if (!onlyGroup(isGroup, reply)) return;
      try {
        const code = await sock.groupRevokeInvite(from);
        await reply(box('🔗 LINK REVOKED', [`New Link: https://chat.whatsapp.com/${code}`]));
      } catch (e) { await actionFailed(reply, 'reset the group invite link', e); }
    }
  },
  {
    command: ['setname', 'setgname', 'groupname'],
    adminOnly: true,
    run: async ({ sock, from, isGroup, text, reply }) => {
      if (!onlyGroup(isGroup, reply)) return;
      if (!text?.trim()) return reply('Usage: .setname New Group Name');
      try { await sock.groupUpdateSubject(from, text.trim()); await reply(`✅ Name changed to: ${text.trim()}`); }
      catch (e) { await actionFailed(reply, 'change the group name', e); }
    }
  },
  {
    command: ['setdesc', 'setdescription', 'groupdesc'],
    adminOnly: true,
    run: async ({ sock, from, isGroup, text, reply }) => {
      if (!onlyGroup(isGroup, reply)) return;
      if (!text?.trim()) return reply('Usage: .setdesc Group rules...');
      try { await sock.groupUpdateDescription(from, text.trim()); await reply('✅ Description updated.'); }
      catch (e) { await actionFailed(reply, 'update the group description', e); }
    }
  },
  {
    command: ['open', 'opengroup', 'unlock'],
    adminOnly: true,
    run: async ({ sock, from, isGroup, reply }) => {
      if (!onlyGroup(isGroup, reply)) return;
      try { await sock.groupSettingUpdate(from, 'not_announcement'); await reply('🔓 Group opened.'); }
      catch (e) { await actionFailed(reply, 'open the group', e); }
    }
  },
  {
    command: ['close', 'closegroup', 'lock'],
    adminOnly: true,
    run: async ({ sock, from, isGroup, reply }) => {
      if (!onlyGroup(isGroup, reply)) return;
      try { await sock.groupSettingUpdate(from, 'announcement'); await reply('🔒 Group closed.'); }
      catch (e) { await actionFailed(reply, 'close the group', e); }
    }
  },
  {
    command: ['kick', 'remove'],
    adminOnly: true,
    run: async ({ sock, from, isGroup, m, text, reply, isOwner }) => {
      if (!onlyGroup(isGroup, reply)) return;
      try {
        const group = await sock.groupMetadata(from);
        const target = getTarget(m, text, group);
        if (!target) return reply('Usage: Reply to a member or use .kick @member / .kick 234...');
        const participant = findParticipant(group, target);
        if (!participant) return reply('❌ That person is not in this group.');
        if (isAdmin(participant) && !isOwner) return reply('❌ Only the bot owner can remove a group admin.');
        await sock.groupParticipantsUpdate(from, [participant.id], 'remove');
        await sock.sendMessage(from, { text: `👢 @${displayNum(participant)} removed`, mentions: [participant.id].filter(Boolean) });
      } catch (e) { await actionFailed(reply, 'remove that member', e); }
    }
  },
  {
    command: ['promote', 'makeadmin'],
    adminOnly: true,
    run: async ({ sock, from, isGroup, m, text, reply }) => {
      if (!onlyGroup(isGroup, reply)) return;
      try {
        const group = await sock.groupMetadata(from);
        const target = getTarget(m, text, group);
        if (!target) return reply('Usage: Reply to a member or use .promote @member');
        const participant = findParticipant(group, target);
        if (!participant) return reply('❌ That person is not in this group.');
        if (isAdmin(participant)) return reply('❌ That person is already an admin.');
        await sock.groupParticipantsUpdate(from, [participant.id], 'promote');
        await sock.sendMessage(from, { text: `✅ @${displayNum(participant)} is now an admin`, mentions: [participant.id].filter(Boolean) });
      } catch (e) { await actionFailed(reply, 'promote that member', e); }
    }
  },
  {
    command: ['demote', 'removeadmin'],
    adminOnly: true,
    run: async ({ sock, from, isGroup, m, text, reply }) => {
      if (!onlyGroup(isGroup, reply)) return;
      try {
        const group = await sock.groupMetadata(from);
        const target = getTarget(m, text, group);
        if (!target) return reply('Usage: Reply to an admin or use .demote @member');
        const participant = findParticipant(group, target);
        if (!participant) return reply('❌ That person is not in this group.');
        if (!isAdmin(participant)) return reply('❌ That person is not an admin.');
        await sock.groupParticipantsUpdate(from, [participant.id], 'demote');
        await sock.sendMessage(from, { text: `✅ @${displayNum(participant)} is no longer an admin`, mentions: [participant.id].filter(Boolean) });
      } catch (e) { await actionFailed(reply, 'demote that member', e); }
    }
  },
  {
    command: ['add'],
    adminOnly: true,
    run: async ({ sock, from, isGroup, text, reply }) => {
      if (!onlyGroup(isGroup, reply)) return;
      const number = clean(text);
      if (number.length < 7 || number.length > 15) return reply('Usage: .add 2348071569915');
      try {
        const result = await sock.groupParticipantsUpdate(from, [`${number}@s.whatsapp.net`], 'add');
        const status = result?.[0]?.status;
        if (status && !['200', 'success'].includes(String(status))) return reply('⏳ WhatsApp could not add that number. They may have group privacy restrictions.');
        await reply(`✅ Add request sent for @${number}.`);
      } catch (e) { await actionFailed(reply, 'add that number', e); }
    }
  }
];
