import { useState } from 'react';
import { ArrowDown, ArrowUp, Award, BriefcaseBusiness, ChevronDown, FolderKanban, GraduationCap, Languages, ListChecks, Plus, Sparkles, Trash2, UserRound, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Button from './Button';
import FormField from './FormField';
import IconBadge from './IconBadge';
import { useConfirm } from './ConfirmProvider';
import { cvRows, newCvRow } from '../utils/cvStudio';

const sections = [
  ['personal', UserRound], ['bio', Sparkles], ['experience', BriefcaseBusiness],
  ['education', GraduationCap], ['projects', FolderKanban], ['skills_grouped', ListChecks],
  ['certifications', Award], ['languages', Languages],
];
const contact = { name: 255, headline: 50, email: 255, phone: 50, city: 100, linkedin_url: 255, github_url: 255, portfolio_url: 255 };
const textAreaClass = 'h-auto min-h-24 py-2';
const iconButton = 'button-secondary h-10 w-10 px-0';

function SkillTags({ items, update, error }) {
  const { t } = useTranslation();
  const [value, setValue] = useState('');
  const add = () => {
    const next = value.trim();
    if (!next || items.length >= 50) return;
    if (!items.some((item) => item.toLocaleLowerCase() === next.toLocaleLowerCase())) update([...items, next]);
    setValue('');
  };
  return <div className="space-y-2">
    <div className="flex items-start gap-2">
      <FormField label={t('cvStudio.fields.items')} className="min-w-0 flex-1" value={value} maxLength={100}
        error={error} onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.nativeEvent.isComposing) { event.preventDefault(); add(); }
        }} />
      <Button className="mt-7" variant="secondary" disabled={items.length >= 50 || !value.trim()} onClick={add}>{t('seeker.profile.addSkill')}</Button>
    </div>
    <ul className="flex flex-wrap gap-2">
      {items.map((item, index) => <li key={index} className="flex max-w-full items-center gap-2 rounded-full border border-[#E5E2D9] bg-white ps-3 text-sm">
        <span dir="auto" className="break-all">{item}</span>
        <button type="button" className="button-secondary h-8 w-8 shrink-0 rounded-full border-0 px-0"
          aria-label={t('seeker.profile.removeSkill', { skill: item })} onClick={() => update(items.filter((_, position) => position !== index))}>
          <X className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
        </button>
      </li>)}
    </ul>
  </div>;
}

