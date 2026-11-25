// KNIGHT XMD - REAL Delete For Everyone - Reply method
// File: plugins/gcstatusdelete.js
// No isBotAdmin guess, no sessionDB guess.
// Bot go check admin by itself from groupMetadata.
// Works for: text, image, video, sticker, document, viewOnce, ephemeral

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../database/warnings.json');

function loadDB() {
  try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf8')); } catch { return {}; }
}
function saveDB(d) {
  if (!fs.existsSync(path.dirname(DB_PATH))) fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(d, null, 2));
}

// Unwrap viewOnce / ephemeral / viewOnceV2 - REAL Baileys structure
function unwrap(msg) {
  if (!msg) return null;
  if (msg.viewOnceMessage) return unwrap(msg.viewOnceMessage.message);
  if (msg.viewOnceMessageV2) return unwrap(msg.viewOnceMessageV2.message);
  if (msg.ephemeralMessage) return unwrap(msg.ephemeralMessage.message);
  if (msg.documentWithCaptionMessage) return unwrap(msg.documentWithCaptionMessage.message);
  return msg;
}

function getQuoted(m) {
  // Case 1: handler already give m.quoted (some handlers do)
  if (m.quoted?.key?.id) {
    return {
      key: {
        remoteJid: m.key.remoteJid,
        fromMe: false,
        id: m.quoted.key.id,
        participant: m.quoted.key.participant || m.quoted.participant || m.quoted.sender
      },
      participant: m.quoted.key.participant || m.quoted.participant || m.quoted.sender,
      raw: m.quoted
    };
  }
  // Case 2: raw Baileys - check every possible place
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
    || null;
  if (!ctx?.stanzaId) return null;

  // participant for group: ctx.participant = "234...@s.whatsapp.net" or "...@lid"
  // If e no get participant, use quotedMessage sender - WhatsApp need am for group delete
  return {
    key: {
      remoteJid: m.key.remoteJid,
      fromMe: false,
      id: ctx.stanzaId,
      participant: ctx.participant || null
    },
    participant: ctx.participant || null,
    ctx,
    quotedMessage: ctx.quotedMessage
  };
}

// REAL admin check - no isBotAdmin param needed
async function checkBotAdmin(sock, from) {
  try {
    const meta = await sock.groupMetadata(from);
    const me = sock.user?.id?.split(':')[0] + '@s.whatsapp.net';
    const meLid = sock.user?.id;
    const meEntry = meta.participants.find(p => {
      const id = (p.id || '').split(':')[0];
      return id === me.split('@')[0] || p.id === meLid || p.id === me;
    });
    return meEntry?.admin === 'admin' || meEntry?.admin === 'superadmin';
  } catch (e) {
    console.log('[CHECK ADMIN]', e.message);
    return null; // unknown - let WhatsApp decide
  }
}

module.exports = [
  // ===== 1. .gcstatus delete - Reply =====
  {
    command: ['gcstatus', 'gcstatusdelete', 'deletegcstatus', 'delgcstatus', 'dgcstatus'],
    run: async ({ sock, m, from, reply, args, isGroup }) => {
      if (!isGroup && !from.endsWith('@g.us')) return reply('❌ Only in groups');
      const arg = (args[0] || '').toLowerCase();
      if (arg !== 'delete' && arg !== 'del') return reply('❌ Use: Reply to status post + `.gcstatus delete`');

      const q = getQuoted(m);
      if (!q) {
        // Show real debug so you fit see wetin WhatsApp send - no hiding
        return reply('❌ No quoted message found.\nReply to the message again.\nIf na ViewOnce, open am first, then reply.');
      }

      // REAL admin check
      const isAdmin = await checkBotAdmin(sock, from);
      if (isAdmin === false) return reply('❌ Bot MUST be Group Admin to delete for everyone.\nMake bot admin, try again.');

      try {
        // REAL Baileys delete for everyone - this is the only way WhatsApp allow
        // delete: { remoteJid, fromMe, id, participant }
        await sock.sendMessage(from, { delete: q.key });
        return reply('✅ Deleted for everyone');
      } catch (e) {
        console.log('[GCSTATUS DELETE REAL ERROR]', e);
        // Show REAL WhatsApp error, no generic
        return reply(`❌ Delete failed: ${e.message}\nStanzaId: ${q.key.id}\nParticipant: ${q.key.participant || 'none'}\nCheck: Bot admin? Message < 2 days old?`);
      }
    }
  },

  // ===== 2. .gwarn - Reply =====
  {
    command: ['gwarn', 'warn'],
    run: async ({ sock, m, from, reply }) => {
      if (!from.endsWith('@g.us')) return reply('❌ Only in groups');
      const q = getQuoted(m);
      if (!q?.participant) return reply('❌ Reply to him post + `.gwarn`\nIf participant missing, reply to text message, no be ViewOnce.');

      const isAdmin = await checkBotAdmin(sock, from);
      if (isAdmin === false) return reply('❌ Bot MUST be Group Admin');

      const targetJid = q.participant;
      const targetNum = targetJid.split('@')[0].split(':')[0];

      const db = loadDB();
      db[from] = db[from] || {};
      db[from][targetNum] = (db[from][targetNum] || 0) + 1;
      const count = db[from][targetNum];
      saveDB(db);

      // Delete first - REAL
      try { await sock.sendMessage(from, { delete: q.key }); } catch (e) { console.log('[GWARN DELETE]', e.message); }

      if (count >= 2) {
        db[from][targetNum] = 0;
        saveDB(db);
        try {
          await sock.groupParticipantsUpdate(from, [targetJid], 'remove');
        } catch (e) { return reply(`❌ Kick failed: ${e.message} - Bot admin?`); }
        return sock.sendMessage(from, { text: `🚨 WARN 2/2 - @${targetNum} KICKED. Post deleted.`, mentions: [targetJid] });
      }
      return sock.sendMessage(from, { text: `⚠️ WARN ${count}/2 @${targetNum} - Post deleted. 1 more = Kick.`, mentions: [targetJid] });
    }
  },

  // ===== 3. .gunwarn =====
  {
    command: ['gunwarn', 'unwarn'],
    run: async ({ m, from, reply, args }) => {
      const q = getQuoted(m);
      const ctx = unwrap(m.message)?.extendedTextMessage?.contextInfo;
      let targetNum = q?.participant?.split('@')[0]?.split(':')[0]
        || ctx?.mentionedJid?.[0]?.split('@')[0]
        || (args[0] || '').replace(/[^0-9]/g, '');
      if (!targetNum) return reply('❌ Reply to person + `.gunwarn` or `.gunwarn 234...`');
      const db = loadDB();
      if (!db[from]?.[targetNum]) return reply(`✅ @${targetNum} get 0 warns`);
      db[from][targetNum] = Math.max(0, db[from][targetNum] - 1);
      saveDB(db);
      return reply(`✅ @${targetNum} now ${db[from][targetNum]}/2`);
    }
  },

  // ===== 4. .gwarnings =====
  {
    command: ['gwarnings', 'gwarns', 'warnings'],
    run: async ({ from, reply }) => {
      const db = loadDB();
      const all = db[from] || {};
      const list = Object.entries(all).filter(([_, c]) => c > 0);
      if (!list.length) return reply('✅ No warnings for this group');
      return reply('⚠️ WARNINGS\n' + list.map(([n, c]) => `@${n} - ${c}/2`).join('\n'));
    }
  }
];
