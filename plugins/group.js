// KNIGHT XMD - Group commands

function box(title, lines) {
  const body = lines.map(line => `> ┃✯│ ${line}`).join('\n');
  return `> ╭══〘 ${title} 〙══⊷❍\n> ┃✯╭──────────────\n${body}\n> ┃✯╰───────────────\n> ╰═══════════════════⊷❍`;
}

function onlyGroup(isGroup, reply) {
  if (!isGroup) {
    reply('❌ This command only works in a group.');
    return false;
  }
  return true;
}

const clean = jid => String(jid || '').split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
const participantsOf = group => Array.isArray(group?.participants) ? group.participants : [];

function displayNum(participant) {
  if (!participant) return '';
  if (typeof participant === 'string') return clean(participant);
  return clean(participant.pn || participant.id || participant.lid);
}

function findParticipant(group, target) {
  if (!target) return null;
  const participants = participantsOf(group);
  const rawTarget = String(target);
  const targetNumber = clean(rawTarget);

  return participants.find(participant => {
    if (!participant) return false;
    if ([participant.id, participant.pn, participant.lid].some(id => id && String(id) === rawTarget)) return true;
    // Compare phone numbers only; LIDs are identifiers, not phone numbers.
    return Boolean(targetNumber && (
      (participant.pn && clean(participant.pn) === targetNumber) ||
      (participant.id?.endsWith('@s.whatsapp.net') && clean(participant.id) === targetNumber)
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

function isAdmin(participant) {
  return participant?.admin === true || participant?.admin === 'admin' || participant?.admin === 'superadmin';
}

async function getBotAdmin(sock, from) {
  try {
    const group = await sock.groupMetadata(from);
    const botIds = [sock.user?.id, sock.user?.lid].filter(Boolean).map(String);
    const botNumbers = botIds.map(clean).filter(Boolean);
    const bot = participantsOf(group).find(participant => {
      if (botIds.includes(participant.id) || botIds.includes(participant.pn) || botIds.includes(participant.lid)) return true;
      return Boolean(participant.pn && botNumbers.includes(clean(participant.pn))) ||
        Boolean(participant.id?.endsWith('@s.whatsapp.net') && botNumbers.includes(clean(participant.id)));
    });
    return { group, isBotAdmin: isAdmin(bot), bot };
  } catch {
    return { group: null, isBotAdmin: false, bot: null };
  }
}

function needAdmin(reply) {
  return reply(
    `⚠️ *Make me admin first*\n\n` +
    `This command needs admin permissions to work.\n\n` +
    `Open group info, select the bot, tap *Make Admin*, then try again.`
  );
}

async function requireBotAdmin(sock, from, reply) {
  const state = await getBotAdmin(sock, from);
  if (!state.isBotAdmin) {
    await needAdmin(reply);
    return null;
  }
  return state;
}

async function actionFailed(reply, action) {
  return reply(`❌ Could not ${action}. Check the bot's group permissions and try again.`);
}

module.exports = [
  {
    command: ['groupinfo', 'ginfo'],
    run: async ({ sock, from, isGroup, reply }) => {
      if (!onlyGroup(isGroup, reply)) return;
      try {
        const group = await sock.groupMetadata(from);
        const participants = participantsOf(group);
        const admins = participants.filter(isAdmin).length;
        await reply(box('👥 GROUP INFO', [
          `Name: ${group.subject || 'Unknown'}`,
          `Members: ${participants.length}`,
          `Admins: ${admins}`,
          `Locked: ${group.announce ? 'Yes 🔒' : 'No 🔓'}`,
          `Desc: ${(group.desc || 'No description').slice(0, 80)}`
        ]));
      } catch {
        await reply('⏳ Could not get group information. Try again shortly.');
      }
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
        const chunkSize = 30;
        for (let index = 0; index < participants.length; index += chunkSize) {
          const chunk = participants.slice(index, index + chunkSize);
          const mentions = chunk.map(participant => participant.id).filter(Boolean);
          const list = chunk.map(participant => `👤 @${displayNum(participant)}`).join('\n');
          const body = `╭───〘 TAG ALL 〙───⊷\n│ Members: ${participants.length}\n│ Message: ${message}\n╰───────────────\n\n${list}\n\n> Knight XMD ⚔️`;
          await sock.sendMessage(from, { text: body, mentions }, index === 0 && m ? { quoted: m } : undefined);
          if (index + chunkSize < participants.length) await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch {
        await reply('⏳ Could not tag the group. Try again shortly.');
      }
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
        const mentions = participantsOf(group).map(participant => participant.id).filter(Boolean);
        await sock.sendMessage(from, { text: text.trim(), mentions });
      } catch {
        await reply('⏳ Could not send the hidden tag. Try again shortly.');
      }
    }
  },
  {
    command: ['listmembers', 'members', 'list'],
    run: async ({ sock, from, isGroup, reply }) => {
      if (!onlyGroup(isGroup, reply)) return;
      try {
        const group = await sock.groupMetadata(from);
        const participants = participantsOf(group);
        const list = participants.map((participant, index) =>
          `${index + 1}. @${displayNum(participant)} ${isAdmin(participant) ? '⭐' : ''}`
        ).join('\n');
        await sock.sendMessage(from, {
          text: `👥 *MEMBERS (${participants.length})*\n\n${list}`,
          mentions: participants.map(participant => participant.id).filter(Boolean)
        });
      } catch {
        await reply('⏳ Could not get the member list. Try again shortly.');
      }
    }
  },
  {
    command: ['admins'],
    run: async ({ sock, from, isGroup, reply }) => {
      if (!onlyGroup(isGroup, reply)) return;
      try {
        const group = await sock.groupMetadata(from);
        const admins = participantsOf(group).filter(isAdmin);
        const list = admins.map((participant, index) => `${index + 1}. @${displayNum(participant)}`).join('\n');
        await sock.sendMessage(from, {
          text: `👑 *ADMINS (${admins.length})*\n\n${list || 'No admins found.'}`,
          mentions: admins.map(participant => participant.id).filter(Boolean)
        });
      } catch {
        await reply('⏳ Could not get the admin list. Try again shortly.');
      }
    }
  },
  {
    command: ['grouplink', 'link', 'invite'],
    adminOnly: true,
    run: async ({ sock, from, isGroup, reply }) => {
      if (!onlyGroup(isGroup, reply)) return;
      if (!await requireBotAdmin(sock, from, reply)) return;
      try {
        const code = await sock.groupInviteCode(from);
        await reply(box('🔗 GROUP LINK', [`https://chat.whatsapp.com/${code}`]));
      } catch {
        await actionFailed(reply, 'get the group invite link');
      }
    }
  },
  {
    command: ['revokelink', 'resetlink'],
    adminOnly: true,
    run: async ({ sock, from, isGroup, reply }) => {
      if (!onlyGroup(isGroup, reply)) return;
      if (!await requireBotAdmin(sock, from, reply)) return;
      try {
        const code = await sock.groupRevokeInvite(from);
        await reply(box('🔗 LINK REVOKED', [`New Link: https://chat.whatsapp.com/${code}`]));
      } catch {
        await actionFailed(reply, 'reset the group invite link');
      }
    }
  },
  {
    command: ['setname', 'setgname', 'groupname'],
    adminOnly: true,
    run: async ({ sock, from, isGroup, text, reply }) => {
      if (!onlyGroup(isGroup, reply)) return;
      if (!text?.trim()) return reply('Usage: .setname New Group Name');
      if (!await requireBotAdmin(sock, from, reply)) return;
      try {
        await sock.groupUpdateSubject(from, text.trim());
        await reply(`✅ Name changed to: ${text.trim()}`);
      } catch {
        await actionFailed(reply, 'change the group name');
      }
    }
  },
  {
    command: ['setdesc', 'setdescription', 'groupdesc'],
    adminOnly: true,
    run: async ({ sock, from, isGroup, text, reply }) => {
      if (!onlyGroup(isGroup, reply)) return;
      if (!text?.trim()) return reply('Usage: .setdesc Group rules...');
      if (!await requireBotAdmin(sock, from, reply)) return;
      try {
        await sock.groupUpdateDescription(from, text.trim());
        await reply('✅ Description updated.');
      } catch {
        await actionFailed(reply, 'update the group description');
      }
    }
  },
  {
    command: ['open', 'opengroup', 'unlock'],
    adminOnly: true,
    run: async ({ sock, from, isGroup, reply }) => {
      if (!onlyGroup(isGroup, reply)) return;
      if (!await requireBotAdmin(sock, from, reply)) return;
      try {
        await sock.groupSettingUpdate(from, 'not_announcement');
        await reply('🔓 Group opened.');
      } catch {
        await actionFailed(reply, 'open the group');
      }
    }
  },
  {
    command: ['close', 'closegroup', 'lock'],
    adminOnly: true,
    run: async ({ sock, from, isGroup, reply }) => {
      if (!onlyGroup(isGroup, reply)) return;
      if (!await requireBotAdmin(sock, from, reply)) return;
      try {
        await sock.groupSettingUpdate(from, 'announcement');
        await reply('🔒 Group closed.');
      } catch {
        await actionFailed(reply, 'close the group');
      }
    }
  },
  {
    command: ['kick', 'remove'],
    adminOnly: true,
    run: async ({ sock, from, isGroup, m, text, reply, isOwner }) => {
      if (!onlyGroup(isGroup, reply)) return;
      const state = await requireBotAdmin(sock, from, reply);
      if (!state) return;
      const target = getTarget(m, text, state.group);
      if (!target) return reply('Usage: Reply to a member or use .kick @member / .kick 234...');
      const participant = findParticipant(state.group, target);
      if (!participant) return reply('❌ That person is not in this group.');
      if (isAdmin(participant) && !isOwner) return reply('❌ Only the bot owner can remove a group admin.');
      try {
        await sock.groupParticipantsUpdate(from, [participant.id], 'remove');
        await sock.sendMessage(from, {
          text: `👢 @${displayNum(participant)} removed`,
          mentions: [participant.id].filter(Boolean)
        });
      } catch {
        await actionFailed(reply, 'remove that member');
      }
    }
  },
  {
    command: ['promote', 'makeadmin'],
    adminOnly: true,
    run: async ({ sock, from, isGroup, m, text, reply }) => {
      if (!onlyGroup(isGroup, reply)) return;
      const state = await requireBotAdmin(sock, from, reply);
      if (!state) return;
      const target = getTarget(m, text, state.group);
      if (!target) return reply('Usage: Reply to a member or use .promote @member / .promote 234...');
      const participant = findParticipant(state.group, target);
      if (!participant) return reply('❌ That person is not in this group.');
      if (isAdmin(participant)) return reply('❌ That person is already an admin.');
      try {
        await sock.groupParticipantsUpdate(from, [participant.id], 'promote');
        await sock.sendMessage(from, {
          text: `✅ @${displayNum(participant)} is now an admin`,
          mentions: [participant.id].filter(Boolean)
        });
      } catch {
        await actionFailed(reply, 'promote that member');
      }
    }
  },
  {
    command: ['demote', 'removeadmin'],
    adminOnly: true,
    run: async ({ sock, from, isGroup, m, text, reply }) => {
      if (!onlyGroup(isGroup, reply)) return;
      const state = await requireBotAdmin(sock, from, reply);
      if (!state) return;
      const target = getTarget(m, text, state.group);
      if (!target) return reply('Usage: Reply to an admin or use .demote @member / .demote 234...');
      const participant = findParticipant(state.group, target);
      if (!participant) return reply('❌ That person is not in this group.');
      if (!isAdmin(participant)) return reply('❌ That person is not an admin.');
      try {
        await sock.groupParticipantsUpdate(from, [participant.id], 'demote');
        await sock.sendMessage(from, {
          text: `✅ @${displayNum(participant)} is no longer an admin`,
          mentions: [participant.id].filter(Boolean)
        });
      } catch {
        await actionFailed(reply, 'demote that member');
      }
    }
  },
  {
    command: ['add'],
    adminOnly: true,
    run: async ({ sock, from, isGroup, text, reply }) => {
      if (!onlyGroup(isGroup, reply)) return;
      const number = clean(text);
      if (number.length < 7 || number.length > 15) return reply('Usage: .add 2348071569915');
      if (!await requireBotAdmin(sock, from, reply)) return;
      try {
        const result = await sock.groupParticipantsUpdate(from, [`${number}@s.whatsapp.net`], 'add');
        const status = result?.[0]?.status;
        if (status && !['200', 'success'].includes(String(status))) {
          return reply('⏳ WhatsApp could not add that number. They may have group privacy restrictions.');
        }
        await reply(`✅ Add request sent for @${number}.`);
      } catch {
        await reply('⏳ Could not add that number. Check the number and group permissions, then try again.');
      }
    }
  }
];
