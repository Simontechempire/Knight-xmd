const config = require('../config');

const PFP = 'https://files.catbox.moe/4nbm9j.jpg';

const header = (prefix) => `> ╭══〘 ⚔️ 𝗞𝗡𝗜𝗚𝗛𝗧 𝗫𝗠𝗗 〙══⊷❍
> ┃✯╭─────────
> ┃✯│ 👑 Creator: Faceless Tech
> ┃✯│ ⚡ Prefix: ${prefix}
> ┃✯│ 🌐 Mode: Public
> ┃✯│ 🚀 Speed: Fast
> ┃✯╰────────
> ╰════════⊷❍\n\n`;

// ===== ✅ ONE METHOD FOR ALL - PFP on top + Inline Bottom Click =====
const sendBtn = async (sock, jid, text, btns, m) => {
  await sock.sendMessage(jid, {
    image: { url: PFP }, // ✅ Bot PFP for top
    caption: text,
    footer: '⚔️ KNIGHT XMD • Tap below',
    buttonText: '🔄 Open Menu', // ✅ 1 bottom click
    sections: [
      {
        title: '⚔️ KNIGHT XMD - Pick One',
        rows: btns.map(b => ({
          title: b.text,
          rowId: b.id,
          description: `Tap to open ${b.text}`
        }))
      }
    ]
  }, { quoted: m });
};

