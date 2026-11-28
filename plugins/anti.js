// KNIGHT XMD - Anti System - REAL - No Demo, No Placeholder
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

const clean = (jid) => (jid || '').split('@')[0].split(':')[0].replace(/[^0-9]/g, '');

// Bold keyboard style: A-Z, a-z, 0-9
function bold(str) {
  const map = {};
  const A = '𝐀𝐁𝐂𝐃𝐄𝐅𝐆𝐇𝐈𝐉𝐊𝐋𝐌𝐍𝐎𝐏𝐐𝐑𝐒𝐓𝐔𝐕𝐖𝐗𝐘𝐙';
  const a = '𝐚𝐛𝐜𝐝𝐞𝐟𝐠𝐡𝐢𝐣𝐤𝐥𝐦𝐧𝐨𝐩𝐪𝐫𝐬𝐭𝐮𝐯𝐰𝐱𝐲𝐳';
  const n = '𝟎𝟏𝟐𝟑𝟒𝟓𝟔𝟕𝟖𝟗';
  for (let i = 0; i < 26; i++) { map[String.fromCharCode(65+i)] = A[i]; map[String.fromCharCode(97+i)] = a[i]; }
  for (let i = 0; i < 10; i++) map[String(i)] = n[i];
  return String(str).split('').map(c => map[c] || c).join('');
}

const DEFAULT_ANTI = () => ({
  antilink: false, antibot: false, antispam: false, antiflood: false,
  antitag: false, antidelete: false, antibadword: false, antisticker: false,
  antifake: false, antipromote: false, antifakeCodes: ['234'], warnCount: {},
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

// FIX: Toggle now reads args OR text OR body - not args only
function getToggleArg(ctx) {
  if (ctx.args && ctx.args.length) return String(ctx.args[0]).toLowerCase().trim();
  const txt = String(ctx.text || ctx.body || '').trim().split(/\s+/);
  // .antilink on -> txt = ["on"], .antilink 234 -> ["234"]
  // If handler passes full text ".antilink on", drop first word
  if (txt.length >= 2 && txt[0].startsWith('.')) return txt[1].toLowerCase();
  if (txt.length >= 1 && !txt[0].startsWith('.')) return txt[0].toLowerCase();
  return '';
}

function parseToggleValue(v) {
  if (['on','enable','activate','1','true','yes'].includes(v)) return true;
  if (['off','disable','deactivate','0','false','no'].includes(v)) return false;
  if (!v) return null;
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
    await sock.sendMessage(from, { text: `⚠️ @${senderNum} - ${bold('Warning 1/3')} - ${bold(label)} ${bold('is not allowed.')}`, mentions: [sender] });
    return true;
  }
  if (count === 2) {
    await sock.sendMessage(from, { text: `🚫 @${senderNum} - ${bold('Warning 2/3')} - ${bold(label)} ${bold('again. This is your last chance!')}`, mentions: [sender] });
    return true;
  }
  anti.warnCount[senderNum][key] = 0;
  save();
  if (isBotAdmin) {
    try {
      await sock.sendMessage(from, { text: `👢 @${senderNum} ${bold('has been removed')} - ${bold(label)} ${bold('3 times!')}`, mentions: [sender] });
      await sock.groupParticipantsUpdate(from, [sender], 'remove');
    } catch {}
  } else {
    await sock.sendMessage(from, { text: `🚫 @${senderNum} ${bold('has exceeded 3 warnings for')} ${bold(label)} ${bold('but the bot is not an admin, so it cannot remove the user. Please make the bot an admin.')}`, mentions: [sender] });
  }
  return true;
}

async function getRealNum(sock, from, senderJid) {
  try {
    const g = await sock.groupMetadata(from);
    const p = g.participants.find(x => x.id === senderJid || x.lid === senderJid || x.pn === senderJid);
    if (p?.pn) return clean(p.pn);
    if (p?.id?.endsWith('@s.whatsapp.net')) return clean(p.id);
    return clean(senderJid);
  } catch { return clean(senderJid); }
}

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

    if (anti.antisticker && type === 'stickerMessage') return await punish(sock, from, sender, senderNum, 'antisticker', 'Sticker', m, isBotAdmin);
    if (anti.antifake) {
      const real = await getRealNum(sock, from, sender);
      const allowed = anti.antifakeCodes || ['234'];
      if (!allowed.some(c => real.startsWith(String(c).replace('+','')))) {
        try {
          await sock.sendMessage(from, { text: `🌍 @${real} ${bold('has been removed - Fake number is not allowed.')} ${bold('Only +' + allowed.join(', +') + ' is allowed.')}`, mentions: [sender] });
          if (isBotAdmin) await sock.groupParticipantsUpdate(from, [sender], 'remove');
        } catch {}
        return true;
      }
    }
    if (anti.antibot) {
      const isBotSender = sender.endsWith('@bot') || !!msg.extendedTextMessage?.contextInfo?.isBot || !!m.message?.botMessage;
      if (isBotSender) return await punish(sock, from, sender, senderNum, 'antibot', 'Bot Message', m, isBotAdmin);
    }
    if (anti.antitag && mentioned.length >= 5) return await punish(sock, from, sender, senderNum, 'antitag', `Tagging ${mentioned.length} People`, m, isBotAdmin);
    if (anti.antilink) {
      const linkRegex = /(https?:\/\/|www\.|wa\.me\/|chat\.whatsapp\.com|t\.me\/|instagram\.com|tiktok\.com|youtube\.com|discord\.gg|bit\.ly)/i;
      if (linkRegex.test(body)) {
        let isOwnLink = false;
        try { const code = await sock.groupInviteCode(from); if (body.includes(code)) isOwnLink = true; } catch {}
        if (!isOwnLink) return await punish(sock, from, sender, senderNum, 'antilink', 'Link', m, isBotAdmin);
      }
    }
    if (anti.antipromote && /(dm me|dm for|join my group|join my channel|check my bio|follow me|subscribe to|promo|advert|earn money)/i.test(textLower)) {
      if (!/(chat\.whatsapp\.com|wa\.me\/)/i.test(body)) return await punish(sock, from, sender, senderNum, 'antipromote', 'Promotion', m, isBotAdmin);
    }
    if (anti.antibadword) {
      const bad = ['fuck','shit','bitch','sex','porn','dick','pussy','nigga','nigger','motherfucker','bastard','whore','slut','cock','penis','vagina','fucking','asshole'];
      if (bad.some(w => textLower.includes(w))) return await punish(sock, from, sender, senderNum, 'antibadword', 'Bad Word', m, isBotAdmin);
    }
    if (anti.antispam || anti.antiflood) {
      const key = from + ':' + sender;
      const now = Date.now();
      if (!global.spamMap.has(key)) global.spamMap.set(key, []);
      let arr = global.spamMap.get(key).filter(x => now - x.time < 10000);
      arr.push({ time: now, txt: body });
      global.spamMap.set(key, arr);
      const last5s = arr.filter(x => now - x.time < 5000);
      const sameTxt = arr.filter(x => x.txt === body && body.length > 0);
      if (anti.antiflood && last5s.length > 6) { global.spamMap.set(key, []); return await punish(sock, from, sender, senderNum, 'antiflood', 'Flooding (6 Messages in 5 Seconds)', m, isBotAdmin); }
      if (anti.antispam && sameTxt.length > 3 && body.length > 2) { global.spamMap.set(key, []); return await punish(sock, from, sender, senderNum, 'antispam', 'Spam (Same Message 3 Times)', m, isBotAdmin); }
    }
    return false;
  } catch (e) { console.log('[ANTI ERROR]', e.message); return false; }
}

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

