# Educational Platform — толық түсіндірме (с нуля)

## 1) Жобаның қысқаша мәні

Бұл жоба — онлайн білім беру платформасының толық нұсқасы.  
Платформада екі негізгі рөл бар:

- `student` (студент): курстарға жазылады, сабақ өтеді, тест тапсырады, тапсырма жібереді, AI көмекшіден сұрайды.
- `admin` (админ): курс жасайды/өңдейді, сабақтар мен материалдар қосады, тест пен тапсырма құрады, студент прогресін бақылайды.

Жоба frontend + backend + database архитектурасымен жасалған, яғни өндірістік (real-world) форматқа жақын.

---

## 2) Жобаның мақсаты

Негізгі мақсат — білім алушыға оқу процесін бір жерден басқаруға ыңғайлы, ал мұғалім/админге контентті оңай әкімшілеуге мүмкіндік беретін заманауи веб-платформа құру.

Мақсатты нақтыласақ:

- оқу контентін жүйелеу (курс → сабақ → материал/тест/тапсырма);
- студенттің оқу прогресін автоматты есептеу;
- бағалау және кері байланыс механизмін құру;
- көптілді интерфейс (қазақ/орыс/ағылшын);
- AI көмекші арқылы интерактивті оқу қолдауы.

---

## 3) Жобаның міндеттері

Осы мақсатқа жету үшін жоба келесі міндеттерді орындайды:

1. Пайдаланушыны тіркеу және авторизация жасау (JWT).
2. Рөлге негізделген қолжетімділік (student/admin).
3. Курстар тізімі, курс деталі және прогресс логикасын іске асыру.
4. Сабақ материалдары, файлдар және сыртқы сілтемелерді беру.
5. Тест тапсыру және автоматты балл есептеу.
6. Тапсырма жіберу (файл немесе сілтеме) және админнің бағалауы.
7. AI чат интеграциясы (Groq API бар болса LLM, болмаса fallback).
8. Профиль, аватар, баптаулар, статистика және дашбордтарды көрсету.
9. Көптілділік және конфигурациямен жұмыс.

---

## 4) Қандай технологиялармен жасалды

## Frontend

- `React 18` — интерфейс құру.
- `Vite` — жылдам dev-сервер және build.
- `React Router` — беттер арасындағы навигация.
- `MUI`, `Radix UI`, `TailwindCSS` — UI компоненттері және стиль.
- `TypeScript` (кейбір файлдарда) — тип қауіпсіздігі.

## Backend

- `Node.js + Express` — REST API.
- `JWT` (`jsonwebtoken`) — авторизация.
- `bcryptjs` — парольді хэштеу.
- `multer` — файл жүктеу.
- `cors`, `dotenv` — инфрақұрылымдық баптаулар.

## Дерекқор

- SQLite/PG-үйлесімді қабат (`db.js`, `stmt.js`, `pg-query.js`, `sqlite-pool.js`) арқылы деректерді сақтау.
- Миграциялар және seed механизмдері бар (`migrations.js`, `seed.js`).

## Қосымша

- i18n: `kk`, `ru`, `en` тілдік файлдары.
- AI: `groq.js` және `aiChatGate.js` арқылы чат жауабы.

---

## 5) Архитектура (теориялық тұрғыда)

Жоба классикалық **3 қабатты** идеяға жақын:

1. **Presentation layer (Frontend)**  
   Пайдаланушы интерфейсі, беттер, формалар, батырмалар, визуализация.

2. **Application/API layer (Backend)**  
   Бизнес-логика: тіркеу, курсқа жазылу, прогресс есептеу, тест бағалау, файл өңдеу.

3. **Data layer (Database)**  
   Пайдаланушы, курс, сабақ, тест, тапсырма, прогресс, конфигурация деректері.

Неге бұл дұрыс:

- масштабтауға оңай;
- жауапкершілік бөлек;
- тестілеу және қате іздеу жеңіл;
- frontend пен backend тәуелсіз дамиды.

---

## 6) Жобаны кезең-кезеңімен қалай жасадық (с нуля)

Төмендегі бөлім — диплом/есеп/қорғауға ыңғайлы “даму кезеңдері”.

### Кезең 1. Анализ және талап жинау

- Кім қолданады? — студент және админ.
- Қандай негізгі сценарий? — оқу, тексеру, бағалау, әкімшілеу.
- MVP шекарасы анықталды: auth + course flow + test + submission + admin panel.

