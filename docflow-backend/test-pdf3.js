const fs = require('fs');
const pdfParse = require('pdf-parse');
async function run() {
    const parser = new pdfParse.PDFParse('test_file.pdf'); 
    console.log(Object.getPrototypeOf(parser));
}
run();
