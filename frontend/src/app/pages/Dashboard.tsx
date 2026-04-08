import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { BookOpen, Brain, TrendingUp, Award, ArrowRight, PlayCircle, Clock } from 'lucide-react';
import { Link } from 'react-router';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../../api/client';

interface DashboardPayload {
  stats: {
    enrolledCount: number;
    lessonsLabel: string;
    avgScore: string;
    certificates: number;
    activityThisWeek: number;
  };
  enrolledCourses: Array<{
    id: number;
    title: string;
    progress: number;
    lessons: number;
    totalLessons: number;
    color: string;
  }>;
  weeklyActivity: Array<{ date: string; count: number }>;
  learningStats: { completed: number; inProgress: number; notStarted: number };
}

function formatWeekdayLabel(dateIso: string, language: string) {
  const loc = language === 'kk' ? 'kk-KZ' : language === 'ru' ? 'ru-RU' : 'en-US';
  return new Intl.DateTimeFormat(loc, { weekday: 'short' }).format(new Date(dateIso + 'T12:00:00'));
}

export default function Dashboard() {
  const { t, user, language } = useApp();
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const d = await api<DashboardPayload>('/api/student/dashboard');
        if (!cancelled) setData(d);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'Error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (err) {
    return <div className="text-destructive">{err}</div>;
  }
  if (!data) {
    return <div className="text-muted-foreground">{t('loading')}</div>;
  }

  const { stats, enrolledCourses, weeklyActivity, learningStats } = data;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="mb-2">
          {t('welcome')}, {user?.name}!
        </h1>
        <p className="text-muted-foreground">{t('dashboardSubtitle')}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl p-6 border border-border">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl">{stats.enrolledCount}</p>
              <p className="text-sm text-muted-foreground">{t('enrolledCourses')}</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl p-6 border border-border">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-chart-2/10 flex items-center justify-center">
              <Brain className="w-5 h-5 text-chart-2" />
            </div>
            <div>
              <p className="text-2xl">{stats.lessonsLabel}</p>
              <p className="text-sm text-muted-foreground">{t('lessonsWord')}</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl p-6 border border-border">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-chart-5/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-chart-5" />
            </div>
            <div>
              <p className="text-2xl">{stats.avgScore}</p>
              <p className="text-sm text-muted-foreground">{t('averageScoreStat')}</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl p-6 border border-border">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-chart-3/10 flex items-center justify-center">
              <Award className="w-5 h-5 text-chart-3" />
            </div>
            <div>
              <p className="text-2xl">{stats.certificates}</p>
              <p className="text-sm text-muted-foreground">{t('certificates')}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2>{t('continueLearning')}</h2>
              <Link to="/courses" className="text-sm text-primary hover:underline">
                {t('viewAll')}
              </Link>
            </div>
            <div className="space-y-3">
              {enrolledCourses.map((course) => (
                <Link
                  key={course.id}
                  to={`/courses/${course.id}`}
                  className="block p-4 rounded-lg border border-border hover:border-primary/50 hover:shadow-sm transition-all group"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="group-hover:text-primary transition-colors">{course.title}</h3>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                    <span>
                      {course.lessons}/{course.totalLessons} {t('lessonsWord')}
                    </span>
                    <span>
                      {course.progress}% {t('progress').toLowerCase()}
                    </span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${course.progress}%`, backgroundColor: course.color }}
                    />
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border p-6">
            <h2 className="mb-1">{t('weeklyActivity')}</h2>
            <p className="text-xs text-muted-foreground mb-4">{t('weeklyActivitySubtitle')}</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={weeklyActivity}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d) => formatWeekdayLabel(String(d), language)}
                  stroke="var(--muted-foreground)"
                  fontSize={12}
                />
                <YAxis allowDecimals={false} stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip
                  labelFormatter={(d) => formatWeekdayLabel(String(d), language)}
                  formatter={(value: number) => [value, t('submissionsLabel')]}
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                  }}
                  cursor={{ fill: 'var(--accent)' }}
                />
                <Bar dataKey="count" fill="var(--primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="mb-4">{t('quickActions')}</h3>
            <div className="space-y-2">
              <Link
                to="/courses"
                className="flex items-center gap-3 p-3 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
              >
                <PlayCircle className="w-5 h-5" />
                <span>{t('continueLesson')}</span>
              </Link>
              <Link
                to="/ai-assistant"
                className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent transition-colors"
              >
                <Brain className="w-5 h-5" />
                <span>{t('aiAssistant')}</span>
              </Link>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="mb-4">{t('learningStats')}</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-chart-5" />
                  <span className="text-sm text-muted-foreground">{t('completed')}</span>
                </div>
                <span>{learningStats.completed}</span>
              </div>
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <span className="text-sm text-muted-foreground">{t('inProgress')}</span>
                </div>
                <span>{learningStats.inProgress}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-muted" />
                  <span className="text-sm text-muted-foreground">{t('notStarted')}</span>
                </div>
                <span>{learningStats.notStarted}</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-primary/10 to-chart-2/10 rounded-xl border border-primary/20 p-6">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="w-5 h-5 text-primary" />
              <h3>{t('thisWeek')}</h3>
            </div>
            <p className="text-3xl mb-1">{stats.activityThisWeek}</p>
            <p className="text-sm text-muted-foreground">{t('activityThisWeekLabel')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
