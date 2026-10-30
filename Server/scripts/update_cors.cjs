const fs = require('fs');
const path = require('path');

const serverFile = path.resolve('c:/Teaching Pariksha Development/mock test platform/MockTestPlatform/Server/server.js');
let content = fs.readFileSync(serverFile, 'utf8');

const oldBlock = `// Middleware
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost",
  "capacitor://localhost",
  "null",
  "file://",
  "https://mocktestplatform-lac.vercel.app",
  "https://prepmark.vercel.app",
  "https://prepmark.com",
  "https://www.prepmark.com",
  process.env.CLIENT_URL,
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
}));`;

const newBlock = `// Middleware
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost",
  "capacitor://localhost",
  "null",
  "file://",
  "https://mocktestplatform-lac.vercel.app",
  "https://prepmark.vercel.app",
  "https://prepmark.com",
  "https://www.prepmark.com",
  "https://svr10x7l-5173.inc1.devtunnels.ms",
  "https://svr10x7l-5173.inc1.devtunnels.ms/",
  process.env.CLIENT_URL,
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (
      !origin ||
      allowedOrigins.includes(origin) ||
      allowedOrigins.includes(origin.replace(/\\/$/, "")) ||
      origin.endsWith(".devtunnels.ms")
    ) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
}));`;

if (content.includes(oldBlock.replace(/\r\n/g, '\n'))) {
  content = content.replace(oldBlock.replace(/\r\n/g, '\n'), newBlock.replace(/\r\n/g, '\n'));
  fs.writeFileSync(serverFile, content, 'utf8');
  console.log('SUCCESS: Updated CORS allowedOrigins in server.js (LF)');
} else if (content.includes(oldBlock.replace(/\n/g, '\r\n'))) {
  content = content.replace(oldBlock.replace(/\n/g, '\r\n'), newBlock.replace(/\n/g, '\r\n'));
  fs.writeFileSync(serverFile, content, 'utf8');
  console.log('SUCCESS: Updated CORS allowedOrigins in server.js (CRLF)');
} else {
  console.log('Target block not found. Checking if already updated...');
  if (content.includes('svr10x7l-5173.inc1.devtunnels.ms')) {
    console.log('Already added!');
  } else {
    console.error('Could not find CORS block in server.js');
    process.exit(1);
  }
}

