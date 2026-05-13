import { useStore } from "@nanostores/react";
import { gsap } from "gsap";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ArrowDown,
  BookOpenText,
  Check,
  CheckCircle2,
  CircleHelp,
  Droplets,
  Hand,
  Info,
  MoonStar,
  Phone,
  RefreshCcw,
  Scissors,
  Sparkles,
  Sunset,
  Waves,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import {
  PHASES,
  calculateCleanDayStart,
  calculateEarliestHefsekDate,
  canEnterMikvehPhase,
  dayHasMandatoryCompletion,
  formatDisplayDate,
  getCompletedChecksCount,
  getMandatoryCompletionCount,
  getUnlockedPhases,
  type CheckSlot,
  type CheckStatus,
  type PhaseId,
} from "../../lib/tracker";
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

const CONTACTS = {
  rabbi: {
    cta: "פרטי הרב",
    name: "הרב אליעד בן-דוד",
    phone: "050-5883671",
    role: "רב משיב בטהרת המשפחה",
  },
  rebbetzin: {
    cta: "פרטי הרבנית",
    name: "ברכה בן-דוד",
    phone: "052-7203781",
    role: "מילדת, בודקת טהרה",
  },
} as const;

const INTRO_PARAGRAPHS = [
  "הקשר שבין איש לאשתו הוא קשר נשמתי עמוק, קשר המבוסס מבריאת אדם וחוה. שלמות האדם מתממשת כאשר האיש והאישה מתאחדים לגוף אחד ולנשמה אחת.",
  "ברית הזוגיות מבקשת טיפוח מתמיד בשני המישורים, הקשר הרוחני והקשר הגופני. שמירת טהרת המשפחה מסייעת לבניית חיבורים אלו בסבב מעגלי של צמיחה.",
  "תחילה מתחזק הקשר הרוחני, ועל גביו נבנה ומתחדש גם הקשר הגופני, ושוב יש עליה מחודשת למדרגה גבוהה יותר.",
] as const;

const INTRO_NOTES = [
  "בחלק הראשון מופיעות ההלכות המינימליות. להרחבת ההלכות וכן לכללי 'עשי ואל תעשי' יש לעיין בחלק ההלכות.",
  "מומלץ לפנות לרב או רבנית שגרים בקרבתכם לליווי והכוונה רציפים. עצה זו תמנע טעויות ועוגמת נפש.",
] as const;

