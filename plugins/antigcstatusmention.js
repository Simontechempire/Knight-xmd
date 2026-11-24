// KNIGHT XMD - Anti GC Status Mention
// File: antigcstatusmention.js
// Auto: If user mention group in him post / status -> Delete from everyone instantly + Warn
// 2 warns = Delete + Kick instantly
// No demo, no fake

module.exports = [
  {
    command: [],
    all: true, // Auto - no command needed
    run: async ({ sock, m, from, sender, sessionDB }) => {
      try {
        if (!m.message) return;
        if (m.key?.fromMe) return;

        // ===== 1. GET MESSAGE + MENTIONS =====
        const msg = m.message;
        const textMsg = msg.conversation || msg.extendedTextMessage?.text || msg.imageMessage?.caption || msg.videoMessage?.caption || '';
        const ctx = msg.extendedTextMessage?.contextInfo || msg.imageMessage?.contextInfo || msg.videoMessage?.contextInfo || msg.stickerMessage?.contextInfo || {};
        const mentioned = ctx.mentionedJid || [];

        // ===== 2. CHECK IF USER MENTION GROUP =====
        // WhatsApp group mention = mentionedJid contain group JID (ends with @g.us)
        // OR text contain @group / group link / status mention
        const isGroupChat = from.endsWith('@g.us');
        const mentionedGroup = mentioned.find(j => j.endsWith('@g.us'));
        const mentionedGroupId = mentionedGroup || null;

        // Case A: In group, user mention group itself
        let isGcStatusMention = false;
        let targetGroupId = null;

        if (isGroupChat && mentionedGroup) {
          isGcStatusMention = true;
          targetGroupId = from;
        }

        // Case B: Status - from = status@broadcast, and mentionedJid = group
        // status@broadcast message wey mention group
        if (from === 'status@broadcast' && mentionedGroup) {
          isGcStatusMention = true;
          targetGroupId = mentionedGroup;
        }

        // Case C: Text contain group mention trigger - "mention group" / "@group" / status tag
        const lower = textMsg.toLowerCase();
        if (isGroupChat && (lower.includes('@group') || lower.includes('mention group') || lower.includes('@gcstatus') || lower.includes('@all'))) {
          // Only if e really tag group - avoid false for normal @all
          if (mentioned.length > 0) {
            isGcStatusMention = true;
            targetGroupId = from;
          }
        }

        if (!isGcStatusMention) return;

        // ===== 3. TARGET GROUP TO KICK FROM =====
        // If na status, kick from the mentioned group. If na group post, kick from that group
        const kickGroup = targetGroupId || from;
        const isKickGroup = kickGroup.endsWith('@g.us');
        if (!isKickGroup) return;

        const targetNum = sender.split('@')[0].split(':')[0];

        // ===== 4. DELETE FROM EVERYONE INSTANTLY - SAME AS GCSTATUS =====
        // Only if na group message - Status no fit delete (WhatsApp no allow delete another person status)
        // But group post fit delete instantly
        if (isGroupChat) {
          const deleteKey = {
            remoteJid: from,
            fromMe: false,
            id: m.key.id,
            participant: sender,
          };
          try {
            await sock.sendMessage(from, { delete: deleteKey });
          } catch (e) {
            console.log('[ANTIGCSTATUSMENTION DELETE]', e.message);
          }
        }

        // ===== 5. WARN COUNT - Same DB as gcstatusdelete.js =====
        const db = sessionDB || global.db;
        db.warnings ??= {};
        db.warnings[kickGroup] ??= {};
        const count = (db.warnings[kickGroup][targetNum] = (db.warnings[kickGroup][targetNum] || 0) + 1);

        // ===== 6. 2 WARNS = KICK INSTANTLY =====
        if (count >= 2) {
          db.warnings[kickGroup][targetNum] = 0;
          await Promise.all([
            sock.sendMessage(kickGroup, { text: `🚨 *ANTI-GCSTATUS-MENTION 2/2 - KICKED*\n\n👤 User: @${targetNum}\n🗑️ Mention group in status post deleted from everyone\n🦵 Action: Kicked instantly`, mentions: [sender] }),
            sock.groupParticipantsUpdate(kickGroup, [sender], 'remove')
          ]);
          return;
        }

        // ===== 7. WARN 1/2 =====
        await sock.sendMessage(kickGroup, {
          text: `⚠️ *ANTI-GCSTATUS-MENTION WARN ${count}/2*\n\n👤 User: @${targetNum}\n🗑️ Mention group in status post deleted from everyone\n⚠️ No mention group for your status again. 1 more = Kick`,
          mentions: [sender]
        });

      } catch (e) {
        console.log('[ANTIGCSTATUSMENTION]', e.message);
      }
    }
  }
];