### Кезең 2. Архитектураны жобалау

- Монорепо құрылымы қабылданды:
  - `frontend/` — клиент бөлігі;
  - `server/` — API бөлігі;
  - root — ортақ скрипттер.
- Деректер моделі жобаланды: users, courses, lessons, tests, submissions, enrollments.

### Кезең 3. Backend негізін көтеру

- Express сервері жасалды (`server/src/index.js`).
- CORS, JSON parser, env конфигурация қосылды.
- Health endpoint және жалпы error handler орнатылды.

### Кезең 4. Авторизация және қауіпсіздік

- Тіркелу/кіру endpoint-тері.
- Пароль хэштеу (`bcrypt`), токен генерация (`JWT`).
- `authMiddleware` және `requireRole` арқылы рөлдік шектеу.

### Кезең 5. Студенттік модуль

- Курстар тізімі және курс деталі.
- Курсқа жазылу және lesson progress жаңарту.
- Автоматты progress % есептеу логикасы.
- Dashboard статистикасы.

### Кезең 6. Тест және тапсырма механикасы

- Тест сұрақтарын беру және жауап тексеру.
- Нәтижені пайызбен автоматты есептеу.
- Assignment submit (файл/сілтеме) және статус сақтау (`pending/graded`).

### Кезең 7. Админ-панель жасау

- Курс CRUD.
- Сабақ, материал, тест, тапсырма CRUD.
- Студенттер тізімі және жеке прогресі.
- Тапсырмаларды бағалау интерфейсі.

### Кезең 8. Файл жүктеу және медиа

- `multer` арқылы upload handling.
- course files, submissions, avatars үшін бөлек сақтау.
- Файл атын тазалау, қайталанғанда бірегей атау беру.

### Кезең 9. AI Assistant интеграциясы

- `/api/ai/chat` endpoint жасалды.
- Groq API key болса — LLM жауап.
- Кілт болмаса — template fallback жауап (система тоқтап қалмайды).

### Кезең 10. Көптілділік және UX

- `kk`, `ru`, `en` аударма файлдары.
- AppContext арқылы тіл/тема/user күйін басқару.
- Тілдік fallback логикасы жасалды.

### Кезең 11. Тестілеу және стабилизация

- Негізгі сценарийлер тексерілді:
  - auth;
  - enroll/progress;
  - test submit;
  - assignment grading;
  - admin CRUD;
  - ai chat fallback.

### Кезең 12. Deploy дайындығы

- Frontend build (`vite build`), backend start scripts.
- `VITE_API_URL`, `CLIENT_ORIGIN`, `JWT_SECRET` сияқты env айнымалылар.
- README/құжаттаманы толықтыру.

---

## 7) Теориялық негіздеме (неге осылай жасалды)

### 7.1 Role-Based Access Control (RBAC)

Жүйеде әр қолданушының рөлі бар. Бұл қауіпсіздік пен тәртіп үшін қажет:

- студент админ функцияларын көрмейді;
- админ басқару функцияларын орындайды;
- қате қолжетімділік тәуекелі азаяды.

### 7.2 Stateless Authentication (JWT)

JWT тәсілі backend-ті сессиясыз масштабтауға ыңғайлы етеді.  
Клиент токенді сақтап, әр сұраныста жібереді.

### 7.3 REST принципі

Әр ресурсқа бөлек endpoint:

- `/api/courses`
- `/api/tests/:id`
- `/api/admin/...`

Бұл frontend пен backend байланысын түсінікті және бірізді етеді.

### 7.4 Progress tracking моделі

Прогресс тек UI емес, дерекқордағы нақты фактіден (lesson completed) есептеледі.  
Сондықтан аналитика сенімді болады.

### 7.5 Graceful degradation (AI бөлімінде)

AI сервис уақытша жұмыс істемесе де, қолданушы бос жауап алмайды — fallback мәтін алады.  
Бұл UX тұрақтылығын сақтайды.

---

## 8) Жоба құрылымы

```text
educational-platform-extracted/
  frontend/          # React + Vite клиенті
  server/            # Express API + DB логикасы
  package.json       # root scripts (concurrently)
  README.md
  readme2.md
```

---

## 9) Локалда іске қосу нұсқаулығы

Root папкадан:

