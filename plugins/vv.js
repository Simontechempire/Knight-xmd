// KNIGHT XMD - View Once Recovery - REAL
// File: plugins/vv.js
// .vv on / off = Auto-recover to DM
// .vv reply to VV = Recover in SAME CHAT (Group + DM)
// Works: Image, Video, Voice Note (PTT), Audio, Document

const fs = require('fs');
const path = require('path');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

const CFG_PATH = path.join(__dirname, '../database/vv.json');

function bold(str) {
  const A = '𝐀𝐁𝐂𝐃𝐄𝐅𝐆𝐇𝐈𝐉𝐊𝐋𝐌𝐍𝐎𝐏𝐐𝐑𝐒𝐓𝐔𝐕𝐖𝐗𝐘𝐙';
  const a = '𝐚𝐛𝐜𝐝𝐞𝐟𝐠𝐡𝐢𝐣𝐤𝐥𝐦𝐧𝐨𝐩𝐪𝐫𝐬𝐭𝐮𝐯𝐰𝐱𝐲𝐳';
  const n = '𝟎𝟏𝟐𝟑𝟒𝟓𝟔𝟕𝟖𝟗';
  const map = {};
  for (let i = 0; i < 26; i++) { map[String.fromCharCode(65+i)] = A[i]; map[String.fromCharCode(97+i)] = a[i]; }
  for (let i = 0; i < 10; i++) map[String(i)] = n[i];
  return String(str).split('').map(c => map[c] || c).join('');
}

function loadCfg() { try { return JSON.parse(fs.readFileSync(CFG_PATH, 'utf8')); } catch { return {}; } }
function saveCfg(d) {
  if (!fs.existsSync(path.dirname(CFG_PATH))) fs.mkdirSync(path.dirname(CFG_PATH), { recursive: true });
  fs.writeFileSync(CFG_PATH, JSON.stringify(d, null, 2));
}

function cleanJid(jid) { return String(jid || '').split(':')[0].split('@')[0]; }

// REAL owner - only sock.user.id, no guessing with 4 candidates
function getOwnerJid(sock) {
  const id = sock?.user?.id;
  if (!id) return null;
  return `${cleanJid(id)}@s.whatsapp.net`;
}

function isOwner(sock, m, from) {
  if (m?.key?.fromMe) return true;
  const ownerNum = cleanJid(getOwnerJid(sock));
  if (!ownerNum) return false;
  const sender = m?.key?.participant || m?.key?.participantPn || from;
  return cleanJid(sender) === ownerNum;
}

function unwrapViewOnce(value) {
  if (!value || typeof value !== 'object') return null;
  if (value.viewOnceMessageV2?.message) {
    const inner = unwrapViewOnce(value.viewOnceMessageV2.message);
    if (inner) return inner;
  }
  if (value.viewOnceMessage?.message) {
    const inner = unwrapViewOnce(value.viewOnceMessage.message);
    if (inner) return inner;
  }
  if (value.ephemeralMessage?.message) {
    const inner = unwrapViewOnce(value.ephemeralMessage.message);
    if (inner) return inner;
  }
  if (value.documentWithCaptionMessage?.message) {
    const inner = unwrapViewOnce(value.documentWithCaptionMessage.message);
    if (inner) return inner;
  }
  for (const key of ['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage']) {
    if (value[key]) {
      return { type: key.replace('Message', ''), media: value[key] };
    }
  }
  return null;
}

function isViewOnceMessage(msg) {
  if (!msg) return false;
  return !!(msg.viewOnceMessage || msg.viewOnceMessageV2 || msg.viewOnceMessageV2Extension);
}

function getMediaType(result) {
  if (!result) return null;
  if (result.media?.ptt) return 'voice';
  return result.type;
}

