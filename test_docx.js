const mammoth = require("mammoth");
mammoth.extractRawText({path: "c:/Users/HP/OneDrive/Desktop/MockTestSeries/CTET Paper 1 - 11th Jan 2023 (English-Hindi-Sanskrit).docx"})
    .then(function(result){
        const text = result.value; 
        console.log("Extracted characters:", text.length);
        const matches = text.match(/\n\d+\)\s+[^\n]+/g);
        console.log("Found pattern matches:", matches ? matches.length : 0);
        if (matches) {
            console.log("First 10 matches:");
            console.log(matches.slice(0,10));
        }
    })
    .catch(function(err) { console.log(err); });
