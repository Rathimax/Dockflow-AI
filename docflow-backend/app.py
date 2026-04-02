import os
from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)

# --- Configure CORS (Allow all origins temporarily) ---
CORS(app)

# --- Environment Variable Configuration ---
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

@app.route("/")
def home():
    return "DocFlow AI Backend Running"

@app.route("/health")
def health():
    return jsonify({"status": "ok", "api_key_configured": bool(GOOGLE_API_KEY)})

if __name__ == "__main__":
    # Standard Flask entry point
    port = int(os.environ.get("PORT", 5005))
    app.run(host="0.0.0.0", port=port)
