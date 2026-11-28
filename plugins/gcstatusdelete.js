// KNIGHT XMD - Group Status Delete - REAL
// File: plugins/gcstatusdelete.js
// Deletes Group Status posts in group. Bot must be Group Admin.
// Works for: Group Status auto-delete + Reply delete + Warn

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../database/warnings.json');
const CFG_PATH = path.join(__dirname, '../database/antigcstatus.json');

function bold(str) {
  const A = '𝐀𝐁𝐂𝐃𝐄𝐅𝐆𝐇𝐈𝐉𝐊𝐋𝐌𝐍𝐎𝐏𝐐𝐑𝐒𝐓𝐔𝐕𝐖𝐗𝐘𝐙';
  const a = '𝐚𝐛𝐜𝐝𝐞𝐟𝐠𝐡𝐢𝐣𝐤𝐥𝐦𝐧𝐨𝐩𝐪𝐫𝐬𝐭𝐮𝐯𝐰𝐱𝐲𝐳';
  const n = '𝟎𝟏𝟐𝟑𝟒𝟓𝟔𝟕𝟖𝟗';
  const map = {};
  for (let i = 0; i < 26; i++) { map[String.fromCharCode(65+i)] = A[i]; map[String.fromCharCode(97+i)] = a[i]; }
  for (let i = 0; i < 10; i++) map[String(i)] = n[i];
  return String(str).split('').map(c => map[c] || c).join('');
}

function load(p) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return {}; } }
function save(p, d) {
  if (!fs.existsSync(path.dirname(p))) fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(d, null, 2));
}

function unwrap(msg) {
  if (!msg) return null;
  if (msg.viewOnceMessage) return unwrap(msg.viewOnceMessage.message);
  if (msg.viewOnceMessageV2) return unwrap(msg.viewOnceMessageV2.message);
  if (msg.ephemeralMessage) return unwrap(msg.ephemeralMessage.message);
  if (msg.documentWithCaptionMessage) return unwrap(msg.documentWithCaptionMessage.message);
  return msg;
}

// REAL: Check if this message is a Group Status post
function isGroupStatus(m) {
  if (!m?.message) return false;
  const raw = m.message;
  // Baileys sends Group Status as groupStatusMessage
  if (raw.groupStatusMessage) return true;
  // Some versions set groupStatus flag in messageContextInfo
  if (m.messageContextInfo?.groupStatus === true) return true;
  if (raw.messageContextInfo?.groupStatus === true) return true;
  // Fallback: check unwrapped
  const u = unwrap(raw);
  if (u?.groupStatusMessage) return true;
  return false;
}

function isAdminOf(meta, jid, sock) {
  if (!jid) return false;
  const num = String(jid).split('@')[0].split(':')[0];
  const entry = meta.participants.find(p => {
    const n = (p.id || '').split('@')[0].split(':')[0];
    return n === num || p.id === jid || p.lid === jid;
  });
  return entry?.admin === 'admin' || entry?.admin === 'superadmin';
}

async function checkBotAdmin(sock, from) {
  try {
    const meta = await sock.groupMetadata(from);
    return isAdminOf(meta, sock.user?.id, sock);
  } catch (e) {
    console.log('[GCSTATUS ADMIN CHECK]', e.message);
    return false;
  }
}

async function checkSenderAdmin(sock, from, sender) {
  try {
    const meta = await sock.groupMetadata(from);
    return isAdminOf(meta, sender, sock);
  } catch { return false; }
}

async function deleteForEveryone(sock, from, key) {
  await sock.sendMessage(from, { delete: key });
}

function getQuoted(m) {
  if (m.quoted?.key?.id) {
    return {
      key: {
        remoteJid: m.key.remoteJid,
        fromMe: false,
        id: m.quoted.key.id,
        participant: m.quoted.key.participant || m.quoted.participant || m.quoted.sender || m.key.participant
      },
      participant: m.quoted.key.participant || m.quoted.participant || m.quoted.sender || m.key.participant
    };
  }
  const raw = unwrap(m.message);
  if (!raw) return null;
  const ctx = raw.extendedTextMessage?.contextInfo
    || raw.imageMessage?.contextInfo
    || raw.videoMessage?.contextInfo
    || raw.stickerMessage?.contextInfo
    || raw.documentMessage?.contextInfo
    || raw.audioMessage?.contextInfo
    || raw.contactMessage?.contextInfo
    || raw.locationMessage?.contextInfo
    || raw.groupStatusMessage?.contextInfo
    || null;
  if (!ctx?.stanzaId) return null;
  // FIX: Never leave participant as null for group delete - use quoted participant or sender
  const participant = ctx.participant || m.key.participant;
  return {
    key: { remoteJid: m.key.remoteJid, fromMe: false, id: ctx.stanzaId, participant },
    participant,
    ctx,
    quotedMessage: ctx.quotedMessage
  };
}

