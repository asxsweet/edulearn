import { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { Send, Bot, User, Lightbulb, Loader2, Trash2, Sparkles } from 'lucide-react';
import { api } from '../../api/client';

interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function AIAssistant() {
  const { t, language } = useApp();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const welcomeMessage = t('aiWelcomeMessage');
  const subtitle = t('aiAssistantSubtitle');
  const proTipTitle = t('aiProTipTitle');
  const proTipBody = t('aiProTipBody');

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [suggestionKeys, setSuggestionKeys] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  /** True only during HTTP (not debounce) so user can queue another message while waiting. */
  const [isFetching, setIsFetching] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const AI_SEND_DEBOUNCE_MS = 500;
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastPayloadRef = useRef<{ message: string; history: { role: string; content: string }[] } | null>(null);
  /** Prevents an older request's finally from clearing loading state after a newer send. */
  const sendGenRef = useRef(0);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api<{ keys: string[] }>('/api/ai/suggestions');
        if (!cancelled && Array.isArray(res.keys)) setSuggestionKeys(res.keys);
      } catch {
        if (!cancelled) setSuggestionKeys(['suggestExplainML', 'suggestAiVsMl', 'suggestNeuralNetworks', 'suggestUpcomingTestTips', 'suggestStudyPlan']);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setMessages([
      {
        id: Date.now(),
        role: 'assistant',
        content: welcomeMessage,
        timestamp: new Date(),
      },
    ]);
    setSendError(null);
  }, [language, welcomeMessage]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      abortRef.current?.abort();
    };
  }, []);

  const executeSend = useCallback(
    async (generation: number) => {
      const payload = lastPayloadRef.current;
      if (!payload) {
        if (sendGenRef.current === generation) {
          setIsSending(false);
          setIsFetching(false);
        }
        return;
      }
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      setIsFetching(true);
      try {
        const data = await api<{ reply: string }>('/api/ai/chat', {
          method: 'POST',
          body: JSON.stringify({ message: payload.message, locale: language, history: payload.history }),
          signal: ac.signal,
        });
        if (data == null) return;
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            role: 'assistant',
            content: data.reply,
            timestamp: new Date(),
          },
        ]);
      } catch (e: unknown) {
        const err = e as { name?: string };
        if (err?.name === 'AbortError') return;
        setSendError(t('aiErrorGeneric'));
      } finally {
        setIsFetching(false);
        if (sendGenRef.current === generation) setIsSending(false);
      }
    },
    [language, t]
  );

  const handleSendMessage = () => {
    const q = inputValue.trim();
    if (!q) return;
    sendGenRef.current += 1;
    const generation = sendGenRef.current;
    setSendError(null);
    const userMessage: Message = {
      id: Date.now(),
      role: 'user',
      content: q,
      timestamp: new Date(),
    };
    setMessages((prev) => {
      const historyForApi = prev.map((m) => ({ role: m.role, content: m.content }));
      lastPayloadRef.current = { message: q, history: historyForApi };
      return [...prev, userMessage];
    });
    setInputValue('');
    setIsSending(true);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      void executeSend(generation);
    }, AI_SEND_DEBOUNCE_MS);
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: Date.now(),
        role: 'assistant',
        content: welcomeMessage,
        timestamp: new Date(),
      },
    ]);
    setSendError(null);
    setInputValue('');
  };

  const applySuggestionKey = (key: string) => {
    const text = t(key);
    setInputValue(text === key ? '' : text);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-6rem)] gap-0 lg:gap-0 -mx-4 sm:-mx-6 lg:-mx-8">
      <div className="flex-1 flex flex-col min-h-[60vh] lg:min-h-[calc(100vh-6rem)] border border-border lg:border-r-0 rounded-xl lg:rounded-r-none lg:rounded-l-xl overflow-hidden bg-card">
        <header className="p-4 sm:p-6 border-b border-border bg-card/80 backdrop-blur-sm shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-chart-2 flex items-center justify-center shadow-lg shadow-primary/20 shrink-0">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-foreground text-xl font-semibold tracking-tight">{t('aiAssistant')}</h1>
                <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
                <p className="text-xs text-muted-foreground/80 mt-2 max-w-xl">{t('aiDemoNotice')}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClearChat}
              className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors shrink-0 self-start"
              aria-label={t('aiClearChat')}
            >
              <Trash2 className="w-4 h-4" />
              {t('aiClearChat')}
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6 bg-background/40">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 sm:gap-4 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  message.role === 'user' ? 'bg-primary' : 'bg-gradient-to-br from-primary to-chart-2'
                }`}
                aria-hidden
              >
                {message.role === 'user' ? <User className="w-4 h-4 sm:w-5 sm:h-5 text-white" /> : <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-white" />}
              </div>
              <div className={`flex-1 min-w-0 max-w-3xl ${message.role === 'user' ? 'flex justify-end' : ''}`}>
                <div
                  className={`p-3 sm:p-4 rounded-2xl text-sm sm:text-base ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-tr-md'
                      : 'bg-card border border-border rounded-tl-md shadow-sm'
                  }`}
                >
                  <p className="leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
                  <p
                    className={`text-xs mt-2 tabular-nums ${
                      message.role === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                    }`}
                  >
                    {message.timestamp.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            </div>
          ))}
          {isSending ? (
            <div className="flex gap-3 sm:gap-4 items-center text-muted-foreground text-sm pl-12 sm:pl-14">
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
              <span>{t('aiSending')}</span>
            </div>
          ) : null}
          <div ref={messagesEndRef} />
        </div>

        <footer className="p-4 sm:p-6 border-t border-border bg-card shrink-0 space-y-2">
          {sendError ? <p className="text-sm text-destructive">{sendError}</p> : null}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={t('askQuestion')}
              disabled={isFetching}
              className="flex-1 min-h-[48px] px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
              aria-label={t('askQuestion')}
            />
            <button
              type="button"
              onClick={handleSendMessage}
              disabled={isFetching || !inputValue.trim()}
              className="inline-flex items-center justify-center gap-2 min-h-[48px] px-6 py-3 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 disabled:pointer-events-none"
            >
              {isFetching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              <span className="sm:inline">{t('send')}</span>
            </button>
          </div>
        </footer>
      </div>

      <aside className="w-full lg:w-80 xl:w-96 border border-border lg:border-l-0 rounded-xl lg:rounded-l-none lg:rounded-r-xl bg-card p-4 sm:p-6 space-y-6 overflow-y-auto max-h-[50vh] lg:max-h-none lg:min-h-[calc(100vh-6rem)]">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-5 h-5 text-amber-500 shrink-0" />
            <h3 className="text-foreground font-medium">{t('suggestions')}</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-3">{t('aiSuggestionsHint')}</p>
          <div className="space-y-2">
            {suggestionKeys.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => applySuggestionKey(key)}
                className="w-full p-3 text-left rounded-xl border border-border hover:bg-accent hover:border-primary/30 transition-colors text-sm leading-snug"
              >
                {t(key)}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-br from-primary/10 to-chart-2/10 rounded-xl p-4 border border-primary/20">
          <h4 className="text-foreground font-medium mb-2 flex items-center gap-2">
            <Bot className="w-4 h-4 text-primary" />
            {proTipTitle}
          </h4>
          <p className="text-sm text-muted-foreground leading-relaxed">{proTipBody}</p>
        </div>
      </aside>
    </div>
  );
}
