// KNIGHT XMD - FASTEST GC Status Delete + Warn
// File: gcstatusdelete.js
// .gcstatus delete / .warn / .unwarn / .warnings

module.exports = [
  // ===== GCSTATUS DELETE - FASTEST =====
  {
    command: ['gcstatuskick', 'deletegcstatus', 'delgcstatus', 'dgcstatus'],
    groupOnly: true,
    adminOnly: true,
    run: async ({ sock, m, from, reply, args }) => {
      const ctx = m.message?.extendedTextMessage?.contextInfo;
      const quotedKey = ctx?.stanzaId;
      const quotedParticipant = ctx?.participant;
      if (!ctx?.quotedMessage || !quotedKey) return reply('❌ Reply + .gcstatus delete');
      if ((args[0] || '').toLowerCase() !== 'delete' && (args[0] || '').toLowerCase() !== 'del') return reply('❌ Use: .gcstatus delete');
      try {
        // Direct delete - no extra wait
        await sock.sendMessage(from, { delete: { remoteJid: from, fromMe: false, id: quotedKey, participant: quotedParticipant } });
      } catch { return reply('❌ Bot must be Group Admin.'); }
    }
  },

  // ===== WARN - FASTEST: Delete + Warn / Delete + Kick in parallel =====
  {
    command: ['gwarn'],
    groupOnly: true,
    adminOnly: true,
    run: async ({ sock, m, from, reply, args, sessionDB }) => {
      const ctx = m.message?.extendedTextMessage?.contextInfo;
      const quotedKey = ctx?.stanzaId;
      const quotedParticipant = ctx?.participant;
      const targetJid = quotedParticipant || ctx?.mentionedJid?.[0];
      if (!targetJid) return reply('❌ Reply to him post + .warn');
      const targetNum = targetJid.split('@')[0].split(':')[0];

      const db = sessionDB || global.db;
      db.warnings ??= {};
      db.warnings[from] ??= {};
      const count = (db.warnings[from][targetNum] = (db.warnings[from][targetNum] || 0) + 1);

      const deleteKey = quotedKey ? { remoteJid: from, fromMe: false, id: quotedKey, participant: quotedParticipant } : null;

      try {
        if (count >= 2) {
          db.warnings[from][targetNum] = 0;
          // FASTEST: Delete + Kick at same time, no waiting one by one
          await Promise.all([
            deleteKey ? sock.sendMessage(from, { delete: deleteKey }).catch(() => {}) : Promise.resolve(),
            sock.groupParticipantsUpdate(from, [targetJid], 'remove'),
            sock.sendMessage(from, { text: `🚨 WARN 2/2 - @${targetNum} KICKED. Post deleted.`, mentions: [targetJid] })
          ]);
          return;
        }
        // FASTEST: Delete + Warn message at same time
        await Promise.all([
          deleteKey ? sock.sendMessage(from, { delete: deleteKey }).catch(() => {}) : Promise.resolve(),
          sock.sendMessage(from, { text: `⚠️ WARN ${count}/2 @${targetNum} - Post deleted. 1 more = Kick.`, mentions: [targetJid] })
        ]);
      } catch { return reply('❌ Bot must be Group Admin.'); }
    }
  },

  // ===== UNWARN =====
  {
    command: ['gunwarn', 'gdelwarn'],
    groupOnly: true,
    adminOnly: true,
    run: async ({ m, from, reply, args, sessionDB }) => {
      const ctx = m.message?.extendedTextMessage?.contextInfo;
      const targetJid = ctx?.participant || ctx?.mentionedJid?.[0];
      const targetNum = targetJid ? targetJid.split('@')[0] : (args[0] || '').replace(/[^0-9]/g, '');
      if (!targetNum) return reply('❌ Reply + .unwarn');
      const db = sessionDB || global.db;
      if (!db.warnings?.[from]?.[targetNum]) return reply('✅ 0 warns');
      db.warnings[from][targetNum] = Math.max(0, db.warnings[from][targetNum] - 1);
      return reply(`✅ @${targetNum} now ${db.warnings[from][targetNum]}/2`);
    }
  },

  // ===== WARNINGS =====
  {
    command: ['gwarnings', 'gwarns'],
    groupOnly: true,
    adminOnly: true,
    run: async ({ m, from, reply, sessionDB }) => {
      const db = sessionDB || global.db;
      const all = db.warnings?.[from] || {};
      const list = Object.entries(all).filter(([_, c]) => c > 0);
      if (!list.length) return reply('✅ No warnings');
      return reply('⚠️ WARNINGS\n' + list.map(([n, c]) => `@${n} - ${c}/2`).join('\n'));
    }
  }
];
