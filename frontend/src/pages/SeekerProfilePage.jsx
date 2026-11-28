import { useEffect, useState } from 'react';
import { Check, Plus, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useOutletContext } from 'react-router-dom';
import api from '../api/axios';
import Button from '../components/Button';
import FormField from '../components/FormField';
import FileDropzone from '../components/FileDropzone';
import ProfileAvatar from '../components/ProfileAvatar';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getApiData, getApiItems } from '../utils/apiResponse';
import { getValidationErrors } from '../utils/validationErrors';

function PhotoCard({ profile, onUpload, disabled }) {
  const { t } = useTranslation();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const { notify } = useToast();

  useEffect(() => {
    if (!file) {
      setPreview('');
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function selectPhoto(selected) {
    setUploaded(false);
    setError('');
    if (!selected) {
      setFile(null);
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(selected.type)
      || selected.size === 0 || selected.size > 2 * 1024 * 1024) {
      setFile(null);
      setError(t('seeker.profile.photoInvalid'));
      return;
    }
    setFile(selected);
  }

  async function upload(event) {
    event.preventDefault();
    if (!file || uploading || disabled) return;
    setUploading(true);
    setError('');
    try {
      const body = new FormData();
      body.append('image', file);
      const response = await api.post('/seeker/image', body);
      onUpload(getApiData(response));
      setFile(null);
      setUploaded(true);
      notify(t('seeker.profile.photoSaved'));
    } catch (error) {
      const fields = getValidationErrors(error, { messageForField: () => t('seeker.profile.photoInvalid') });
      setError(fields?.image || t('seeker.profile.photoError'));
    } finally {
      setUploading(false);
    }
  }

  return (
    <form className="surface-card min-w-0 self-start" onSubmit={upload}>
      <h2 className="text-base font-semibold text-[#2B362E]">{t('seeker.profile.photo')}</h2>
      <div className="mt-4 flex items-center gap-4">
        <ProfileAvatar src={preview || profile.image_url} name={profile.name} className="h-20 w-20 text-xl" />
      </div>
      <div className="mt-4">
        <FileDropzone label={t('seeker.profile.changePhoto')} hint={t('uploads.photoHint')}
          accept="image/jpeg,image/png,image/webp" file={file} onSelect={selectPhoto} error={error} disabled={uploading || disabled} />
      </div>
      <p className="mt-2 text-xs leading-relaxed text-[#1C221E]/75">{t('seeker.profile.photoPublic')}</p>
      {uploaded && <p className="mt-4 text-sm" role="status">{t('seeker.profile.photoSaved')}</p>}
      {file && <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button type="submit" loading={uploading} disabled={disabled}>{t('seeker.profile.uploadPhoto')}</Button>
      </div>}
    </form>
  );
}

export default function SeekerProfilePage() {
  const { t } = useTranslation();
  const { notify } = useToast();
  const { updateProfileImage } = useAuth();
  const { profile, profileLoading, profileError, reloadProfile, setProfile } = useOutletContext();
  const [categories, setCategories] = useState([]);
  const [categorySource, setCategorySource] = useState('loading');
  const [categoryAttempt, setCategoryAttempt] = useState(0);
  const [changes, setChanges] = useState({});
  const [skill, setSkill] = useState('');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [formError, setFormError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    async function loadCategories() {
      try {
        const response = await api.get('/categories', { signal });
        if (!signal.aborted) {
          setCategories(getApiItems(getApiData(response)));
          setCategorySource('catalog');
        }
      } catch {
        if (!signal.aborted) setCategorySource('unavailable');
      }
    }
    loadCategories();
    return () => controller.abort();
  }, [categoryAttempt]);

  const update = (field, value) => {
    setChanges((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setSaved(false);
  };

  if (!profile) {
    return profileError
      ? <div className="surface-card space-y-4"><p role="alert">{t('seeker.profile.loadError')}</p><Button onClick={() => reloadProfile()}>{t('seeker.retry')}</Button></div>
      : <div className="grid gap-6 lg:grid-cols-3" aria-busy={profileLoading} aria-label={t('common.loading')}>
        <div className="surface-card h-56 animate-pulse bg-[#E5E2D9]/60" />
        <div className="surface-card h-96 animate-pulse bg-[#E5E2D9]/60 lg:col-span-2" />
      </div>;
  }

  const savedValue = (field) => profile[field] ?? (field === 'city' ? profile.location : null) ?? '';
  const value = (field) => changes[field] ?? savedValue(field);
  const skills = (changes.skills ?? profile.skills ?? []).filter((item) => typeof item === 'string');
  const options = [...categories];
  if (profile.category_id && !options.some(({ id }) => String(id) === String(profile.category_id))) {
    options.unshift({ id: profile.category_id, name: profile.category || t('seeker.profile.currentCategory') });
  }

  function addSkill() {
    const next = skill.trim();
    if (!next) return;
    if (!skills.some((item) => item.toLowerCase() === next.toLowerCase())) update('skills', [...skills, next]);
    setSkill('');
  }

  async function save(event) {
    event.preventDefault();
    if (saving) return;
    const payload = {};
    const problems = {};
    for (const [field, raw] of Object.entries(changes)) {
      const clean = typeof raw === 'string' ? raw.trim() : raw;
      if (clean === String(savedValue(field))) continue;
      if (['first_name', 'last_name'].includes(field) && !clean) {
        problems[field] = t('validation.required');
        continue;
      }
      payload[field] = field === 'category_id' && clean ? Number(clean) : clean || null;
    }
    if (skill.trim() && !skills.some((item) => item.toLowerCase() === skill.trim().toLowerCase())) {
      payload.skills = [...skills, skill.trim()];
    }
    setErrors(problems);
    setFormError(false);
    if (Object.keys(problems).length || !Object.keys(payload).length) return;

    setSaving(true);
    try {
      const response = await api.put('/seeker/profile', payload);
      const updated = getApiData(response);
      setProfile((current) => ({ ...updated, image_url: current?.image_url ?? updated.image_url }));
      setChanges({});
      setSkill('');
      setSaved(true);
      notify(t('seeker.profile.saved'));
    } catch (error) {
      const validation = getValidationErrors(error, {
        normalizeField: (field) => field.split('.')[0],
        messageForField: () => t('seeker.profile.checkValue'),
      });
      if (validation && Object.keys(validation).length) setErrors(validation);
      else setFormError(true);
    } finally {
      setSaving(false);
    }
  }

  const input = (field, props = {}) => (
    <FormField label={t(`seeker.profile.fields.${field}`)} value={value(field)}
      onChange={(event) => update(field, event.target.value)} error={errors[field]} {...props} />
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="section-title">{t('seeker.navigation.profile')}</h1>
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-[#1C221E]/75">{t('seeker.profile.intro')}</p>
      </header>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <PhotoCard profile={profile} disabled={saving} onUpload={({ image_url, profile_strength }) => {
          setProfile((current) => ({ ...current, image_url, profile_strength }));
          updateProfileImage(image_url);
        }} />
        <form className="surface-card min-w-0 space-y-6 lg:col-span-2" onSubmit={save}>
          <fieldset disabled={saving} className="grid min-w-0 gap-4 sm:grid-cols-2">
            {input('first_name', { maxLength: 50, autoComplete: 'given-name' })}
            {input('last_name', { maxLength: 50, autoComplete: 'family-name' })}
            {input('headline', { maxLength: 50, className: 'sm:col-span-2' })}
            <FormField as="select" label={t('seeker.profile.fields.category_id')} value={String(value('category_id'))}
              onChange={(event) => update('category_id', event.target.value)} error={errors.category_id}
              disabled={categorySource === 'loading' || (!options.length && !profile.category_id)}>
              <option value="">{t('seeker.profile.noCategory')}</option>
              {options.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
            </FormField>
            {input('city', { maxLength: 100 })}
            {input('phone', { type: 'tel', maxLength: 50 })}
            {input('linkedin_url', { type: 'url', maxLength: 255 })}
            {input('github_url', { type: 'url', maxLength: 255 })}
            {input('portfolio_url', { type: 'url', maxLength: 255 })}
            {input('bio', { as: 'textarea', rows: 4, className: 'sm:col-span-2', inputClassName: 'h-auto min-h-24 py-2' })}
            {categorySource === 'unavailable' && <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
              <p className="text-xs leading-relaxed text-[#1C221E]/75" role="status">{t('seeker.profile.categories_unavailable')}</p>
              <Button variant="secondary" onClick={() => {
                setCategorySource('loading');
                setCategoryAttempt((value) => value + 1);
              }}>{t('seeker.retry')}</Button>
            </div>}
          </fieldset>
          <fieldset disabled={saving} className="min-w-0 space-y-4">
            <div className="flex items-end gap-2">
              <FormField className="min-w-0 flex-1" label={t('seeker.profile.fields.skills')} value={skill}
                maxLength={100} onChange={(event) => setSkill(event.target.value)} error={errors.skills}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.nativeEvent.isComposing) { event.preventDefault(); addSkill(); }
                }} />
              <Button variant="secondary" disabled={!skill.trim()} onClick={addSkill}>
                <Plus className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />{t('seeker.profile.addSkill')}
              </Button>
            </div>
            {skills.length > 0 && <ul className="flex flex-wrap gap-2">
              {skills.map((item, index) => <li key={`${item}-${index}`} className="inline-flex max-w-full items-center gap-2 rounded-full border border-[#E5E2D9] bg-[#FAF9F5] ps-3 text-sm">
                <span dir="auto" className="break-all">{item}</span>
                <button type="button" className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full hover:bg-[#E5E2D9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A37E5E]"
                  aria-label={t('seeker.profile.removeSkill', { skill: item })} onClick={() => update('skills', skills.filter((_, i) => i !== index))}>
                  <X className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                </button>
              </li>)}
            </ul>}
          </fieldset>
          {formError && <p role="alert" className="text-sm text-[#B91C1C]">{t('seeker.profile.saveError')}</p>}
          {saved && <p role="status" className="flex items-center gap-2 text-sm text-[#2B362E]"><Check className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />{t('seeker.profile.saved')}</p>}
          <Button type="submit" loading={saving} disabled={!Object.keys(changes).length && !skill.trim()}>{t('common.save')}</Button>
        </form>
      </div>
    </div>
  );
}