async function warnAndMaybeKick(sock, from, targetJid, deleted) {
  const db = load(DB_PATH);
  db[from] = db[from] || {};
  const targetNum = targetJid.split('@')[0].split(':')[0];
  db[from][targetNum] = (db[from][targetNum] || 0) + 1;
  const count = db[from][targetNum];
  save(DB_PATH, db);

  if (count >= 2) {
    db[from][targetNum] = 0;
    save(DB_PATH, db);
    try { await sock.groupParticipantsUpdate(from, [targetJid], 'remove'); } catch (e) { console.log('[GCSTATUS KICK FAIL]', e.message); }
    await sock.sendMessage(from, {
      text: `🚨 ${bold('GROUP STATUS 2/2 - REMOVED')}\n\n👤 @${targetNum}\n🗑️ ${bold('Group Status post deleted for everyone.')}\n🦵 ${bold('User has been removed.')}`,
      mentions: [targetJid]
    });
    return;
  }
  await sock.sendMessage(from, {
    text: `⚠️ ${bold('GROUP STATUS WARNING')} ${count}/2\n\n👤 @${targetNum}\n🗑️ ${bold('Group Status post deleted for everyone.')}\n⚠️ ${bold('Do not post Group Status again. One more = Removal.')}`,
    mentions: [targetJid]
  });
}

async function handleGroupStatus(sock, m, from) {
  try {
    if (!m?.message) return false;
    if (m.key?.fromMe) return false;
    if (!from?.endsWith('@g.us')) return false;
    if (!isGroupStatus(m)) return false;

    const cfg = load(CFG_PATH);
    if (cfg[from]?.on !== true) return false; // FIX: Default OFF, only true = ON

    const sender = m.key.participant || m.key.remoteJid;
    if (!sender) return false;

    // Do not delete admin posts
    const senderIsAdmin = await checkSenderAdmin(sock, from, sender);
    if (senderIsAdmin) return false;

    const botAdmin = await checkBotAdmin(sock, from);
    if (!botAdmin) {
      await sock.sendMessage(from, { text: `⚠️ ${bold('Group Status: A member posted a Group Status, but the bot is not an admin, so it cannot delete it. Please make the bot an admin.')}` });
      return false;
    }

    console.log(`[GCSTATUS] Deleting Group Status from ${sender} in ${from} | id=${m.key.id}`);
    await deleteForEveryone(sock, from, m.key);
    await warnAndMaybeKick(sock, from, sender, true);
    return true;
  } catch (e) {
    console.log('[GCSTATUS AUTO]', e.message);
    return false;
  }
}

