// KNIGHT XMD - Owner / Ping System - FULLY HANDLED - Connected to handler.js
// By Faceless Tech
const config = require('../config');

const clean = (jid) => (jid || '').split('@')[0].split(':')[0].replace(/[^0-9]/g, '');

function box(title, lines) {
  let t = `> ╭══〘 ${title} 〙══⊷❍\n> ┃✯╭──────────────\n`;
  lines.forEach(l => t += `> ┃✯│ ${l}\n`);
  t += `> ┃✯╰───────────────\n> ╰═══════════════════⊷❍`;
  return t;
}

function getTarget(m, args) {
  const ctx = m.message.extendedTextMessage?.contextInfo;
  // 1. Mention
  if (ctx?.mentionedJid?.length) return ctx.mentionedJid[0];
  // 2. Reply - use participant, not quoted participant alone (LID fix: use pn if dey)
  if (ctx?.participant) return ctx.participant;
  // 3. Number arg
  if (args[0]) {
    const num = clean(args[0]);
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
function save() { if (global.dbSave) global.dbSave(); }

module.exports = [
  // ========== PING - REAL SPEED, 1 MESSAGE ONLY ==========
  {
    command: ['ping'],
    run: async ({ reply }) => {
      const s = Date.now();
      await reply('🏓 Pinging...');
      const speed = Date.now() - s;
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
    run: async ({ reply, runtime, botNumber }) => {
      const up = runtime ? runtime(Date.now() - global.botStart) : 'Unknown';
      await reply(box('💎 ALIVE', [
        '⚔️ Knight XMD is Alive',
        `👑 Creator: ${config.creatorName}`,
        `🤖 Bot Number: +${botNumber || 'Unknown'}`,
        `⏱️ Uptime: ${up}`,
        `⚡ Prefix: ${config.prefix}`,
        '✅ All Systems Working',
      ]));
    }
  },

  // ========== OWNER - REAL vCard ==========
  {
    command: ['owner', 'creator'],
    run: async ({ reply, sock, from }) => {
      const creatorNum = clean(config.creatorNumber);
      const text = box('👑 CREATOR', [
        `👤 Name: ${config.creatorName}`,
        `📞 Number: +${creatorNum}`,
        '💬 Contact if bot has error',
        `🔗 wa.me/${creatorNum}`,
      ]);
      await reply(text);
      // Real vCard - send contact card
      try {
        const vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:${config.creatorName}\nORG:Knight XMD\nTEL;type=CELL;type=VOICE;waid=${creatorNum}:+${creatorNum}\nEND:VCARD`;
        await sock.sendMessage(from, { contacts: { displayName: config.creatorName, contacts: [{ vcard }] } });
      } catch {}
    }
  },

  // ========== RUNTIME ==========
  {
    command: ['runtime', 'uptime'],
    run: async ({ reply, runtime }) => {
      const up = runtime ? runtime(Date.now() - global.botStart) : `${Math.floor((Date.now()-global.botStart)/1000)}s`;
      await reply(box('⏱️ RUNTIME', [`Uptime: ${up}`, `Started: ${new Date(global.botStart).toLocaleString('en-NG')}`]));
    }
  },

  // ========== BOTINFO - REAL DATA ==========
  {
    command: ['botinfo', 'info'],
    run: async ({ reply, sock, botNumber }) => {
      const groups = await sock.groupFetchAllParticipating().catch(() => ({}));
      await reply(box('🤖 BOT INFO', [
        `Name: ${config.botName}`,
        `Bot Number: +${botNumber || 'Unknown'}`,
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

  // ========== MODE - MISSING BEFORE ==========
  {
    command: ['mode'],
    ownerOnly: true,
    run: async ({ reply, args, text }) => {
      const v = (args[0] || '').toLowerCase();
      if (!v) return reply(`Current Mode: ${config.mode}\nUsage: .mode public / private / self\n\n- public = everybody fit use\n- private = only owner/creator\n- self = only owner/creator (same as private)`);
      if (!['public','private','self'].includes(v)) return reply('❌ Use: .mode public / private / self');
      config.mode = v;
      if (!global.db.settings) global.db.settings = {};
      global.db.settings.mode = v;
      save();
      await reply(`✅ Mode changed to: ${v}`);
    }
  },
  { command: ['public'], ownerOnly: true, run: async ({ reply }) => { config.mode = 'public'; if (!global.db.settings) global.db.settings = {}; global.db.settings.mode = 'public'; save(); await reply('✅ Bot is now PUBLIC - everybody fit use am'); } },
  { command: ['private'], ownerOnly: true, run: async ({ reply }) => { config.mode = 'private'; if (!global.db.settings) global.db.settings = {}; global.db.settings.mode = 'private'; save(); await reply('✅ Bot is now PRIVATE - only owner/creator'); } },
  { command: ['self'], ownerOnly: true, run: async ({ reply }) => { config.mode = 'self'; if (!global.db.settings) global.db.settings = {}; global.db.settings.mode = 'self'; save(); await reply('✅ Bot is now SELF - only owner/creator'); } },

  // ========== RESTART ==========
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

  // ========== BROADCAST - FIXED, NO BAN ==========
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
            await sleep(1500);
          } catch { fail++; }
        }
        await reply(box('📢 BROADCAST DONE', [`✅ Sent: ${success}`, `❌ Failed: ${fail}`, `Total: ${ids.length}`]));
      } catch (e) { await reply('❌ Broadcast failed: ' + e.message); }
    }
  },

  // ========== SET PREFIX - NOW SAVES TO DB ==========
  {
    command: ['setprefix'],
    ownerOnly: true,
    run: async ({ reply, args }) => {
      const p = args[0];
      if (!p) return reply(`Current prefix: ${config.prefix}\nUsage: .setprefix !`);
      if (p.length > 2) return reply('❌ Prefix too long, use 1 char like . ! # /');
      if ([' ', 'a', '1'].includes(p)) return reply('❌ Use symbol like . ! #');
      config.prefix = p;
      if (!global.db.settings) global.db.settings = {};
      global.db.settings.prefix = p;
      save();
      await reply(box('✅ PREFIX CHANGED', [`New Prefix: ${p}`, `Example: ${p}menu`, 'Saved - go survive restart']));
    }
  },

  // ========== SET BOT NAME ==========
  {
    command: ['setname', 'setbotname'],
    ownerOnly: true,
    run: async ({ sock, text, reply }) => {
      if (!text) return reply('Usage: .setname Knight XMD');
      if (text.length > 25) return reply('❌ Name too long, max 25 chars');
      try { await sock.updateProfileName(text); await reply(`✅ Bot name updated to: ${text}`); }
      catch { await reply('❌ Failed - try again'); }
    }
  },

  // ========== SET BIO ==========
  {
    command: ['setbio', 'setbotbio'],
    ownerOnly: true,
    run: async ({ sock, text, reply }) => {
      if (!text) return reply('Usage: .setbio ⚔️ Knight XMD | By Faceless Tech');
      if (text.length > 139) return reply('❌ Bio too long, max 139 chars');
      try { await sock.updateProfileStatus(text); await reply(`✅ Bio updated: ${text}`); }
      catch { await reply('❌ Failed'); }
    }
  },

  // ========== SET PP - FIXED ==========
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

  // ========== LEAVE ==========
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

  // ========== BLOCK - PROTECT CREATOR + OWNER ==========
  {
    command: ['block'],
    ownerOnly: true,
    run: async ({ sock, m, args, reply, sender, isCreator }) => {
      const target = getTarget(m, args);
      if (!target) return reply('Mention user, reply to them, or .block 234...');
      const targetNum = clean(target);
      if (targetNum === clean(config.creatorNumber)) return reply('❌ You cannot block the Creator');
      if (targetNum === clean(sender)) return reply('❌ You cannot block yourself');
      try { await sock.updateBlockStatus(target, 'block'); await reply(`✅ Blocked @${targetNum}`, { mentions: [target] }); }
      catch { await reply('❌ Block failed'); }
    }
  },

  // ========== UNBLOCK ==========
  {
    command: ['unblock'],
    ownerOnly: true,
    run: async ({ sock, m, args, reply }) => {
      const target = getTarget(m, args);
      if (!target) return reply('Mention user or .unblock 234...');
      try { await sock.updateBlockStatus(target, 'unblock'); await reply(`✅ Unblocked @${clean(target)}`, { mentions: [target] }); }
      catch { await reply('❌ Unblock failed'); }
    }
  },

  // ========== BAN - LID FIX + PROTECT ==========
  {
    command: ['ban'],
    ownerOnly: true,
    run: async ({ reply, m, args, sender, isCreator }) => {
      const t = getTarget(m, args);
      if (!t) return reply('Mention user to ban');
      const num = clean(t);
      // If target na LID (no be real number), use original JID part - still ban by that ID
      const banId = num.length < 10 ? clean(t) : num;
      if (banId === clean(config.creatorNumber)) return reply('❌ You cannot ban the Creator');
      if (banId === clean(sender)) return reply('❌ You cannot ban yourself');
      const banned = getBanned();
      if (banned.includes(banId)) return reply(`@${banId} already banned`, { mentions: [t] });
      banned.push(banId);
      save();
      await reply(box('🚫 BANNED', [`@${banId} banned`, 'Bot will ignore them now']), { mentions: [t] });
    }
  },

  // ========== UNBAN ==========
  {
    command: ['unban'],
    ownerOnly: true,
    run: async ({ reply, m, args }) => {
      const t = getTarget(m, args);
      if (!t) return reply('Mention user to unban');
      const num = clean(t);
      global.db.banned = getBanned().filter(x => x !== num);
      save();
      await reply(box('✅ UNBANNED', [`@${num} unbanned`, 'They can use bot now']), { mentions: [t] });
    }
  },

  // ========== BANLIST ==========
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
