const axios = require('axios');
module.exports = [
{ command: ['joke'], run: async ({ reply }) => { try{ const {data}=await axios.get('https://official-joke-api.appspot.com/random_joke'); await reply(`😂 *JOKE*\n\n${data.setup}\n\n${data.punchline}`); }catch{ await reply('😂 Why did the chicken cross the road? To get to the other side!'); } }},
{ command: ['quote'], run: async ({ reply }) => { const qs=["Success is not final, failure is not fatal.","Be yourself, everyone else is taken.","Dream big, work hard.","Knight never gives up."]; await reply(`💭 *QUOTE*\n\n"${qs[Math.floor(Math.random()*qs.length)]}"\n\n- Knight XMD`); }},
{ command: ['meme'], run: async ({ sock, from }) => { try{ const {data}=await axios.get('https://meme-api.com/gimme'); await sock.sendMessage(from,{image:{url:data.url}, caption:`😂 ${data.title}`}); }catch{ await sock.sendMessage(from,{text:'😂 Meme failed, try again'}); } }},
{ command: ['truth'], run: async ({ reply }) => { const t=["What is your biggest secret?","Who is your crush?","What is the most embarrassing thing you did?","Have you ever lied to your best friend?"]; await reply(`🎯 *TRUTH*\n\n${t[Math.floor(Math.random()*t.length)]}`); }},
{ command: ['dare'], run: async ({ reply }) => { const d=["Send a voice note singing a song","Change your DP to a funny pic for 1 hour","Text your crush Hi","Do 10 pushups and send video"]; await reply(`🔥 *DARE*\n\n${d[Math.floor(Math.random()*d.length)]}`); }},
];
