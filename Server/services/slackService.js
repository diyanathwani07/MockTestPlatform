const https = require('https');
const { URL } = require('url');

async function sendSlackMessage(webhookUrl, text) {
  return new Promise((resolve, reject) => {
    if (!webhookUrl) return reject(new Error('Webhook URL is required'));
    try {
      const parsedUrl = new URL(webhookUrl);
      const postData = JSON.stringify({ text });
      const options = {
        hostname: parsedUrl.hostname,
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };
      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(body);
          } else {
            reject(new Error('Slack API responded with status ' + res.statusCode));
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
