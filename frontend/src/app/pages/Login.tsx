import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useApp } from '../context/AppContext';
import { BookOpen, ArrowRight } from 'lucide-react';
import { api } from '../../api/client';

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
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  const platformName = config.platformName || 'EduLearn Platform';
  const subtitle = config.loginSubtitle || '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-chart-2 mb-4 shadow-lg shadow-primary/20">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl mb-2 bg-gradient-to-r from-primary to-chart-2 bg-clip-text text-transparent">{platformName}</h1>
          <p className="text-muted-foreground">{subtitle}</p>
        </div>

        <div className="bg-card rounded-2xl shadow-xl border border-border p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm mb-2 text-foreground">
                {t('email')}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-input bg-input-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                placeholder="student@example.com"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm mb-2 text-foreground">
                {t('password')}
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-input bg-input-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                required
              />
            </div>

            {error && (
              <div className="text-destructive text-sm bg-destructive/10 px-4 py-2 rounded-lg">{error}</div>
            )}

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-primary to-chart-2 text-white py-3 rounded-xl hover:shadow-lg hover:shadow-primary/30 transition-all duration-200 flex items-center justify-center gap-2 group"
            >
              {t('signIn')}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-muted-foreground text-sm">
              {t('noAccount')}{' '}
              <button type="button" onClick={() => navigate('/register')} className="text-primary hover:underline">
                {t('registerStudent')}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
