import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import { useApp } from '../context/AppContext';
import {
  PlayCircle,
  FileText,
  Download,
  ExternalLink,
  Upload,
  Link as LinkIcon,
  CheckCircle,
  Circle,
  ChevronRight,
} from 'lucide-react';
import { api, apiForm, fileUrl } from '../../api/client';

function youtubeEmbedUrl(url: string): string | null {
  if (!url?.trim()) return null;
  const m = url.trim().match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s?#]+)/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

function officeViewerUrl(absoluteFileUrl: string): string {
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(absoluteFileUrl)}`;
}

interface CourseDetailPayload {
  course: {
    id: number;
    title: string;
    description: string;
    image: string;
    lessonCount: number;
    durationWeeks: number;
    enrolled: boolean;
    progress?: number;
  };
  lessons: Array<{
    id: number;
    title: string;
    duration: string;
    completed: boolean;
    keyPoints: string[];
    videoUrl?: string;
    slideUrl?: string;
    slideFileName?: string;
  }>;
  materials: Array<{ id: number; name: string; size: string; type: string; downloadUrl?: string }>;
  externalLinks: Array<{ name: string; url: string }>;
  tests: Array<{
    id: number;
    title: string;
    questions: number;
    completed: boolean;
    score?: number;
    externalUrl?: string;
  }>;
  assignments: Array<{
    id: number;
    title: string;
    dueDate: string;
    submitted: boolean;
    submissionFileUrl?: string;
    submissionLinkUrl?: string;
  }>;
}

export default function CourseDetail() {
  const { id } = useParams();
  const { t } = useApp();
  const [activeTab, setActiveTab] = useState('lessons');
  const [selectedLesson, setSelectedLesson] = useState<number | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [linkInput, setLinkInput] = useState('');
  const [payload, setPayload] = useState<CourseDetailPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!id) return;
      try {
        const d = await api<CourseDetailPayload>('/api/courses/' + id);
        if (!cancelled) {
          setPayload(d);
          if (d.lessons.length) setSelectedLesson(d.lessons[0].id);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedFile(e.target.files[0]);
    }
  };

  const handleSubmitAssignment = async (assignmentId: number) => {
    try {
      if (!uploadedFile && !linkInput.trim()) {
        window.alert(t('uploadFile') + ' / ' + t('addLink'));
        return;
      }
      const fd = new FormData();
      if (uploadedFile) fd.append('file', uploadedFile);
      fd.append('linkUrl', linkInput.trim());
      await apiForm('/api/assignments/' + assignmentId + '/submit', fd);
      if (id) {
        const d = await api<CourseDetailPayload>('/api/courses/' + id);
        setPayload(d);
      }
      setUploadedFile(null);
      setLinkInput('');
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Error');
    }
  };

  const toggleLessonProgress = async (lessonId: number, completed: boolean) => {
    if (!id) return;
    try {
      await api('/api/lessons/' + lessonId + '/progress', {
        method: 'PATCH',
        body: JSON.stringify({ completed }),
      });
      const d = await api<CourseDetailPayload>('/api/courses/' + id);
      setPayload(d);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Error');
    }
  };

  if (loading || !payload) {
    return <div className="text-muted-foreground">{t('courses')}</div>;
  }

  const { course, lessons, materials, externalLinks, tests, assignments } = payload;
  const currentLesson = lessons.find((l) => l.id === selectedLesson);

  if (!course.enrolled) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-muted-foreground">{t('coursesSubtitle')}</p>
        <button
          type="button"
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground"
          onClick={async () => {
            await api('/api/courses/' + course.id + '/enroll', { method: 'POST', body: '{}' });
            const d = await api<CourseDetailPayload>('/api/courses/' + id);
            setPayload(d);
          }}
        >
          {t('enrollNow')}
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] -mx-4 sm:-mx-6 lg:-mx-8">
      <aside className="w-80 border-r border-border bg-card overflow-y-auto flex-shrink-0">
        <div className="p-6 border-b border-border">
          <div className="text-4xl mb-4">{course.image}</div>
          <h2 className="text-foreground mb-2">{course.title}</h2>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>
              {course.lessonCount} {t('lessonsWord')}
            </span>
            <span>•</span>
            <span>
              {course.durationWeeks} {t('weeksSuffix')}
            </span>
          </div>
        </div>

        <div className="p-4">
          <div className="flex flex-col gap-1 mb-4">
            <button
              type="button"
              onClick={() => setActiveTab('lessons')}
              className={`px-4 py-3 rounded-lg text-left transition-colors ${
                activeTab === 'lessons' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
              }`}
            >
              {t('lessons')}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('materials')}
              className={`px-4 py-3 rounded-lg text-left transition-colors ${
                activeTab === 'materials' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
              }`}
            >
              {t('materials')}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('tests')}
              className={`px-4 py-3 rounded-lg text-left transition-colors ${
                activeTab === 'tests' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
              }`}
            >
              {t('tests')}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('assignments')}
              className={`px-4 py-3 rounded-lg text-left transition-colors ${
                activeTab === 'assignments' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
              }`}
            >
              {t('assignments')}
            </button>
          </div>

          {activeTab === 'lessons' && (
            <div className="space-y-2">
              {lessons.map((lesson) => (
                <button
                  key={lesson.id}
                  type="button"
                  onClick={() => setSelectedLesson(lesson.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                    selectedLesson === lesson.id ? 'bg-accent border border-primary' : 'hover:bg-accent'
                  }`}
                >
                  {lesson.completed ? (
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  ) : (
                    <Circle className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{lesson.title}</p>
                    <p className="text-xs text-muted-foreground">{lesson.duration}</p>
                  </div>
                  {selectedLesson === lesson.id && <ChevronRight className="w-4 h-4 flex-shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-background">
        <div className="p-6 md:p-8 space-y-8">
          {activeTab === 'lessons' && currentLesson && (
            <>
              <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
                {youtubeEmbedUrl(currentLesson.videoUrl || '') ? (
                  <div className="aspect-video bg-black">
                    <iframe
                      title="lesson-video"
                      src={youtubeEmbedUrl(currentLesson.videoUrl || '') || ''}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <div className="aspect-video bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] flex items-center justify-center">
                    <PlayCircle className="w-20 h-20 text-white opacity-80" />
                  </div>
                )}
                <div className="p-6 space-y-3">
                  <h2 className="text-foreground mb-2">{currentLesson.title}</h2>
                  <p className="text-muted-foreground">{currentLesson.duration}</p>
                  <button
                    type="button"
                    onClick={() => toggleLessonProgress(currentLesson.id, !currentLesson.completed)}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm ${
                      currentLesson.completed
                        ? 'bg-green-500/10 text-green-600 border border-green-500/30'
                        : 'bg-primary text-primary-foreground'
                    }`}
                  >
                    {currentLesson.completed ? t('lessonDone') : t('markLessonDone')}
                  </button>
                  {currentLesson.slideUrl ? (
                    <a
                      href={fileUrl(currentLesson.slideUrl)}
                      download={currentLesson.slideFileName || true}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm"
                    >
                      <Download className="w-4 h-4" />
                      {t('downloadFile')} ({currentLesson.slideFileName || 'pptx'})
                    </a>
                  ) : null}
                </div>
              </div>

              <div className="bg-card rounded-xl p-6 border border-border shadow-sm space-y-4">
                <h3 className="text-foreground">{t('description')}</h3>
                <p className="text-muted-foreground leading-relaxed">{course.description}</p>

                <div className="pt-4 border-t border-border">
                  <h4 className="text-foreground mb-3">{t('keyLearningPoints')}</h4>
                  <ul className="space-y-2">
                    {currentLesson.keyPoints.map((point, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-muted-foreground">{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </>
          )}

          {activeTab === 'materials' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-foreground mb-2">{t('downloadMaterials')}</h2>
                <p className="text-muted-foreground">{t('materialsSubtitle')}</p>
              </div>

              <div className="bg-card rounded-xl border border-border divide-y divide-border">
                {materials.map((material) => {
                  const href = material.downloadUrl ? fileUrl(material.downloadUrl) : '';
                  const abs = href ? fileUrl(material.downloadUrl || '') : '';
                  const lower = material.name.toLowerCase();
                  const isPdf = lower.endsWith('.pdf') || material.type?.toUpperCase() === 'PDF';
                  const isOffice = /\.(docx?|pptx?)$/i.test(material.name) || /DOC|DOCX|PPT|PPTX/.test(material.type || '');
                  return (
                    <div key={material.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-accent transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                          <FileText className="w-6 h-6 text-blue-500" />
                        </div>
                        <div>
                          <p className="text-foreground">{material.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {material.size} · {material.type}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {href && isPdf ? (
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm"
                          >
                            <ExternalLink className="w-4 h-4" />
                            {t('openLink')}
                          </a>
                        ) : null}
                        {href && isOffice && !isPdf ? (
                          <a
                            href={officeViewerUrl(abs)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm"
                          >
                            <ExternalLink className="w-4 h-4" />
                            {t('openLink')}
                          </a>
                        ) : null}
                        {href ? (
                          <a
                            href={href}
                            download
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm"
                          >
                            <Download className="w-4 h-4" />
                            {t('downloadFile')}
                          </a>
                        ) : (
                          <span className="text-sm text-muted-foreground">{t('notFound')}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="bg-card rounded-xl p-6 border border-border space-y-4">
                <h3 className="text-foreground">{t('externalLinks')}</h3>
                <div className="space-y-3">
                  {externalLinks.map((link, index) => (
                    <a
                      key={index}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent transition-colors group"
                    >
                      <span className="text-foreground">{link.name}</span>
                      <ExternalLink className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tests' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-foreground mb-2">{t('tests')}</h2>
                <p className="text-muted-foreground">{t('testsSubtitle')}</p>
              </div>

              <div className="space-y-4">
                {tests.map((test) => (
                  <div key={test.id} className="bg-card rounded-xl p-6 border border-border space-y-3">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-foreground mb-1">{test.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {test.questions === 0 && test.externalUrl
                            ? t('externalTestLabel')
                            : `${test.questions} ${t('question').toLowerCase()}`}
                        </p>
                      </div>
                      {test.completed && test.questions > 0 && (
                        <div className="px-3 py-1 rounded-full bg-green-500/10 text-green-500 text-sm">
                          {t('grade')}: {test.score}%
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      {test.externalUrl ? (
                        <a
                          href={test.externalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-border hover:bg-accent"
                        >
                          <ExternalLink className="w-5 h-5" />
                          {t('externalTestLabel')}
                        </a>
                      ) : null}
                      {test.questions > 0 ? (
                        <Link
                          to={`/test/${test.id}`}
                          className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-colors ${
                            test.completed ? 'border border-border hover:bg-accent' : 'bg-primary text-primary-foreground hover:opacity-90'
                          }`}
                        >
                          {test.completed ? t('retakeTest') : t('startTest')}
                        </Link>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'assignments' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-foreground mb-2">{t('assignments')}</h2>
                <p className="text-muted-foreground">{t('assignmentsSubtitle')}</p>
              </div>

              <div className="space-y-4">
                {assignments.map((assignment) => (
                  <div key={assignment.id} className="bg-card rounded-xl p-6 border border-border space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-foreground mb-1">{assignment.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {t('dueDate')}: {assignment.dueDate}
                        </p>
                      </div>
                      {assignment.submitted && (
                        <div className="px-3 py-1 rounded-full bg-green-500/10 text-green-500 text-sm">
                          {t('submitted')}
                        </div>
                      )}
                    </div>

                    {assignment.submitted && (assignment.submissionFileUrl || assignment.submissionLinkUrl) && (
                      <div className="flex flex-wrap gap-2 text-sm">
                        {assignment.submissionFileUrl ? (
                          <a
                            href={fileUrl(assignment.submissionFileUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary underline"
                          >
                            {t('downloadFile')}
                          </a>
                        ) : null}
                        {assignment.submissionLinkUrl ? (
                          <a href={assignment.submissionLinkUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                            {t('openLink')}
                          </a>
                        ) : null}
                      </div>
                    )}

                    {!assignment.submitted && (
                      <div className="space-y-4 pt-4 border-t border-border">
                        <div className="space-y-2">
                          <label className="text-foreground">{t('uploadFile')}</label>
                          <div className="flex gap-2">
                            <input
                              type="file"
                              onChange={handleFileUpload}
                              className="flex-1 px-4 py-3 rounded-lg border border-border bg-background"
                            />
                            <span className="p-3 rounded-lg border border-border">
                              <Upload className="w-5 h-5" />
                            </span>
                          </div>
                          {uploadedFile && (
                            <p className="text-sm text-muted-foreground">
                              {uploadedFile.name}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <label className="text-foreground">{t('addLink')}</label>
                          <div className="flex gap-2">
                            <input
                              type="url"
                              placeholder="https://"
                              value={linkInput}
                              onChange={(e) => setLinkInput(e.target.value)}
                              className="flex-1 px-4 py-3 rounded-lg border border-border bg-background"
                            />
                            <span className="p-3 rounded-lg border border-border">
                              <LinkIcon className="w-5 h-5" />
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSubmitAssignment(assignment.id)}
                          className="w-full px-4 py-3 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                        >
                          {t('submit')}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
