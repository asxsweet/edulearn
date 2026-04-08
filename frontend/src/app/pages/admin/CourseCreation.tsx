import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useApp } from '../../context/AppContext';
import { Plus, Trash2, Upload, Save, BookOpen, FileText, ClipboardList, ListChecks, ChevronUp, ChevronDown, ImageIcon } from 'lucide-react';
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

const MAX_TEST_QUESTIONS = 50;

function emptyTestQuestion(): EditorQuestion {
  return { question_text: '', options: ['', '', '', ''], correct_index: 0 };
}

function padOptionSlots(opts: string[]): string[] {
  const o = [...opts];
  while (o.length < 4) o.push('');
  return o.slice(0, 4);
}

/** correct_index in UI = slot 0–3; output correct_index = index in filtered non-empty options */
function buildQuestionsForApi(rows: EditorQuestion[]): { question_text: string; options: string[]; correct_index: number }[] {
  const out: { question_text: string; options: string[]; correct_index: number }[] = [];
  for (const row of rows) {
    const slots = row.options.map((s) => String(s).trim());
    const opts = slots.filter(Boolean);
    if (!row.question_text.trim() || opts.length < 2) continue;
    let slot = Math.max(0, Math.min(row.correct_index, slots.length - 1));
    if (!slots[slot]) {
      const f = slots.findIndex((s) => s.length > 0);
      if (f < 0) continue;
      slot = f;
    }
    const correctInFiltered = slots.slice(0, slot + 1).filter(Boolean).length - 1;
    out.push({
      question_text: row.question_text.trim(),
      options: opts,
      correct_index: Math.max(0, Math.min(correctInFiltered, opts.length - 1)),
    });
  }
  return out;
}

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
  const [coverImagePath, setCoverImagePath] = useState('');

  const [testForm, setTestForm] = useState({
    title: '',
    time_limit_seconds: 1800,
    external_url: '',
    questions: [emptyTestQuestion()] as EditorQuestion[],
  });
  const [testEditId, setTestEditId] = useState<number | null>(null);

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
          coverImagePath?: string;
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
      setCoverImagePath(raw.course.coverImagePath || '');
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
          coverImagePath?: string;
        }>('/api/admin/courses/' + id + '/raw');
        if (c) return;
        setFormData({
          title: raw.title,
          description: raw.description,
          durationWeeks: raw.durationWeeks,
        });
        setCoverImagePath(raw.coverImagePath || '');
      } catch {
        /* */
      }
    })();
    return () => {
      c = true;
    };
  }, [id]);

  const uploadCover = async (file: File) => {
    if (!isEditing) return;
    try {
      const fd = new FormData();
      fd.append('file', file);
      await apiForm<{ url: string }>('/api/admin/courses/' + courseId + '/cover', fd);
      await load();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Error');
    }
  };

  const removeCover = async () => {
    if (!isEditing) return;
    try {
      await api('/api/admin/courses/' + courseId + '/cover', { method: 'DELETE' });
      setCoverImagePath('');
      await load();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Error');
    }
  };

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

  const resetTestForm = () => {
    setTestForm({ title: '', time_limit_seconds: 1800, external_url: '', questions: [emptyTestQuestion()] });
    setTestEditId(null);
  };

  const beginEditTest = (te: EditorTest) => {
    setTestEditId(te.id);
    setTestForm({
      title: te.title,
      time_limit_seconds: te.time_limit_seconds,
      external_url: te.external_url || '',
      questions:
        te.questions.length > 0
          ? te.questions.map((q) => ({
              question_text: q.question_text,
              options: padOptionSlots(q.options),
              correct_index: Math.max(0, Math.min(q.correct_index, 3)),
            }))
          : [emptyTestQuestion()],
    });
  };

  const appendEmptyQuestionsUpTo = (target: number) => {
    setTestForm((f) => {
      if (f.questions.length >= target) return f;
      const need = Math.min(target - f.questions.length, MAX_TEST_QUESTIONS - f.questions.length);
      const extra = Array.from({ length: need }, () => emptyTestQuestion());
      return { ...f, questions: [...f.questions, ...extra] };
    });
  };

  const moveQuestion = (index: number, dir: -1 | 1) => {
    setTestForm((f) => {
      const j = index + dir;
      if (j < 0 || j >= f.questions.length) return f;
      const questions = [...f.questions];
      [questions[index], questions[j]] = [questions[j], questions[index]];
      return { ...f, questions };
    });
  };

  const saveTest = async () => {
    if (!isEditing) return;
    const title = testForm.title.trim();
    if (!title) {
      window.alert(t('testTitleLabel'));
      return;
    }
    const built = buildQuestionsForApi(testForm.questions);
    const ext = testForm.external_url.trim();
    if (built.length === 0 && !ext) {
      window.alert(t('testValidationNeedQuestion'));
      return;
    }
    if (built.length > MAX_TEST_QUESTIONS) {
      window.alert(t('testTooManyQuestions'));
      return;
    }
    const body = {
      title,
      time_limit_seconds: testForm.time_limit_seconds,
      external_url: ext || null,
      questions: built,
    };
    try {
      if (testEditId != null) {
        await api('/api/admin/tests/' + testEditId, { method: 'PUT', body: JSON.stringify(body) });
      } else {
        await api('/api/admin/courses/' + courseId + '/tests', { method: 'POST', body: JSON.stringify(body) });
      }
      resetTestForm();
      await load();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : t('unknownError'));
    }
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

            {isEditing ? (
              <div className="space-y-3 pt-2 border-t border-border">
                <div className="flex items-center gap-2 text-foreground">
                  <ImageIcon className="w-5 h-5 text-primary" />
                  <span className="font-medium">{t('courseCover')}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{t('courseCoverHint')}</p>
                <div className="flex flex-wrap items-end gap-4">
                  {coverImagePath ? (
                    <div className="h-28 w-44 rounded-xl border border-border overflow-hidden bg-muted shrink-0 shadow-inner">
                      <img src={fileUrl(coverImagePath)} alt="" className="h-full w-full object-cover" />
                    </div>
                  ) : (
                    <div className="h-28 w-44 rounded-xl border border-dashed border-border bg-muted/50 flex items-center justify-center text-muted-foreground text-sm">
                      —
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border cursor-pointer hover:bg-accent text-sm">
                      <Upload className="w-4 h-4" />
                      {t('uploadCover')}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml,image/avif,image/bmp,image/x-icon,.jpg,.jpeg,.png,.webp,.gif,.svg,.avif,.bmp,.ico"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) void uploadCover(f);
                          e.target.value = '';
                        }}
                      />
                    </label>
                    {coverImagePath ? (
                      <button type="button" onClick={() => void removeCover()} className="text-sm text-destructive hover:underline">
                        {t('removeCover')}
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground border-t border-border pt-4">{t('courseCoverSaveFirst')}</p>
            )}
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
            <p className="text-sm text-muted-foreground">{t('testBuilderIntro')}</p>
            <p className="text-xs text-muted-foreground">{t('testMinQuestionsHint')}</p>
            {testEditId != null ? (
              <p className="text-sm font-medium text-primary">{t('editingTestBanner').replace('{{id}}', String(testEditId))}</p>
            ) : null}
            <input
              className="w-full px-3 py-2 rounded-lg border border-border bg-background"
              placeholder={t('testTitleLabel')}
              value={testForm.title}
              onChange={(e) => setTestForm({ ...testForm, title: e.target.value })}
            />
            <div className="space-y-1">
              <label className="text-sm text-foreground">{t('timeSecLabel')}</label>
              <input
                type="number"
                min={60}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                value={testForm.time_limit_seconds}
                onChange={(e) => setTestForm({ ...testForm, time_limit_seconds: Number(e.target.value) || 1800 })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-foreground">{t('externalTestLinkOptional')}</label>
              <input
                className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                value={testForm.external_url}
                onChange={(e) => setTestForm({ ...testForm, external_url: e.target.value })}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
              <span className="text-sm font-medium">{t('testQuestionsSection')}</span>
              <span className="text-xs text-muted-foreground">
                ({testForm.questions.length} / {MAX_TEST_QUESTIONS})
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  setTestForm((f) =>
                    f.questions.length >= MAX_TEST_QUESTIONS
                      ? f
                      : { ...f, questions: [...f.questions, emptyTestQuestion()] }
                  )
                }
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-sm hover:bg-accent"
              >
                <Plus className="w-4 h-4" />
                {t('addQuestionToTest')}
              </button>
              <button
                type="button"
                onClick={() => appendEmptyQuestionsUpTo(10)}
                className="px-3 py-1.5 rounded-lg border border-border text-sm hover:bg-accent"
              >
                {t('add10EmptyQuestions')}
              </button>
              <button
                type="button"
                onClick={() => appendEmptyQuestionsUpTo(15)}
                className="px-3 py-1.5 rounded-lg border border-border text-sm hover:bg-accent"
              >
                {t('add15EmptyQuestions')}
              </button>
            </div>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              {testForm.questions.map((q, qi) => (
                <div key={qi} className="p-4 rounded-lg border border-border bg-muted/30 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium">
                      {t('question')} {qi + 1}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        title={t('moveQuestionUp')}
                        disabled={qi === 0}
                        onClick={() => moveQuestion(qi, -1)}
                        className="p-1.5 rounded hover:bg-accent disabled:opacity-40"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        title={t('moveQuestionDown')}
                        disabled={qi === testForm.questions.length - 1}
                        onClick={() => moveQuestion(qi, 1)}
                        className="p-1.5 rounded hover:bg-accent disabled:opacity-40"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        disabled={testForm.questions.length <= 1}
                        onClick={() =>
                          setTestForm((f) => ({
                            ...f,
                            questions: f.questions.filter((_, i) => i !== qi),
                          }))
                        }
                        className="p-1.5 rounded hover:bg-destructive/10 text-destructive disabled:opacity-40 text-sm"
                      >
                        {t('removeQuestionFromTest')}
                      </button>
                    </div>
                  </div>
                  <textarea
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                    rows={2}
                    placeholder={t('questionTextLabel')}
                    value={q.question_text}
                    onChange={(e) => {
                      const questions = [...testForm.questions];
                      questions[qi] = { ...questions[qi], question_text: e.target.value };
                      setTestForm({ ...testForm, questions });
                    }}
                  />
                  {q.options.map((o, oi) => (
                    <input
                      key={oi}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                      placeholder={t('answerOptionN').replace('{{n}}', String(oi + 1))}
                      value={o}
                      onChange={(e) => {
                        const questions = [...testForm.questions];
                        const options = [...questions[qi].options];
                        options[oi] = e.target.value;
                        questions[qi] = { ...questions[qi], options };
                        setTestForm({ ...testForm, questions });
                      }}
                    />
                  ))}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm">{t('correctAnswerSlot')}</span>
                    <select
                      className="px-3 py-2 rounded-lg border border-border bg-background text-sm"
                      value={q.correct_index}
                      onChange={(e) => {
                        const questions = [...testForm.questions];
                        questions[qi] = { ...questions[qi], correct_index: Number(e.target.value) };
                        setTestForm({ ...testForm, questions });
                      }}
                    >
                      {[0, 1, 2, 3].map((i) => (
                        <option key={i} value={i}>
                          {i + 1}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <button type="button" onClick={saveTest} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground">
                {testEditId != null ? t('saveTestChanges') : t('addTestButton')}
              </button>
              {testEditId != null ? (
                <button type="button" onClick={resetTestForm} className="px-4 py-2 rounded-lg border border-border">
                  {t('cancelEditTest')}
                </button>
              ) : null}
            </div>
          </div>
          <div className="space-y-2">
            {tests.map((te) => (
              <div key={te.id} className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-lg border border-border">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{te.title}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {t('testQuestionCount').replace('{{count}}', String(te.questions.length))}
                    {te.external_url ? ` · ${te.external_url}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => beginEditTest(te)}
                    className="px-3 py-1.5 rounded-lg border border-border text-sm hover:bg-accent"
                  >
                    {t('editTestBtn')}
                  </button>
                  <button type="button" onClick={() => deleteTest(te.id)} className="p-2 text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
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
