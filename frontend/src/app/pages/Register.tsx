import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useApp } from '../context/AppContext';
import { BookOpen, ArrowRight, User, Mail, Lock } from 'lucide-react';
import { api } from '../../api/client';
import AuthPageToolbar from '../components/AuthPageToolbar';

export default function Register() {
  const navigate = useNavigate();
  const { loginWithToken, authReady, isAuthenticated, user, t } = useApp();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authReady) return;
    if (isAuthenticated && user) {
      navigate('/', { replace: true });
    }
  }, [authReady, isAuthenticated, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (formData.password !== formData.confirmPassword) {
      setError(t('passwordMismatch'));
      return;
    }
    if (formData.password.length < 6) {
      setError(t('passwordTooShort'));
      return;
    }
    try {
      const data = await api<{ token: string; user: Parameters<typeof loginWithToken>[1] }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
        }),
      });
      loginWithToken(data.token, data.user);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('registerFailed'));
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const title = t('authRegisterTitle');
  const subtitle = t('authRegisterSubtitle');

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-secondary/25 to-background dark:via-secondary/10">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/85 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-end">
          <AuthPageToolbar />
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 sm:py-10">
        <div className="w-full max-w-md">
          <div className="text-center mb-8 sm:mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-chart-2 mb-4 shadow-lg shadow-primary/25 ring-1 ring-white/10">
              <BookOpen className="w-8 h-8 text-white" aria-hidden />
            </div>
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-2 bg-gradient-to-r from-primary to-chart-2 bg-clip-text text-transparent">
              {title}
            </h1>
            {subtitle ? (
              <p className="text-muted-foreground text-sm sm:text-base max-w-sm mx-auto leading-relaxed">{subtitle}</p>
            ) : null}
          </div>

          <div className="rounded-2xl border border-border/80 bg-card/95 backdrop-blur-sm shadow-2xl shadow-black/[0.06] dark:shadow-black/30 dark:bg-card/90 p-6 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="name" className="block text-sm font-medium mb-2 text-foreground">
                  {t('fullName')}
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
                  <input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    autoComplete="name"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-input bg-input-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/35 focus:border-primary transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-2 text-foreground">
                  {t('email')}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
                  <input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    autoComplete="email"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-input bg-input-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/35 focus:border-primary transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium mb-2 text-foreground">
                  {t('password')}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
                  <input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    autoComplete="new-password"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-input bg-input-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/35 focus:border-primary transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2 text-foreground">
                  {t('confirmPassword')}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
                  <input
                    id="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleChange('confirmPassword', e.target.value)}
                    autoComplete="new-password"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-input bg-input-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/35 focus:border-primary transition-all"
                    required
                  />
                </div>
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
                {t('createAccount')}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" aria-hidden />
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-muted-foreground text-sm">
                {t('haveAccount')}{' '}
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="text-primary font-medium hover:underline underline-offset-2"
                >
                  {t('signIn')}
                </button>
              </p>
            </div>

            <div className="mt-6 pt-6 border-t border-border/80">
              <p className="text-xs text-muted-foreground text-center leading-relaxed">{t('onlyStudentsRegister')}</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
