const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'routes', 'aiVoiceRoutes.js');
let content = fs.readFileSync(filePath, 'utf8');

const oldImport = `  getEligibleExamsForReminders\r\n} = require("../controllers/aiVoiceController");`;
const newImport = `  getEligibleExamsForReminders,\r\n  adminScheduleCall,\r\n  getCallCandidates\r\n} = require("../controllers/aiVoiceController");`;

if (content.includes(oldImport)) {
  content = content.replace(oldImport, newImport);
  fs.writeFileSync(filePath, content);
  console.log('SUCCESS: Added adminScheduleCall and getCallCandidates to import');
} else if (content.includes('adminScheduleCall,')) {
  console.log('ALREADY FIXED: imports already contain adminScheduleCall');
} else {
  console.log('ERROR: Could not find target import string');
  // Debug: show what's around line 24
  const lines = content.split('\n');
  for (let i = 22; i < 28 && i < lines.length; i++) {
    console.log(`Line ${i+1}: ${JSON.stringify(lines[i])}`);
  }
}

