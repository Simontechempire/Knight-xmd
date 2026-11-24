// KNIGHT XMD - Ping2 / Speed Test - REAL - With Speed Video
// Measures real latency + real download speed, sends video with result
const axios = require('axios');

function formatSpeed(mbps) {
  if (mbps >= 100) return `${mbps.toFixed(1)} Mbps 🚀`;
  if (mbps >= 20) return `${mbps.toFixed(1)} Mbps ⚡`;
  if (mbps >= 5) return `${mbps.toFixed(1)} Mbps ✅`;
  return `${mbps.toFixed(1)} Mbps 🐢`;
}

function formatBytes(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

async function testDownloadSpeed() {
  // Real test: Cloudflare speed test file - 5MB, no key
  const urls = [
    'https://speed.cloudflare.com/__down?bytes=5000000',
    'https://speed.cloudflare.com/__down?bytes=2000000',
  ];
  for (const url of urls) {
    try {
      const start = Date.now();
      const res = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 20000,
        maxContentLength: 20 * 1024 * 1024,
      });
      const end = Date.now();
      const seconds = (end - start) / 1000;
      if (seconds <= 0 || !res.data?.byteLength) continue;
      const bits = res.data.byteLength * 8;
      const mbps = (bits / seconds) / 1000000;
      return { mbps, bytes: res.data.byteLength, seconds };
    } catch {}
  }
  return null;
}

module.exports = [
  {
    command: ['ping2', 'speed', 'speedtest', 'pingtest'],
    run: async ({ sock, from, m, reply }) => {
      const start = Date.now();

      // 1. Send measuring message - real round-trip
      const sent = await sock.sendMessage(from, { text: '⚡ *Testing speed...*' }, { quoted: m });
      const latency = Date.now() - start;

      try {
        // 2. Real download speed test
        const speed = await testDownloadSpeed();
        const uptime = process.uptime();
        const upH = Math.floor(uptime / 3600);
        const upM = Math.floor((uptime % 3600) / 60);
        const mem = (process.memoryUsage().rss / 1024 / 1024).toFixed(0);

        const pingMs = latency;
        const speedTxt = speed ? formatSpeed(speed.mbps) : 'N/A';
        const downTxt = speed ? `${formatBytes(speed.bytes)} in ${speed.seconds.toFixed(2)}s` : 'Test failed';

        const caption =
          `╭━━━〘 ⚡ KNIGHT XMD SPEED 〙━━━╮\n` +
          `│\n` +
          `│ 🏓 *Ping:* ${pingMs}ms\n` +
          `│ 📶 *Download:* ${speedTxt}\n` +
          `│ 📥 *Tested:* ${downTxt}\n` +
          `│ ⏱️ *Uptime:* ${upH}h ${upM}m\n` +
          `│ 🧠 *RAM:* ${mem} MB\n` +
          `│ 🤖 *Bot:* Online ✅\n` +
          `│\n` +
          `╰━━━━━━━━━━━━━━━━━━╯\n` +
          `> Knight XMD ⚔️`;

        // 3. Delete measuring message, send video with real speed
        try { await sock.sendMessage(from, { delete: sent.key }); } catch {}

        // Real speed video - small, fast CDN video
        const videoUrls = [
          'https://cdn.pixabay.com/video/2020/05/25/40130-424930032_small.mp4',
          'https://cdn.pixabay.com/video/2021/08/04/83333-582931673_small.mp4',
        ];

        let sentVideo = false;
        for (const vUrl of videoUrls) {
          try {
            const vRes = await axios.get(vUrl, { responseType: 'arraybuffer', timeout: 30000, maxContentLength: 15 * 1024 * 1024 });
            if (!vRes.data?.byteLength || vRes.data.byteLength < 1000) continue;
            await sock.sendMessage(from, {
              video: Buffer.from(vRes.data),
              caption,
              gifPlayback: true,
            }, { quoted: m });
            sentVideo = true;
            break;
          } catch {}
        }

        // Fallback if video CDN fail - send text only, still real speed
        if (!sentVideo) {
          await sock.sendMessage(from, { text: caption }, { quoted: m });
        }

      } catch (e) {
        await reply(`🏓 Pong! ${Date.now() - start}ms\n⚠️ Speed test failed, try again.`);
      }
    }
  },
];
