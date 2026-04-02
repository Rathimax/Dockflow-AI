async function test() {
  try {
    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
    console.log("pdfjsLib loaded:", typeof pdfjsLib.getDocument);
  } catch (e) {
    console.error("import mjs failed:", e);
    try {
      const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.mjs");
      console.log("pdfjsLib loaded sync:", typeof pdfjsLib.getDocument);
    } catch(e2) {
      console.log("require failed:", e2);
    }
  }
}
test();
