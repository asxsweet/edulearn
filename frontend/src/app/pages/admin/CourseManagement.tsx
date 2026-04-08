import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useApp } from '../../context/AppContext';
import { Plus, Edit, Trash2, Calendar, Users } from 'lucide-react';
import { api } from '../../../api/client';

interface CourseAdmin {
  id: number;
  title: string;
  students: number;
  lessons: number;
  deadline: string | null;
  status: string;
}

export default function CourseManagement() {
  const { t } = useApp();
  const [courses, setCourses] = useState<CourseAdmin[]>([]);

  const load = async () => {
    const list = await api<CourseAdmin[]>('/api/admin/courses');
    setCourses(list);
  };

  useEffect(() => {
    load().catch(() => {});
  }, []);

  const handleDelete = async (courseId: number) => {
    if (!window.confirm(t('deleteCourseConfirm'))) return;
    await api('/api/admin/courses/' + courseId, { method: 'DELETE' });
    await load();
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="mb-2">{t('courseManagement')}</h1>
          <p className="text-muted-foreground">{t('statistics')}</p>
        </div>
        <Link
          to="/admin/courses/create"
          className="flex items-center gap-2 px-4 py-3 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
        >
          <Plus className="w-5 h-5" />
          {t('addCourse')}
        </Link>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-accent border-b border-border">
              <tr>
                <th className="text-left p-4 text-foreground">{t('courses')}</th>
                <th className="text-left p-4 text-foreground">{t('students')}</th>
                <th className="text-left p-4 text-foreground">{t('lessons')}</th>
                <th className="text-left p-4 text-foreground">{t('dueDate')}</th>
                <th className="text-left p-4 text-foreground">{t('statusLabel')}</th>
                <th className="text-left p-4 text-foreground">{t('edit')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {courses.map((course) => (
                <tr key={course.id} className="hover:bg-accent transition-colors">
                  <td className="p-4">
                    <h4 className="text-foreground">{course.title}</h4>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span>{course.students}</span>
                    </div>
                  </td>
                  <td className="p-4 text-muted-foreground">
                    {course.lessons} {t('lessonsWord')}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>{course.deadline || '—'}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span
                      className={`px-3 py-1 rounded-full text-sm ${
                        course.status === 'active' ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'
                      }`}
                    >
                      {course.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/admin/courses/edit/${course.id}`}
                        className="p-2 rounded-lg hover:bg-accent transition-colors"
                        title={t('edit')}
                      >
                        <Edit className="w-5 h-5 text-blue-500" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDelete(course.id)}
                        className="p-2 rounded-lg hover:bg-accent transition-colors"
                        title={t('delete')}
                      >
                        <Trash2 className="w-5 h-5 text-red-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
