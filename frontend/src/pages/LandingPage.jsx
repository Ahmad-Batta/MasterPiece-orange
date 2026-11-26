import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, BriefcaseBusiness, CalendarCheck2, CheckCircle2, FileText, MapPin, Quote, Search, SlidersHorizontal, Sparkles, Target } from 'lucide-react';
import { AnimatePresence, motion, useAnimationControls } from 'motion/react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { dashboardPath, useAuth } from '../context/AuthContext';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import api from '../api/axios';
import JobCardSkeleton from '../components/JobCardSkeleton';
import Footer from '../components/Footer';

gsap.registerPlugin(ScrollTrigger);

const specializationFilters = [
  { key: 'engineering', translation: 'hero.filterEngineering', searchTerms: ['engineering', 'engineer'] },
  { key: 'it', translation: 'hero.filterIt', searchTerms: ['it', 'software', 'technology', 'computer', 'data'] },
  { key: 'business', translation: 'hero.filterBusiness', searchTerms: ['business', 'management', 'finance', 'marketing'] },
  { key: 'healthcare', translation: 'hero.filterHealthcare', searchTerms: ['health', 'medical', 'medicine', 'nursing'] },
  { key: 'design', translation: 'hero.filterDesign', searchTerms: ['design', 'creative', 'ux', 'ui'] },
];

const partnerOrganizations = [
  { name: 'Orange', monogram: 'O' },
  { name: 'Arab Bank', monogram: 'AB' },
  { name: 'Zain', monogram: 'Z' },
  { name: 'Hikma Pharmaceuticals', monogram: 'H' },
  { name: 'Consolidated Contractors', monogram: 'CC' },
  { name: 'Microsoft', monogram: 'M' },
  { name: 'Amazon', monogram: 'A' },
  { name: 'PwC', monogram: 'PwC' },
];

const workflowSteps = [
  { number: '01', title: 'workflow.stepOneTitle', body: 'workflow.stepOneBody', Icon: FileText },
  { number: '02', title: 'workflow.stepTwoTitle', body: 'workflow.stepTwoBody', Icon: Sparkles },
  { number: '03', title: 'workflow.stepThreeTitle', body: 'workflow.stepThreeBody', Icon: Target },
  { number: '04', title: 'workflow.stepFourTitle', body: 'workflow.stepFourBody', Icon: CalendarCheck2 },
];

const impactMetrics = [
  { target: 12500, suffix: 'metrics.opportunitiesSuffix', label: 'metrics.opportunities' },
  { target: 18, suffix: 'metrics.timelineSuffix', label: 'metrics.timeline' },
  { target: 3, suffix: 'metrics.interviewsSuffix', label: 'metrics.interviews' },
  { target: 94, suffix: 'metrics.readinessSuffix', label: 'metrics.readiness' },
];

const successStories = [
  { id: 'software', initials: 'MH' },
  { id: 'civil', initials: 'ON' },
  { id: 'finance', initials: 'LK' },
];

function responseItems(response) {
  const data = response?.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.categories)) return data.categories;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function categoryName(job) {
  const category = job.category;
  if (typeof category === 'string') return category;
  return category?.name || category?.title || job.category_name || job.academic_major_requirement || job.academic_major || '';
}

function jobSearchText(job) {
  const company = typeof job.company === 'string' ? job.company : job.company?.name;
  return [job.title, job.description, company, job.company_name, job.location, categoryName(job), job.academic_major_requirement]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase();
}

