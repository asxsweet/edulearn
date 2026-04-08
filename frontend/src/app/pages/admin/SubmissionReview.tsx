import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { FileText, ExternalLink, Download } from 'lucide-react';
import { api, fileUrl } from '../../../api/client';

interface SubmissionRow {
  id: number;
  student: string;
  course: string;
  assignment: string;
  submittedDate: string;
  fileUrl: string;
  linkUrl: string;
  status: string;
  score?: number;
}

export default function SubmissionReview() {
  const { t } = useApp();
  const [selectedSubmission, setSelectedSubmission] = useState<number | null>(null);
  const [gradeData, setGradeData] = useState<Record<number, { score: string; feedback: string }>>({});
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);

  const load = async () => {
    const list = await api<SubmissionRow[]>('/api/admin/submissions');
    setSubmissions(list);
  };

  useEffect(() => {
    load().catch(() => {});
  }, []);

  const handleSubmitGrade = async (submissionId: number) => {
    const data = gradeData[submissionId];
    if (!data || !data.score) {
      window.alert(t('grade'));
      return;
    }
    await api('/api/admin/submissions/' + submissionId + '/grade', {
      method: 'POST',
      body: JSON.stringify({ score: data.score, feedback: data.feedback || '' }),
    });
    await load();
  };

  const handleGradeChange = (submissionId: number, field: 'score' | 'feedback', value: string) => {
    setGradeData({
      ...gradeData,
      [submissionId]: {
        ...gradeData[submissionId],
        [field]: value,
      },
    });
  };

  const selected = submissions.find((s) => s.id === selectedSubmission);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="mb-2">{t('submissions')}</h1>
        <p className="text-muted-foreground">{t('statistics')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          {submissions.map((submission) => (
            <div
              key={submission.id}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setSelectedSubmission(submission.id)}
              className={`bg-card rounded-xl p-6 border transition-all cursor-pointer ${
                selectedSubmission === submission.id ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:bg-accent'
              }`}
              onClick={() => setSelectedSubmission(submission.id)}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-foreground mb-1">{submission.student}</h3>
                  <p className="text-sm text-muted-foreground">{submission.course}</p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-sm ${
                    submission.status === 'graded' ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'
                  }`}
                >
                  {submission.status}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{submission.assignment}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {t('dueDate')}: {submission.submittedDate}
                </div>
                {submission.status === 'graded' && submission.score != null && (
                  <div className="pt-2 border-t border-border">
                    <span className="text-sm text-green-500">
                      {t('grade')}: {submission.score}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {selectedSubmission && selected && (
          <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
            <div className="p-6 border-b border-border">
              <h2 className="text-foreground">{t('grade')}</h2>
            </div>

            <div className="p-6 space-y-6">
              <div className="space-y-3">
                <h3 className="text-foreground">{t('submissions')}</h3>
                <a
                  href={selected.fileUrl?.startsWith('/uploads') ? fileUrl(selected.fileUrl) : selected.fileUrl || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 rounded-lg border border-border hover:bg-accent transition-colors"
                >
                  <Download className="w-5 h-5 text-primary" />
                  <span className="text-foreground">{t('downloadFile')}</span>
                </a>
                {selected.linkUrl ? (
                  <a
                    href={selected.linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-4 rounded-lg border border-border hover:bg-accent transition-colors"
                  >
                    <ExternalLink className="w-5 h-5 text-primary" />
                    <span className="text-foreground">{t('openLink')}</span>
                  </a>
                ) : null}
              </div>

              {selected.status === 'pending' && (
                <div className="space-y-4 pt-6 border-t border-border">
                  <div className="space-y-2">
                    <label className="text-foreground">{t('grade')} (0–100)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={gradeData[selectedSubmission]?.score || ''}
                      onChange={(e) => handleGradeChange(selectedSubmission, 'score', e.target.value)}
                      className="w-full px-4 py-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-foreground">{t('feedback')}</label>
                    <textarea
                      value={gradeData[selectedSubmission]?.feedback || ''}
                      onChange={(e) => handleGradeChange(selectedSubmission, 'feedback', e.target.value)}
                      rows={6}
                      className="w-full px-4 py-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSubmitGrade(selectedSubmission)}
                    className="w-full px-4 py-3 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                  >
                    {t('submit')}
                  </button>
                </div>
              )}

              {selected.status === 'graded' && (
                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                  <p className="text-green-500">{t('submitted')}</p>
                  {selected.score != null && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {t('grade')}: {selected.score}%
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
