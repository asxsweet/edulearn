import { useApp } from '../context/AppContext';
import kk from '../../content/program-kk.json';
import ru from '../../content/program-ru.json';
import en from '../../content/program-en.json';

type ProgramSection = {
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

export default function Program() {
  const { language } = useApp();
  const doc = PROGRAM_BY_LANG[language] || PROGRAM_BY_LANG.kk;

  return (
    <div className="max-w-3xl mx-auto space-y-10 pb-12">
      <header className="space-y-2 border-b border-border pb-6">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">{doc.documentTitle}</h1>
      </header>

      {doc.sections.map((section) => (
        <section key={section.heading} className="space-y-4">
          <h2 className="text-xl font-medium text-foreground">{section.heading}</h2>
          {section.paragraphs?.map((p, i) => (
            <p key={`${section.heading}-p-${i}`} className="text-foreground/90 leading-relaxed whitespace-pre-wrap">
              {p}
            </p>
          ))}
          {section.bullets && section.bullets.length > 0 ? (
            <ul className="list-disc space-y-2 pl-5 text-foreground/90 leading-relaxed">
              {section.bullets.map((item, i) => (
                <li key={`${section.heading}-b-${i}`}>{item}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}
    </div>
  );
}
