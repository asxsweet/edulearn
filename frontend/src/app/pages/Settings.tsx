import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { User, Lock, Globe, Moon, Sun, Bell } from 'lucide-react';
import { api } from '../../api/client';

export default function Settings() {
  const { t, language, setLanguage, theme, toggleTheme, user, refreshUser } = useApp();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (user) {
      setFormData((f) => ({
        ...f,
        name: user.name,
        email: user.email || '',
      }));
      if (user.notificationsEnabled !== undefined) setNotificationsEnabled(!!user.notificationsEnabled);
    }
  }, [user]);

  const handleSave = async () => {
    try {
      await api('/api/me', {
        method: 'PATCH',
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          notificationsEnabled,
        }),
      });
      await refreshUser();
      window.alert(t('save'));
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Error');
    }
  };

  const handleSavePassword = async () => {
    if (formData.newPassword !== formData.confirmPassword) {
      window.alert(t('passwordMismatch'));
      return;
    }
    try {
      await api('/api/me', {
        method: 'PATCH',
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        }),
      });
      setFormData((f) => ({ ...f, currentPassword: '', newPassword: '', confirmPassword: '' }));
      await refreshUser();
      window.alert(t('save'));
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Error');
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="mb-2">{t('settings')}</h1>
        <p className="text-muted-foreground">{t('settingsPageSubtitle')}</p>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <User className="w-5 h-5 text-blue-500" />
            </div>
            <h2 className="text-foreground">{t('editProfile')}</h2>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-foreground">{t('fullName')}</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="space-y-2">
              <label className="text-foreground">{t('email')}</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-3 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
          >
            {t('save')}
          </button>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Lock className="w-5 h-5 text-purple-500" />
            </div>
            <h2 className="text-foreground">{t('changePassword')}</h2>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-foreground">{t('currentPassword')}</label>
            <input
              type="password"
              value={formData.currentPassword}
              onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
              className="w-full px-4 py-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-foreground">{t('newPassword')}</label>
              <input
                type="password"
                value={formData.newPassword}
                onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="space-y-2">
              <label className="text-foreground">{t('confirmPassword')}</label>
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={handleSavePassword}
            className="px-6 py-3 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
          >
            {t('save')}
          </button>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-pink-500/10 flex items-center justify-center">
              {theme === 'light' ? <Sun className="w-5 h-5 text-pink-500" /> : <Moon className="w-5 h-5 text-pink-500" />}
            </div>
            <h2 className="text-foreground">{t('appearance')}</h2>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-foreground">{theme === 'light' ? t('lightMode') : t('darkMode')}</p>
              <p className="text-sm text-muted-foreground">
                {theme === 'light' ? t('appearanceHintLight') : t('appearanceHintDark')}
              </p>
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              className={`relative w-14 h-7 rounded-full transition-colors ${theme === 'dark' ? 'bg-primary' : 'bg-muted'}`}
            >
              <div
                className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
                  theme === 'dark' ? 'translate-x-8' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Globe className="w-5 h-5 text-green-500" />
            </div>
            <h2 className="text-foreground">{t('selectLanguage')}</h2>
          </div>
        </div>
        <div className="p-6 space-y-3">
          {[
            { code: 'kk' as const, name: 'Kazakh', nativeName: 'Qazaqsha' },
            { code: 'ru' as const, name: 'Russian', nativeName: 'Russkiy' },
            { code: 'en' as const, name: 'English', nativeName: 'English' },
          ].map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => setLanguage(lang.code)}
              className={`w-full p-4 rounded-lg text-left transition-all ${
                language === lang.code ? 'bg-primary text-primary-foreground ring-2 ring-primary' : 'border border-border hover:bg-accent'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className={language === lang.code ? 'text-primary-foreground' : 'text-foreground'}>{lang.name}</p>
                  <p
                    className={`text-sm ${
                      language === lang.code ? 'text-primary-foreground/70' : 'text-muted-foreground'
                    }`}
                  >
                    {lang.nativeName}
                  </p>
                </div>
                {language === lang.code && (
                  <div className="w-6 h-6 rounded-full bg-primary-foreground flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-primary" />
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
              <Bell className="w-5 h-5 text-yellow-500" />
            </div>
            <h2 className="text-foreground">{t('notifications')}</h2>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-foreground">{t('emailNotifications')}</p>
              <p className="text-sm text-muted-foreground">{t('emailNotificationsHint')}</p>
            </div>
            <button
              type="button"
              onClick={async () => {
                const next = !notificationsEnabled;
                setNotificationsEnabled(next);
                try {
                  await api('/api/me', {
                    method: 'PATCH',
                    body: JSON.stringify({ notificationsEnabled: next }),
                  });
                  await refreshUser();
                } catch {
                  setNotificationsEnabled(!next);
                }
              }}
              className={`relative w-14 h-7 rounded-full transition-colors ${
                notificationsEnabled ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <div
                className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
                  notificationsEnabled ? 'translate-x-8' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
