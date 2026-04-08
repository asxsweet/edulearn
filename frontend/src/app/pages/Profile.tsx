import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { User, Award, BookOpen, TrendingUp, Calendar } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { api } from '../../api/client';

interface ProfilePayload {
  user: { name: string; student_code: string; grade_label: string };
  completedCourses: Array<{ title: string; completedDate: string; grade: number }>;
  progressData: Array<{ labelKey: string; value: number; color: string }>;
  stats: Array<{ labelKey: string; value: string; color: string }>;
}

const iconMap = {
  blue: BookOpen,
  green: Award,
  purple: TrendingUp,
  pink: Calendar,
};

export default function Profile() {
  const { t } = useApp();
  const [data, setData] = useState<ProfilePayload | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const d = await api<ProfilePayload>('/api/profile');
        if (!cancelled) setData(d);
      } catch {
        /* */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!data) {
    return <div className="p-8 text-muted-foreground">{t('profile')}</div>;
  }

  const { user, completedCourses, progressData, stats } = data;
  const progressForChart = progressData.map((p) => ({
    name: t(p.labelKey),
    value: p.value,
    color: p.color,
  }));

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">
      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
        <div className="h-32 bg-gradient-to-br from-[#6366f1] to-[#8b5cf6]" />
        <div className="p-6 -mt-16 relative">
          <div className="flex items-end gap-6">
            <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] border-4 border-card flex items-center justify-center shadow-lg">
              <User className="w-16 h-16 text-white" />
            </div>
            <div className="flex-1 pb-4">
              <h1 className="text-foreground mb-1">{user.name}</h1>
              <p className="text-muted-foreground">
                {user.grade_label} • ID: {user.student_code}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = iconMap[stat.color as keyof typeof iconMap] || BookOpen;
          return (
            <div key={index} className="bg-card rounded-xl p-6 border border-border shadow-sm">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center bg-${stat.color}-500/10`}>
                  <Icon className={`w-6 h-6 text-${stat.color}-500`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t(stat.labelKey)}</p>
                  <h3 className="text-foreground">{stat.value}</h3>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card rounded-xl p-6 border border-border shadow-sm">
          <h2 className="text-foreground mb-6">{t('completedCourses')}</h2>
          <div className="space-y-4">
            {completedCourses.map((course, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 rounded-xl bg-accent border border-border"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] flex items-center justify-center">
                    <Award className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="text-foreground mb-1">{course.title}</h4>
                    <p className="text-sm text-muted-foreground">{course.completedDate}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="px-3 py-1 rounded-full bg-green-500/10 text-green-500">{course.grade}%</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
          <h3 className="text-foreground mb-4">{t('overallProgress')}</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={progressForChart}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {progressForChart.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-4">
            {progressData.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm text-muted-foreground">{t(item.labelKey)}</span>
                </div>
                <span className="text-sm">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