const LAW_SECTIONS = [
  {
    title: "ימי הנדודים",
    body: [
      "עם תחילת דימום הווסת מתחילים ימי הנדודים. תקופה זו נמשכת כל ימי הדימום, ולכל הפחות חמישה ימים.",
      "בימים אלו בני הזוג אסורים בקרבה גופנית ובמגע עד לאחר הטבילה במקוה. מטרת התקופה היא לבנות את הקשר הרוחני והנפשי בין בני הזוג.",
      "אפילו מראה דם חד פעמי עלול לאסור בקרבה גופנית עד לאחר תהליך הטהרה. אם יש ספק לגבי מקור הדם, כתם, או הפרשה - יש לנהוג איסור מתוך ספק ולפנות לרב המלווה.",
    ],
    bullets: [
      "דם על פד, תחתון, בגד צמוד, מגבת, מיטה או גוף אינו תמיד מטמא. יש משתנים רבים ולכן חשוב להתייעץ עם הרב.",
      "דם על עד בדיקה אינו נידון כמו כתם רגיל, ויש לברר לגביו בנפרד.",
      "בהפרשות שאינן דמיות אין משמעות הלכתית, אך בכל צבע גבולי מומלץ לשאול.",
    ],
  },
  {
    title: "ריחוק שבונה קרבה",
    body: [
      "בימים אלו אסורים האיש והאישה בכל מגע, אפילו מגע שאינו של חיבה. נמנעים גם משינה במיטה אחת ומהושטה מיד ליד.",
      "דווקא הריחוק מלמד את בני הזוג לבנות את הקשר על שיחה, קרבה נפשית, תשומת לב והתחדשות פנימית.",
    ],
  },
  {
    title: "עשי, אל תעשי והמלצות",
    bullets: [
      "לאחר ראיית כתם בימי טהרה אין לבדוק מיד בעד בדיקה. יש להמתין ולהתייעץ עם הרב מתי נכון לבצע בדיקה.",
      "מומלץ לאחר שירותים להמתין מעט לפני הניגוב ולא להביט על נייר הטואלט. עדיף להשתמש בנייר צבעוני שאינו אדום.",
      "לאחר קיום יחסים מומלץ להשתמש במגבת כהה, ובזמן חשש מכתמים ללבוש בגד תחתון צבעוני בהיר.",
      "לאחר ראיית כתם דם מומלץ לא לקיים יחסים במשך 24 שעות, כדי לוודא שההפרשה נקייה ולא יימצא דם בזמן קיום יחסים.",
      "התייעצות מוקדמת עם הרב המלווה תמנע עוגמת נפש והרבה טעויות.",
    ],
  },
  {
    title: "בדיקת הפסק טהרה",
    body: [
      "מטרת הבדיקה היא לוודא שהדימום הסתיים כדי שאפשר יהיה להתחיל לספור שבעה ימים נקיים. בד הבדיקה צריך לצאת נקי מדם.",
      "הבדיקה נעשית ביום שבו פסק הדימום, אך לא פחות מחמישה ימים מתחילת הראייה, בשעה הסמוכה לפני שקיעת השמש.",
      "לפני הבדיקה יש לרחוץ את אזור הבדיקה, ואם אפשר - את כל הגוף. את הבדיקה עושים עם בד לבן נקי, על ידי כריכת העד סביב האצבע ובדיקה פנימית יסודית.",
      "אם הבדיקה לא יצאה נקייה ניתן לחזור עליה עד השקיעה. מומלץ להמתין מעט בין בדיקה לבדיקה כדי לא לפצוע את המקום.",
    ],
    bullets: [
      "מומלץ להקדים בדיקה אחת כבר מבוקר היום החמישי או במשך היום עם סיום הדימום, כדי שאם תישכח הבדיקה לפני השקיעה אפשר יהיה להסתמך על הבדיקה המוקדמת.",
      "אין להכריע לבד בצבעי ההפרשה שעל העד. מומלץ לשאול את הרב המלווה בכל ספק.",
    ],
  },
  {
    title: "שבעה נקיים",
    body: [
      "למחרת היום בו נעשה הפסק טהרה מתחילה ספירת שבעה ימים נקיים, רצופים וללא דימום.",
      "בכל יום משבעת הימים טוב לבצע שתי בדיקות: אחת בבוקר ואחת לפני השקיעה. אם אי אפשר - עדיפות שנייה היא בדיקה אחת בכל יום.",
      "המינימום ההלכתי הוא בדיקה ביום הראשון, בדיקה ביום השלישי ובדיקה ביום השביעי לפני שקיעה. אם היו פחות בדיקות - יש לשאול את הרב.",
      "אם במהלך שבעת הימים נמצא דם שיצא מהרחם על גבי העד או כתם גדול שמטמא - יש להתחיל את הספירה מחדש.",
    ],
    bullets: [
      "אין לסתור את הספירה ולהתחיל מחדש בלי להתייעץ עם הרב המלווה.",
      "לא כל צבע הפרשה שאינו שקוף מטמא. יש צבעים גבוליים שאינם אדומים והם טהורים.",
    ],
  },
  {
    title: "הכנות לטבילה",
    body: [
      "הטבילה היא השלב האחרון של תהליך הטהרה, ויש לעשותה בנחת ובשמחה. יום הטבילה חל באותו יום בשבוע שבו בוצע שבוע לפני כן הפסק הטהרה.",
      "כדי שהטבילה תהיה כשרה יש להסיר מהגוף כל חציצה: לכלוך, איפור, צבע, שיער שמסירים בדרך כלל, תכשיטים, עדשות מגע, לכלוך תחת הציפורניים וכדומה.",
      "סדר ההכנות כולל שלושה חלקים: הכנות, שטיפה יסודית, וסקירת הגוף. אפשר לבצע את ההכנות בבית או במקוה, העיקר שהכול ייעשה במתינות וביסודיות.",
      "את השטיפה והסקירה יש לעשות סמוך ככל האפשר לטבילה, לאחר צאת הכוכבים בסוף היום השביעי.",
    ],
    bullets: [
      "יש לסרק את השיער, לשטוף היטב את הגוף, לבדוק קפלים, טבור, אוזניים, פה, שיניים, ואף לשים לב לקשרים בשיער.",
      "בליל שבת, במוצאי שבת, או לאחר ימי חג - יש דגשים מיוחדים, ובמקרים כאלה מומלץ להתייעץ עם הרב המלווה.",
      "בכל שאלה לגבי חציצה, גבס, תחבושות, תפרים וכדומה - יש לפנות לרב המלווה.",
    ],
  },
  {
    title: "דרך הטבילה ואחריה",
    body: [
      "במקוה נמצאת בלנית שתפקידה לסייע בהכנות ובטבילה עצמה. לאחר סיום ההכנות טובלים שתי טבילות על פי הסדר הנהוג במקוה.",
      "יש להכניס את כל הגוף למים באופן שהאיברים רפויים, ולהקפיד שכל שערות הראש יהיו בתוך המים.",
      "הטבילה מסמנת את הסיום והמעבר בין תקופת ההכנה והעבודה הרוחנית לבין חידוש וקידוש הקשר הגופני בין בני הזוג.",
    ],
  },
  {
    title: "ימי הטהרה ועונות הפרישה",
    body: [
      "לאחר הטבילה מתחילה תקופה של ימי טהרה, שבה הקשר הגופני בין בני הזוג שב ונבנה מתוך חיבור ואהבה אמיתית.",
      "לקראת סוף ימי הטהרה ישנם שלושה תאריכים בהם חוששים לווסת: יום החודש, עונה בינונית, וטווח הפלגה. בתאריכים אלו אסורים בקרבה שעשויה להביא לקיום יחסים, והאישה צריכה לבדוק את עצמה בתחילת היום ובסופו.",
      "את שלושת התאריכים מחשבים לפי יום ועונת הווסת האחרון. אם יש ספק בחישוב או בהתנהלות - כדאי להיעזר באפליקציה ולפנות לרב.",
    ],
  },
] as const;

