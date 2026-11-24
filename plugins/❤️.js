// ❤️.js - KNIGHT XMD - FIXED - React ❤️ to ANY status = Save to YOUR DM
// By Faceless Tech
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

// Cache status by ID: { id -> { buffer, type, poster, caption } }
const statusCache = new Map();

async function downloadMedia(media, type) {
  const stream = await downloadContentFromMessage(media, type);
  let buf = Buffer.from([]);
  for await (const c of stream) buf = Buffer.concat([buf, c]);
  return buf;
}

function attachEngine(sock) {
  if (!sock || !sock.ev) return;
  if (sock.__heartSaverFixed) return;
  sock.__heartSaverFixed = true;

  sock.ev.on('messages.upsert', async ({ messages }) => {
    try {
      const m = messages[0];
      if (!m || !m.message) return;

      // ===== 1. CACHE EVERY STATUS THAT ENTERS =====
      if (m.key.remoteJid === 'status@broadcast') {
        const msg = m.message;
        const type = msg.imageMessage ? 'image' : msg.videoMessage ? 'video' : null;
        if (!type) return;
        try {
          const buf = await downloadMedia(msg[type + 'Message'], type);
          if (!buf.length) return;
          const poster = m.key.participant || m.key.remoteJid;
          statusCache.set(m.key.id, { buf, type, poster, caption: msg[type + 'Message'].caption || '' });
          // Keep only last 200 to avoid memory wahala
          if (statusCache.size > 200) statusCache.delete(statusCache.keys().next().value);
        } catch {}
        return;
      }

      // ===== 2. CHECK FOR ❤️ REACTION =====
      const react = m.message.reactionMessage;
      const ext = m.message.extendedTextMessage;
      const convo = m.message.conversation || '';

      let isHeart = false;
      let reactedId = null;

      // A. Real WhatsApp reaction - swipe ❤️ on status
      if (react && react.text === '❤️') {
        isHeart = true;
        reactedId = react.key?.id;
      }
      // B. Reply with ❤️ text to status (old way)
      else if (convo.trim() === '❤️' || ext?.text?.trim() === '❤️') {
        isHeart = true;
        reactedId = ext?.contextInfo?.stanzaId;
        // If reply carries media directly, handle am below
        if (ext?.contextInfo?.quotedMessage?.imageMessage || ext?.contextInfo?.quotedMessage?.videoMessage) {
          const quoted = ext.contextInfo.quotedMessage;
          const poster = ext.contextInfo.participant;
          const reactor = m.key.participant || m.key.remoteJid;
          const dm = String(reactor).split(':')[0];
          const type = quoted.imageMessage ? 'image' : 'video';
          const buf = await downloadMedia(quoted[type + 'Message'], type);
          if (buf.length) {
            const posterNum = String(poster).split('@')[0].split(':')[0];
            const cap = `❤️ *STATUS SAVED*\n\n👤 From: @${posterNum}\n\nBy Knight XMD ⚔️`;
            if (type === 'image') await sock.sendMessage(dm, { image: buf, caption: cap, mentions: [poster] });
            else await sock.sendMessage(dm, { video: buf, caption: cap, mentions: [poster] });
          }
          return;
        }
      }

      if (!isHeart) return;
      if (!reactedId) return;

      // Only react to STATUS, not normal message
      const cached = statusCache.get(reactedId);
      if (!cached) {
        // Status don expire / bot no see am / bot restart
        // No fit download am again because reaction no carry media
        return;
      }

      // ===== 3. SEND TO REACTOR OWN DM - NOT POSTER, NOT GROUP =====
      // In DM: remoteJid = reactor
      // In Group: participant = reactor
      // In Status reply: remoteJid = status@broadcast, participant = reactor
      let reactor = m.key.participant || m.key.remoteJid;
      // If reaction key has participant (status reaction), use am
      if (react?.key?.participant) reactor = react.key.participant;
      if (react?.key?.remoteJid && react.key.remoteJid !== 'status@broadcast') reactor = react.key.remoteJid;

      // Clean LID: 123:456@lid -> 123@s.whatsapp.net style
      let dm = String(reactor).split(':')[0];
      if (!dm.includes('@')) dm += '@s.whatsapp.net';
      // Never send to status@broadcast or group
      if (dm.includes('status@broadcast') || dm.includes('@g.us')) return;

      const posterNum = String(cached.poster).split('@')[0].split(':')[0];
      const cap = `❤️ *STATUS SAVED*\n\n👤 From: @${posterNum}\n\nBy Knight XMD ⚔️`;

      if (cached.type === 'image') {
        await sock.sendMessage(dm, { image: cached.buf, caption: cap, mentions: [cached.poster] });
      } else {
        await sock.sendMessage(dm, { video: cached.buf, caption: cap, mentions: [cached.poster] });
      }

    } catch (e) { console.log('[❤️ SAVER]', e.message); }
  });
  console.log('[❤️ SAVER] FIXED loaded ✅');
}

const plugin = [
  {
    // .ss still work: reply to status with .ss
    command: ['ss', 'savestatus', 'save', 'sv'],
    run: async ({ sock, from, m, reply }) => {
      try {
        const ctx = m.message.extendedTextMessage?.contextInfo;
        const quoted = ctx?.quotedMessage;
        const poster = ctx?.participant;
        if (!quoted || (!quoted.imageMessage && !quoted.videoMessage)) {
          return reply('❌ Reply to a status with .ss');
        }
        await reply('❤️ Saving to your DM...');
        const reactor = m.key.participant || from;
        let dm = String(reactor).split(':')[0];
        if (!dm.includes('@')) dm += '@s.whatsapp.net';
        const type = quoted.imageMessage ? 'image' : 'video';
        const buf = await downloadMedia(quoted[type + 'Message'], type);
        if (!buf.length) return reply('❌ Failed - status don expire');
        const posterNum = poster ? String(poster).split('@')[0].split(':')[0] : 'Unknown';
        const cap = `❤️ *STATUS SAVED*\n\n👤 From: @${posterNum}\n\nBy Knight XMD ⚔️`;
        if (type === 'image') await sock.sendMessage(dm, { image: buf, caption: cap, mentions: poster ? [poster] : [] });
        else await sock.sendMessage(dm, { video: buf, caption: cap, mentions: poster ? [poster] : [] });
        await reply('✅ Saved! Check your DM ❤️');
      } catch (e) { await reply('❌ Failed: ' + e.message); }
    }
  },
];

plugin.attachEngine = attachEngine;
plugin.__call = attachEngine;
module.exports = plugin;
