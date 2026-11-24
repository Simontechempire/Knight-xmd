// Knight XMD message handler.
const fs = require('fs');
const path = require('path');
const config = require('../config');

if (!global.db) global.db = {};
if (!Array.isArray(global.db.banned)) global.db.banned = [];
if (!global.db.warnings) global.db.warnings = {};
if (!global.db.settings) global.db.settings = {};
if (!global.db.anti) global.db.anti = {};
if (!global.botStart) global.botStart = Date.now();

// ===== ✅ ADDED: PER-SESSION DB - Each bot get him own DB =====
// Old: database.json for everybody -> David ban you, e ban for all
// New: sessions/<number>/db.json -> David ban person, na only him bot
function getSessionDBPath(botNum) {
  return path.join(__dirname, '..', 'sessions', String(botNum), 'db.json');
}
function loadSessionDB(botNum) {
  try {
    const file = getSessionDBPath(botNum);
    if (fs.existsSync(file)) {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      return {
        banned: Array.isArray(data.banned) ? data.banned : [],
        warnings: data.warnings || {},
        settings: data.settings || {},
        anti: data.anti || {},
        users: data.users || {},
        groups: data.groups || {}
      };
    }
  } catch {}
  return { banned: [], warnings: {}, settings: {}, anti: {}, users: {}, groups: {} };
}
function saveSessionDB(botNum, db) {
  try {
    const dir = path.dirname(getSessionDBPath(botNum));
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(getSessionDBPath(botNum), JSON.stringify(db, null, 2));
  } catch {}
}

const DB_PATH = path.join(__dirname, '..', 'database.json');
function loadDB() {
  try {
    if (!fs.existsSync(DB_PATH)) return;
    const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    global.db = { ...global.db, ...data };
    if (!Array.isArray(global.db.banned)) global.db.banned = [];
    global.db.warnings ||= {};
    global.db.settings ||= {};
    global.db.anti ||= {};
  } catch (error) {
    console.error('[DB] Could not load database:', error.message);
  }
}

function saveDB() {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(global.db, null, 2));
  } catch (error) {
    console.error('[DB] Could not save database:', error.message);
  }
}
global.dbSave = saveDB;
loadDB();

let plugins = [];
const pluginDir = path.join(__dirname, '..', 'plugins');
function loadPlugins() {
  plugins = [];
  const files = fs.readdirSync(pluginDir).filter(file => file.endsWith('.js')).sort();
  for (const file of files) {
    const fullPath = path.join(pluginDir, file);
    try {
      delete require.cache[require.resolve(fullPath)];
      const loaded = require(fullPath);
      if (Array.isArray(loaded)) plugins.push(...loaded);
      else if (loaded && typeof loaded === 'object') plugins.push(loaded);
    } catch (error) {
      console.error(`[PLUGIN] Failed to load ${file}:`, error.stack || error.message);
    }
  }
  console.log(`[PLUGINS] Loaded ${plugins.length} commands from ${files.length} files`);
}
loadPlugins();

let antiPlugin = null;
try { antiPlugin = require('../plugins/anti'); }
catch (error) { console.error('[ANTI] Plugin not loaded:', error.message); }
let autoPlugin = null;
try { autoPlugin = require('../plugins/auto'); }
catch (error) { console.error('[AUTO] Plugin not loaded:', error.message); }

const cleanNum = jid => String(jid || '').split('@')[0].split(':')[0].replace(/[^0-9]/g, '');

function findParticipant(meta, jid) {
  if (!meta?.participants || !jid) return null;
  const raw = String(jid);
  const number = cleanNum(raw);
  return meta.participants.find(participant => {
    if (participant.id === raw || participant.pn === raw || participant.lid === raw) return true;
    if (!number) return false;
    return [participant.id, participant.pn]
      .some(value => value && cleanNum(value) === number);
  }) || null;
}

function formatRuntime(milliseconds) {
  const seconds = Math.floor(milliseconds / 1000);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  if (days) return `${days}d ${hours}h ${minutes}m`;
  if (hours) return `${hours}h ${minutes}m ${remainder}s`;
  if (minutes) return `${minutes}m ${remainder}s`;
  return `${remainder}s`;
}