const commands = [
  // .antigcstatus on / off - REAL toggle, default OFF
  {
    command: ['antigcstatus', 'antigcstatusmention', 'gcstatus'],
    run: async ({ from, reply, args, text, isGroup }) => {
      if (!isGroup && !from?.endsWith('@g.us')) return reply(`❌ ${bold('This command only works in a group.')}`);
      let input = (args?.[0] || '').toLowerCase();
      if (!input && text) {
        const parts = String(text).trim().split(/\s+/);
        if (parts.length >= 2) input = parts[1].toLowerCase();
      }
      const db = load(CFG_PATH);
      if (!input) {
        const on = db[from]?.on === true;
        return reply(`🛡️ ${bold('Anti Group Status:')} ${on ? bold('ON ✅') : bold('OFF ❌')}\n\n${bold('Usage:')} .antigcstatus ${bold('on / off')}`);
      }
      if (input === 'on' || input === 'off') {
        db[from] = { on: input === 'on' };
        save(CFG_PATH, db);
        return reply(`🛡️ ${bold('Anti Group Status')} ${input === 'on' ? bold('ON ✅') : bold('OFF ❌')} ${bold('for this group.')}`);
      }
      return reply(`❌ ${bold('Usage:')} .antigcstatus ${bold('on / off')}`);
    }
  },
  // .gcstatus delete - Reply to a Group Status post
  {
    command: ['gcstatusdelete', 'deletegcstatus', 'delgcstatus', 'dgcstatus'],
    run: async ({ sock, m, from, reply, args, isGroup }) => {
      if (!isGroup && !from.endsWith('@g.us')) return reply(`❌ ${bold('Only in groups.')}`);
      const arg = (args[0] || '').toLowerCase();
      if (arg !== 'delete' && arg !== 'del') return reply(`❌ ${bold('Usage:')} Reply to the Group Status post + .gcstatus delete`);

      const q = getQuoted(m);
      if (!q) return reply(`❌ ${bold('No quoted message found.')} ${bold('Reply to the message again. If it is ViewOnce, open it first, then reply.')}`);

      const isAdmin = await checkBotAdmin(sock, from);
      if (!isAdmin) return reply(`❌ ${bold('Bot must be Group Admin to delete for everyone. Make the bot admin and try again.')}`);

      try {
        await deleteForEveryone(sock, from, q.key);
        return reply(`✅ ${bold('Deleted for everyone.')}`);
      } catch (e) {
        console.log('[GCSTATUS DELETE ERROR]', e);
        return reply(`❌ ${bold('Delete failed:')} ${e.message}\n${bold('Message ID:')} ${q.key.id}\n${bold('Participant:')} ${q.key.participant || 'Unknown'}\n${bold('Check: Bot admin? Message less than 2 days old?')}`);
      }
    }
  },
  {
    command: ['gwarn', 'warn'],
    run: async ({ sock, m, from, reply }) => {
      if (!from.endsWith('@g.us')) return reply(`❌ ${bold('Only in groups.')}`);
      const q = getQuoted(m);
      if (!q?.participant) return reply(`❌ ${bold('Reply to the post +')} .gwarn`);

      const isAdmin = await checkBotAdmin(sock, from);
      if (!isAdmin) return reply(`❌ ${bold('Bot must be Group Admin.')}`);

      try { await deleteForEveryone(sock, from, q.key); } catch (e) { console.log('[GWARN DELETE]', e.message); }
      await warnAndMaybeKick(sock, from, q.participant, true);
    }
  },
  {
    command: ['gunwarn', 'unwarn'],
    run: async ({ m, from, reply, args }) => {
      const q = getQuoted(m);
      const ctx = unwrap(m.message)?.extendedTextMessage?.contextInfo;
      let targetNum = q?.participant?.split('@')[0]?.split(':')[0]
        || ctx?.mentionedJid?.[0]?.split('@')[0]
        || (args[0] || '').replace(/[^0-9]/g, '');
      if (!targetNum) return reply(`❌ ${bold('Reply to the person +')} .gunwarn ${bold('or')} .gunwarn 234...`);
      const db = load(DB_PATH);
      if (!db[from]?.[targetNum]) return reply(`✅ @${targetNum} ${bold('has 0 warnings.')}`);
      db[from][targetNum] = Math.max(0, db[from][targetNum] - 1);
      save(DB_PATH, db);
      return reply(`✅ @${targetNum} ${bold('now has')} ${db[from][targetNum]}/2`);
    }
  },
  {
    command: ['gwarnings', 'gwarns', 'warnings'],
    run: async ({ from, reply }) => {
      const db = load(DB_PATH);
      const all = db[from] || {};
      const list = Object.entries(all).filter(([_, c]) => c > 0);
      if (!list.length) return reply(`✅ ${bold('No warnings in this group.')}`);
      return reply(`⚠️ ${bold('WARNINGS')}\n` + list.map(([n, c]) => `@${n} - ${c}/2`).join('\n'));
    }
  },
  {
    all: true,
    run: async ({ sock, m, from }) => {
      await handleGroupStatus(sock, m, from);
    }
  }
];

module.exports = commands;
module.exports.handleGroupStatus = handleGroupStatus;
module.exports.isGroupStatus = isGroupStatus;
