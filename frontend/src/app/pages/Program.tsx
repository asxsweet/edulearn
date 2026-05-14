import { useCallback, useEffect, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  BookOpen,
  Lightbulb,
  Target,
  ClipboardList,
  ListChecks,
  Layers,
  GraduationCap,
  Boxes,
  Scale,
  ListOrdered,
  ChevronDown,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import kk from '../../content/program-kk.json';
import ru from '../../content/program-ru.json';
import en from '../../content/program-en.json';
import { cn } from '../components/ui/utils';

type ProgramSection = {
  id?: string;
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
};

type ProgramDoc = {
  documentTitle: string;
  sections: ProgramSection[];
};

const PROGRAM_BY_LANG: Record<'kk' | 'ru' | 'en', ProgramDoc> = {
  kk: kk as ProgramDoc,
  ru: ru as ProgramDoc,
  en: en as ProgramDoc,
};

const NAV_ITEMS: { id: string; labelKey: string; icon: LucideIcon }[] = [
  { id: 'course-about', labelKey: 'programNav1', icon: BookOpen },
  { id: 'relevance', labelKey: 'programNav2', icon: Lightbulb },
  { id: 'goals', labelKey: 'programNav3', icon: Target },
  { id: 'tasks', labelKey: 'programNav4', icon: ClipboardList },
  { id: 'outcomes', labelKey: 'programNav5', icon: ListChecks },
  { id: 'course-structure', labelKey: 'programNav6', icon: Layers },
  { id: 'teaching-methods', labelKey: 'programNav7', icon: GraduationCap },
  { id: 'tools-used', labelKey: 'programNav8', icon: Boxes },
  { id: 'assessment', labelKey: 'programNav9', icon: Scale },
  { id: 'thematic-34', labelKey: 'programNav10', icon: ListOrdered },
];

export default function Program() {
  const { language, t } = useApp();
  const doc = PROGRAM_BY_LANG[language] || PROGRAM_BY_LANG.kk;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const scrollToId = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setMenuOpen(false);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  return (
    <div className="max-w-3xl mx-auto space-y-10 pb-12">
      <header className="flex flex-col gap-6 border-b border-border pb-6 sm:flex-row sm:items-start sm:justify-between">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">{doc.documentTitle}</h1>

        <div className="relative shrink-0" ref={menuRef}>
          <button
            type="button"
            aria-expanded={menuOpen}
            aria-haspopup="true"
            onClick={() => setMenuOpen((o) => !o)}
            className={cn(
              'flex w-full min-w-[220px] items-center justify-between gap-3 rounded-xl px-4 py-3 text-left text-white shadow-md transition sm:w-auto',
              'bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2'
            )}
          >
            <span className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 shrink-0 opacity-95" aria-hidden />
              <span className="text-sm font-semibold tracking-wide">{t('program')}</span>
            </span>
            <ChevronDown className={cn('h-5 w-5 shrink-0 transition-transform', menuOpen && 'rotate-180')} aria-hidden />
          </button>

          {menuOpen ? (
            <div
              role="menu"
              className={cn(
                'absolute right-0 z-30 mt-2 w-[min(100vw-2rem,22rem)] overflow-hidden rounded-xl border shadow-xl',
                'border-border bg-card text-card-foreground'
              )}
            >
              <ul className="py-1">
                {NAV_ITEMS.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.id} className="border-b border-border last:border-b-0">
                      <button
                        type="button"
                        role="menuitem"
                        className={cn(
                          'flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors',
                          'hover:bg-primary/10 focus-visible:bg-primary/10 focus-visible:outline-none'
                        )}
                        onClick={() => scrollToId(item.id)}
                      >
                        <Icon className="h-5 w-5 shrink-0 text-primary" aria-hidden />
                        <span className="font-medium text-foreground">
                          <span className="text-muted-foreground">{idx + 1}. </span>
                          {t(item.labelKey)}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </div>
      </header>

      {doc.sections.map((section) => {
        const sid = section.id || section.heading;
        return (
          <section key={sid} id={section.id} className="scroll-mt-28 space-y-4">
            <h2 className="text-xl font-medium text-foreground">{section.heading}</h2>
            {section.paragraphs?.map((p, i) => (
              <p key={`${sid}-p-${i}`} className="text-foreground/90 leading-relaxed whitespace-pre-wrap">
                {p}
              </p>
            ))}
            {section.bullets && section.bullets.length > 0 ? (
              <ul className="list-disc space-y-2 pl-5 text-foreground/90 leading-relaxed">
                {section.bullets.map((item, i) => (
                  <li key={`${sid}-b-${i}`}>{item}</li>
                ))}
              </ul>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