function box(title, lines) {
  return `> ╭══〘 ${title} 〙══⊷❍\n> ┃✯╭──────────────\n${lines.map(line => `> ┃✯│ ${line}`).join('\n')}\n> ┃✯╰───────────────\n> ╰═══════════════════⊷❍`;
}

function getMessageText(message) {
  const content = message?.message;
  if (!content) return '';
  if (content.buttonsResponseMessage?.selectedButtonId) {
    return content.buttonsResponseMessage.selectedButtonId;
  }
  if (content.listResponseMessage?.singleSelectReply?.selectedRowId) {
    return content.listResponseMessage.singleSelectReply.selectedRowId;
  }
  const candidates = [
    content.conversation,
    content.extendedTextMessage?.text,
    content.imageMessage?.caption,
    content.videoMessage?.caption,
    content.documentMessage?.caption,
    content.viewOnceMessage?.message?.imageMessage?.caption,
    content.viewOnceMessage?.message?.videoMessage?.caption,
    content.viewOnceMessageV2?.message?.imageMessage?.caption,
    content.viewOnceMessageV2?.message?.videoMessage?.caption,
    content.ephemeralMessage?.message?.conversation,
    content.ephemeralMessage?.message?.extendedTextMessage?.text
  ];
  return candidates.find(value => typeof value === 'string') || '';
}

