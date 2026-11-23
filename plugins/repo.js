// KNIGHT XMD - Repo - Show Fork, Stars, All
// By Faceless Tech
const axios = require('axios');

const REPO_OWNER = 'Simontechempire';
const REPO_NAME = 'Knight-xmd';
const REPO_URL = 'https://github.com/Simontechempire/Knight-xmd.git';

module.exports = [
  {
    command: ['repo', 'repository', 'sc', 'script', 'fork', 'star'],
    run: async ({ sock, from, m, text, reply }) => {
      try {
        await reply('📦 Fetching Repo...');

        // Allow .repo username/repo too
        let owner = REPO_OWNER;
        let repo = REPO_NAME;
        if (text && text.includes('/')) {
          const parts = text.trim().split('/').map(s => s.replace(/[^a-zA-Z0-9._-]/g, ''));
          if (parts[0]) owner = parts[0];
          if (parts[1]) repo = parts[1];
        }

        const { data } = await axios.get(`https://api.github.com/repos/${owner}/${repo}`, {
          headers: { 'User-Agent': 'Knight-XMD' },
          timeout: 20000
        });

        const txt = `╭━━━〔 ⚔️ KNIGHT XMD REPO 〕━━━╮\n\n` +
          `  📦 *Name:* ${data.full_name}\n` +
          `  📝 *Desc:* ${data.description || 'No description'}\n` +
          `  👤 *Owner:* ${data.owner.login}\n` +
          `  🌐 *Language:* ${data.language || 'JavaScript'}\n` +
          `  📅 *Created:* ${new Date(data.created_at).toLocaleDateString()}\n` +
          `  🔄 *Updated:* ${new Date(data.updated_at).toLocaleDateString()}\n\n` +
          `  ⭐ *Stars:* ${data.stargazers_count}\n` +
          `  🍴 *Forks:* ${data.forks_count}\n` +
          `  👀 *Watchers:* ${data.watchers_count}\n` +
          `  ❗ *Issues:* ${data.open_issues_count}\n` +
          `  📁 *Size:* ${(data.size / 1024).toFixed(2)} MB\n` +
          `  📜 *License:* ${data.license?.name || 'No License'}\n` +
          `  🌿 *Branch:* ${data.default_branch}\n\n` +
          `  🔗 *Link:* ${data.html_url}\n` +
          `  📥 *Clone:*\n` +
          `  git clone ${REPO_URL}\n\n` +
          `  ⭐ Star am, 🍴 Fork am!\n\n` +
          `╰━━━━━━━━━━━━━━━━━━╯\n` +
          `By Knight XMD ⚔️`;

        // Try send with repo image / owner avatar
        try {
          await sock.sendMessage(from, {
            image: { url: data.owner.avatar_url },
            caption: txt
          }, { quoted: m });
        } catch {
          await sock.sendMessage(from, { text: txt }, { quoted: m });
        }

      } catch (e) {
        // Fallback if API fail / rate limit
        await sock.sendMessage(from, { text:
          `╭━━━〔 ⚔️ KNIGHT XMD REPO 〕━━━╮\n\n` +
          `  📦 *Name:* Simontechempire/Knight-xmd\n` +
          `  🔗 *Link:* https://github.com/Simontechempire/Knight-xmd\n` +
          `  📥 *Clone:*\n  git clone https://github.com/Simontechempire/Knight-xmd.git\n\n` +
          `  ⭐ Star am, 🍴 Fork am!\n\n` +
          `╰━━━━━━━━━━━━━━━━━━╯\nBy Knight XMD ⚔️`
        }, { quoted: m });
      }
    }
  },
];
