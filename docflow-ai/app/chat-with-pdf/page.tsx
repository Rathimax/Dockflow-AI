"use client";

import { useState } from "react";
import UploadBox from "@/components/UploadBox";
import axios from "axios";
import ReactMarkdown from "react-markdown";

interface Message {
  role: "user" | "ai";
  content: string;
}

export default function ChatWithPDFPage() {
  const [extractedText, setExtractedText] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const handleExtractSuccess = (data: any) => {
    if (data.text) {
      setExtractedText(data.text);
      setMessages([
        { role: "ai", content: "I've read the document! What would you like to know about it?" }
      ]);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !extractedText || isTyping) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsTyping(true);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

    try {
      const response = await axios.post(`${apiUrl}/api/ai/chat`, {
        text: extractedText,
        question: userMessage
      });
      
      setMessages(prev => [...prev, { role: "ai", content: response.data.answer }]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { role: "ai", content: "Sorry, I encountered an error answering that question." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 md:py-16">
      <div className="text-center mb-10 md:mb-12 animate-in slide-in-from-bottom-4 duration-500">
        <h1 className="text-3xl md:text-6xl font-black text-foreground tracking-tighter mb-4">
          Chat with PDF
        </h1>
        <p className="text-sm md:text-lg text-foreground/40 max-w-2xl mx-auto font-bold tracking-tight">
          Ask questions and get instant answers specific to your document.
        </p>

      </div>

      {!extractedText ? (
        <UploadBox 
          endpoint="/api/ai/extract-text" 
          accept=".pdf,.docx" 
          responseType="json"
          onSuccess={handleExtractSuccess}
        />
      ) : (
        <div className="bg-background border border-divider rounded-[2rem] md:rounded-[2.5rem] shadow-2xl shadow-primary/5 overflow-hidden flex flex-col h-[500px] md:h-[650px] animate-in slide-in-from-bottom-4 duration-500">
          <div className="bg-muted/50 border-b border-divider p-4 md:p-6 flex justify-between items-center">
            <div className="flex items-center gap-3">
               <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-primary text-white font-black shadow-lg shadow-primary/20">AI</div>
               <div>
                 <h2 className="font-black text-foreground text-sm md:text-base tracking-tight">DocFlow AI</h2>
                 <p className="text-[10px] md:text-xs text-foreground/40 font-bold uppercase tracking-widest leading-none">Gemini 1.5 Pro</p>
               </div>
            </div>
            <button 
              onClick={() => { setExtractedText(null); setMessages([]); }}
              className="text-[10px] md:text-xs font-black uppercase tracking-widest text-foreground/40 hover:text-rose-500 transition-colors"
            >
              Reset
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 bg-background">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] md:max-w-[80%] rounded-[1.5rem] px-5 py-4 ${
                  msg.role === "user" 
                    ? "bg-primary text-white rounded-br-none shadow-xl shadow-primary/20 font-bold" 
                    : "bg-muted border border-divider text-foreground rounded-bl-none shadow-sm prose prose-sm dark:prose-invert font-medium"
                }`}>
                  {msg.role === "ai" ? <ReactMarkdown>{msg.content}</ReactMarkdown> : msg.content}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-muted border border-divider text-foreground/60 rounded-[1.5rem] rounded-bl-none px-6 py-4 shadow-sm flex gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-primary/30 animate-bounce" style={{ animationDelay: "0ms" }}></span>
                  <span className="w-2 h-2 rounded-full bg-primary/30 animate-bounce" style={{ animationDelay: "150ms" }}></span>
                  <span className="w-2 h-2 rounded-full bg-primary/30 animate-bounce" style={{ animationDelay: "300ms" }}></span>
                </div>
              </div>
            )}
          </div>

          <form onSubmit={sendMessage} className="p-4 md:p-6 bg-background border-t border-divider flex gap-2">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about the document..."
              className="flex-1 bg-muted border-2 border-transparent focus:bg-background focus:border-primary/20 focus:ring-0 rounded-xl md:rounded-2xl px-5 py-3 md:py-4 outline-none transition-all font-bold text-sm md:text-base placeholder:text-foreground/20"
            />
            <button 
              type="submit"
              disabled={!input.trim() || isTyping}
              className="bg-primary hover:bg-primary/95 text-white rounded-xl md:rounded-2xl px-6 md:px-8 font-black transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none shadow-lg shadow-primary/20 flex items-center justify-center p-3"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="md:w-6 md:h-6"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>
            </button>
          </form>
        </div>
      )}

      {/* Ad Placeholder */}
      <div className="mt-16 bg-muted border border-divider rounded-[2rem] h-32 flex items-center justify-center text-foreground/20 text-[10px] font-black uppercase tracking-widest">
        Advertisement Placeholder
      </div>
    </div>
  );
}
