// KNIGHT XMD - Group System - FIXED - No More "Bot must be admin" Spam
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

const clean = (jid) => (jid || '').split('@')[0].split(':')[0].replace(/[^0-9]/g, '');

function displayNum(p) {
  if (!p) return '';
  if (typeof p === 'string') return clean(p);
  if (p.pn) return clean(p.pn);
  return clean(p.id);
}
function findParticipant(g, target) {
  if (!g || !target) return null;
  const c = clean(target);
  return g.participants.find(p => clean(p.id) === c || (p.pn && clean(p.pn) === c) || p.id === target || (p.lid && clean(p.lid) === c));
}
function getTarget(m, text, groupMeta) {
  const ctxInfo = m.message.extendedTextMessage?.contextInfo;
  if (ctxInfo?.participant) return ctxInfo.participant;
  if (ctxInfo?.mentionedJid?.[0]) return ctxInfo.mentionedJid[0];
  if (text) {
    const num = text.replace(/[^0-9]/g, '');
    if (num.length >= 7) {
      if (groupMeta) { const f = findParticipant(groupMeta, num); if (f) return f.id; }
      return num + '@s.whatsapp.net';
    }
  }
  return null;
}

// ===== NEW: Check bot admin ONCE, no spam =====
async function getBotAdmin(sock, from) {
  try {
    const g = await sock.groupMetadata(from);
    const botId = sock.user?.id?.split(':')[0];
    const me = g.participants.find(p => clean(p.id) === clean(botId) || p.id === sock.user?.id || (p.pn && clean(p.pn) === clean(botId)));
    return { g, isBotAdmin: !!me?.admin, me };
  } catch { return { g: null, isBotAdmin: false }; }
}

// Clean message when bot no be admin - no be error
async function needAdmin(reply) {
  return reply(
    `⚠️ *Make me admin first*\n\n` +
    `This command need admin to work - na WhatsApp rule, no be bot fault.\n\n` +
    `How to do am:\n` +
    `1. Open group info\n` +
    `2. Tap my name\n` +
    `3. Tap *Make Admin*\n` +
    `4. Try command again`
  );
}

