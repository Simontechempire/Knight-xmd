// KNIGHT XMD - Anti GC Status Mention - REAL - No Fake Toggle
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../database/antigcstatus.json');
const WARN_PATH = path.join(__dirname, '../database/warnings.json');

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
  if (msg.viewOnceMessageV2Extension) return unwrap(msg.viewOnceMessageV2Extension.message);
  return msg;
}

function isOn(from) {
  const db = load(DB_PATH);
  return db[from]?.on === true; // FIX: Default is OFF. Only true = ON. No fake ON.
}

async function isBotAdminReal(sock, from) {
  try {
    const meta = await sock.groupMetadata(from);
    const meId = sock.user?.id || '';
    const meNum = meId.split(':')[0].split('@')[0];
    const entry = meta.participants.find(p => {
      const n = (p.id || '').split(':')[0].split('@')[0];
      return n === meNum || p.id === meId || p.lid === sock.user?.lid;
    });
    return entry?.admin === 'admin' || entry?.admin === 'superadmin';
  } catch (e) {
    console.log('[ANTIGCSTATUS ADMIN CHECK]', e.message);
    return false;
  }
}

async function handleGcStatusMention(sock, m, from) {
  try {
    if (!m?.message) return false;
    if (m.key?.fromMe) return false;
    if (!from?.endsWith('@g.us')) return false;
    if (!isOn(from)) return false;

    const realSender = m.key.participant || m.key.remoteJid;
    if (!realSender) return false;

    const raw = unwrap(m.message);
    if (!raw) return false;

    const ctx = raw.extendedTextMessage?.contextInfo
      || raw.imageMessage?.contextInfo
      || raw.videoMessage?.contextInfo
      || raw.stickerMessage?.contextInfo
      || raw.documentMessage?.contextInfo
      || raw.audioMessage?.contextInfo
      || raw.contactMessage?.contextInfo
      || raw.locationMessage?.contextInfo
      || raw.pollCreationMessage?.contextInfo
      || raw.pollUpdateMessage?.contextInfo
      || {};

    const mentioned = ctx.mentionedJid || [];
    const mentionedThisGroup = mentioned.some(j => j === from);

    const groupMentions = m.messageContextInfo?.groupMentions
      || raw.messageContextInfo?.groupMentions
      || m.message?.messageContextInfo?.groupMentions
      || m.message?.extendedTextMessage?.contextInfo?.groupMentions
      || [];
    const hasGroupMentionInStatus = Array.isArray(groupMentions) && groupMentions.some(g => (g.groupJid || g.jid) === from);

    // WhatsApp also sends group mention as a system message with groupMentionedJids
    const mentionedInContext = m.messageContextInfo?.mentionedJid || [];
    const hasSystemMention = mentionedInContext.includes(from);

    if (!mentionedThisGroup && !hasGroupMentionInStatus && !hasSystemMention) return false;

    console.log(`[ANTIGCSTATUS] Detected group mention from ${realSender} in ${from}`);

    const admin = await isBotAdminReal(sock, from);
    if (!admin) {
      await sock.sendMessage(from, { text: `⚠️ ${bold('Anti GC Status: Group was mentioned, but the bot is not an admin, so it cannot delete the message. Please make the bot an admin.')}` });
      return false;
    }

    let deleted = false;
    try {
      await sock.sendMessage(from, { delete: m.key });
      deleted = true;
      console.log(`[ANTIGCSTATUS] Deleted ${m.key.id}`);
    } catch (e) {
      console.log('[ANTIGCSTATUS DELETE FAIL]', e.message);
      await sock.sendMessage(from, { text: `⚠️ ${bold('Anti GC Status: Failed to delete the message. The bot may not have delete permission.')}` });
      return false;
    }

    if (!deleted) return false;

    const warnDB = load(WARN_PATH);
    warnDB[from] = warnDB[from] || {};
    const targetNum = realSender.split('@')[0].split(':')[0];
    warnDB[from][targetNum] = (warnDB[from][targetNum] || 0) + 1;
    const count = warnDB[from][targetNum];
    save(WARN_PATH, warnDB);

    if (count >= 2) {
      warnDB[from][targetNum] = 0;
      save(WARN_PATH, warnDB);
      try { await sock.groupParticipantsUpdate(from, [realSender], 'remove'); } catch (e) { console.log('[ANTIGCSTATUS KICK FAIL]', e.message); }
      await sock.sendMessage(from, {
        text: `🚨 *${bold('ANTI-GCSTATUS 2/2 - REMOVED')}*\n\n👤 @${targetNum}\n🗑️ ${bold('Group mention in status was deleted.')}\n🦵 ${bold('User has been removed.')}`,
        mentions: [realSender]
      });
      return true;
    }

    await sock.sendMessage(from, {
      text: `⚠️ *${bold('ANTI-GCSTATUS WARNING')} ${count}/2*\n\n👤 @${targetNum}\n🗑️ ${bold('Group mention in status was deleted for everyone.')}\n⚠️ ${bold('Do not mention the group in status again. One more warning = Removal.')}`,
      mentions: [realSender]
    });
    return true;
  } catch (e) {
    console.log('[ANTIGCSTATUS]', e.message);
    return false;
  }
}

const commands = [
  {
    command: ['antigcstatus', 'antigcstatusmention'],
    adminOnly: true,
    run: async ({ from, reply, args, text, isGroup }) => {
      if (!isGroup && !from?.endsWith('@g.us')) return reply(`❌ ${bold('This command only works in a group.')}`);
      // FIX: Read from args OR text - not args only
      let input = (args?.[0] || '').toLowerCase();
      if (!input && text) {
        const parts = String(text).trim().split(/\s+/);
        if (parts.length >= 2) input = parts[1].toLowerCase();
      }
      const db = load(DB_PATH);
      if (!input) {
        const on = isOn(from);
        return reply(`🛡️ ${bold('Anti GC Status Mention:')} ${on ? bold('ON ✅') : bold('OFF ❌')}\n\n${bold('Usage:')} .antigcstatus ${bold('on / off')}\n${bold('ON = Delete + Warn')} | ${bold('OFF = Allow')}`);
      }
      if (input === 'on' || input === 'off') {
        db[from] = { on: input === 'on' };
        save(DB_PATH, db);
        return reply(`🛡️ ${bold('Anti GC Status Mention')} ${input === 'on' ? bold('ON ✅') : bold('OFF ❌')} ${bold('for this group.')}`);
      }
      return reply(`❌ ${bold('Usage:')} .antigcstatus ${bold('on / off')}`);
    }
  },
  {
    all: true,
    run: async ({ sock, m, from }) => {
      await handleGcStatusMention(sock, m, from);
    }
  }
];

module.exports = commands;
module.exports.handleGcStatusMention = handleGcStatusMention;
module.exports.isOn = isOn;
