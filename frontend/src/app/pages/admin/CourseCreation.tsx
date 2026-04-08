import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useApp } from '../../context/AppContext';
import { Plus, Trash2, Upload, Save, BookOpen, FileText, ClipboardList, ListChecks } from 'lucide-react';
import { api, apiForm, fileUrl } from '../../../api/client';

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

type EditorLesson = {
  id: number;
  title: string;
  duration_label: string;
  sort_order: number;
  key_points: string[];
  video_url: string;
  slide_file_path: string;
};

type EditorMaterial = {
  id: number;
  name: string;
  size_label: string;
  type_label: string;
  file_path: string;
};

type EditorQuestion = {
  id?: number;
  question_text: string;
  options: string[];
  correct_index: number;
};

type EditorTest = {
  id: number;
  title: string;
  time_limit_seconds: number;
  external_url: string;
  questions: EditorQuestion[];
};

type EditorAssignment = {
  id: number;
  title: string;
  due_date: string;
};

function LessonEditorRow({
  lesson,
  t,
  onChange,
  onSave,
  onDelete,
  onUploadSlide,
}: {
  lesson: EditorLesson;
  t: (k: string) => string;
  onChange: (id: number, patch: Partial<EditorLesson>) => void;
  onSave: (lesson: EditorLesson, kpText: string) => void;
  onDelete: (id: number) => void;
  onUploadSlide: (lessonId: number, file: File) => void;
}) {
  const [kp, setKp] = useState(lesson.key_points.join('\n'));
  useEffect(() => {
    setKp(lesson.key_points.join('\n'));
  }, [lesson.id, lesson.key_points]);
  return (
    <div className="p-4 rounded-lg border border-border space-y-3 bg-background">
      <div className="flex justify-between items-center gap-2">
        <span className="text-sm font-medium text-foreground">
          #{lesson.sort_order + 1} — {lesson.title}
        </span>
        <button type="button" onClick={() => onDelete(lesson.id)} className="p-2 rounded-lg hover:bg-destructive/10 text-destructive">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      <input
        className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
        value={lesson.title}
        onChange={(e) => onChange(lesson.id, { title: e.target.value })}
        placeholder={t('courseTitle')}
      />
      <input
        className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
        value={lesson.duration_label}
        onChange={(e) => onChange(lesson.id, { duration_label: e.target.value })}
        placeholder={t('durationLabel')}
      />
      <textarea
        className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm resize-none"
        rows={3}
        value={kp}
        onChange={(e) => setKp(e.target.value)}
        placeholder={t('keyPointsPlaceholder')}
      />
      <input
        className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
        value={lesson.video_url}
        onChange={(e) => onChange(lesson.id, { video_url: e.target.value })}
        placeholder={t('youtubeUrlPlaceholder')}
      />
      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border cursor-pointer hover:bg-accent text-sm">
          <Upload className="w-4 h-4" />
          Слайд (ppt/pptx)
          <input
            type="file"
            accept=".ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUploadSlide(lesson.id, f);
              e.target.value = '';
            }}
          />
        </label>
        {lesson.slide_file_path ? (
          <a href={fileUrl(lesson.slide_file_path)} target="_blank" rel="noreferrer" className="text-sm text-primary underline">
            Ағымдағы файл
          </a>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => onSave(lesson, kp)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm"
      >
        <Save className="w-4 h-4" />
        Сабақты сақтау
      </button>
    </div>
  );
}

