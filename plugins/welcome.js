// KNIGHT XMD - Welcome & Goodbye - FIXED REAL - No demo
// File: plugins/welcome.js
// Fix: Engine auto-attaches on first command, no handler change needed

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../database/wlc.json');

function loadDB() { try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf8')); } catch { return {}; } }
function saveDB(d) {
  if (!fs.existsSync(path.dirname(DB_PATH))) fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(d, null, 2));
}
function getChat(jid) {
  const db = loadDB();
  return db[jid] || { welcome: false, goodbye: false };
}
function setChat(jid, data) {
  const db = loadDB();
  db[jid] = { welcome: false, goodbye: false, ...(db[jid] || {}), ...data };
  saveDB(db);
  return db[jid];
}

const clean = (jid) => String(jid || '').split('@')[0].split(':')[0].replace(/[^0-9]/g, '');

function welcomeText(user, groupName, count) {
  return `╭━━━〔 ✨ NEW MEMBER ALERT 〕━━━╮\n\n   🦋 𝐖𝐄𝐋𝐂𝐎𝐌𝐄 𝐓𝐎 𝐓𝐇𝐄 𝐅𝐀𝐌𝐈𝐋𝐘 🦋\n\n  ┏━━━━━━━━━━━━━━━━━━┓\n    👤 𝐍𝐚𝐦𝐞: @${user}\n    🌸 𝐆𝐫𝐨𝐮𝐩: ${groupName}\n    💌 𝐌𝐞𝐦𝐛𝐞𝐫: ${count}\n  ┗━━━━━━━━━━━━━━━━━━┛\n\n  🎉 A fresh face, a new vibe!\n  💫 We're glad to have you here.\n\n  📌 Read the group rules.\n  🤝 Respect every member.\n  💬 Stay active and have fun.\n\n  ❤️ MAKE YOURSELF AT HOME!\n\n╰━━━━━━━━━━━━━━━━━━━━━━━━╯`;
}
function goodbyeText(user, groupName) {
  return `╭━━━〔 🥀 MEMBER DEPARTURE 〕━━━╮\n\n      💔 𝐆𝐎𝐎𝐃𝐁𝐘𝐄 & 𝐓𝐀𝐊𝐄 𝐂𝐀𝐑𝐄 💔\n\n  ┏━━━━━━━━━━━━━━━━━━┓\n    👤 𝐍𝐚𝐦𝐞: @${user}\n    🌸 𝐆𝐫𝐨𝐮𝐩: ${groupName}\n  ┗━━━━━━━━━━━━━━━━━━┛\n\n  😔 Someone has left the family.\n\n  🌹 Thanks for being part of us.\n  💫 Your presence was appreciated.\n  🦋 Wishing you happiness and success.\n\n       ❤️ UNTIL WE MEET AGAIN!\n\n╰━━━━━━━━━━━━━━━━━━━━━━━━╯`;
}

// ✅ FIXED: Attach once per sock, use real participant JID for mention
function attachEngine(sock) {
  if (!sock || !sock.ev) return;
  if (sock.__wlcEngineLoaded) return;
  sock.__wlcEngineLoaded = true;
  sock.ev.on('group-participants.update', async (update) => {
    try {
      const jid = update.id;
      if (!jid || !jid.endsWith('@g.us')) return;
      const cfg = loadDB()[jid];
      if (!cfg) return;
      if (!cfg.welcome && !cfg.goodbye) return;

      let groupName = 'Group', count = 0, meta = null;
      try { meta = await sock.groupMetadata(jid); groupName = meta.subject || 'Group'; count = meta.participants?.length || 0; } catch {}

      for (const p of update.participants || []) {
        // ✅ FIX: p is already full JID like 234...@s.whatsapp.net, use am direct for mention
        const fullJid = String(p).includes('@') ? String(p) : `${clean(p)}@s.whatsapp.net`;
        const num = clean(fullJid);
        let pp = null;
        try { pp = await sock.profilePictureUrl(fullJid, 'image'); } catch {}

        if (update.action === 'add' && cfg.welcome) {
          const txt = welcomeText(num, groupName, count);
          try {
            if (pp) await sock.sendMessage(jid, { image: { url: pp }, caption: txt, mentions: [fullJid] });
            else await sock.sendMessage(jid, { text: txt, mentions: [fullJid] });
          } catch (e) { console.log('[WLC SEND]', e.message); }
        }
        if ((update.action === 'remove' || update.action === 'leave') && cfg.goodbye) {
          const txt = goodbyeText(num, groupName);
          try {
            if (pp) await sock.sendMessage(jid, { image: { url: pp }, caption: txt, mentions: [fullJid] });
            else await sock.sendMessage(jid, { text: txt, mentions: [fullJid] });
          } catch (e) { console.log('[WLC SEND]', e.message); }
        }
      }
    } catch (e) { console.log('[WLC]', e.message); }
  });
  console.log('[WLC] Welcome & Goodbye engine loaded ✅');
}

const commands = [
  {
    command: ['gcwelcome', 'welcome', 'wlc'],
    groupOnly: true,
    adminOnly: true,
    // ✅ FIX: Collect sock here, attach engine immediately
    run: async ({ sock, from, isGroup, reply, text, args }) => {
      if (sock) attachEngine(sock);
      if (!isGroup) return reply('❌ Only works in groups');
      const input = (text || args?.join(' ') || '').trim().toLowerCase();
      const cfg = getChat(from);
      if (!input) return reply(`🎀 *GC Welcome: ${cfg.welcome ? 'ON ✅' : 'OFF ❌'}*\n\n.gcwelcome on - Turn ON for THIS group only\n.gcwelcome off - Turn OFF`);
      if (input === 'on' || input === 'off') { setChat(from, { welcome: input === 'on' }); return reply(`🎀 GC Welcome ${input === 'on' ? 'ENABLED ✅ for THIS group only' : 'DISABLED ❌'}`); }
      return reply('Usage: .gcwelcome on / off');
    }
  },
  {
    command: ['gcgoodbye', 'goodbye'],
    groupOnly: true,
    adminOnly: true,
    // ✅ FIX: Collect sock here too
    run: async ({ sock, from, isGroup, reply, text, args }) => {
      if (sock) attachEngine(sock);
      if (!isGroup) return reply('❌ Only works in groups');
      const input = (text || args?.join(' ') || '').trim().toLowerCase();
      const cfg = getChat(from);
      if (!input) return reply(`🥀 *GC Goodbye: ${cfg.goodbye ? 'ON ✅' : 'OFF ❌'}*\n\n.gcgoodbye on - Turn ON for THIS group only\n.gcgoodbye off - Turn OFF`);
      if (input === 'on' || input === 'off') { setChat(from, { goodbye: input === 'on' }); return reply(`🥀 GC Goodbye ${input === 'on' ? 'ENABLED ✅ for THIS group only' : 'DISABLED ❌'}`); }
      return reply('Usage: .gcgoodbye on / off');
    }
  },
];

module.exports = commands;
module.exports.attachEngine = attachEngine;
module.exports.handleParticipantUpdate = attachEngine;