export default function CvEditor({ draft, update, issues, busy, onRewrite }) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [open, setOpen] = useState('personal');
  const fieldLabel = (key) => t(`cvStudio.fields.${key}`);

  function reorder(section, index, direction) {
    const rows = [...draft[section]];
    const target = index + direction;
    [rows[index], rows[target]] = [rows[target], rows[index]];
    update(section, rows);
  }

  async function remove(section, id) {
    if (await confirm(t('cvStudio.removeConfirm'))) update(section, (rows) => rows.filter((row) => row.id !== id));
  }

  return <fieldset disabled={busy} className="min-w-0 space-y-4">
    {sections.map(([section, Icon]) => {
      const active = open === section;
      const config = cvRows[section];
      return <section className="surface-card min-w-0" key={section}>
        <h2>
          <button type="button" id={`cv-heading-${section}`} aria-expanded={active} aria-controls={`cv-section-${section}`}
            className="flex w-full items-center gap-3 rounded-lg text-start font-semibold text-[#2B362E] transition-colors hover:bg-[#FAF9F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A37E5E]"
            onClick={() => setOpen(active ? null : section)}>
            <IconBadge icon={Icon} tone={section === 'bio' || section === 'skills_grouped' ? 'bronze' : 'olive'} />
            <span className="min-w-0 flex-1">{t(`cvStudio.sections.${section}`)}</span>
            <ChevronDown className={`h-4 w-4 shrink-0 ${active ? 'rotate-180' : ''}`} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </h2>
        <div id={`cv-section-${section}`} aria-labelledby={`cv-heading-${section}`} hidden={!active} className="mt-4 space-y-4">
          {section === 'personal' && <>
            {Object.entries(contact).map(([key, maxLength]) => <FormField key={key} label={fieldLabel(key)}
              type={key === 'email' ? 'email' : key === 'phone' ? 'tel' : key.endsWith('_url') ? 'url' : 'text'}
              value={draft[key]} maxLength={maxLength} error={issues[key]} onChange={(event) => update(key, event.target.value)} />)}
            {draft.image_url && <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="accent-[#2B362E]" checked={draft.showPhoto} onChange={(event) => update('showPhoto', event.target.checked)} />
              {t('cvStudio.photo')}
            </label>}
          </>}
          {section === 'bio' && <>
            <FormField as="textarea" label={fieldLabel('bio')} rows={6} value={draft.bio} maxLength={10000}
              inputClassName={textAreaClass} error={issues.bio} onChange={(event) => update('bio', event.target.value)} />
            <Button variant="secondary" disabled={!draft.bio.trim()} onClick={() => onRewrite('summary')}>
              <Sparkles className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />{t('cvStudio.enhance')}
            </Button>
          </>}
          {config && <>
            {draft[section].map((row, index) => {
              const setRow = (field, value) => update(section, (rows) => rows.map((item) => item.id === row.id ? { ...item, [field]: value } : item));
              return <div className="min-w-0 space-y-4 rounded-xl border border-[#E5E2D9] bg-[#FAF9F5] p-4" key={row.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="break-words text-sm font-semibold text-[#2B362E]">{row.title || row.institution || row.category || row.language || t('cvStudio.entry', { index: index + 1 })}</h3>
                  <div className="flex gap-2">
                    <Button variant="secondary" className={iconButton} aria-label={t('cvStudio.up')} disabled={index === 0} onClick={() => reorder(section, index, -1)}><ArrowUp className="h-4 w-4" aria-hidden="true" /></Button>
                    <Button variant="secondary" className={iconButton} aria-label={t('cvStudio.down')} disabled={index === draft[section].length - 1} onClick={() => reorder(section, index, 1)}><ArrowDown className="h-4 w-4" aria-hidden="true" /></Button>
                    <Button variant="secondary" className={iconButton} aria-label={t('common.delete')} onClick={() => remove(section, row.id)}><Trash2 className="h-4 w-4" aria-hidden="true" /></Button>
                  </div>
                </div>
                {Object.entries(config.fields).map(([key, maxLength]) => {
                  const error = issues[`${section}.${index}.${key}`];
                  if (key === 'items') return <SkillTags key={key} items={row.items} update={(items) => setRow(key, items)} error={error} />;
                  const multiline = ['bullets', 'details'].includes(key);
                  return <FormField key={key} label={fieldLabel(key)} as={multiline ? 'textarea' : 'input'}
                    type={key === 'url' ? 'url' : undefined}
                    inputClassName={multiline ? textAreaClass : undefined} rows={multiline ? 3 : undefined}
                    maxLength={maxLength || undefined} disabled={key === 'end_date' && row.current}
                    value={key === 'bullets' ? row.bullets.join('\n') : row[key]} error={error}
                    onChange={(event) => setRow(key, key === 'bullets' ? event.target.value.split('\n') : event.target.value)} />;
                })}
                {section === 'experience' && <>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" className="accent-[#2B362E]" checked={row.current} onChange={(event) => setRow('current', event.target.checked)} />
                    {t('cvStudio.current')}
                  </label>
                  <Button variant="secondary" disabled={!row.bullets.some((line) => line.trim())} onClick={() => onRewrite('experience', row)}>
                    <Sparkles className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />{t('cvStudio.polish')}
                  </Button>
                </>}
              </div>;
            })}
            <Button variant="secondary" disabled={draft[section].length >= config.max} onClick={() => update(section, (rows) => [...rows, newCvRow(section)])}>
              <Plus className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />{t(`cvStudio.add.${section}`)}
            </Button>
          </>}
        </div>
      </section>;
    })}
  </fieldset>;
}