1. `npm install`
2. `npm run install:all`
3. `npm run dev`

Бөлек іске қосу керек болса:

- `npm run dev:frontend`
- `npm run dev:server`

Backend әдетте `http://localhost:4000`, frontend `http://localhost:5173`.

---

## 10) Негізгі API топтары

- Auth: `/api/auth/register`, `/api/auth/login`, `/api/auth/me`
- Student:
  - `/api/student/dashboard`
  - `/api/courses`, `/api/courses/:id`, `/api/courses/:id/enroll`
  - `/api/lessons/:id/progress`
  - `/api/tests/:id`, `/api/tests/:id/submit`
  - `/api/assignments/:id/submit`
  - `/api/profile`, `/api/me`, `/api/ai/chat`
- Admin:
  - `/api/admin/overview`, `/api/admin/charts`
  - `/api/admin/courses...`
  - `/api/admin/students...`
  - `/api/admin/submissions...`

---

## 11) Жобаның практикалық құндылығы

- Оқу ұйымдарына дайын LMS негізі бола алады.
- Пәндік контентті цифрландыруға көмектеседі.
- Студенттің оқу траекториясын дерекке сүйеніп бақылауға мүмкіндік береді.
- Болашақта мобильді қосымша немесе microservice архитектурасына кеңейтуге болады.

---

## 12) Болашақта дамыту идеялары

1. Refresh token және толық қауіпсіз auth lifecycle.
2. Unit/integration/e2e тесттерді кеңейту.
3. Notification center (email/push/in-app).
4. Analytics панелін BI деңгейіне шығару.
5. Контент versioning және аудит логы.
6. CI/CD толық автоматтандыру.

---

## 13) Қорытынды

Бұл жоба теория мен практиканы біріктірген толыққанды оқу платформасы:

- архитектурасы жүйелі;
- функционалы нақты бизнес-процесті жабады;
- қолданушы тәжірибесі (UX) және админ басқаруы тең қарастырылған;
- масштабтауға және әрі қарай зерттеу/дамытуға дайын.

Есеп, диплом, презентация немесе қорғау кезінде осы құжатты жобаның “түсіндірме паспорты” ретінде қолдануға болады.

---

## 14) Негізгі кодтар (файлдар бойынша, Android стиліндегі формат)

Төменде жобаның негізгі модульдері **файл жолы → толық код** түрінде берілген (Android-дағы `package ...` + класс коды сияқты). Қалған беттер (`CourseDetail.tsx`, `CourseCreation.tsx`, `Dashboard.tsx` т.б.), UI-компоненттер (`components/ui/*`) және толық `server/src/index.js` (~1800 жол) репозиторий қалтасында сақталған.

---

### `frontend/src/api/client.ts`

```typescript
const TOKEN_KEY = 'edulearn_token';

/** Production (Vercel): set VITE_API_URL to your Render API origin, e.g. https://edulearn-api.onrender.com */
function apiUrl(path: string): string {
  const base = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '';
  if (!path.startsWith('/')) return base ? `${base}/${path}` : `/${path}`;
  return base ? `${base}${path}` : path;
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

/** Public file path from API (/uploads/...) → full URL for <a href> / viewers */
export function fileUrl(path: string): string {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  const base = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '';
  if (base) return `${base}${path}`;
  if (typeof window !== 'undefined') return `${window.location.origin}${path}`;
  return path;
}

export async function apiForm<T>(path: string, formData: FormData, method = 'POST'): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(apiUrl(path), { method, headers, body: formData });
  if (res.status === 401) {
    setToken(null);
    const onLogin = window.location.pathname === '/login' || window.location.pathname === '/register';
    if (!onLogin) window.location.href = '/login';
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error || res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(apiUrl(path), { ...init, headers });
  if (res.status === 401) {
    setToken(null);
    const onLogin = window.location.pathname === '/login' || window.location.pathname === '/register';
    if (!onLogin) window.location.href = '/login';
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error || res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
```

---

### `frontend/src/main.tsx`

```tsx
import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "./styles/index.css";

createRoot(document.getElementById("root")!).render(<App />);
```

---

### `frontend/src/app/App.tsx`

```tsx
import { RouterProvider } from 'react-router';
import { router } from './routes';
import { AppProvider } from './context/AppContext';

export default function App() {
  return (
    <AppProvider>
      <RouterProvider router={router} />
    </AppProvider>
  );
}
```

