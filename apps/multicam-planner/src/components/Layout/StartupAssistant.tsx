import { useCallback, useMemo, useRef, useState } from 'react';
import { FiUpload, FiPlus, FiX, FiArrowRight, FiCheck } from 'react-icons/fi';
import { WelcomeDialog, createOnboardingState } from '@avplan/onboarding-core';
import { confirmDialog } from '@avplan/ui';
import { useStore } from '../../store/useStore';
import type { EditMode } from '../../types';
import { useTranslation } from '../../i18n';
import { useDomTheme } from '../../hooks/useDomTheme';
import { isEmbedded } from '../../hooks/useIsEmbedded';

type TFn = (key: string, en: string) => string;

const LEGACY_SEEN_KEY = 'mcplan-assistant-seen';

// Ordered steps of the "New Plan" wizard (issue #43): draw the floor plan, then
// the stages, then objects/persons, and finally the cameras.
const getWizardSteps = (t: TFn): { mode: EditMode; title: string; hint: string }[] => [
  { mode: 'floorplan', title: t('header.wizard.step1.title', '1 · Floor Plan'), hint: t('header.wizard.step1.hint', 'Upload a plan image/PDF, set the scale, and draw the walls.') },
  { mode: 'stage', title: t('header.wizard.step2.title', '2 · Stages'), hint: t('header.wizard.step2.hint', 'Add and size the stages. Everything else is locked for now.') },
  { mode: 'objects', title: t('header.wizard.step3.title', '3 · Objects & Persons'), hint: t('header.wizard.step3.hint', 'Place performers, instruments and props on the stage.') },
  { mode: 'cameras', title: t('header.wizard.step4.title', '4 · Cameras'), hint: t('header.wizard.step4.hint', 'Position the cameras and aim them at the action.') },
];

