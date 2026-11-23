// KNIGHT XMD - GEPP & GCPP - Profile Picture
// By Faceless Tech
module.exports = [
  {
    command: ['gepp', 'getpp', 'pp'],
    run: async ({ sock, from, m, text, reply }) => {
      try {
        const ctx = m.message.extendedTextMessage?.contextInfo;
        const quotedParticipant = ctx?.participant;
        const mentioned = ctx?.mentionedJid?.[0];

        let target = null;

        // 1. Reply to user - MAIN WAY
        if (quotedParticipant) {
          target = quotedParticipant;
        }
        // 2. Mention
        else if (mentioned) {
          target = mentioned;
        }
        // 3. Number
        else if (text) {
          const num = text.replace(/[^0-9]/g, '');
          if (num.length < 7) return reply('Usage: Reply to user with .gepp\nOr .gepp @user\nOr .gepp 234...');
          target = num + '@s.whatsapp.net';
        }
        // 4. No reply - use sender
        else {
          target = m.key.participant || from;
          if (!from.endsWith('@g.us')) target = from;
        }

        const num = String(target || '').split('@')[0].split(':')[0].replace(/[^0-9]/g, '');

        await reply('📸 Fetching PP...');

        let pp = null;
        try { pp = await sock.profilePictureUrl(target, 'image'); } catch {}

        if (!pp) return reply(`❌ @${num} no get profile picture`);

        await sock.sendMessage(from, {
          image: { url: pp },
          caption: `📸 *PROFILE PICTURE*\n\n👤 User: @${num}\n\nBy Knight XMD ⚔️`,
          mentions: [target]
        }, { quoted: m });

      } catch (e) { await reply('❌ Failed: ' + e.message); }
    }
  },
  {
    command: ['gcpp', 'grouppp', 'gpp'],
    run: async ({ sock, from, m, isGroup, reply }) => {
      if (!isGroup) return reply('❌ Only works in group.\nUse .gepp for user PP.');
      try {
        await reply('📸 Fetching Group PP...');

        let pp = null;
        try { pp = await sock.profilePictureUrl(from, 'image'); } catch {}

        if (!pp) return reply('❌ This group no get PP');

        let groupName = 'Group';
        try {
          const meta = await sock.groupMetadata(from);
          groupName = meta.subject || 'Group';
        } catch {}

        await sock.sendMessage(from, {
          image: { url: pp },
          caption: `📸 *GROUP PICTURE*\n\n👥 Group: ${groupName}\n\nBy Knight XMD ⚔️`
        }, { quoted: m });

      } catch (e) { await reply('❌ Failed: ' + e.message); }
    }
  },
];
