const config = require('../config');
const axios = require('axios');
module.exports = [
{ command: ['ping'], run: async ({ reply }) => {
  const s = Date.now(); await reply(`> ╭══〘 🏓 𝗣𝗜𝗡𝗚 〙══⊷❍\n> ┃✯╭──────────────\n> ┃✯│ ⚡ Speed: ${Date.now()-s}ms\n> ┃✯│ 🟢 Status: Online\n> ┃✯╰───────────────\n> ╰═══════════════════⊷❍`);
}},
{ command: ['alive'], run: async ({ reply }) => {
  await reply(`> ╭══〘 💎 𝗔𝗟𝗜𝗩𝗘 〙══⊷❍\n> ┃✯╭──────────────\n> ┃✯│ ⚔️ Knight XMD is Alive\n> ┃✯│ 👑 By Faceless Tech\n> ┃✯│ ✅ All Systems Working\n> ┃✯╰───────────────\n> ╰═══════════════════⊷❍`);
}},
{ command: ['owner'], run: async ({ reply, replyImage }) => {
  await replyImage(config.pfp, `> ╭══〘 👑 𝗖𝗥𝗘𝗔𝗧𝗢𝗥 〙══⊷❍\n> ┃✯╭──────────────\n> ┃✯│ 👤 Name: ${config.creatorName}\n> ┃✯│ 📞 Number: +${config.creatorNumber}\n> ┃✯│ 💬 Contact if bot has error\n> ┃✯│ 🔗 wa.me/${config.creatorNumber}\n> ┃✯╰───────────────\n> ╰═══════════════════⊷❍`);
}},
{ command: ['runtime'], run: async ({ reply }) => {
  const up = Math.floor((Date.now()-global.botStart)/1000);
  const h = Math.floor(up/3600), m = Math.floor(up%3600/60), s = up%60;
  await reply(`⏱️ Runtime: ${h}h ${m}m ${s}s`);
}},
{ command: ['botinfo'], run: async ({ reply }) => {
  await reply(`> ╭══〘 🤖 𝗕𝗢𝗧 𝗜𝗡𝗙𝗢 〙══⊷❍\n> ┃✯╭──────────────\n> ┃✯│ Name: Knight XMD\n> ┃✯│ Creator: Faceless Tech\n> ┃✯│ Version: 1.0.0\n> ┃✯│ Mode: Public\n> ┃✯│ Prefix: ${config.prefix}\n> ┃✯╰───────────────\n> ╰═══════════════════⊷❍`);
}},
{ command: ['restart'], ownerOnly: true, run: async ({ reply }) => { await reply('🔄 Restarting...'); process.exit(0); }},
{ command: ['shutdown'], ownerOnly: true, run: async ({ reply }) => { await reply('🛑 Shutting down...'); process.exit(0); }},
{ command: ['broadcast'], ownerOnly: true, run: async ({ sock, text, reply }) => {
  if (!text) return reply('Usage: .broadcast hello');
  const chats = await sock.groupFetchAllParticipating().catch(()=>({}));
  let c=0; for (const id of Object.keys(chats)) { await sock.sendMessage(id, { text: `📢 *BROADCAST FROM KNIGHT XMD*\n\n${text}` }); c++; }
  await reply(`✅ Broadcast sent to ${c} groups`);
}},
{ command: ['setprefix'], ownerOnly: true, run: async ({ reply, args }) => { config.prefix = args[0] || '.'; await reply(`✅ Prefix changed to ${config.prefix}`); }},
{ command: ['setname'], ownerOnly: true, run: async ({ sock, text, reply }) => { if(!text) return reply('Give name'); await sock.updateProfileName(text); await reply('✅ Name updated'); }},
{ command: ['setbio'], ownerOnly: true, run: async ({ sock, text, reply }) => { await sock.updateProfileStatus(text); await reply('✅ Bio updated'); }},
{ command: ['setpp'], ownerOnly: true, run: async ({ sock, m, reply }) => {
  const q = m.message.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;
  const img = m.message.imageMessage;
  if (!img && !q) return reply('Reply to an image with .setpp');
  try {
    const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
    const stream = await downloadContentFromMessage(img || q, 'image');
    let buf = Buffer.from([]); for await (const c of stream) buf = Buffer.concat([buf, c]);
    await sock.updateProfilePicture(sock.user.id, buf); await reply('✅ Profile pic updated');
  } catch(e){ await reply('Failed: '+e.message); }
}},
{ command: ['join'], ownerOnly: true, run: async ({ sock, text, reply }) => { if(!text) return reply('Give group link'); const code = text.split('/').pop(); await sock.groupAcceptInvite(code); await reply('✅ Joined group'); }},
{ command: ['leave'], ownerOnly: true, run: async ({ sock, from, reply }) => { await reply('👋 Leaving...'); await sock.groupLeave(from); }},
{ command: ['block'], ownerOnly: true, run: async ({ sock, m, reply, args }) => {
  const target = m.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || (args[0] ? args[0].replace(/[^0-9]/g,'')+'@s.whatsapp.net' : null);
  if(!target) return reply('Mention user or give number'); await sock.updateBlockStatus(target, 'block'); await reply('✅ Blocked');
}},
{ command: ['unblock'], ownerOnly: true, run: async ({ sock, m, reply, args }) => {
  const target = m.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || (args[0] ? args[0].replace(/[^0-9]/g,'')+'@s.whatsapp.net' : null);
  if(!target) return reply('Mention user'); await sock.updateBlockStatus(target, 'unblock'); await reply('✅ Unblocked');
}},
{ command: ['ban'], ownerOnly: true, run: async ({ reply, m, args }) => {
  const t = m.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0]?.split('@')[0] || args[0]?.replace(/[^0-9]/g,'');
  if(!t) return reply('Mention user'); if(!global.db.banned.includes(t)) global.db.banned.push(t); await reply(`🚫 @${t} banned`, { mentions: [t+'@s.whatsapp.net'] });
}},
{ command: ['unban'], ownerOnly: true, run: async ({ reply, m, args }) => {
  const t = m.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0]?.split('@')[0] || args[0]?.replace(/[^0-9]/g,'');
  global.db.banned = global.db.banned.filter(x=>x!==t); await reply(`✅ @${t} unbanned`);
}},
];
