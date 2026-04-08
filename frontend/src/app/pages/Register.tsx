import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useApp } from '../context/AppContext';
import { BookOpen, ArrowRight, User, Mail, Lock } from 'lucide-react';
import { api } from '../../api/client';

export default function Register() {
  const navigate = useNavigate();
  const { loginWithToken, authReady, isAuthenticated, user, t, config } = useApp();
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
      setError(err instanceof Error ? err.message : 'Registration failed');
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const title = config.registerTitle || 'Join';
  const subtitle = config.registerSubtitle || '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-chart-2 mb-4 shadow-lg shadow-primary/20">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl mb-2 bg-gradient-to-r from-primary to-chart-2 bg-clip-text text-transparent">{title}</h1>
          <p className="text-muted-foreground">{subtitle}</p>
        </div>

        <div className="bg-card rounded-2xl shadow-xl border border-border p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="name" className="block text-sm mb-2 text-foreground">
                {t('fullName')}
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-input bg-input-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm mb-2 text-foreground">
                {t('email')}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-input bg-input-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm mb-2 text-foreground">
                {t('password')}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-input bg-input-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm mb-2 text-foreground">
                {t('confirmPassword')}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleChange('confirmPassword', e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-input bg-input-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="text-destructive text-sm bg-destructive/10 px-4 py-2 rounded-lg">{error}</div>
            )}

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-primary to-chart-2 text-white py-3 rounded-xl hover:shadow-lg hover:shadow-primary/30 transition-all duration-200 flex items-center justify-center gap-2 group"
            >
              {t('createAccount')}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-muted-foreground text-sm">
              {t('haveAccount')}{' '}
              <button type="button" onClick={() => navigate('/login')} className="text-primary hover:underline">
                {t('signIn')}
              </button>
            </p>
          </div>

          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-xs text-muted-foreground text-center">{t('onlyStudentsRegister')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
