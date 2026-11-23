// KNIGHT XMD - Status Saver - ❤️ Reply to Status Save to DM
// By Faceless Tech
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

function attachEngine(sock) {
  if (!sock || !sock.ev) return
  if (sock.__statusSaverLoaded) return
  sock.__statusSaverLoaded = true

  // Auto Save: If you reply ❤️ to someone status, e go save am to your DM
  sock.ev.on('messages.upsert', async ({ messages }) => {
    try {
      const m = messages[0]
      if (!m || !m.message) return
      if (m.key.remoteJid === 'status@broadcast') return

      const text = m.message.conversation || m.message.extendedTextMessage?.text || ''
      const ctx = m.message.extendedTextMessage?.contextInfo
      const quoted = ctx?.quotedMessage

      // Only if you reply ❤️ to a status
      if (text.trim() !== '❤️') return
      if (!quoted) return
      if (!quoted.imageMessage && !quoted.videoMessage) return

      const sender = m.key.participant || m.key.remoteJid
      const poster = ctx?.participant || 'Unknown'
      const posterNum = String(poster).split('@')[0].split(':')[0]

      const type = quoted.imageMessage ? 'image' : 'video'
      const media = quoted[type + 'Message']

      const stream = await downloadContentFromMessage(media, type)
      let buf = Buffer.from([])
      for await (const c of stream) buf = Buffer.concat([buf, c])
      if (!buf.length) return

      // Send to YOUR DM
      const dm = sender
      if (type === 'image') {
        await sock.sendMessage(dm, { image: buf, caption: `❤️ *STATUS SAVED*\n\n👤 From: @${posterNum}\n\nBy Knight XMD ⚔️`, mentions: [poster] })
      } else {
        await sock.sendMessage(dm, { video: buf, caption: `❤️ *STATUS SAVED*\n\n👤 From: @${posterNum}\n\nBy Knight XMD ⚔️`, mentions: [poster] })
      }
    } catch (e) { console.log('[STATUS SAVER]', e.message) }
  })
  console.log('[STATUS SAVER] ❤️ Reply to Status Save to DM loaded ✅')
}

const plugin = [
  {
    // .ss - Reply to status with .ss to save to DM
    command: ['ss', 'savestatus', 'save', 'sv'],
    run: async ({ sock, from, m, reply }) => {
      try {
        const ctx = m.message.extendedTextMessage?.contextInfo
        const quoted = ctx?.quotedMessage
        const poster = ctx?.participant

        if (!quoted || (!quoted.imageMessage && !quoted.videoMessage)) {
          return reply('❌ Reply to a status with .ss\n\nExample:\n1. Open status\n2. Reply with .ss\nE go send am to your DM')
        }

        await reply('❤️ Saving status to your DM...')

        const type = quoted.imageMessage ? 'image' : 'video'
        const media = quoted[type + 'Message']

        const stream = await downloadContentFromMessage(media, type)
        let buf = Buffer.from([])
        for await (const c of stream) buf = Buffer.concat([buf, c])
        if (!buf.length) return reply('❌ Failed - status don expire')

        const sender = m.key.participant || from
        const posterNum = poster ? String(poster).split('@')[0].split(':')[0] : 'Unknown'

        // Save to DM - sender private chat
        const dm = sender.endsWith('@s.whatsapp.net') ? sender : sender

        if (type === 'image') {
          await sock.sendMessage(dm, { image: buf, caption: `❤️ *STATUS SAVED*\n\n👤 From: @${posterNum}\n\nBy Knight XMD ⚔️`, mentions: poster ? [poster] : [] })
        } else {
          await sock.sendMessage(dm, { video: buf, caption: `❤️ *STATUS SAVED*\n\n👤 From: @${posterNum}\n\nBy Knight XMD ⚔️`, mentions: poster ? [poster] : [] })
        }

        await reply('✅ Saved! Check your DM ❤️')

      } catch (e) { await reply('❌ Failed: ' + e.message) }
    }
  },
];

plugin.attachEngine = attachEngine
plugin.__call = attachEngine
module.exports = plugin
