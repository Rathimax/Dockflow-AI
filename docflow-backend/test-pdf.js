const pdfParse = require('pdf-parse');
console.log("type:", typeof pdfParse);
try {
    pdfParse(Buffer.from('not a real pdf but testing the call'));
    console.log("Called without new successfully");
} catch(e) {
    console.log("Error directly calling pdfParse:", e.message);
}
try {
    if (pdfParse.PDFParse) {
        console.log("type of PDFParse:", typeof pdfParse.PDFParse);
        pdfParse.PDFParse(Buffer.from(''));
    }
} catch (e) {
    console.log("Error calling PDFParse:", e.message);
}