---

### `frontend/src/app/routes.tsx`

```tsx
import { createBrowserRouter, Navigate } from 'react-router';
import RootLayout from './components/layout/RootLayout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Courses from './pages/Courses';
import CourseDetail from './pages/CourseDetail';
import Test from './pages/Test';
import AIAssistant from './pages/AIAssistant';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import AdminDashboard from './pages/admin/AdminDashboard';
import CourseManagement from './pages/admin/CourseManagement';
import StudentManagement from './pages/admin/StudentManagement';
import StudentProgress from './pages/admin/StudentProgress';
import CourseCreation from './pages/admin/CourseCreation';
import SubmissionReview from './pages/admin/SubmissionReview';

export const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  { path: '/register', element: <Register /> },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <RootLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <ProtectedRoute allowedRole="student"><Dashboard /></ProtectedRoute> },
      { path: 'courses', element: <ProtectedRoute allowedRole="student"><Courses /></ProtectedRoute> },
      { path: 'courses/:id', element: <ProtectedRoute allowedRole="student"><CourseDetail /></ProtectedRoute> },
      { path: 'test/:id', element: <ProtectedRoute allowedRole="student"><Test /></ProtectedRoute> },
      { path: 'ai-assistant', element: <ProtectedRoute allowedRole="student"><AIAssistant /></ProtectedRoute> },
      { path: 'profile', element: <ProtectedRoute allowedRole="student"><Profile /></ProtectedRoute> },
      { path: 'settings', element: <ProtectedRoute><Settings /></ProtectedRoute> },
      { path: 'admin', element: <ProtectedRoute allowedRole="admin"><AdminDashboard /></ProtectedRoute> },
      { path: 'admin/courses', element: <ProtectedRoute allowedRole="admin"><CourseManagement /></ProtectedRoute> },
      { path: 'admin/students', element: <ProtectedRoute allowedRole="admin"><StudentManagement /></ProtectedRoute> },
      { path: 'admin/students/:id', element: <ProtectedRoute allowedRole="admin"><StudentProgress /></ProtectedRoute> },
      { path: 'admin/courses/create', element: <ProtectedRoute allowedRole="admin"><CourseCreation /></ProtectedRoute> },
      { path: 'admin/courses/edit/:id', element: <ProtectedRoute allowedRole="admin"><CourseCreation /></ProtectedRoute> },
      { path: 'admin/submissions', element: <ProtectedRoute allowedRole="admin"><SubmissionReview /></ProtectedRoute> },
    ],
  },
]);
```

---

### `frontend/src/app/components/ProtectedRoute.tsx`

```tsx
import { Navigate } from 'react-router';
import { useApp } from '../context/AppContext';
import { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRole?: 'student' | 'admin';
}

export default function ProtectedRoute({ children, allowedRole }: ProtectedRouteProps) {
  const { user, isAuthenticated, authReady } = useApp();

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRole && user?.role !== allowedRole) {
    return <Navigate to={user?.role === 'admin' ? '/admin' : '/'} replace />;
  }

  return <>{children}</>;
}
```

---

### `frontend/src/app/context/AppContext.tsx`