async function downloadMedia(sock, sourceMsg, mediaResult) {
  if (!mediaResult?.media) throw new Error('Media payload is unavailable');
  if (typeof sock?.downloadMediaMessage === 'function') {
    try {
      const downloaded = await sock.downloadMediaMessage(sourceMsg, 'buffer', {}, {
        reuploadRequest: sock.updateMediaMessage
      });
      if (downloaded?.length > 10) return downloaded;
    } catch (e) { console.log('[VV] downloadMediaMessage failed, trying direct:', e.message); }
  }
  const typeMap = { image: 'image', video: 'video', audio: 'audio', document: 'document' };
  const stream = await downloadContentFromMessage(mediaResult.media, typeMap[mediaResult.type] || mediaResult.type);
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  const buffer = Buffer.concat(chunks);
  if (!buffer.length) throw new Error('Downloaded media is empty');
  return buffer;
}

async function sendMedia(sock, jid, kind, buffer, media, caption, quoted) {
  const options = quoted ? { quoted } : undefined;
  const mimetype = media?.mimetype;
  if (kind === 'image') return sock.sendMessage(jid, { image: buffer, caption, mimetype: mimetype || 'image/jpeg' }, options);
  if (kind === 'video') return sock.sendMessage(jid, { video: buffer, caption, mimetype: mimetype || 'video/mp4' }, options);
  if (kind === 'voice') return sock.sendMessage(jid, { audio: buffer, ptt: true, mimetype: mimetype || 'audio/ogg; codecs=opus' }, options);
  if (kind === 'audio') return sock.sendMessage(jid, { audio: buffer, ptt: false, mimetype: mimetype || 'audio/mp4' }, options);
  if (kind === 'document') return sock.sendMessage(jid, { document: buffer, fileName: media?.fileName || 'view-once-document', mimetype: mimetype || 'application/octet-stream', caption }, options);
  throw new Error(`Unsupported media type: ${kind}`);
}

async function reveal(sock, replyMsg, destination, sourceMsg) {
  const result = unwrapViewOnce(sourceMsg?.message);
  if (!result) throw new Error('No View Once media was found');
  const kind = getMediaType(result);
  const buffer = await downloadMedia(sock, sourceMsg, result);
  const sender = sourceMsg?.key?.participant || sourceMsg?.key?.participantPn || sourceMsg?.key?.remoteJid || 'unknown';
  const senderNumber = cleanJid(sender);
  const caption = `👁️ ${bold('VIEW ONCE RECOVERED')}\n\n👤 ${bold('From:')} @${senderNumber}\n📅 ${bold('Date:')} ${new Date().toLocaleString()}\n\n${bold('By Knight XMD')} ⚔️`;
  // FIX: In group, mention the sender so it tags them
  const options = replyMsg ? { quoted: replyMsg, mentions: senderNumber ? [`${senderNumber}@s.whatsapp.net`] : [] } : undefined;
  // sendMedia with mentions - rebuild here because sendMedia does not pass mentions
  const mimetype = result.media?.mimetype;
  if (kind === 'image') await sock.sendMessage(destination, { image: buffer, caption, mimetype: mimetype || 'image/jpeg', mentions: options?.mentions }, options);
  else if (kind === 'video') await sock.sendMessage(destination, { video: buffer, caption, mimetype: mimetype || 'video/mp4', mentions: options?.mentions }, options);
  else if (kind === 'voice') await sock.sendMessage(destination, { audio: buffer, ptt: true, mimetype: mimetype || 'audio/ogg; codecs=opus' }, options);
  else if (kind === 'audio') await sock.sendMessage(destination, { audio: buffer, ptt: false, mimetype: mimetype || 'audio/mp4' }, options);
  else if (kind === 'document') await sock.sendMessage(destination, { document: buffer, fileName: result.media?.fileName || 'view-once-document', mimetype: mimetype || 'application/octet-stream', caption, mentions: options?.mentions }, options);
  else throw new Error(`Unsupported media type: ${kind}`);
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
        const cfg = loadCfg();
        const ownerJid = getOwnerJid(sock);
        if (!ownerJid) continue;
        if (cfg.global?.on !== true) continue;
        if (!isViewOnceMessage(message.message)) continue;
        const viewOnce = unwrapViewOnce(message.message);
        if (!viewOnce) continue;
        // AUTO: Always to DM
        await reveal(sock, message, ownerJid, message);
        console.log('[VV AUTO]', getMediaType(viewOnce), 'sent to owner:', ownerJid);
      }
    } catch (error) {
      console.log('[VV] recovery failed:', error.message);
    }
  });
}

