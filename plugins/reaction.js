// KNIGHT XMD - Channel Spam Reaction - FIXED - Use Post Link
// By Faceless Tech
module.exports = [
  {
    command: ['creact', 'channelreact', 'spamreact', 'reactchannel'],
    run: async ({ sock, from, m, text, reply }) => {
      try {
        // USAGE:
        // .creact https://whatsapp.com/channel/0029VaXXXX/123 ❤️ 50
        // .creact 120207xxx@newsletter 123 ❤️ 50
        if (!text) return reply(
          'Usage:\n.creact <post link> <emoji> <count>\n\nExample:\n.creact https://whatsapp.com/channel/0029VaXXXX/123 ❤️ 50\n\nOr:\n.creact 120207xxx@newsletter 123 ❤️ 50'
        );

        const args = text.trim().split(/\s+/);
        let link = args[0];
        let emoji = '❤️';
        let count = 20;
        let msgId = null;
        let channelJid = null;

        // ===== 1. PARSE POST LINK =====
        // https://whatsapp.com/channel/0029VaXXXX/123
        // https://whatsapp.com/channel/0029VaXXXX
        if (link.includes('whatsapp.com/channel/')) {
          const parts = link.split('/channel/')[1].split('/').filter(Boolean);
          const inviteCode = parts[0].split('?')[0]; // 0029VaXXXX
          msgId = parts[1] ? parts[1].split('?')[0] : null; // 123

          // emoji / count fit shift
          // .creact link ❤️ 50 -> args[1]=emoji args[2]=count
          emoji = args[1] || '❤️';
          count = parseInt(args[2]) || 20;

          await reply('🔍 Resolving channel link...');

          // Convert invite code -> real newsletter JID
          try {
            let meta = null;
            if (sock.newsletterMetadata) {
              meta = await sock.newsletterMetadata('invite', inviteCode);
            }
            // Baileys returns { id, ... } or { metadata }
            channelJid = meta?.id || meta?.metadata?.id || meta?.jid || null;
            if (channelJid && !channelJid.includes('@newsletter')) channelJid += '@newsletter';
          } catch (e) {
            return reply(`❌ Cannot resolve channel link\n\nMake sure link correct and bot don follow channel before.\nError: ${e.message}`);
          }

          if (!channelJid) return reply('❌ Cannot get channel JID from link. Try use JID format:\n.creact 120207xxx@newsletter 123 ❤️ 50');
          if (!msgId) return reply('❌ Post link must include post ID\n\nExample:\nhttps://whatsapp.com/channel/0029VaXXXX/123\nMake sure you copy the full post link, not just channel link.');

        } else {
          // ===== 2. JID FORMAT =====
          // .creact 120207xxx@newsletter 123 ❤️ 50
          channelJid = args[0];
          msgId = args[1];
          emoji = args[2] || '❤️';
          count = parseInt(args[3]) || 20;
          if (channelJid && !channelJid.includes('@newsletter') && /^\d+$/.test(channelJid)) channelJid += '@newsletter';
        }

        if (!channelJid || !channelJid.includes('@newsletter')) return reply('❌ Channel invalid. Send post link like:\nhttps://whatsapp.com/channel/0029VaXXXX/123');
        if (!msgId) return reply('❌ Message ID missing. Copy full post link with /123 at end.');

        if (count > 50) count = 50;
        if (count < 1) count = 1;

        // ===== 3. AUTO FOLLOW CHANNEL - FIX FOR "requires newsletter" =====
        try {
          if (sock.newsletterFollow) await sock.newsletterFollow(channelJid);
        } catch {}

        await reply(`❤️ Spamming reaction...\n\n📢 Channel: ${channelJid}\n🆔 Post: ${msgId}\n${emoji} Emoji: ${emoji}\n🔢 Count: ${count}`);

        let done = 0, failed = 0, lastError = '';

        for (let i = 0; i < count; i++) {
          try {
            // CORRECT Baileys newsletter react
            // newsletterReactMessage(jid, serverMsgId, emoji)
            if (sock.newsletterReactMessage) {
              await sock.newsletterReactMessage(channelJid, msgId, emoji);
            } else {
              // Fallback raw
              await sock.sendMessage(channelJid, {
                react: { text: emoji, key: { remoteJid: channelJid, id: msgId, fromMe: false } }
              });
            }
            done++;
            await new Promise(r => setTimeout(r, 800));
          } catch (e) {
            failed++;
            lastError = e.message;
            if (i === 0) return reply(
              `❌ Failed: ${e.message}\n\nFix:\n1. Bot must FOLLOW that channel\n2. Use full post link with /123\n3. Update Baileys to latest\n\nTry: .creact ${link} ${emoji} 1 first`
            );
            await new Promise(r => setTimeout(r, 1500));
          }
        }

        await reply(`✅ *CHANNEL REACTION DONE*\n\n${emoji} Emoji: ${emoji}\n✅ Sent: ${done}\n❌ Failed: ${failed}\n${failed ? 'Error: ' + lastError : ''}\n\nBy Knight XMD ⚔️`);
      } catch (e) { await reply('❌ Failed: ' + e.message); }
    }
  },
];