export default function StartupAssistant() {
  const { t } = useTranslation();
  const WIZARD_STEPS = getWizardSteps(t);
  const { loadProject, setEditMode } = useStore();
  const language = useStore((s) => s.language);
  const theme = useDomTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Bewusst sessionStorage: der Assistent darf pro Sitzung einmal erscheinen
  // (nicht nur einmal pro Installation). Dialog-UI und Seen-State kommen aus
  // dem suite-weiten @avplan/onboarding-core.
  const onboarding = useMemo(
    () =>
      createOnboardingState({
        appId: 'multicam-planner',
        storage: typeof window !== 'undefined' ? window.sessionStorage : undefined,
        migrateFrom: [{ key: LEGACY_SEEN_KEY, flag: 'welcome' }],
      }),
    [],
  );
  // Embedded in the suite shell, the sessionStorage-backed assistant would
  // re-open on every shell reload — suppress auto-open there and start 'done'.
  const [phase, setPhase] = useState<'choose' | 'wizard' | 'done'>(
    isEmbedded || onboarding.hasSeen('welcome') ? 'done' : 'choose',
  );
  const [stepIndex, setStepIndex] = useState(0);

  const markSeen = useCallback(() => onboarding.markSeen('welcome'), [onboarding]);

  const dismiss = useCallback(() => { markSeen(); setPhase('done'); }, [markSeen]);

  const startWizard = useCallback(async () => {
    // Seit der automatischen Sicherung (cable-planner#908) steht hier beim
    // Start das zuletzt bearbeitete Projekt, nicht mehr ein leeres. „Neuer
    // Plan" muss es deshalb wirklich ersetzen — und fragen, wenn dabei
    // Arbeit verlorenginge, die in keiner Datei liegt.
    // `hasUnsavedChanges` vergleicht Projektstaende und sieht damit JEDE
    // Aenderung seit dem letzten Speichern — auch eine, die nur Buehnen oder
    // Raummasse betrifft. Eine Inhaltsliste daneben uebersah genau die.
    const s = useStore.getState();
    // `confirmDialog` statt `window.confirm` (suite `dialogs:native`): der
    // native Dialog kann keinen roten Knopf, und hier wird Arbeit verworfen.
    if (s.hasUnsavedChanges()
      && !(await confirmDialog(t('header.new.confirm', 'New project — the current one is replaced. Continue?'), { destructive: true }))) return;
    s.newProject();
    markSeen();
    setStepIndex(0);
    setEditMode(WIZARD_STEPS[0].mode);
    setPhase('wizard');
  }, [markSeen, setEditMode, WIZARD_STEPS, t]);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Derselbe Schutz wie bei „Neuer Plan": seit der automatischen Sicherung
    // steht hier das zuletzt bearbeitete Projekt, und ein Laden ohne Frage
    // ueberschriebe eine Sekunde spaeter auch die Sicherung.
    if (file && useStore.getState().hasUnsavedChanges()
      && !(await confirmDialog(t('header.open.confirm', 'Open a plan — the current one is replaced and it has unsaved changes. Continue?'), { destructive: true }))) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    if (file) await loadProject(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setEditMode('cameras'); // an existing plan jumps straight to camera editing
    dismiss();
  }, [loadProject, setEditMode, dismiss, t]);

  const nextStep = useCallback(() => {
    setStepIndex((i) => {
      const next = i + 1;
      if (next >= WIZARD_STEPS.length) {
        setEditMode('all');
        setPhase('done');
        return i;
      }
      setEditMode(WIZARD_STEPS[next].mode);
      return next;
    });
  }, [setEditMode, WIZARD_STEPS]);

  const finishWizard = useCallback(() => { setEditMode('all'); setPhase('done'); }, [setEditMode]);

  if (phase === 'done') return null;

  if (phase === 'wizard') {
    const step = WIZARD_STEPS[stepIndex];
    const isLast = stepIndex === WIZARD_STEPS.length - 1;
    return (
      <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[60] w-[420px] max-w-[92vw] border border-bc-border bg-bc-panel px-4 py-3">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <div className="text-bc-yellow text-xs font-semibold">{step.title}</div>
            <div className="text-bc-text text-xs mt-1 leading-relaxed">{step.hint}</div>
          </div>
          <button onClick={finishWizard} className="p-1 text-bc-dim hover:text-bc-text-bright" title={t('header.wizard.exit', 'Exit assistant (unlock everything)')}>
            <FiX size={14} />
          </button>
        </div>
        <div className="flex items-center justify-between mt-3">
          <div className="flex gap-1">
            {WIZARD_STEPS.map((s, i) => (
              <span key={s.mode} className={`h-1.5 w-6 ${i <= stepIndex ? 'bg-bc-yellow' : 'bg-bc-border'}`} />
            ))}
          </div>
          <button
            onClick={isLast ? finishWizard : nextStep}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-bc-accent text-bc-accent-text text-xs font-medium hover:bg-bc-accent/80"
          >
            {isLast ? <><FiCheck size={13} /> {t('header.wizard.finish', 'Finish')}</> : <>{t('header.wizard.next', 'Next')} <FiArrowRight size={13} /></>}
          </button>
        </div>
      </div>
    );
  }

  // phase === 'choose' — suite-einheitlicher Welcome-Dialog.
  // Wiederhergestellt aus der automatischen Sicherung und nicht leer: dann
  // ist Weiterarbeiten die naheliegende Wahl und steht oben.
  const st = useStore.getState();
  const fortsetzen =
    st.cameras.length > 0 || st.persons.length > 0 || st.walls.length > 0 || st.backgroundPlan !== null || st.hasUnsavedChanges();
  return (
    <>
      <WelcomeDialog
        open
        lang={language}
        theme={theme}
        accent="#3b82f6"
        title={t('header.welcome.title', 'Welcome to MultiCam Planner')}
        intro={t('header.welcome.intro', 'How would you like to start?')}
        onDismiss={dismiss}
        actions={[
          ...(fortsetzen
            ? [
                {
                  id: 'continue',
                  title: t('header.welcome.continue.title', 'Continue last project'),
                  description: t(
                    'header.welcome.continue.desc',
                    'The project you last worked on, restored from the automatic backup',
                  ),
                  icon: <FiArrowRight size={20} />,
                  accent: '#3b82f6',
                  onSelect: dismiss,
                },
              ]
            : []),
          {
            id: 'load',
            title: t('header.welcome.load.title', 'Load Plan'),
            description: t('header.welcome.load.desc', 'Open an existing .mcplan file and jump to camera editing'),
            icon: <FiUpload size={20} />,
            accent: '#3b82f6',
            onSelect: () => fileInputRef.current?.click(),
          },
          {
            id: 'new',
            title: t('header.welcome.new.title', 'New Plan'),
            description: t('header.welcome.new.desc', 'Step through floor plan → stages → objects → cameras'),
            icon: <FiPlus size={20} />,
            accent: '#eab308',
            onSelect: startWizard,
          },
        ]}
      />
      <input ref={fileInputRef} type="file" accept=".mcplan,.json" className="hidden" onChange={handleFileChange} />
    </>
  );
}