```tsx
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { api, getToken, setToken } from '../../api/client';
import kk from '../../i18n/kk.json';
import ru from '../../i18n/ru.json';
import en from '../../i18n/en.json';

export type Language = 'kk' | 'ru' | 'en';
type Theme = 'light' | 'dark';
export type UserRole = 'student' | 'admin';

export interface User {
  id: number;
  role: UserRole;
  name: string;
  email: string;
  studentCode?: string | null;
  gradeLabel?: string | null;
  notificationsEnabled?: boolean;
}

interface AppContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  theme: Theme;
  toggleTheme: () => void;
  user: User | null;
  isAuthenticated: boolean;
  authReady: boolean;
  loginWithToken: (token: string, user: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
  t: (key: string) => string;
  config: Record<string, string>;
  configLoading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const LANG_KEY = 'edulearn_lang';
const THEME_KEY = 'edulearn_theme';
const I18N_MAP: Record<Language, Record<string, string>> = { kk, ru, en };

export function AppProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const s = localStorage.getItem(LANG_KEY) as Language | null;
    return s && ['kk', 'ru', 'en'].includes(s) ? s : 'en';
  });
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'light';
    const s = localStorage.getItem(THEME_KEY);
    return s === 'dark' || s === 'light' ? s : 'light';
  });
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [translations, setTranslations] = useState<Record<string, string>>(I18N_MAP[language] || I18N_MAP.en);
  const [config, setConfig] = useState<Record<string, string>>({});
  const [configLoading, setConfigLoading] = useState(true);

  const setLanguage = useCallback((lang: Language) => {
    localStorage.setItem(LANG_KEY, lang);
    setLanguageState(lang);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cfg = await api<Record<string, string>>('/api/config');
        if (!cancelled) setConfig(cfg);
      } catch {
        if (!cancelled) setConfig({});
      } finally {
        if (!cancelled) setConfigLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setTranslations(I18N_MAP[language] || I18N_MAP.en);
  }, [language]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const tok = getToken();
      if (!tok) {
        setUser(null);
        setAuthReady(true);
        return;
      }
      try {
        const me = await api<User>('/api/auth/me');
        if (!cancelled) setUser(me);
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setAuthReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const loginWithToken = (token: string, u: User) => {
    setToken(token);
    setUser(u);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    const me = await api<User>('/api/auth/me');
    setUser(me);
  };

  const t = useCallback(
    (key: string): string => {
      return translations[key] || key;
    },
    [translations]
  );

  return (
    <AppContext.Provider
      value={{
        language,
        setLanguage,
        theme,
        toggleTheme,
        user,
        isAuthenticated: !!user,
        authReady,
        loginWithToken,
        logout,
        refreshUser,
        t,
        config,
        configLoading,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
```

---

### `frontend/src/app/pages/Login.tsx`

```tsx
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
```

---

### `frontend/src/app/components/CourseCoverMedia.tsx`

```tsx
import { fileUrl } from '../../api/client';

export function isCourseCoverImagePath(image: string): boolean {
  if (!image?.trim()) return false;
  const s = image.trim();
  return s.startsWith('/uploads/') || s.startsWith('http://') || s.startsWith('https://');
}

type Variant = 'gridCard' | 'detailAside';

/**
 * Курс обложкасы: жол болса <img>, әйтпесе emoji.
 */
export function CourseCoverMedia({ image, variant }: { image: string; variant: Variant }) {
  if (isCourseCoverImagePath(image)) {
    const src = fileUrl(image);
    if (variant === 'gridCard') {
      return <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />;
    }
    return (
      <img
        src={src}
        alt=""
        className="w-full rounded-xl border border-border/50 object-cover aspect-[16/10] max-h-40 shadow-sm"
        loading="lazy"
      />
    );
  }
  if (variant === 'gridCard') {
    return <span className="select-none">{image}</span>;
  }
  return <div className="text-4xl mb-4 select-none">{image}</div>;
}
```

---

### `server/src/db.js`

```javascript
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { runSeed } from './seed.js';
import { createSqlitePool } from './sqlite-pool.js';
import { runMigrationsPg, runMigrationsSqlite } from './migrations.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function initDatabase() {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (connectionString) {
    return initPostgres(connectionString);
  }
  const sqlitePath = process.env.SQLITE_PATH
    ? path.resolve(process.env.SQLITE_PATH)
    : path.join(__dirname, '..', 'data', 'app.db');
  return initSqlite(sqlitePath);
}

async function initPostgres(connectionString) {
  const useSsl =
    process.env.PGSSLMODE === 'require' ||
    process.env.DATABASE_SSL === '1' ||
    /sslmode=require|render\.com|neon\.tech|supabase\.co/i.test(connectionString);

  const pool = new pg.Pool({
    connectionString,
    max: 10,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
  });

  const schemaPath = path.join(__dirname, '..', 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');
  await pool.query(sql);
  await runMigrationsPg(pool);
  await runSeed(pool);
  console.log('Database: PostgreSQL');
  return pool;
}

async function initSqlite(dbPath) {
  const pool = createSqlitePool(dbPath);
  const schemaPath = path.join(__dirname, '..', 'schema-sqlite.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');
  pool.exec(sql);
  await runMigrationsSqlite(pool);
  await runSeed(pool);
  console.log(`Database: SQLite (${dbPath})`);
  return pool;
}
```

---

### `server/src/stmt.js`

