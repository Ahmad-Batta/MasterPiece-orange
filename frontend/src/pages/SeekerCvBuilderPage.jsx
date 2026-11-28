import { useEffect, useRef, useState } from 'react';
import { Download, RefreshCw, Sparkles } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import Button from '../components/Button';
import { useConfirm } from '../components/ConfirmProvider';
import CvEditor from '../components/CvEditor';
import CvPreview from '../components/CvPreview';
import FileDropzone from '../components/FileDropzone';
import ModalShell from '../components/ModalShell';
import { useAuth } from '../context/AuthContext';
import { getApiData } from '../utils/apiResponse';
import { cvFromProfile, cvServerPayload } from '../utils/cvStudio';
import { printCv } from '../utils/printCv';
import { hasActivePro, isSupportedResume, openBilling, resumeAccept } from '../utils/seekerProfile';
import { getValidationErrors } from '../utils/validationErrors';

function loadDraft(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
}

function RewriteDialog({ suggestion, close, apply }) {
  const { t } = useTranslation();
  return <ModalShell className="fixed inset-0 z-[70] flex items-center justify-center bg-[#1C221E]/45 p-4" onClose={close}>
    <section role="dialog" aria-modal="true" aria-labelledby="cv-rewrite-modal-title" className="surface-card max-h-[85dvh] w-full max-w-2xl space-y-4 overflow-auto">
      <h2 id="cv-rewrite-modal-title" className="section-title">{t('cvStudio.rewriteTitle')}</h2>
      <p className="text-sm leading-relaxed text-[#1C221E]/75">
        {t(suggestion.source === 'fallback' ? 'cvStudio.rewriteFallback' : 'cvStudio.rewriteCheck')}
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {[[suggestion.original, 'rewriteOriginal'], [suggestion.rewritten_text, 'rewriteSuggestion']].map(([value, label]) => (
          <div className="min-w-0 rounded-lg border border-[#E5E2D9] bg-[#FAF9F5] p-4" key={label}>
            <h3 className="text-sm font-semibold text-[#2B362E]">{t(`cvStudio.${label}`)}</h3>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed" dir="auto">{value}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="secondary" onClick={close}>{t('common.cancel')}</Button>
        <Button onClick={apply}>{t('cvStudio.rewriteApply')}</Button>
      </div>
    </section>
  </ModalShell>;
}

export default function SeekerCvBuilderPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const confirm = useConfirm();
  const { profile, profileError, reloadProfile, setProfile, resumeDraft, setResumeDraft } = useOutletContext();
  const [params, setParams] = useSearchParams();
  const [mobileView, setMobileView] = useState('editor');
  const key = `careerhub.cv-studio.v1:${user?.id}`;
  const [initial] = useState(() => loadDraft(key));
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(null);
  const [message, setMessage] = useState(null);
  const [issues, setIssues] = useState({});
  const [fileError, setFileError] = useState(false);
  const [suggestion, setSuggestion] = useState(null);
  const paper = useRef(null);
  const uploading = params.get('mode') === 'upload';
  const count = new Intl.NumberFormat(i18n.language).format(profile?.free_ai_uses_remaining ?? 0);

  useEffect(() => {
    if (!profile || draft) return;
    const serverDraft = cvFromProfile(profile, t('cvStudio.sections.skills_grouped'));
    setDraft(initial?.draft && initial.path === profile.cv_path ? initial.draft : serverDraft);
  }, [draft, initial, profile, t]);

  function switchMode(mode) {
    setParams({ mode }, { replace: true });
    setMobileView('editor');
  }

  function replaceDraft(next) {
    try { localStorage.removeItem(key); } catch { /* Storage can be unavailable. */ }
    setDraft(cvFromProfile(next, t('cvStudio.sections.skills_grouped')));
    setProfile(next);
    setIssues({});
  }

  function update(field, next) {
    setDraft((current) => ({ ...current, [field]: typeof next === 'function' ? next(current[field]) : next }));
    setIssues({});
    setMessage(null);
  }

  async function sync() {
    if (busy || !await confirm(t('cvStudio.syncConfirm'))) return;
    setBusy('sync');
    setMessage(null);
    try {
      replaceDraft(getApiData(await api.get('/seeker/profile')));
      switchMode('editor');
      setMessage({ text: 'synced' });
    } catch {
      setMessage({ text: 'syncFailed', error: true });
    } finally { setBusy(null); }
  }

  async function upload(event) {
    event.preventDefault();
    if (busy || !resumeDraft || !await confirm(t('cvStudio.importConfirm'))) return;
    setBusy('upload');
    setMessage(null);
    try {
      const body = new FormData();
      body.append('resume', resumeDraft);
      replaceDraft(getApiData(await api.post('/seeker/cv/auto-fill', body)));
      setResumeDraft(null);
      switchMode('editor');
      setMessage({ text: 'imported' });
    } catch (error) {
      if (error.response?.status !== 402) setMessage({ text: 'importFailed', error: true });
    } finally { setBusy(null); }
  }

  async function save() {
    if (!draft || busy) return;
    setBusy('save');
    setIssues({});
    setMessage(null);
    const { body, rowIndices } = cvServerPayload(draft, t('cvStudio.present'));
    try {
      const { profile: saved } = getApiData(await api.post('/seeker/cv/generate', body));
      setProfile(saved);
      try {
        localStorage.setItem(key, JSON.stringify({ draft, path: saved.cv_path }));
        setMessage({ text: 'saved' });
      } catch {
        setMessage({ text: 'localFailed', error: true });
      }
    } catch (error) {
      const fields = getValidationErrors(error, {
        normalizeField: (key) => {
          const [section, index, field] = key.split('.');
          return field && rowIndices[section] ? `${section}.${rowIndices[section][Number(index)] ?? index}.${field}` : key;
        },
        messageForField: () => t('seeker.profile.checkValue'),
      });
      setIssues(fields ?? {});
      setMessage({ text: fields && Object.keys(fields).length ? 'saveInvalid' : 'saveFailed', error: true });
    } finally { setBusy(null); }
  }

  async function rewrite(section, row) {
    if (busy) return;
    const text = section === 'summary' ? draft.bio.trim() : row.bullets.map((line) => line.trim()).filter(Boolean).join('\n');
    if (!text) return;
    setBusy('rewrite');
    setMessage(null);
    try {
      const result = getApiData(await api.post('/seeker/cv/rewrite', {
        section, text, role: row?.title.trim() || draft.headline.trim().slice(0, 255) || null,
        category: profile?.category || null,
      }));
      setProfile((current) => current && ({ ...current, free_ai_uses_remaining: result.free_ai_uses_remaining }));
      setSuggestion({ ...result, section, rowId: row?.id, original: text });
    } catch (error) {
      if (error.response?.status === 422) setMessage({ text: 'rewriteInvalid', error: true });
      else if (error.response?.status !== 402) setMessage({ text: 'rewriteFailed', error: true });
    } finally { setBusy(null); }
  }

  function applyRewrite() {
    if (suggestion.section === 'summary') update('bio', suggestion.rewritten_text);
    else update('experience', (rows) => rows.map((row) => row.id === suggestion.rowId
      ? { ...row, bullets: suggestion.rewritten_text.split(/\r?\n/) }
      : row));
    setSuggestion(null);
    setMessage({ text: 'rewriteApplied' });
  }

  async function download() {
    if (!paper.current || busy) return;
    setBusy('print');
    try { await printCv(paper.current, t('cvStudio.printTitle')); }
    catch { setMessage({ text: 'printFailed', error: true }); }
    finally { setBusy(null); }
  }

  return <div className="min-w-0 space-y-6">
    <header className="surface-card space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="section-title">{t('seeker.navigation.cv')}</h1>
        {profile && <button type="button" onClick={openBilling}
          className="button-secondary rounded-full tabular-nums">
          <Sparkles className="h-4 w-4 text-[#A37E5E]" strokeWidth={1.75} aria-hidden="true" />
          {hasActivePro(profile) ? t('seeker.overview.unlimited') : t('seeker.overview.remaining', { remaining: count })}
        </button>}
      </div>
      <div className="grid gap-2 sm:flex sm:flex-wrap">
        <Button variant={uploading ? 'primary' : 'secondary'} aria-pressed={uploading} disabled={Boolean(busy)} onClick={() => switchMode('upload')}>{t('cvStudio.uploadMode')}</Button>
        <Button variant={uploading ? 'secondary' : 'primary'} aria-pressed={!uploading} disabled={Boolean(busy)} onClick={() => switchMode('editor')}>{t('cvStudio.editorMode')}</Button>
        <Button variant="secondary" disabled={Boolean(busy)} loading={busy === 'sync'} onClick={sync}>
          <RefreshCw className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />{t('cvStudio.sync')}
        </Button>
        <Button variant="secondary" disabled={Boolean(busy) || !draft} loading={busy === 'save'} onClick={save}>{t('cvStudio.save')}</Button>
        <Button disabled={Boolean(busy) || !draft} loading={busy === 'print'} onClick={download}>
          <Download className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />{t('cvStudio.download')}
        </Button>
      </div>
      <p className="max-w-prose text-xs leading-relaxed text-[#1C221E]/75">{t('cvStudio.storageNotice')}</p>
      {message && <p role={message.error ? 'alert' : 'status'} className={`text-sm ${message.error ? 'text-[#B91C1C]' : 'text-[#2B362E]'}`}>{t(`cvStudio.${message.text}`)}</p>}
      {busy === 'rewrite' && <p role="status" className="text-sm">{t('cvStudio.rewriteLoading')}</p>}
      {Object.keys(issues).length > 0 && <ul className="list-disc ps-5 text-xs text-[#B91C1C]">
        {Object.keys(issues).map((issue) => {
          const [section, index, field] = issue.split('.');
          return <li key={issue}>{field
            ? `${t(`cvStudio.sections.${section}`)} · ${Number(index) + 1} · ${t(`cvStudio.fields.${field}`)}`
            : t(`cvStudio.sections.${section}`, { defaultValue: t(`cvStudio.fields.${section}`, { defaultValue: t('cvStudio.save') }) })}</li>;
        })}
      </ul>}
    </header>
    {uploading && <form className="surface-card max-w-2xl space-y-4" onSubmit={upload}>
      <h2 className="section-title">{t('cvStudio.uploadMode')}</h2>
      <p className="text-sm leading-relaxed text-[#1C221E]/75">{t('cvStudio.importNotice')}</p>
      <FileDropzone accept={resumeAccept} label={t('uploads.chooseCv')} hint={t('uploads.cvHint')} file={resumeDraft}
        disabled={Boolean(busy)} error={fileError ? t('seeker.onboarding.invalid') : undefined} onSelect={(file) => {
          const valid = file && isSupportedResume(file);
          setResumeDraft(valid ? file : null);
          setFileError(Boolean(file && !valid));
        }} />
      <Button type="submit" disabled={Boolean(busy) || !resumeDraft} loading={busy === 'upload'}>{t('seeker.cv.uploadAndReview')}</Button>
    </form>}
    {draft ? <>
      {!uploading && <div className="flex flex-wrap gap-2 xl:hidden">
        {['editor', 'preview'].map((mode) => <Button key={mode} variant={mobileView === mode ? 'primary' : 'secondary'}
          aria-pressed={mobileView === mode} onClick={() => setMobileView(mode)}>{t(`cvStudio.${mode}`)}</Button>)}
      </div>}
      <div className={`grid min-w-0 gap-6 ${uploading ? 'hidden' : 'xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]'}`}>
        <div className={mobileView === 'editor' ? 'min-w-0' : 'hidden min-w-0 xl:block'}>
          <CvEditor draft={draft} update={update} busy={Boolean(busy)} issues={issues} onRewrite={rewrite} />
        </div>
        <div className={`${mobileView === 'preview' ? '' : 'hidden xl:block'} min-w-0`}>
          <p className="mb-2 text-sm font-medium text-[#2B362E]">{t('cvStudio.preview')} · A4</p>
          <div className="grid rounded-xl border border-[#E5E2D9] bg-white shadow-sm before:col-start-1 before:row-start-1 before:aspect-[210/297] before:w-full">
            <div className="col-start-1 row-start-1 min-w-0 overflow-hidden rounded-xl">
              <CvPreview draft={draft} paperRef={paper} />
            </div>
          </div>
        </div>
      </div>
    </> : !uploading && (profileError
      ? <div className="surface-card space-y-4"><p role="alert">{t('seeker.profile.loadError')}</p><Button onClick={() => reloadProfile()}>{t('seeker.retry')}</Button></div>
      : <div className="surface-card h-80 animate-pulse bg-[#E5E2D9]/60" aria-busy="true" aria-label={t('common.loading')} />)}
    <AnimatePresence>{suggestion && <RewriteDialog suggestion={suggestion} close={() => setSuggestion(null)} apply={applyRewrite} />}</AnimatePresence>
  </div>;
}
