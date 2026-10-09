const fs = require('fs');
const mammoth = require('mammoth');

async function test() {
    console.log("Extracting HTML...");
    const result = await mammoth.convertToHtml({path: "c:/Users/HP/OneDrive/Desktop/MockTestSeries/CTET Paper 1 - 11th Jan 2023 (English-Hindi-Sanskrit).docx"});
    const html = result.value;
    console.log("HTML length:", html.length);
    console.log("Size in MB:", (Buffer.byteLength(html, 'utf8') / (1024 * 1024)).toFixed(2));
}
test();
