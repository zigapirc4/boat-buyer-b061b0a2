import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Send, Loader2, Bot, User, Ship } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ReactMarkdown from "react-markdown";

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/boat-chat`;

const SUGGESTIONS = [
  "I'm looking for a sailboat under €50,000 in Croatia",
  "Show me powerboats 30-40 feet in the Mediterranean",
  "What's a good beginner sailboat for €20,000?",
  "Compare the cheapest boats you have near Italy",
];

async function streamChat({
  messages,
  userLocation,
  onDelta,
  onDone,
  onError,
}: {
  messages: Msg[];
  userLocation: string;
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (err: string) => void;
}) {
  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ messages, userLocation }),
  });

  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}));
    onError(data.error || `Error ${resp.status}`);
    return;
  }

  if (!resp.body) {
    onError("No response stream");
    return;
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let idx: number;
    while ((idx = buffer.indexOf("\n")) !== -1) {
      let line = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (!line.startsWith("data: ")) continue;
      const json = line.slice(6).trim();
      if (json === "[DONE]") { onDone(); return; }
      try {
        const parsed = JSON.parse(json);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) onDelta(content);
      } catch {}
    }
  }
  onDone();
}

const BoatChat = () => {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [userLocation, setUserLocation] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json&accept-language=en`
          );
          const data = await res.json();
          const country = data?.address?.country || "";
          const city = data?.address?.city || data?.address?.town || "";
          setUserLocation(`${city}, ${country}`.replace(/^, /, ""));
        } catch {}
      }, () => {}, { timeout: 5000 });
    }
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async (text: string) => {
    if (!text.trim() || isLoading) return;
    const userMsg: Msg = { role: "user", content: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    let assistantSoFar = "";
    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      await streamChat({
        messages: [...messages, userMsg],
        userLocation,
        onDelta: upsert,
        onDone: () => setIsLoading(false),
        onError: (err) => {
          upsert(`\n\n⚠️ ${err}`);
          setIsLoading(false);
        },
      });
    } catch {
      upsert("\n\n⚠️ Connection error. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen app-page-bg">
      <div className="max-w-2xl mx-auto flex flex-col min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-primary/15 bg-card/75 backdrop-blur-sm">
        <Link to="/" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center border border-primary/25">
            <Ship className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-semibold text-sm">BoatBuyer AI</h1>
            <p className="text-xs text-muted-foreground">Find your perfect boat</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-12 space-y-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
              <Bot className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">What boat are you looking for?</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Tell me your budget, preferred type, size, and cruising area — I'll find the best matches.
              </p>
            </div>
            <div className="grid gap-2 max-w-md mx-auto">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => send(s)}
                  className="text-left text-sm px-4 py-3 rounded-lg border border-primary/15 bg-card/70 hover:bg-card transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                <Bot className="w-4 h-4 text-primary" />
              </div>
            )}
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card/85 border border-primary/10"
              }`}
            >
              {msg.role === "assistant" ? (
                <div className="prose prose-sm dark:prose-invert max-w-none [&_a]:text-primary [&_a]:underline [&_p]:my-1 [&_li]:my-0.5 [&_ul]:my-1 [&_ol]:my-1">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm">{msg.content}</p>
              )}
            </div>
            {msg.role === "user" && (
              <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-1">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <div className="bg-card/85 border border-primary/10 rounded-2xl px-4 py-3">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-primary/15 p-4 bg-card/75 backdrop-blur-sm">
        <form
          onSubmit={(e) => { e.preventDefault(); send(input); }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe your dream boat..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
      </div>
    </div>
  );
};

export default BoatChat;
