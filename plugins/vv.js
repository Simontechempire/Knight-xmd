// KNIGHT XMD - VV - SAFE - Auto to PAIR OWNER DM Only
// By Faceless Tech
// Owner = person wey pair the bot (sock.user.id) - No number to change
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

// Owner = paired account. E go auto detect am.
function getOwnerJid(sock) {
  if (!sock?.user?.id) return null;
  // sock.user.id fit be 234810xxx:12@s.whatsapp.net or 234810xxx@lid
  let id = String(sock.user.id).split(':')[0];
  if (!id.includes('@')) id += '@s.whatsapp.net';
  return id;
}

function isOwner(sock, m, from) {
  if (m?.key?.fromMe) return true;
  const owner = getOwnerJid(sock);
  if (!owner) return false;
  const sender = m.key.participant || from || m.key.remoteJid;
  const senderClean = String(sender).split(':')[0].split('@')[0];
  const ownerClean = String(owner).split(':')[0].split('@')[0];
  // Also check LID vs normal number - if owner JID na @lid, check remoteJid too
  if (senderClean === ownerClean) return true;
  // If message dey for owner DM directly
  if (String(from).split(':')[0].split('@')[0] === ownerClean) return true;
  return false;
}

function findViewOnce(obj) {
  if (!obj || typeof obj !== 'object') return null;
  if (obj.viewOnceMessageV2?.message) return findViewOnce(obj.viewOnceMessageV2.message) || obj.viewOnceMessageV2.message;
  if (obj.viewOnceMessage?.message) return findViewOnce(obj.viewOnceMessage.message) || obj.viewOnceMessage.message;
  if (obj.viewOnceMessageV2Extension?.message) return obj.viewOnceMessageV2Extension.message;
  if (obj.ephemeralMessage?.message) {
    const f = findViewOnce(obj.ephemeralMessage.message);
    if (f) return f;
  }
  if (obj.imageMessage) return obj;
  if (obj.videoMessage) return obj;
  if (obj.audioMessage) return obj;
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    if (v && typeof v === 'object') {
      const found = findViewOnce(v);
      if (found) return found;
    }
  }
  return null;
}

function attachEngine(sock) {
  if (!sock || !sock.ev) return;
  if (sock.__vvSafePair) return;
  sock.__vvSafePair = true;

  sock.ev.on('messages.upsert', async ({ messages }) => {
    try {
      const m = messages[0];
      if (!m || !m.message) return;
      if (m.key.fromMe) return;
      if (!JSON.stringify(m.message).includes('viewOnce')) return;

      const OWNER_JID = getOwnerJid(sock);
      if (!OWNER_JID) return;

      const target = findViewOnce(m.message);
      if (!target) return;
      const type = Object.keys(target).find(k => k === 'imageMessage' || k === 'videoMessage' || k === 'audioMessage');
      if (!type) return;
      const mediaObj = target[type];
      if (!mediaObj.mediaKey) return;

      const mediaType = type.replace('Message', '');
      const sender = m.key.participant || m.key.remoteJid;
      const senderNum = String(sender).split('@')[0].split(':')[0];
      const where = m.key.remoteJid === 'status@broadcast' ? 'Status' : m.key.remoteJid.includes('@g.us') ? 'Group' : 'DM';

      // If owner himself send VV, no need send to himself
      if (isOwner(sock, m, m.key.remoteJid)) return;

      let buffer = Buffer.from([]);
      try {
        if (sock.downloadMediaMessage) buffer = await sock.downloadMediaMessage(m, 'buffer', {});
      } catch {}
      if (!buffer || buffer.length < 100) {
        const stream = await downloadContentFromMessage(mediaObj, mediaType);
        for await (const c of stream) buffer = Buffer.concat([buffer, c]);
      }
      if (!buffer || buffer.length < 100) return;

      // ===== SAFE: SEND ONLY TO PAIR OWNER DM =====
      const caption = `👁️ *VIEW ONCE RECOVERED - SAFE*\n\n👤 From: @${senderNum}\n📍 Where: ${where}\n📅 Date: ${new Date().toLocaleString()}\n\nBy Knight XMD ⚔️`;

      if (mediaType === 'image') await sock.sendMessage(OWNER_JID, { image: buffer, caption, mentions: [sender] });
      else if (mediaType === 'video') await sock.sendMessage(OWNER_JID, { video: buffer, caption, mentions: [sender] });
      else if (mediaType === 'audio') await sock.sendMessage(OWNER_JID, { audio: buffer, mimetype: 'audio/mp4', ptt: mediaObj.ptt || false, caption, mentions: [sender] });

      console.log('[VV SAFE] Sent to Pair Owner:', OWNER_JID, 'from:', senderNum);
    } catch (e) { console.log('[VV SAFE]', e.message); }
  });
  console.log('[VV SAFE] Auto to Pair Owner DM loaded ✅ - Owner:', getOwnerJid(sock));
}

const plugin = [
  {
    command: ['vv', 'viewonce', 'reveal'],
    run: async ({ sock, m, from, reply }) => {
      // SAFE: Only pair owner fit use .vv
      if (!isOwner(sock, m, from)) {
        return reply('❌ Only owner fit use this command.');
      }
      const OWNER_JID = getOwnerJid(sock);
      const ctx = m.message.extendedTextMessage?.contextInfo;
      const quoted = ctx?.quotedMessage;
      if (!quoted) return reply('❌ Reply to a VV with .vv\n\nBut normally e don already enter your DM automatically. Check your DM.');
      const target = findViewOnce(quoted);
      if (!target) return reply('❌ No VV found. Check your DM, e fit don already send am there.');
      const type = Object.keys(target).find(k => k === 'imageMessage' || k === 'videoMessage' || k === 'audioMessage');
      if (!type) return reply('❌ Unsupported');
      const mediaObj = target[type];
      if (!mediaObj.mediaKey) return reply('❌ Empty media key. Check your DM - auto VV don already send am when e first enter.');
      try {
        const mediaType = type.replace('Message', '');
        const stream = await downloadContentFromMessage(mediaObj, mediaType);
        let buffer = Buffer.from([]);
        for await (const c of stream) buffer = Buffer.concat([buffer, c]);
        if (!buffer || buffer.length < 100) return reply('❌ Expired. Check your DM.');
        const caption = `👁️ *VIEW ONCE RECOVERED*\nBy Knight XMD ⚔️`;
        if (mediaType === 'image') await sock.sendMessage(OWNER_JID, { image: buffer, caption }, { quoted: m });
        else if (mediaType === 'video') await sock.sendMessage(OWNER_JID, { video: buffer, caption }, { quoted: m });
        else if (mediaType === 'audio') await sock.sendMessage(OWNER_JID, { audio: buffer, mimetype: 'audio/mp4' }, { quoted: m });
        await reply('✅ Sent to your DM. Check your DM.');
      } catch (e) { await reply('❌ Failed: ' + e.message); }
    }
  },
];

plugin.attachEngine = attachEngine;
plugin.__call = attachEngine;
module.exports = plugin;
