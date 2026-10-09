const fs = require('fs');
const path = require('path');

function replaceInFile(fullPath) {
    let content = fs.readFileSync(fullPath, 'utf8');
    let original = content;

    // 1. Fix hardcoded purple/orange/blue in inline styles or CSS that should be var(--primary)
    // Common hardcoded colors used as primary in this project: #6E3FF3, #ff6146, #ff7a63, #FF7E5F, #FF5733, #3B82F6
    content = content.replace(/var\(--primary-color,\s*#6E3FF3\)/ig, 'var(--primary)');
    content = content.replace(/var\(--violet,\s*#6E3FF3\)/ig, 'var(--violet)');
    content = content.replace(/#6E3FF3/ig, 'var(--primary)');
    content = content.replace(/#ff6146/ig, 'var(--primary)');
    content = content.replace(/#ff7a63/ig, 'var(--primary)');
    
    // In CSS files, replace hardcoded white text on var(--violet) or var(--primary)
    if (fullPath.endsWith('.css')) {
        content = content.replace(/background:\s*var\(--(?:violet|primary)\);?\s*color:\s*(?:#ffffff|#fff|white)\b/ig, 'background: var(--primary); color: var(--primary-foreground)');
    }

    if (content !== original) {
        fs.writeFileSync(fullPath, content);
        console.log('Fixed colors in', fullPath);
    }
}

function scanDir(dir) {
    const files = fs.readdirSync(dir);
    for (const f of files) {
        const full = path.join(dir, f);
        if (fs.statSync(full).isDirectory()) {
            if (full.includes('node_modules')) continue;
            scanDir(full);
        } else if (full.endsWith('.jsx') || full.endsWith('.css')) {
            replaceInFile(full);
        }
    }
}

scanDir('Client/src');
