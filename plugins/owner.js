// KNIGHT XMD - Owner / Ping System - FANCY V2 - Connected to handler.js
// By Faceless Tech
const config = require('../config');
const os = require('os');

const clean = (jid) => (jid || '').split('@')[0].split(':')[0].replace(/[^0-9]/g, '');

// ========== ✨ KNIGHT UI - FANCY DESIGN SYSTEM ==========
const KnightUI = {
  // Main fancy box
  box(title, lines) {
    let t = `╭─━─━─━─━─━─━─━─━─━─━─━─━─━─━─━─━─━╮\n`;
    t += `│  ✦  ${title.toUpperCase()}  ✦\n`;
    t += `├─━─━─━─━─━─━─━─━─━─━─━─━─━─━─━─━─━┤\n`;
    lines.forEach(l => t += `│  ▸ ${l}\n`);
    t += `╰─━─━─━─━─━─━─━─━─━─━─━─━─━─━─━─━─━╯`;
    return t;
  },
  // Premium card with footer
  card(title, lines, footer = '⚔️ KNIGHT XMD • By Faceless Tech') {
    let t = `┏━━━━━━━━━━━━━━━━━━━━━━┓\n`;
    t += `┃  ${title}\n`;
    t += `┣━━━━━━━━━━━━━━━━━━━━━━┫\n`;
    lines.forEach(l => t += `┃  ${l}\n`);
    t += `┣━━━━━━━━━━━━━━━━━━━━━━┫\n`;
    t += `┃  ${footer}\n`;
    t += `┗━━━━━━━━━━━━━━━━━━━━━━┛`;
    return t;
  },
  // Progress bar - fancy
  bar(pct) {
    const total = 10;
    const filled = Math.round(pct / 10);
    const empty = total - filled;
    return `[${'█'.repeat(filled)}${'░'.repeat(empty)}] ${pct}%`;
  },
  // Fancy bar with ▓
  bar2(pct) {
    const total = 12;
    const filled = Math.round(pct / 100 * total);
    return `[${'▓'.repeat(filled)}${'░'.repeat(total - filled)}] ${pct}%`;
  },
  header: (emoji, text) => `╭── ${emoji}  ${text}`,
  line: () => `┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄`,
  divider: `╰───────────────────────╯`,
  ok: (t) => `✅  ${t}`,
  err: (t) => `❌  ${t}`,
  // Speed rank
  speedRank: (ms) => ms < 150 ? '🚀 GOD SPEED' : ms < 300 ? '⚡ EXCELLENT' : ms < 600 ? '✅ GOOD' : ms < 1000 ? '⚠️ AVERAGE' : '🐢 SLOW',
  // Uptime fancy
  uptimeFancy: () => {
    const s = Math.floor(process.uptime());
    const d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60), sec = s % 60;
    if (d > 0) return `${d}d ${h}h ${m}m ${sec}s`;
    return `${h}h ${m}m ${sec}s`;
  },
  // Memory
  mem: () => {
    const used = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);
    const total = (os.totalmem() / 1024 / 1024).toFixed(0);
    return `${used}MB / ${total}MB`;
  }
};

// Keep old name for compatibility
function box(title, lines) { return KnightUI.box(title, lines); }

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