function formatMoney(value, currency, language) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '';
  try {
    return new Intl.NumberFormat(language === 'ar' ? 'ar-JO' : 'en-US', {
      style: 'currency',
      currency: currency || 'JOD',
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return new Intl.NumberFormat(language === 'ar' ? 'ar-JO' : 'en-US', { maximumFractionDigits: 0 }).format(amount);
  }
}

function salaryLabel(job, language, t) {
  if (job.salary_range) return job.salary_range;
  const minimum = formatMoney(job.salary_min, job.currency, language);
  const maximum = formatMoney(job.salary_max, job.currency, language);
  if (minimum && maximum) return `${minimum} – ${maximum}`;
  return minimum || maximum || t('jobs.salaryMissing');
}

function matchesCategory(job, categoryFilter, categories) {
  if (!categoryFilter) return true;
  const name = categoryName(job).toLocaleLowerCase();
  const categoryId = job.category_id ?? (typeof job.category === 'object' ? job.category?.id : null);

  if (categoryFilter.startsWith('api:')) {
    const id = categoryFilter.slice(4);
    if (categoryId != null) return String(categoryId) === id;
    const selected = categories.find((category) => String(category.id) === id)?.name?.toLocaleLowerCase();
    return selected ? name.includes(selected) : false;
  }

  const selectedFilter = specializationFilters.find((filter) => `pill:${filter.key}` === categoryFilter);
  return selectedFilter ? selectedFilter.searchTerms.some((term) => name.includes(term)) : true;
}

function JobListingCard({ job, session, t, language }) {
  const company = typeof job.company === 'string' ? job.company : job.company?.name || job.company_name || t('jobs.companyFallback');
  const location = job.location || job.company?.location || t('jobs.locationMissing');
  const category = categoryName(job) || t('jobs.categoryMissing');
  const type = job.job_type || job.job_type_name || job.type;
  const companyVerified = job.company?.verification_status === 'verified' || job.company?.is_verified === true;
  const matchPercentage = job.match_percentage ?? job.ai_match_percentage ?? job.matching_job?.match_percentage;
  const destination = session?.role === 'seeker' ? '/seeker/jobs' : session ? dashboardPath(session.role) : '/register?role=seeker';

  return (
    <motion.div whileHover={{ y: -3 }} transition={{ duration: 0.18 }}>
      <Link to={destination} className="relative z-10 block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A37E5E] focus-visible:ring-offset-2" aria-label={t('jobs.cardSummary', { title: job.title, company, location, category, salary: salaryLabel(job, language, t) })}>
        <article className="flex h-full flex-col gap-4 rounded-xl border border-[#E5E2D9] bg-white p-5 transition-colors duration-150 hover:border-[#2B362E]">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#FAF9F5] text-sm font-semibold text-[#2B362E]" aria-hidden="true">{company.trim().slice(0, 1).toLocaleUpperCase()}</span>
              <span className="truncate text-sm font-medium text-[#1C221E]" dir="auto">{company}</span>
            </div>
            {companyVerified && <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-[#E5E2D9] bg-[#FAF9F5] px-2 py-1 text-xs font-medium text-[#2B362E]"><CheckCircle2 className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />{t('jobs.verified')}</span>}
          </div>

          <h3 className="text-base font-semibold leading-relaxed text-[#2B362E] sm:text-lg">{job.title}</h3>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[#1C221E]">
            <span className="inline-flex items-center gap-2" dir="auto"><MapPin className="h-4 w-4 shrink-0 text-[#1C221E]/70" strokeWidth={1.75} aria-hidden="true" />{location}</span>
            {type && <span className="inline-flex items-center gap-2"><BriefcaseBusiness className="h-4 w-4 shrink-0 text-[#1C221E]/70" strokeWidth={1.75} aria-hidden="true" />{type}</span>}
          </div>

          <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-[#E5E2D9] pt-4">
            <span className="whitespace-nowrap rounded-full border border-[#E5E2D9] bg-[#FAF9F5] px-3 py-1 text-xs font-medium text-[#2B362E]">{category}</span>
            <span className="tabular-nums text-sm font-medium text-[#1C221E]">{salaryLabel(job, language, t)}</span>
          </div>

          <div className="flex items-center justify-between gap-4">
            <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-[#A37E5E]/40 bg-[#FAF9F5] px-3 py-1 text-xs font-medium text-[#A37E5E]">
              <Sparkles className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              {matchPercentage != null ? t('jobs.aiFitScore', { percentage: matchPercentage }) : t('jobs.aiFitBadge')}
            </span>
            <span className="inline-flex h-10 items-center gap-2 whitespace-nowrap text-sm font-medium text-[#2B362E]">{t('jobs.viewApply')}<ArrowUpRight className="h-4 w-4 rtl:rotate-180" strokeWidth={1.75} aria-hidden="true" /></span>
          </div>
        </article>
      </Link>
    </motion.div>
  );
}

export default function LandingPage() {
  const { t, i18n } = useTranslation();
  const { session } = useAuth();
  const pageRef = useRef(null);
  const photoRef = useRef(null);
  const jobsRef = useRef(null);
  const marqueeControls = useAnimationControls();
  const [jobs, setJobs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [plansByRole, setPlansByRole] = useState({ seeker: [], company: [] });
  const [pricingRole, setPricingRole] = useState('seeker');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [categoryQuery, setCategoryQuery] = useState('');
  const [selectedPill, setSelectedPill] = useState(null);
  const [activeFilters, setActiveFilters] = useState({ keyword: '', category: '' });

  const loadJobs = useCallback(async (signal) => {
    setLoading(true);
    setLoadError(false);
    try {
      const { data } = await api.get('/jobs', { signal });
      setJobs(responseItems(data));
    } catch (error) {
      if (error.code !== 'ERR_CANCELED') setLoadError(true);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadJobs(controller.signal);
    api.get('/categories', { signal: controller.signal })
      .then(({ data }) => {
        const availableCategories = responseItems(data).map((category) => ({
          id: category.id,
          name: category.name || category.category_name || category.title || '',
        })).filter((category) => category.name);
        setCategories(availableCategories);
      })
      .catch((error) => {
        if (error.code !== 'ERR_CANCELED') setCategories([]);
      });
    return () => controller.abort();
  }, [loadJobs]);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all(['seeker', 'company'].map(async (role) => {
      try {
        const { data } = await api.get('/plans', { params: { role }, signal: controller.signal });
        const plans = Array.isArray(data?.data?.items) ? data.data.items : responseItems(data);
        return [role, plans.filter((plan) => plan.is_active !== false)];
      } catch {
        return [role, []];
      }
    })).then((entries) => {
      if (!controller.signal.aborted) setPlansByRole(Object.fromEntries(entries));
    });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const root = pageRef.current;
    if (!root) return undefined;

    const context = gsap.context(() => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      gsap.timeline({ defaults: { ease: 'power2.out' } })
        .fromTo('.hero-entrance', { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.1 });

      gsap.to(photoRef.current, {
        scale: 1.1,
        yPercent: 4,
        ease: 'none',
        scrollTrigger: { trigger: '.photo-hero', start: 'top top', end: 'bottom top', scrub: true },
      });

      gsap.utils.toArray('.gsap-reveal').forEach((element) => {
        gsap.fromTo(element,
          { autoAlpha: 0, y: 20 },
          { autoAlpha: 1, y: 0, duration: 0.55, ease: 'power2.out', scrollTrigger: { trigger: element, start: 'top 90%', once: true } },
        );
      });
    }, root);

    return () => context.revert();
  }, [jobs.length]);

  const isArabic = i18n.language === 'ar';
  const startMarquee = () => marqueeControls.start({
    x: isArabic ? ['-50%', '0%'] : ['0%', '-50%'],
    transition: { duration: 32, ease: 'linear', repeat: Infinity },
  });

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      marqueeControls.set({ x: 0 });
      return undefined;
    }

    startMarquee();
    return () => marqueeControls.stop();
  }, [isArabic, marqueeControls]);

  useEffect(() => {
    const root = pageRef.current;
    if (!root) return undefined;

    const context = gsap.context(() => {
      const formatter = new Intl.NumberFormat(isArabic ? 'ar-JO' : 'en-US');
      gsap.utils.toArray('.metric-count').forEach((element) => {
        const target = Number(element.dataset.target);
        const counter = { value: 1 };
        element.textContent = formatter.format(1);

        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          element.textContent = formatter.format(target);
          return;
        }

        gsap.to(counter, {
          value: target,
          duration: 2.2,
          ease: 'power2.out',
          snap: { value: 1 },
          onUpdate: () => { element.textContent = formatter.format(counter.value); },
          scrollTrigger: { trigger: element.closest('.metrics-strip'), start: 'top 85%', once: true },
        });
      });
    }, root);

    return () => context.revert();
  }, [isArabic]);

  const filteredJobs = useMemo(() => jobs.filter((job) => {
    const queryMatches = !activeFilters.keyword || jobSearchText(job).includes(activeFilters.keyword.toLocaleLowerCase());
    return queryMatches && matchesCategory(job, activeFilters.category, categories);
  }), [activeFilters, categories, jobs]);

  const fallbackCategories = [
    { key: 'engineering', name: t('hero.filterEngineering') },
    { key: 'it', name: t('hero.filterIt') },
    { key: 'business', name: t('hero.filterBusiness') },
    { key: 'healthcare', name: t('hero.filterHealthcare') },
    { key: 'design', name: t('hero.filterDesign') },
  ];
  const categoryOptions = categories.length
    ? categories.map((category) => ({ value: `api:${category.id}`, label: category.name }))
    : fallbackCategories.map((category) => ({ value: `pill:${category.key}`, label: category.name }));

  const scrollToJobs = () => {
    jobsRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  };

  const submitSearch = (event) => {
    event.preventDefault();
    setSelectedPill(null);
    setActiveFilters({ keyword: keyword.trim(), category: categoryQuery });
    scrollToJobs();
  };

  const applyPill = (filterKey) => {
    const nextCategory = filterKey ? `pill:${filterKey}` : '';
    setSelectedPill(filterKey);
    setCategoryQuery('');
    setActiveFilters({ keyword: keyword.trim(), category: nextCategory });
    scrollToJobs();
  };

  const retryJobs = () => loadJobs();
  const countLabel = new Intl.NumberFormat(i18n.language === 'ar' ? 'ar-JO' : 'en-US').format(filteredJobs.length);
  const rolePlans = plansByRole[pricingRole] || [];
  const proPlan = rolePlans.find((plan) => `${plan.slug || ''} ${plan.name || ''}`.toLocaleLowerCase().includes('pro')) || rolePlans[0];
  const pricingCards = [
    {
      id: 'starter',
      name: t(pricingRole === 'seeker' ? 'pricing.seekerStarter' : 'pricing.companyStarter'),
      badge: t('pricing.freeBadge'),
      price: 0,
      currency: 'USD',
      duration: null,
      features: pricingRole === 'seeker'
        ? ['seekerFreeCv', 'seekerResumeBuilder', 'seekerLimitedAi', 'seekerVerifiedJobs']
        : ['companyVerifiedProfile', 'companyActiveListings', 'companyApplicantTracking'],
      highlighted: false,
    },
    {
      id: 'pro',
      name: proPlan?.name || t(pricingRole === 'seeker' ? 'pricing.seekerPro' : 'pricing.companyPro'),
      badge: t('pricing.proBadge'),
      price: proPlan?.price ?? (pricingRole === 'seeker' ? 9.99 : 29.99),
      currency: proPlan?.currency || 'USD',
      duration: Number(proPlan?.duration_days ?? 30),
      features: pricingRole === 'seeker'
        ? ['seekerUnlimitedReviews', 'seekerSkillRoadmaps', 'seekerPriorityFit', 'seekerPdfExports']
        : ['companyAiJobDescriptions', 'companyCandidateRanking', 'companyCandidateInsights', 'companyInterviewQuestions'],
      highlighted: true,
    },
  ];
  const formatPlanPrice = (amount, currency) => {
    try {
      return new Intl.NumberFormat(i18n.language === 'ar' ? 'ar-JO' : 'en-US', {
        style: 'currency', currency: currency || 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2,
      }).format(Number(amount));
    } catch {
      return `${Number(amount).toFixed(2)} ${currency || 'USD'}`;
    }
  };

  return (
    <>
      <main id="main-content" ref={pageRef}>
      <section className="photo-hero relative -mt-16 min-h-[100svh] overflow-hidden pt-16 text-[#FAF9F5]">
        <img
          ref={photoRef}
          className="photo-hero__image pointer-events-none absolute inset-0 z-0 h-full w-full object-cover"
          src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=2000&q=85"
          alt=""
          aria-hidden="true"
          fetchPriority="high"
          onError={(event) => { event.currentTarget.style.display = 'none'; }}
        />
        <div className="photo-overlay pointer-events-none absolute inset-0 z-0" aria-hidden="true" />
        <div className="relative z-10 mx-auto flex min-h-[calc(100svh-4rem)] max-w-7xl flex-col items-center justify-center px-4 py-8 text-center sm:px-6 lg:px-8">
          <div className="hero-entrance relative z-10 mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-medium tracking-wide text-[#FAF9F5] backdrop-blur-md">
            <Sparkles className="h-4 w-4 text-[#A37E5E]" strokeWidth={1.75} aria-hidden="true" />{t('hero.eyebrow')}
          </div>
          <h1 className="hero-entrance relative z-10 max-w-3xl font-hero text-4xl font-bold leading-snug tracking-tight text-[#FAF9F5] sm:text-5xl">
            {t('hero.titleLead')} <span className="hero-title-highlight">{t('hero.titleAccent')}</span>
          </h1>
          <p className="hero-entrance relative z-10 mt-4 max-w-prose text-sm leading-relaxed text-[#FAF9F5]/90 sm:text-base">{t('hero.body')}</p>

          <form className="hero-entrance relative z-10 mt-8 grid w-full max-w-3xl grid-cols-1 gap-2 rounded-xl border border-[#E5E2D9] bg-white p-2 text-start shadow-sm md:grid-cols-12" onSubmit={submitSearch}>
            <label className="sr-only" htmlFor="job-keyword">{t('hero.keywordLabel')}</label>
            <div className="relative md:col-span-5">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#1C221E]/70" strokeWidth={1.75} aria-hidden="true" />
              <input id="job-keyword" className="h-10 w-full rounded-lg border border-[#E5E2D9] bg-white ps-10 pe-3 text-sm text-[#1C221E] outline-none transition-colors duration-150 placeholder:text-[#1C221E]/60 focus:border-[#A37E5E] focus-visible:ring-2 focus-visible:ring-[#A37E5E]" type="search" value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder={t('hero.keywordPlaceholder')} />
            </div>
            <label className="sr-only" htmlFor="job-category">{t('hero.categoryLabel')}</label>
            <div className="relative md:col-span-4">
              <SlidersHorizontal className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#1C221E]/70" strokeWidth={1.75} aria-hidden="true" />
              <select id="job-category" className="h-10 w-full appearance-none rounded-lg border border-[#E5E2D9] bg-white ps-10 pe-3 text-sm text-[#1C221E] outline-none transition-colors duration-150 focus:border-[#A37E5E] focus-visible:ring-2 focus-visible:ring-[#A37E5E]" value={categoryQuery} onChange={(event) => { setSelectedPill(null); setCategoryQuery(event.target.value); }}>
                <option value="">{t('hero.allSpecializations')}</option>
                {categoryOptions.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}
              </select>
            </div>
            <button className="button-primary h-10 px-5 text-sm md:col-span-3" type="submit">{t('hero.findJobs')}<ArrowUpRight className="h-4 w-4 rtl:rotate-180" strokeWidth={1.75} aria-hidden="true" /></button>
          </form>

          <div className="hero-entrance relative z-10 mt-5 flex max-w-3xl flex-wrap items-center justify-center gap-2" aria-label={t('hero.specializationFilters')}>
            <button type="button" onClick={() => applyPill('')} className={`inline-flex h-10 cursor-pointer items-center whitespace-nowrap rounded-full border px-4 text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A37E5E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#2B362E] ${selectedPill === '' || (selectedPill === null && !categoryQuery && !activeFilters.category) ? 'border-[#FAF9F5] bg-[#FAF9F5] text-[#2B362E]' : 'border-white/30 bg-white/10 text-[#FAF9F5] hover:bg-white/15'}`}>{t('hero.filterAll')}</button>
            {specializationFilters.map((filter) => (
              <button key={filter.key} type="button" onClick={() => applyPill(filter.key)} className={`inline-flex h-10 cursor-pointer items-center whitespace-nowrap rounded-full border px-4 text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A37E5E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#2B362E] ${selectedPill === filter.key ? 'border-[#FAF9F5] bg-[#FAF9F5] text-[#2B362E]' : 'border-white/30 bg-white/10 text-[#FAF9F5] hover:bg-white/15'}`}>{t(filter.translation)}</button>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-[#E5E2D9] bg-white py-8 sm:py-10" aria-labelledby="partners-title">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 id="partners-title" className="mb-6 text-center text-xs font-semibold tracking-[0.12em] text-[#1C221E]/70 sm:mb-8">{t('partners.title')}</h2>
          <div className="relative overflow-hidden" aria-label={t('partners.title')}>
            <div className="pointer-events-none absolute inset-y-0 start-0 z-10 w-12 bg-gradient-to-r from-white to-transparent rtl:bg-gradient-to-l sm:w-20" aria-hidden="true" />
            <div className="pointer-events-none absolute inset-y-0 end-0 z-10 w-12 bg-gradient-to-l from-white to-transparent rtl:bg-gradient-to-r sm:w-20" aria-hidden="true" />
            <motion.div
              className="flex w-max"
              animate={marqueeControls}
              onHoverStart={() => marqueeControls.stop()}
              onHoverEnd={() => { if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) startMarquee(); }}
              onFocus={() => marqueeControls.stop()}
              onBlur={() => { if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) startMarquee(); }}
            >
              {[0, 1].map((copy) => (
                <div key={copy} className="flex shrink-0 items-center gap-8 pe-8 sm:gap-12 sm:pe-12" aria-hidden={copy === 1}>
                  {partnerOrganizations.map((organization) => (
                    <div key={organization.name} className="flex shrink-0 items-center gap-3 whitespace-nowrap" aria-label={organization.name}>
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#E5E2D9] bg-[#FAF9F5] text-xs font-semibold text-[#2B362E]" aria-hidden="true">{organization.monogram}</span>
                      <span className="text-sm font-semibold text-[#1C221E] sm:text-base">{organization.name}</span>
                    </div>
                  ))}
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="bg-[#FAF9F5] py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="gsap-reveal mb-8 flex flex-col gap-4 sm:mb-12 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-3 text-xs font-semibold tracking-wide text-[#A37E5E]">{t('workflow.eyebrow')}</p>
              <h2 className="font-display text-3xl font-semibold tracking-tight text-[#2B362E] sm:text-4xl">
                {t('workflow.titleLead')} <span className="text-[#A37E5E]">{t('workflow.titleAccent')}</span>
              </h2>
            </div>
            <p className="max-w-prose text-sm leading-relaxed text-[#1C221E] sm:text-base">{t('workflow.body')}</p>
          </div>

          <div className="gsap-reveal grid overflow-hidden rounded-xl border border-[#E5E2D9] bg-white lg:grid-cols-4">
            {workflowSteps.map(({ number, title, body, Icon }) => (
              <article key={number} className="flex min-h-48 flex-col border-b border-[#E5E2D9] p-5 last:border-b-0 lg:border-e lg:border-b-0 lg:last:border-e-0">
                <div className="flex items-center justify-between gap-4">
                  <p className="tabular-nums text-sm font-semibold tracking-wide text-[#2B362E]">{number} <span className="text-[#A37E5E]">/ 04</span></p>
                  <Icon className="h-5 w-5 text-[#A37E5E]" strokeWidth={1.75} aria-hidden="true" />
                </div>
                <h3 className="mt-4 text-base font-semibold leading-relaxed text-[#1C221E]">{t(title)}</h3>
                <p className="mt-5 text-sm leading-relaxed text-[#1C221E]/75">{t(body)}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#FAF9F5] pb-12 sm:pb-16" aria-label={t('metrics.title')}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="metrics-strip grid border-y border-[#E5E2D9] lg:grid-cols-4">
            {impactMetrics.map(({ target, suffix, label }) => (
              <div key={label} className="gsap-reveal border-b border-[#E5E2D9] px-6 py-8 last:border-b-0 lg:border-e lg:border-b-0 lg:px-8 lg:py-10 lg:last:border-e-0">
                <p className="flex items-start gap-1 font-display text-5xl font-semibold tracking-tight text-[#1C221E] sm:text-6xl" dir="ltr">
                  <span className="metric-count tabular-nums" data-target={target}>1</span>
                  <span className="pt-1 text-2xl font-medium text-[#A37E5E]">{t(suffix)}</span>
                </p>
                <p className="mt-4 text-xs font-semibold tracking-[0.1em] text-[#1C221E]/70">{t(label)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="jobs" ref={jobsRef} className="scroll-mt-24 bg-[#FAF9F5] py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="gsap-reveal mb-8 flex flex-col gap-4 sm:mb-12 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <p className="mb-3 text-xs font-semibold tracking-wide text-[#A37E5E]">{t('jobs.eyebrow')}</p>
              <h2 className="section-title">{t('jobs.title')}</h2>
              <p className="mt-4 max-w-prose text-sm leading-relaxed text-[#1C221E] sm:text-base">{t('jobs.body')}</p>
            </div>
            {!loading && !loadError && <span className="tabular-nums whitespace-nowrap text-sm font-medium text-[#1C221E]/70">{t('jobs.resultsCount', { count: countLabel })}</span>}
          </div>

          {loading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3" aria-label={t('jobs.loading')} aria-busy="true">
              {[0, 1, 2].map((item) => <JobCardSkeleton key={item} />)}
            </div>
          ) : loadError ? (
            <div className="surface-card flex flex-col items-center gap-4 text-center" role="alert">
              <Search className="h-8 w-8 text-[#A37E5E]" strokeWidth={1.75} aria-hidden="true" />
              <h3 className="text-base font-semibold text-[#2B362E]">{t('jobs.loadErrorTitle')}</h3>
              <p className="max-w-prose text-sm leading-relaxed text-[#1C221E]">{t('jobs.loadErrorBody')}</p>
              <button className="button-primary" type="button" onClick={retryJobs}>{t('jobs.retry')}</button>
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="surface-card flex flex-col items-center gap-4 text-center">
              <Search className="h-8 w-8 text-[#A37E5E]" strokeWidth={1.75} aria-hidden="true" />
              <h3 className="text-base font-semibold text-[#2B362E]">{t(activeFilters.keyword || activeFilters.category ? 'jobs.filteredEmptyTitle' : 'jobs.emptyTitle')}</h3>
              <p className="max-w-prose text-sm leading-relaxed text-[#1C221E]">{t(activeFilters.keyword || activeFilters.category ? 'jobs.filteredEmptyBody' : 'jobs.emptyBody')}</p>
              {(activeFilters.keyword || activeFilters.category) && <button className="button-primary" type="button" onClick={() => { setKeyword(''); setCategoryQuery(''); setSelectedPill(null); setActiveFilters({ keyword: '', category: '' }); }}>{t('jobs.clearFilters')}</button>}
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {filteredJobs.map((job) => <div key={job.id} className="gsap-reveal"><JobListingCard job={job} session={session} t={t} language={i18n.language} /></div>)}
            </div>
          )}
        </div>
      </section>

      <section id="success-stories" className="bg-white py-12 sm:py-16" aria-labelledby="success-stories-title">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="gsap-reveal mb-8 sm:mb-12">
            <p className="mb-3 text-xs font-semibold tracking-wide text-[#A37E5E]">{t('stories.eyebrow')}</p>
            <h2 id="success-stories-title" className="section-title">{t('stories.title')}</h2>
            <p className="mt-3 max-w-prose text-sm leading-relaxed text-[#1C221E] sm:text-base">{t('stories.subtitle')}</p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {successStories.map(({ id, initials }) => (
              <motion.article key={id} className="surface-card flex h-full flex-col gap-4" whileHover={{ y: -3 }} transition={{ duration: 0.18 }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#2B362E] text-xs font-semibold text-white" aria-hidden="true">{initials}</span>
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-[#1E2620]">{t(`stories.${id}.name`)}</h3>
                      <p className="mt-1 text-xs text-[#1C221E]/70">{t(`stories.${id}.major`)}</p>
                    </div>
                  </div>
                  <Quote className="h-5 w-5 shrink-0 text-[#A37E5E]" strokeWidth={1.75} aria-hidden="true" />
                </div>

                <span className="w-fit whitespace-nowrap rounded-full border border-[#E5E2D9] bg-[#FAF9F5] px-2.5 py-1 text-[10px] font-medium text-[#2B362E]">{t('stories.illustrative')}</span>
                <blockquote className="flex-1 text-sm leading-relaxed text-[#1C221E]">“{t(`stories.${id}.quote`)}”</blockquote>

                <div className="border-t border-[#E5E2D9] pt-3">
                  <p className="text-xs font-semibold text-[#2B362E]">{t(`stories.${id}.role`)}</p>
                  <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-xs text-[#1C221E]/70">
                    <span>{t(`stories.${id}.employer`)}</span>
                    <span className="tabular-nums">{t('stories.cohort', { year: t(`stories.${id}.cohort`) })}</span>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="scroll-mt-24 bg-[#FAF9F5] py-12 sm:py-16" aria-labelledby="pricing-title">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="gsap-reveal mx-auto mb-8 max-w-2xl text-center sm:mb-12">
            <p className="mb-3 text-xs font-semibold tracking-wide text-[#A37E5E]">{t('pricing.eyebrow')}</p>
            <h2 id="pricing-title" className="section-title">{t('pricing.title')}</h2>
            <p className="mx-auto mt-3 max-w-prose text-sm leading-relaxed text-[#1C221E] sm:text-base">{t('pricing.subtitle')}</p>
          </div>

          <div className="mx-auto mb-8 flex w-fit rounded-full border border-[#E5E2D9] bg-white p-1" role="group" aria-label={t('pricing.roleLabel')}>
            {['seeker', 'company'].map((role) => (
              <button
                key={role}
                type="button"
                className={`relative inline-flex h-10 min-w-32 cursor-pointer items-center justify-center whitespace-nowrap rounded-full px-4 text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A37E5E] focus-visible:ring-offset-2 ${pricingRole === role ? 'text-white' : 'text-[#2B362E] hover:bg-[#FAF9F5]'}`}
                onClick={() => setPricingRole(role)}
                aria-pressed={pricingRole === role}
              >
                {pricingRole === role && <motion.span layoutId="pricingRoleSlider" className="absolute inset-0 rounded-full bg-[#2B362E]" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                <span className="relative z-10">{t(`pricing.${role}Audience`)}</span>
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={pricingRole}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2"
            >
              {pricingCards.map((plan) => (
                <article key={plan.id} className={`flex flex-col rounded-xl border bg-white p-6 ${plan.highlighted ? 'border-[#A37E5E]' : 'border-[#E5E2D9]'}`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-base font-semibold text-[#1C221E]">{plan.name}</h3>
                    <p className="mt-1 text-xs text-[#1C221E]/70">{t(plan.highlighted ? 'pricing.proDescription' : 'pricing.starterDescription')}</p>
                  </div>
                  <span className={`whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-semibold ${plan.highlighted ? 'border-[#A37E5E]/50 bg-[#A37E5E]/10 text-[#8E6B4D]' : 'border-[#E5E2D9] bg-[#FAF9F5] text-[#2B362E]'}`}>{plan.badge}</span>
                </div>
                <div className="mt-5 flex items-baseline gap-2">
                  <span className="tabular-nums text-3xl font-semibold tracking-tight text-[#2B362E]">{formatPlanPrice(plan.price, plan.currency)}</span>
                  <span className="text-xs text-[#1C221E]/70">{plan.duration ? t('pricing.perDays', { count: plan.duration }) : t('pricing.forever')}</span>
                </div>
                <ul className="mt-5 flex-1 space-y-3 border-t border-[#E5E2D9] pt-5">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm leading-relaxed text-[#1C221E]">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#A37E5E]" strokeWidth={1.75} aria-hidden="true" />
                      <span>{t(`pricing.features.${feature}`)}</span>
                    </li>
                  ))}
                </ul>
                <Link to={`/register?role=${pricingRole}`} className={`mt-6 inline-flex h-10 cursor-pointer items-center justify-center rounded-lg px-4 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A37E5E] focus-visible:ring-offset-2 ${plan.highlighted ? 'bg-[#2B362E] text-white hover:bg-[#1F2822]' : 'border border-[#E5E2D9] bg-white text-[#2B362E] hover:bg-[#FAF9F5]'}`}>
                  {t('pricing.cta')}
                </Link>
                </article>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
      </section>
      </main>
      <Footer />
    </>
  );
}
