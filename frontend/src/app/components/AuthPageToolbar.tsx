import { Globe, Moon, Sun } from 'lucide-react';
import { useApp } from '../context/AppContext';

/** Тіл мен қараңғы/жарық режимі — кіру/тіркелу беттері үшін. */
export default function AuthPageToolbar() {
  const { t, language, setLanguage, theme, toggleTheme } = useApp();

  return (
    <div
      className="inline-flex items-center gap-1.5 sm:gap-2 rounded-xl border border-border/80 bg-card/90 backdrop-blur-md px-2 py-1.5 sm:px-3 shadow-sm"
      role="toolbar"
      aria-label={t('authToolbarLabel')}
    >
      <Globe className="w-4 h-4 text-muted-foreground shrink-0 hidden sm:inline" aria-hidden />
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value as 'kk' | 'ru' | 'en')}
        className="text-sm border-0 bg-transparent py-1 pl-1 pr-6 sm:pr-8 text-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30 rounded-md min-w-0 max-w-[140px] sm:max-w-none"
        aria-label={t('selectLanguage')}
      >
        <option value="kk">Қазақша</option>
        <option value="ru">Русский</option>
        <option value="en">English</option>
      </select>
      <span className="w-px h-5 bg-border shrink-0" aria-hidden />
      <button
        type="button"
        onClick={toggleTheme}
        className="p-1.5 rounded-lg text-foreground hover:bg-accent transition-colors shrink-0"
        aria-label={theme === 'light' ? t('appearanceHintLight') : t('appearanceHintDark')}
        title={theme === 'light' ? t('appearanceHintLight') : t('appearanceHintDark')}
      >
        {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
      </button>
    </div>
  );
}
