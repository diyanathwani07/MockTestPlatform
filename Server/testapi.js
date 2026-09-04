const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const User = require('./models/User');
  const user = await User.findOne({ role: 'user' });
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
  
  // No need for FormData, we can just send JSON since it handles both? Wait, the route says `upload.single('attachment')`, which usually requires multipart if we send files, but for testing JSON might be rejected by multer. Let's use standard HTTP request or just let it pass without file.
  // Actually, multer upload.single doesn't block JSON, but let's use built-in HTTP.
  const http = require('http');
  const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
  let body = '';
  body += `--${boundary}\r\nContent-Disposition: form-data; name="subject"\r\n\r\nTest from Agent API\r\n`;
  body += `--${boundary}\r\nContent-Disposition: form-data; name="category"\r\n\r\nSupport\r\n`;
  body += `--${boundary}\r\nContent-Disposition: form-data; name="message"\r\n\r\nChecking AuditLog\r\n`;
  body += `--${boundary}--\r\n`;

  const req = http.request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/tickets',
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'multipart/form-data; boundary=' + boundary,
      'Content-Length': Buffer.byteLength(body)
    }
  }, (res) => {
    let raw = '';
    res.on('data', d => raw += d);
    res.on('end', async () => {
      console.log('API Response:', res.statusCode, raw);
      
      const AuditLog = require('./models/AuditLog');
      const logs = await AuditLog.find({ action: { $regex: 'SLACK' } }).sort({ createdAt: -1 }).limit(5);
      console.log('SLACK LOGS:', logs.map(l => l.action + ': ' + l.details));
      process.exit(0);
    });
  });
  
  req.on('error', console.error);
  req.write(body);
  req.end();
});
