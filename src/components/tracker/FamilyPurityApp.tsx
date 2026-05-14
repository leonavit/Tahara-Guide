import { useStore } from "@nanostores/react";
import { gsap } from "gsap";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ArrowDown,
  BookOpenText,
  CalendarDays,
  Check,
  CheckCircle2,
  CircleHelp,
  Droplets,
  Info,
  MoonStar,
  Phone,
  RefreshCcw,
  Scissors,
  Share2,
  Sparkles,
  Sunset,
  Waves,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  PHASES,
  calculateCleanDayStart,
  calculateEarliestHefsekDate,
  canEnterMikvehPhase,
  dayHasMandatoryCompletion,
  formatDisplayDate,
  formatHebrewDate,
  getCompletedChecksCount,
  getMandatoryCompletionCount,
  getUnlockedPhases,
  type CheckSlot,
  type CheckStatus,
  type PhaseId,
  type TrackerState,
} from "../../lib/tracker";
import {
  CONTACTS,
  INTRO_NOTES,
  INTRO_PARAGRAPHS,
  LAW_SECTIONS,
  PHASE_LAW_SECTION_IDS,
  getWhatsAppLink,
  type LawSectionId,
} from "../../lib/siteGuideContent";
import {
  beginHefsekPhase,
  dismissWarning,
  initializeTrackerStore,
  moveToMikvehPhase,
  restartTracker,
  setActivePhase,
  setCleanDayStatus,
  setHefsekConfirmed,
  setHefsekDate,
  setPeriodStartDate,
  toggleMikvehChecklistItem,
  trackerStore,
} from "../../stores/tracker";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { StageContainer } from "./StageContainer";

const phaseIcons: Record<PhaseId, LucideIcon> = {
  period: Droplets,
  hefsek: Sunset,
  "clean-days": Sparkles,
  mikveh: MoonStar,
};

const mikvehChecklistIcons: Record<string, LucideIcon> = {
  barriers: Sparkles,
  nails: Scissors,
  wash: Droplets,
  comb: Waves,
  "final-review": CheckCircle2,
};

const dateFieldShellClass =
  "relative mt-3 overflow-hidden rounded-2xl border border-white/70 bg-white/90 shadow-sm transition focus-within:border-brand-rose focus-within:ring-2 focus-within:ring-brand-rose/35";

const dateFieldDisplayClass =
  "flex min-h-[3.25rem] items-center justify-between gap-3 px-4 py-3 pr-4 pl-12 text-base text-slate-800";

const dateInputClass = "native-date-input absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0";

