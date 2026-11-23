// KNIGHT XMD - Config - Fixed for Render - Multi-Owner
// Creator = controls ALL bots, no cap
// Owner = person wey link THIS bot (no dey for config, e dey come from connection.js)
try { require('dotenv').config(); } catch {}

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
  // FIX: ownerNumber REMOVED - no be static
  // If any old plugin still use config.ownerNumber, e go be undefined and fail
  // So we keep am as alias to creator for backward compat, but handler NO go use am
  // ownerNumber: DO NOT USE - use ctx.isOwner instead
  sessionName: process.env.SESSION_NAME || "Knight XMD",
  publicUrl: process.env.PUBLIC_URL || "",
};
