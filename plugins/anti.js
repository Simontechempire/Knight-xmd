// KNIGHT XMD - Anti System - REAL - No Demo, No Placeholder - FIXED
// By Faceless Tech - Real media cache, real join kick, real delete recovery
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

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
  antifakeCodes: ['234'],
  warnCount: {},
});

if (!global.antiCache) global.antiCache = new Map();
if (!global.spamMap) global.spamMap = new Map();

function getAnti(from) {
  if (!global.db) global.db = {};
  if (!global.db.anti) global.db.anti = {};
  if (!global.db.anti[from]) global.db.anti[from] = DEFAULT_ANTI();
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

async function punish(sock, from, sender, senderNum, key, label, m, isBotAdmin) {
  const anti = getAnti(from);
  if (!anti.warnCount) anti.warnCount = {};
  if (!anti.warnCount[senderNum]) anti.warnCount[senderNum] = {};
  anti.warnCount[senderNum][key] = (anti.warnCount[senderNum][key] || 0) + 1;
  const count = anti.warnCount[senderNum][key];
  save();

  try { await sock.sendMessage(from, { delete: m.key }); } catch {}

  if (count === 1) {
    await sock.sendMessage(from, { text: `⚠️ @${senderNum} Warning 1/3 - ${label} not allowed.`, mentions: [sender] });
    return true;
  }
  if (count === 2) {
    await sock.sendMessage(from, { text: `🚫 @${senderNum} Warning 2/3 - ${label} again. Last chance!`, mentions: [sender] });
    return true;
  }
  anti.warnCount[senderNum][key] = 0;
  save();
  if (isBotAdmin) {
    try {
      await sock.sendMessage(from, { text: `👢 @${senderNum} kicked - ${label} 3 times!`, mentions: [sender] });
      await sock.groupParticipantsUpdate(from, [sender], 'remove');
    } catch {}
  } else {
    await sock.sendMessage(from, { text: `🚫 @${senderNum} don pass 3 warnings for ${label} but bot no be admin, so I no fit kick am. Make me admin.`, mentions: [sender] });
  }
  return true;
}

// ===== REAL: Resolve real phone from LID via groupMetadata =====
async function getRealNum(sock, from, senderJid) {
  try {
    const g = await sock.groupMetadata(from);
    const p = g.participants.find(x => x.id === senderJid || x.lid === senderJid || x.pn === senderJid);
    if (p?.pn) return clean(p.pn);
    if (p?.id?.endsWith('@s.whatsapp.net')) return clean(p.id);
    return clean(senderJid);
  } catch { return clean(senderJid); }
}

// FIX 1: ctx fit be undefined - derive everything from m if handler no pass ctx
async function handleAnti(sock, m, ctx = {}) {
  try {
    const from = ctx.from || m.key?.remoteJid;
    const sender = ctx.sender || m.key?.participant || m.key?.remoteJid;
    if (!from?.endsWith('@g.us')) return false;
    if (m.key?.fromMe) return false;
    if (!sender) return false;

    const msg = m.message || ctx.msg || {};
    const type = ctx.type || Object.keys(msg)[0] || '';
    const body = ctx.body ?? msg.conversation ?? msg.extendedTextMessage?.text ?? msg.imageMessage?.caption ?? msg.videoMessage?.caption ?? msg.documentMessage?.caption ?? '';

    // Derive admin / owner if handler no pass am - FIX: no crash if ctx empty
    let { isOwner, isAdmin, isBotAdmin } = ctx;
    let senderNum = ctx.senderNum;
    if (isAdmin === undefined || isBotAdmin === undefined || !senderNum) {
      try {
        const g = await sock.groupMetadata(from);
        const meJid = sock.user?.id;
        const me = g.participants.find(x => x.id === meJid || clean(x.id) === clean(meJid) || x.lid === sock.user?.lid);
        if (isBotAdmin === undefined) isBotAdmin = !!(me && (me.admin === 'admin' || me.admin === 'superadmin'));
        const p = g.participants.find(x => x.id === sender || x.lid === sender || x.pn === sender);
        if (isAdmin === undefined) isAdmin = !!(p && (p.admin === 'admin' || p.admin === 'superadmin'));
        if (!senderNum) senderNum = p?.pn ? clean(p.pn) : clean(sender);
      } catch { if (!senderNum) senderNum = clean(sender); }
    }
    if (isOwner === undefined) isOwner = false;
    if (isOwner || isAdmin) return false;
    if (!body && type !== 'stickerMessage' && type !== 'imageMessage' && type !== 'videoMessage') return false;

    const anti = getAnti(from);
    const hasAny = Object.keys(anti).some(k => k.startsWith('anti') && anti[k] === true);
    if (!hasAny) return false;

    const textLower = (body || '').toLowerCase();
    const mentioned = msg.extendedTextMessage?.contextInfo?.mentionedJid || msg.imageMessage?.contextInfo?.mentionedJid || msg.videoMessage?.contextInfo?.mentionedJid || [];

    // 1. ANTI-STICKER
    if (anti.antisticker && type === 'stickerMessage') {
      return await punish(sock, from, sender, senderNum, 'antisticker', 'Sticker', m, isBotAdmin);
    }

    // 2. ANTI-FAKE - REAL number, not LID
    if (anti.antifake) {
      const real = await getRealNum(sock, from, sender);
      const allowed = anti.antifakeCodes || ['234'];
      if (!allowed.some(c => real.startsWith(String(c).replace('+','')))) {
        try {
          await sock.sendMessage(from, { text: `🌍 @${real} removed - Fake number not allowed. Only +${allowed.join(', +')} allowed.`, mentions: [sender] });
          if (isBotAdmin) await sock.groupParticipantsUpdate(from, [sender], 'remove');
        } catch {}
        return true;
      }
    }

    // 3. ANTI-BOT - FIX: BAE5/3EB0 na normal ID, no be bot. Real check = sender JID get @bot OR message get bot flag
    if (anti.antibot) {
      const isBotSender = sender.endsWith('@bot') || !!msg.extendedTextMessage?.contextInfo?.isBot || !!m.message?.botMessage;
      // Only punish if na real bot account, no be human wey type .menu
      if (isBotSender) {
        return await punish(sock, from, sender, senderNum, 'antibot', 'Bot Message', m, isBotAdmin);
      }
    }

    // 4. ANTI-TAG
    if (anti.antitag && mentioned.length >= 5) {
      return await punish(sock, from, sender, senderNum, 'antitag', `Tagging ${mentioned.length} people`, m, isBotAdmin);
    }

    // 5. ANTI-LINK - allow only this group link
    if (anti.antilink) {
      const linkRegex = /(https?:\/\/|www\.|wa\.me\/|chat\.whatsapp\.com|t\.me\/|instagram\.com|tiktok\.com|youtube\.com|discord\.gg|bit\.ly)/i;
      if (linkRegex.test(body)) {
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
    if (anti.antipromote && /(dm me|dm for|join my group|join my channel|check my bio|follow me|subscribe to|promo|advert|earn money)/i.test(textLower)) {
      if (!/(chat\.whatsapp\.com|wa\.me\/)/i.test(body)) {
        return await punish(sock, from, sender, senderNum, 'antipromote', 'Promotion', m, isBotAdmin);
      }
    }

    // 7. ANTI-BADWORD
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
  } catch (e) { console.log('[ANTI ERROR]', e.message); return false; }
}

// ===== REAL CACHE - Download real media =====
async function cacheMessage(sock, from, m, body, type) {
  try {
    if (!global.antiCache.has(from)) global.antiCache.set(from, new Map());
    const map = global.antiCache.get(from);
    const sender = m.key.participant || m.key.remoteJid;
    let entry = { sender, senderNum: clean(sender), text: body, type, time: Date.now(), buffer: null, mimetype: null, mediaType: null };

    const anti = getAnti(from);
    if (anti.antidelete) {
      try {
        const mediaMsg = m.message?.imageMessage || m.message?.videoMessage || m.message?.stickerMessage || m.message?.audioMessage || m.message?.documentMessage;
        if (mediaMsg) {
          let mType = 'image';
          if (m.message.videoMessage) mType = 'video';
          else if (m.message.stickerMessage) mType = 'sticker';
          else if (m.message.audioMessage) mType = 'audio';
          else if (m.message.documentMessage) mType = 'document';
          // FIX: sock.downloadMediaMessage no exist - use downloadContentFromMessage
          const stream = await downloadContentFromMessage(mediaMsg, mType === 'audio' ? 'audio' : mType === 'document' ? 'document' : mType === 'sticker' ? 'sticker' : mType === 'video' ? 'video' : 'image');
          let buf = Buffer.from([]);
          for await (const c of stream) buf = Buffer.concat([buf, c]);
          if (buf && buf.length > 100) { entry.buffer = buf; entry.mimetype = mediaMsg.mimetype || ''; entry.mediaType = mType; }
        }
      } catch {}
    }
    map.set(m.key.id, entry);
    if (map.size > 200) { const first = map.keys().next().value; map.delete(first); }
  } catch {}
}

// ===== REAL DELETE - FIX: Baileys update na {key, update} =====
async function handleDelete(sock, update) {
  try {
    const key = update.key || update;
    const groupId = key.remoteJid;
    if (!groupId?.endsWith('@g.us')) return;
    const anti = getAnti(groupId);
    if (!anti.antidelete) return;
    const cached = global.antiCache.get(groupId)?.get(key.id);
    if (!cached) {
      await sock.sendMessage(groupId, { text: `🗑️ Anti-Delete: Someone delete message but I no catch am (bot restart?)` });
      return;
    }
    const header = `🗑️ *ANTI-DELETE*\n\n👤 @${cached.senderNum} delete this message:\n⏰ ${new Date(cached.time).toLocaleTimeString('en-NG')}\n\n`;
    try {
      if (cached.buffer && cached.mediaType === 'image') {
        await sock.sendMessage(groupId, { image: cached.buffer, caption: header + (cached.text || ''), mentions: [cached.sender] });
      } else if (cached.buffer && cached.mediaType === 'video') {
        await sock.sendMessage(groupId, { video: cached.buffer, caption: header + (cached.text || ''), mentions: [cached.sender] });
      } else if (cached.buffer && cached.mediaType === 'sticker') {
        await sock.sendMessage(groupId, { sticker: cached.buffer, mentions: [cached.sender] });
        await sock.sendMessage(groupId, { text: header + `Sticker from @${cached.senderNum}`, mentions: [cached.sender] });
      } else if (cached.buffer && cached.mediaType === 'audio') {
        await sock.sendMessage(groupId, { audio: cached.buffer, mimetype: cached.mimetype || 'audio/mp4', mentions: [cached.sender] });
      } else if (cached.buffer && cached.mediaType === 'document') {
        await sock.sendMessage(groupId, { document: cached.buffer, fileName: 'deleted-file', mimetype: cached.mimetype || 'application/octet-stream', mentions: [cached.sender] });
      } else {
        await sock.sendMessage(groupId, { text: header + (cached.text || `[${cached.type} - no text]`), mentions: [cached.sender] });
      }
    } catch {
      await sock.sendMessage(groupId, { text: header + (cached.text || ''), mentions: [cached.sender] });
    }
  } catch {}
}

// ===== REAL ANTI-FAKE ON JOIN =====
async function handleParticipantUpdate(sock, update) {
  try {
    const { id, participants, action } = update;
    if (!id?.endsWith('@g.us')) return;
    if (action !== 'add') return;
    const anti = getAnti(id);
    if (!anti.antifake) return;
    const allowed = anti.antifakeCodes || ['234'];
    for (const p of participants) {
      let real = clean(p);
      try {
        const g = await sock.groupMetadata(id);
        const found = g.participants.find(x => x.id === p || x.lid === p || x.pn === p);
        if (found?.pn) real = clean(found.pn);
        else if (found?.id?.endsWith('@s.whatsapp.net')) real = clean(found.id);
      } catch {}
      if (!allowed.some(c => real.startsWith(String(c).replace('+','')))) {
        try {
          const g = await sock.groupMetadata(id);
          const botId = sock.user?.id;
          const me = g.participants.find(x => x.id === botId || x.lid === sock.user?.lid || clean(x.id) === clean(botId));
          if (me?.admin) {
            await sock.sendMessage(id, { text: `🌍 @${real} removed - Fake number not allowed. Only +${allowed.join(', +')} allowed.`, mentions: [p] });
            await sock.groupParticipantsUpdate(id, [p], 'remove');
          }
        } catch {}
      }
    }
  } catch {}
}

// FIX: antifake codes - check args[0] first, no be text wey fit contain command
function toggle({ reply, from, args, key, label, emoji, onMsg, offMsg, isGroup }) {
  if (!isGroup) return reply('❌ Anti commands only work in a group.');
  const anti = getAnti(from);
  if (key === 'antifake') {
    const first = String(args?.[0] || '').toLowerCase();
    // .antifake 234,233  OR  .antifake 234
    if (first && !['on','off','enable','disable'].includes(first)) {
      const codes = first.split(',').map(c => c.replace(/[^0-9]/g, '')).filter(Boolean);
      if (codes.length) {
        anti.antifakeCodes = codes;
        anti.antifake = true;
        save();
        return reply(`🌍 Anti-Fake ON - Allowed: +${codes.join(', +')}`);
      }
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
  { command: ['antidelete'], adminOnly: true, run: async (ctx) => toggle({ ...ctx, key: 'antidelete', label: 'ANTI-DELETE', emoji: '🗑️', onMsg: 'Deleted messages will be recovered and re-sent - including images/videos', offMsg: 'Deleted messages will not be recovered' }) },
  { command: ['antibadword'], adminOnly: true, run: async (ctx) => toggle({ ...ctx, key: 'antibadword', label: 'ANTI-BADWORD', emoji: '🤬', onMsg: 'Bad words will be auto-deleted', offMsg: 'Bad words allowed now' }) },
  { command: ['antisticker'], adminOnly: true, run: async (ctx) => toggle({ ...ctx, key: 'antisticker', label: 'ANTI-STICKER', emoji: '🏷️', onMsg: 'All stickers will be auto-deleted', offMsg: 'Stickers allowed now' }) },
  { command: ['antifake'], adminOnly: true, run: async (ctx) => toggle({ ...ctx, key: 'antifake', label: 'ANTI-FAKE', emoji: '🌍', onMsg: 'Only +234 numbers allowed, others will be removed on join', offMsg: 'All numbers allowed now' }) },
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
  // FIX: split antion / antioff - no rely on ctx.command
  {
    command: ['antiall', 'antion'],
    adminOnly: true,
    run: async ({ reply, from, isGroup }) => {
      if (!isGroup) return reply('❌ Only in group.');
      const a = getAnti(from);
      ['antilink','antibot','antispam','antiflood','antitag','antidelete','antibadword','antisticker','antifake','antipromote'].forEach(k => a[k] = true);
      save();
      await reply('✅ All anti ON');
    }
  },
  {
    command: ['antioff'],
    adminOnly: true,
    run: async ({ reply, from, isGroup }) => {
      if (!isGroup) return reply('❌ Only in group.');
      const a = getAnti(from);
      ['antilink','antibot','antispam','antiflood','antitag','antidelete','antibadword','antisticker','antifake','antipromote'].forEach(k => a[k] = false);
      save();
      await reply('❌ All anti OFF');
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
      entries.forEach(([num, v]) => { t += `@${num}: ${Object.entries(v).map(([k, n]) => `${k}=${n}`).join(', ')}\n`; });
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

module.exports = commands;
module.exports.handleAnti = handleAnti;
module.exports.cacheMessage = cacheMessage;
module.exports.handleDelete = handleDelete;