async function handleDelete(sock, update) {
  try {
    const key = update.key || update;
    const groupId = key.remoteJid;
    if (!groupId?.endsWith('@g.us')) return;
    const anti = getAnti(groupId);
    if (!anti.antidelete) return;
    const cached = global.antiCache.get(groupId)?.get(key.id);
    if (!cached) { await sock.sendMessage(groupId, { text: `🗑️ ${bold('Anti-Delete:')} ${bold('A message was deleted, but it was not captured. The bot may have restarted.')}` }); return; }
    const header = `🗑️ *${bold('ANTI-DELETE')}*\n\n👤 @${cached.senderNum} ${bold('deleted this message:')}\n⏰ ${new Date(cached.time).toLocaleTimeString('en-NG')}\n\n`;
    try {
      if (cached.buffer && cached.mediaType === 'image') await sock.sendMessage(groupId, { image: cached.buffer, caption: header + (cached.text || ''), mentions: [cached.sender] });
      else if (cached.buffer && cached.mediaType === 'video') await sock.sendMessage(groupId, { video: cached.buffer, caption: header + (cached.text || ''), mentions: [cached.sender] });
      else if (cached.buffer && cached.mediaType === 'sticker') { await sock.sendMessage(groupId, { sticker: cached.buffer, mentions: [cached.sender] }); await sock.sendMessage(groupId, { text: header + `${bold('Sticker from')} @${cached.senderNum}`, mentions: [cached.sender] }); }
      else if (cached.buffer && cached.mediaType === 'audio') await sock.sendMessage(groupId, { audio: cached.buffer, mimetype: cached.mimetype || 'audio/mp4', mentions: [cached.sender] });
      else if (cached.buffer && cached.mediaType === 'document') await sock.sendMessage(groupId, { document: cached.buffer, fileName: 'deleted-file', mimetype: cached.mimetype || 'application/octet-stream', mentions: [cached.sender] });
      else await sock.sendMessage(groupId, { text: header + (cached.text || `[${cached.type} - No Text]`), mentions: [cached.sender] });
    } catch { await sock.sendMessage(groupId, { text: header + (cached.text || ''), mentions: [cached.sender] }); }
  } catch {}
}

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
            await sock.sendMessage(id, { text: `🌍 @${real} ${bold('has been removed - Fake number is not allowed.')} ${bold('Only +' + allowed.join(', +') + ' is allowed.')}`, mentions: [p] });
            await sock.groupParticipantsUpdate(id, [p], 'remove');
          }
        } catch {}
      }
    }
  } catch {}
}

