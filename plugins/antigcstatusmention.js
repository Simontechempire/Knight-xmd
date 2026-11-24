// KNIGHT XMD - REAL Anti GC Status Mention - Auto
// File: plugins/antigcstatusmention.js
// REAL: Only group message wey mention group fit delete. Status tab bot no fit see.
// .antigcstatus on / off

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../database/antigcstatus.json');
const WARN_PATH = path.join(__dirname, '../database/warnings.json');

function load(p) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return {}; } }
function save(p, d) {
  if (!fs.existsSync(path.dirname(p))) fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(d, null, 2));
}

module.exports = [
  // ===== COMMAND: .antigcstatus on / off =====
  {
    command: ['antigcstatus', 'antigcstatusmention'],
    groupOnly: true,
    adminOnly: true,
    run: async ({ from, reply, args, isGroup }) => {
      if (!isGroup) return reply('❌ Only in groups');
      const input = (args[0] || '').toLowerCase();
      const db = load(DB_PATH);
      if (!input) {
        const on = db[from]?.on !== false; // default ON
        return reply(`🛡️ Anti GC Status Mention: ${on ? 'ON ✅' : 'OFF ❌'}\n\n.antigcstatus on - Delete + Warn\n.antigcstatus off - Allow`);
      }
      if (input === 'on' || input === 'off') {
        db[from] = { on: input === 'on' };
        save(DB_PATH, db);
        return reply(`🛡️ Anti GC Status Mention ${input === 'on' ? 'ON ✅' : 'OFF ❌'} for this group`);
      }
      return reply('Usage: .antigcstatus on / off');
    }
  },

  // ===== AUTO: Delete + Warn + Kick =====
  {
    all: true,
    groupOnly: true,
    run: async ({ sock, m, from, sender, isBotAdmin }) => {
      try {
        if (!m?.message) return;
        if (m.key?.fromMe) return;
        if (!from?.endsWith('@g.us')) return; // REAL: Only group messages bot fit see

        // Check if enabled - default ON
        const cfg = load(DB_PATH);
        if (cfg[from]?.on === false) return;

        // Bot must be admin to delete/kick, else no fit do anything
        if (isBotAdmin === false) return;

        const msg = m.message;
        const ctx = msg.extendedTextMessage?.contextInfo
          || msg.imageMessage?.contextInfo
          || msg.videoMessage?.contextInfo
          || msg.stickerMessage?.contextInfo
          || msg.documentMessage?.contextInfo
          || {};

        const mentioned = ctx.mentionedJid || [];

        // ===== REAL DETECTION =====
        // WhatsApp when you mention group in post/status, the message wey enter group get:
        // mentionedJid contains the group JID itself (e.g 123@g.us)
        // OR messageContextInfo contains status mention
        // We check BOTH, no guessing with "@group" text
        const mentionedThisGroup = mentioned.some(j => j === from);
        const hasStatusMention = !!msg.messageContextInfo?.statusMention
          || !!ctx?.statusMention
          || JSON.stringify(msg).includes('statusMention');

        // If user no mention this group, leave am - no false delete
        if (!mentionedThisGroup && !hasStatusMention) return;

        // ===== 1. REAL DELETE FOR EVERYONE - Use REAL m.key from WhatsApp =====
        const deleteKey = {
          remoteJid: from,
          fromMe: false,
          id: m.key.id, // REAL id from WhatsApp, no be guessed stanzaId
          participant: sender // REAL sender
        };
        try {
          await sock.sendMessage(from, { delete: deleteKey });
        } catch (e) {
          console.log('[ANTIGCSTATUS DELETE]', e.message);
          // If delete fail (old msg / no admin), still warn, no hide error
        }

        // ===== 2. REAL WARN COUNT - File DB, no be global.db =====
        const warnDB = load(WARN_PATH);
        warnDB[from] = warnDB[from] || {};
        const targetNum = sender.split('@')[0].split(':')[0];
        warnDB[from][targetNum] = (warnDB[from][targetNum] || 0) + 1;
        const count = warnDB[from][targetNum];
        save(WARN_PATH, warnDB);

        // ===== 3. 2 WARNS = KICK =====
        if (count >= 2) {
          warnDB[from][targetNum] = 0;
          save(WARN_PATH, warnDB);
          try {
            await sock.groupParticipantsUpdate(from, [sender], 'remove');
          } catch (e) { console.log('[ANTIGCSTATUS KICK]', e.message); return; }
          await sock.sendMessage(from, {
            text: `🚨 *ANTI-GCSTATUS 2/2 - KICKED*\n\n👤 @${targetNum}\n🗑️ Mention group in status post deleted\n🦵 Kicked`,
            mentions: [sender]
          });
          return;
        }

        // ===== 4. WARN 1/2 =====
        await sock.sendMessage(from, {
          text: `⚠️ *ANTI-GCSTATUS WARN ${count}/2*\n\n👤 @${targetNum}\n🗑️ Mention group in status post deleted for everyone\n⚠️ No mention group for status again. 1 more = Kick`,
          mentions: [sender]
        });

      } catch (e) {
        console.log('[ANTIGCSTATUS]', e.message);
      }
    }
  }
];