module.exports = [
{
  command: ['bottonmenu','bottonhelp'],
  run: async ({ sock, m, from, prefix }) => {
    await sendBtn(sock, from, header(prefix) + `⚔️ *KNIGHT XMD MAIN MENU*\n\nᴏᴡɴᴇʀ ᴍᴇɴᴜ\n╭──────────◈\n┆ ◈ .ᴍᴇɴᴜ\n┆ ◈ .ʜᴇʟᴘ\n┆ ◈ .ᴘɪɴɢ\n┆ ◈ .ᴀʟɪᴠᴇ\n┆ ◈ .ᴏᴡɴᴇʀ\n┆ ◈ .ʀᴜɴᴛɪᴍᴇ\n┆ ◈ .ʙᴏᴛɪɴꜰᴏ\n┆ ◈ .ʀᴇꜱᴛᴀʀᴛ\n┆ ◈ .ꜱʜᴜᴛᴅᴏᴡɴ\n┆ ◈ .ʙʀᴏᴀᴅᴄᴀꜱᴛ\n┆ ◈ .ꜱᴇᴛᴘʀᴇꜰɪx\n┆ ◈ .ꜱᴇᴛɴᴀᴍᴇ\n┆ ◈ .ꜱᴇᴛʙɪᴏ\n┆ ◈ .ꜱᴇᴛᴘᴘ\n┆ ◈ .ᴊᴏɪɴ\n┆ ◈ .ʟᴇᴀᴠᴇ\n┆ ◈ .ʙʟᴏᴄᴋ\n┆ ◈ .ᴜɴʙʟᴏᴄᴋ\n┆ ◈ .ʙᴀɴ\n┆ ◈ .ᴜɴʙᴀɴ\n╰──────────◈\n\nᴀᴜᴛᴏ ᴍᴇɴᴜ\n╭──────────◈\n┆ ◈ .ᴀᴜᴛᴏʀᴇᴀᴅ\n┆ ◈ .ᴀᴜᴛᴏᴛʏᴘɪɴɢ\n┆ ◈ .ᴀᴜᴛᴏᴏɴʟɪɴᴇ\n┆ ◈ .ᴀᴜᴛᴏʀᴇᴄᴏʀᴅɪɴɢ\n┆ ◈ .ᴀᴜᴛᴏʀᴇᴀᴄᴛ\n┆ ◈ .ᴀᴜᴛᴏʀᴇᴘʟʏ\n┆ ◈ .ᴀᴜᴛᴏꜱᴛɪᴄᴋᴇʀ\n┆ ◈ .ᴀᴜᴛᴏᴠɪᴇᴡ\n┆ ◈ .ᴀᴜᴛᴏʙɪᴏ\n┆ ◈ .ᴀᴜᴛᴏʟɪᴋᴇꜱᴛᴀᴛᴜꜱ\n╰──────────◈\n\nᴀɴᴛɪ ᴍᴇɴᴜ\n╭──────────◈\n┆ ◈ .ᴀɴᴛɪʟɪɴᴋ\n┆ ◈ .ᴀɴᴛɪʙᴏᴛ\n┆ ◈ .ᴀɴᴛɪꜱᴘᴀᴍ\n┆ ◈ .ᴀɴᴛɪꜰʟᴏᴏᴅ\n┆ ◈ .ᴀɴᴛɪᴛᴀɢ\n┆ ◈ .ᴀɴᴛɪᴅᴇʟᴇᴛᴇ\n┆ ◈ .ᴀɴᴛɪʙᴀᴅᴡᴏʀᴅ\n┆ ◈ .ᴀɴᴛɪꜱᴛɪᴄᴋᴇʀ\n┆ ◈ .ᴀɴᴛɪꜰᴀᴋᴇ\n┆ ◈ .ᴀɴᴛɪᴘʀᴏᴍᴏᴛᴇ\n╰──────────◈\n\nᴍᴏᴅᴇʀᴀᴛᴏʀ ᴍᴇɴᴜ\n╭──────────◈\n┆ ◈ .ᴋɪᴄᴋ\n┆ ◈ .ᴀᴅᴅ\n┆ ◈ .ᴘʀᴏᴍᴏᴛᴇ\n┆ ◈ .ᴅᴇᴍᴏᴛᴇ\n┆ ◈ .ᴡᴀʀɴ\n┆ ◈ .ᴡᴀʀɴɪɴɢꜱ\n┆ ◈ .ʀᴇꜱᴇᴛᴡᴀʀɴ\n┆ ◈ .ᴍᴜᴛᴇ\n┆ ◈ .ᴜɴᴍᴜᴛᴇ\n┆ ◈ .ᴅᴇʟᴇᴛᴇ\n╰──────────◈\n\nɢʀᴏᴜᴘ ᴍᴇɴᴜ\n╭──────────◈\n┆ ◈ .ɢʀᴏᴜᴘɪɴꜰᴏ\n┆ ◈ .ɢʀᴏᴜᴘʟɪɴᴋ\n┆ ◈ .ꜱᴇᴛɴᴀᴍᴇ\n┆ ◈ .ꜱᴇᴛᴅᴇꜱᴄ\n┆ ◈ .ᴏᴘᴇɴ\n┆ ◈ .ᴄʟᴏꜱᴇ\n┆ ◈ .ᴛᴀɢᴀʟʟ\n┆ ◈ .ʜɪᴅᴇᴛᴀɢ\n┆ ◈ .ʟɪꜱᴛᴍᴇᴍʙᴇʀꜱ\n┆ ◈ .ᴀᴅᴍɪɴꜱ\n╰──────────◈\n\nⱽⱽ ᴹᴱᴺᵁ\n╭──────────◈\n┆ ◈ .ᴠᴠ\n╰──────────◈\n\nᴅᴏᴡɴʟᴏᴀᴅᴇʀ ᴍᴇɴᴜ\n╭──────────◈\n┆ ◈ .ᴘʟᴀʏ\n┆ ◈ .ꜱᴏɴɢ\n┆ ◈ .ᴠɪᴅᴇᴏ\n┆ ◈ .ᴛɪᴋᴛᴏᴋ\n┆ ◈ .ɪɴꜱᴛᴀɢʀᴀᴍ\n┆ ◈ .ꜰᴀᴄᴇʙᴏᴏᴋ\n┆ ◈ .ᴍᴇᴅɪᴀꜰɪʀᴇ\n┆ ◈ .ᴀᴘᴋ\n┆ ◈ .ᴘɪɴᴛᴇʀᴇꜱᴛ\n┆ ◈ .ɢɪᴛʜᴜʙ\n╰──────────◈\n\nᴛᴏᴏʟꜱ ᴍᴇɴᴜ\n╭──────────◈\n┆ ◈ .ᴡᴇᴀᴛʜᴇʀ\n┆ ◈ .ᴛʀᴀɴꜱʟᴀᴛᴇ\n┆ ◈ .ᴄᴀʟᴄᴜʟᴀᴛᴇ\n┆ ◈ .ꜱʜᴏʀᴛᴜʀʟ\n╰──────────◈\n\nꜱᴇᴛᴛɪɴɢꜱ ᴍᴇɴᴜ\n╭──────────◈\n┆ ◈ .ᴘʀᴇꜰɪx\n┆ ◈ .ᴘᴜʙʟɪᴄ\n┆ ◈ .ᴘʀɪᴠᴀᴛᴇ\n┆ ◈ .ꜱᴇᴛᴍᴏᴅᴇ\n┆ ◈ .ʟᴀɴɢᴜᴀɢᴇ\n╰──────────◈\n\nꜱᴛɪᴄᴋᴇʀ ᴍᴇɴᴜ\n╭──────────◈\n┆ ◈ .ꜱᴛɪᴄᴋᴇʀ\n┆ ◈ .ᴛᴏɪᴍɢ\n┆ ◈ .ᴛᴀᴋᴇ\n┆ ◈ .ᴀᴛᴛᴘ\n┆ ◈ .ꜱᴍᴇᴍᴇ\n╰──────────◈\n\nꜰᴜɴ ᴍᴇɴᴜ\n╭──────────◈\n┆ ◈ .ᴊᴏᴋᴇ\n┆ ◈ .ǫᴜᴏᴛᴇ\n┆ ◈ .ᴍᴇᴍᴇ\n┆ ◈ .ᴛʀᴜᴛʜ\n┆ ◈ .ᴅᴀʀᴇ\n╰──────────◈`, [
      { id: 'gmenu', text: '👥 Gmenu' },
      { id: 'gm', text: '🛡️ GM' },
      { id: 'menu2', text: '➡️ Next' },
    ], m);
  }
},
{
  command: ['bmenu2'],
  run: async ({ sock, m, from, prefix }) => {
    await sendBtn(sock, from, header(prefix) + `⚔️ *KNIGHT XMD - PAGE 2*\n\nPick one 👇`, [
      { id: 'omenu', text: '👑 Owner' },
      { id: 'amenu', text: '⚙️ Auto' },
      { id: 'menu3', text: '➡️ Next' },
    ], m);
  }
},
{
  command: ['menu3'],
  run: async ({ sock, m, from, prefix }) => {
    await sendBtn(sock, from, header(prefix) + `⚔️ *KNIGHT XMD - PAGE 3*\n\nPick one 👇`, [
      { id: 'antimenu', text: '🚫 Anti' },
      { id: 'dmenu', text: '⬇️ Download' },
      { id: 'menu4', text: '➡️ Next' },
    ], m);
  }
},
{
  command: ['menu4'],
  run: async ({ sock, m, from, prefix }) => {
    await sendBtn(sock, from, header(prefix) + `⚔️ *KNIGHT XMD - PAGE 4*\n\nPick one 👇`, [
      { id: 'tmenu', text: '🛠️ Tools' },
      { id: 'smenu', text: '😜 Sticker' },
      { id: 'menu5', text: '➡️ Next' },
    ], m);
  }
},
{
  command: ['menu5'],
  run: async ({ sock, m, from, prefix }) => {
    await sendBtn(sock, from, header(prefix) + `⚔️ *KNIGHT XMD - PAGE 5*\n\nPick one 👇`, [
      { id: 'funmenu', text: '🎮 Fun' },
      { id: 'setmenu', text: '⚙️ Settings' },
      { id: 'menu', text: '⬅️ Back' },
    ], m);
  }
},
// ===== GMENU - GROUP =====
{
  command: ['gmenu','groupmenu'],
  run: async ({ sock, m, from, prefix }) => {
    await sendBtn(sock, from, header(prefix) + `👥 *GMENU - GROUP COMMANDS*\n\n╭──────────◈\n┆ ◈ .ɢʀᴏᴜᴘɪɴꜰᴏ\n┆ ◈ .ɢʀᴏᴜᴘʟɪɴᴋ\n┆ ◈ .ꜱᴇᴛɴᴀᴍᴇ\n┆ ◈ .ꜱᴇᴛᴅᴇꜱᴄ\n┆ ◈ .ᴏᴘᴇɴ\n┆ ◈ .ᴄʟᴏꜱᴇ\n┆ ◈ .ᴛᴀɢᴀʟʟ\n┆ ◈ .ʜɪᴅᴇᴛᴀɢ\n┆ ◈ .ʟɪꜱᴛᴍᴇᴍʙᴇʀꜱ\n┆ ◈ .ᴀᴅᴍɪɴꜱ\n╰──────────◈`, [
      { id: 'gm', text: '🛡️ GM' },
      { id: 'menu', text: '🏠 Main' },
      { id: 'tagall', text: '👥 TagAll' },
    ], m);
  }
},
// ===== GM - MODERATOR =====
{
  command: ['gm','modmenu','moderator'],
  run: async ({ sock, m, from, prefix }) => {
    await sendBtn(sock, from, header(prefix) + `🛡️ *GM - MODERATOR COMMANDS*\n\n╭──────────◈\n┆ ◈ .ᴋɪᴄᴋ\n┆ ◈ .ᴀᴅᴅ\n┆ ◈ .ᴘʀᴏᴍᴏᴛᴇ\n┆ ◈ .ᴅᴇᴍᴏᴛᴇ\n┆ ◈ .ᴡᴀʀɴ\n┆ ◈ .ᴡᴀʀɴɪɴɢꜱ\n┆ ◈ .ʀᴇꜱᴇᴛᴡᴀʀɴ\n┆ ◈ .ᴍᴜᴛᴇ\n┆ ◈ .ᴜɴᴍᴜᴛᴇ\n┆ ◈ .ᴅᴇʟᴇᴛᴇ\n╰──────────◈`, [
      { id: 'gmenu', text: '👥 Gmenu' },
      { id: 'menu', text: '🏠 Main' },
      { id: 'kick', text: '❌ Kick' },
    ], m);
  }
},
// ===== OMENU - OWNER =====
{
  command: ['omenu','ownermenu'],
  run: async ({ sock, m, from, prefix }) => {
    await sendBtn(sock, from, header(prefix) + `👑 *OWNER MENU*\n\n╭──────────◈\n┆ ◈ .ᴍᴇɴᴜ\n┆ ◈ .ʜᴇʟᴘ\n┆ ◈ .ᴘɪɴɢ\n┆ ◈ .ᴀʟɪᴠᴇ\n┆ ◈ .ᴏᴡɴᴇʀ\n┆ ◈ .ʀᴜɴᴛɪᴍᴇ\n┆ ◈ .ʙᴏᴛɪɴꜰᴏ\n┆ ◈ .ʀᴇꜱᴛᴀʀᴛ\n┆ ◈ .ꜱʜᴜᴛᴅᴏᴡɴ\n┆ ◈ .ʙʀᴏᴀᴅᴄᴀꜱᴛ\n┆ ◈ .ꜱᴇᴛᴘʀᴇꜰɪx\n┆ ◈ .ꜱᴇᴛɴᴀᴍᴇ\n┆ ◈ .ꜱᴇᴛʙɪᴏ\n┆ ◈ .ꜱᴇᴛᴘᴘ\n┆ ◈ .ᴊᴏɪɴ\n┆ ◈ .ʟᴇᴀᴠᴇ\n┆ ◈ .ʙʟᴏᴄᴋ\n┆ ◈ .ᴜɴʙʟᴏᴄᴋ\n┆ ◈ .ʙᴀɴ\n┆ ◈ .ᴜɴʙᴀɴ\n╰──────────◈`, [
      { id: 'menu', text: '🏠 Main' },
      { id: 'ping', text: '⚡ Ping' },
      { id: 'alive', text: '💚 Alive' },
    ], m);
  }
},
// ===== AMENU - AUTO =====
{
  command: ['amenu','automenu'],
  run: async ({ sock, m, from, prefix }) => {
    await sendBtn(sock, from, header(prefix) + `⚙️ *AUTO MENU*\n\n╭──────────◈\n┆ ◈ .ᴀᴜᴛᴏʀᴇᴀᴅ\n┆ ◈ .ᴀᴜᴛᴏᴛʏᴘɪɴɢ\n┆ ◈ .ᴀᴜᴛᴏᴏɴʟɪɴᴇ\n┆ ◈ .ᴀᴜᴛᴏʀᴇᴄᴏʀᴅɪɴɢ\n┆ ◈ .ᴀᴜᴛᴏʀᴇᴀᴄᴛ\n┆ ◈ .ᴀᴜᴛᴏʀᴇᴘʟʏ\n┆ ◈ .ᴀᴜᴛᴏꜱᴛɪᴄᴋᴇʀ\n┆ ◈ .ᴀᴜᴛᴏᴠɪᴇᴡ\n┆ ◈ .ᴀᴜᴛᴏʙɪᴏ\n┆ ◈ .ᴀᴜᴛᴏʟɪᴋᴇꜱᴛᴀᴛᴜꜱ\n╰──────────◈`, [
      { id: 'menu', text: '🏠 Main' },
      { id: 'antimenu', text: '🚫 Anti' },
      { id: 'gm', text: '🛡️ GM' },
    ], m);
  }
},
// ===== ANTI =====
{
  command: ['antimenu','antim'],
  run: async ({ sock, m, from, prefix }) => {
    await sendBtn(sock, from, header(prefix) + `🚫 *ANTI MENU*\n\n╭──────────◈\n┆ ◈ .ᴀɴᴛɪʟɪɴᴋ\n┆ ◈ .ᴀɴᴛɪʙᴏᴛ\n┆ ◈ .ᴀɴᴛɪꜱᴘᴀᴍ\n┆ ◈ .ᴀɴᴛɪꜰʟᴏᴏᴅ\n┆ ◈ .ᴀɴᴛɪᴛᴀɢ\n┆ ◈ .ᴀɴᴛɪᴅᴇʟᴇᴛᴇ\n┆ ◈ .ᴀɴᴛɪʙᴀᴅᴡᴏʀᴅ\n┆ ◈ .ᴀɴᴛɪꜱᴛɪᴄᴋᴇʀ\n┆ ◈ .ᴀɴᴛɪꜰᴀᴋᴇ\n┆ ◈ .ᴀɴᴛɪᴘʀᴏᴍᴏᴛᴇ\n╰──────────◈`, [
      { id: 'menu', text: '🏠 Main' },
      { id: 'amenu', text: '⚙️ Auto' },
      { id: 'gmenu', text: '👥 Gmenu' },
    ], m);
  }
},
// ===== DMENU - DOWNLOADER + VV =====
{
  command: ['dmenu','dlmenu'],
  run: async ({ sock, m, from, prefix }) => {
    await sendBtn(sock, from, header(prefix) + `⬇️ *DOWNLOADER MENU*\n\n╭──────────◈\n┆ ◈ .ᴘʟᴀʏ\n┆ ◈ .ꜱᴏɴɢ\n┆ ◈ .ᴠɪᴅᴇᴏ\n┆ ◈ .ᴛɪᴋᴛᴏᴋ\n┆ ◈ .ɪɴꜱᴛᴀɢʀᴀᴍ\n┆ ◈ .ꜰᴀᴄᴇʙᴏᴏᴋ\n┆ ◈ .ᴍᴇᴅɪᴀꜰɪʀᴇ\n┆ ◈ .ᴀᴘᴋ\n┆ ◈ .ᴘɪɴᴛᴇʀᴇꜱᴛ\n┆ ◈ .ɢɪᴛʜᴜʙ\n╰──────────◈\n\nⱽⱽ ᴹᴱᴺᵁ\n╭──────────◈\n┆ ◈ .ᴠᴠ\n╰──────────◈`, [
      { id: 'play', text: '🎵 Play' },
      { id: 'video', text: '🎥 Video' },
      { id: 'menu', text: '🏠 Main' },
    ], m);
  }
},
// ===== TMENU - TOOLS =====
{
  command: ['tmenu','toolsmenu'],
  run: async ({ sock, m, from, prefix }) => {
    await sendBtn(sock, from, header(prefix) + `🛠️ *TOOLS MENU*\n\n╭──────────◈\n┆ ◈ .ᴡᴇᴀᴛʜᴇʀ\n┆ ◈ .ᴛʀᴀɴꜱʟᴀᴛᴇ\n┆ ◈ .ᴄᴀʟᴄᴜʟᴀᴛᴇ\n┆ ◈ .ꜱʜᴏʀᴛᴜʀʟ\n╰──────────◈`, [
      { id: 'menu', text: '🏠 Main' },
      { id: 'funmenu', text: '🎮 Fun' },
      { id: 'smenu', text: '😜 Sticker' },
    ], m);
  }
},
// ===== SMENU - STICKER =====
{
  command: ['smenu','stickermenu'],
  run: async ({ sock, m, from, prefix }) => {
    await sendBtn(sock, from, header(prefix) + `😜 *STICKER MENU*\n\n╭──────────◈\n┆ ◈ .ꜱᴛɪᴄᴋᴇʀ\n┆ ◈ .ᴛᴏɪᴍɢ\n┆ ◈ .ᴛᴀᴋᴇ\n┆ ◈ .ᴀᴛᴛᴘ\n┆ ◈ .ꜱᴍᴇᴍᴇ\n╰──────────◈`, [
      { id: 'menu', text: '🏠 Main' },
      { id: 'sticker', text: '😜 Sticker' },
      { id: 'tmenu', text: '🛠️ Tools' },
    ], m);
  }
},
// ===== FUN =====
{
  command: ['funmenu','fun'],
  run: async ({ sock, m, from, prefix }) => {
    await sendBtn(sock, from, header(prefix) + `🎮 *FUN MENU*\n\n╭──────────◈\n┆ ◈ .ᴊᴏᴋᴇ\n┆ ◈ .ǫᴜᴏᴛᴇ\n┆ ◈ .ᴍᴇᴍᴇ\n┆ ◈ .ᴛʀᴜᴛʜ\n┆ ◈ .ᴅᴀʀᴇ\n╰──────────◈`, [
      { id: 'joke', text: '😂 Joke' },
      { id: 'meme', text: '🤣 Meme' },
      { id: 'menu', text: '🏠 Main' },
    ], m);
  }
},
// ===== SETTINGS =====
{
  command: ['setmenu','settingsmenu'],
  run: async ({ sock, m, from, prefix }) => {
    await sendBtn(sock, from, header(prefix) + `⚙️ *SETTINGS MENU*\n\n╭──────────◈\n┆ ◈ .ᴘʀᴇꜰɪx\n┆ ◈ .ᴘᴜʙʟɪᴄ\n┆ ◈ .ᴘʀɪᴠᴀᴛᴇ\n┆ ◈ .ꜱᴇᴛᴍᴏᴅᴇ\n┆ ◈ .ʟᴀɴɢᴜᴀɢᴇ\n╰──────────◈`, [
      { id: 'menu', text: '🏠 Main' },
      { id: 'gmenu', text: '👥 Gmenu' },
      { id: 'gm', text: '🛡️ GM' },
    ], m);
  }
},
];
