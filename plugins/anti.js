// KNIGHT XMD - Anti System - FULLY HANDLED - Connected to handler.js
// By Faceless Tech - All 10 anti, real enforcement, warn -> delete -> kick

const clean = (jid) => (jid || '').split('@')[0].split(':')[0].replace(/[^0-9]/g, '');

const DEFAULT_ANTI = () => ({
  antilink: false,
  antibot: false,
  antispam: false,
  antiflood: false,
  antitag: false,
  antidelete: false,
  antibadword: false,
  antisticker: false,
  antifake: false,
  antipromote: false,
  antifakeCodes: ['234'], // change with .antifake 234,44
  warnCount: {}, // { senderNum: { antilink: 1 } }
});

// Cache for antidelete - store last 200 messages per group
if (!global.antiCache) global.antiCache = new Map(); // groupId -> Map(msgId -> {sender, text, type, buffer?})
if (!global.spamMap) global.spamMap = new Map(); // group+sender -> [{time, txt}]
if (!global.floodMap) global.floodMap = new Map();

function getAnti(from) {
  if (!global.db) global.db = {};
  if (!global.db.anti) global.db.anti = {};
  if (!global.db.anti[from]) global.db.anti[from] = DEFAULT_ANTI();
  // Fill missing keys if old DB
  for (const k of Object.keys(DEFAULT_ANTI())) {
    if (global.db.anti[from][k] === undefined) global.db.anti[from][k] = DEFAULT_ANTI()[k];
  }
  return global.db.anti[from];
}

function save() { if (global.dbSave) global.dbSave(); }

function parseToggle(args) {
  if (!args || !args[0]) return null;
  const v = String(args[0]).toLowerCase().trim();
  if (['on','enable','activate','1','true','yes'].includes(v)) return true;
  if (['off','disable','deactivate','0','false','no'].includes(v)) return false;
  return 'invalid';
}

// Warn system: 1st warn, 2nd delete+warn, 3rd kick (if bot admin)
async function punish(sock, from, sender, senderNum, key, label, m, isBotAdmin) {
  const anti = getAnti(from);
  if (!anti.warnCount) anti.warnCount = {};
  if (!anti.warnCount[senderNum]) anti.warnCount[senderNum] = {};
  anti.warnCount[senderNum][key] = (anti.warnCount[senderNum][key] || 0) + 1;
  const count = anti.warnCount[senderNum][key];
  save();

  // Delete message always (except 1st warn for link we still delete)
  try { await sock.sendMessage(from, { delete: m.key }); } catch {}

  if (count === 1) {
    await sock.sendMessage(from, { text: `⚠️ @${senderNum} Warning 1/3 - ${label} not allowed. Next time you go chop delete, 3rd time = kick.`, mentions: [sender] });
    return true; // handled
  }
  if (count === 2) {
    await sock.sendMessage(from, { text: `🚫 @${senderNum} Warning 2/3 - ${label} again. Last chance, next time = kick!`, mentions: [sender] });
    return true;
  }
  // 3rd time - kick if bot admin, else reset
  anti.warnCount[senderNum][key] = 0;
  save();
  if (isBotAdmin) {
    try {
      await sock.sendMessage(from, { text: `👢 @${senderNum} kicked - ${label} 3 times!`, mentions: [sender] });
      await sock.groupParticipantsUpdate(from, [sender], 'remove');
    } catch {}
  } else {
    await sock.sendMessage(from, { text: `🚫 @${senderNum} don pass 3 warnings for ${label} but bot no be admin, so I no fit kick am.`, mentions: [sender] });
  }
  return true;
}

