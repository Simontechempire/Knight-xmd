// KNIGHT XMD - Config - Fixed
// By Faceless Tech
require('dotenv').config(); // FIXED: Load .env, so Render env vars go work

module.exports = {
  botName: process.env.BOT_NAME || "Knight XMD",
  creatorName: process.env.CREATOR_NAME || "Faceless Tech",
  creatorNumber: (process.env.CREATOR_NUMBER || "2348071569915").replace(/[^0-9]/g, ''),

  prefix: process.env.PREFIX || ".",
  pfp: process.env.BOT_PFP || "https://files.catbox.moe/4nbm9j.jpg",
  language: process.env.LANGUAGE || "en",
  mode: process.env.MODE || "public", // public / private / self

  port: process.env.PORT || 3000,

  // FIXED: Added missing fields wey handler / connection dey use
  // Before, handler dey check config.pfp, config.creatorNumber etc but if .env change am, e no go update
  // Now all from env, with fallback

  // Auto settings - default off, owner fit turn on with .settings
  autoRead: process.env.AUTO_READ === 'true' || false,
  autoTyping: process.env.AUTO_TYPING === 'true' || false,
  autoOnline: process.env.AUTO_ONLINE !== 'false', // default true
  autoRecording: process.env.AUTO_RECORDING === 'true' || false,
  autoReact: process.env.AUTO_REACT === 'true' || false,
  autoReply: process.env.AUTO_REPLY === 'true' || false,
  autoSticker: process.env.AUTO_STICKER === 'true' || false,
  autoViewStatus: process.env.AUTO_VIEW_STATUS === 'true' || false,
  autoBio: process.env.AUTO_BIO === 'true' || false,
  autoLikeStatus: process.env.AUTO_LIKE_STATUS === 'true' || false,

  // NEW: Fields wey other files dey expect but config no get
  ownerNumber: (process.env.CREATOR_NUMBER || "2348071569915").replace(/[^0-9]/g, ''), // alias for creatorNumber
  botNumber: process.env.BOT_NUMBER || "", // filled on connect, not needed here
  sessionName: process.env.SESSION_NAME || "Knight XMD",
  publicUrl: process.env.PUBLIC_URL || "", // for Render - e.g. https://knight-xmd.onrender.com
};
