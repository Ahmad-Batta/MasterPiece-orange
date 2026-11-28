import { useState } from 'react';
import { FilePenLine, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Button from './Button';
import FileDropzone from './FileDropzone';
import IconBadge from './IconBadge';
import ModalShell from './ModalShell';
import { isSupportedResume, resumeAccept } from '../utils/seekerProfile';

export default function SeekerOnboardingModal({ onChoose, onSkip }) {
  const { t } = useTranslation();
  const [resume, setResume] = useState(null);
  const [invalid, setInvalid] = useState(false);

  return (
    <ModalShell className="fixed inset-0 z-[70] flex items-center justify-center bg-[#1C221E]/45 p-4" onClose={onSkip}>
      <section role="dialog" aria-modal="true" aria-labelledby="seeker-onboarding-title"
        className="surface-card max-h-[90dvh] w-full max-w-3xl overflow-auto">
        <h2 id="seeker-onboarding-title" className="section-title">{t('seeker.onboarding.title')}</h2>
        <p className="mt-2 text-sm leading-relaxed text-[#1C221E]/75">{t('seeker.onboarding.intro')}</p>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <article className="flex min-w-0 flex-col justify-between gap-6 rounded-xl border border-[#E5E2D9] bg-[#FAF9F5] p-6 transition-colors hover:border-[#A37E5E]/60">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <IconBadge icon={Sparkles} tone="bronze" large />
                <span className="rounded-full border border-[#E5E2D9] bg-white px-3 py-1 text-xs font-medium text-[#2B362E]">{t('seeker.onboarding.aiBadge')}</span>
              </div>
              <div>
                <h3 className="font-semibold text-[#2B362E]">{t('seeker.onboarding.upload')}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#1C221E]/75">{t('seeker.onboarding.uploadBody')}</p>
              </div>
              <FileDropzone label={t('uploads.chooseCv')} hint={t('uploads.cvHint')} accept={resumeAccept}
                file={resume} error={invalid ? t('seeker.onboarding.invalid') : undefined} onSelect={(file) => {
                  const valid = file && isSupportedResume(file);
                  setResume(valid ? file : null);
                  setInvalid(Boolean(file && !valid));
                }} />
            </div>
            <Button className="w-full" disabled={!resume} onClick={() => onChoose('upload', resume)}>
              {t('seeker.onboarding.continueUpload')}
            </Button>
          </article>
          <article className="flex min-w-0 flex-col justify-between gap-6 rounded-xl border border-[#E5E2D9] bg-[#FAF9F5] p-6 transition-colors hover:border-[#A37E5E]/60">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <IconBadge icon={FilePenLine} large />
                <span className="rounded-full border border-[#E5E2D9] bg-white px-3 py-1 text-xs font-medium text-[#2B362E]">{t('seeker.onboarding.manualBadge')}</span>
              </div>
              <div>
                <h3 className="font-semibold text-[#2B362E]">{t('seeker.onboarding.scratch')}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#1C221E]/75">{t('seeker.onboarding.scratchBody')}</p>
              </div>
            </div>
            <Button variant="secondary" className="w-full" onClick={() => onChoose('scratch', null)}>{t('seeker.onboarding.openStudio')}</Button>
          </article>
        </div>
        <div className="mt-6 flex justify-end"><Button variant="secondary" onClick={onSkip}>{t('seeker.onboarding.skip')}</Button></div>
      </section>
    </ModalShell>
  );
}
