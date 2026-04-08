import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useApp } from '../context/AppContext';
import { BookOpen, ArrowRight } from 'lucide-react';
import { api } from '../../api/client';
import AuthPageToolbar from '../components/AuthPageToolbar';

export default function Login() {
  const navigate = useNavigate();
  const { loginWithToken, t, config, authReady, isAuthenticated, user } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authReady) return;
    if (isAuthenticated && user) {
      navigate(user.role === 'admin' ? '/admin' : '/', { replace: true });
    }
  }, [authReady, isAuthenticated, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const data = await api<{ token: string; user: { id: number; email: string; name: string; role: 'student' | 'admin' } }>(
        '/api/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        }
      );
      loginWithToken(data.token, data.user as Parameters<typeof loginWithToken>[1]);
      navigate(data.user.role === 'admin' ? '/admin' : '/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('loginFailed'));
    }
  };

  const platformName = config.platformName || 'EduLearn Platform';
  const subtitle = t('authLoginSubtitle');

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-secondary/25 to-background dark:via-secondary/10">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/85 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-end">
          <AuthPageToolbar />
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-10 sm:py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8 sm:mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-chart-2 mb-4 shadow-lg shadow-primary/25 ring-1 ring-white/10">
              <BookOpen className="w-8 h-8 text-white" aria-hidden />
            </div>
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-2 bg-gradient-to-r from-primary to-chart-2 bg-clip-text text-transparent">
              {platformName}
            </h1>
            {subtitle ? (
              <p className="text-muted-foreground text-sm sm:text-base max-w-sm mx-auto leading-relaxed">{subtitle}</p>
            ) : null}
          </div>

          <div className="rounded-2xl border border-border/80 bg-card/95 backdrop-blur-sm shadow-2xl shadow-black/[0.06] dark:shadow-black/30 dark:bg-card/90 p-6 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-2 text-foreground">
                  {t('email')}
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  className="w-full px-4 py-3 rounded-xl border border-input bg-input-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/35 focus:border-primary transition-all"
                  placeholder="student@example.com"
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium mb-2 text-foreground">
                  {t('password')}
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="w-full px-4 py-3 rounded-xl border border-input bg-input-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/35 focus:border-primary transition-all"
                  required
                />
              </div>

              {error ? (
                <div
                  className="text-destructive text-sm bg-destructive/10 border border-destructive/20 px-4 py-3 rounded-xl"
                  role="alert"
                >
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                className="w-full min-h-[48px] bg-gradient-to-r from-primary to-chart-2 text-primary-foreground py-3 rounded-xl hover:shadow-lg hover:shadow-primary/25 transition-all duration-200 flex items-center justify-center gap-2 group font-medium"
              >
                {t('signIn')}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" aria-hidden />
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-muted-foreground text-sm">
                {t('noAccount')}{' '}
                <button
                  type="button"
                  onClick={() => navigate('/register')}
                  className="text-primary font-medium hover:underline underline-offset-2"
                >
                  {t('registerStudent')}
                </button>
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