```javascript
import { toPgParams } from './pg-query.js';

const NO_RETURNING = new Set([
  'enrollments',
  'lesson_progress',
  'weekly_activity',
  'test_attempts',
  'app_config',
]);

export function stmt(pool, sql) {
  const { text } = toPgParams(sql);
  const insertMatch = sql.match(/INSERT\s+INTO\s+(\w+)/i);
  const table = insertMatch ? insertMatch[1].toLowerCase() : '';

  return {
    async run(...params) {
      let q = text;
      if (/INSERT\s+INTO/i.test(sql) && !/RETURNING/i.test(q)) {
        if (!NO_RETURNING.has(table)) {
          q += ' RETURNING id';
        }
      }
      const r = await pool.query(q, params);
      const id = r.rows[0]?.id;
      return { lastInsertRowid: id, changes: r.rowCount };
    },
    async get(...params) {
      const r = await pool.query(text, params);
      return r.rows[0];
    },
    async all(...params) {
      const r = await pool.query(text, params);
      return r.rows;
    },
  };
}
```

---

### `server/src/objectStorage.js`

```javascript
import fs from 'fs';
import path from 'path';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

let _client = null;

/**
 * S3-сүйісімді сақтау (AWS S3, Cloudflare R2, MinIO, DigitalOcean Spaces).
 * Орнатылғанда курс обложкалары мен аватарлар тұрақты URL-ге жүктеледі (локалды /uploads емес).
 */
export function getObjectStorageConfig() {
  const bucket = process.env.S3_BUCKET?.trim();
  const region = process.env.S3_REGION?.trim() || 'us-east-1';
  const accessKeyId = process.env.S3_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY?.trim();
  const endpoint = process.env.S3_ENDPOINT?.trim() || '';
  const publicBase = process.env.S3_PUBLIC_BASE_URL?.trim() || '';

  if (!bucket || !accessKeyId || !secretAccessKey || !publicBase) {
    return null;
  }
  const forcePathStyle = process.env.S3_FORCE_PATH_STYLE !== '0';
  return { bucket, region, accessKeyId, secretAccessKey, endpoint, publicBase, forcePathStyle };
}

export function isObjectStorageEnabled() {
  return getObjectStorageConfig() !== null;
}

function getClient() {
  const c = getObjectStorageConfig();
  if (!c) throw new Error('Object storage not configured');
  if (_client) return _client;
  _client = new S3Client({
    region: c.region,
    ...(c.endpoint
      ? {
          endpoint: c.endpoint,
          forcePathStyle: c.forcePathStyle,
        }
      : {}),
    credentials: { accessKeyId: c.accessKeyId, secretAccessKey: c.secretAccessKey },
  });
  return _client;
}

export function publicUrlForKey(key) {
  const c = getObjectStorageConfig();
  if (!c) throw new Error('Object storage not configured');
  const base = c.publicBase.replace(/\/$/, '');
  const encoded = String(key)
    .split('/')
    .map((seg) => encodeURIComponent(seg))
    .join('/');
  return `${base}/${encoded}`;
}

export function objectKeyFromPublicUrl(fullUrl) {
  const c = getObjectStorageConfig();
  if (!c) return null;
  const base = c.publicBase.replace(/\/$/, '');
  const u = String(fullUrl).trim().split('?')[0];
  if (!u.startsWith(base + '/') && u !== base) return null;
  const raw = u.slice(base.length + 1);
  if (!raw) return null;
  return raw
    .split('/')
    .map((seg) => decodeURIComponent(seg))
    .join('/');
}

export async function putPublicObject({ key, body, contentType }) {
  const c = getObjectStorageConfig();
  const client = getClient();
  await client.send(
    new PutObjectCommand({
      Bucket: c.bucket,
      Key: key,
      Body: body,
      ContentType: contentType || 'application/octet-stream',
    })
  );
  return publicUrlForKey(key);
}

async function deleteObjectByPublicUrl(fullUrl) {
  if (!isObjectStorageEnabled()) return;
  const key = objectKeyFromPublicUrl(fullUrl);
  if (!key) return;
  const c = getObjectStorageConfig();
  const client = getClient();
  try {
    await client.send(new DeleteObjectCommand({ Bucket: c.bucket, Key: key }));
  } catch {
    /* */
  }
}

/**
 * Дерекқордағы жол: /uploads/... немесе толық https URL (объектілік сақтау).
 */
export async function deleteStoredAsset(storedPath, uploadsRoot) {
  const p = storedPath && String(storedPath).trim();
  if (!p) return;
  if (p.startsWith('http://') || p.startsWith('https://')) {
    await deleteObjectByPublicUrl(p);
    return;
  }
  if (p.startsWith('/uploads/') && uploadsRoot) {
    const rel = p.replace(/^\/uploads\//, '');
    const fp = path.join(uploadsRoot, rel);
    try {
      fs.unlinkSync(fp);
    } catch {
      /* */
    }
  }
}
```

