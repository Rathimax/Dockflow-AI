# DocFlow AI — Backend

Node.js + Express server for file conversion and AI features. Designed to be deployed on [Render.com](https://render.com).

## Local Development

**1. Install dependencies**
```bash
npm install
```

**2. Set up environment variables**
```bash
cp .env.example .env
```

**3. Run the dev server**
```bash
npm run dev
```

The server will start at `http://localhost:5000`.

**4. Test health check**
```bash
curl http://localhost:5000/health
# → { "status": "ok" }
```

---

## Deploying to Render.com

1. **Push to GitHub** – Push this `docflow-backend/` folder to a GitHub repository.

2. **Create a Web Service on Render**:
   - Go to [render.com](https://render.com) and click **New > Web Service**.
   - Connect your GitHub repository.
   - Set the **Root Directory** to `docflow-backend` (if monorepo).

3. **Configure the Service**:
   | Setting | Value |
   |---|---|
   | **Runtime** | Node |
   | **Build Command** | `npm install` |
   | **Start Command** | `node server.js` |

4. **Add Environment Variables**:
   - In the Render dashboard, go to **Environment** and add `PORT` (Render sets this automatically).

5. **Deploy** – Click **Deploy**. Render will build and host the server.

---

## API Routes

| Method | Route | Description |
|---|---|---|
| GET | `/health` | Health check |
| POST | `/api/convert/pdf-to-word` | Convert PDF → DOCX |
| POST | `/api/convert/word-to-pdf` | Convert DOCX → PDF |
| POST | `/api/convert/image-to-pdf` | Convert Image(s) → PDF |
| POST | `/api/convert/pdf-to-image` | Convert PDF → Image |
| POST | `/api/convert/compress-pdf` | Compress a PDF |
| POST | `/api/convert/merge-pdf` | Merge multiple PDFs |
| POST | `/api/ai/summarize` | AI Summarize a document |
| POST | `/api/ai/chat` | Chat with a document |

---

## File Handling

- All uploaded files are stored temporarily in `/tmp/uploads/`.
- Files are **automatically deleted after 60 seconds** via `utils/fileCleanup.js`.