async function handleMessage(sock, update, botNumber, sessionSettings) {
  for (const message of update?.messages || []) {
    if (!message?.message || !message.key?.remoteJid) continue;

    const from = message.key.remoteJid;
    const isGroup = from.endsWith('@g.us');
    const sender = isGroup
      ? (message.key.participant || message.key.participantPn || '')
      : from;
    if (!sender && !message.key.fromMe) continue;

    const botJid = sock.user?.id || '';
    const botNum = cleanNum(botNumber || botJid);

    const sess = sessionSettings || sock.sessionSettings || (global.getSessionSettings ? global.getSessionSettings(botNum) : null) || {};
    const sessionPrefix = sess.prefix || config.prefix || '.';
    const sessionMode = sess.mode || config.mode || 'public';
    const sessionOwner = cleanNum(sess.owner || sess.creatorNumber || botNum);
    const creatorNum = sessionOwner;

    const sessionDB = loadSessionDB(botNum);
    const prevGlobalDB = global.db;
    global.db = sessionDB;

    let senderNum = message.key.fromMe ? botNum : cleanNum(sender);
    const body = getMessageText(message);
    const messageType = Object.keys(message.message)[0] || '';

    if (autoPlugin?.handleAuto) {
      try {
        await autoPlugin.handleAuto(sock, message, {
          from, body, type: messageType, msg: message.message, isGroup, prefix: sessionPrefix
        });
      } catch (error) {
        console.error('[AUTO] Message handler failed:', error.message);
      }
    }

    let groupMeta = null;
    let senderParticipant = null;
    let isAdmin = false;
    let isBotAdmin = false;
    if (isGroup) {
      try {
        groupMeta = await sock.groupMetadata(from);
        senderParticipant = findParticipant(groupMeta, sender);
        if (senderParticipant?.pn) senderNum = cleanNum(senderParticipant.pn);
        else if (senderParticipant?.id?.endsWith('@s.whatsapp.net')) senderNum = cleanNum(senderParticipant.id);
        isAdmin = Boolean(senderParticipant?.admin);
        const botCandidates = [sock.user?.id, sock.user?.lid, botNumber].filter(Boolean).map(String);
        const botNumbers = botCandidates.map(cleanNum).filter(Boolean);
        const botParticipant = groupMeta.participants?.find(participant => {
          if (botCandidates.includes(participant.id) || botCandidates.includes(participant.pn) || botCandidates.includes(participant.lid)) return true;
          return [participant.id, participant.pn]
            .some(value => value && botNumbers.includes(cleanNum(value)));
        });
        isBotAdmin = Boolean(botParticipant?.admin);
      } catch (error) {
        console.error('[GROUP] Could not load metadata:', error.message);
      }
    }

    const isCreator = Boolean(creatorNum && senderNum === creatorNum);
    const isSessionOwner = Boolean(botNum && senderNum === botNum);
    const isOwner = isCreator || isSessionOwner;

    if (isGroup && antiPlugin?.cacheMessage) {
      try {
        await antiPlugin.cacheMessage(sock, from, message, body, messageType);
      } catch (error) {
        console.error('[ANTI-DELETE] Cache failed:', error.message);
      }
    }

    // ✅ FIXED: Auto plugins - use real variables, no undefined m/reply/args/text
    // Old code use m, reply, args, text wey no exist here -> crash
    if (isGroup) {
      for (const p of plugins) {
        if (p.all && p.groupOnly) {
          try {
            await p.run({
              sock, m: message, from, sender, senderNum,
              sessionDB, db: sessionDB,
              args: [], text: body, body,
              reply: async (content) => sock.sendMessage(from, { text: String(content) }, { quoted: message })
            });
          } catch (e) { console.log('[AUTO PLUGIN]', e.message); }
        }
      }
    }

    if (isGroup && antiPlugin?.handleAnti) {
      try {
        const blocked = await antiPlugin.handleAnti(sock, message, {
          from, sender, senderNum, isGroup, isOwner, isAdmin, isBotAdmin,
          body, type: messageType, msg: message.message, groupMeta
        });
        if (blocked) {
          saveSessionDB(botNum, sessionDB);
          global.db = prevGlobalDB;
          continue;
        }
      } catch (error) {
        console.error('[ANTI] Message checks failed:', error.message);
      }
    }

    if (sessionDB.banned.includes(senderNum) && !isOwner) {
      if (body.startsWith(sessionPrefix)) {
        await sock.sendMessage(from, {
          text: `🚫 You are banned from using Knight XMD.\nContact owner: wa.me/${creatorNum}`
        }, { quoted: message });
      }
      saveSessionDB(botNum, sessionDB);
      global.db = prevGlobalDB;
      continue;
    }

    const isButtonClick = Boolean(
      message.message?.buttonsResponseMessage?.selectedButtonId ||
      message.message?.listResponseMessage?.singleSelectReply?.selectedRowId
    );

    if (!body) { saveSessionDB(botNum, sessionDB); global.db = prevGlobalDB; continue; }
    if (!isButtonClick && (!sessionPrefix || !body.startsWith(sessionPrefix))) { saveSessionDB(botNum, sessionDB); global.db = prevGlobalDB; continue; }

    let parts;
    if (isButtonClick) {
      parts = body.trim().split(/\s+/).filter(Boolean);
    } else {
      parts = body.slice(sessionPrefix.length).trim().split(/\s+/).filter(Boolean);
    }

    const commandName = parts.shift()?.toLowerCase();
    if (!commandName) { saveSessionDB(botNum, sessionDB); global.db = prevGlobalDB; continue; }
    const args = parts;
    const text = args.join(' ');

    const plugin = plugins.find(candidate => {
      if (!candidate?.command) return false;
      return Array.isArray(candidate.command)
        ? candidate.command.includes(commandName)
        : candidate.command === commandName;
    });
    if (!plugin) { saveSessionDB(botNum, sessionDB); global.db = prevGlobalDB; continue; }

    if ((sessionMode === 'private' || sessionMode === 'self') && !isOwner) { saveSessionDB(botNum, sessionDB); global.db = prevGlobalDB; continue; }
    if (plugin.ownerOnly && !isOwner) { saveSessionDB(botNum, sessionDB); global.db = prevGlobalDB; continue; }
    if (plugin.creatorOnly && !isCreator) { saveSessionDB(botNum, sessionDB); global.db = prevGlobalDB; continue; }
    if (plugin.groupOnly && !isGroup) { saveSessionDB(botNum, sessionDB); global.db = prevGlobalDB; continue; }
    if (plugin.adminOnly && (!isGroup || (!isAdmin && !isOwner))) {
      await sock.sendMessage(from, {
        text: isGroup ? '❌ Only group admins can use this command.' : '❌ This command only works in a group.'
      }, { quoted: message });
      saveSessionDB(botNum, sessionDB);
      global.db = prevGlobalDB;
      continue;
    }

    const sessionConfig = { ...config, prefix: sessionPrefix, mode: sessionMode, creatorNumber: sessionOwner, creator: sessionOwner };

    const context = {
      sock, m: message, from, sender, senderNum, botNumber: botNum, botJid,
      isGroup, isOwner, isCreator, isSessionOwner, isAdmin, isBotAdmin,
      groupMetadata: groupMeta, groupMeta, args, text, body,
      quoted: message.message.extendedTextMessage?.contextInfo?.quotedMessage,
      type: messageType, tiny: value => String(value),
      config: sessionConfig,
      sessionSettings: sess,
      sessionDB,
      db: sessionDB,
      saveSession: (newSettings) => {
        const merged = { ...sess, ...newSettings, owner: sessionOwner };
        if (global.saveSessionSettings) global.saveSessionSettings(botNum, merged);
        return merged;
      },
      prefix: sessionPrefix, command: commandName, runtime: formatRuntime, box,
      reply: async (content, options = {}) => sock.sendMessage(from, {
        text: String(content), mentions: options.mentions || []
      }, { quoted: message }),
      replyImage: async (url, caption) => sock.sendMessage(from, {
        image: { url }, caption
      }, { quoted: message })
    };

    try {
      console.log(`[CMD] [${botNum}] ${senderNum} -> ${sessionPrefix}${commandName} | owner:${isOwner} admin:${isAdmin} botAdmin:${isBotAdmin}`);
      await plugin.run(context);
    } catch (error) {
      console.error(`[CMD] ${commandName} failed:`, error.stack || error.message);
      await sock.sendMessage(from, { text: `❌ Command failed: ${error.message}` }, { quoted: message });
    }
    saveSessionDB(botNum, sessionDB);
    global.db = prevGlobalDB;
  }
}

