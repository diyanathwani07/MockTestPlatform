const mammoth = require("mammoth");
mammoth.extractRawText({path: "c:/Users/HP/OneDrive/Desktop/MockTestSeries/CTET Paper 1 - 11th Jan 2023 (English-Hindi-Sanskrit).docx"})
    .then(function(result){
        const text = result.value; 
        const lines = text.split('\n');
        for (let i=0; i<Math.min(lines.length, 100); i++) {
            if (lines[i].trim() !== "") console.log(`Line ${i}: ${lines[i]}`);
        }
        console.log("----");
        // Also look for "Mathematics"
        for (let i=0; i<lines.length; i++) {
            if (lines[i].toLowerCase().includes("mathematics")) {
                console.log(`Line ${i}: ${lines[i]}`);
            }
        }
    })
    .catch(function(err) { console.log(err); });
