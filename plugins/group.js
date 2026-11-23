// KNIGHT XMD - Group System - FIXED LID + Admin Check
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

// ===== LID FIX =====
// Display number: use pn (real phone) if available, else id
function displayNum(p) {
  if (!p) return '';
  if (typeof p === 'string') return clean(p);
  if (p.pn) return clean(p.pn);
  return clean(p.id);
}
// For mentions: ALWAYS use p.id (could be @lid) - WhatsApp need am
function mentionJid(p) {
  if (!p) return null;
  if (typeof p === 'string') return p;
  return p.id;
}
// Find participant by number / jid / lid
function findParticipant(g, target) {
  if (!g || !target) return null;
  const c = clean(target);
  return g.participants.find(p => clean(p.id) === c || (p.pn && clean(p.pn) === c) || p.id === target || (p.lid && clean(p.lid) === c));
}

// Get target from reply / mention / number - returns REAL JID (lid or s.whatsapp.net)
function getTarget(m, text, groupMeta) {
  const ctxInfo = m.message.extendedTextMessage?.contextInfo;
  const participant = ctxInfo?.participant;
  if (participant) return participant;
  const mentioned = ctxInfo?.mentionedJid?.[0];
  if (mentioned) return mentioned;
  if (text) {
    const num = text.replace(/[^0-9]/g, '');
    if (num.length >= 7) {
      // If we get groupMeta, find real JID (lid)
      if (groupMeta) {
        const found = findParticipant(groupMeta, num);
        if (found) return found.id;
      }
      return num + '@s.whatsapp.net';
    }
  }
  return null;
}