type OverlaySheetKey = "intro" | "laws";

export default function FamilyPurityApp() {
  const tracker = useStore(trackerStore);
  const heroRef = useRef<HTMLElement | null>(null);
  const checklistRef = useRef<HTMLDivElement | null>(null);
  const stepsRef = useRef<HTMLDivElement | null>(null);
  const phaseRef = useRef<HTMLDivElement | null>(null);
  const stageAnchorRef = useRef<HTMLDivElement | null>(null);
  const phaseIconsAnimatedRef = useRef(false);
  const previousPhaseRef = useRef<PhaseId | null>(null);
  const [activeOverlay, setActiveOverlay] = useState<OverlaySheetKey | null>(null);
  const [hasStarted, setHasStarted] = useState(false);

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

  const revealTracker = () => {
    if (hasStarted) {
      stepsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    setHasStarted(true);
  };

  const renderPhase = () => {
    switch (tracker.activePhase) {
      case "period":
        return (
          <Card className="stage-ornament overflow-hidden" tone="rose">
            <div className="max-w-4xl" data-stage-item>
              <p className="text-sm font-semibold text-text-plum">שלב 1</p>
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
                  <p className="mt-2 text-lg font-semibold text-slate-900">
                    {tracker.periodStartDate
                      ? formatDisplayDate(earliestHefsekDate)
                      : "יופיע לאחר בחירת תאריך"}
                  </p>
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

            <div className="mt-8 flex flex-wrap gap-3" data-stage-item>
              <Button disabled={!tracker.periodStartDate} onClick={beginHefsekPhase}>
                מעבר להפסק טהרה
                <ArrowLeft className="nav-icon-next h-4 w-4 shrink-0" />
              </Button>
            </div>
          </Card>
        );

      case "hefsek":
        return (
          <Card className="stage-ornament overflow-hidden" tone="default">
            <div className="grid gap-5 lg:grid-cols-[1.08fr_0.92fr]">
              <div data-stage-item>
                <p className="text-sm font-semibold text-text-plum">שלב 2</p>
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

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <Card className="bg-bg-stone/85" tone="stone">
                    <InfoLabel label="תחילת שבעה נקיים" />
                    <p className="mt-2 font-semibold text-slate-900">
                      {tracker.hefsekDate
                        ? formatDisplayDate(cleanDayStart)
                        : "יופיע לאחר בחירת תאריך"}
                    </p>
                  </Card>
                  <Card className="bg-status-sage/45" tone="sage">
                    <InfoLabel label="ליל הטבילה המחושב" />
                    <p className="mt-2 font-semibold text-slate-900">
                      {tracker.hefsekDate
                        ? `${formatDisplayDate(tracker.mikvehNightDate)} אחרי צאת הכוכבים`
                        : "יופיע לאחר בחירת תאריך"}
                    </p>
                  </Card>
                </div>
              </div>

              <div className="space-y-4" data-stage-item>
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
                  aria-checked={tracker.hefsekConfirmed}
                  className={[
                    "relative flex w-full items-start gap-4 rounded-[1.75rem] border-2 px-5 py-4 text-right transition duration-300",
                    tracker.hefsekConfirmed
                      ? "border-status-olive bg-status-sage/65"
                      : "attention-pulse border-brand-rose/75 bg-white/88 shadow-blush hover:bg-white",
                  ].join(" ")}
                  role="switch"
                  type="button"
                  onClick={() => setHefsekConfirmed(!tracker.hefsekConfirmed)}
                >
                  <div className="relative z-10 flex items-start gap-3">
                    <div className="relative flex shrink-0 items-start">
                      <StatusCheckbox checked={tracker.hefsekConfirmed} className="mt-0.5" />
                      {!tracker.hefsekConfirmed ? (
                        <span className="pointer-events-none absolute -left-4 -top-3 inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-blush/75 text-text-plum">
                          <Hand className="date-status-prompt h-3.5 w-3.5" />
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

            <div className="mt-8 grid gap-3 sm:flex sm:flex-wrap" data-stage-item>
              <Button
                className="w-full sm:w-auto"
                disabled={!tracker.hefsekConfirmed}
                onClick={() => setActivePhase("clean-days")}
              >
                פתיחת שבעה נקיים
                <ArrowLeft className="nav-icon-next h-4 w-4 shrink-0" />
              </Button>
              <Button className="w-full sm:w-auto" onClick={() => setActivePhase("period")} variant="ghost">
                <ArrowRight className="nav-icon-back h-4 w-4 shrink-0" />
                חזרה לימי הנדודים
              </Button>
            </div>
          </Card>
        );

      case "clean-days":
        return (
          <Card className="stage-ornament overflow-hidden" tone="default">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div data-stage-item>
                <p className="text-sm font-semibold text-text-plum">שלב 3</p>
                <h2 className="mt-2 font-heading text-3xl text-slate-900">שבעה נקיים</h2>
                <p className="mt-3 max-w-3xl text-slate-700">
                  סמני בדיקות בוקר וערב לאורך שבעה ימים. ימים 1, 3 ו־7 מודגשים
                  כימי חובה מינימליים.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:gap-3" data-stage-item>
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
                  <p className="mt-1 text-xs font-semibold text-slate-900 sm:mt-2 sm:text-sm">
                    {formatDisplayDate(tracker.mikvehNightDate)}
                  </p>
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
                      <p className="text-sm text-slate-600">{formatDisplayDate(day.date)}</p>
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

            <div
              className="mt-6 rounded-3xl border border-brand-rose/45 bg-brand-blush/45 p-4 text-sm text-slate-700"
              data-stage-item
            >
              סימון &quot;מראה דמי&quot; מאפס את הספירה לצורך זהירות ומחזיר את המעקב
              לתחילת מחזור חדש. בכל ספק הלכתי, מומלץ להתייעץ עם רב מלווה.
            </div>

            <div className="mt-8 grid gap-3 sm:flex sm:flex-wrap" data-stage-item>
              <Button className="w-full sm:w-auto" disabled={!mikvehReady} onClick={moveToMikvehPhase}>
                מעבר לשלב הטבילה
                <ArrowLeft className="nav-icon-next h-4 w-4 shrink-0" />
              </Button>
              <Button className="w-full sm:w-auto" onClick={() => setActivePhase("hefsek")} variant="ghost">
                <ArrowRight className="nav-icon-back h-4 w-4 shrink-0" />
                חזרה להפסק טהרה
              </Button>
            </div>
          </Card>
        );

      case "mikveh":
        return (
          <Card className="stage-ornament overflow-hidden" tone="sage">
            <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
              <div data-stage-item>
                <p className="text-sm font-semibold text-text-plum">שלב 4</p>
                <h2 className="mt-2 font-heading text-3xl text-slate-900">טבילה</h2>
                <p className="mt-4 max-w-2xl text-slate-700">
                  ליל הטבילה חל שבוע לאחר הפסק הטהרה, באותו יום בשבוע, והטבילה
                  עצמה היא בלילה אחרי צאת הכוכבים.
                </p>

                <div className="mt-6 rounded-[2rem] bg-[#cff9e4] p-5 shadow-none">
                  <InfoLabel label="ליל הטבילה" />
                  <p className="mt-2 text-2xl font-semibold text-slate-900">
                    {formatDisplayDate(tracker.mikvehNightDate)}
                  </p>
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
                    כֻּלָּךְ יָפָה רַעְיָתִי וּמוּם אֵין בָּךְ
                    <span className="mt-1 block text-2xl">(שיר השירים ד&apos;, ז&apos;)</span>
                  </h3>
                </div>
              </div>
            ) : null}

            <div className="mt-8 grid gap-3 sm:flex sm:flex-wrap" data-stage-item>
              <Button className="w-full sm:w-auto" onClick={() => setActivePhase("clean-days")} variant="ghost">
                <ArrowRight className="nav-icon-back h-4 w-4 shrink-0" />
                חזרה לשבעה נקיים
              </Button>
            </div>
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
        <div className="mx-auto flex min-h-[68vh] max-w-4xl flex-col items-center justify-center text-center">
          <p className="cover-title text-5xl text-text-plum sm:text-7xl">
            <span data-hero-word>טהרת</span>{" "}
            <span data-hero-word>המשפחה</span>
          </p>
          <p data-hero-line className="mt-3 text-lg text-text-plum/85 sm:text-2xl">
            מדריך מעשי לציבור הכללי
          </p>
          <p data-hero-line className="cover-script mt-3 text-4xl text-text-plum sm:text-6xl">
            פשוט להבין
          </p>

          <div data-hero-bloom>
            <CoverBloom className="hero-bloom mt-6 w-[10.5rem] sm:w-[12rem]" />
          </div>

          <div className="mt-7 flex w-full max-w-3xl flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
            <Button data-hero-cta onClick={revealTracker}>
              {hasExistingProgress ? "המשך תהליך" : "התחל תהליך"}
              <ArrowDown className="cta-arrow-bob h-4 w-4" />
            </Button>
            <Button data-hero-cta variant="ghost" onClick={() => setActiveOverlay("intro")}>
              הקדמה ויצירת קשר
              <Phone className="h-4 w-4" />
            </Button>
            <Button data-hero-cta variant="ghost" onClick={() => setActiveOverlay("laws")}>
              הלכות
              <BookOpenText className="h-4 w-4" />
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
                        className="rounded-2xl bg-white/85 p-2.5 max-[390px]:mx-auto"
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

            <div ref={stageAnchorRef}>
              <StageContainer stageKey={tracker.activePhase}>{renderPhase()}</StageContainer>
            </div>
          </div>
        </>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <ContactCard
          actionLabel={CONTACTS.rabbi.cta}
          name={CONTACTS.rabbi.name}
          phone={CONTACTS.rabbi.phone}
          role={CONTACTS.rabbi.role}
        />
        <ContactCard
          actionLabel={CONTACTS.rebbetzin.cta}
          name={CONTACTS.rebbetzin.name}
          phone={CONTACTS.rebbetzin.phone}
          role={CONTACTS.rebbetzin.role}
        />
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
            <div className="grid gap-3 sm:grid-cols-2">
              <ContactCard
                actionLabel={CONTACTS.rabbi.cta}
                name={CONTACTS.rabbi.name}
                phone={CONTACTS.rabbi.phone}
                role={CONTACTS.rabbi.role}
              />
              <ContactCard
                actionLabel={CONTACTS.rebbetzin.cta}
                name={CONTACTS.rebbetzin.name}
                phone={CONTACTS.rebbetzin.phone}
                role={CONTACTS.rebbetzin.role}
              />
            </div>
          </div>
        ) : activeOverlay === "laws" ? (
          <div className="space-y-4">
            {LAW_SECTIONS.map((section) => (
              <Card key={section.title} className="bg-white/82" tone="default">
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
            ))}
          </div>
        ) : null}
      </OverlaySheet>
    </section>
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
              "flex-1 truncate text-right",
              hasValue ? "text-slate-900" : "text-slate-400",
            ].join(" ")}
          >
            {displayValue}
          </span>
          <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center">
            {hasValue ? (
              <span className="date-status-success inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <Check className="h-4 w-4" />
              </span>
            ) : (
              <span className="date-status-prompt inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand-blush/70 text-text-plum">
                <Hand className="h-4 w-4" />
              </span>
            )}
          </span>
        </div>
      </div>
    </label>
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
    <a
      className="group rounded-[1.9rem] border border-white/75 bg-white/82 p-5 shadow-soft transition hover:bg-white"
      href={`tel:${phone.replace(/-/g, "")}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-text-plum">{actionLabel}</p>
          <p className="mt-2 font-heading text-2xl text-slate-900">{name}</p>
          <p className="mt-1 text-sm text-slate-600">{role}</p>
          <p className="mt-3 text-base font-semibold text-slate-800">{phone}</p>
        </div>
        <span className="rounded-2xl bg-brand-blush/45 p-3 text-text-plum transition group-hover:bg-brand-blush/65">
          <Phone className="h-5 w-5" />
        </span>
      </div>
    </a>
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
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 px-4 py-8 backdrop-blur-sm">
      <div
        aria-hidden="true"
        className="absolute inset-0"
        onClick={onClose}
      />
      <Card
        className="relative max-h-[88vh] w-full max-w-4xl overflow-y-auto rounded-[2.2rem] border-white/80 bg-bg-main/95 p-5 sm:p-6"
        role="dialog"
        tone="stone"
      >
        <div className="mb-5 flex items-start justify-between gap-3">
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
        {children}
      </Card>
    </div>
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
