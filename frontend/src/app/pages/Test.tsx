import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useApp } from '../context/AppContext';
import { Clock, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { api } from '../../api/client';

interface TestPayload {
  test: {
    id: number;
    title: string;
    timeLimitSeconds: number;
    externalOnly?: boolean;
    externalUrl?: string;
  };
  questions: Array<{ id: number; question: string; options: string[] }>;
}

export default function Test() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useApp();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [payload, setPayload] = useState<TestPayload | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(1800);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!id) return;
      try {
        const d = await api<TestPayload>('/api/tests/' + id);
        if (!cancelled) {
          setPayload(d);
          setTimeRemaining(d.test.timeLimitSeconds);
        }
      } catch {
        navigate(-1);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, navigate]);

  useEffect(() => {
    if (!payload?.questions?.length) return;
    const tmr = window.setInterval(() => {
      setTimeRemaining((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(tmr);
  }, [payload]);

  const questions = payload?.questions || [];

  const handleSelectAnswer = (optionIndex: number) => {
    const q = questions[currentQuestion];
    if (!q) return;
    setAnswers({ ...answers, [q.id]: optionIndex });
  };

  const handleSubmit = async () => {
    if (!id || !payload) return;
    const answerBody: Record<number, number> = {};
    for (const q of questions) {
      if (answers[q.id] !== undefined) answerBody[q.id] = answers[q.id];
    }
    try {
      const result = await api<{ score: number; total: number; percent: number }>('/api/tests/' + id + '/submit', {
        method: 'POST',
        body: JSON.stringify({ answers: answerBody }),
      });
      window.alert(`Test submitted! ${result.score}/${result.total} (${result.percent}%)`);
      navigate(-1);
    } catch {
      /* */
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!payload) {
    return <div className="p-8">{t('tests')}</div>;
  }

  if (payload.test.externalOnly && payload.test.externalUrl) {
    return (
      <div className="p-6 md:p-8 max-w-lg mx-auto space-y-6">
        <div className="bg-card rounded-xl p-8 border border-border shadow-sm space-y-4 text-center">
          <h1 className="text-foreground text-xl">{payload.test.title}</h1>
          <p className="text-muted-foreground text-sm">Бұл тест сыртқы платформада өтеді.</p>
          <a
            href={payload.test.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 w-full px-4 py-3 rounded-lg bg-primary text-primary-foreground"
          >
            <ExternalLink className="w-5 h-5" />
            Тестке өту
          </a>
          <button type="button" onClick={() => navigate(-1)} className="text-sm text-muted-foreground underline">
            Артқа
          </button>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <p>{t('tests')}</p>
        <p className="text-sm mt-2">Сұрақтар табылмады.</p>
      </div>
    );
  }

  const q = questions[currentQuestion];

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-foreground mb-1">{payload.test.title}</h1>
            <p className="text-muted-foreground">
              {t('question')} {currentQuestion + 1} / {questions.length}
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 text-primary">
            <Clock className="w-5 h-5" />
            <span className="font-mono">{formatTime(timeRemaining)}</span>
          </div>
        </div>

        <div className="mt-6 h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] transition-all duration-300"
            style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="bg-card rounded-xl p-8 border border-border shadow-sm space-y-6">
        <h2 className="text-foreground">{q.question}</h2>

        <div className="space-y-3">
          {q.options.map((option, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSelectAnswer(index)}
              className={`w-full p-4 rounded-xl text-left transition-all ${
                answers[q.id] === index
                  ? 'bg-primary text-primary-foreground ring-2 ring-primary'
                  : 'border border-border hover:bg-accent'
              }`}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                    answers[q.id] === index ? 'border-primary-foreground bg-primary-foreground' : 'border-muted-foreground'
                  }`}
                >
                  {answers[q.id] === index && <div className="w-3 h-3 rounded-full bg-primary" />}
                </div>
                <span>{option}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
          disabled={currentQuestion === 0}
          className="flex items-center gap-2 px-6 py-3 rounded-lg border border-border hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-5 h-5" />
          {t('previous')}
        </button>

        {currentQuestion === questions.length - 1 ? (
          <button
            type="button"
            onClick={handleSubmit}
            className="px-6 py-3 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
          >
            {t('submitTest')}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setCurrentQuestion(Math.min(questions.length - 1, currentQuestion + 1))}
            className="flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
          >
            {t('next')}
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
        <h3 className="text-foreground mb-4">{t('questionNavigator')}</h3>
        <div className="flex flex-wrap gap-2">
          {questions.map((qq, index) => (
            <button
              key={qq.id}
              type="button"
              onClick={() => setCurrentQuestion(index)}
              className={`w-12 h-12 rounded-lg transition-all ${
                currentQuestion === index
                  ? 'bg-primary text-primary-foreground ring-2 ring-primary'
                  : answers[qq.id] !== undefined
                    ? 'bg-green-500/10 text-green-500 border border-green-500'
                    : 'border border-border hover:bg-accent'
              }`}
            >
              {index + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
