const { Sticker, StickerTypes } = require('wa-sticker-formatter');
module.exports = [
{ command: ['sticker','s'], run: async ({ sock, m, from, reply }) => {
  const msg = m.message.imageMessage || m.message.videoMessage || m.message.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;
  if(!msg) return reply('Reply to image/video or send image with .sticker');
  try{
    const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
    const type = m.message.videoMessage ? 'video' : 'image';
    const stream = await downloadContentFromMessage(msg, type);
    let buf=Buffer.from([]); for await(const c of stream) buf=Buffer.concat([buf,c]);
    const sticker = new Sticker(buf, { pack: 'Knight XMD', author: 'Faceless Tech', type: StickerTypes.FULL, quality: 70 });
    await sock.sendMessage(from, await sticker.toMessage(), { quoted: m });
  }catch(e){ await reply('Sticker failed: '+e.message); }
}},
{ command: ['toimg'], run: async ({ sock, m, from, reply }) => {
  const q = m.message.extendedTextMessage?.contextInfo?.quotedMessage?.stickerMessage;
  if(!q) return reply('Reply to sticker with .toimg');
  try{ const { downloadContentFromMessage } = require('@whiskeysockets/baileys'); const stream=await downloadContentFromMessage(q,'image'); let buf=Buffer.from([]); for await(const c of stream) buf=Buffer.concat([buf,c]); await sock.sendMessage(from,{image:buf, caption:'🖼️ Converted by Knight XMD'}); }catch(e){ await reply('Failed'); }
}},
{ command: ['take'], ownerOnly: true, run: async ({ sock, m, from, reply, text }) => {
  const q = m.message.extendedTextMessage?.contextInfo?.quotedMessage?.stickerMessage; if(!q) return reply('Reply to sticker');
  try{ const { downloadContentFromMessage } = require('@whiskeysockets/baileys'); const stream=await downloadContentFromMessage(q,'image'); let buf=Buffer.from([]); for await(const c of stream) buf=Buffer.concat([buf,c]); const [pack='Knight XMD', author='Faceless Tech']=text.split('|'); const st=new Sticker(buf,{pack:pack.trim(), author:author.trim(), type:StickerTypes.FULL}); await sock.sendMessage(from, await st.toMessage()); }catch(e){ await reply('Failed'); }
}},
{ command: ['attp'], run: async ({ sock, from, text, reply }) => { if(!text) return reply('Usage: .attp Hello'); const url=`https://api.xteam.xyz/attp?text=${encodeURIComponent(text)}`; await sock.sendMessage(from,{sticker:{url}, pack:'Knight XMD', author:'Faceless Tech'}).catch(()=>reply('ATTP failed')); }},
{ command: ['smeme'], run: async ({ sock, m, from, reply, text }) => { if(!text) return reply('Usage: .smeme top|bottom - reply to image'); const [top='',bottom='']=text.split('|'); const url=`https://api.memegen.link/images/custom/${encodeURIComponent(top)}/${encodeURIComponent(bottom)}.png?background=https://i.imgur.com/8Q9Z9.png`; await sock.sendMessage(from,{image:{url}, caption:'😂 Meme by Knight XMD'}); }},
];
