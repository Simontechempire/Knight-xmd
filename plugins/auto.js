module.exports = [
{ command: ['autoread'], ownerOnly: true, run: async ({ reply, args }) => { const v = args[0]==='on'; global.db.settings.autoRead=v; await reply(`👀 AutoRead ${v?'ON ✅':'OFF ❌'}`); }},
{ command: ['autotyping'], ownerOnly: true, run: async ({ reply, args }) => { const v = args[0]==='on'; global.db.settings.autoTyping=v; await reply(`⌨️ AutoTyping ${v?'ON ✅':'OFF ❌'}`); }},
{ command: ['autoonline'], ownerOnly: true, run: async ({ reply, args }) => { const v = args[0]==='on'; global.db.settings.autoOnline=v; await reply(`🟢 AutoOnline ${v?'ON ✅':'OFF ❌'}`); }},
{ command: ['autorecording'], ownerOnly: true, run: async ({ reply, args }) => { const v = args[0]==='on'; global.db.settings.autoRecording=v; await reply(`🎙️ AutoRecording ${v?'ON ✅':'OFF ❌'}`); }},
{ command: ['autoreact'], ownerOnly: true, run: async ({ reply, args }) => { const v = args[0]==='on'; global.db.settings.autoReact=v; await reply(`❤️ AutoReact ${v?'ON ✅':'OFF ❌'}`); }},
{ command: ['autoreply'], ownerOnly: true, run: async ({ reply, args }) => { const v = args[0]==='on'; global.db.settings.autoReply=v; await reply(`💬 AutoReply ${v?'ON ✅':'OFF ❌'}`); }},
{ command: ['autosticker'], ownerOnly: true, run: async ({ reply, args }) => { const v = args[0]==='on'; global.db.settings.autoSticker=v; await reply(`🏷️ AutoSticker ${v?'ON ✅':'OFF ❌'}`); }},
{ command: ['autoview'], ownerOnly: true, run: async ({ reply, args }) => { const v = args[0]==='on'; global.db.settings.autoView=v; await reply(`👁️ AutoView Status ${v?'ON ✅':'OFF ❌'}`); }},
{ command: ['autobio'], ownerOnly: true, run: async ({ sock, reply, args }) => {
  const v = args[0]==='on'; global.db.settings.autoBio=v;
  if(v){ setInterval(async()=>{ try{ await sock.updateProfileStatus(`⚔️ Knight XMD | ${new Date().toLocaleTimeString()} | By Faceless Tech`); }catch{} }, 60000); }
  await reply(`📝 AutoBio ${v?'ON ✅':'OFF ❌'}`);
}},
{ command: ['autolikestatus'], ownerOnly: true, run: async ({ reply, args }) => { const v = args[0]==='on'; global.db.settings.autoLikeStatus=v; await reply(`❤️ AutoLike Status ${v?'ON ✅':'OFF ❌'}`); }},
];
