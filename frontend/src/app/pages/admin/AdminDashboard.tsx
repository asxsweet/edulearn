import { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Users, BookOpen, FileText, TrendingUp, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { api } from '../../../api/client';

const icons = { blue: Users, purple: BookOpen, green: FileText, pink: TrendingUp };

export default function AdminDashboard() {
  const { t } = useApp();
  const [overview, setOverview] = useState<{
    stats: Array<{ labelKey: string; value: string; change: string; color: string }>;
  } | null>(null);
  const [charts, setCharts] = useState<{
    enrollmentTrend: Array<{ month: string; students: number }>;
    coursePerformance: Array<{ course: string; completion: number }>;
  } | null>(null);
  const [activity, setActivity] = useState<Array<{ student: string; action: string; course: string; time: string }>>([]);

  useEffect(() => {
    let c = false;
    (async () => {
      try {
        const [o, ch, a] = await Promise.all([
          api<{ stats: Array<{ labelKey: string; value: string; change: string; color: string }> }>('/api/admin/overview'),
          api<{ enrollmentTrend: Array<{ month: string; students: number }>; coursePerformance: Array<{ course: string; completion: number }> }>(
            '/api/admin/charts'
          ),
          api<Array<{ student: string; action: string; course: string; time: string }>>('/api/admin/recent-activity'),
        ]);
        if (!c) {
          setOverview(o as { stats: Array<{ labelKey: string; value: string; change: string; color: string }> });
          setCharts(ch);
          setActivity(a);
        }
      } catch {
        /* */
      }
    })();
    return () => {
      c = true;
    };
  }, []);

  if (!overview || !charts) {
    return <div className="text-muted-foreground p-8">{t('dashboard')}</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="mb-2">{t('adminDashboardTitle')}</h1>
        <p className="text-muted-foreground">{t('adminDashboardSubtitle')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {overview.stats.map((stat, index) => {
          const Icon = icons[stat.color as keyof typeof icons] || Users;
          return (
            <div key={index} className="bg-card rounded-xl p-6 border border-border shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center bg-${stat.color}-500/10`}>
                  <Icon className={`w-6 h-6 text-${stat.color}-500`} />
                </div>
                <span className="text-sm text-green-500">{stat.change}</span>
              </div>
              <h3 className="text-foreground mb-1">{stat.value}</h3>
              <p className="text-sm text-muted-foreground">{t(stat.labelKey)}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
          <h2 className="text-foreground mb-6">{t('studentEnrollmentTrend')}</h2>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={charts.enrollmentTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" stroke="var(--muted-foreground)" />
              <YAxis stroke="var(--muted-foreground)" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                }}
              />
              <Line type="monotone" dataKey="students" stroke="#6366f1" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
          <h2 className="text-foreground mb-6">{t('courseCompletionRates')}</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={charts.coursePerformance} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" stroke="var(--muted-foreground)" />
              <YAxis dataKey="course" type="category" stroke="var(--muted-foreground)" width={100} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="completion" fill="#8b5cf6" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
        <div className="p-6 border-b border-border">
          <h2 className="text-foreground">{t('recentActivity')}</h2>
        </div>
        <div className="divide-y divide-border">
          {activity.map((row, index) => (
            <div key={index} className="p-4 hover:bg-accent transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] flex items-center justify-center text-white">
                    {row.student[0]}
                  </div>
                  <div>
                    <p className="text-foreground">
                      <span>{row.student}</span> <span className="text-muted-foreground">{row.action}</span>
                    </p>
                    <p className="text-sm text-muted-foreground">{row.course}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>{row.time}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
