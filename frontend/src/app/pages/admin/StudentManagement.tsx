import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Search, Eye, TrendingUp, Award } from 'lucide-react';
import { api } from '../../../api/client';

interface StudentRow {
  id: number;
  name: string;
  email: string;
  enrolledCourses: number;
  completedCourses: number;
  averageScore: number;
  status: string;
}

export default function StudentManagement() {
  const { t } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [students, setStudents] = useState<StudentRow[]>([]);

  useEffect(() => {
    let c = false;
    (async () => {
      try {
        const list = await api<StudentRow[]>('/api/admin/students');
        if (!c) setStudents(list);
      } catch {
        /* */
      }
    })();
    return () => {
      c = true;
    };
  }, []);

  const filteredStudents = students.filter(
    (student) =>
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="mb-2">{t('students')}</h1>
        <p className="text-muted-foreground">{t('statistics')}</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          placeholder={t('search')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStudents.map((student) => (
          <div key={student.id} className="bg-card rounded-xl p-6 border border-border shadow-sm space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] flex items-center justify-center text-white text-xl">
                {student.name[0]}
              </div>
              <div className="flex-1">
                <h3 className="text-foreground mb-1">{student.name}</h3>
                <p className="text-sm text-muted-foreground">{student.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-accent rounded-lg p-3">
                <div className="flex items-center gap-2 text-blue-500 mb-1">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-sm">{t('enrolledCourses')}</span>
                </div>
                <p className="text-foreground">{student.enrolledCourses}</p>
              </div>
              <div className="bg-accent rounded-lg p-3">
                <div className="flex items-center gap-2 text-green-500 mb-1">
                  <Award className="w-4 h-4" />
                  <span className="text-sm">{t('completed')}</span>
                </div>
                <p className="text-foreground">{student.completedCourses}</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-border">
              <div>
                <p className="text-sm text-muted-foreground">{t('averageScoreStat')}</p>
                <p className="text-foreground">{student.averageScore}%</p>
              </div>
              <button
                type="button"
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
              >
                <Eye className="w-4 h-4" />
                {t('viewProgress')}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
