import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Loader2, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface Msg { role: 'user' | 'assistant'; content: string }

const STORAGE_KEY = 'waxa_chat_history';

const ChatbotWidget = () => {
  const [open, setOpen] = useState(false);
  const [pulsing, setPulsing] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [messages, setMessages] = useState<Msg[]>(() => {
    if (typeof window === 'undefined') return [];
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Heartbeat after 10s
  useEffect(() => {
    if (open) return;
    const t = setTimeout(() => {
      setPulsing(true);
      setShowHint(true);
      setTimeout(() => setShowHint(false), 8000);
    }, 10000);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-30)));
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const newMsgs: Msg[] = [...messages, { role: 'user', content: text }];
    setMessages(newMsgs);
    setInput('');
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('chatbot', {
        body: { messages: newMsgs },
      });
      if (error) throw error;
      setMessages([...newMsgs, { role: 'assistant', content: data?.reply ?? 'Lo siento, no pude responder.' }]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error de conexión';
      setMessages([...newMsgs, { role: 'assistant', content: `⚠️ ${msg}. Intenta de nuevo o escribe a info@waxapp.mx` }]);
    }
    setLoading(false);
  };

  const greeting: Msg = {
    role: 'assistant',
    content: '¡Hola! Soy Waxa, tu asistente. ¿Buscas algún producto, tienes dudas sobre nuestros nano-suplementos o quieres una recomendación?',
  };
  const display = messages.length ? messages : [greeting];

  return (
    <>
      {/* Hint bubble */}
      <AnimatePresence>
        {showHint && !open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed bottom-24 right-5 z-50 max-w-[240px] bg-card border border-border rounded-2xl rounded-br-sm p-3 shadow-xl"
          >
            <p className="text-xs text-foreground">
              👋 ¿Necesitas ayuda? Puedo recomendarte productos personalizados.
            </p>
            <div className="absolute -bottom-1.5 right-4 w-3 h-3 bg-card border-r border-b border-border rotate-45" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        onClick={() => { setOpen(o => !o); setPulsing(false); setShowHint(false); }}
        className={`fixed bottom-5 right-5 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:brightness-110 transition ${pulsing && !open ? 'animate-pulse-strong' : ''}`}
        aria-label="Abrir chat"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
        {pulsing && !open && (
          <span className="absolute inset-0 rounded-full bg-primary animate-ping opacity-50" />
        )}
      </motion.button>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-5 z-50 w-[calc(100vw-2.5rem)] sm:w-[380px] h-[520px] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="bg-gradient-to-r from-primary to-secondary p-4 text-primary-foreground">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                <div>
                  <h3 className="font-bold text-sm">Waxa · Asistente IA</h3>
                  <p className="text-[11px] opacity-90">Recomendaciones y soporte 24/7</p>
                </div>
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {display.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-sm'
                      : 'bg-muted text-foreground rounded-bl-sm'
                  }`}>
                    {m.role === 'assistant' ? (
                      <ReactMarkdown
                        components={{
                          a: ({ href, children }) => (
                            href?.startsWith('/') ? (
                              <Link to={href} onClick={() => setOpen(false)} className="text-primary underline font-medium">{children}</Link>
                            ) : (
                              <a href={href} target="_blank" rel="noreferrer" className="text-primary underline">{children}</a>
                            )
                          ),
                          p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                          ul: ({ children }) => <ul className="list-disc ml-4 space-y-0.5">{children}</ul>,
                          strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                        }}
                      >{m.content}</ReactMarkdown>
                    ) : m.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-2xl rounded-bl-sm px-3 py-2 text-sm text-muted-foreground flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" /> Pensando...
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 border-t border-border">
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && send()}
                  placeholder="Escribe tu mensaje..."
                  disabled={loading}
                  className="flex-1 rounded-lg bg-muted border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                />
                <button
                  onClick={send}
                  disabled={loading || !input.trim()}
                  className="rounded-lg bg-primary text-primary-foreground p-2 disabled:opacity-50 hover:brightness-110 transition"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ChatbotWidget;
