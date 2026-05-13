export type PhaseId = "period" | "hefsek" | "clean-days" | "mikveh";
export type CheckSlot = "morning" | "evening";
export type CheckStatus = "pending" | "done";
export type CheckStatusInput = CheckStatus | "blood";

export interface CleanDayEntry {
  dayNumber: number;
  date: string;
  mandatory: boolean;
  morning: CheckStatus;
  evening: CheckStatus;
}

export interface MikvehChecklistItem {
  id: string;
  label: string;
  description: string;
  checked: boolean;
}

export interface TrackerState {
  activePhase: PhaseId;
  periodStartDate: string;
  hefsekDate: string;
  hefsekConfirmed: boolean;
  cleanDays: CleanDayEntry[];
  mikvehNightDate: string;
  mikvehChecklist: MikvehChecklistItem[];
  warningMessage: string | null;
  lastUpdatedAt: string | null;
}

export const PHASES: Array<{
  id: PhaseId;
  label: string;
  eyebrow: string;
  summary: string;
}> = [
  {
    id: "period",
    label: "ימי הנדודים",
    eyebrow: "שלב 1",
    summary: "לפחות חמישה ימים מתחילת הדימום לפני מעבר להפסק טהרה.",
  },
  {
    id: "hefsek",
    label: "הפסק טהרה",
    eyebrow: "שלב 2",
    summary: "בדיקה פנימית סמוך לשקיעה, לאחר שפסק הדימום.",
  },
  {
    id: "clean-days",
    label: "שבעה נקיים",
    eyebrow: "שלב 3",
    summary: "שבעה ימים רצופים עם בדיקות ומעקב רגיש.",
  },
  {
    id: "mikveh",
    label: "טבילה",
    eyebrow: "שלב 4",
    summary: "ליל הטבילה מחושב אוטומטית יחד עם צ'קליסט הכנות.",
  },
];

export const mandatoryDayNumbers = [1, 3, 7];

export function createMikvehChecklist(): MikvehChecklistItem[] {
  return [
    {
      id: "barriers",
      label: "הסרת חציצות",
      description: "תכשיטים, איפור, עדשות, לק או כל דבר שאינו רצוי על הגוף.",
      checked: false,
    },
    {
      id: "nails",
      label: "ציפורניים נקיות",
      description: "גזירה או ניקוי יסודי מתחת לציפורניים, לפי הצורך.",
      checked: false,
    },
    {
      id: "wash",
      label: "שטיפה יסודית",
      description: "רחיצה במים חמים וניקוי המקומות המכוסים וקפלי הגוף.",
      checked: false,
    },
    {
      id: "comb",
      label: "סירוק השיער",
      description: "ריכוך וסירוק כדי שלא יישארו קשרים בשיער.",
      checked: false,
    },
    {
      id: "final-review",
      label: "סקירה סופית",
      description: "בדיקה שהגוף נקי, ללא לכלוך וללא קשרים לפני הטבילה.",
      checked: false,
    },
  ];
}

export function createDefaultTrackerState(): TrackerState {
  return {
    activePhase: "period",
    periodStartDate: "",
    hefsekDate: "",
    hefsekConfirmed: false,
    cleanDays: [],
    mikvehNightDate: "",
    mikvehChecklist: createMikvehChecklist(),
    warningMessage: null,
    lastUpdatedAt: null,
  };
}

export function isValidDateString(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(parseDate(value).getTime())
  );
}

export function parseDate(dateString: string) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

