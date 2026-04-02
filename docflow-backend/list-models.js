require("dotenv").config();
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error("NO API KEY");
    process.exit(1);
}
fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`)
    .then(r => r.json())
    .then(data => {
        if (data.models) {
            console.log("AVAILABLE GEN CONTENT MODELS:");
            data.models.filter(m => m.supportedGenerationMethods.includes("generateContent")).forEach(m => console.log(m.name));
        } else {
            console.log(data);
        }
    })
    .catch(console.error);