module.exports = [
  // ===== NO ADMIN NEEDED =====
  {
    command: ['groupinfo', 'ginfo'],
    run: async ({ sock, from, isGroup, reply }) => {
      if (!onlyGroup(isGroup, reply)) return;
      try {
        const g = await sock.groupMetadata(from);
        const admins = g.participants.filter(p => p.admin).length;
        await reply(box('👥 GROUP INFO', [`Name: ${g.subject}`, `Members: ${g.participants.length}`, `Admins: ${admins}`, `Locked: ${g.announce ? 'Yes 🔒' : 'No 🔓'}`, `Desc: ${(g.desc || 'No desc').slice(0, 80)}`]));
      } catch { await reply('⏳ Try again in small time.'); }
    }
  },
  {
    command: ['tagall', 'everyone', 'all'],
    adminOnly: true, // user admin only, BOT no need admin
    run: async ({ sock, from, isGroup, text, reply, m }) => {
      if (!onlyGroup(isGroup, reply)) return;
      try {
        const g = await sock.groupMetadata(from);
        const all = g.participants;
        if (!all.length) return reply('❌ No members found');
        const msg = (text || 'Attention everybody!').trim();
        const CHUNK = 30;
        for (let i = 0; i < all.length; i += CHUNK) {
          const chunk = all.slice(i, i + CHUNK);
          let txt = `╭───〘 TAG ALL 〙───⊷\n│ Members: ${all.length}\n│ Message: ${msg}\n╰───────────────\n\n`;
          chunk.forEach((p) => { txt += `👤 @${displayNum(p)}\n`; });
          txt += `\n> Knight XMD ⚔️`;
          await sock.sendMessage(from, { text: txt, mentions: chunk.map(p => p.id) }, { quoted: i === 0 ? m : undefined });
          if (i + CHUNK < all.length) await new Promise(r => setTimeout(r, 1000));
        }
      } catch { await reply('⏳ Try again in small time.'); }
    }
  },
  {
    command: ['hidetag', 'hiddentag'],
    adminOnly: true, // BOT no need admin
    run: async ({ sock, from, isGroup, text, reply }) => {
      if (!onlyGroup(isGroup, reply)) return;
      if (!text) return reply('Usage: .hidetag Hello everybody');
      try {
        const g = await sock.groupMetadata(from);
        await sock.sendMessage(from, { text, mentions: g.participants.map(p => p.id) });
      } catch { await reply('⏳ Try again in small time.'); }
    }
  },
  {
    command: ['listmembers', 'members', 'list'],
    run: async ({ sock, from, isGroup, reply }) => {
      if (!onlyGroup(isGroup, reply)) return;
      try {
        const g = await sock.groupMetadata(from);
        let t = `👥 *MEMBERS (${g.participants.length})*\n\n`;
        g.participants.forEach((p, i) => { t += `${i + 1}. @${displayNum(p)} ${p.admin ? '⭐' : ''}\n`; });
        await sock.sendMessage(from, { text: t, mentions: g.participants.map(p => p.id) });
      } catch { await reply('⏳ Try again.'); }
    }
  },
  {
    command: ['admins'],
    run: async ({ sock, from, isGroup, reply }) => {
      if (!onlyGroup(isGroup, reply)) return;
      try {
        const g = await sock.groupMetadata(from);
        const admins = g.participants.filter(p => p.admin);
        let t = `👑 *ADMINS (${admins.length})*\n\n`;
        admins.forEach((p, i) => { t += `${i + 1}. @${displayNum(p)}\n`; });
        await sock.sendMessage(from, { text: t, mentions: admins.map(p => p.id) });
      } catch { await reply('⏳ Try again.'); }
    }
  },

  // ===== NEED BOT ADMIN - Checked cleanly =====
  {
    command: ['grouplink', 'link', 'invite'],
    adminOnly: true,
    run: async ({ sock, from, isGroup, reply }) => {
      if (!onlyGroup(isGroup, reply)) return;
      const { isBotAdmin } = await getBotAdmin(sock, from);
      if (!isBotAdmin) return needAdmin(reply);
      try {
        const code = await sock.groupInviteCode(from);
        await reply(box('🔗 GROUP LINK', [`https://chat.whatsapp.com/${code}`]));
      } catch { await needAdmin(reply); }
    }
  },
  {
    command: ['revokelink', 'resetlink'],
    adminOnly: true,
    run: async ({ sock, from, isGroup, reply }) => {
      if (!onlyGroup(isGroup, reply)) return;
      const { isBotAdmin } = await getBotAdmin(sock, from);
      if (!isBotAdmin) return needAdmin(reply);
      try { const code = await sock.groupRevokeInvite(from); await reply(box('🔗 LINK REVOKED', [`New Link: https://chat.whatsapp.com/${code}`])); }
      catch { await needAdmin(reply); }
    }
  },
  {
    command: ['setname', 'setgname', 'groupname'],
    adminOnly: true,
    run: async ({ sock, from, isGroup, text, reply }) => {
      if (!onlyGroup(isGroup, reply)) return;
      if (!text) return reply('Usage: .setname New Group Name');
      const { isBotAdmin } = await getBotAdmin(sock, from);
      if (!isBotAdmin) return needAdmin(reply);
      try { await sock.groupUpdateSubject(from, text); await reply(`✅ Name changed to: ${text}`); }
      catch { await needAdmin(reply); }
    }
  },
  {
    command: ['setdesc', 'setdescription', 'groupdesc'],
    adminOnly: true,
    run: async ({ sock, from, isGroup, text, reply }) => {
      if (!onlyGroup(isGroup, reply)) return;
      if (!text) return reply('Usage: .setdesc Group rules...');
      const { isBotAdmin } = await getBotAdmin(sock, from);
      if (!isBotAdmin) return needAdmin(reply);
      try { await sock.groupUpdateDescription(from, text); await reply('✅ Desc updated'); }
      catch { await needAdmin(reply); }
    }
  },
  {
    command: ['open', 'opengroup', 'unlock'],
    adminOnly: true,
    run: async ({ sock, from, isGroup, reply }) => {
      if (!onlyGroup(isGroup, reply)) return;
      const { isBotAdmin } = await getBotAdmin(sock, from);
      if (!isBotAdmin) return needAdmin(reply);
      try { await sock.groupSettingUpdate(from, 'not_announcement'); await reply('🔓 Group opened'); }
      catch { await needAdmin(reply); }
    }
  },
  {
    command: ['close', 'closegroup', 'lock'],
    adminOnly: true,
    run: async ({ sock, from, isGroup, reply }) => {
      if (!onlyGroup(isGroup, reply)) return;
      const { isBotAdmin } = await getBotAdmin(sock, from);
      if (!isBotAdmin) return needAdmin(reply);
      try { await sock.groupSettingUpdate(from, 'announcement'); await reply('🔒 Group closed'); }
      catch { await needAdmin(reply); }
    }
  },
  {
    command: ['kick', 'remove'],
    adminOnly: true,
    run: async ({ sock, from, isGroup, m, text, reply, isOwner }) => {
      if (!onlyGroup(isGroup, reply)) return;
      const { g, isBotAdmin } = await getBotAdmin(sock, from);
      if (!isBotAdmin) return needAdmin(reply);
      const target = getTarget(m, text, g);
      if (!target) return reply('Usage: Reply to person with .kick');
      const info = findParticipant(g, target);
      if (!info) return reply('❌ Person no dey for group');
      if (info.admin && !isOwner) return reply('❌ You no fit kick admin, only owner fit');
      try { await sock.groupParticipantsUpdate(from, [info.id], 'remove'); await sock.sendMessage(from, { text: `👢 @${displayNum(info)} removed`, mentions: [info.id] }); }
      catch { await needAdmin(reply); }
    }
  },
  {
    command: ['promote', 'makeadmin'],
    adminOnly: true,
    run: async ({ sock, from, isGroup, m, text, reply }) => {
      if (!onlyGroup(isGroup, reply)) return;
      const { g, isBotAdmin } = await getBotAdmin(sock, from);
      if (!isBotAdmin) return needAdmin(reply);
      const target = getTarget(m, text, g);
      if (!target) return reply('Usage: Reply with .promote');
      const info = findParticipant(g, target);
      if (!info) return reply('❌ Person no dey for group');
      try { await sock.groupParticipantsUpdate(from, [info.id], 'promote'); await sock.sendMessage(from, { text: `✅ @${displayNum(info)} don become admin`, mentions: [info.id] }); }
      catch { await needAdmin(reply); }
    }
  },
  {
    command: ['demote', 'removeadmin'],
    adminOnly: true,
    run: async ({ sock, from, isGroup, m, text, reply }) => {
      if (!onlyGroup(isGroup, reply)) return;
      const { g, isBotAdmin } = await getBotAdmin(sock, from);
      if (!isBotAdmin) return needAdmin(reply);
      const target = getTarget(m, text, g);
      if (!target) return reply('Usage: Reply with .demote');
      const info = findParticipant(g, target);
      if (!info) return reply('❌ Person no dey for group');
      try { await sock.groupParticipantsUpdate(from, [info.id], 'demote'); await sock.sendMessage(from, { text: `✅ @${displayNum(info)} no be admin again`, mentions: [info.id] }); }
      catch { await needAdmin(reply); }
    }
  },
  {
    command: ['add'],
    adminOnly: true,
    run: async ({ sock, from, isGroup, text, reply }) => {
      if (!onlyGroup(isGroup, reply)) return;
      if (!text) return reply('Usage: .add 234...');
      const { isBotAdmin } = await getBotAdmin(sock, from);
      if (!isBotAdmin) return needAdmin(reply);
      const num = text.replace(/[^0-9]/g, '');
      try { await sock.groupParticipantsUpdate(from, [num + '@s.whatsapp.net'], 'add'); await reply(`✅ Added @${num}`); }
      catch { await reply('⏳ Number no allow add, or try again.'); }
    }
  },
];
