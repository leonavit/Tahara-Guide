import { CONTACTS, INTRO_NOTES, INTRO_PARAGRAPHS, LAW_SECTIONS, type LawSectionId } from "../siteGuideContent";
import { PHASES } from "../tracker";
import type { ChatAnswerSection, ChatbotFallbackState, ChatbotKnowledgeTopic } from "./types";

const phasesById = Object.fromEntries(PHASES.map((phase) => [phase.id, phase])) as Record<
  (typeof PHASES)[number]["id"],
  (typeof PHASES)[number]
>;

const lawSectionsById = Object.fromEntries(LAW_SECTIONS.map((section) => [section.id, section])) as Record<
  LawSectionId,
  (typeof LAW_SECTIONS)[number]
>;

function createPhaseSummarySection(phaseId: keyof typeof phasesById): ChatAnswerSection {
  const phase = phasesById[phaseId];

  return {
    id: `phase-${phaseId}`,
    title: phase.label,
    paragraphs: [phase.summary],
  };
}

function createLawSectionAnswerSection(sectionId: LawSectionId): ChatAnswerSection {
  const section = lawSectionsById[sectionId];

  return {
    id: section.id,
    title: section.title,
    paragraphs: section.body ?? [],
    bullets: section.bullets,
  };
}

export const CHATBOT_FALLBACK_STATE: ChatbotFallbackState = {
  message:
    "לא מצאתי באתר תשובה מדויקת מספיק לשאלה הזו. כדי לא לנחש בהלכה, עדיף לפנות לרב או לרבנית המופיעים כאן.",
  contacts: Object.values(CONTACTS),
};

export const SITE_KNOWLEDGE_TOPICS: Record<string, ChatbotKnowledgeTopic> = {
  period: {
    topicId: "period",
    title: "ימי הנידה והדימום",
    relatedPhaseIds: ["period"],
    relatedLawSectionIds: ["laws-period"],
    siteAnswerSections: [
      createPhaseSummarySection("period"),
      createLawSectionAnswerSection("laws-period"),
    ],
  },
  hefsek: {
    topicId: "hefsek",
    title: "הפסק טהרה",
    relatedPhaseIds: ["hefsek"],
    relatedLawSectionIds: ["laws-hefsek"],
    siteAnswerSections: [
      createPhaseSummarySection("hefsek"),
      createLawSectionAnswerSection("laws-hefsek"),
    ],
  },
  "clean-days": {
    topicId: "clean-days",
    title: "שבעה נקיים",
    relatedPhaseIds: ["clean-days"],
    relatedLawSectionIds: ["laws-clean-days"],
    siteAnswerSections: [
      createPhaseSummarySection("clean-days"),
      createLawSectionAnswerSection("laws-clean-days"),
    ],
  },
  "mikveh-prep": {
    topicId: "mikveh-prep",
    title: "הכנות לטבילה וליל הטבילה",
    relatedPhaseIds: ["mikveh"],
    relatedLawSectionIds: ["laws-mikveh-prep", "laws-mikveh-process"],
    siteAnswerSections: [
      createPhaseSummarySection("mikveh"),
      createLawSectionAnswerSection("laws-mikveh-prep"),
      createLawSectionAnswerSection("laws-mikveh-process"),
    ],
  },
  "laws-distance": {
    topicId: "laws-distance",
    title: "הרחקות ומגע בין בני הזוג",
    relatedPhaseIds: ["period", "hefsek", "clean-days"],
    relatedLawSectionIds: ["laws-distance"],
    siteAnswerSections: [createLawSectionAnswerSection("laws-distance")],
  },
  "laws-guidance": {
    topicId: "laws-guidance",
    title: "כתמים, המלצות ומתי לשאול",
    relatedPhaseIds: ["period", "hefsek", "clean-days", "mikveh"],
    relatedLawSectionIds: ["laws-guidance"],
    siteAnswerSections: [
      {
        id: "intro-notes",
        title: "הערות פתיחה מהאתר",
        paragraphs: [...INTRO_PARAGRAPHS.slice(0, 1), ...INTRO_NOTES],
      },
      createLawSectionAnswerSection("laws-guidance"),
    ],
  },
};

export const CHATBOT_WELCOME_QUESTIONS = [
  "מתי אפשר לעשות הפסק טהרה?",
  "כמה בדיקות צריך בשבעה נקיים?",
  "מה צריך להכין לפני הטבילה?",
  "אילו הרחקות נוהגות בזמן הווסת?",
];
