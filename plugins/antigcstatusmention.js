// KNIGHT XMD - REAL Anti GC Status Mention - Auto
// File: plugins/antigcstatusmention.js
// REAL LIMIT: Bot fit delete only the group message wey WhatsApp push because of status mention.
// E NO fit delete Status tab. WhatsApp no allow am.

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../database/antigcstatus.json');
const WARN_PATH = path.join(__dirname, '../database/warnings.json');

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
  return msg;
}

// REAL admin check - no isBotAdmin guess
async function isBotAdminReal(sock, from) {
  try {
    const meta = await sock.groupMetadata(from);
    const meId = sock.user?.id || '';
    const meNum = meId.split(':')[0].split('@')[0];
    const entry = meta.participants.find(p => {
      const n = (p.id || '').split(':')[0].split('@')[0];
      return n === meNum || p.id === meId;
    });
    return entry?.admin === 'admin' || entry?.admin === 'superadmin';
  } catch (e) {
    console.log('[ANTIGCSTATUS ADMIN CHECK]', e.message);
    return null;
  }
}

module.exports = [
  // ===== .antigcstatus on / off =====
  {
    command: ['antigcstatus', 'antigcstatusmention'],
    run: async ({ from, reply, args }) => {
      if (!from?.endsWith('@g.us')) return reply('❌ Only in groups');
      const input = (args[0] || '').toLowerCase();
      const db = load(DB_PATH);
      if (!input) {
        const on = db[from]?.on !== false;
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

  // ===== AUTO - MUST run for every message =====
  {
    all: true,
    run: async ({ sock, m, from, sender }) => {
      try {
        if (!m?.message) return;
        if (m.key?.fromMe) return;
        if (!from?.endsWith('@g.us')) return;

        const cfg = load(DB_PATH);
        if (cfg[from]?.on === false) return;

        // REAL sender - use m.key.participant, NOT sender param wey fit be LID
        const realSender = m.key.participant || sender;
        if (!realSender) return;

        const raw = unwrap(m.message);
        if (!raw) return;

        // Collect contextInfo from ALL message types - no guess
        const ctx = raw.extendedTextMessage?.contextInfo
          || raw.imageMessage?.contextInfo
          || raw.videoMessage?.contextInfo
          || raw.stickerMessage?.contextInfo
          || raw.documentMessage?.contextInfo
          || raw.audioMessage?.contextInfo
          || raw.contactMessage?.contextInfo
          || raw.locationMessage?.contextInfo
          || raw.pollCreationMessage?.contextInfo
          || {};

        const mentioned = ctx.mentionedJid || [];

        // ===== REAL DETECTION - 2 real ways WhatsApp send am =====
        // 1. mentionedJid contains THIS group JID (e.g 120...@g.us) - this na group mention
        const mentionedThisGroup = mentioned.some(j => j === from);

        // 2. Status mention: WhatsApp set groupMentions in messageContextInfo
        // Real structure: m.messageContextInfo.groupMentions = [{groupJid, groupSubject}]
        // OR m.message.messageContextInfo.groupMentions
        const groupMentions = m.messageContextInfo?.groupMentions
          || raw.messageContextInfo?.groupMentions
          || m.message?.messageContextInfo?.groupMentions
          || [];
        const hasGroupMentionInStatus = Array.isArray(groupMentions) && groupMentions.some(g => (g.groupJid || g.jid) === from);

        // 3. Quoted status mention: contextInfo.quotedMessage fit get group mention
        const hasQuotedGroupMention = false; // no guess, no JSON.stringify

        if (!mentionedThisGroup && !hasGroupMentionInStatus) return;

        console.log(`[ANTIGCSTATUS] Detected group mention from ${realSender} in ${from} | mentionedGroup=${mentionedThisGroup} groupMentions=${hasGroupMentionInStatus}`);

        // Bot must be admin - check real
        const admin = await isBotAdminReal(sock, from);
        if (admin === false) {
          console.log('[ANTIGCSTATUS] Bot no be admin, cannot delete');
          return;
        }

        // ===== 1. DELETE - Use m.key DIRECTLY, no rebuild =====
        // m.key already get: remoteJid, fromMe, id, participant - exactly wetin WhatsApp need
        try {
          await sock.sendMessage(from, { delete: m.key });
          console.log(`[ANTIGCSTATUS] Deleted ${m.key.id}`);
        } catch (e) {
          console.log('[ANTIGCSTATUS DELETE FAIL]', e.message);
          // If delete fail, still warn - no hide
        }

        // ===== 2. WARN =====
        const warnDB = load(WARN_PATH);
        warnDB[from] = warnDB[from] || {};
        const targetNum = realSender.split('@')[0].split(':')[0];
        warnDB[from][targetNum] = (warnDB[from][targetNum] || 0) + 1;
        const count = warnDB[from][targetNum];
        save(WARN_PATH, warnDB);

        if (count >= 2) {
          warnDB[from][targetNum] = 0;
          save(WARN_PATH, warnDB);
          try { await sock.groupParticipantsUpdate(from, [realSender], 'remove'); } catch (e) { console.log('[ANTIGCSTATUS KICK FAIL]', e.message); return; }
          await sock.sendMessage(from, {
            text: `🚨 *ANTI-GCSTATUS 2/2 - KICKED*\n\n👤 @${targetNum}\n🗑️ Mention group in status post deleted\n🦵 Kicked`,
            mentions: [realSender]
          });
          return;
        }

        await sock.sendMessage(from, {
          text: `⚠️ *ANTI-GCSTATUS WARN ${count}/2*\n\n👤 @${targetNum}\n🗑️ Mention group in status post deleted for everyone\n⚠️ No mention group for status again. 1 more = Kick`,
          mentions: [realSender]
        });

      } catch (e) {
        console.log('[ANTIGCSTATUS]', e.message);
      }
    }
  }
];
