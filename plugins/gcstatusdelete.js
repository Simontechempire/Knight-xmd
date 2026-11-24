// KNIGHT XMD - REAL Delete For Everyone + Warn - Reply method
// File: plugins/gcstatusdelete.js
// Usage: Reply to status/group post + .gcstatus delete
//        Reply + .gwarn | .gunwarn | .gwarnings

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

// Get quoted message key - REAL from Baileys
function getQuoted(m) {
  const msg = m.message || {};
  const ctx = msg.extendedTextMessage?.contextInfo
    || msg.imageMessage?.contextInfo
    || msg.videoMessage?.contextInfo
    || msg.stickerMessage?.contextInfo
    || msg.documentMessage?.contextInfo
    || null;
  if (!ctx?.stanzaId) return null;
  return {
    key: {
      remoteJid: m.key.remoteJid, // group id - REAL
      fromMe: false, // quoted msg no be from bot
      id: ctx.stanzaId, // REAL stanzaId from WhatsApp
      participant: ctx.participant // REAL sender
    },
    participant: ctx.participant,
    ctx
  };
}

module.exports = [
  // ===== 1. REAL DELETE FOR EVERYONE - Reply + .gcstatus delete =====
  {
    command: ['gcstatus', 'gcstatusdelete', 'deletegcstatus', 'delgcstatus', 'dgcstatus'],
    groupOnly: true,
    adminOnly: true,
    run: async ({ sock, m, from, reply, args, isBotAdmin }) => {
      if (isBotAdmin === false) return reply('❌ Bot must be Group Admin to delete for everyone');
      if ((args[0] || '').toLowerCase() !== 'delete' && (args[0] || '').toLowerCase() !== 'del') {
        return reply('❌ Use: Reply to the status post + `.gcstatus delete`');
      }
      const q = getQuoted(m);
      if (!q) return reply('❌ Reply to the message first.\nExample: Reply to status post > type `.gcstatus delete`');

      try {
        // REAL Baileys delete for everyone
        await sock.sendMessage(from, { delete: q.key });
        return reply('✅ Deleted for everyone');
      } catch (e) {
        console.log('[GCSTATUS DELETE]', e.message);
        return reply(`❌ Delete failed: ${e.message}\nCheck: Bot admin? Message < 2 days?`);
      }
    }
  },

  // ===== 2. REAL WARN - Delete + Warn - Reply + .gwarn =====
  {
    command: ['gwarn', 'warn'],
    groupOnly: true,
    adminOnly: true,
    run: async ({ sock, m, from, reply, isBotAdmin }) => {
      if (isBotAdmin === false) return reply('❌ Bot must be Group Admin');
      const q = getQuoted(m);
      if (!q?.participant) return reply('❌ Reply to him post + `.gwarn`');
      const targetJid = q.participant;
      const targetNum = targetJid.split('@')[0].split(':')[0];

      const db = loadDB();
      db[from] = db[from] || {};
      db[from][targetNum] = (db[from][targetNum] || 0) + 1;
      const count = db[from][targetNum];
      saveDB(db);

      try {
        // Delete first - must wait, if delete fail we still warn
        try { await sock.sendMessage(from, { delete: q.key }); } catch (e) { console.log('[GWARN DELETE]', e.message); }

        if (count >= 2) {
          db[from][targetNum] = 0;
          saveDB(db);
          await sock.groupParticipantsUpdate(from, [targetJid], 'remove');
          return sock.sendMessage(from, { text: `🚨 WARN 2/2 - @${targetNum} KICKED. Post deleted.`, mentions: [targetJid] });
        }
        return sock.sendMessage(from, { text: `⚠️ WARN ${count}/2 @${targetNum} - Post deleted. 1 more = Kick.`, mentions: [targetJid] });
      } catch (e) {
        console.log('[GWARN]', e.message);
        return reply(`❌ Warn failed: ${e.message}\nBot admin?`);
      }
    }
  },

  // ===== 3. UNWARN =====
  {
    command: ['gunwarn', 'gunwarn', 'unwarn'],
    groupOnly: true,
    adminOnly: true,
    run: async ({ m, from, reply, args }) => {
      const q = getQuoted(m);
      const ctx = m.message?.extendedTextMessage?.contextInfo;
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

  // ===== 4. WARNINGS =====
  {
    command: ['gwarnings', 'gwarns', 'warnings'],
    groupOnly: true,
    adminOnly: true,
    run: async ({ from, reply }) => {
      const db = loadDB();
      const all = db[from] || {};
      const list = Object.entries(all).filter(([_, c]) => c > 0);
      if (!list.length) return reply('✅ No warnings for this group');
      return reply('⚠️ WARNINGS\n' + list.map(([n, c]) => `@${n} - ${c}/2`).join('\n'));
    }
  }
];
