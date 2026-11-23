// KNIGHT XMD - Config - Fixed for Render
// By Faceless Tech
// FIXED: dotenv is optional - if e no dey installed, bot no go crash
try { require('dotenv').config(); } catch { /* dotenv not installed, use process.env from Render */ }

module.exports = {
  botName: process.env.BOT_NAME || "Knight XMD",
  creatorName: process.env.CREATOR_NAME || "Faceless Tech",
  creatorNumber: (process.env.CREATOR_NUMBER || "2348071569915").replace(/[^0-9]/g, ''),
  prefix: process.env.PREFIX || ".",
  pfp: process.env.BOT_PFP || "https://files.catbox.moe/4nbm9j.jpg",
  language: process.env.LANGUAGE || "en",
  mode: process.env.MODE || "public",
  port: process.env.PORT || 3000,
  autoRead: process.env.AUTO_READ === 'true' || false,
  autoTyping: process.env.AUTO_TYPING === 'true' || false,
  autoOnline: process.env.AUTO_ONLINE !== 'false',
  autoRecording: process.env.AUTO_RECORDING === 'true' || false,
  autoReact: process.env.AUTO_REACT === 'true' || false,
  autoReply: process.env.AUTO_REPLY === 'true' || false,
  autoSticker: process.env.AUTO_STICKER === 'true' || false,
  autoViewStatus: process.env.AUTO_VIEW_STATUS === 'true' || false,
  autoBio: process.env.AUTO_BIO === 'true' || false,
  autoLikeStatus: process.env.AUTO_LIKE_STATUS === 'true' || false,
  ownerNumber: (process.env.CREATOR_NUMBER || "2348071569915").replace(/[^0-9]/g, ''),
  sessionName: process.env.SESSION_NAME || "Knight XMD",
  publicUrl: process.env.PUBLIC_URL || "",
};
