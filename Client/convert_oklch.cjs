const fs = require('fs');
const culori = require('culori');

const path = "src/css/themes.css";
let text = fs.readFileSync(path, 'utf8');

const oklchRegex = /oklch\(([^)]+)\)/g;

text = text.replace(oklchRegex, (match, inner) => {
    // inner looks like: .88 .05 91.79
    const parts = inner.trim().split(/\s+/);
    if (parts.length === 3) {
        const l = parseFloat(parts[0]);
        const c = parseFloat(parts[1]);
        const h = parseFloat(parts[2]);
        const hex = culori.formatHex({ mode: 'oklch', l, c, h });
        if (hex) return hex;
    }
    return match;
});

fs.writeFileSync(path, text, 'utf8');
console.log("Converted all oklch to hex");
