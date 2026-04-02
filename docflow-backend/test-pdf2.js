const pdfParse = require('pdf-parse');
console.log("Keys in pdfParse:", Object.keys(pdfParse));
try {
    const parser = new pdfParse.PDFParse(Buffer.from('dummy'));
    console.log("parser instance keys:", Object.keys(parser));
    // Let's print out what methods it has
} catch (e) {
    console.error(e);
}
