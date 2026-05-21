import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Bot, User, Zap, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

const QUICK_PROMPTS = [
  "What's the BTC setup right now?",
  "Is Gold (XAU) breaking out or fading?",
  "Give me a NASDAQ trade idea",
  "EUR/USD direction today?",
  "Compare BTC vs Gold as a safe haven",
  "Best risk:reward trade right now?",
];

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  const parts = msg.content.split(/(\*\*[^*]+\*\*)/g);

  return (
    <div className={cn("flex gap-3 group", isUser && "flex-row-reverse")}>
      <div className={cn(
        "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mt-0.5",
        isUser
          ? "bg-primary text-primary-foreground"
          : "bg-emerald-500/20 border border-emerald-500/40 text-emerald-400"
      )}>
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      <div className={cn(
        "max-w-[78%] rounded-lg px-4 py-3 text-sm leading-relaxed",
        isUser
          ? "bg-primary text-primary-foreground rounded-tr-none"
          : "bg-card border border-border text-foreground rounded-tl-none"
      )}>
        {isUser ? (
          <span>{msg.content}</span>
        ) : (
          <span>
            {parts.map((part, i) =>
              part.startsWith("**") && part.endsWith("**")
                ? <strong key={i} className="text-emerald-400 font-mono">{part.slice(2, -2)}</strong>
                : <span key={i}>{part}</span>
            )}
            {msg.streaming && (
              <span className="inline-block w-0.5 h-3.5 bg-emerald-400 ml-0.5 animate-pulse align-middle" />
            )}
          </span>
        )}
      </div>
    </div>
  );
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "ALPHA online. I have live prices for BTC, Gold, NASDAQ, EUR/USD and more. Ask me anything — trade setups, macro analysis, risk management, or specific levels. What are you watching?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    const userMessage: Message = { id: Date.now().toString(), role: "user", content: text.trim() };
    const assistantId = (Date.now() + 1).toString();

    setMessages(prev => [...prev, userMessage, { id: assistantId, role: "assistant", content: "", streaming: true }]);
    setInput("");
    setLoading(true);

    const history = [...messages, userMessage].map(m => ({ role: m.role, content: m.content }));

    abortRef.current = new AbortController();

    try {
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      const response = await fetch(`${base}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
        signal: abortRef.current.signal,
      });

      if (!response.ok || !response.body) throw new Error("Stream failed");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") break;
          try {
            const parsed = JSON.parse(payload) as { text?: string; error?: string };
            if (parsed.error) throw new Error(parsed.error);
            if (parsed.text) {
              fullText += parsed.text;
              setMessages(prev => prev.map(m =>
                m.id === assistantId ? { ...m, content: fullText, streaming: true } : m
              ));
            }
          } catch { /* skip malformed */ }
        }
      }

      setMessages(prev => prev.map(m =>
        m.id === assistantId ? { ...m, streaming: false } : m
      ));
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setMessages(prev => prev.map(m =>
        m.id === assistantId
          ? { ...m, content: "Connection interrupted. Try again.", streaming: false }
          : m
      ));
    } finally {
      setLoading(false);
      textareaRef.current?.focus();
    }
  }, [messages, loading]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const clearChat = () => {
    abortRef.current?.abort();
    setMessages([{
      id: "welcome",
      role: "assistant",
      content: "ALPHA online. I have live prices for BTC, Gold, NASDAQ, EUR/USD and more. Ask me anything — trade setups, macro analysis, risk management, or specific levels. What are you watching?",
    }]);
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
              <Bot className="h-5 w-5 text-emerald-400" />
            </div>
            ALPHA
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs font-mono">
              LIVE
            </Badge>
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Institutional AI analyst — real-time market awareness
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={clearChat} className="gap-2" data-testid="button-clear-chat">
          <RefreshCw className="h-3.5 w-3.5" />
          New Session
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-1 pb-4 min-h-0">
        {messages.map(msg => (
          <MessageBubble key={msg.id} msg={msg} />
        ))}
        <div ref={bottomRef} />
      </div>

      {messages.length === 1 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
          {QUICK_PROMPTS.map(prompt => (
            <button
              key={prompt}
              onClick={() => sendMessage(prompt)}
              className="text-left text-xs px-3 py-2 rounded-lg border border-border bg-card hover:bg-muted hover:border-primary/40 transition-colors text-muted-foreground hover:text-foreground"
              data-testid="quick-prompt"
            >
              <Zap className="h-3 w-3 inline mr-1.5 text-amber-500" />
              {prompt}
            </button>
          ))}
        </div>
      )}

      <div className="border border-border rounded-xl bg-card/60 p-3 mt-2">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about any asset, trade setup, macro view, risk levels..."
          className="min-h-[60px] max-h-40 resize-none border-0 bg-transparent focus-visible:ring-0 text-sm p-0 shadow-none"
          disabled={loading}
          data-testid="chat-input"
        />
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-muted-foreground">
            Enter to send · Shift+Enter for new line
          </span>
          <Button
            size="sm"
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="gap-2"
            data-testid="button-send-chat"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                Thinking
              </span>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                Send
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
