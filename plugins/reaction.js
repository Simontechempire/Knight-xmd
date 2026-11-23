// KNIGHT XMD - Channel Spam Reaction
// By Faceless Tech
module.exports = [
  {
    command: ['creact', 'channelreact', 'spamreact', 'reactchannel'],
    run: async ({ sock, from, m, text, reply }) => {
      try {
        // Usage: .creact <channel_id> <message_id> <emoji> <count>
        // Example: .creact 120207xxx@newsletter 123 ❤️ 50
        // Example: .creact <reply to channel post> ❤️ 50
        if (!text && !m.message.extendedTextMessage?.contextInfo?.quotedMessage) {
          return reply('Usage: .creact <channel_id> <msg_id> <emoji> <count>\n\nExample:\n.creact 120207xxx@newsletter 123 ❤️ 50\n\nOr reply to channel post with:\n.creact ❤️ 50')
        }

        const ctx = m.message.extendedTextMessage?.contextInfo
        const quoted = ctx?.quotedMessage
        const args = (text || '').trim().split(/\s+/)

        let channelId = null
        let msgId = null
        let emoji = '❤️'
        let count = 20

        // 1. Reply to channel post - MAIN WAY
        if (quoted) {
          channelId = ctx?.participant || ctx?.remoteJid || from
          // Try get channel from quoted context
          if (ctx?.quotedMessage?.newsletterAdminInviteMessage) channelId = from
          msgId = ctx?.stanzaId
          emoji = args[0] || '❤️'
          count = parseInt(args[1]) || 20
          // If user send channel id in text too
          if (args[0]?.includes('@newsletter')) {
            channelId = args[0]
            msgId = args[1]
            emoji = args[2] || '❤️'
            count = parseInt(args[3]) || 20
          }
        } else {
          // 2. Direct: .creact channel_id msg_id emoji count
          channelId = args[0]
          msgId = args[1]
          emoji = args[2] || '❤️'
          count = parseInt(args[3]) || 20
        }

        // Clean channel link -> id
        if (channelId && channelId.includes('whatsapp.com/channel/')) {
          channelId = channelId.split('/channel/')[1].split('/')[0].split('?')[0]
        }
        if (channelId && !channelId.includes('@newsletter') && /^\d+$/.test(channelId)) {
          channelId = channelId + '@newsletter'
        }

        if (!channelId || !channelId.includes('@newsletter')) return reply('❌ Channel ID invalid\n\nGet am like this:\n120207xxx@newsletter\n\nUsage: .creact 120207xxx@newsletter 123 ❤️ 50')
        if (!msgId) return reply('❌ Message ID needed\n\nUsage: .creact <channel_id> <msg_id> ❤️ 50')

        if (count > 100) count = 100
        if (count < 1) count = 1

        await reply(`❤️ Spamming reaction...\n\nChannel: ${channelId}\nEmoji: ${emoji}\nCount: ${count}\n\nWait small...`)

        let done = 0
        let failed = 0

        for (let i = 0; i < count; i++) {
          try {
            // New Baileys method for channel reaction
            if (sock.newsletterReactMessage) {
              await sock.newsletterReactMessage(channelId, msgId, emoji)
            } else {
              // Fallback - old method
              await sock.sendMessage(channelId, { react: { text: emoji, key: { remoteJid: channelId, id: msgId, fromMe: false } } })
            }
            done++
            await new Promise(r => setTimeout(r, 500))
          } catch (e) {
            failed++
            // If first fail, stop - maybe not admin / not follow channel
            if (i === 0) return reply(`❌ Failed: ${e.message}\n\nMake sure bot don FOLLOW that channel and e get message ID correct.`)
            await new Promise(r => setTimeout(r, 1000))
          }
        }

        await reply(`✅ *CHANNEL REACTION DONE*\n\n❤️ Emoji: ${emoji}\n✅ Sent: ${done}\n❌ Failed: ${failed}\n\nBy Knight XMD ⚔️`)

      } catch (e) { await reply('❌ Failed: ' + e.message) }
    }
  },
  {
    command: ['creactstop', 'stopreact'],
    run: async ({ reply }) => {
      return reply('✅ Reaction spam stopped.\nSend .creact again to start new one.')
    }
  },
];