// ===== MAIN ENFORCEMENT - Handler go call this =====
// Return true = message handled / blocked, false = allow am
async function handleAnti(sock, m, ctx) {
  const { from, sender, senderNum, isGroup, isOwner, isAdmin, isBotAdmin, body, type, msg } = ctx;
  if (!isGroup) return false;
  if (isOwner || isAdmin) return false; // Owner/Admin bypass
  if (!body && type !== 'stickerMessage' && type !== 'imageMessage') return false;

  const anti = getAnti(from);
  const hasAny = Object.keys(anti).some(k => k.startsWith('anti') && anti[k] === true);
  if (!hasAny) return false;

  const textLower = (body || '').toLowerCase();
  const mentioned = msg.extendedTextMessage?.contextInfo?.mentionedJid || msg.imageMessage?.contextInfo?.mentionedJid || [];
  const isBotMsg = m.key.id?.startsWith('BAE5') || m.key.id?.startsWith('3EB0');

  // 1. ANTI-STICKER - fastest
  if (anti.antisticker && type === 'stickerMessage') {
    return await punish(sock, from, sender, senderNum, 'antisticker', 'Sticker', m, isBotAdmin);
  }

  // 2. ANTI-FAKE - kick immediately, no warn
  if (anti.antifake) {
    const allowed = anti.antifakeCodes || ['234'];
    if (!allowed.some(c => senderNum.startsWith(String(c).replace('+','')))) {
      try {
        await sock.sendMessage(from, { text: `🌍 @${senderNum} removed - Fake number not allowed. Only +${allowed.join(', +')} allowed.`, mentions: [sender] });
        if (isBotAdmin) await sock.groupParticipantsUpdate(from, [sender], 'remove');
      } catch {}
      return true;
    }
  }

  // 3. ANTI-BOT - other bots
  if (anti.antibot && isBotMsg) {
    return await punish(sock, from, sender, senderNum, 'antibot', 'Bot Message', m, isBotAdmin);
  }

  // 4. ANTI-TAG - tag 5+ people
  if (anti.antitag && mentioned.length >= 5) {
    return await punish(sock, from, sender, senderNum, 'antitag', `Tagging ${mentioned.length} people`, m, isBotAdmin);
  }

  // 5. ANTI-LINK - allow this group link itself, delete others
  if (anti.antilink) {
    const linkRegex = /(https?:\/\/|www\.|wa\.me\/|chat\.whatsapp\.com|t\.me\/|instagram\.com|tiktok\.com|youtube\.com|discord\.gg|bit\.ly)/i;
    if (linkRegex.test(body)) {
      // Allow if na this group invite link - check group code
      let isOwnLink = false;
      try {
        const code = await sock.groupInviteCode(from);
        if (body.includes(code)) isOwnLink = true;
      } catch {}
      if (!isOwnLink) {
        return await punish(sock, from, sender, senderNum, 'antilink', 'Link', m, isBotAdmin);
      }
    }
  }

  // 6. ANTI-PROMOTE
  if (anti.antipromote && /(dm me|dm for|join my group|join my channel|check my bio|follow me|subscribe to|promo|advert|earn money|chat\.whatsapp\.com\/|wa\.me\/)/i.test(textLower)) {
    // Don't double punish if antilink already caught it
    if (!/(chat\.whatsapp\.com|wa\.me\/)/i.test(body)) {
      return await punish(sock, from, sender, senderNum, 'antipromote', 'Promotion', m, isBotAdmin);
    }
  }

  // 7. ANTI-BADWORD - big list
  if (anti.antibadword) {
    const bad = ['fuck','f*ck','shit','bitch','sex','porn','dick','pussy','nigga','nigger','motherfucker','bastard','whore','slut','cock','penis','vagina','fucking','asshole'];
    if (bad.some(w => textLower.includes(w))) {
      return await punish(sock, from, sender, senderNum, 'antibadword', 'Bad Word', m, isBotAdmin);
    }
  }

  // 8. ANTI-SPAM + ANTI-FLOOD
  if (anti.antispam || anti.antiflood) {
    const key = from + ':' + sender;
    const now = Date.now();
    if (!global.spamMap.has(key)) global.spamMap.set(key, []);
    let arr = global.spamMap.get(key).filter(x => now - x.time < 10000);
    arr.push({ time: now, txt: body });
    global.spamMap.set(key, arr);

    const last5s = arr.filter(x => now - x.time < 5000);
    const sameTxt = arr.filter(x => x.txt === body && body.length > 0);

    if (anti.antiflood && last5s.length > 6) {
      global.spamMap.set(key, []);
      return await punish(sock, from, sender, senderNum, 'antiflood', 'Flooding (6 msgs in 5s)', m, isBotAdmin);
    }
    if (anti.antispam && sameTxt.length > 3 && body.length > 2) {
      global.spamMap.set(key, []);
      return await punish(sock, from, sender, senderNum, 'antispam', 'Spam (same msg 3x)', m, isBotAdmin);
    }
  }

  return false;
}

