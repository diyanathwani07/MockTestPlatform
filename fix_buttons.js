const fs = require('fs');
const files = [
  'Client/src/admin/ManageQuizzes.jsx',
  'Client/src/admin/ExamSeriesManager.jsx',
  'Client/src/admin/PracticeQuizzes.jsx',
  'Client/src/admin/Questions.jsx',
  'Client/src/admin/AiPlans.jsx'
];
files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;
    content = content.replace(/style=\{\{([\s\S]*?)\}\}/g, (match, styleBody) => {
      if (styleBody.includes('var(--violet)') || styleBody.includes('var(--primary)')) {
        let newBody = styleBody
          .replace(/color:\s*\"#ffffff\"/g, 'color: \"var(--primary-foreground)\"')
          .replace(/color:\s*\"#fff\"/g, 'color: \"var(--primary-foreground)\"')
          .replace(/color:\s*\'#fff\'/g, 'color: \"var(--primary-foreground)\"')
          .replace(/color:\s*\"white\"/g, 'color: \"var(--primary-foreground)\"')
          .replace(/color:\s*([^?]+)\s*\?\s*\"#ffffff\"\s*:/g, 'color:  ? \"var(--primary-foreground)\" :')
          .replace(/color:\s*([^?]+)\s*\?\s*\"white\"\s*:/g, 'color:  ? \"var(--primary-foreground)\" :');
        return 'style={{' + newBody + '}}';
      }
      return match;
    });
    if (content !== original) {
      fs.writeFileSync(file, content);
      console.log('Fixed:', file);
    }
  }
});