const plugin = [
  {
    command: ['vv', 'viewonce', 'reveal', 'openonce'],
    run: async ({ sock, m, from, reply, args, text }) => {
      if (!isOwner(sock, m, from)) {
        return reply(`❌ ${bold('Only the paired bot owner can use this command.')}`);
      }

      const arg = (args?.[0] || '').toLowerCase();

      if (arg === 'on' || arg === 'off') {
        const cfg = loadCfg();
        cfg.global = { on: arg === 'on' };
        saveCfg(cfg);
        return reply(`👁️ ${bold('View Once Auto-Recover')} ${arg === 'on' ? bold('ON ✅') : bold('OFF ❌')}\n\n${bold('When ON:')} ${bold('Any View Once sent to the bot will be auto-sent to your DM.')}\n${bold('When OFF:')} ${bold('Only manual .vv reply works.')}`);
      }

      if (arg === 'status' || arg === '') {
        const cfg = loadCfg();
        const on = cfg.global?.on === true;
        if (arg === 'status') {
          return reply(`👁️ ${bold('View Once Auto-Recover:')} ${on ? bold('ON ✅') : bold('OFF ❌')}\n\n${bold('Usage:')} .vv ${bold('on / off')}\n${bold('Or reply to a View Once +')} .vv`);
        }
        const context = m?.message?.extendedTextMessage?.contextInfo;
        if (!context?.quotedMessage) {
          return reply(`👁️ ${bold('View Once Auto-Recover:')} ${on ? bold('ON ✅') : bold('OFF ❌')}\n\n${bold('Usage:')}\n• ${bold('Reply to a View Once +')} .vv\n• .vv ${bold('on')} ${bold('= Auto-recover all to DM')}\n• .vv ${bold('off')} ${bold('= Stop auto-recover')}`);
        }
      }

      // Manual: Reply to VV
      const context = m?.message?.extendedTextMessage?.contextInfo
        || m?.message?.imageMessage?.contextInfo
        || m?.message?.videoMessage?.contextInfo
        || m?.message?.audioMessage?.contextInfo
        || m?.message?.documentMessage?.contextInfo
        || null;

      const quoted = context?.quotedMessage;
      if (!quoted) {
        return reply(`❌ ${bold('Reply to a View Once image, video, voice note, audio, or document with')} .vv`);
      }

      // FIX: Build REAL quoted message with REAL key - for Group + DM
      // In group, participant = who sent the VV. In DM, participant = from
      const quotedMsg = {
        key: {
          remoteJid: from,
          fromMe: false,
          id: context.stanzaId,
          participant: context.participant || context.participantPn || m.key?.participant || from
        },
        message: quoted,
        messageContextInfo: m.messageContextInfo
      };

      if (!isViewOnceMessage(quoted)) {
        return reply(`❌ ${bold('That message is not a View Once message. Reply to a real View Once message.')}`);
      }

      try {
        // FIX: MANUAL = SAME CHAT - not DM
        // from = group JID if in group, DM JID if in DM
        const kind = await reveal(sock, m, from, quotedMsg);
        await reply(`✅ ${bold('View Once')} ${kind === 'voice' ? bold('voice note') : bold(kind)} ${bold('recovered here.')}`);
      } catch (error) {
        console.log('[VV MANUAL]', error);
        await reply(`❌ ${bold('Could not recover this View Once media:')} ${error.message}\n${bold('Tip:')} ${bold('The sender may have already deleted it, or it expired.')}`);
      }
    }
  }
];

plugin.attachEngine = attachEngine;
plugin.__call = attachEngine;
module.exports = plugin;