// Cache message for antidelete
function cacheMessage(from, m, body, type) {
  if (!global.antiCache.has(from)) global.antiCache.set(from, new Map());
  const map = global.antiCache.get(from);
  map.set(m.key.id, { sender: m.key.participant || m.key.remoteJid, senderNum: clean(m.key.participant || ''), text: body, type, time: Date.now() });
  if (map.size > 200) {
    const first = map.keys().next().value;
    map.delete(first);
  }
}

// Handle delete event - call from connection.js
async function handleDelete(sock, update) {
  const groupId = update.key.remoteJid;
  if (!groupId?.endsWith('@g.us')) return;
  const anti = getAnti(groupId);
  if (!anti.antidelete) return;
  const cached = global.antiCache.get(groupId)?.get(update.key.id);
  if (!cached) {
    await sock.sendMessage(groupId, { text: `🗑️ Anti-Delete: Someone delete message but I no catch am (bot restart?)` });
    return;
  }
  await sock.sendMessage(groupId, {
    text: `🗑️ *ANTI-DELETE*\n\n👤 @${cached.senderNum} delete this message:\n\n${cached.text || `[${cached.type} - no text]`}\n\n⏰ ${new Date(cached.time).toLocaleTimeString('en-NG')}`,
    mentions: [cached.sender]
  });
}

// ===== TOGGLE =====
function toggle({ reply, from, args, key, label, emoji, onMsg, offMsg, isGroup, text }) {
  if (!isGroup) return reply('❌ Anti commands only work in a group.');
  const anti = getAnti(from);
  // Special: .antifake 234,44 - set allowed codes
  if (key === 'antifake' && text && !['on','off'].includes(text.toLowerCase())) {
    const codes = text.split(',').map(c => c.replace(/[^0-9]/g, '')).filter(Boolean);
    if (codes.length) {
      anti.antifakeCodes = codes;
      anti.antifake = true;
      save();
      return reply(`🌍 Anti-Fake ON - Allowed: +${codes.join(', +')}`);
    }
  }
  const parsed = parseToggle(args || []);
  if (parsed === null) {
    return reply(`> ╭══〘 ${emoji} ${label} 〙══⊷❍\n> ┃✯╭──────────────\n> ┃✯│ Status: ${anti[key] ? 'ON ✅' : 'OFF ❌'}\n> ┃✯│ Usage: .${key} on / off\n> ┃✯╰───────────────\n> ╰═══════════════════⊷❍`);
  }
  if (parsed === 'invalid') return reply(`❌ Invalid. Use: .${key} on  OR  .${key} off`);
  anti[key] = parsed;
  save();
  return reply(`> ╭══〘 ${emoji} ${label} 〙══⊷❍\n> ┃✯╭──────────────\n> ┃✯│ Status: ${parsed ? 'ON ✅' : 'OFF ❌'}\n> ┃✯│ ${parsed ? onMsg : offMsg}\n> ┃✯╰───────────────\n> ╰═══════════════════⊷❍`);
}

