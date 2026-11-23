const config = require('../config');
module.exports = [
{ command: ['prefix'], ownerOnly: true, run: async ({ reply }) => { await reply(`Current prefix: ${config.prefix}`); }},
{ command: ['public'], ownerOnly: true, run: async ({ reply }) => { config.mode='public'; await reply('🌐 Mode: PUBLIC - Everybody can use bot'); }},
{ command: ['private'], ownerOnly: true, run: async ({ reply }) => { config.mode='private'; await reply('🔒 Mode: PRIVATE - Only owner can use bot'); }},
{ command: ['setmode'], ownerOnly: true, run: async ({ reply, args }) => { config.mode=args[0]||'public'; await reply(`Mode set to ${config.mode}`); }},
{ command: ['language'], ownerOnly: true, run: async ({ reply, args }) => { config.language=args[0]||'en'; await reply(`Language set to ${config.language}`); }},
];