const displayDateFormatter = new Intl.DateTimeFormat("he-IL", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const hebrewDateFormatter = new Intl.DateTimeFormat("he-IL-u-ca-hebrew", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const hebrewUnits = ["", "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט"] as const;
const hebrewTens: Record<number, string> = {
  10: "י",
  20: "כ",
  30: "ל",
  40: "מ",
  50: "נ",
  60: "ס",
  70: "ע",
  80: "פ",
  90: "צ",
};
const hebrewHundreds: Array<[number, string]> = [
  [300, "ש"],
  [200, "ר"],
  [100, "ק"],
];

export function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function addDays(dateString: string, days: number) {
  const date = parseDate(dateString);
  date.setUTCDate(date.getUTCDate() + days);
  return toIsoDate(date);
}

export function calculateEarliestHefsekDate(periodStartDate: string) {
  return addDays(periodStartDate, 4);
}

export function calculateCleanDayStart(hefsekDate: string) {
  return addDays(hefsekDate, 1);
}

export function calculateMikvehNightDate(hefsekDate: string) {
  return addDays(hefsekDate, 7);
}

export function createCleanDayGrid(hefsekDate: string): CleanDayEntry[] {
  const firstCleanDay = calculateCleanDayStart(hefsekDate);

  return Array.from({ length: 7 }, (_, index) => {
    const dayNumber = index + 1;

    return {
      dayNumber,
      date: addDays(firstCleanDay, index),
      mandatory: mandatoryDayNumbers.includes(dayNumber),
      morning: "pending",
      evening: "pending",
    };
  });
}

export function formatDisplayDate(dateString: string) {
  if (!isValidDateString(dateString)) {
    return "טרם נבחר תאריך";
  }

  return displayDateFormatter.format(parseDate(dateString));
}

export function formatHebrewDate(dateString: string) {
  if (!isValidDateString(dateString)) {
    return "";
  }

  const parts = hebrewDateFormatter.formatToParts(parseDate(dateString));
  const day = extractNumericPart(parts.find((part) => part.type === "day")?.value ?? "");
  const month = parts.find((part) => part.type === "month")?.value.trim() ?? "";
  const year = extractNumericPart(parts.find((part) => part.type === "year")?.value ?? "");

  if (!month || Number.isNaN(day) || Number.isNaN(year)) {
    return hebrewDateFormatter.format(parseDate(dateString));
  }

  return `${formatHebrewNumeral(day)} ${month} ${formatHebrewYear(year)}`;
}

function extractNumericPart(value: string) {
  const digits = value.replace(/[^\d]/g, "");
  return digits ? Number.parseInt(digits, 10) : Number.NaN;
}

function formatHebrewYear(value: number) {
  if (!Number.isInteger(value) || value <= 0) {
    return "";
  }

  const thousands = Math.floor(value / 1000);
  const remainder = value % 1000;
  const thousandsText = thousands ? formatHebrewNumeral(thousands) : "";
  const remainderText = remainder ? formatHebrewNumeral(remainder) : "";

  return `${thousandsText}${remainderText}`;
}

function formatHebrewNumeral(value: number) {
  if (!Number.isInteger(value) || value <= 0) {
    return "";
  }

  const letters = toHebrewLetterSequence(value);

  if (letters.length === 1) {
    return `${letters}׳`;
  }

  return `${letters.slice(0, -1)}״${letters.slice(-1)}`;
}

function toHebrewLetterSequence(value: number) {
  let remainder = value;
  let output = "";

  while (remainder >= 400) {
    output += "ת";
    remainder -= 400;
  }

  for (const [amount, letter] of hebrewHundreds) {
    if (remainder >= amount) {
      output += letter;
      remainder -= amount;
    }
  }

  if (remainder === 15) {
    return `${output}טו`;
  }

  if (remainder === 16) {
    return `${output}טז`;
  }

  const tensValue = Math.floor(remainder / 10) * 10;
  if (tensValue > 0) {
    output += hebrewTens[tensValue] ?? "";
    remainder -= tensValue;
  }

  if (remainder > 0) {
    output += hebrewUnits[remainder] ?? "";
  }

  return output;
}

export function getCompletedChecksCount(cleanDays: CleanDayEntry[]) {
  return cleanDays.reduce((sum, day) => {
    return sum + Number(day.morning === "done") + Number(day.evening === "done");
  }, 0);
}

export function dayHasMandatoryCompletion(day: CleanDayEntry) {
  return day.morning === "done" || day.evening === "done";
}

export function getMandatoryCompletionCount(cleanDays: CleanDayEntry[]) {
  return cleanDays.filter((day) => day.mandatory && dayHasMandatoryCompletion(day)).length;
}

export function canEnterMikvehPhase(state: TrackerState) {
  return (
    state.hefsekConfirmed &&
    state.cleanDays.length === 7 &&
    getMandatoryCompletionCount(state.cleanDays) === mandatoryDayNumbers.length
  );
}

export function getUnlockedPhases(state: TrackerState): PhaseId[] {
  const phases: PhaseId[] = ["period"];

  if (state.periodStartDate) {
    phases.push("hefsek");
  }

  if (state.hefsekConfirmed && state.hefsekDate) {
    phases.push("clean-days");
  }

  if (canEnterMikvehPhase(state)) {
    phases.push("mikveh");
  }

  return phases;
}

function normalizeChecklist(input: unknown) {
  const incoming = Array.isArray(input) ? input : [];

  return createMikvehChecklist().map((item) => {
    const match = incoming.find(
      (candidate) =>
        typeof candidate === "object" &&
        candidate !== null &&
        "id" in candidate &&
        candidate.id === item.id,
    ) as Partial<MikvehChecklistItem> | undefined;

    return {
      ...item,
      checked: Boolean(match?.checked),
    };
  });
}

function normalizeCleanDays(hefsekDate: string, input: unknown): CleanDayEntry[] {
  const template = createCleanDayGrid(hefsekDate);
  const incoming = Array.isArray(input) ? input : [];

  return template.map((day) => {
    const match = incoming.find(
      (candidate) =>
        typeof candidate === "object" &&
        candidate !== null &&
        "dayNumber" in candidate &&
        candidate.dayNumber === day.dayNumber,
    ) as Partial<CleanDayEntry> | undefined;

    return {
      ...day,
      morning: match?.morning === "done" ? "done" : "pending",
      evening: match?.evening === "done" ? "done" : "pending",
    };
  });
}

export function normalizeTrackerState(input: unknown): TrackerState {
  const base = createDefaultTrackerState();

  if (typeof input !== "object" || input === null) {
    return base;
  }

  const candidate = input as Partial<TrackerState>;
  const periodStartDate = isValidDateString(candidate.periodStartDate)
    ? candidate.periodStartDate
    : "";

  const minimumHefsekDate = periodStartDate ? calculateEarliestHefsekDate(periodStartDate) : "";
  const rawHefsekDate = isValidDateString(candidate.hefsekDate) ? candidate.hefsekDate : "";
  const hefsekDate =
    periodStartDate && rawHefsekDate
      ? rawHefsekDate < minimumHefsekDate
        ? minimumHefsekDate
        : rawHefsekDate
      : periodStartDate
        ? minimumHefsekDate
        : "";

  const hefsekConfirmed = Boolean(candidate.hefsekConfirmed && hefsekDate);
  const cleanDays = hefsekDate ? normalizeCleanDays(hefsekDate, candidate.cleanDays) : [];
  const mikvehNightDate = hefsekDate ? calculateMikvehNightDate(hefsekDate) : "";
  const mikvehChecklist = normalizeChecklist(candidate.mikvehChecklist);
  const warningMessage =
    typeof candidate.warningMessage === "string" ? candidate.warningMessage : null;

  const provisionalState: TrackerState = {
    activePhase: "period",
    periodStartDate,
    hefsekDate,
    hefsekConfirmed,
    cleanDays,
    mikvehNightDate,
    mikvehChecklist,
    warningMessage,
    lastUpdatedAt:
      typeof candidate.lastUpdatedAt === "string" ? candidate.lastUpdatedAt : null,
  };

  const requestedPhase = PHASES.find((phase) => phase.id === candidate.activePhase)?.id;
  const unlocked = getUnlockedPhases(provisionalState);

  provisionalState.activePhase =
    requestedPhase && unlocked.includes(requestedPhase)
      ? requestedPhase
      : unlocked[unlocked.length - 1] ?? "period";

  return provisionalState;
}