const commands = [
  { command: ['antilink'], adminOnly: true, run: async (ctx) => toggle({ ...ctx, key: 'antilink', label: 'ANTI-LINK', emoji: '🔗', onMsg: 'All links will be auto-deleted (except this group link)', offMsg: 'Links allowed now' }) },
  { command: ['antibot'], adminOnly: true, run: async (ctx) => toggle({ ...ctx, key: 'antibot', label: 'ANTI-BOT', emoji: '🤖', onMsg: 'Other bots will be warned / kicked', offMsg: 'Bots allowed now' }) },
  { command: ['antispam'], adminOnly: true, run: async (ctx) => toggle({ ...ctx, key: 'antispam', label: 'ANTI-SPAM', emoji: '🚫', onMsg: 'Same message 3x in 10s = warn/kick', offMsg: 'Spam allowed now' }) },
  { command: ['antiflood'], adminOnly: true, run: async (ctx) => toggle({ ...ctx, key: 'antiflood', label: 'ANTI-FLOOD', emoji: '🌊', onMsg: '6 messages in 5s = warn/kick', offMsg: 'Flooding allowed now' }) },
  { command: ['antitag'], adminOnly: true, run: async (ctx) => toggle({ ...ctx, key: 'antitag', label: 'ANTI-TAG', emoji: '🏷️', onMsg: 'Tagging 5+ people = warn/kick', offMsg: 'Tagging allowed now' }) },
  { command: ['antidelete'], adminOnly: true, run: async (ctx) => toggle({ ...ctx, key: 'antidelete', label: 'ANTI-DELETE', emoji: '🗑️', onMsg: 'Deleted messages will be recovered and re-sent', offMsg: 'Deleted messages will not be recovered' }) },
  { command: ['antibadword'], adminOnly: true, run: async (ctx) => toggle({ ...ctx, key: 'antibadword', label: 'ANTI-BADWORD', emoji: '🤬', onMsg: 'Bad words will be auto-deleted', offMsg: 'Bad words allowed now' }) },
  { command: ['antisticker'], adminOnly: true, run: async (ctx) => toggle({ ...ctx, key: 'antisticker', label: 'ANTI-STICKER', emoji: '🏷️', onMsg: 'All stickers will be auto-deleted', offMsg: 'Stickers allowed now' }) },
  { command: ['antifake'], adminOnly: true, run: async (ctx) => toggle({ ...ctx, key: 'antifake', label: 'ANTI-FAKE', emoji: '🌍', onMsg: 'Only +234 numbers allowed, others will be removed', offMsg: 'All numbers allowed now' }) },
  { command: ['antipromote'], adminOnly: true, run: async (ctx) => toggle({ ...ctx, key: 'antipromote', label: 'ANTI-PROMOTE', emoji: '⬆️', onMsg: 'Promotion / DM me / Join my group = deleted', offMsg: 'Promotion allowed now' }) },
  {
    command: ['antistatus', 'antilist'],
    adminOnly: true,
    run: async ({ reply, from, isGroup }) => {
      if (!isGroup) return reply('❌ Only in group.');
      const a = getAnti(from);
      const line = (name, v) => `┆ ${v ? '✅' : '❌'} ${name}: ${v ? 'ON' : 'OFF'}`;
      await reply(`> ╭══〘 🛡️ ANTI STATUS 〙══⊷❍\n> ┃✯╭──────────────\n> ┃✯│ ${line('AntiLink', a.antilink)}\n> ┃✯│ ${line('AntiBot', a.antibot)}\n> ┃✯│ ${line('AntiSpam', a.antispam)}\n> ┃✯│ ${line('AntiFlood', a.antiflood)}\n> ┃✯│ ${line('AntiTag', a.antitag)}\n> ┃✯│ ${line('AntiDelete', a.antidelete)}\n> ┃✯│ ${line('AntiBadword', a.antibadword)}\n> ┃✯│ ${line('AntiSticker', a.antisticker)}\n> ┃✯│ ${line('AntiFake', a.antifake)} (+${(a.antifakeCodes||[]).join(',+')})\n> ┃✯│ ${line('AntiPromote', a.antipromote)}\n> ┃✯╰───────────────\n> ╰═══════════════════⊷❍`);
    }
  },
  {
    command: ['antiall', 'antion', 'antioff'],
    adminOnly: true,
    run: async ({ reply, from, isGroup, command }) => {
      if (!isGroup) return reply('❌ Only in group.');
      const a = getAnti(from);
      const val = command === 'antioff' ? false : true;
      ['antilink','antibot','antispam','antiflood','antitag','antidelete','antibadword','antisticker','antifake','antipromote'].forEach(k => a[k] = val);
      save();
      await reply(val ? '✅ All anti ON' : '❌ All anti OFF');
    }
  },
  {
    command: ['antiwarn', 'warnings', 'warnlist'],
    adminOnly: true,
    run: async ({ reply, from, isGroup }) => {
      if (!isGroup) return reply('❌ Only in group.');
      const a = getAnti(from);
      const warns = a.warnCount || {};
      const entries = Object.entries(warns).filter(([_, v]) => Object.values(v).some(n => n > 0));
      if (!entries.length) return reply('✅ No warnings yet');
      let t = `⚠️ *WARNINGS*\n\n`;
      entries.forEach(([num, v]) => {
        t += `@${num}: ${Object.entries(v).map(([k, n]) => `${k}=${n}`).join(', ')}\n`;
      });
      await reply(t);
    }
  },
  {
    command: ['resetwarn', 'clearwarn'],
    adminOnly: true,
    run: async ({ reply, from, isGroup }) => {
      if (!isGroup) return reply('❌ Only in group.');
      getAnti(from).warnCount = {};
      save();
      await reply('✅ All warnings cleared');
    }
  },
];

// Export array + helpers for handler.js
module.exports = commands;
module.exports.handleAnti = handleAnti;
module.exports.cacheMessage = cacheMessage;
module.exports.handleDelete = handleDelete;
module.exports.getAnti = getAnti;
