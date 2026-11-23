module.exports = [
{ command: ['vv'], run: async ({ sock, m, from, reply }) => {
  const q = m.message.extendedTextMessage?.contextInfo?.quotedMessage;
  const viewOnce = q?.viewOnceMessageV2?.message || q?.viewOnceMessage?.message || m.message.viewOnceMessageV2?.message;
  if (!viewOnce) return reply('Reply to a View Once photo/video with .vv');
  const type = Object.keys(viewOnce)[0];
  try {
    const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
    const stream = await downloadContentFromMessage(viewOnce[type], type.includes('image') ? 'image' : 'video');
    let buf = Buffer.from([]); for await (const c of stream) buf = Buffer.concat([buf, c]);
    if (type.includes('image')) await sock.sendMessage(from, { image: buf, caption: '👁️ View Once Recovered by Knight XMD' }, { quoted: m });
    else await sock.sendMessage(from, { video: buf, caption: '👁️ View Once Recovered by Knight XMD' }, { quoted: m });
  } catch(e){ await reply('Failed: '+e.message); }
}},
];
