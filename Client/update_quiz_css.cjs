const fs = require('fs');
const path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/css/Quiz.css';
let content = fs.readFileSync(path, 'utf8');

const target = `    /* Buttons Adjustments */
    .quiz-action-bar {
      flex-direction: column;
      align-items: stretch;
      gap: 16px;
    }`;

const replacement = `    /* Buttons Adjustments */
    .quiz-action-bar {
      display: none !important;
    }`;

content = content.replace(target, replacement);
fs.writeFileSync(path, content, 'utf8');
console.log('Updated Quiz.css');
