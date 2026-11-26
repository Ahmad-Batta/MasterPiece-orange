import { useState } from 'react';
import { ArrowUpRight, Github, Instagram, Linkedin, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const navigationGroups = [
  {
    id: 'product',
    links: [
      { key: 'aiCvStudio', href: '/register?role=seeker' },
      { key: 'fitScore', href: '/register?role=seeker' },
      { key: 'jobDiscovery', href: '#jobs' },
      { key: 'proPlans', href: '#pricing' },
    ],
  },
  {
    id: 'specializations',
    links: [
      { key: 'engineering', href: '#jobs' },
      { key: 'itSoftware', href: '#jobs' },
      { key: 'businessFinance', href: '#jobs' },
      { key: 'healthDesign', href: '#jobs' },
    ],
  },
  {
    id: 'companies',
    links: [
      { key: 'postJob', href: '/register?role=company' },
      { key: 'candidateRanking', href: '/register?role=company' },
      { key: 'interviewScheduling', href: '/register?role=company' },
    ],
  },
  {
    id: 'platform',
    links: [
      { key: 'howItWorks', href: '#how-it-works' },
      { key: 'signIn', href: '/login' },
      { key: 'createAccount', href: '/register' },
      { key: 'privacyTerms', href: 'mailto:support@careerhub.io?subject=Privacy%20and%20Terms' },
    ],
  },
];

const socialLinks = [
  { key: 'linkedin', href: 'https://www.linkedin.com/', Icon: Linkedin },
  { key: 'instagram', href: 'https://www.instagram.com/', Icon: Instagram },
  { key: 'github', href: 'https://github.com/', Icon: Github },
];

function FooterNavigationLink({ href, children }) {
  const className = 'inline-flex min-h-8 items-center text-start text-xs text-[#1C221E]/75 transition-colors duration-150 hover:text-[#2B362E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A37E5E]';

  if (href.startsWith('/')) {
    return <Link className={className} to={href}>{children}</Link>;
  }

  return <a className={className} href={href}>{children}</a>;
}

export default function Footer() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const submitNewsletter = (event) => {
    event.preventDefault();
    setSubscribed(true);
  };

  return (
    <footer id="careerhub-footer" className="border-t border-[#E5E2D9] bg-white">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-12 lg:gap-6">
          <section className="lg:col-span-3" aria-labelledby="footer-brand-title">
            <Link to="/" className="inline-flex items-center gap-2 rounded-lg text-[#2B362E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A37E5E]">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2B362E] text-xs font-semibold text-white" aria-hidden="true">CH</span>
              <span id="footer-brand-title" className="font-display text-base font-semibold">{t('nav.brand')}</span>
              <ArrowUpRight className="h-3 w-3 rtl:rotate-180" strokeWidth={1.75} aria-hidden="true" />
            </Link>
            <p className="mt-3 max-w-prose text-xs leading-relaxed text-[#1C221E]/75">{t('footer.mission')}</p>
            <ul className="mt-4 flex flex-wrap gap-2" aria-label={t('footer.trustLabel')}>
              {['aiAtsScoring', 'allMajors', 'verifiedEmployers'].map((key) => (
                <li key={key} className="whitespace-nowrap rounded-full border border-[#E5E2D9] bg-[#FAF9F5] px-2.5 py-1 text-[10px] font-medium text-[#2B362E]">{t(`footer.trust.${key}`)}</li>
              ))}
            </ul>
          </section>

          <nav className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-4 lg:col-span-6" aria-label={t('footer.navigationLabel')}>
            {navigationGroups.map(({ id, links }) => (
              <section key={id} aria-labelledby={`footer-${id}`}>
                <h2 id={`footer-${id}`} className="mb-2 text-xs font-semibold text-[#2B362E]">{t(`footer.groups.${id}`)}</h2>
                <ul className="space-y-1">
                  {links.map(({ key, href }) => (
                    <li key={key}><FooterNavigationLink href={href}>{t(`footer.links.${key}`)}</FooterNavigationLink></li>
                  ))}
                </ul>
              </section>
            ))}
          </nav>

          <section className="rounded-xl border border-[#E5E2D9] bg-[#FAF9F5] p-6 lg:col-span-3" aria-labelledby="footer-newsletter-title">
            <h2 id="footer-newsletter-title" className="text-sm font-semibold text-[#2B362E]">{t('footer.newsletterTitle')}</h2>
            <p className="mt-1 text-xs leading-relaxed text-[#1C221E]/75">{t('footer.newsletterBody')}</p>
            <form className="mt-4 space-y-2" onSubmit={submitNewsletter}>
              <label className="block text-xs font-medium text-[#1E2620]" htmlFor="footer-email">{t('footer.emailLabel')}</label>
              <input
                id="footer-email"
                className="h-10 w-full rounded-lg border border-[#E5E2D9] bg-white px-3 text-xs text-[#1C221E] outline-none transition-colors duration-150 placeholder:text-[#1C221E]/60 focus:border-[#A37E5E] focus-visible:ring-2 focus-visible:ring-[#A37E5E]"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => { setEmail(event.target.value); setSubscribed(false); }}
                placeholder={t('footer.emailPlaceholder')}
              />
              <button className="button-primary h-10 w-full px-4 text-xs" type="submit">{t(subscribed ? 'footer.subscribed' : 'footer.subscribe')}</button>
              <p className="min-h-4 text-xs text-[#2B362E]" role="status" aria-live="polite">{subscribed ? t('footer.subscribeConfirmation') : ''}</p>
            </form>
            <a className="mt-2 inline-flex items-center gap-2 text-xs text-[#2B362E] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A37E5E]" href={`mailto:${t('footer.supportEmail')}`}>
              <Mail className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />{t('footer.supportEmail')}
            </a>
          </section>
        </div>

        <div className="mt-8 flex flex-col gap-4 border-t border-[#E5E2D9] pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-[#1C221E]/70">{t('footer.copyright')}</p>
          <nav className="flex items-center gap-2" aria-label={t('footer.socialLabel')}>
            {socialLinks.map(({ key, href, Icon }) => (
              <a
                key={key}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#2B362E] transition-colors duration-150 hover:bg-[#FAF9F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A37E5E]"
                href={href}
                target="_blank"
                rel="noreferrer"
                aria-label={t(`footer.social.${key}`)}
              >
                <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              </a>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
