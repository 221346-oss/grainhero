"use client";

import React, { useState, useRef, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Send, Loader2, Bot, User } from "lucide-react";
import { toast } from "sonner";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hello! I am the GrainHero AI Assistant. I have access to your live sensor data and equipment manuals. How can I help you today?" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      // We call the new FastAPI endpoint we created in Step 1!
      const response = await fetch("http://localhost:8001/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: userMessage,
          // In a real app, you'd pull this from the logged-in user's session
          tenant_id: "00000000-0000-0000-0000-000000000000", 
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response from AI");
      }

      const data = await response.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.answer }]);
    } catch (error) {
      console.error(error);
      toast.error("Failed to connect to the AI Assistant.");
      setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I am currently offline or experiencing an error." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="fixed bottom-6 right-6 z-50 h-12 w-auto shadow-lg rounded-full px-5 gap-2 border-transparent transition-all hover:scale-105" style={{ backgroundColor: '#d4f5a2', color: '#3a6b1a' }}>
          <Sparkles className="h-5 w-5" style={{ color: '#3a6b1a' }} />
          <span className="font-semibold text-sm">AI Copilot</span>
        </Button>
      </SheetTrigger>
      
      <SheetContent className="w-[400px] sm:w-[540px] flex flex-col h-full p-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" style={{ color: '#3a6b1a' }} />
            GrainHero AI Assistant
          </SheetTitle>
        </SheetHeader>

        {/* Chat History Area */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="flex flex-col gap-4">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: '#d4f5a2' }}>
                    <Bot className="h-5 w-5" style={{ color: '#3a6b1a' }} />
                  </div>
                )}
                
                <div
                  className={`p-3 rounded-lg max-w-[80%] text-sm ${msg.role === "user" ? "rounded-tr-none" : "bg-muted rounded-tl-none"}`}
                  style={msg.role === "user" ? { backgroundColor: '#d4f5a2', color: '#3a6b1a' } : {}}
                >
                  {msg.content}
                </div>

                {msg.role === "user" && (
                  <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: '#d4f5a2' }}>
                    <User className="h-5 w-5" style={{ color: '#3a6b1a' }} />
                  </div>
                )}
              </div>
            ))}
            
            {isLoading && (
              <div className="flex gap-3 justify-start">
                 <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: '#d4f5a2' }}>
                    <Bot className="h-5 w-5" style={{ color: '#3a6b1a' }} />
                  </div>
                  <div className="p-3 rounded-lg bg-muted rounded-tl-none flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyzing data...
                  </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="p-4 border-t bg-background">
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="flex items-center gap-2"
          >
            <Input 
              placeholder="Ask about silos, manuals, or alerts..." 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
              className="flex-1"
            />
            <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