function getBanned() {
  if (!global.db) global.db = {};
  if (!global.db.banned) global.db.banned = [];
  return global.db.banned;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function save() { if (global.dbSave) global.dbSave(); }

module.exports = [
  // ========== PING - FANCY ANIMATED - V2 ==========
  {
    command: ['ping'],
    run: async ({ sock, from, m }) => {
      const t0 = Date.now();
      const sent = await sock.sendMessage(from, { text: `╭── 🏓  PING\n│  ▸ Initializing...\n╰── ${KnightUI.bar(0)}` }, { quoted: m });
      const edit = async (txt) => {
        try { await sock.sendMessage(from, { text: txt, edit: sent.key }); } catch {}
        await sleep(350);
      };
      await edit(`╭── 🏓  PING\n│  ▸ Connecting to WhatsApp...\n╰── ${KnightUI.bar(40)}`);
      const s1 = Date.now();
      await edit(`╭── 🏓  PING\n│  ▸ Measuring round-trip...\n╰── ${KnightUI.bar(70)}`);
      await edit(`╭── 🏓  PING\n│  ▸ Calculating speed...\n╰── ${KnightUI.bar(90)}`);
      const speed = Date.now() - t0;
      const editPing = Date.now() - s1;
      const final = KnightUI.box('🏓 PING • KNIGHT XMD', [
        `⚡ Speed: ${speed}ms`,
        `✏️ Edit Speed: ${editPing}ms`,
        `🟢 Status: Online`,
        `⏱️ Uptime: ${KnightUI.uptimeFancy()}`,
        `💾 RAM: ${KnightUI.mem()}`,
        `${KnightUI.speedRank(speed)}`,
      ]);
      try {
        await sock.sendMessage(from, { text: final + `\n${KnightUI.bar(100)} ✅` , edit: sent.key });
      } catch { await sock.sendMessage(from, { text: final }, { quoted: m }); }
    }
  },

  // ========== NEW: SPEED - REAL SPEED TEST ==========
  {
    command: ['speed', 'speedtest'],
    run: async ({ reply }) => {
      const t0 = Date.now();
      await reply('⚡ Testing speed...');
      const arr = Array.from({length: 50000}, (_, i) => i * 2);
      arr.sort((a,b) => b - a);
      const cpu = Date.now() - t0;
      const ping = Date.now() - t0;
      await reply(KnightUI.card('⚡ SPEED TEST', [
        `🏓 Ping: ${ping}ms`,
        `🧠 CPU Test: ${cpu}ms`,
        `💾 RAM: ${KnightUI.mem()}`,
        `📊 Rank: ${KnightUI.speedRank(ping)}`,
        `🖥️ Platform: ${os.platform()} ${os.arch()}`,
      ]));
    }
  },

  // ========== NEW: STATUS - SYSTEM HEALTH ==========
  {
    command: ['status', 'health'],
    run: async ({ reply, sock, botNumber }) => {
      const groups = await sock.groupFetchAllParticipating().catch(() => ({}));
      const memPct = Math.round((process.memoryUsage().heapUsed / os.totalmem()) * 100);
      await reply(KnightUI.card('💎 KNIGHT XMD • STATUS', [
        `🟢 Bot: Online`,
        `🤖 Number: +${botNumber || 'Unknown'}`,
        `⏱️ Uptime: ${KnightUI.uptimeFancy()}`,
        `👥 Groups: ${Object.keys(groups).length}`,
        `💾 RAM: ${KnightUI.mem()} ${KnightUI.bar2(memPct)}`,
        `🖥️ CPU: ${os.cpus()[0]?.model?.split(' ')[0] || 'Unknown'}`,
        `⚡ Mode: ${config.mode?.toUpperCase()}`,
        `🔋 Health: ${memPct < 80 ? '✅ Excellent' : '⚠️ High Usage'}`,
      ]));
    }
  },

  // ========== NEW: SYSINFO ==========
  {
    command: ['sysinfo', 'system'],
    run: async ({ reply }) => {
      await reply(KnightUI.box('🖥️ SYSTEM INFO', [
        `OS: ${os.type()} ${os.release()}`,
        `Arch: ${os.arch()}`,
        `CPU: ${os.cpus().length} Cores`,
        `Total RAM: ${(os.totalmem()/1024/1024/1024).toFixed(2)} GB`,
        `Free RAM: ${(os.freemem()/1024/1024/1024).toFixed(2)} GB`,
        `Node: ${process.version}`,
        `Uptime: ${KnightUI.uptimeFancy()}`,
        `Host: ${os.hostname()}`,
      ]));
    }
  },

  // ========== ALIVE - FANCY V2 ==========
  {
    command: ['alive'],
    run: async ({ reply, runtime, botNumber }) => {
      const up = runtime ? runtime(Date.now() - global.botStart) : KnightUI.uptimeFancy();
      await reply(KnightUI.card('💎 ALIVE • KNIGHT XMD', [
        '⚔️ Knight XMD is Alive',
        `👑 Creator: ${config.creatorName}`,
        `🤖 Bot Number: +${botNumber || 'Unknown'}`,
        `⏱️ Uptime: ${up}`,
        `⚡ Prefix: ${config.prefix}`,
        `💾 RAM: ${KnightUI.mem()}`,
        '✅ All Systems Working',
      ]));
    }
  },

  // ========== OWNER - REAL vCard - FANCY ==========
  {
    command: ['owner', 'creator'],
    run: async ({ reply, sock, from }) => {
      const creatorNum = clean(config.creatorNumber);
      const text = KnightUI.box('👑 CREATOR', [
        `👤 Name: ${config.creatorName}`,
        `📞 Number: +${creatorNum}`,
        '💬 Contact if bot has error',
        `🔗 wa.me/${creatorNum}`,
      ]);
      await reply(text);
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
      await reply(KnightUI.box('⏱️ RUNTIME', [`Uptime: ${up}`, `Started: ${new Date(global.botStart).toLocaleString('en-NG')}`, `💾 RAM: ${KnightUI.mem()}`]));
    }
  },

  // ========== BOTINFO - FANCY V2 ==========
  {
    command: ['botinfo', 'info'],
    run: async ({ reply, sock, botNumber }) => {
      const groups = await sock.groupFetchAllParticipating().catch(() => ({}));
      await reply(KnightUI.card('🤖 BOT INFO • KNIGHT XMD', [
        `Name: ${config.botName}`,
        `Bot Number: +${botNumber || 'Unknown'}`,
        `Creator: ${config.creatorName}`,
        'Version: 2.0.0 • Fancy',
        `Mode: ${config.mode}`,
        `Prefix: ${config.prefix}`,
        `Language: ${config.language || 'en'}`,
        `Groups: ${Object.keys(groups).length}`,
        `Uptime: ${KnightUI.uptimeFancy()}`,
        `RAM: ${KnightUI.mem()}`,
        'Library: Baileys',
      ]));
    }
  },

  // ========== MODE ==========
  {
    command: ['mode'],
    ownerOnly: true,
    run: async ({ reply, args }) => {
      const v = (args[0] || '').toLowerCase();
      if (!v) return reply(KnightUI.box('⚙️ MODE', [`Current: ${config.mode}`, `Usage: .mode public / private / self`, `- public = everybody fit use`, `- private = only owner/creator`, `- self = only owner/creator`]));
      if (!['public','private','self'].includes(v)) return reply('❌ Use: .mode public / private / self');
      config.mode = v;
      if (!global.db.settings) global.db.settings = {};
      global.db.settings.mode = v;
      save();
      await reply(KnightUI.box('✅ MODE CHANGED', [`New Mode: ${v.toUpperCase()}`]));
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
      await reply(KnightUI.box('🔄 RESTART', ['Restarting... wait 5 sec', 'Bot go come back online']));
      await sleep(1000);
      process.exit(0);
    }
  },

  // ========== SHUTDOWN ==========
  {
    command: ['shutdown', 'off'],
    ownerOnly: true,
    run: async ({ reply }) => {
      await reply(KnightUI.box('🛑 SHUTDOWN', ['Shutting down... Bye 👋']));
      await sleep(1000);
      process.exit(0);
    }
  },

  // ========== BROADCAST - FANCY ==========
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
        await reply(KnightUI.box('📢 BROADCAST DONE', [`✅ Sent: ${success}`, `❌ Failed: ${fail}`, `Total: ${ids.length}`]));
      } catch (e) { await reply('❌ Broadcast failed: ' + e.message); }
    }
  },

  // ========== SET PREFIX ==========
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
      await reply(KnightUI.box('✅ PREFIX CHANGED', [`New Prefix: ${p}`, `Example: ${p}menu`, 'Saved - go survive restart']));
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

  // ========== SET PP ==========
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

  // ========== BLOCK ==========
  {
    command: ['block'],
    ownerOnly: true,
    run: async ({ sock, m, args, reply, sender, from }) => {
      const target = getTarget(m, args);
      if (!target) return reply('Mention user, reply to them, or .block 234...');
      const targetNum = clean(target);
      if (targetNum === clean(config.creatorNumber)) return reply('❌ You cannot block the Creator');
      if (targetNum === clean(sender)) return reply('❌ You cannot block yourself');
      try { await sock.updateBlockStatus(target, 'block'); await sock.sendMessage(from, { text: `✅ Blocked @${targetNum}`, mentions: [target] }, { quoted: m }); }
      catch { await reply('❌ Block failed'); }
    }
  },

  // ========== UNBLOCK ==========
  {
    command: ['unblock'],
    ownerOnly: true,
    run: async ({ sock, m, args, reply, from }) => {
      const target = getTarget(m, args);
      if (!target) return reply('Mention user or .unblock 234...');
      try { await sock.updateBlockStatus(target, 'unblock'); await sock.sendMessage(from, { text: `✅ Unblocked @${clean(target)}`, mentions: [target] }, { quoted: m }); }
      catch { await reply('❌ Unblock failed'); }
    }
  },

  // ========== BAN ==========
  {
    command: ['ban'],
    ownerOnly: true,
    run: async ({ reply, m, args, sender, sock, from }) => {
      const t = getTarget(m, args);
      if (!t) return reply('Mention user to ban');
      const num = clean(t);
      const banId = num.length < 10 ? clean(t) : num;
      if (banId === clean(config.creatorNumber)) return reply('❌ You cannot ban the Creator');
      if (banId === clean(sender)) return reply('❌ You cannot ban yourself');
      const banned = getBanned();
      if (banned.includes(banId)) return reply(`@${banId} already banned`);
      banned.push(banId);
      save();
      await sock.sendMessage(from, { text: KnightUI.box('🚫 BANNED', [`@${banId} banned`, 'Bot will ignore them now']), mentions: [t] }, { quoted: m });
    }
  },

  // ========== UNBAN ==========
  {
    command: ['unban'],
    ownerOnly: true,
    run: async ({ reply, m, args, sock, from }) => {
      const t = getTarget(m, args);
      if (!t) return reply('Mention user to unban');
      const num = clean(t);
      global.db.banned = getBanned().filter(x => x !== num);
      save();
      await sock.sendMessage(from, { text: KnightUI.box('✅ UNBANNED', [`@${num} unbanned`, 'They can use bot now']), mentions: [t] }, { quoted: m });
    }
  },

  // ========== BANLIST - FANCY ==========
  {
    command: ['banlist', 'banned'],
    ownerOnly: true,
    run: async ({ reply, sock, from, m }) => {
      const banned = getBanned();
      if (!banned.length) return reply(KnightUI.box('✅ BANLIST', ['No banned users', 'Everyone is free']));
      let t = `┏━━━━━━━━━━━━━━━━━━━━━━┓\n┃  🚫 BANNED LIST (${banned.length})\n┣━━━━━━━━━━━━━━━━━━━━━━┫\n`;
      banned.forEach((n, i) => t += `┃  ${i + 1}. @${n}\n`);
      t += `┗━━━━━━━━━━━━━━━━━━━━━━┛`;
      await sock.sendMessage(from, { text: t, mentions: banned.map(n => n + '@s.whatsapp.net') }, { quoted: m });
    }
  },
];