---

### `server/src/index.js` (үзінді: импорттар, uploads, multer, auth маршруттары)

Толық API бір файлда жинақталған; төменде бастапқы бөлік және `/api/auth/*` маршруттары көрсетілген. Қалғаны: студент/админ endpoint-тері, AI чат, т.б. — `server/src/index.js` файлынан оқыңыз.

```javascript
import 'express-async-errors';
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { initDatabase } from './db.js';
import { stmt } from './stmt.js';
import { generateGroqReply, getGroqApiKey } from './groq.js';
import { runUserAiChat } from './aiChatGate.js';
import {
  deleteStoredAsset,
  isObjectStorageEnabled,
  putPublicObject,
} from './objectStorage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });
const uploadsRoot = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(path.join(uploadsRoot, 'courses'), { recursive: true });
fs.mkdirSync(path.join(uploadsRoot, 'submissions'), { recursive: true });
fs.mkdirSync(path.join(uploadsRoot, 'avatars'), { recursive: true });

// ... decodeUploadFilename, sanitizeFilename, uniqueFilenameInDir, adminUpload, submissionUpload,
// courseDisplayImage, COVER_EXT_BY_MIME, coverImageUploadDisk/Memory, avatarUploadDisk/Memory,
// coverUploadMiddleware, avatarUploadMiddleware, көмекші функциялар ...

app.use(express.json({ limit: '2mb' }));
app.use('/uploads', express.static(uploadsRoot));

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

function authMiddleware(req, res, next) {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    req.user = jwt.verify(h.slice(7), JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (req.user?.role !== role) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}

app.post('/api/auth/register', async (req, res) => {
  const { email, password, name } = req.body || {};
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'email, password, name required' });
  }
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  const exists = await stmt(pool, 'SELECT id FROM users WHERE email = ?').get(email);
  if (exists) return res.status(409).json({ error: 'Email already registered' });
  const hash = bcrypt.hashSync(password, 10);
  const studentCode = `ST${Date.now().toString().slice(-8)}`;
  const info = await stmt(
    pool,
    `INSERT INTO users (email, password_hash, name, role, student_code, grade_label) VALUES (?,?,?,?,?,?)`
  ).run(email, hash, name, 'student', studentCode, '—');
  const row = await stmt(pool, `SELECT id, email, name, role, student_code, grade_label FROM users WHERE id = ?`).get(
    Number(info.lastInsertRowid)
  );
  const user = {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    studentCode: row.student_code,
    gradeLabel: row.grade_label,
  };
  const token = signToken({ sub: user.id, role: user.role, email: user.email });
  res.json({ token, user });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  const row = await stmt(pool, 'SELECT * FROM users WHERE email = ?').get(email);
  if (!row || !bcrypt.compareSync(password, row.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const user = {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    studentCode: row.student_code,
    gradeLabel: row.grade_label,
  };
  const token = signToken({ sub: user.id, role: user.role, email: user.email });
  res.json({ token, user });
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  const row = await stmt(pool, 'SELECT id, email, name, role, student_code, grade_label, notifications_enabled FROM users WHERE id = ?').get(
    req.user.sub
  );
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json({
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    studentCode: row.student_code,
    gradeLabel: row.grade_label,
    notificationsEnabled: !!row.notifications_enabled,
  });
});
```

---

**Қорытынды (14-бөлік):** Android жобасындағыдай барлық экран кодтарын бір readme-ға сыйғызу мүмкін емес; жоғарыда кіру нүктесі (`main`, `App`, `routes`), қорғау (`ProtectedRoute`, `AppContext`), API клиенті, кіру беті, курс обложкасы компоненті және сервердің дерекқор/объектілік сақтау + auth үзінділері берілді. Қалған файлдар үшін репозиторийдегі `frontend/src` және `server/src` қалталарын ашыңыз.
