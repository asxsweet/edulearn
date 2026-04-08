import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Send, Bot, User, Lightbulb } from 'lucide-react';
import { api } from '../../api/client';

interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function AIAssistant() {
  const { t, config } = useApp();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const sug = await api<string[]>('/api/ai/suggestions');
        if (!cancelled) setSuggestions(sug);
      } catch {
        if (!cancelled) setSuggestions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const welcome = config.aiWelcomeMessage || '';
    if (!welcome) return;
    setMessages([
      {
        id: 1,
        role: 'assistant',
        content: welcome,
        timestamp: new Date(),
      },
    ]);
  }, [config.aiWelcomeMessage]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;
    const userMessage: Message = {
      id: Date.now(),
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    const q = inputValue;
    setInputValue('');
    try {
      const { reply } = await api<{ reply: string }>('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ message: q }),
      });
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'assistant',
          content: reply,
          timestamp: new Date(),
        },
      ]);
    } catch {
      /* */
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
  };

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col">
        <div className="p-6 border-b border-border bg-card">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-foreground">{t('aiAssistant')}</h1>
              <p className="text-sm text-muted-foreground">{config.aiAssistantSubtitle || ''}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-4 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  message.role === 'user' ? 'bg-primary' : 'bg-gradient-to-br from-[#6366f1] to-[#8b5cf6]'
                }`}
              >
                {message.role === 'user' ? <User className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-white" />}
              </div>
              <div className={`flex-1 max-w-2xl ${message.role === 'user' ? 'flex justify-end' : ''}`}>
                <div
                  className={`p-4 rounded-2xl ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-tr-sm'
                      : 'bg-card border border-border rounded-tl-sm'
                  }`}
                >
                  <p className="leading-relaxed">{message.content}</p>
                  <p
                    className={`text-xs mt-2 ${
                      message.role === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                    }`}
                  >
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="p-6 border-t border-border bg-card">
          <div className="flex gap-3">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder={t('askQuestion')}
              className="flex-1 px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="button"
              onClick={handleSendMessage}
              className="px-6 py-3 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <aside className="w-80 border-l border-border bg-card p-6 space-y-6 overflow-y-auto">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="w-5 h-5 text-yellow-500" />
            <h3 className="text-foreground">{t('suggestions')}</h3>
          </div>
          <div className="space-y-2">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleSuggestionClick(suggestion)}
                className="w-full p-3 text-left rounded-lg border border-border hover:bg-accent transition-colors text-sm"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#6366f1]/10 to-[#8b5cf6]/10 rounded-xl p-4 border border-primary/20">
          <h4 className="text-foreground mb-2">{config.aiProTipTitle || ''}</h4>
          <p className="text-sm text-muted-foreground">{config.aiProTipBody || ''}</p>
        </div>
      </aside>
    </div>
  );
}
