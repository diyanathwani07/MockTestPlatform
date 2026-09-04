const https = require('https');

async function sendSlackMessage(channelId, text, blocks = null) {
  return new Promise((resolve, reject) => {
    const token = process.env.SLACK_BOT_TOKEN;
    if (!token) return reject(new Error('SLACK_BOT_TOKEN is not configured'));
    
    // Fallback to env channel if not provided
    const targetChannel = channelId || process.env.SLACK_CHANNEL_ID;
    if (!targetChannel) return reject(new Error('No Slack channel ID provided'));

    try {
      const payload = {
        channel: targetChannel,
        text: text
      };
      
      if (blocks) {
        payload.blocks = blocks;
      }

      const postData = JSON.stringify(payload);
      const options = {
        hostname: 'slack.com',
        path: '/api/chat.postMessage',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Authorization': `Bearer ${token}`,
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const responseData = JSON.parse(body);
              if (!responseData.ok) {
                reject(new Error(`Slack API error: ${responseData.error}`));
              } else {
                resolve(responseData);
              }
            } catch (parseErr) {
              resolve(body);
            }
          } else {
            reject(new Error(`Slack API responded with status ${res.statusCode}`));
          }
        });
      });
      
      req.on('error', e => reject(e));
      req.write(postData);
      req.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { sendSlackMessage };
