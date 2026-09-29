const fs = require('fs');
const path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/Login.jsx';
let content = fs.readFileSync(path, 'utf8');

const startStr = '{isMobile && step === "role" && (';
const endStr = '{(!isMobile || step === "form") && (';

const startIdx = content.indexOf(startStr);
const endIdx = content.indexOf(endStr);

if(startIdx > -1 && endIdx > -1) {
    content = content.substring(0, startIdx) + content.substring(endIdx);
    fs.writeFileSync(path, content, 'utf8');
    console.log('Successfully removed role block!');
} else {
    console.log('Could not find boundaries.', startIdx, endIdx);
}
