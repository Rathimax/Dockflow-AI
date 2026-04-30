# 🚀 DocFlow AI

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22-green?style=flat-square&logo=node.js)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![Gemini AI](https://img.shields.io/badge/Gemini_AI-2.5_Flash-orange?style=flat-square&logo=google-gemini)](https://ai.google.dev/)

**DocFlow AI** is a powerful, privacy-first, and completely free alternative to premium document suites like Sejda and I Love PDF. Built for students and professionals alike, it leverages cutting-edge AI and open-source libraries to provide high-quality document intelligence without any signups or rate limits.

---

## ✨ Key Features

### 🔄 Document Conversion
*   **PDF to Word**: High-fidelity conversion using advanced Python engines.
*   **Word to PDF**: Instant professional PDF generation.
*   **Images to PDF**: Convert JPG, PNG, and WEBP images into organized PDF documents.
*   **PDF to Image**: Export high-quality PNGs from your PDF pages.
*   **PowerPoint Support**: Seamlessly convert between PPTX and PDF formats.

### 🛠️ PDF Manipulation
*   **Visual PDF Editor**: Load PDFs to edit text, add shapes, draw, and sign documents directly in the browser.
*   **Compress PDF**: Reduce file size while maintaining visual clarity.
*   **Merge & Split**: Combine multiple PDFs or delete specific pages with ease.
*   **Watermarking**: Add professional text or image watermarks to protect your documents.
*   **Remove Watermark**: Advanced best-effort watermark removal via document reconstruction.

### 🧠 AI Intelligence (Powered by Gemini)
*   **AI Summarize**: Extract key insights from lengthy documents into concise bullet points.
*   **Chat with PDF**: Ask questions and have a conversation with your documents.
*   **Translation**: Instantly translate entire document contents into 10+ languages.

---

## 🛡️ Privacy & Philosophy

*   **No Signups**: Jump straight into your work. No account creation required.
*   **No Rate Limits**: Convert as many files as you need, whenever you need.
*   **Privacy-First**: Your data is yours. All uploaded and processed files are permanently deleted within **60 seconds**.
*   **Open Access**: Dedicated to being a student-friendly alternative to expensive subscription services.

---

## 🏗️ Technical Architecture

### Frontend (`/docflow-ai`)
- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS 4 with Framer Motion for smooth animations.
- **Components**: Radix UI primitives and Lucide icons.
- **Client Logic**: TypeScript for robust, type-safe development.

### Backend (`/docflow-backend`)
- **Runtime**: Node.js 22 (Express)
- **Engines**: 
  - **LibreOffice**: Powering complex document conversions.
  - **pdf2docx**: High-fidelity Python engine for Word conversion.
  - **pdf-lib**: Native JavaScript PDF manipulation.
  - **Sharp**: High-performance image processing.
- **AI**: Google Gemini 2.5 Flash API.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v20+)
- Python 3.x
- LibreOffice (for backend conversion features)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Rathimax/Dockflow-AI.git
   cd Dockflow-AI
   ```

2. **Setup Backend:**
   ```bash
   cd docflow-backend
   npm install
   # Create a .env file with your GEMINI_API_KEY
   npm run dev
   ```

3. **Setup Frontend:**
   ```bash
   cd docflow-ai
   npm install
   npm run dev
   ```

4. **Access the App:**
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🐳 Docker Deployment

The backend is ready for containerization:
```bash
cd docflow-backend
docker build -t docflow-backend .
docker run -p 5000:5000 docflow-backend
```

---

## 📝 License

Distributed under the MIT License. See `LICENSE` for more information.

*Built with ❤️ by Abhay Raj Rathi for the student community.*
