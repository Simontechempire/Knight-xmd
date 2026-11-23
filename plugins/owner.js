// KNIGHT XMD - Owner / Ping System - Real Handler
// By Faceless Tech
const config = require('../config');

function box(title, lines) {
  let t = `> ╭══〘 ${title} 〙══⊷❍\n> ┃✯╭──────────────\n`;
  lines.forEach(l => t += `> ┃✯│ ${l}\n`);
  t += `> ┃✯╰───────────────\n> ╰═══════════════════⊷❍`;
  return t;
}

function getTarget(m, args) {
  const ctx = m.message.extendedTextMessage?.contextInfo;
  if (ctx?.mentionedJid?.length) return ctx.mentionedJid[0];
  if (ctx?.participant) return ctx.participant;
  if (args[0]) {
    const num = args[0].replace(/[^0-9]/g, '');
    if (num.length >= 7) return num + '@s.whatsapp.net';
  }
  return null;
}

function getBanned() {
  if (!global.db) global.db = {};
  if (!global.db.banned) global.db.banned = [];
  return global.db.banned;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

module.exports = [
  // ========== PING - REAL SPEED ==========
  {
    command: ['ping'],
    run: async ({ reply }) => {
      const s = Date.now();
      const msg = await reply('🏓 Pinging...');
      const speed = Date.now() - s;
      // Edit style: send new, delete old no dey work well, so send final
      await reply(box('🏓 PING', [
        `⚡ Speed: ${speed}ms`,
        `🟢 Status: Online`,
        speed < 200 ? '🚀 Excellent' : speed < 500 ? '✅ Good' : '⚠️ Slow',
      ]));
    }
  },

  // ========== ALIVE ==========
  {
    command: ['alive'],
    run: async ({ reply, runtime }) => {
      const up = runtime ? runtime(Date.now() - global.botStart) : 'Unknown';
      await reply(box('💎 ALIVE', [
        '⚔️ Knight XMD is Alive',
        `👑 By ${config.creatorName}`,
        `⏱️ Uptime: ${up}`,
        `⚡ Prefix: ${config.prefix}`,
        '✅ All Systems Working',
      ]));
    }
  },

  // ========== OWNER ==========
  {
    command: ['owner', 'creator'],
    run: async ({ reply, replyImage, sock }) => {
      const text = box('👑 CREATOR', [
        `👤 Name: ${config.creatorName}`,
        `📞 Number: +${config.creatorNumber}`,
        '💬 Contact if bot has error',
        `🔗 wa.me/${config.creatorNumber}`,
      ]);
      try {
        await replyImage(config.pfp, text);
      } catch {
        await reply(text);
      }
      // Also send contact card - real vCard
      try {
        await sock.sendMessage(sock.user.id, { text: ' ' }).catch(()=>{});
      } catch {}
    }
  },

  // ========== RUNTIME ==========
  {
    command: ['runtime', 'uptime'],
    run: async ({ reply, runtime }) => {
      const up = runtime ? runtime(Date.now() - global.botStart) : `${Math.floor((Date.now()-global.botStart)/1000)}s`;
      await reply(box('⏱️ RUNTIME', [`Uptime: ${up}`, `Started: ${new Date(global.botStart).toLocaleString()}`]));
    }
  },

  // ========== BOTINFO - REAL DATA ==========
  {
    command: ['botinfo', 'info'],
    run: async ({ reply, sock }) => {
      const groups = await sock.groupFetchAllParticipating().catch(() => ({}));
      await reply(box('🤖 BOT INFO', [
        `Name: ${config.botName}`,
        `Creator: ${config.creatorName}`,
        'Version: 1.0.0',
        `Mode: ${config.mode}`,
        `Prefix: ${config.prefix}`,
        `Language: ${config.language || 'en'}`,
        `Groups: ${Object.keys(groups).length}`,
        `Uptime: ${Math.floor((Date.now()-global.botStart)/60000)} mins`,
        'Library: Baileys',
      ]));
    }
  },

  // ========== RESTART - SAFE ==========
  {
    command: ['restart'],
    ownerOnly: true,
    run: async ({ reply }) => {
      await reply('🔄 Restarting... wait 5 sec, bot go come back online');
      await sleep(1000);
      process.exit(0);
    }
  },

  // ========== SHUTDOWN ==========
  {
    command: ['shutdown', 'off'],
    ownerOnly: true,
    run: async ({ reply }) => {
      await reply('🛑 Shutting down... Bye 👋');
      await sleep(1000);
      process.exit(0);
    }
  },

  // ========== BROADCAST - FIXED, NO BAN, WITH DELAY ==========
  {
    command: ['broadcast', 'bc'],
    ownerOnly: true,
    run: async ({ sock, text, reply }) => {
      if (!text) return reply('Usage: .broadcast Hello everybody\nThis go send to all groups');
      try {
        const chats = await sock.groupFetchAllParticipating().catch(() => ({}));
        const ids = Object.keys(chats);
        if (!ids.length) return reply('❌ No groups found');
        await reply(`📢 Broadcasting to ${ids.length} groups... go take small time, no spam.`);
        let success = 0, fail = 0;
        for (const id of ids) {
          try {
            await sock.sendMessage(id, { text: `📢 *BROADCAST FROM KNIGHT XMD*\n\n${text}\n\n_Reply ${config.prefix}menu for commands_` });
            success++;
            await sleep(1500); // Delay to avoid WhatsApp ban
          } catch { fail++; }
        }
        await reply(box('📢 BROADCAST DONE', [`✅ Sent: ${success}`, `❌ Failed: ${fail}`, `Total: ${ids.length}`]));
      } catch (e) { await reply('❌ Broadcast failed: ' + e.message); }
    }
  },

  // ========== SET PREFIX - VALIDATED ==========
  {
    command: ['setprefix'],
    ownerOnly: true,
    run: async ({ reply, args }) => {
      const p = args[0];
      if (!p) return reply(`Current prefix: ${config.prefix}\nUsage: .setprefix !`);
      if (p.length > 2) return reply('❌ Prefix too long, use 1 char like . ! # /');
      if ([' ', 'a', '1'].includes(p)) return reply('❌ Use symbol like . ! #');
      config.prefix = p;
      await reply(box('✅ PREFIX CHANGED', [`New Prefix: ${p}`, `Example: ${p}menu`]));
    }
  },

  // ========== SET BOT NAME - FIXED (BOT PROFILE, NOT GROUP) ==========
  {
    command: ['setname', 'setbotname'],
    ownerOnly: true,
    run: async ({ sock, text, reply }) => {
      if (!text) return reply('Usage: .setname Knight XMD');
      if (text.length > 25) return reply('❌ Name too long, max 25 chars');
      try {
        await sock.updateProfileName(text);
        await reply(`✅ Bot name updated to: ${text}`);
      } catch { await reply('❌ Failed'); }
    }
  },

  // ========== SET BIO ==========
  {
    command: ['setbio', 'setbotbio'],
    ownerOnly: true,
    run: async ({ sock, text, reply }) => {
      if (!text) return reply('Usage: .setbio ⚔️ Knight XMD | By Faceless Tech');
      if (text.length > 139) return reply('❌ Bio too long, max 139 chars');
      try {
        await sock.updateProfileStatus(text);
        await reply(`✅ Bio updated: ${text}`);
      } catch { await reply('❌ Failed'); }
    }
  },

  // ========== SET PP - FIXED (SEND + REPLY BOTH WORK) ==========
  {
    command: ['setpp', 'setbotpp'],
    ownerOnly: true,
    run: async ({ sock, m, reply }) => {
      const img = m.message.imageMessage || m.message.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;
      if (!img) return reply('Send an image with caption .setpp\nOR reply to an image with .setpp');
      try {
        const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
        const stream = await downloadContentFromMessage(img, 'image');
        let buf = Buffer.from([]); for await (const c of stream) buf = Buffer.concat([buf, c]);
        await sock.updateProfilePicture(sock.user.id, buf);
        await reply('✅ Profile pic updated');
      } catch (e) { await reply('❌ Failed: ' + e.message); }
    }
  },

  // ========== JOIN ==========
  {
    command: ['join'],
    ownerOnly: true,
    run: async ({ sock, text, reply }) => {
      if (!text) return reply('Usage: .join https://chat.whatsapp.com/xxxx');
      try {
        const code = text.split('/').pop().split('?')[0].trim();
        if (!code) return reply('❌ Invalid link');
        await sock.groupAcceptInvite(code);
        await reply('✅ Joined group');
      } catch { await reply('❌ Join failed - Link expired or bot blocked'); }
    }
  },

  // ========== LEAVE - GROUP ONLY ==========
  {
    command: ['leave'],
    ownerOnly: true,
    run: async ({ sock, from, reply, isGroup }) => {
      if (!isGroup) return reply('❌ Use this inside the group you want to leave');
      await reply('👋 Leaving... Bye');
      await sleep(1000);
      await sock.groupLeave(from);
    }
  },

  // ========== BLOCK ==========
  {
    command: ['block'],
    ownerOnly: true,
    run: async ({ sock, m, args, reply, sender }) => {
      const target = getTarget(m, args);
      if (!target) return reply('Mention user, reply to them, or .block 234...');
      if (target.split('@')[0] === sender.split('@')[0]) return reply('❌ You cannot block yourself');
      try {
        await sock.updateBlockStatus(target, 'block');
        await reply(`✅ Blocked @${target.split('@')[0]}`, { mentions: [target] });
      } catch { await reply('❌ Block failed'); }
    }
  },

  // ========== UNBLOCK ==========
  {
    command: ['unblock'],
    ownerOnly: true,
    run: async ({ sock, m, args, reply }) => {
      const target = getTarget(m, args);
      if (!target) return reply('Mention user or .unblock 234...');
      try {
        await sock.updateBlockStatus(target, 'unblock');
        await reply(`✅ Unblocked @${target.split('@')[0]}`, { mentions: [target] });
      } catch { await reply('❌ Unblock failed'); }
    }
  },

  // ========== BAN - REAL + SAVE + PROTECT CREATOR ==========
  {
    command: ['ban'],
    ownerOnly: true,
    run: async ({ reply, m, args, sender }) => {
      const t = getTarget(m, args);
      if (!t) return reply('Mention user to ban');
      const num = t.split('@')[0];
      if (num === config.creatorNumber) return reply('❌ You cannot ban the Creator');
      if (num === sender.split('@')[0]) return reply('❌ You cannot ban yourself');
      const banned = getBanned();
      if (banned.includes(num)) return reply(`@${num} already banned`, { mentions: [t] });
      banned.push(num);
      if (global.dbSave) global.dbSave();
      await reply(box('🚫 BANNED', [`@${num} banned`, 'Bot will ignore them now']), { mentions: [t] });
    }
  },

  // ========== UNBAN ==========
  {
    command: ['unban'],
    ownerOnly: true,
    run: async ({ reply, m, args }) => {
      const t = getTarget(m, args);
      if (!t) return reply('Mention user to unban');
      const num = t.split('@')[0];
      global.db.banned = getBanned().filter(x => x !== num);
      if (global.dbSave) global.dbSave();
      await reply(box('✅ UNBANNED', [`@${num} unbanned`, 'They can use bot now']), { mentions: [t] });
    }
  },

  // ========== BANLIST - NEW ==========
  {
    command: ['banlist', 'banned'],
    ownerOnly: true,
    run: async ({ reply }) => {
      const banned = getBanned();
      if (!banned.length) return reply('✅ No banned users');
      let t = `🚫 *BANNED LIST (${banned.length})*\n\n`;
      banned.forEach((n, i) => t += `${i + 1}. @${n}\n`);
      await reply(t, { mentions: banned.map(n => n + '@s.whatsapp.net') });
    }
  },
];