function setupAntiDelete(sock) {
  if (!sock?.ev || sock.__antiDeleteHandlerAttached) return;
  sock.__antiDeleteHandlerAttached = true;
  sock.ev.on('messages.update', async updates => {
    for (const update of updates || []) {
      if (update.update?.message !== null && update.update?.messageStubType !== 68) continue;
      try {
        await antiPlugin?.handleDelete?.(sock, update);
      } catch (error) {
        console.error('[ANTI-DELETE] Recovery failed:', error.message);
      }
    }
  });
}

// ✅ FIXED: REMOVED the bad top-level wlc lines wey dey crash start
// Old: const wlc = require('./plugins/welcome.js'); wlc.attachEngine(sock);
// That sock no exist + path wrong. Deleted.

function setupParticipantUpdates(sock) {
  if (!sock?.ev || sock.__antiParticipantHandlerAttached) return;
  sock.__antiParticipantHandlerAttached = true;
  sock.ev.on('group-participants.update', async update => {
    try {
      await antiPlugin?.handleParticipantUpdate?.(sock, update);
    } catch (error) {
      console.error('[ANTI-FAKE] Participant update failed:', error.message);
    }
  });
}

function setupHandlers(sock) {
  setupAntiDelete(sock);
  setupParticipantUpdates(sock);
  try {
    // ✅ FIXED: File na welcome.js, no be wlc.js
    const wlc = require('../plugins/welcome');
    if (wlc.attachEngine) wlc.attachEngine(sock);
  } catch {}
  try { autoPlugin?.restoreAuto?.(sock); }
  catch (error) { console.error('[AUTO] Could not restore automation:', error.message); }
}

module.exports = {
  handleMessage, loadPlugins, setupAntiDelete, setupParticipantUpdates,
  setupHandlers, plugins: () => plugins, antiPlugin, autoPlugin,
  loadSessionDB, saveSessionDB
};
