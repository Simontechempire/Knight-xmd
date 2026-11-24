// KNIGHT XMD - View Once Recovery
// Supports viewOnce, viewOnceV2, V2Extension, images, videos, audio, and PTT voice notes.
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

const cleanJid = jid => String(jid || '').split(':')[0].split('@')[0];

function getOwnerJid(sock) {
  const ids = [sock?.user?.id, sock?.user?.lid].filter(Boolean);
  return ids.find(id => String(id).includes('@s.whatsapp.net')) ||
    (ids[0] ? `${cleanJid(ids[0])}@s.whatsapp.net` : null);
}

function isOwner(sock, message, from) {
  if (message?.key?.fromMe) return true;
  const ownerNumber = cleanJid(getOwnerJid(sock));
  const sender = message?.key?.participant || message?.key?.participantPn || from;
  const candidates = [sender, from, message?.key?.remoteJid, sock?.user?.lid]
    .map(cleanJid)
    .filter(Boolean);
  return candidates.includes(ownerNumber);
}

function unwrapViewOnce(value, depth = 0) {
  if (!value || typeof value !== 'object' || depth > 12) return null;

  for (const key of [
    'viewOnceMessageV2',
    'viewOnceMessage',
    'viewOnceMessageV2Extension',
    'ephemeralMessage',
    'documentWithCaptionMessage'
  ]) {
    if (value[key]?.message) {
      const found = unwrapViewOnce(value[key].message, depth + 1);
      if (found) return found;
    }
  }

  for (const key of ['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage']) {
    if (value[key]) {
      return { type: key.replace('Message', ''), media: value[key], container: value };
    }
  }

  for (const key of Object.keys(value)) {
    const nested = unwrapViewOnce(value[key], depth + 1);
    if (nested) return nested;
  }
  return null;
}

function getMediaType(result) {
  if (!result) return null;
  if (result.media?.ptt) return 'voice';
  return result.type;
}

async function downloadMedia(sock, message, mediaResult) {
  if (!mediaResult?.media) throw new Error('Media payload is unavailable');

  if (typeof sock?.downloadMediaMessage === 'function') {
    try {
      const downloaded = await sock.downloadMediaMessage(message, 'buffer', {}, {
        reuploadRequest: sock.updateMediaMessage
      });
      if (downloaded?.length > 10) return downloaded;
    } catch {}
  }

  const stream = await downloadContentFromMessage(mediaResult.media, mediaResult.type);
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  const buffer = Buffer.concat(chunks);
  if (!buffer.length) throw new Error('Downloaded media is empty');
  return buffer;
}

function sendMedia(sock, jid, kind, buffer, media, caption, quoted) {
  const options = quoted ? { quoted } : undefined;
  const mimetype = media?.mimetype;

  if (kind === 'image') {
    return sock.sendMessage(jid, { image: buffer, caption, mimetype: mimetype || 'image/jpeg' }, options);
  }
  if (kind === 'video') {
    return sock.sendMessage(jid, { video: buffer, caption, mimetype: mimetype || 'video/mp4' }, options);
  }
  if (kind === 'voice') {
    return sock.sendMessage(jid, {
      audio: buffer,
      ptt: true,
      mimetype: mimetype || 'audio/ogg; codecs=opus'
    }, options);
  }
  if (kind === 'audio') {
    return sock.sendMessage(jid, {
      audio: buffer,
      ptt: false,
      mimetype: mimetype || 'audio/mp4'
    }, options);
  }
  if (kind === 'document') {
    return sock.sendMessage(jid, {
      document: buffer,
      fileName: media?.fileName || 'view-once-document',
      mimetype: mimetype || 'application/octet-stream',
      caption
    }, options);
  }
  throw new Error(`Unsupported media type: ${kind}`);
}

async function reveal(sock, message, destination, sourceMessage = message) {
  const result = unwrapViewOnce(sourceMessage?.message || sourceMessage);
  if (!result) throw new Error('No view once media was found');

  const kind = getMediaType(result);
  const buffer = await downloadMedia(sock, sourceMessage, result);
  const sender = sourceMessage?.key?.participant ||
    sourceMessage?.key?.participantPn ||
    sourceMessage?.key?.remoteJid ||
    'unknown';
  const senderNumber = cleanJid(sender);
  const caption = `👁️ *VIEW ONCE RECOVERED*\n\n👤 From: ${senderNumber ? `@${senderNumber}` : 'Unknown'}\n📅 Date: ${new Date().toLocaleString()}\n\nBy Knight XMD ⚔️`;

  await sendMedia(sock, destination, kind, buffer, result.media, caption, message);
  return kind;
}

function attachEngine(sock) {
  if (!sock?.ev || sock.__vvEngineAttached) return;
  sock.__vvEngineAttached = true;

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    try {
      if (!Array.isArray(messages) || !messages.length) return;
      if (type === 'append') return;

      for (const message of messages) {
        if (!message?.message || message.key?.fromMe) continue;
        const viewOnce = unwrapViewOnce(message.message);
        if (!viewOnce) continue;

        const ownerJid = getOwnerJid(sock);
        if (!ownerJid) continue;
        await reveal(sock, message, ownerJid, message);
        console.log('[VV]', getMediaType(viewOnce), 'sent to owner:', ownerJid);
      }
    } catch (error) {
      console.log('[VV] recovery failed:', error.message);
    }
  });
}

const plugin = [
  {
    command: ['vv', 'viewonce', 'reveal', 'openonce'],
    run: async ({ sock, m, from, reply }) => {
      if (!isOwner(sock, m, from)) {
        return reply('❌ Only the paired bot owner can use this command.');
      }

      const context = m?.message?.extendedTextMessage?.contextInfo;
      const quoted = context?.quotedMessage;
      if (!quoted) {
        return reply('Reply to a view once image, video, voice note, audio, or document with .vv');
      }

      try {
        const ownerJid = getOwnerJid(sock);
        if (!ownerJid) return reply('❌ Could not determine the paired bot owner.');

        const kind = await reveal(sock, m, ownerJid, {
          ...m,
          message: quoted
        });
        await reply(`✅ View once ${kind === 'voice' ? 'voice note' : kind} sent to your DM.`);
      } catch (error) {
        await reply(`❌ Could not recover this view once media: ${error.message}`);
      }
    }
  }
];

plugin.attachEngine = attachEngine;
plugin.__call = attachEngine;
module.exports = plugin;
