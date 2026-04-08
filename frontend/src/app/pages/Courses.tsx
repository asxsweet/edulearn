import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Search, ArrowRight } from 'lucide-react';
import { Link } from 'react-router';
import { api } from '../../api/client';
import { CourseCoverMedia, isCourseCoverImagePath } from '../components/CourseCoverMedia';

interface CourseRow {
  id: number;
  title: string;
  description: string;
  image: string;
  progress: number;
  enrolled: boolean;
  lessons: number;
  duration: string;
  unlocked: boolean;
}

export default function Courses() {
  const { t } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const list = await api<CourseRow[]>('/api/courses');
      setCourses(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const enroll = async (e: React.MouseEvent, courseId: number) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await api('/api/courses/' + courseId + '/enroll', { method: 'POST', body: '{}' });
      await load();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Error');
    }
  };

  const filteredCourses = courses.filter((course) => {
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      filterType === 'all' ||
      (filterType === 'enrolled' && course.enrolled) ||
      (filterType === 'available' && !course.enrolled);
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return <div className="text-muted-foreground">{t('courses')}</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="mb-2">{t('courses')}</h1>
        <p className="text-muted-foreground">{t('coursesSubtitle')}</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder={t('searchCourses')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-input bg-input-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`px-4 py-3 rounded-xl transition-colors ${
              filterType === 'all' ? 'bg-primary text-primary-foreground' : 'border border-border hover:bg-accent'
            }`}
          >
            {t('allCourses')}
          </button>
          <button
            type="button"
            onClick={() => setFilterType('enrolled')}
            className={`px-4 py-3 rounded-xl transition-colors ${
              filterType === 'enrolled' ? 'bg-primary text-primary-foreground' : 'border border-border hover:bg-accent'
            }`}
          >
            {t('myEnrolledCourses')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCourses.map((course) => (
          <div
            key={course.id}
            className="bg-card rounded-xl border border-border overflow-hidden shadow-sm hover:shadow-lg transition-all group"
          >
            <div
              className={`h-40 overflow-hidden ${
                isCourseCoverImagePath(course.image)
                  ? 'bg-muted'
                  : 'bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] flex items-center justify-center text-6xl'
              }`}
            >
              <CourseCoverMedia image={course.image} variant="gridCard" />
            </div>
            <div className="p-6 space-y-4">
              <div>
                <h3 className="text-foreground mb-2">{course.title}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2">{course.description}</p>
              </div>

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>
                  {course.lessons} {t('lessonsWord')}
                </span>
                <span>•</span>
                <span>{course.duration}</span>
              </div>

              {course.enrolled && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t('progress')}</span>
                    <span>{course.progress}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] rounded-full transition-all"
                      style={{ width: `${course.progress}%` }}
                    />
                  </div>
                </div>
              )}

              {course.enrolled ? (
                <Link
                  to={`/courses/${course.id}`}
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                >
                  <span>{t('continueLesson')}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={(e) => enroll(e, course.id)}
                  disabled={!course.unlocked}
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>{course.unlocked ? t('enrollNow') : t('completePreviousCourse')}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