function toggle(ctx, key, label, emoji, onMsg, offMsg) {
  const { reply, from, isGroup } = ctx;
  if (!isGroup) return reply(`❌ ${bold('Anti commands only work in a group.')}`);
  const anti = getAnti(from);
  if (key === 'antifake') {
    const first = getToggleArg(ctx);
    if (first && !['on','off','enable','disable'].includes(first) && /^\d/.test(first)) {
      const codes = first.split(',').map(c => c.replace(/[^0-9]/g, '')).filter(Boolean);
      if (codes.length) { anti.antifakeCodes = codes; anti.antifake = true; save(); return reply(`🌍 ${bold('Anti-Fake ON - Allowed: +' + codes.join(', +'))}`); }
    }
  }
  const parsed = parseToggleValue(getToggleArg(ctx));
  if (parsed === null) return reply(`> ╭══〘 ${emoji} ${bold(label)} 〙══⊷❍\n> ┃✯╭──────────────\n> ┃✯│ ${bold('Status:')} ${anti[key] ? bold('ON ✅') : bold('OFF ❌')}\n> ┃✯│ ${bold('Usage:')} .${key} ${bold('on / off')}\n> ┃✯╰───────────────\n> ╰═══════════════════⊷❍`);
  if (parsed === 'invalid') return reply(`❌ ${bold('Invalid. Use:')} .${key} ${bold('on')} ${bold('OR')} .${key} ${bold('off')}`);
  anti[key] = parsed;
  save();
  return reply(`> ╭══〘 ${emoji} ${bold(label)} 〙══⊷❍\n> ┃✯╭──────────────\n> ┃✯│ ${bold('Status:')} ${parsed ? bold('ON ✅') : bold('OFF ❌')}\n> ┃✯│ ${bold(parsed ? onMsg : offMsg)}\n> ┃✯╰───────────────\n> ╰═══════════════════⊷❍`);
}

