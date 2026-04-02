const fs = require('fs');
async function test() {
  try {
    const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js");
    console.log("pdfjsLib loaded");
  } catch (e) {
    console.error(e);
  }
}
test();