module.exports = [
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
  {
    command: ['grouplink', 'link', 'invite'],
    adminOnly: true, botAdminOnly: true,
    run: async ({ sock, from, isGroup, reply }) => {
      if (!onlyGroup(isGroup, reply)) return;
      try {
        const code = await sock.groupInviteCode(from);
        await reply(box('🔗 GROUP LINK', [`https://chat.whatsapp.com/${code}`, 'Share this link to invite people']));
      } catch { await reply('❌ Bot must be admin to get link'); }
    }
  },
  {
    command: ['revokelink', 'resetlink'],
    adminOnly: true, botAdminOnly: true,
    run: async ({ sock, from, isGroup, reply }) => {
      if (!onlyGroup(isGroup, reply)) return;
      try {
        const code = await sock.groupRevokeInvite(from);
        await reply(box('🔗 LINK REVOKED', [`New Link: https://chat.whatsapp.com/${code}`, 'Old link no longer works']));
      } catch { await reply('❌ Bot must be admin'); }
    }
  },
  {
    command: ['setname', 'setgname', 'groupname'],
    adminOnly: true, botAdminOnly: true,
    run: async ({ sock, from, isGroup, text, reply }) => {
      if (!onlyGroup(isGroup, reply)) return;
      if (!text) return reply('Usage: .setname New Group Name');
      if (text.length > 25) return reply('❌ Group name too long, max 25 chars');
      try { await sock.groupUpdateSubject(from, text); await reply(box('✏️ NAME UPDATED', [`New Name: ${text}`])); }
      catch { await reply('❌ Bot must be admin'); }
    }
  },
  {
    command: ['setdesc', 'setdescription', 'groupdesc'],
    adminOnly: true, botAdminOnly: true,
    run: async ({ sock, from, isGroup, text, reply }) => {
      if (!onlyGroup(isGroup, reply)) return;
      if (!text) return reply('Usage: .setdesc This is our group rules...');
      try { await sock.groupUpdateDescription(from, text); await reply(box('📝 DESC UPDATED', [`${text.slice(0, 100)}`])); }
      catch { await reply('❌ Bot must be admin'); }
    }
  },
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
  {
    command: ['open', 'opengroup', 'unlock'],
    adminOnly: true, botAdminOnly: true,
    run: async ({ sock, from, isGroup, reply }) => {
      if (!onlyGroup(isGroup, reply)) return;
      try { await sock.groupSettingUpdate(from, 'not_announcement'); await reply(box('🔓 GROUP OPENED', ['Everybody can send message now'])); }
      catch { await reply('❌ Bot must be admin'); }
    }
  },
  {
    command: ['close', 'closegroup', 'lock'],
    adminOnly: true, botAdminOnly: true,
    run: async ({ sock, from, isGroup, reply }) => {
      if (!onlyGroup(isGroup, reply)) return;
      try { await sock.groupSettingUpdate(from, 'announcement'); await reply(box('🔒 GROUP CLOSED', ['Only admins can send message now'])); }
      catch { await reply('❌ Bot must be admin'); }
    }
  },
 // ===== TAG ALL - FANCY FONT + LINE BY LINE + BOT PFP =====
{
  command: ['tagall', 'tag', 'everyone', 'all'],
  adminOnly: true,
  run: async ({ sock, from, isGroup, text, reply, m, botJid, botNumber }) => {
    if (!onlyGroup(isGroup, reply)) return;
    try {
      const g = await sock.groupMetadata(from);
      const all = g.participants;
      if (!all.length) return reply('❌ No members found');

      const msg = (text || 'Attention everybody!').trim();
      const total = all.length;

      // ===== FANCY FONT - Keyboard style =====
      const fancy = (t) => {
        const map = { a:'ᴀ', b:'ʙ', c:'ᴄ', d:'ᴅ', e:'ᴇ', f:'ꜰ', g:'ɢ', h:'ʜ', i:'ɪ', j:'ᴊ', k:'ᴋ', l:'ʟ', m:'ᴍ', n:'ɴ', o:'ᴏ', p:'ᴘ', q:'ǫ', r:'ʀ', s:'ꜱ', t:'ᴛ', u:'ᴜ', v:'ᴠ', w:'ᴡ', x:'x', y:'ʏ', z:'ᴢ', A:'ᴀ', B:'ʙ', C:'ᴄ', D:'ᴅ', E:'ᴇ', F:'ꜰ', G:'ɢ', H:'ʜ', I:'ɪ', J:'ᴊ', K:'ᴋ', L:'ʟ', M:'ᴍ', N:'ɴ', O:'ᴏ', P:'ᴘ', Q:'ǫ', R:'ʀ', S:'ꜱ', T:'ᴛ', U:'ᴜ', V:'ᴠ', W:'ᴡ', X:'x', Y:'ʏ', Z:'ᴢ', '0':'0','1':'1','2':'2','3':'3','4':'4','5':'5','6':'6','7':'7','8':'8','9':'9' };
        return String(t).split('').map(c => map[c] || c).join('');
      };

      // Emoji per line - cycle
      const emojis = ['🫦','🫶','💋','🔥','❤️','😍','🥰','✨','🌹','💖','👑','🦋','🌸','💎','🖤','🤍','💫','🎀','🍓','🍒','🌙','⭐','💅','😎','🥵','😈','👀','🫦','🫶','💋'];

      const displayNum = (p) => {
        if (p.pn) return p.pn.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
        return (p.id || '').split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
      };

      // ===== BOT PFP =====
      let botPfp = null;
      try {
        const botId = botJid || (botNumber ? botNumber + '@s.whatsapp.net' : sock.user?.id);
        if (botId) botPfp = await sock.profilePictureUrl(botId, 'image');
      } catch {}
      if (!botPfp) { try { botPfp = await sock.profilePictureUrl(from, 'image'); } catch {} }

      // ===== LINE BY LINE - Chunk 30 per message so e no pass limit =====
      const CHUNK = 30;
      const totalBatch = Math.ceil(all.length / CHUNK);

      for (let i = 0; i < all.length; i += CHUNK) {
        const chunk = all.slice(i, i + CHUNK);
        const batchNum = Math.floor(i / CHUNK) + 1;

        let txt = '';
        txt += `╭───〘 ${fancy('TAG ALL')} 〙───⊷\n`;
        txt += `│ ${fancy('Members')}: ${total}\n`;
        txt += `│ ${fancy('Message')}: ${msg}\n`;
        txt += `╰───────────────\n\n`;

        chunk.forEach((p, idx) => {
          const emo = emojis[(i + idx) % emojis.length];
          txt += `${emo} @${displayNum(p)}\n`;
        });

        txt += `\n> ${fancy('Knight XMD')} ⚔️`;

        const mentions = chunk.map(p => p.id);

        if (i === 0 && botPfp) {
          try {
            await sock.sendMessage(from, { image: { url: botPfp }, caption: txt, mentions }, { quoted: m });
          } catch {
            await sock.sendMessage(from, { text: txt, mentions }, { quoted: m });
          }
        } else {
          // Next batches - text only, with batch info
          const txt2 = totalBatch > 1 ? txt.replace(fancy('TAG ALL'), `${fancy('TAG ALL')} (${batchNum}/${totalBatch})`) : txt;
          await sock.sendMessage(from, { text: txt2, mentions });
        }

        if (i + CHUNK < all.length) await new Promise(r => setTimeout(r, 1000));
      }
    } catch (e) { await reply('❌ TagAll failed: ' + e.message); }
  }
},
  },
  // ===== HIDE TAG =====
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
  {
    command: ['listmembers', 'members', 'list'],
    run: async ({ sock, from, isGroup, reply }) => {
      if (!onlyGroup(isGroup, reply)) return;
      try {
        const g = await sock.groupMetadata(from);
        let t = `👥 *MEMBERS (${g.participants.length})*\n\n`;
        g.participants.forEach((p, i) => {
          const role = p.admin === 'superadmin' ? '👑 Owner' : p.admin === 'admin' ? '⭐ Admin' : '👤 Member';
          t += `${i + 1}. @${displayNum(p)} - ${role}\n`;
        });
        await sock.sendMessage(from, { text: t, mentions: g.participants.map(p => p.id) });
      } catch { await reply('❌ Failed'); }
    }
  },
  {
    command: ['admins'],
    run: async ({ sock, from, isGroup, reply }) => {
      if (!onlyGroup(isGroup, reply)) return;
      try {
        const g = await sock.groupMetadata(from);
        const admins = g.participants.filter(p => p.admin);
        if (!admins.length) return reply('No admins found');
        let t = `👑 *ADMINS (${admins.length})*\n\n`;
        admins.forEach((p, i) => { t += `${i + 1}. @${displayNum(p)} ${p.admin === 'superadmin' ? '(Owner)' : ''}\n`; });
        await sock.sendMessage(from, { text: t, mentions: admins.map(p => p.id) });
      } catch { await reply('❌ Failed'); }
    }
  },
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
  // ===== KICK - LID FIXED =====
  {
    command: ['kick', 'remove'],
    adminOnly: true, botAdminOnly: true,
    run: async ({ sock, from, isGroup, m, text, reply, isOwner }) => {
      if (!onlyGroup(isGroup, reply)) return;
      try {
        const g = await sock.groupMetadata(from);
        const target = getTarget(m, text, g);
        if (!target) return reply('Usage: Reply to person with .kick\nOr .kick @user\nOr .kick 234...');
        const targetInfo = findParticipant(g, target);
        if (!targetInfo) return reply('❌ Person no dey for group');
        if (targetInfo.admin && !isOwner) return reply('❌ You no fit kick admin, only owner fit');
        await sock.groupParticipantsUpdate(from, [targetInfo.id], 'remove');
        await reply(box('👢 KICKED', [`User: @${displayNum(targetInfo)}`, 'Removed from group']), { mentions: [targetInfo.id] });
        // FIX: box reply no support mentions, send second if needed - use sock directly
        // Actually reply() in handler supports mentions via opts, but box already sent - keep simple
      } catch (e) { await reply('❌ Kick failed: ' + e.message + ' - Bot must be admin'); }
    }
  },
  {
    command: ['promote', 'makeadmin'],
    adminOnly: true, botAdminOnly: true,
    run: async ({ sock, from, isGroup, m, text, reply }) => {
      if (!onlyGroup(isGroup, reply)) return;
      try {
        const g = await sock.groupMetadata(from);
        const target = getTarget(m, text, g);
        if (!target) return reply('Usage: Reply with .promote\nOr .promote @user');
        const info = findParticipant(g, target);
        if (!info) return reply('❌ Person no dey for group');
        await sock.groupParticipantsUpdate(from, [info.id], 'promote');
        await sock.sendMessage(from, { text: `✅ @${displayNum(info)} don become admin`, mentions: [info.id] }, { quoted: m });
      } catch { await reply('❌ Promote failed: Bot must be admin'); }
    }
  },
  {
    command: ['demote', 'removeadmin'],
    adminOnly: true, botAdminOnly: true,
    run: async ({ sock, from, isGroup, m, text, reply }) => {
      if (!onlyGroup(isGroup, reply)) return;
      try {
        const g = await sock.groupMetadata(from);
        const target = getTarget(m, text, g);
        if (!target) return reply('Usage: Reply with .demote\nOr .demote @user');
        const info = findParticipant(g, target);
        if (!info) return reply('❌ Person no dey for group');
        await sock.groupParticipantsUpdate(from, [info.id], 'demote');
        await sock.sendMessage(from, { text: `✅ @${displayNum(info)} no be admin again`, mentions: [info.id] }, { quoted: m });
      } catch { await reply('❌ Demote failed: Bot must be admin'); }
    }
  },
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
