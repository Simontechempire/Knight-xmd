// KNIGHT XMD - Sudo Control - REAL
// File: plugins/sudo.js
// Works in PRIVATE + GROUP. Owner only fit add/remove sudo.
// Sudo = fit use owner commands, but no fit add/remove sudo.

const fs = require('fs');
const path = require('path');

const SUDO_PATH = path.join(__dirname, '../database/sudo.json');

function loadSudo() {
  try { return JSON.parse(fs.readFileSync(SUDO_PATH, 'utf8')); } catch { return { sudo: [] }; }
}
function saveSudo(d) {
  if (!fs.existsSync(path.dirname(SUDO_PATH))) fs.mkdirSync(path.dirname(SUDO_PATH), { recursive: true });
  fs.writeFileSync(SUDO_PATH, JSON.stringify(d, null, 2));
}

const clean = (j) => String(j || '').split(':')[0].split('@')[0].replace(/[^0-9]/g, '');

function getOwnerNum() {
  try {
    const config = require('../config');
    const n = clean(config.creatorNumber || config.ownerNumber || config.owner || process.env.OWNER_NUMBER || '');
    if (n) return n;
  } catch {}
  return clean(process.env.OWNER_NUMBER || '');
}

function getTarget(m, args) {
  // 1. Reply to person - REAL quoted participant
  const ctx = m.message?.extendedTextMessage?.contextInfo
    || m.message?.imageMessage?.contextInfo
    || m.message?.videoMessage?.contextInfo
    || m.message?.stickerMessage?.contextInfo
    || null;
  if (ctx?.participant) return clean(ctx.participant);
  // 2. Mention
  if (ctx?.mentionedJid?.[0]) return clean(ctx.mentionedJid[0]);
  // 3. Number for arg: .addsudo 2348100000000
  if (args[0]) return clean(args[0]);
  return null;
}

// Helper for other plugins to use - REAL
function isOwnerOrSudo(m, from) {
  const owner = getOwnerNum();
  const sender = clean(m.key?.participant || m.key?.remoteJid || from);
  if (m.key?.fromMe) return true;
  if (owner && sender === owner) return true;
  const db = loadSudo();
  return (db.sudo || []).includes(sender);
}
function isOwner(m, from) {
  const owner = getOwnerNum();
  const sender = clean(m.key?.participant || m.key?.remoteJid || from);
  return m.key?.fromMe || (owner && sender === owner);
}

module.exports = [
  // ========== ADDSUDO - REAL ==========
  {
    command: ['addsudo', 'sudoadd', 'addowner'],
    // NO groupOnly - must work for private DM too
    run: async ({ m, from, reply, args }) => {
      if (!isOwner(m, from)) return reply('❌ Only Owner fit add sudo.');
      const target = getTarget(m, args);
      if (!target) return reply('❌ Use: Reply to person + `.addsudo`\nOr: `.addsudo 2348100000000`\nOr: `.addsudo @person`');

      const owner = getOwnerNum();
      if (target === owner) return reply('❌ That person na Owner already.');

      const db = loadSudo();
      db.sudo = db.sudo || [];
      if (db.sudo.includes(target)) return reply(`✅ @${target} don already be Sudo.`);
      db.sudo.push(target);
      saveSudo(db);
      return reply(`✅ *SUDO ADDED*\n\n👤 @${target}\n👑 By Owner\n\nE fit now use owner commands.`, { mentions: [target + '@s.whatsapp.net'] });
    }
  },

  // ========== DESUDO / DELSUDO - REAL ==========
  {
    command: ['desudo', 'delsudo', 'remsudo', 'removesudo', 'delowner'],
    run: async ({ m, from, reply, args }) => {
      if (!isOwner(m, from)) return reply('❌ Only Owner fit remove sudo.');
      const target = getTarget(m, args);
      if (!target) return reply('❌ Use: Reply to person + `.desudo`\nOr: `.desudo 2348100000000`');

      const db = loadSudo();
      db.sudo = db.sudo || [];
      if (!db.sudo.includes(target)) return reply(`❌ @${target} no be sudo.`);
      db.sudo = db.sudo.filter(n => n !== target);
      saveSudo(db);
      return reply(`✅ *SUDO REMOVED*\n\n👤 @${target}\nE no fit use owner commands again.`, { mentions: [target + '@s.whatsapp.net'] });
    }
  },

  // ========== SUDO LIST - REAL ==========
  {
    command: ['sudo', 'sudos', 'listsudo', 'sudo-list'],
    run: async ({ m, from, reply, args }) => {
      // Owner + Sudo fit see list, even for private
      if (!isOwnerOrSudo(m, from)) return reply('❌ Only Owner / Sudo fit see this list.');
      const sub = (args[0] || '').toLowerCase();
      if (sub === 'list' || !sub) {
        const db = loadSudo();
        const owner = getOwnerNum();
        let text = `👑 *SUDO LIST*\n\n👑 Owner: +${owner}\n\n`;
        if (!db.sudo?.length) text += 'No sudo yet.\n\nAdd with: `.addsudo 234...`';
        else text += db.sudo.map((n, i) => `${i + 1}. @${n}`).join('\n');
        const mentions = [...(db.sudo || []).map(n => n + '@s.whatsapp.net'), owner ? owner + '@s.whatsapp.net' : ''].filter(Boolean);
        return reply(text, { mentions });
      }
      return reply('Usage: `.sudo` to see list\n`.addsudo` / `.desudo` to add/remove');
    }
  },

  // ========== OWNER - Your style, fixed to work for private ==========
  {
    command: ['owner', 'creator'],
    run: async ({ reply, sock, from, m }) => {
      // Must work for private DM too - no groupOnly
      let config = {};
      try { config = require('../config'); } catch {}
      const creatorNum = clean(config.creatorNumber || config.ownerNumber || process.env.OWNER_NUMBER || '');
      const creatorName = config.creatorName || 'Knight XMD Owner';
      if (!creatorNum) return reply('❌ Owner number no set for .env / config. Set OWNER_NUMBER=234...');

      await reply(`👑 *CREATOR*\n\n👤 Name: ${creatorName}\n📞 Number: +${creatorNum}\n💬 Contact if bot has error\n🔗 wa.me/${creatorNum}`);
      try {
        const vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:${creatorName}\nORG:Knight XMD\nTEL;type=CELL;type=VOICE;waid=${creatorNum}:+${creatorNum}\nEND:VCARD`;
        await sock.sendMessage(from, { contacts: { displayName: creatorName, contacts: [{ vcard }] } });
      } catch {}
    }
  }
];

// Export for other plugins to check sudo - REAL, no guess
module.exports.isOwnerOrSudo = isOwnerOrSudo;
module.exports.isOwner = isOwner;
module.exports.loadSudo = loadSudo;