const summaryTimestampFormatter = new Intl.DateTimeFormat("he-IL", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function formatSummaryDate(dateString: string) {
  if (!dateString) {
    return "טרם נבחר";
  }

  const hebrewDate = formatHebrewDate(dateString);

  return hebrewDate ? `${formatDisplayDate(dateString)} | ${hebrewDate}` : formatDisplayDate(dateString);
}

function formatCheckStatusLabel(status: CheckStatus) {
  return status === "done" ? "סומנה" : "טרם סומנה";
}

function buildTrackerSummary(tracker: TrackerState) {
  const lines = [
    "סיכום תהליך טהרת המשפחה",
    "",
    `תאריך תחילת הדימום: ${formatSummaryDate(tracker.periodStartDate)}`,
    `יום הפסק טהרה: ${formatSummaryDate(tracker.hefsekDate)}`,
    `סימון שהבדיקה הצליחה: ${tracker.hefsekConfirmed ? "סומן" : "טרם סומן"}`,
    `תחילת שבעה נקיים: ${formatSummaryDate(tracker.hefsekDate ? calculateCleanDayStart(tracker.hefsekDate) : "")}`,
    `ליל הטבילה: ${formatSummaryDate(tracker.mikvehNightDate)}`,
  ];

  if (tracker.cleanDays.length) {
    lines.push("", "שבעה נקיים");
    tracker.cleanDays.forEach((day) => {
      lines.push(
        `יום ${day.dayNumber}: ${formatSummaryDate(day.date)} | בדיקת בוקר: ${formatCheckStatusLabel(day.morning)} | בדיקת ערב: ${formatCheckStatusLabel(day.evening)}${day.mandatory ? " | יום חובה" : ""}`,
      );
    });
  }

  if (tracker.mikvehChecklist.length) {
    lines.push("", "הכנות לטבילה");
    tracker.mikvehChecklist.forEach((item) => {
      lines.push(`- ${item.label}: ${item.checked ? "סומן" : "טרם סומן"}`);
    });
  }

  if (tracker.lastUpdatedAt) {
    lines.push("", `עודכן לאחרונה: ${summaryTimestampFormatter.format(new Date(tracker.lastUpdatedAt))}`);
  }

  return lines.join("\n");
}

function downloadTrackerSummary(summaryText: string, tracker: TrackerState) {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return;
  }

  const datePart = tracker.mikvehNightDate || tracker.hefsekDate || tracker.periodStartDate || "summary";
  const blob = new Blob([summaryText], { type: "text/plain;charset=utf-8" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `tahara-process-summary-${datePart}.txt`;
  document.body.append(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

type OverlaySheetKey = "intro" | "laws";
type PhaseNavigationDirection = "back" | "next";
type PhaseNavigationVariant = "ghost" | "primary";

interface PhaseNavigationAction {
  direction: PhaseNavigationDirection;
  disabled?: boolean;
  label: string;
  onClick: () => void;
  variant: PhaseNavigationVariant;
}

export default function FamilyPurityApp() {
  const tracker = useStore(trackerStore);
  const heroRef = useRef<HTMLElement | null>(null);
  const checklistRef = useRef<HTMLDivElement | null>(null);
  const stepsRef = useRef<HTMLDivElement | null>(null);
  const phaseRef = useRef<HTMLDivElement | null>(null);
  const stageAnchorRef = useRef<HTMLDivElement | null>(null);
  const contactSectionRef = useRef<HTMLDivElement | null>(null);
  const hefsekSuccessButtonRef = useRef<HTMLButtonElement | null>(null);
  const phaseIconsAnimatedRef = useRef(false);
  const contactCardsAnimatedRef = useRef(false);
  const previousPhaseRef = useRef<PhaseId | null>(null);
  const [activeOverlay, setActiveOverlay] = useState<OverlaySheetKey | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [isFloatingNavVisible, setIsFloatingNavVisible] = useState(false);
  const [expandedFloatingDirection, setExpandedFloatingDirection] = useState<PhaseNavigationDirection | null>(null);
  const [canHoverExpandFloatingNav, setCanHoverExpandFloatingNav] = useState(false);
  const [isSharingSummary, setIsSharingSummary] = useState(false);
  const [pendingLawAnchor, setPendingLawAnchor] = useState<{ id: LawSectionId; token: number } | null>(null);
  const [shareSummaryMessage, setShareSummaryMessage] = useState<string | null>(null);

  useEffect(() => {
    initializeTrackerStore();
  }, []);

  useLayoutEffect(() => {
    const hero = heroRef.current;

    if (!hero) {
      return;
    }

    const ctx = gsap.context(() => {
      const words = gsap.utils.toArray<HTMLElement>("[data-hero-word]");
      const lines = gsap.utils.toArray<HTMLElement>("[data-hero-line]");
      const bloom = hero.querySelector("[data-hero-bloom]");
      const ctas = gsap.utils.toArray<HTMLElement>("[data-hero-cta]");

      gsap.set(words, { display: "inline-block", transformOrigin: "50% 100%" });

      const timeline = gsap.timeline({
        defaults: { ease: "power4.out" },
      });

      timeline.fromTo(
        words,
        { autoAlpha: 0, yPercent: 120, rotateX: -68, filter: "blur(14px)" },
        { autoAlpha: 1, yPercent: 0, rotateX: 0, filter: "blur(0px)", duration: 1, stagger: 0.12 },
      );

      if (lines.length) {
        timeline.fromTo(
          lines,
          { autoAlpha: 0, y: 24, filter: "blur(10px)" },
          { autoAlpha: 1, y: 0, filter: "blur(0px)", duration: 0.72, stagger: 0.12 },
          "-=0.46",
        );
      }

      if (bloom) {
        timeline.fromTo(
          bloom,
          { autoAlpha: 0, scale: 0.82, rotate: -8 },
          { autoAlpha: 1, scale: 1, rotate: 0, duration: 0.9, ease: "back.out(1.4)" },
          "-=0.42",
        );
      }

      if (ctas.length) {
        timeline.fromTo(
          ctas,
          { autoAlpha: 0, y: 18, scale: 0.96 },
          { autoAlpha: 1, y: 0, scale: 1, duration: 0.58, ease: "power3.out", stagger: 0.08 },
          "-=0.36",
        );
      }
    }, hero);

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    const checklist = checklistRef.current;

    if (tracker.activePhase !== "mikveh" || !checklist) {
      return;
    }

    const ctx = gsap.context(() => {
      const items = checklist.querySelectorAll("[data-checklist-item]");

      if (items.length) {
        gsap.fromTo(
          items,
          { autoAlpha: 0, y: 18 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.42,
            ease: "power2.out",
            stagger: 0.08,
          },
        );
      }
    }, checklist);

    return () => ctx.revert();
  }, [tracker.activePhase]);

  useEffect(() => {
    const steps = stepsRef.current;
    const phase = phaseRef.current;

    if (!hasStarted || !steps || !phase) {
      return;
    }

    const ctx = gsap.context(() => {
      const timeline = gsap.timeline({
        defaults: { duration: 0.55, ease: "power3.out" },
      });

      timeline
        .fromTo(steps, { autoAlpha: 0, y: 28 }, { autoAlpha: 1, y: 0 })
        .fromTo(phase, { autoAlpha: 0, y: 34 }, { autoAlpha: 1, y: 0 }, "-=0.22");

      requestAnimationFrame(() => {
        steps.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });

    return () => ctx.revert();
  }, [hasStarted]);

  useEffect(() => {
    const contactSection = contactSectionRef.current;

    if (!contactSection || contactCardsAnimatedRef.current) {
      return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      contactCardsAnimatedRef.current = true;
      return;
    }

    const cards = Array.from(
      contactSection.querySelectorAll<HTMLElement>("[data-contact-card]"),
    );

    if (!cards.length) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) {
          return;
        }

        contactCardsAnimatedRef.current = true;

        gsap.fromTo(
          cards,
          { autoAlpha: 0, y: 26 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.6,
            ease: "power3.out",
            stagger: 0.12,
            clearProps: "opacity,transform",
          },
        );

        observer.disconnect();
      },
      { threshold: 0.2 },
    );

    observer.observe(contactSection);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const button = hefsekSuccessButtonRef.current;

    if (!button) {
      return;
    }

    if (
      tracker.activePhase !== "hefsek" ||
      tracker.hefsekConfirmed ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      gsap.killTweensOf(button);
      gsap.set(button, { clearProps: "transform" });
      return;
    }

    gsap.set(button, { y: 0, scale: 1, transformOrigin: "50% 50%" });

    const timeline = gsap.timeline({ repeat: -1, repeatDelay: 0.12 });
    timeline
      .to(button, {
        y: -56,
        scaleX: 0.955,
        scaleY: 1.08,
        duration: 0.18,
        ease: "power1.inOut",
      })
      .to(button, {
        y: 0,
        scaleX: 1,
        scaleY: 1,
        duration: 0.82,
        ease: "bounce.out",
      });

    return () => {
      timeline.kill();
      gsap.set(button, { clearProps: "transform" });
    };
  }, [tracker.activePhase, tracker.hefsekConfirmed]);

  useEffect(() => {
    const steps = stepsRef.current;

    if (!hasStarted || !steps || phaseIconsAnimatedRef.current) {
      return;
    }

    const ctx = gsap.context(() => {
      const icons = steps.querySelectorAll("[data-phase-icon]");

      if (!icons.length) {
        return;
      }

      phaseIconsAnimatedRef.current = true;

      gsap.fromTo(
        icons,
        { autoAlpha: 0, scale: 0.3, rotate: -140 },
        {
          autoAlpha: 1,
          scale: 1,
          rotate: 0,
          duration: 0.75,
          ease: "back.out(2)",
          stagger: 0.1,
          delay: 0.28,
        },
      );
    }, steps);

    return () => ctx.revert();
  }, [hasStarted]);

  useEffect(() => {
    if (!hasStarted) {
      return;
    }

    const previousPhase = previousPhaseRef.current;

    if (previousPhase && previousPhase !== tracker.activePhase) {
      requestAnimationFrame(() => {
        stageAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }

    previousPhaseRef.current = tracker.activePhase;
  }, [hasStarted, tracker.activePhase]);

  useEffect(() => {
    if (!activeOverlay) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveOverlay(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeOverlay]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
    const updateFloatingHoverCapability = () => {
      setCanHoverExpandFloatingNav(mediaQuery.matches);
    };

    updateFloatingHoverCapability();
    mediaQuery.addEventListener("change", updateFloatingHoverCapability);

    return () => mediaQuery.removeEventListener("change", updateFloatingHoverCapability);
  }, []);

  useEffect(() => {
    if (!hasStarted || activeOverlay) {
      setIsFloatingNavVisible(false);
      return;
    }

    const updateFloatingNavVisibility = () => {
      const hero = heroRef.current;

      if (!hero) {
        setIsFloatingNavVisible(false);
        return;
      }

      setIsFloatingNavVisible(hero.getBoundingClientRect().bottom <= 24);
    };

    updateFloatingNavVisibility();
    window.addEventListener("scroll", updateFloatingNavVisibility, { passive: true });
    window.addEventListener("resize", updateFloatingNavVisibility);

    return () => {
      window.removeEventListener("scroll", updateFloatingNavVisibility);
      window.removeEventListener("resize", updateFloatingNavVisibility);
    };
  }, [activeOverlay, hasStarted]);

  useEffect(() => {
    if (activeOverlay !== "laws" || !pendingLawAnchor || typeof window === "undefined") {
      return;
    }

    const scrollTimeout = window.setTimeout(() => {
      const targetSection = document.querySelector<HTMLElement>(`[data-law-section-id="${pendingLawAnchor.id}"]`);
      targetSection?.scrollIntoView({ behavior: "smooth", block: "start" });
      setPendingLawAnchor(null);
    }, 180);

    return () => window.clearTimeout(scrollTimeout);
  }, [activeOverlay, pendingLawAnchor]);

  const earliestHefsekDate = tracker.periodStartDate
    ? calculateEarliestHefsekDate(tracker.periodStartDate)
    : "";
  const cleanDayStart = tracker.hefsekDate ? calculateCleanDayStart(tracker.hefsekDate) : "";
  const unlockedPhases = getUnlockedPhases(tracker);
  const completedChecks = getCompletedChecksCount(tracker.cleanDays);
  const mandatoryCompleted = getMandatoryCompletionCount(tracker.cleanDays);
  const mikvehReady = canEnterMikvehPhase(tracker);
  const preparationCompleted = tracker.mikvehChecklist.filter((item) => item.checked).length;
  const allPreparationsComplete =
    tracker.mikvehChecklist.length > 0 &&
    tracker.mikvehChecklist.every((item) => item.checked);
  const activePhase = PHASES.find((phase) => phase.id === tracker.activePhase) ?? PHASES[0];
  const hasExistingProgress = Boolean(
    tracker.periodStartDate ||
      tracker.hefsekConfirmed ||
      tracker.cleanDays.some((day) => day.morning === "done" || day.evening === "done") ||
      tracker.mikvehChecklist.some((item) => item.checked),
  );

  useEffect(() => {
    if (hasExistingProgress && !hasStarted) {
      setHasStarted(true);
    }
  }, [hasExistingProgress, hasStarted]);

  const revealTracker = () => {
    if (hasStarted) {
      stepsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    setHasStarted(true);
  };

  const openPhaseLaws = (phaseId: PhaseId) => {
    setPendingLawAnchor({
      id: PHASE_LAW_SECTION_IDS[phaseId],
      token: Date.now(),
    });
    setActiveOverlay("laws");
  };

  const phaseNavigationActions: PhaseNavigationAction[] = (() => {
    switch (tracker.activePhase) {
      case "period":
        return [
          {
            direction: "next",
            disabled: !tracker.periodStartDate,
            label: "מעבר להפסק טהרה",
            onClick: beginHefsekPhase,
            variant: "primary",
          },
        ];
      case "hefsek":
        return [
          {
            direction: "next",
            disabled: !tracker.hefsekConfirmed,
            label: "פתיחת שבעה נקיים",
            onClick: () => setActivePhase("clean-days"),
            variant: "primary",
          },
          {
            direction: "back",
            label: "חזרה לימי הנדודים",
            onClick: () => setActivePhase("period"),
            variant: "ghost",
          },
        ];
      case "clean-days":
        return [
          {
            direction: "next",
            disabled: !mikvehReady,
            label: "מעבר לשלב הטבילה",
            onClick: moveToMikvehPhase,
            variant: "primary",
          },
          {
            direction: "back",
            label: "חזרה להפסק טהרה",
            onClick: () => setActivePhase("hefsek"),
            variant: "ghost",
          },
        ];
      case "mikveh":
        return [
          {
            direction: "back",
            label: "חזרה לשבעה נקיים",
            onClick: () => setActivePhase("clean-days"),
            variant: "ghost",
          },
        ];
    }
  })();
  const availableFloatingActions = phaseNavigationActions.filter((action) => !action.disabled);

  const renderPhaseNavigation = () => {
    if (!phaseNavigationActions.length) {
      return null;
    }

    return (
      <div className="mt-8 grid gap-3 sm:flex sm:flex-wrap" data-stage-item>
        {phaseNavigationActions.map((action) => (
          <PhaseNavigationButton key={`${tracker.activePhase}-${action.direction}`} action={action} />
        ))}
      </div>
    );
  };

  const renderFloatingNavigation = () => {
    if (!isFloatingNavVisible || !availableFloatingActions.length) {
      return null;
    }

    const floatingNavigation = (
      <div className="pointer-events-none fixed inset-x-0 bottom-5 z-[2147483647] overflow-visible px-4 min-[1300px]:hidden">
        <div
          className={[
            "pointer-events-auto mx-auto flex max-w-7xl items-center px-1 sm:px-6 lg:px-8",
            availableFloatingActions.length === 1 ? "justify-center" : "justify-between gap-3",
          ].join(" ")}
        >
          {availableFloatingActions.map((action) => (
            <FloatingNavigationButton
              key={`floating-${tracker.activePhase}-${action.direction}`}
              action={action}
              allowInteractiveExpand={canHoverExpandFloatingNav && action.direction !== "next"}
              expanded={
                action.direction === "next" ||
                (canHoverExpandFloatingNav && expandedFloatingDirection === action.direction)
              }
              onExpandChange={(isExpanded) => {
                setExpandedFloatingDirection(isExpanded ? action.direction : null);
              }}
            />
          ))}
        </div>
      </div>
    );

    if (typeof document === "undefined") {
      return null;
    }

    return createPortal(floatingNavigation, document.body);
  };

  const handleShareSummary = async () => {
    const summaryText = buildTrackerSummary(tracker);
    setShareSummaryMessage(null);

    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        setIsSharingSummary(true);
        await navigator.share({
          title: "סיכום תהליך טהרת המשפחה",
          text: summaryText,
        });
        setShareSummaryMessage("חלון השיתוף נפתח עם סיכום התהליך.");
        return;
      }

      downloadTrackerSummary(summaryText, tracker);
      setShareSummaryMessage("נוצר קובץ סיכום לשמירה במכשיר.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      downloadTrackerSummary(summaryText, tracker);
      setShareSummaryMessage("לא נפתח חלון שיתוף, לכן נוצר קובץ סיכום לשמירה.");
    } finally {
      setIsSharingSummary(false);
    }
  };

  const scrollToContactSection = () => {
    contactSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const renderPhase = () => {
    switch (tracker.activePhase) {
      case "period":
        return (
          <Card className="stage-ornament overflow-hidden" tone="rose">
            <div className="max-w-4xl" data-stage-item>
              <StageEyebrow label="שלב 1" onLawsClick={() => openPhaseLaws("period")} />
              <h2 className="mt-2 font-heading text-3xl text-slate-900">ימי הנדודים</h2>
              <p className="mt-4 max-w-3xl text-slate-700">
                בחרי את יום תחילת הדימום. מכאן המערכת מחשבת את היום המוקדם ביותר
                להפסק טהרה, לפי מינימום של חמישה ימים מתחילת הראייה.
              </p>

              <DateInputField
                label="תאריך תחילת הדימום"
                value={tracker.periodStartDate}
                onChange={setPeriodStartDate}
              />

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Card className="bg-white/80" tone="default">
                  <InfoLabel label="היום המוקדם להפסק טהרה" />
                  {tracker.periodStartDate ? (
                    <DualDateText
                      date={earliestHefsekDate}
                      primaryClassName="mt-2 text-lg font-semibold text-slate-900"
                    />
                  ) : (
                    <p className="mt-2 text-lg font-semibold text-slate-900">יופיע לאחר בחירת תאריך</p>
                  )}
                </Card>

                <Card className="bg-white/80" tone="default">
                  <InfoLabel icon="question" label="מה קורה עכשיו?" />
                  <p className="mt-2 text-slate-700">
                    עד לשלב הבא נשארים בימי הנדודים. כשהדימום פוסק והיום החמישי
                    מגיע, אפשר לעבור להפסק טהרה.
                  </p>
                </Card>
              </div>
            </div>

            {renderPhaseNavigation()}
          </Card>
        );

      case "hefsek":
        return (
          <Card className="stage-ornament overflow-hidden" tone="default">
            <div className="grid gap-5 lg:grid-cols-[1.08fr_0.92fr] lg:items-start">
              <div data-stage-item>
                <StageEyebrow label="שלב 2" onLawsClick={() => openPhaseLaws("hefsek")} />
                <h2 className="mt-2 font-heading text-3xl text-slate-900">הפסק טהרה</h2>
                <p className="mt-4 max-w-3xl text-slate-700">
                  בחרי את היום שבו פסק הדימום. הבדיקה נעשית סמוך לשקיעה, ורק לאחר
                  שהבדיקה יצאה נקייה אפשר לפתוח את שבעת הימים הנקיים.
                </p>

                <DateInputField
                  label="יום הפסק הטהרה"
                  min={earliestHefsekDate}
                  value={tracker.hefsekDate}
                  onChange={setHefsekDate}
                />

                <div className="mt-5 ml-auto grid max-w-xl gap-4 sm:grid-cols-2">
                  <Card className="bg-bg-stone/85" tone="stone">
                    <InfoLabel label="תחילת שבעה נקיים" />
                    {tracker.hefsekDate ? (
                      <DualDateText
                        date={cleanDayStart}
                        primaryClassName="mt-2 font-semibold text-slate-900"
                      />
                    ) : (
                      <p className="mt-2 font-semibold text-slate-900">יופיע לאחר בחירת תאריך</p>
                    )}
                  </Card>
                  <Card className="bg-status-sage/45" tone="sage">
                    <InfoLabel label="ליל הטבילה המחושב" />
                    {tracker.hefsekDate ? (
                      <DualDateText
                        date={tracker.mikvehNightDate}
                        primaryClassName="mt-2 font-semibold text-slate-900"
                        suffix="אחרי צאת הכוכבים"
                      />
                    ) : (
                      <p className="mt-2 font-semibold text-slate-900">יופיע לאחר בחירת תאריך</p>
                    )}
                  </Card>
                </div>
              </div>

              <div className="space-y-4 lg:pt-9" data-stage-item>
                <p className="font-heading text-2xl text-text-plum">שלב הבדיקה</p>
                <Card tone="stone">
                  <div className="inline-flex items-center gap-2">
                    <Info className="h-4 w-4 text-text-plum" />
                    <h3 className="font-heading text-lg text-slate-900">תזכורת קצרה</h3>
                  </div>
                  <ul className="mt-3 space-y-2 text-sm text-slate-700">
                    <li>לפני הבדיקה יש לרחוץ את אזור הבדיקה.</li>
                    <li>הבדיקה נעשית עם בד לבן נקי, סמוך לשקיעה.</li>
                    <li>אם יש ספק במראה שעל העד, כדאי להתייעץ עם רב מלווה.</li>
                  </ul>
                </Card>

                <button
                  ref={hefsekSuccessButtonRef}
                  aria-checked={tracker.hefsekConfirmed}
                  className={[
                    "relative flex w-full items-start gap-4 rounded-[1.75rem] border-2 px-5 py-4 text-right transition duration-300",
                    tracker.hefsekConfirmed
                      ? "border-status-olive bg-status-sage/65"
                      : "border-brand-rose/75 bg-white/88 shadow-blush hover:bg-white",
                  ].join(" ")}
                  role="switch"
                  type="button"
                  onClick={() => setHefsekConfirmed(!tracker.hefsekConfirmed)}
                >
                  <div className="relative z-10 flex items-start gap-3">
                    <div className="relative flex shrink-0 items-start">
                      <StatusCheckbox checked={tracker.hefsekConfirmed} className="mt-0.5" />
                      {!tracker.hefsekConfirmed ? (
                        <span
                          aria-hidden="true"
                          className="hefsek-pointer-cue pointer-events-none absolute top-full mt-1 inline-flex items-center justify-center text-lg"
                        >
                          ☝️
                        </span>
                      ) : null}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">סמני שהבדיקה הצליחה</p>
                      <p className="mt-1 text-sm text-slate-600">
                        סמני לאחר שבדיקת ההפסק יצאה נקייה.
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {renderPhaseNavigation()}
          </Card>
        );

      case "clean-days":
        return (
          <Card className="stage-ornament overflow-hidden" tone="default">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div data-stage-item>
                <StageEyebrow label="שלב 3" onLawsClick={() => openPhaseLaws("clean-days")} />
                <h2 className="mt-2 font-heading text-3xl text-slate-900">שבעה נקיים</h2>
                <p className="mt-3 max-w-3xl text-slate-700">
                  סמני בדיקות בוקר וערב לאורך שבעה ימים. ימים 1, 3 ו־7 מודגשים
                  כימי חובה מינימליים.
                </p>
              </div>

              <div className="sm:hidden" data-stage-item>
                <Card className="rounded-[1.7rem] !bg-[rgba(252,253,253,0.65)] px-4 py-2.5 text-center" tone="rose">
                  <p className="text-[0.68rem] uppercase tracking-[0.12em] text-slate-500">ליל טבילה</p>
                  <DualDateText
                    containerClassName="text-center"
                    date={tracker.mikvehNightDate}
                    primaryClassName="mt-1 text-sm font-semibold text-slate-900"
                    secondaryClassName="mt-1 text-xs text-text-plum/80"
                  />
                </Card>
              </div>

              <div className="hidden sm:grid sm:grid-cols-3 sm:gap-3" data-stage-item>
                <Card className="bg-bg-stone/88 p-3 text-center sm:p-4" tone="stone">
                  <p className="text-[0.68rem] uppercase tracking-[0.12em] text-slate-500 sm:text-xs">
                    בדיקות שסומנו
                  </p>
                  <p className="mt-1 text-lg font-semibold text-slate-900 sm:mt-2 sm:text-2xl">
                    {completedChecks}/14
                  </p>
                </Card>
                <Card className="bg-status-sage/55 p-3 text-center sm:p-4" tone="sage">
                  <p className="text-[0.68rem] uppercase tracking-[0.12em] text-slate-500 sm:text-xs">
                    ימי חובה
                  </p>
                  <p className="mt-1 text-lg font-semibold text-slate-900 sm:mt-2 sm:text-2xl">
                    {mandatoryCompleted}/3
                  </p>
                </Card>
                <Card className="bg-brand-blush/55 p-3 text-center sm:p-4" tone="rose">
                  <p className="text-[0.68rem] uppercase tracking-[0.12em] text-slate-500 sm:text-xs">
                    ליל טבילה
                  </p>
                  <DualDateText
                    containerClassName="text-center"
                    date={tracker.mikvehNightDate}
                    primaryClassName="mt-1 text-xs font-semibold text-slate-900 sm:mt-2 sm:text-sm"
                    secondaryClassName="mt-1 text-[0.68rem] text-text-plum/80 sm:text-xs"
                  />
                </Card>
              </div>
            </div>

            <div className="mt-6 grid gap-4 xl:grid-cols-2" data-stage-item>
              {tracker.cleanDays.map((day) => (
                <Card
                  key={day.dayNumber}
                  className={[
                    "border-white/75 bg-white/78",
                    day.mandatory ? "ring-1 ring-brand-rose/35" : "",
                  ].join(" ")}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-slate-900">יום {day.dayNumber}</p>
                      <DualDateText
                        date={day.date}
                        primaryClassName="text-sm text-slate-600"
                        secondaryClassName="mt-0.5 text-xs text-text-plum/80"
                      />
                    </div>
                    {day.mandatory ? (
                      <span className="rounded-full bg-brand-blush px-3 py-1 text-sm font-semibold text-text-plum">
                        חובה מינימלית
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <CheckSlotControl
                      label="בדיקת בוקר"
                      slot="morning"
                      status={day.morning}
                      onBlood={() => setCleanDayStatus(day.dayNumber, "morning", "blood")}
                      onToggle={() =>
                        setCleanDayStatus(
                          day.dayNumber,
                          "morning",
                          day.morning === "done" ? "pending" : "done",
                        )
                      }
                    />
                    <CheckSlotControl
                      label="בדיקת ערב"
                      slot="evening"
                      status={day.evening}
                      onBlood={() => setCleanDayStatus(day.dayNumber, "evening", "blood")}
                      onToggle={() =>
                        setCleanDayStatus(
                          day.dayNumber,
                          "evening",
                          day.evening === "done" ? "pending" : "done",
                        )
                      }
                    />
                  </div>

                  {day.mandatory ? (
                    <p className="mt-4 text-sm text-slate-600">
                      מצב יום חובה:{" "}
                      <span className="font-semibold text-slate-900">
                        {dayHasMandatoryCompletion(day) ? "הושלם" : "נדרשת לפחות בדיקה אחת"}
                      </span>
                    </p>
                  ) : null}
                </Card>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:hidden" data-stage-item>
              <Card className="rounded-[1.7rem] bg-bg-stone/88 px-3 py-3 text-center" tone="stone">
                <p className="text-[0.68rem] uppercase tracking-[0.12em] text-slate-500">בדיקות שסומנו</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{completedChecks}/14</p>
              </Card>
              <Card className="rounded-[1.7rem] bg-status-sage/55 px-3 py-3 text-center" tone="sage">
                <p className="text-[0.68rem] uppercase tracking-[0.12em] text-slate-500">ימי חובה</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{mandatoryCompleted}/3</p>
              </Card>
            </div>

            <div
              className="mt-6 rounded-3xl border border-brand-rose/45 bg-brand-blush/45 p-4 text-sm text-slate-700"
              data-stage-item
            >
              סימון &quot;מראה דמי&quot; מאפס את הספירה לצורך זהירות ומחזיר את המעקב
              לתחילת מחזור חדש. בכל ספק הלכתי, מומלץ להתייעץ עם רב מלווה.
            </div>

            {renderPhaseNavigation()}
          </Card>
        );

      case "mikveh":
        return (
          <Card className="stage-ornament overflow-hidden" tone="sage">
            <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
              <div data-stage-item>
                <StageEyebrow label="שלב 4" onLawsClick={() => openPhaseLaws("mikveh")} />
                <h2 className="mt-2 font-heading text-3xl text-slate-900">טבילה</h2>
                <p className="mt-4 max-w-2xl text-slate-700">
                  ליל הטבילה חל שבוע לאחר הפסק הטהרה, באותו יום בשבוע, והטבילה
                  עצמה היא בלילה אחרי צאת הכוכבים.
                </p>

                <div className="mt-6 rounded-[2rem] bg-[#cff9e4] p-5 shadow-none">
                  <InfoLabel label="ליל הטבילה" />
                  <DualDateText
                    date={tracker.mikvehNightDate}
                    primaryClassName="mt-2 text-2xl font-semibold text-slate-900"
                  />
                  <p className="mt-2 text-sm text-slate-600">הגעה לטבילה: אחרי צאת הכוכבים.</p>
                </div>

                <div className="mt-4 rounded-[2rem] bg-[#cff9e4] p-5 shadow-none">
                  <InfoLabel label="התקדמות בהכנות" />
                  <p className="mt-2 text-2xl font-semibold text-slate-900">
                    {preparationCompleted}/{tracker.mikvehChecklist.length}
                  </p>
                </div>

                {allPreparationsComplete ? (
                  <p className="mikveh-ready-note mt-3 text-sm text-slate-700">
                    כל ההכנות סומנו. מומלץ לבצע סקירה אחרונה סמוך ככל האפשר לטבילה.
                  </p>
                ) : null}
              </div>

              {!allPreparationsComplete ? (
                <div
                  className="flex flex-col items-center text-center lg:hidden"
                  data-stage-item
                >
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    סימון הכנות
                  </span>
                  <ArrowDown className="cta-arrow-bob mt-2 h-6 w-6 text-text-plum" />
                  <p className="mt-2 text-sm text-slate-600">יש לבצע את ההכנות ולסמן כל סעיף.</p>
                </div>
              ) : null}

              <div ref={checklistRef} className="space-y-3" data-stage-item>
                {tracker.mikvehChecklist.map((item) => {
                  const Icon = mikvehChecklistIcons[item.id] ?? Sparkles;

                  return (
                    <button
                      key={item.id}
                      className={[
                        "w-full rounded-[1.75rem] border px-5 py-4 text-right transition",
                        item.checked
                          ? "border-status-olive bg-white/90"
                          : "border-white/75 bg-white/78 hover:bg-white/90",
                      ].join(" ")}
                      data-checklist-item
                      type="button"
                      onClick={() => toggleMikvehChecklistItem(item.id)}
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className={[
                            "mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
                            item.checked ? "bg-[#e0efea] text-slate-900" : "bg-[#e0efea] text-text-plum",
                          ].join(" ")}
                        >
                          <Icon className="h-5 w-5" />
                        </div>

                        <div className="flex-1">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <StatusCheckbox checked={item.checked} className="mt-0.5" />
                              <div>
                                <p className="font-semibold text-slate-900">{item.label}</p>
                                <p className="mt-1 text-sm text-slate-600">{item.description}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {allPreparationsComplete ? (
              <div
                className="prayer-celebration mt-6 rounded-3xl border border-status-olive/35 bg-white/82 p-5 text-slate-800"
                data-stage-item
              >
                <div className="flex flex-col items-center text-center">
                  <span aria-hidden="true" className="prayer-illustration text-6xl leading-none">
                    🙏
                  </span>
                  <h3 className="mt-3 max-w-lg font-heading text-3xl leading-snug text-text-plum">
                    ״דָּרֵישׁ רַבִּי עֲקִיבָא:
                    <br />
                    אִישׁ וְאִשָּׁה זָכוּ - שְׁכִינָה בֵּינֵיהֶן.״
                    <span className="mt-1 block text-[12px] text-black">(סוטה י״ז א:ט״ו)</span>
                  </h3>
                  <div className="mt-5 flex w-full max-w-md flex-col items-center gap-3">
                    <Button
                      className="w-full sm:w-auto"
                      disabled={isSharingSummary}
                      onClick={handleShareSummary}
                      variant="secondary"
                    >
                      <Share2 className="h-4 w-4" />
                      {isSharingSummary ? "פותחת שיתוף..." : "שמור סיכום תהליך"}
                    </Button>
                    {shareSummaryMessage ? (
                      <p className="text-sm text-slate-600">{shareSummaryMessage}</p>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}

            {renderPhaseNavigation()}
          </Card>
        );
    }
  };

  return (
    <section className="grid gap-8">
      <section
        ref={heroRef}
        className="paper-shell overflow-hidden rounded-[2.75rem] border border-white/70 px-6 py-10 shadow-soft sm:px-8 sm:py-12"
      >
        <div className="mx-auto flex min-h-[68vh] max-w-4xl flex-col items-center justify-center lg:min-h-[40vh]">
          <div className="flex w-full max-w-3xl items-center justify-center gap-4 sm:gap-6">
            <div data-hero-bloom className="shrink-0">
              <CoverBloom className="hero-bloom w-[6.75rem] sm:w-[8rem]" />
            </div>

            <div className="text-right">
              <p className="cover-title text-4xl text-text-plum sm:text-6xl">
                <span data-hero-word>טהרת</span>{" "}
                <span data-hero-word>המשפחה</span>
              </p>
              <p data-hero-line className="mt-2 text-base text-text-plum/85 sm:text-xl">
                מדריך מעשי לציבור הכללי
              </p>
            </div>
          </div>

          <p
            data-hero-line
            className="mt-6 max-w-3xl text-center text-base font-normal leading-8 text-slate-700 sm:text-lg sm:leading-9"
          >
            כלי עזר אישי ופרטי למעקב אחר ימי הטהרה וההכנה לטבילה. פשוט נגיש ומלווה אותך צעד אחר צעד,
            מהווסת ועד ליל הטבילה.
          </p>

          <div className="mt-7 flex w-full max-w-3xl flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
            <Button data-hero-cta variant="ghost" onClick={() => setActiveOverlay("intro")}>
              הקדמה בקטנה
              <Info className="h-4 w-4" />
            </Button>
            <Button data-hero-cta variant="ghost" onClick={() => setActiveOverlay("laws")}>
              הלכות
              <BookOpenText className="h-4 w-4" />
            </Button>
            <Button data-hero-cta variant="ghost" onClick={scrollToContactSection}>
              יצירת קשר
              <Phone className="h-4 w-4" />
            </Button>
            <Button data-hero-cta onClick={revealTracker}>
              התחילי תהליך
              <ArrowDown className="cta-arrow-bob h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {hasStarted ? (
        <>
          <div ref={stepsRef} style={{ opacity: 0 }}>
            <Card className="stage-ornament overflow-hidden" tone="stone">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm font-semibold text-text-plum">אבני הדרך</p>
                  <h2 className="mt-2 font-heading text-2xl text-slate-900">
                    {activePhase.label}
                  </h2>
                  <p className="mt-2 max-w-2xl text-slate-700">{activePhase.summary}</p>
                </div>

                <Button onClick={restartTracker} size="sm" variant="ghost">
                  <RefreshCcw className="reset-spin h-4 w-4" />
                  איפוס תהליך
                </Button>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
                {PHASES.map((phase) => {
                  const Icon = phaseIcons[phase.id];
                  const isUnlocked = unlockedPhases.includes(phase.id);
                  const isActive = tracker.activePhase === phase.id;

                  return (
                    <button
                      key={phase.id}
                      className={[
                        "phase-chip flex w-full min-w-0 items-center gap-3 rounded-[1.6rem] border px-4 py-3 text-right transition max-[390px]:flex-col max-[390px]:justify-center max-[390px]:text-center",
                        isActive
                          ? "border-brand-rose bg-brand-blush/70"
                          : "border-white/75 bg-white/70",
                        isUnlocked ? "hover:bg-white/90" : "cursor-not-allowed opacity-50",
                      ].join(" ")}
                      disabled={!isUnlocked}
                      type="button"
                      onClick={() => setActivePhase(phase.id)}
                    >
                      <div
                        className={[
                          "rounded-2xl bg-white/85 p-2.5 max-[390px]:mx-auto",
                          isActive ? "active-phase-icon" : "",
                        ].join(" ")}
                        data-phase-icon
                      >
                        <Icon className="h-4 w-4 text-text-plum" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          {phase.eyebrow}
                        </p>
                        <p className="font-semibold text-slate-900">{phase.label}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>
          </div>

          <div ref={phaseRef} className="grid gap-6" style={{ opacity: 0 }}>
            {tracker.warningMessage ? (
              <Card className="border-brand-rose/40" tone="rose">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-white/75 p-3">
                      <AlertTriangle className="h-5 w-5 text-text-plum" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">הודעה רגישה</p>
                      <p className="mt-1 text-sm text-slate-700">{tracker.warningMessage}</p>
                    </div>
                  </div>
                  <Button onClick={dismissWarning} size="sm" variant="ghost">
                    סגירה
                  </Button>
                </div>
              </Card>
            ) : null}

            {renderFloatingNavigation()}

            <div ref={stageAnchorRef}>
              <StageContainer stageKey={tracker.activePhase}>{renderPhase()}</StageContainer>
            </div>
          </div>
        </>
      ) : null}

      <div ref={contactSectionRef} className="grid gap-4 sm:grid-cols-2">
        <div data-contact-card>
          <ContactCard
            actionLabel={CONTACTS.rabbi.cta}
            name={CONTACTS.rabbi.name}
            phone={CONTACTS.rabbi.phone}
            role={CONTACTS.rabbi.role}
          />
        </div>
        <div data-contact-card>
          <ContactCard
            actionLabel={CONTACTS.rebbetzin.cta}
            name={CONTACTS.rebbetzin.name}
            phone={CONTACTS.rebbetzin.phone}
            role={CONTACTS.rebbetzin.role}
          />
        </div>
      </div>

      <OverlaySheet
        title={activeOverlay === "laws" ? "הלכות" : "הקדמה בקטנה"}
        open={activeOverlay !== null}
        onClose={() => setActiveOverlay(null)}
      >
        {activeOverlay === "intro" ? (
          <div className="space-y-5">
            <div className="space-y-3 text-right text-slate-700">
              {INTRO_PARAGRAPHS.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
            <div className="rounded-[1.6rem] bg-brand-blush/35 p-4">
              <p className="font-semibold text-slate-900">חשוב לדעת</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                {INTRO_NOTES.map((note) => (
                  <li key={note} className="flex items-start gap-2">
                    <span className="mt-1 text-text-plum">•</span>
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : activeOverlay === "laws" ? (
          <div className="space-y-4">
            {LAW_SECTIONS.map((section) => (
              <div
                key={section.id}
                className="scroll-mt-24"
                data-law-section-id={section.id}
              >
                <Card className="bg-white" tone="default">
                  <h3 className="font-heading text-2xl text-text-plum">{section.title}</h3>
                  <div className="mt-3 space-y-3 text-sm text-slate-700 sm:text-base">
                    {(section.body ?? []).map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                    {section.bullets ? (
                      <ul className="space-y-2">
                        {section.bullets.map((bullet) => (
                          <li key={bullet} className="flex items-start gap-2">
                            <span className="mt-1 text-text-plum">•</span>
                            <span>{bullet}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </Card>
              </div>
            ))}
          </div>
        ) : null}
      </OverlaySheet>
    </section>
  );
}

interface PhaseNavigationButtonProps {
  action: PhaseNavigationAction;
}

interface StageEyebrowProps {
  label: string;
  onLawsClick: () => void;
}

function StageEyebrow({ label, onLawsClick }: StageEyebrowProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <p className="text-sm font-semibold text-text-plum">{label}</p>
      <Button
        className="rounded-full bg-white/80 px-3 py-1.5 text-xs text-slate-700 shadow-none hover:bg-white"
        onClick={onLawsClick}
        size="sm"
        variant="ghost"
      >
        הלכות
      </Button>
    </div>
  );
}

function PhaseNavigationButton({ action }: PhaseNavigationButtonProps) {
  return (
    <Button
      className="w-full sm:w-auto"
      disabled={action.disabled}
      onClick={action.onClick}
      variant={action.variant}
    >
      {action.direction === "back" ? <ArrowRight className="nav-icon-back h-4 w-4 shrink-0" /> : null}
      {action.label}
      {action.direction === "next" ? <ArrowLeft className="nav-icon-next h-4 w-4 shrink-0" /> : null}
    </Button>
  );
}

interface FloatingNavigationButtonProps {
  action: PhaseNavigationAction;
  allowInteractiveExpand: boolean;
  expanded: boolean;
  onExpandChange: (isExpanded: boolean) => void;
}

function FloatingNavigationButton({
  action,
  allowInteractiveExpand,
  expanded,
  onExpandChange,
}: FloatingNavigationButtonProps) {
  const isBackAction = action.direction === "back";
  const floatingToneClassName =
    action.variant === "primary"
      ? "bg-text-plum text-white shadow-blush hover:bg-[#7f616a] focus-visible:ring-text-plum border-transparent"
      : "border border-white/80 bg-white/70 text-slate-700 hover:bg-white focus-visible:ring-brand-rose";
  const labelClassName = [
    "inline-block overflow-hidden whitespace-nowrap text-sm font-semibold transition-[max-width,opacity,margin] duration-300 ease-out",
    expanded
      ? isBackAction
        ? "mr-2.5 max-w-[14rem] opacity-100"
        : "ml-2.5 max-w-[14rem] opacity-100"
      : "max-w-0 opacity-0",
  ].join(" ");

  return (
    <button
      aria-label={action.label}
      className={[
        "floating-phase-nav pointer-events-auto relative z-[2147483647] flex h-14 items-center rounded-full ring-1 ring-black/5 backdrop-blur-md transition-all duration-300 ease-out active:scale-[0.98]",
        floatingToneClassName,
        action.disabled
          ? "cursor-not-allowed opacity-45"
          : allowInteractiveExpand
            ? "cursor-pointer select-none hover:scale-[1.02]"
            : "cursor-pointer select-none",
        isBackAction ? "flex-row px-4" : "flex-row-reverse px-4",
        expanded ? "min-w-[12.5rem]" : "w-14",
      ].join(" ")}
      disabled={action.disabled}
      style={{ touchAction: "manipulation" }}
      type="button"
      onBlur={() => onExpandChange(false)}
      onFocus={() => {
        if (allowInteractiveExpand) {
          onExpandChange(true);
        }
      }}
      onMouseDown={() => {
        if (allowInteractiveExpand) {
          onExpandChange(true);
        }
      }}
      onMouseEnter={() => {
        if (allowInteractiveExpand) {
          onExpandChange(true);
        }
      }}
      onMouseLeave={() => {
        if (allowInteractiveExpand) {
          onExpandChange(false);
        }
      }}
      onPointerDown={() => {
        if (allowInteractiveExpand) {
          onExpandChange(true);
        }
      }}
      onPointerEnter={() => {
        if (allowInteractiveExpand) {
          onExpandChange(true);
        }
      }}
      onPointerLeave={() => {
        if (allowInteractiveExpand) {
          onExpandChange(false);
        }
      }}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        action.onClick();
      }}
    >
      {isBackAction ? (
        <>
          <ArrowRight
            className={[
              "h-5 w-5 shrink-0 transition-transform duration-300 ease-out",
              expanded ? "translate-x-1" : "",
            ].join(" ")}
          />
          <span className={labelClassName}>{action.label}</span>
        </>
      ) : (
        <>
          <ArrowLeft
            className={[
              "h-5 w-5 shrink-0 transition-transform duration-300 ease-out",
              expanded ? "-translate-x-1" : "",
            ].join(" ")}
          />
          <span className={labelClassName}>{action.label}</span>
        </>
      )}
    </button>
  );
}

interface CheckSlotControlProps {
  label: string;
  slot: CheckSlot;
  status: CheckStatus;
  onBlood: () => void;
  onToggle: () => void;
}

interface DateInputFieldProps {
  label: string;
  min?: string;
  onChange: (value: string) => void;
  value: string;
}

function DateInputField({ label, min, onChange, value }: DateInputFieldProps) {
  const hasValue = Boolean(value);
  const displayValue = hasValue ? formatDisplayDate(value) : "לחצי לבחירת תאריך";
  const hebrewValue = hasValue ? formatHebrewDate(value) : "";

  return (
    <label className="mt-6 block max-w-xl text-sm font-semibold text-slate-700">
      {label}
      <div className={dateFieldShellClass}>
        <input
          className={dateInputClass}
          min={min}
          type="date"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <div className={dateFieldDisplayClass}>
          <span
            className={[
              "flex-1 text-right",
              hasValue ? "text-slate-900" : "text-slate-400",
            ].join(" ")}
          >
            {hasValue ? (
              <>
                <span className="block truncate text-sm font-semibold text-slate-900 sm:text-base">
                  {displayValue}
                </span>
                {hebrewValue ? (
                  <span className="mt-0.5 block truncate text-xs font-normal text-text-plum/85 sm:text-sm">
                    {hebrewValue}
                  </span>
                ) : null}
              </>
            ) : (
              displayValue
            )}
          </span>
          <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center">
            {hasValue ? (
              <span className="date-status-success inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <Check className="h-4 w-4" />
              </span>
            ) : (
              <span className="date-status-prompt inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand-blush/70 text-text-plum">
                <CalendarDays className="h-4 w-4" />
              </span>
            )}
          </span>
        </div>
      </div>
    </label>
  );
}

function DualDateText({
  containerClassName = "text-right",
  date,
  primaryClassName,
  secondaryClassName = "mt-1 text-sm text-text-plum/80",
  suffix,
}: {
  containerClassName?: string;
  date: string;
  primaryClassName: string;
  secondaryClassName?: string;
  suffix?: string;
}) {
  const hebrewDate = formatHebrewDate(date);

  return (
    <div className={containerClassName}>
      <p className={primaryClassName}>
        {formatDisplayDate(date)}
        {suffix ? ` ${suffix}` : ""}
      </p>
      {hebrewDate ? <p className={secondaryClassName}>{hebrewDate}</p> : null}
    </div>
  );
}

function StatusCheckbox({
  checked,
  className = "",
}: {
  checked: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={[
        "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border-2 transition",
        checked
          ? "border-emerald-400 bg-emerald-100 text-emerald-600 shadow-sm"
          : "border-brand-rose/75 bg-white/95 text-transparent shadow-[0_0_0_2px_rgba(231,162,177,0.12)]",
        className,
      ].join(" ")}
    >
      <Check className="h-3.5 w-3.5" />
    </span>
  );
}

function InfoLabel({
  icon = "info",
  label,
}: {
  icon?: "info" | "question";
  label: string;
}) {
  const Icon = icon === "question" ? CircleHelp : Info;

  return (
    <div className="inline-flex items-center gap-2 text-sm text-slate-600">
      <Icon className="h-4 w-4 shrink-0 text-text-plum" />
      <span>{label}</span>
    </div>
  );
}

function ContactCard({
  actionLabel,
  name,
  phone,
  role,
}: {
  actionLabel: string;
  name: string;
  phone: string;
  role: string;
}) {
  return (
    <div className="group rounded-[1.9rem] border border-white/75 bg-white/82 p-5 shadow-soft transition hover:bg-white">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-text-plum">{actionLabel}</p>
          <p className="mt-2 font-heading text-2xl text-slate-900">{name}</p>
          <p className="mt-1 text-sm text-slate-600">{role}</p>
          <p className="mt-3 text-base font-semibold text-slate-800">{phone}</p>
        </div>
        <div className="flex flex-col items-center gap-2">
          <a
            aria-label={`חיוג אל ${name}`}
            className="rounded-2xl bg-brand-blush/45 p-3 text-text-plum transition hover:bg-brand-blush/65"
            href={`tel:${phone.replace(/-/g, "")}`}
          >
            <Phone className="h-5 w-5" />
          </a>
          <a
            aria-label={`פתיחת ווטסאפ עם ${name}`}
            className="rounded-2xl bg-[#e3f7ec] p-3 text-[#1f7a4d] transition hover:bg-[#d3f2e3]"
            href={getWhatsAppLink(phone)}
            rel="noreferrer"
            target="_blank"
          >
            <WhatsAppIcon className="h-5 w-5" />
          </a>
        </div>
      </div>
    </div>
  );
}

function OverlaySheet({
  children,
  onClose,
  open,
  title,
}: {
  children: ReactNode;
  onClose: () => void;
  open: boolean;
  title: string;
}) {
  const backdropRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const backdrop = backdropRef.current;
    const panel = panelRef.current;

    if (!open || !backdrop || !panel) {
      return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const ctx = gsap.context(() => {
      const bodyChildren = gsap.utils.toArray<HTMLElement>("[data-overlay-body] > *");

      gsap.fromTo(backdrop, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.22, ease: "power2.out" });
      gsap.fromTo(
        panel,
        { autoAlpha: 0, y: 28, scale: 0.965 },
        { autoAlpha: 1, y: 0, scale: 1, duration: 0.34, ease: "power3.out" },
      );

      if (bodyChildren.length) {
        gsap.fromTo(
          bodyChildren,
          { autoAlpha: 0, y: 18 },
          { autoAlpha: 1, y: 0, duration: 0.34, ease: "power2.out", stagger: 0.07, delay: 0.08 },
        );
      }
    }, panel);

    return () => ctx.revert();
  }, [open, title]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
      <div
        aria-hidden="true"
        ref={backdropRef}
        className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <Card
        className="relative flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-[2.2rem] border-white/80 bg-bg-main/95 p-0"
        role="dialog"
        tone="stone"
      >
        <div ref={panelRef} className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-3 border-b border-white/65 px-5 py-5 sm:px-6">
            <div>
              <p className="text-sm font-semibold text-text-plum">מתוך החוברת</p>
              <h2 className="mt-1 font-heading text-3xl text-slate-900">{title}</h2>
            </div>
            <button
              aria-label="סגירת חלון"
              className="rounded-full border border-white/80 bg-white/85 p-2 text-slate-600 transition hover:bg-white"
              type="button"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div
            className="overlay-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-5 py-5 sm:px-6"
            data-overlay-body
          >
            {children}
          </div>
        </div>
      </Card>
    </div>
  );
}

function WhatsAppIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M20.52 3.48A11.86 11.86 0 0 0 12.07 0C5.52 0 .18 5.34.18 11.89c0 2.1.55 4.15 1.6 5.96L0 24l6.33-1.66a11.84 11.84 0 0 0 5.73 1.47h.01c6.55 0 11.89-5.34 11.89-11.89 0-3.17-1.23-6.15-3.44-8.44Zm-8.45 18.32h-.01a9.83 9.83 0 0 1-5-1.37l-.36-.21-3.76.99 1-3.67-.24-.38a9.84 9.84 0 0 1-1.51-5.27c0-5.43 4.42-9.85 9.86-9.85 2.63 0 5.09 1.02 6.95 2.89a9.79 9.79 0 0 1 2.88 6.96c0 5.43-4.42 9.85-9.85 9.85Zm5.4-7.37c-.3-.15-1.77-.87-2.05-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.08-.3-.15-1.27-.47-2.42-1.49-.9-.8-1.5-1.79-1.68-2.09-.17-.3-.02-.46.13-.61.14-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.91-2.22-.24-.58-.49-.5-.67-.5l-.57-.01c-.2 0-.52.08-.79.37-.27.3-1.04 1.02-1.04 2.5s1.07 2.9 1.22 3.1c.15.2 2.1 3.21 5.09 4.5.71.31 1.27.5 1.7.64.71.22 1.36.19 1.87.12.57-.08 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35Z" />
    </svg>
  );
}

function CheckSlotControl({
  label,
  slot,
  status,
  onBlood,
  onToggle,
}: CheckSlotControlProps) {
  return (
    <div className="rounded-[1.5rem] border border-white/70 bg-bg-stone/60 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-900">{label}</p>
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
            {slot === "morning" ? "AM" : "PM"}
          </p>
        </div>

        <span
          className={[
            "rounded-full px-3 py-1 text-sm font-semibold",
            status === "done"
              ? "bg-status-sage text-slate-800"
              : "bg-white/85 text-slate-500",
          ].join(" ")}
        >
          {status === "done" ? "סומן תקין" : "טרם סומן"}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={onToggle} size="sm" variant={status === "done" ? "success" : "secondary"}>
          <CheckCircle2 className="h-4 w-4" />
          {status === "done" ? "בטל סימון" : "סמן כנקי"}
        </Button>
        <Button onClick={onBlood} size="sm" variant="danger">
          מראה דמי
        </Button>
      </div>
    </div>
  );
}

function CoverBloom({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 180 220"
      aria-hidden="true"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M88 208C92 186 95 171 96 152C98 125 92 103 89 82"
        stroke="#C5966F"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M95 154C106 140 118 131 132 126"
        stroke="#D0A07A"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M92 146C80 134 68 128 55 126"
        stroke="#D0A07A"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <ellipse cx="90" cy="77" rx="22" ry="28" fill="#F0A7B9" />
      <ellipse cx="65" cy="88" rx="19" ry="23" fill="#F7B3C4" />
      <ellipse cx="113" cy="90" rx="19" ry="23" fill="#FABBC9" />
      <ellipse cx="81" cy="103" rx="19" ry="22" fill="#E79AAF" />
      <ellipse cx="104" cy="106" rx="17" ry="20" fill="#EDA4B8" />
      <circle cx="92" cy="95" r="9" fill="#AF6977" />
      <ellipse
        cx="49"
        cy="136"
        rx="14"
        ry="6"
        transform="rotate(32 49 136)"
        fill="#D6B28C"
      />
      <ellipse
        cx="65"
        cy="150"
        rx="14"
        ry="6"
        transform="rotate(-18 65 150)"
        fill="#DEB592"
      />
      <ellipse
        cx="125"
        cy="142"
        rx="16"
        ry="7"
        transform="rotate(-28 125 142)"
        fill="#DAB08C"
      />
      <ellipse
        cx="140"
        cy="127"
        rx="18"
        ry="8"
        transform="rotate(20 140 127)"
        fill="#D8AA82"
      />
      <path
        d="M136 53L139 60L146 63L139 66L136 73L133 66L126 63L133 60L136 53Z"
        fill="#E0AF88"
      />
      <circle cx="150" cy="71" r="3" fill="#F7B2C3" />
      <circle cx="41" cy="82" r="2.5" fill="#F0AABD" />
      <circle cx="29" cy="132" r="2.5" fill="#DCAA86" />
    </svg>
  );
}