const commands = [
  { command: ['antilink'], adminOnly: true, run: async (ctx) => toggle(ctx, 'antilink', 'ANTI-LINK', '🔗', 'All links will be deleted automatically (except this group link)', 'Links are allowed now') },
  { command: ['antibot'], adminOnly: true, run: async (ctx) => toggle(ctx, 'antibot', 'ANTI-BOT', '🤖', 'Other bots will be warned / removed', 'Bots are allowed now') },
  { command: ['antispam'], adminOnly: true, run: async (ctx) => toggle(ctx, 'antispam', 'ANTI-SPAM', '🚫', 'Same message 3 times in 10 seconds = Warning / Removal', 'Spam is allowed now') },
  { command: ['antiflood'], adminOnly: true, run: async (ctx) => toggle(ctx, 'antiflood', 'ANTI-FLOOD', '🌊', '6 messages in 5 seconds = Warning / Removal', 'Flooding is allowed now') },
  { command: ['antitag'], adminOnly: true, run: async (ctx) => toggle(ctx, 'antitag', 'ANTI-TAG', '🏷️', 'Tagging 5 or more people = Warning / Removal', 'Tagging is allowed now') },
  { command: ['antidelete'], adminOnly: true, run: async (ctx) => toggle(ctx, 'antidelete', 'ANTI-DELETE', '🗑️', 'Deleted messages will be recovered and resent - including images and videos', 'Deleted messages will not be recovered') },
  { command: ['antibadword'], adminOnly: true, run: async (ctx) => toggle(ctx, 'antibadword', 'ANTI-BADWORD', '🤬', 'Bad words will be deleted automatically', 'Bad words are allowed now') },
  { command: ['antisticker'], adminOnly: true, run: async (ctx) => toggle(ctx, 'antisticker', 'ANTI-STICKER', '🏷️', 'All stickers will be deleted automatically', 'Stickers are allowed now') },
  { command: ['antifake'], adminOnly: true, run: async (ctx) => toggle(ctx, 'antifake', 'ANTI-FAKE', '🌍', 'Only +234 numbers are allowed, others will be removed on join', 'All numbers are allowed now') },
  { command: ['antipromote'], adminOnly: true, run: async (ctx) => toggle(ctx, 'antipromote', 'ANTI-PROMOTE', '⬆️', 'Promotion / DM Me / Join My Group will be deleted', 'Promotion is allowed now') },
  {
    command: ['antistatus', 'antilist'],
    adminOnly: true,
    run: async ({ reply, from, isGroup }) => {
      if (!isGroup) return reply(`❌ ${bold('Only in a group.')}`);
      const a = getAnti(from);
      const line = (name, v) => `┆ ${v ? '✅' : '❌'} ${bold(name + ':')} ${bold(v ? 'ON' : 'OFF')}`;
      await reply(`> ╭══〘 🛡️ ${bold('ANTI STATUS')} 〙══⊷❍\n> ┃✯╭──────────────\n> ┃✯│ ${line('AntiLink', a.antilink)}\n> ┃✯│ ${line('AntiBot', a.antibot)}\n> ┃✯│ ${line('AntiSpam', a.antispam)}\n> ┃✯│ ${line('AntiFlood', a.antiflood)}\n> ┃✯│ ${line('AntiTag', a.antitag)}\n> ┃✯│ ${line('AntiDelete', a.antidelete)}\n> ┃✯│ ${line('AntiBadword', a.antibadword)}\n> ┃✯│ ${line('AntiSticker', a.antisticker)}\n> ┃✯│ ${line('AntiFake', a.antifake)} (+${(a.antifakeCodes||[]).join(',+')})\n> ┃✯│ ${line('AntiPromote', a.antipromote)}\n> ┃✯╰───────────────\n> ╰═══════════════════⊷❍`);
    }
  },
  {
    command: ['antiall', 'antion'],
    adminOnly: true,
    run: async ({ reply, from, isGroup }) => {
      if (!isGroup) return reply(`❌ ${bold('Only in a group.')}`);
      const a = getAnti(from);
      ['antilink','antibot','antispam','antiflood','antitag','antidelete','antibadword','antisticker','antifake','antipromote'].forEach(k => a[k] = true);
      save(); await reply(`✅ ${bold('All Anti Features Are ON')}`);
    }
  },
  {
    command: ['antioff'],
    adminOnly: true,
    run: async ({ reply, from, isGroup }) => {
      if (!isGroup) return reply(`❌ ${bold('Only in a group.')}`);
      const a = getAnti(from);
      ['antilink','antibot','antispam','antiflood','antitag','antidelete','antibadword','antisticker','antifake','antipromote'].forEach(k => a[k] = false);
      save(); await reply(`❌ ${bold('All Anti Features Are OFF')}`);
    }
  },
  {
    command: ['antiwarn', 'warnings', 'warnlist'],
    adminOnly: true,
    run: async ({ reply, from, isGroup }) => {
      if (!isGroup) return reply(`❌ ${bold('Only in a group.')}`);
      const a = getAnti(from);
      const warns = a.warnCount || {};
      const entries = Object.entries(warns).filter(([_, v]) => Object.values(v).some(n => n > 0));
      if (!entries.length) return reply(`✅ ${bold('No warnings yet')}`);
      let t = `⚠️ *${bold('WARNINGS')}*\n\n`;
      entries.forEach(([num, v]) => { t += `@${num}: ${Object.entries(v).map(([k, n]) => `${k}=${n}`).join(', ')}\n`; });
      await reply(t);
    }
  },
  {
    command: ['resetwarn', 'clearwarn'],
    adminOnly: true,
    run: async ({ reply, from, isGroup }) => {
      if (!isGroup) return reply(`❌ ${bold('Only in a group.')}`);
      getAnti(from).warnCount = {}; save(); await reply(`✅ ${bold('All warnings have been cleared')}`);
    }
  },
];

module.exports = commands;
module.exports.handleAnti = handleAnti;
module.exports.cacheMessage = cacheMessage;
module.exports.handleDelete = handleDelete;
module.exports.handleParticipantUpdate = handleParticipantUpdate;
