import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';

export default function LanguageSwitcher({ dark = false }) {
  const { i18n, t } = useTranslation();
  const isArabic = i18n.language === 'ar';

  return (
    <button
      type="button"
      className={`relative inline-grid h-8 w-16 cursor-pointer grid-cols-2 overflow-hidden rounded-full border p-1 text-[10px] font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A37E5E] focus-visible:ring-offset-2 ${dark ? 'border-white/30 bg-white/10 text-[#FAF9F5] hover:bg-white/15 focus-visible:ring-offset-[#2B362E]' : 'border-[#E5E2D9] bg-[#FAF9F5] text-[#2B362E] hover:bg-white'}`}
      onClick={() => i18n.changeLanguage(isArabic ? 'en' : 'ar')}
      dir="ltr"
      aria-label={t(isArabic ? 'common.switchToEnglish' : 'common.switchToArabic')}
      title={t('common.language')}
      aria-pressed={isArabic}
    >
      <motion.span
        className={`absolute start-1 top-1 h-6 w-7 rounded-full ${dark ? 'bg-[#FAF9F5]' : 'bg-[#2B362E]'}`}
        animate={{ x: isArabic ? 28 : 0 }}
        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
        aria-hidden="true"
      />
      <span className={`relative z-10 inline-flex items-center justify-center ${!isArabic ? (dark ? 'text-[#2B362E]' : 'text-white') : ''}`}>EN</span>
      <span className={`relative z-10 inline-flex items-center justify-center ${isArabic ? (dark ? 'text-[#2B362E]' : 'text-white') : ''}`}>عربي</span>
    </button>
  );
}
