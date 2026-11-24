const config = require('../config');

const header = (prefix) => `> ╭══〘 ⚔️ 𝗞𝗡𝗜𝗚𝗛𝗧 𝗫𝗠𝗗 〙══⊷❍
> ┃✯╭─────────
> ┃✯│ 👑 Creator: Faceless Tech
> ┃✯│ ⚡ Prefix: ${prefix}
> ┃✯│ 🌐 Mode: Public
> ┃✯│ 🚀 Speed: Fast
> ┃✯╰────────
> ╰════════⊷❍\n\n`;

// Helper to send Buttons - Bottom Method
const sendBtn = async (sock, jid, text, btns) => {
  await sock.sendMessage(jid, {
    text: text,
    buttons: btns.map(b => ({ buttonId: b.id, buttonText: { displayText: b.text }, type: 1 })),
    headerType: 1
  });
};

module.exports = [
{
  command: ['menu','help'],
  run: async ({ sock, from, prefix }) => {
    await sendBtn(sock, from, header(prefix) + `⚔️ *KNIGHT XMD MAIN MENU*\n\nPick one 👇`, [
      { id: 'gmenu', text: '👥 Gmenu' },
      { id: 'gm', text: '🛡️ GM' },
      { id: 'menu2', text: '➡️ Next' },
    ]);
  }
},
{
  command: ['menu2'],
  run: async ({ sock, from, prefix }) => {
    await sendBtn(sock, from, header(prefix) + `⚔️ *KNIGHT XMD - PAGE 2*\n\nPick one 👇`, [
      { id: 'omenu', text: '👑 Owner' },
      { id: 'amenu', text: '⚙️ Auto' },
      { id: 'menu3', text: '➡️ Next' },
    ]);
  }
},
{
  command: ['menu3'],
  run: async ({ sock, from, prefix }) => {
    await sendBtn(sock, from, header(prefix) + `⚔️ *KNIGHT XMD - PAGE 3*\n\nPick one 👇`, [
      { id: 'antimenu', text: '🚫 Anti' },
      { id: 'dmenu', text: '⬇️ Download' },
      { id: 'menu4', text: '➡️ Next' },
    ]);
  }
},
{
  command: ['menu4'],
  run: async ({ sock, from, prefix }) => {
    await sendBtn(sock, from, header(prefix) + `⚔️ *KNIGHT XMD - PAGE 4*\n\nPick one 👇`, [
      { id: 'tmenu', text: '🛠️ Tools' },
      { id: 'smenu', text: '😜 Sticker' },
      { id: 'menu5', text: '➡️ Next' },
    ]);
  }
},
{
  command: ['menu5'],
  run: async ({ sock, from, prefix }) => {
    await sendBtn(sock, from, header(prefix) + `⚔️ *KNIGHT XMD - PAGE 5*\n\nPick one 👇`, [
      { id: 'funmenu', text: '🎮 Fun' },
      { id: 'setmenu', text: '⚙️ Settings' },
      { id: 'menu', text: '⬅️ Back' },
    ]);
  }
},
// ===== GMENU - GROUP =====
{
  command: ['gmenu','groupmenu'],
  run: async ({ sock, from, prefix }) => {
    await sendBtn(sock, from, header(prefix) + `👥 *GMENU - GROUP COMMANDS*\n\n╭──────────◈\n┆ ◈ .ɢʀᴏᴜᴘɪɴꜰᴏ\n┆ ◈ .ɢʀᴏᴜᴘʟɪɴᴋ\n┆ ◈ .ꜱᴇᴛɴᴀᴍᴇ\n┆ ◈ .ꜱᴇᴛᴅᴇꜱᴄ\n┆ ◈ .ᴏᴘᴇɴ\n┆ ◈ .ᴄʟᴏꜱᴇ\n┆ ◈ .ᴛᴀɢᴀʟʟ\n┆ ◈ .ʜɪᴅᴇᴛᴀɢ\n┆ ◈ .ʟɪꜱᴛᴍᴇᴍʙᴇʀꜱ\n┆ ◈ .ᴀᴅᴍɪɴꜱ\n╰──────────◈`, [
      { id: 'gm', text: '🛡️ GM' },
      { id: 'menu', text: '🏠 Main' },
      { id: 'tagall', text: '👥 TagAll' },
    ]);
  }
},
// ===== GM - MODERATOR =====
{
  command: ['gm','modmenu','moderator'],
  run: async ({ sock, from, prefix }) => {
    await sendBtn(sock, from, header(prefix) + `🛡️ *GM - MODERATOR COMMANDS*\n\n╭──────────◈\n┆ ◈ .ᴋɪᴄᴋ\n┆ ◈ .ᴀᴅᴅ\n┆ ◈ .ᴘʀᴏᴍᴏᴛᴇ\n┆ ◈ .ᴅᴇᴍᴏᴛᴇ\n┆ ◈ .ᴡᴀʀɴ\n┆ ◈ .ᴡᴀʀɴɪɴɢꜱ\n┆ ◈ .ʀᴇꜱᴇᴛᴡᴀʀɴ\n┆ ◈ .ᴍᴜᴛᴇ\n┆ ◈ .ᴜɴᴍᴜᴛᴇ\n┆ ◈ .ᴅᴇʟᴇᴛᴇ\n╰──────────◈`, [
      { id: 'gmenu', text: '👥 Gmenu' },
      { id: 'menu', text: '🏠 Main' },
      { id: 'kick', text: '❌ Kick' },
    ]);
  }
},
// ===== OMENU - OWNER =====
{
  command: ['omenu','ownermenu'],
  run: async ({ sock, from, prefix }) => {
    await sendBtn(sock, from, header(prefix) + `👑 *OWNER MENU*\n\n╭──────────◈\n┆ ◈ .ᴍᴇɴᴜ\n┆ ◈ .ʜᴇʟᴘ\n┆ ◈ .ᴘɪɴɢ\n┆ ◈ .ᴀʟɪᴠᴇ\n┆ ◈ .ᴏᴡɴᴇʀ\n┆ ◈ .ʀᴜɴᴛɪᴍᴇ\n┆ ◈ .ʙᴏᴛɪɴꜰᴏ\n┆ ◈ .ʀᴇꜱᴛᴀʀᴛ\n┆ ◈ .ꜱʜᴜᴛᴅᴏᴡɴ\n┆ ◈ .ʙʀᴏᴀᴅᴄᴀꜱᴛ\n┆ ◈ .ꜱᴇᴛᴘʀᴇꜰɪx\n┆ ◈ .ꜱᴇᴛɴᴀᴍᴇ\n┆ ◈ .ꜱᴇᴛʙɪᴏ\n┆ ◈ .ꜱᴇᴛᴘᴘ\n┆ ◈ .ᴊᴏɪɴ\n┆ ◈ .ʟᴇᴀᴠᴇ\n┆ ◈ .ʙʟᴏᴄᴋ\n┆ ◈ .ᴜɴʙʟᴏᴄᴋ\n┆ ◈ .ʙᴀɴ\n┆ ◈ .ᴜɴʙᴀɴ\n╰──────────◈`, [
      { id: 'menu', text: '🏠 Main' },
      { id: 'ping', text: '⚡ Ping' },
      { id: 'alive', text: '💚 Alive' },
    ]);
  }
},
// ===== AMENU - AUTO =====
{
  command: ['amenu','automenu'],
  run: async ({ sock, from, prefix }) => {
    await sendBtn(sock, from, header(prefix) + `⚙️ *AUTO MENU*\n\n╭──────────◈\n┆ ◈ .ᴀᴜᴛᴏʀᴇᴀᴅ\n┆ ◈ .ᴀᴜᴛᴏᴛʏᴘɪɴɢ\n┆ ◈ .ᴀᴜᴛᴏᴏɴʟɪɴᴇ\n┆ ◈ .ᴀᴜᴛᴏʀᴇᴄᴏʀᴅɪɴɢ\n┆ ◈ .ᴀᴜᴛᴏʀᴇᴀᴄᴛ\n┆ ◈ .ᴀᴜᴛᴏʀᴇᴘʟʏ\n┆ ◈ .ᴀᴜᴛᴏꜱᴛɪᴄᴋᴇʀ\n┆ ◈ .ᴀᴜᴛᴏᴠɪᴇᴡ\n┆ ◈ .ᴀᴜᴛᴏʙɪᴏ\n┆ ◈ .ᴀᴜᴛᴏʟɪᴋᴇꜱᴛᴀᴛᴜꜱ\n╰──────────◈`, [
      { id: 'menu', text: '🏠 Main' },
      { id: 'antimenu', text: '🚫 Anti' },
      { id: 'gm', text: '🛡️ GM' },
    ]);
  }
},
// ===== ANTI =====
{
  command: ['antimenu','antim'],
  run: async ({ sock, from, prefix }) => {
    await sendBtn(sock, from, header(prefix) + `🚫 *ANTI MENU*\n\n╭──────────◈\n┆ ◈ .ᴀɴᴛɪʟɪɴᴋ\n┆ ◈ .ᴀɴᴛɪʙᴏᴛ\n┆ ◈ .ᴀɴᴛɪꜱᴘᴀᴍ\n┆ ◈ .ᴀɴᴛɪꜰʟᴏᴏᴅ\n┆ ◈ .ᴀɴᴛɪᴛᴀɢ\n┆ ◈ .ᴀɴᴛɪᴅᴇʟᴇᴛᴇ\n┆ ◈ .ᴀɴᴛɪʙᴀᴅᴡᴏʀᴅ\n┆ ◈ .ᴀɴᴛɪꜱᴛɪᴄᴋᴇʀ\n┆ ◈ .ᴀɴᴛɪꜰᴀᴋᴇ\n┆ ◈ .ᴀɴᴛɪᴘʀᴏᴍᴏᴛᴇ\n╰──────────◈`, [
      { id: 'menu', text: '🏠 Main' },
      { id: 'amenu', text: '⚙️ Auto' },
      { id: 'gmenu', text: '👥 Gmenu' },
    ]);
  }
},
// ===== DMENU - DOWNLOADER + VV =====
{
  command: ['dmenu','dlmenu'],
  run: async ({ sock, from, prefix }) => {
    await sendBtn(sock, from, header(prefix) + `⬇️ *DOWNLOADER MENU*\n\n╭──────────◈\n┆ ◈ .ᴘʟᴀʏ\n┆ ◈ .ꜱᴏɴɢ\n┆ ◈ .ᴠɪᴅᴇᴏ\n┆ ◈ .ᴛɪᴋᴛᴏᴋ\n┆ ◈ .ɪɴꜱᴛᴀɢʀᴀᴍ\n┆ ◈ .ꜰᴀᴄᴇʙᴏᴏᴋ\n┆ ◈ .ᴍᴇᴅɪᴀꜰɪʀᴇ\n┆ ◈ .ᴀᴘᴋ\n┆ ◈ .ᴘɪɴᴛᴇʀᴇꜱᴛ\n┆ ◈ .ɢɪᴛʜᴜʙ\n╰──────────◈\n\nⱽⱽ ᴹᴱᴺᵁ\n╭──────────◈\n┆ ◈ .ᴠᴠ\n╰──────────◈`, [
      { id: 'play', text: '🎵 Play' },
      { id: 'video', text: '🎥 Video' },
      { id: 'menu', text: '🏠 Main' },
    ]);
  }
},
// ===== TMENU - TOOLS =====
{
  command: ['tmenu','toolsmenu'],
  run: async ({ sock, from, prefix }) => {
    await sendBtn(sock, from, header(prefix) + `🛠️ *TOOLS MENU*\n\n╭──────────◈\n┆ ◈ .ᴡᴇᴀᴛʜᴇʀ\n┆ ◈ .ᴛʀᴀɴꜱʟᴀᴛᴇ\n┆ ◈ .ᴄᴀʟᴄᴜʟᴀᴛᴇ\n┆ ◈ .ꜱʜᴏʀᴛᴜʀʟ\n╰──────────◈`, [
      { id: 'menu', text: '🏠 Main' },
      { id: 'funmenu', text: '🎮 Fun' },
      { id: 'smenu', text: '😜 Sticker' },
    ]);
  }
},
// ===== SMENU - STICKER =====
{
  command: ['smenu','stickermenu'],
  run: async ({ sock, from, prefix }) => {
    await sendBtn(sock, from, header(prefix) + `😜 *STICKER MENU*\n\n╭──────────◈\n┆ ◈ .ꜱᴛɪᴄᴋᴇʀ\n┆ ◈ .ᴛᴏɪᴍɢ\n┆ ◈ .ᴛᴀᴋᴇ\n┆ ◈ .ᴀᴛᴛᴘ\n┆ ◈ .ꜱᴍᴇᴍᴇ\n╰──────────◈`, [
      { id: 'menu', text: '🏠 Main' },
      { id: 'sticker', text: '😜 Sticker' },
      { id: 'tmenu', text: '🛠️ Tools' },
    ]);
  }
},
// ===== FUN =====
{
  command: ['funmenu','fun'],
  run: async ({ sock, from, prefix }) => {
    await sendBtn(sock, from, header(prefix) + `🎮 *FUN MENU*\n\n╭──────────◈\n┆ ◈ .ᴊᴏᴋᴇ\n┆ ◈ .ǫᴜᴏᴛᴇ\n┆ ◈ .ᴍᴇᴍᴇ\n┆ ◈ .ᴛʀᴜᴛʜ\n┆ ◈ .ᴅᴀʀᴇ\n╰──────────◈`, [
      { id: 'joke', text: '😂 Joke' },
      { id: 'meme', text: '🤣 Meme' },
      { id: 'menu', text: '🏠 Main' },
    ]);
  }
},
// ===== SETTINGS =====
{
  command: ['setmenu','settingsmenu'],
  run: async ({ sock, from, prefix }) => {
    await sendBtn(sock, from, header(prefix) + `⚙️ *SETTINGS MENU*\n\n╭──────────◈\n┆ ◈ .ᴘʀᴇꜰɪx\n┆ ◈ .ᴘᴜʙʟɪᴄ\n┆ ◈ .ᴘʀɪᴠᴀᴛᴇ\n┆ ◈ .ꜱᴇᴛᴍᴏᴅᴇ\n┆ ◈ .ʟᴀɴɢᴜᴀɢᴇ\n╰──────────◈`, [
      { id: 'menu', text: '🏠 Main' },
      { id: 'gmenu', text: '👥 Gmenu' },
      { id: 'gm', text: '🛡️ GM' },
    ]);
  }
},
];
`;

      await sock.sendMessage(from, {
        image: { url: 'https://files.catbox.moe/4nbm9j.jpg' },
        caption: menu
      }, { quoted: m });
    }
  }
];
