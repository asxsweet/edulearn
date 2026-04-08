import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useApp } from '../../context/AppContext';
import { ArrowLeft, BookOpen, ClipboardList, FileText, Award } from 'lucide-react';
import { api } from '../../../api/client';

type ProgressPayload = {
  student: {
    id: number;
    name: string;
    email: string;
    studentCode: string | null;
    gradeLabel: string | null;
  };
  courses: Array<{
    courseId: number;
    title: string;
    progress: number;
    lessonsDone: number;
    totalLessons: number;
    accentColor: string;
    tests: Array<{ id: number; title: string; questionCount: number; score: number | null; completed: boolean }>;
    assignments: Array<{
      id: number;
      title: string;
      dueDate: string;
      status: string;
      score: number | null;
      feedback: string;
      submittedAt: string | null;
    }>;
  }>;
};

export default function StudentProgress() {
  const { id } = useParams();
  const { t } = useApp();
  const [data, setData] = useState<ProgressPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let c = false;
    (async () => {
      if (!id) return;
      try {
        const d = await api<ProgressPayload>('/api/admin/students/' + id + '/progress');
        if (!c) setData(d);
      } catch (e) {
        if (!c) setErr(e instanceof Error ? e.message : 'Error');
      }
    })();
    return () => {
      c = true;
    };
  }, [id]);

  if (err) {
    return <div className="text-destructive p-6">{err}</div>;
  }
  if (!data) {
    return <div className="text-muted-foreground p-6">{t('loading')}</div>;
  }

  const { student, courses } = data;

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <Link
          to="/admin/students"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('backToStudents')}
        </Link>
        <h1 className="mb-2">{t('studentProgressTitle')}</h1>
        <p className="text-muted-foreground">{t('studentProgressSubtitle')}</p>
      </div>

      <div className="bg-card rounded-xl border border-border p-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-chart-2 flex items-center justify-center text-white text-2xl font-medium shrink-0">
          {student.name[0]?.toUpperCase() || '?'}
        </div>
        <div>
          <h2 className="text-foreground text-lg">{student.name}</h2>
          <p className="text-sm text-muted-foreground">{student.email}</p>
          {(student.studentCode || student.gradeLabel) && (
            <p className="text-sm text-muted-foreground mt-1">
              {student.gradeLabel ? `${student.gradeLabel} · ` : ''}
              {student.studentCode ? `${t('studentIdLabel')}: ${student.studentCode}` : ''}
            </p>
          )}
        </div>
      </div>

      {courses.length === 0 ? (
        <p className="text-muted-foreground">{t('noEnrolledCoursesAdmin')}</p>
      ) : (
        <div className="space-y-6">
          {courses.map((course) => (
            <div key={course.courseId} className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="p-6 border-b border-border flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${course.accentColor}22` }}
                  >
                    <BookOpen className="w-6 h-6" style={{ color: course.accentColor }} />
                  </div>
                  <div>
                    <h3 className="text-foreground font-medium">{course.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {course.lessonsDone}/{course.totalLessons} {t('lessonsWord')}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 min-w-[120px]">
                  <span className="text-2xl font-semibold tabular-nums" style={{ color: course.accentColor }}>
                    {course.progress}%
                  </span>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${course.progress}%`, backgroundColor: course.accentColor }}
                    />
                  </div>
                </div>
              </div>

              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <ClipboardList className="w-4 h-4 text-muted-foreground" />
                    <h4 className="text-sm font-medium">{t('tests')}</h4>
                  </div>
                  <ul className="space-y-2">
                    {course.tests.length === 0 ? (
                      <li className="text-sm text-muted-foreground">—</li>
                    ) : (
                      course.tests.map((te) => (
                        <li
                          key={te.id}
                          className="flex justify-between gap-2 text-sm border border-border rounded-lg px-3 py-2"
                        >
                          <span className="text-foreground truncate">{te.title}</span>
                          <span className="text-muted-foreground shrink-0">
                            {te.questionCount === 0 ? (
                              <span className="text-xs">{t('externalTestLabel')}</span>
                            ) : te.completed ? (
                              <span className="text-green-600">{te.score ?? 0}%</span>
                            ) : (
                              <span className="text-xs">{t('notStarted')}</span>
                            )}
                          </span>
                        </li>
                      ))
                    )}
                  </ul>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <h4 className="text-sm font-medium">{t('assignments')}</h4>
                  </div>
                  <ul className="space-y-2">
                    {course.assignments.length === 0 ? (
                      <li className="text-sm text-muted-foreground">—</li>
                    ) : (
                      course.assignments.map((as) => (
                        <li key={as.id} className="border border-border rounded-lg px-3 py-2 space-y-1">
                          <div className="flex justify-between gap-2 text-sm">
                            <span className="text-foreground font-medium truncate">{as.title}</span>
                            {as.status === 'graded' && as.score != null ? (
                              <span className="inline-flex items-center gap-1 shrink-0 text-green-600 font-medium">
                                <Award className="w-3.5 h-3.5" />
                                {as.score}%
                              </span>
                            ) : as.status === 'pending' ? (
                              <span className="text-xs text-amber-600 shrink-0">{t('gradingPending')}</span>
                            ) : as.status === 'not_submitted' ? (
                              <span className="text-xs text-muted-foreground shrink-0">{t('assignmentNotSubmitted')}</span>
                            ) : null}
                          </div>
                          {as.feedback ? (
                            <p className="text-xs text-muted-foreground line-clamp-2">{as.feedback}</p>
                          ) : null}
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