export default function CourseCreation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useApp();
  const courseId = id ? Number(id) : 0;
  const isEditing = !!id && !Number.isNaN(courseId);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    durationWeeks: 6,
  });

  const [lessons, setLessons] = useState<EditorLesson[]>([]);
  const [materials, setMaterials] = useState<EditorMaterial[]>([]);
  const [tests, setTests] = useState<EditorTest[]>([]);
  const [assignments, setAssignments] = useState<EditorAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [section, setSection] = useState<'meta' | 'lessons' | 'materials' | 'tests' | 'assignments'>('meta');

  const [newTest, setNewTest] = useState({
    title: '',
    time_limit_seconds: 1800,
    external_url: '',
    q1: '',
    o1: ['', '', '', ''],
    correct: 0,
  });

  const [newAssignment, setNewAssignment] = useState({ title: '', due_date: '' });

  const load = useCallback(async () => {
    if (!isEditing) return;
    setLoading(true);
    try {
      const raw = await api<{
        course: {
          title: string;
          description: string;
          durationWeeks: number;
        };
        lessons: EditorLesson[];
        materials: EditorMaterial[];
        tests: EditorTest[];
        assignments: EditorAssignment[];
      }>('/api/admin/courses/' + courseId + '/editor');
      setFormData({
        title: raw.course.title,
        description: raw.course.description,
        durationWeeks: raw.course.durationWeeks,
      });
      setLessons(raw.lessons);
      setMaterials(raw.materials);
      setTests(raw.tests);
      setAssignments(raw.assignments);
    } finally {
      setLoading(false);
    }
  }, [isEditing, courseId]);

  useEffect(() => {
    if (!isEditing) return;
    load().catch(() => {});
  }, [isEditing, load]);

  useEffect(() => {
    if (!id) return;
    let c = false;
    (async () => {
      try {
        const raw = await api<{
          title: string;
          description: string;
          durationWeeks: number;
        }>('/api/admin/courses/' + id + '/raw');
        if (c) return;
        setFormData({
          title: raw.title,
          description: raw.description,
          durationWeeks: raw.durationWeeks,
        });
      } catch {
        /* */
      }
    })();
    return () => {
      c = true;
    };
  }, [id]);

  const handleSaveMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditing && id) {
        await api('/api/admin/courses/' + id, {
          method: 'PUT',
          body: JSON.stringify({
            title: formData.title,
            description: formData.description,
            durationWeeks: formData.durationWeeks,
          }),
        });
        await load();
      } else {
        const res = await api<{ id: number }>('/api/admin/courses', {
          method: 'POST',
          body: JSON.stringify({
            title: formData.title,
            description: formData.description,
            durationWeeks: formData.durationWeeks,
          }),
        });
        navigate('/admin/courses/edit/' + res.id, { replace: true });
      }
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Error');
    }
  };

  const patchLesson = async (lesson: EditorLesson, keyPointsText: string) => {
    const key_points = keyPointsText.split('\n').map((s) => s.trim()).filter(Boolean);
    await api('/api/admin/lessons/' + lesson.id, {
      method: 'PATCH',
      body: JSON.stringify({
        title: lesson.title,
        duration_label: lesson.duration_label,
        sort_order: lesson.sort_order,
        key_points,
        video_url: lesson.video_url,
        slide_file_path: lesson.slide_file_path,
      }),
    });
    await load();
  };

  const updateLesson = (lid: number, patch: Partial<EditorLesson>) => {
    setLessons((L) => L.map((x) => (x.id === lid ? { ...x, ...patch } : x)));
  };

  const addLesson = async () => {
    if (!isEditing) {
      window.alert(t('lessonSaveFirst'));
      return;
    }
    await api('/api/admin/courses/' + courseId + '/lessons', {
      method: 'POST',
      body: JSON.stringify({
        title: `${t('lessons')} ${lessons.length + 1}`,
        duration_label: '15 min',
        sort_order: lessons.length,
        key_points: [],
        video_url: '',
        slide_file_path: '',
      }),
    });
    await load();
  };

  const deleteLesson = async (lessonId: number) => {
    if (!window.confirm(t('deleteCourseConfirm'))) return;
    await api('/api/admin/lessons/' + lessonId, { method: 'DELETE' });
    await load();
  };

  const uploadSlide = async (lessonId: number, file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    const r = await apiForm<{ url: string }>('/api/admin/courses/' + courseId + '/upload', fd);
    await api('/api/admin/lessons/' + lessonId, {
      method: 'PATCH',
      body: JSON.stringify({ slide_file_path: r.url }),
    });
    await load();
  };

  const uploadMaterialFile = async (file: File) => {
    if (!isEditing) {
      window.alert(t('lessonSaveFirst'));
      return;
    }
    const fd = new FormData();
    fd.append('file', file);
    const r = await apiForm<{ url: string; originalName: string; size: number }>('/api/admin/courses/' + courseId + '/upload', fd);
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const typeMap: Record<string, string> = { pdf: 'PDF', doc: 'DOC', docx: 'DOCX', ppt: 'PPT', pptx: 'PPTX' };
    await api('/api/admin/courses/' + courseId + '/materials', {
      method: 'POST',
      body: JSON.stringify({
        name: r.originalName || file.name,
        size_label: formatBytes(r.size || file.size),
        type_label: typeMap[ext] || ext.toUpperCase() || 'FILE',
        file_path: r.url,
      }),
    });
    await load();
  };

  const deleteMaterial = async (mid: number) => {
    if (!window.confirm(t('deleteCourseConfirm'))) return;
    await api('/api/admin/materials/' + mid, { method: 'DELETE' });
    await load();
  };

  const addTest = async () => {
    if (!isEditing) return;
    const title = newTest.title.trim();
    if (!title) {
      window.alert(t('testTitleLabel'));
      return;
    }
    const opts = newTest.o1.map((x) => x.trim()).filter(Boolean);
    const questions =
      newTest.q1.trim() && opts.length >= 2
        ? [{ question_text: newTest.q1.trim(), options: opts, correct_index: Math.min(newTest.correct, opts.length - 1) }]
        : [];
    const ext = newTest.external_url.trim();
    if (questions.length === 0 && !ext) {
      window.alert(t('externalTestLinkOptional'));
      return;
    }
    await api('/api/admin/courses/' + courseId + '/tests', {
      method: 'POST',
      body: JSON.stringify({
        title,
        time_limit_seconds: newTest.time_limit_seconds,
        external_url: ext || null,
        questions,
      }),
    });
    setNewTest({ title: '', time_limit_seconds: 1800, external_url: '', q1: '', o1: ['', '', '', ''], correct: 0 });
    await load();
  };

  const deleteTest = async (tid: number) => {
    if (!window.confirm(t('deleteCourseConfirm'))) return;
    await api('/api/admin/tests/' + tid, { method: 'DELETE' });
    await load();
  };

  const addAssignment = async () => {
    if (!isEditing) return;
    if (!newAssignment.title.trim() || !newAssignment.due_date) {
      window.alert(t('courseTitle') + ' / ' + t('dueDate'));
      return;
    }
    await api('/api/admin/courses/' + courseId + '/assignments', {
      method: 'POST',
      body: JSON.stringify({ title: newAssignment.title.trim(), due_date: newAssignment.due_date }),
    });
    setNewAssignment({ title: '', due_date: '' });
    await load();
  };

  const deleteAssignment = async (aid: number) => {
    if (!window.confirm(t('deleteCourseConfirm'))) return;
    await api('/api/admin/assignments/' + aid, { method: 'DELETE' });
    await load();
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="mb-2">{isEditing ? t('editCourse') : t('addCourse')}</h1>
        <p className="text-muted-foreground">
          {isEditing ? t('statistics') : t('statistics')}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ['meta', t('courseTitle'), BookOpen],
            ['lessons', t('lessons'), ListChecks],
            ['materials', t('materials'), FileText],
            ['tests', t('tests'), ClipboardList],
            ['assignments', t('assignments'), FileText],
          ] as const
        ).map(([key, label, Icon]) => (
          <button
            key={key}
            type="button"
            onClick={() => setSection(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm ${
              section === key ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-accent'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {section === 'meta' && (
        <form onSubmit={handleSaveMeta} className="space-y-6">
          <div className="bg-card rounded-xl p-6 border border-border space-y-4">
            <h2 className="text-foreground">{t('courseTitle')}</h2>
            <div className="space-y-2">
              <label className="text-foreground">{t('courseTitle')}</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-foreground">{t('description')}</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className="w-full px-4 py-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-foreground">{t('weeksCount')}</label>
              <input
                type="number"
                min={1}
                value={formData.durationWeeks}
                onChange={(e) => setFormData({ ...formData, durationWeeks: Number(e.target.value) || 6 })}
                className="w-full px-4 py-3 rounded-lg border border-border bg-background"
              />
            </div>
          </div>
          <div className="flex gap-4">
            <button type="submit" className="px-6 py-3 rounded-lg bg-primary text-primary-foreground">
              {isEditing ? t('save') : t('addCourse')}
            </button>
            <button type="button" onClick={() => navigate('/admin/courses')} className="px-6 py-3 rounded-lg border border-border">
              {t('cancel')}
            </button>
          </div>
        </form>
      )}

      {section === 'lessons' && isEditing && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-medium">{t('lessons')}</h2>
            <button type="button" onClick={addLesson} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-accent">
              <Plus className="w-4 h-4" />
              {t('add')}
            </button>
          </div>
          {loading ? (
            <p className="text-muted-foreground">…</p>
          ) : (
            lessons.map((lesson) => (
              <LessonEditorRow
                key={lesson.id}
                lesson={lesson}
                t={t}
                onChange={updateLesson}
                onSave={patchLesson}
                onDelete={deleteLesson}
                onUploadSlide={uploadSlide}
              />
            ))
          )}
          {!loading && lessons.length === 0 && <p className="text-muted-foreground text-sm">Сабақ қосыңыз</p>}
        </div>
      )}

      {section === 'materials' && isEditing && (
        <div className="space-y-4">
          <h2 className="text-lg font-medium">{t('materials')} (PDF, DOCX)</h2>
          <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl p-8 cursor-pointer hover:bg-accent/50">
            <Upload className="w-10 h-10 text-muted-foreground mb-2" />
            <span className="text-sm text-muted-foreground">Файл жүктеу</span>
            <input
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadMaterialFile(f);
                e.target.value = '';
              }}
            />
          </label>
          <div className="space-y-2">
            {materials.map((m) => (
              <div key={m.id} className="flex items-center justify-between p-4 rounded-lg border border-border">
                <div>
                  <p className="text-foreground font-medium">{m.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {m.size_label} · {m.type_label}
                  </p>
                  {m.file_path ? (
                    <a href={fileUrl(m.file_path)} target="_blank" rel="noreferrer" className="text-sm text-primary">
                      Ашу / жүктеу
                    </a>
                  ) : null}
                </div>
                <button type="button" onClick={() => deleteMaterial(m.id)} className="p-2 text-destructive">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {section === 'tests' && isEditing && (
        <div className="space-y-6">
          <h2 className="text-lg font-medium">{t('tests')}</h2>
          <div className="bg-card rounded-xl p-6 border border-border space-y-4">
            <p className="text-sm text-muted-foreground">
              Сыртқы тест (Google Forms т.б.) сілтемесін немесе төменде бір сұрақпен кірістірілген тестті қосыңыз.
            </p>
            <input
              className="w-full px-3 py-2 rounded-lg border border-border bg-background"
              placeholder={t('testTitleLabel')}
              value={newTest.title}
              onChange={(e) => setNewTest({ ...newTest, title: e.target.value })}
            />
            <input
              type="number"
              className="w-full px-3 py-2 rounded-lg border border-border bg-background"
              placeholder={t('timeSecLabel')}
              value={newTest.time_limit_seconds}
              onChange={(e) => setNewTest({ ...newTest, time_limit_seconds: Number(e.target.value) || 1800 })}
            />
            <input
              className="w-full px-3 py-2 rounded-lg border border-border bg-background"
              placeholder={t('externalTestLinkOptional')}
              value={newTest.external_url}
              onChange={(e) => setNewTest({ ...newTest, external_url: e.target.value })}
            />
            <p className="text-sm font-medium">Бірінші сұрақ (қосымша — сыртқы сілтеме жеткілікті)</p>
            <textarea
              className="w-full px-3 py-2 rounded-lg border border-border bg-background"
              placeholder={t('questionTextLabel')}
              value={newTest.q1}
              onChange={(e) => setNewTest({ ...newTest, q1: e.target.value })}
            />
            {newTest.o1.map((o, i) => (
              <input
                key={i}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                placeholder={`Жауап ${i + 1}`}
                value={o}
                onChange={(e) => {
                  const o1 = [...newTest.o1];
                  o1[i] = e.target.value;
                  setNewTest({ ...newTest, o1 });
                }}
              />
            ))}
            <div className="flex items-center gap-2">
              <span className="text-sm">Дұрыс жауап №</span>
              <select
                className="px-3 py-2 rounded-lg border border-border bg-background"
                value={newTest.correct}
                onChange={(e) => setNewTest({ ...newTest, correct: Number(e.target.value) })}
              >
                {[0, 1, 2, 3].map((i) => (
                  <option key={i} value={i}>
                    {i + 1}
                  </option>
                ))}
              </select>
            </div>
            <button type="button" onClick={addTest} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground">
              Тест қосу
            </button>
          </div>
          <div className="space-y-2">
            {tests.map((te) => (
              <div key={te.id} className="flex items-center justify-between p-4 rounded-lg border border-border">
                <div>
                  <p className="font-medium">{te.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {te.questions.length} сұрақ
                    {te.external_url ? ` · сыртқы: ${te.external_url}` : ''}
                  </p>
                </div>
                <button type="button" onClick={() => deleteTest(te.id)} className="p-2 text-destructive">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {section === 'assignments' && isEditing && (
        <div className="space-y-4">
          <h2 className="text-lg font-medium">{t('assignments')}</h2>
          <div className="bg-card rounded-xl p-6 border border-border space-y-3">
            <input
              className="w-full px-3 py-2 rounded-lg border border-border bg-background"
              placeholder={t('courseTitle')}
              value={newAssignment.title}
              onChange={(e) => setNewAssignment({ ...newAssignment, title: e.target.value })}
            />
            <input
              type="date"
              className="w-full px-3 py-2 rounded-lg border border-border bg-background"
              value={newAssignment.due_date}
              onChange={(e) => setNewAssignment({ ...newAssignment, due_date: e.target.value })}
            />
            <button type="button" onClick={addAssignment} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground">
              {t('add')}
            </button>
          </div>
          <div className="space-y-2">
            {assignments.map((a) => (
              <div key={a.id} className="flex items-center justify-between p-4 rounded-lg border border-border">
                <div>
                  <p className="font-medium">{a.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('dueDate')}: {a.due_date}
                  </p>
                </div>
                <button type="button" onClick={() => deleteAssignment(a.id)} className="p-2 text-destructive">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {section !== 'meta' && !isEditing && (
        <p className="text-amber-600 text-sm">{t('saveCourseFirstHint')}</p>
      )}
    </div>
  );
}
