import { motion } from 'motion/react';
import { Sparkles, Target } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function AuthVisualPanel() {
  const { t } = useTranslation();

  return (
    <aside className="auth-photo relative flex min-h-[20rem] overflow-hidden rounded-xl text-[#FAF9F5] lg:min-h-full lg:items-end">
      <div className="relative z-10 w-full p-8 xl:p-12">
        <div className="mb-8 max-w-lg">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold tracking-wide text-[#FAF9F5] backdrop-blur-md">
            <Sparkles className="h-4 w-4 text-[#A37E5E]" strokeWidth={1.75} aria-hidden="true" />{t('auth.visualEyebrow')}
          </span>
          <h2 className="font-display text-3xl font-semibold leading-relaxed text-[#FAF9F5] xl:text-4xl">{t('auth.visualTitle')}</h2>
          <p className="mt-4 max-w-prose text-sm leading-relaxed text-[#FAF9F5]/90 xl:text-base">{t('auth.visualBody')}</p>
        </div>
        <motion.div
          className="max-w-sm rounded-xl border border-white/15 bg-white/10 p-6 backdrop-blur-md"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: [0, -5, 0] }}
          transition={{ opacity: { duration: 0.55 }, y: { duration: 5, repeat: Infinity, ease: 'easeInOut' } }}
          whileHover={{ y: -4 }}
        >
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/10"><Target className="h-5 w-5 text-[#A37E5E]" strokeWidth={1.75} aria-hidden="true" /></span>
            <div>
              <p className="text-xs font-medium tracking-wide text-[#FAF9F5]/80">{t('hero.aiFitBadge')}</p>
              <p className="mt-2 tabular-nums text-sm font-semibold text-[#FAF9F5]">94% <span className="text-[#A37E5E]">{t('hero.previewPill')}</span></p>
            </div>
          </div>
          <p className="mt-4 border-t border-white/15 pt-4 text-sm leading-relaxed text-[#FAF9F5]/90">{t('hero.allFieldsBadge')}</p>
        </motion.div>
      </div>
    </aside>
  );
}
