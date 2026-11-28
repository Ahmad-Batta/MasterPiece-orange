import { useTranslation } from 'react-i18next';
import { cvRows } from '../utils/cvStudio';
import './cvPaper.css';

const links = ['linkedin_url', 'github_url', 'portfolio_url'];
const joined = (...values) => values.filter((value) => value?.trim()).join(' · ');

function Section({ title, children }) {
  return <section className="cv-paper-section"><h2>{title}</h2>{children}</section>;
}

function WebLink({ value }) {
  return /^https?:\/\/[^\s]+$/i.test(value) ? <a href={value}>{value}</a> : <span>{value}</span>;
}

export default function CvPreview({ draft, paperRef }) {
  const { t, i18n } = useTranslation();
  const fields = (key) => t(`cvStudio.fields.${key}`);
  const sections = (key) => t(`cvStudio.sections.${key}`);
  return (
    <article className="cv-paper" lang={i18n.resolvedLanguage} dir={i18n.dir()} ref={paperRef}>
      <header>
        {draft.showPhoto && draft.image_url && <img src={draft.image_url} alt="" />}
        <h1 dir="auto">{draft.name.trim() || t('cvStudio.unnamed')}</h1>
        {draft.headline && <p dir="auto"><strong>{draft.headline}</strong></p>}
        <p>{[draft.city, draft.email, draft.phone].filter(Boolean).map((value, index) => <span className="cv-paper-contact" key={index} dir="auto">{value}</span>)}</p>
        <p>{links.filter((key) => draft[key]).map((key) => <span className="cv-paper-contact" key={key} dir="ltr"><WebLink value={draft[key]} /></span>)}</p>
      </header>
      {draft.bio.trim() && <Section title={sections('bio')}><p dir="auto">{draft.bio}</p></Section>}
      {Object.keys(cvRows).map((section) => {
        const entries = draft[section].filter(({ id, current, ...row }) => Object.values(row).some((value) => Array.isArray(value) ? value.some((item) => item.trim()) : value.trim()));
        if (!entries.length) return null;
        return <Section key={section} title={sections(section)}>
          {entries.map((row) => {
            const title = row.title || row.institution || row.category || row.language;
            const details = joined(row.organization, row.degree, row.field, row.location, row.tools, row.issuer, row.proficiency);
            const dates = row.date_range || row.year || [row.start_date, row.current ? t('cvStudio.present') : row.end_date].filter(Boolean).join(' – ');
            return <div className="cv-paper-entry" key={row.id}>
              <div className="cv-paper-entry-heading">
                <p dir="auto"><strong>{title}</strong>{title && details ? ' · ' : ''}{details}</p>
                {dates && <em dir="auto">{dates}</em>}
              </div>
              {row.honors && <p dir="auto">{fields('honors')} · {row.honors}</p>}
              {row.details && <p dir="auto">{row.details}</p>}
              {row.url && <p dir="ltr"><WebLink value={row.url} /></p>}
              {row.items?.length > 0 && <p dir="auto">{row.items.join(', ')}</p>}
              {row.bullets?.some((line) => line.trim()) && <ul>{row.bullets.filter((line) => line.trim()).map((line, index) => <li key={index} dir="auto">{line}</li>)}</ul>}
            </div>;
          })}
        </Section>;
      })}
    </article>
  );
}
