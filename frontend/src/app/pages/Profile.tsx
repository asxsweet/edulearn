import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { User, Award, BookOpen, TrendingUp, Calendar, Camera, Trash2 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { api, apiForm, fileUrl } from '../../api/client';

interface ProfilePayload {
  user: {
    name: string;
    student_code: string;
    grade_label: string;
    bio: string;
    avatarUrl: string | null;
  };
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

const statVisual: Record<string, { box: string; icon: string }> = {
  blue: { box: 'bg-blue-500/10', icon: 'text-blue-500' },
  green: { box: 'bg-green-500/10', icon: 'text-green-500' },
  purple: { box: 'bg-purple-500/10', icon: 'text-purple-500' },
  pink: { box: 'bg-pink-500/10', icon: 'text-pink-500' },
};

export default function Profile() {
  const { t } = useApp();
  const [data, setData] = useState<ProfilePayload | null>(null);
  const [bioDraft, setBioDraft] = useState('');
  const [savingBio, setSavingBio] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const d = await api<ProfilePayload>('/api/profile');
        if (!cancelled) {
          setData(d);
          setBioDraft(d.user.bio || '');
        }
      } catch {
        /* */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const saveBio = async () => {
    if (!data) return;
    setSavingBio(true);
    setProfileError(null);
    try {
      await api<{ bio: string }>('/api/profile', {
        method: 'PATCH',
        body: JSON.stringify({ bio: bioDraft }),
      });
      const d = await api<ProfilePayload>('/api/profile');
      setData(d);
      setBioDraft(d.user.bio || '');
    } catch (e) {
      setProfileError(e instanceof Error ? e.message : t('unknownError'));
    } finally {
      setSavingBio(false);
    }
  };

  const onAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !data) return;
    if (!/^image\//i.test(file.type)) {
      setProfileError(t('avatarImageOnly'));
      return;
    }
    setUploadingAvatar(true);
    setProfileError(null);
    try {
      const fd = new FormData();
      fd.append('avatar', file);
      const res = await apiForm<{ avatarUrl: string }>('/api/profile/avatar', fd);
      setData((prev) =>
        prev
          ? {
              ...prev,
              user: { ...prev.user, avatarUrl: res.avatarUrl },
            }
          : prev
      );
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : t('unknownError'));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const removeAvatar = async () => {
    if (!data?.user.avatarUrl) return;
    setUploadingAvatar(true);
    setProfileError(null);
    try {
      const res = await api<{ avatarUrl: string | null }>('/api/profile/avatar', { method: 'DELETE' });
      setData((prev) =>
        prev
          ? {
              ...prev,
              user: { ...prev.user, avatarUrl: res.avatarUrl },
            }
          : prev
      );
    } catch (e) {
      setProfileError(e instanceof Error ? e.message : t('unknownError'));
    } finally {
      setUploadingAvatar(false);
    }
  };

  if (!data) {
    return <div className="p-8 text-muted-foreground">{t('loading')}</div>;
  }

  const { user, completedCourses, progressData, stats } = data;
  const progressForChart = progressData.map((p) => ({
    name: t(p.labelKey),
    value: p.value,
    color: p.color,
  }));

  const avatarSrc = user.avatarUrl ? fileUrl(user.avatarUrl) : '';

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">
      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
        <div className="h-32 bg-gradient-to-br from-[#6366f1] to-[#8b5cf6]" />
        <div className="p-6 -mt-16 relative">
          <div className="flex flex-col sm:flex-row sm:items-end gap-6">
            <div className="relative shrink-0">
              <div className="w-32 h-32 rounded-2xl border-4 border-card shadow-lg overflow-hidden bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] flex items-center justify-center">
                {avatarSrc ? (
                  <img src={avatarSrc} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-16 h-16 text-white" />
                )}
              </div>
              <label className="absolute bottom-1 right-1 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-card border border-border shadow-md hover:bg-accent">
                <Camera className="w-4 h-4 text-foreground" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploadingAvatar}
                  onChange={onAvatarChange}
                />
              </label>
            </div>
            <div className="flex-1 pb-4 space-y-3 min-w-0">
              <div>
                <h1 className="text-foreground mb-1">{user.name}</h1>
                <p className="text-muted-foreground">
                  {user.grade_label} • ID: {user.student_code}
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">{t('profileBio')}</label>
                <textarea
                  value={bioDraft}
                  onChange={(e) => setBioDraft(e.target.value)}
                  placeholder={t('profileBioPlaceholder')}
                  rows={4}
                  maxLength={2000}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-y min-h-[96px]"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={saveBio}
                    disabled={savingBio}
                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:opacity-90 disabled:opacity-50"
                  >
                    {savingBio ? t('loading') : t('save')}
                  </button>
                  {user.avatarUrl ? (
                    <button
                      type="button"
                      onClick={removeAvatar}
                      disabled={uploadingAvatar}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm hover:bg-accent disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                      {t('removeAvatar')}
                    </button>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">{t('profileAvatarHint')}</p>
                {profileError ? <p className="text-sm text-destructive">{profileError}</p> : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = iconMap[stat.color as keyof typeof iconMap] || BookOpen;
          const sv = statVisual[stat.color] || statVisual.blue;
          return (
            <div key={index} className="bg-card rounded-xl p-6 border border-border shadow-sm">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${sv.box}`}>
                  <Icon className={`w-6 h-6 ${sv.icon}`} />
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
            {completedCourses.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('noCompletedCoursesYet')}</p>
            ) : (
              completedCourses.map((course, index) => (
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
              ))
            )}
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
