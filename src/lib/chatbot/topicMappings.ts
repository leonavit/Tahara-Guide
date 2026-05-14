import { CHATBOT_WELCOME_QUESTIONS, SITE_KNOWLEDGE_TOPICS } from "./siteKnowledge";
import type { ChatbotTopicDefinition, SefariaSource } from "./types";

function buildSefariaUrl(path: string) {
  return `https://www.sefaria.org/${path}?lang=he`;
}

function createSource(label: string, ref: string, path: string, note?: string): SefariaSource {
  return {
    label,
    ref,
    href: buildSefariaUrl(path),
    note,
  };
}

export const CHATBOT_TOPICS: ChatbotTopicDefinition[] = [
  {
    ...SITE_KNOWLEDGE_TOPICS.period,
    triggerTerms: [
      "נידה",
      "דימום",
      "מחזור",
      "וסת",
      "תחילת וסת",
      "תחילת מחזור",
      "ימי נדה",
      "ימי הנידה",
      "ימי הנדודים",
      "כתם בתחילת המחזור",
    ],
    suggestedQuestions: [
      "מתי מתחיל האיסור בזמן דימום?",
      "האם כתם בתחילת המחזור מחייב זהירות?",
    ],
    sefariaRefs: [
      createSource("ויקרא טו", "ויקרא טו, יט-כד", "Leviticus.15.19-24", "יסוד דיני הראייה והטומאה"),
      createSource("שולחן ערוך יורה דעה", "שולחן ערוך, יורה דעה קפג", "Shulchan_Arukh%2C_Yoreh_De'ah.183", "פתיחת דיני נידה"),
    ],
  },
  {
    ...SITE_KNOWLEDGE_TOPICS.hefsek,
    triggerTerms: [
      "הפסק טהרה",
      "בדיקת הפסק",
      "בדיקה לפני שקיעה",
      "עד בדיקה",
      "מוך דחוק",
      "לפני השקיעה",
      "מתי עושים הפסק",
      "בדיקה פנימית",
      "בד נקי",
    ],
    suggestedQuestions: [
      "מתי אפשר לעשות הפסק טהרה?",
      "מה עושים אם הבדיקה לא יצאה נקייה?",
    ],
    sefariaRefs: [
      createSource("ויקרא טו", "ויקרא טו, כח", "Leviticus.15.28", "תחילת ספירת הטהרה לאחר הפסקת הדימום"),
      createSource("שולחן ערוך יורה דעה", "שולחן ערוך, יורה דעה קצו", "Shulchan_Arukh%2C_Yoreh_De'ah.196", "דיני הפסק טהרה ולבישת לבנים"),
    ],
  },
  {
    ...SITE_KNOWLEDGE_TOPICS["clean-days"],
    triggerTerms: [
      "שבעה נקיים",
      "שבע נקיים",
      "בדיקות בוקר וערב",
      "בדיקה ביום הראשון",
      "בדיקה ביום השביעי",
      "כמה בדיקות צריך",
      "דם באמצע הספירה",
      "להתחיל את הספירה מחדש",
      "ימי הספירה",
    ],
    suggestedQuestions: [
      "כמה בדיקות צריך בשבעה נקיים?",
      "מה קורה אם נמצא דם באמצע הספירה?",
    ],
    sefariaRefs: [
      createSource("ויקרא טו", "ויקרא טו, כח", "Leviticus.15.28", "ספירת שבעת הימים"),
      createSource("שולחן ערוך יורה דעה", "שולחן ערוך, יורה דעה קצו", "Shulchan_Arukh%2C_Yoreh_De'ah.196", "דיני הבדיקות והספירה"),
    ],
  },
  {
    ...SITE_KNOWLEDGE_TOPICS["mikveh-prep"],
    triggerTerms: [
      "טבילה",
      "מקווה",
      "מקוה",
      "הכנות לטבילה",
      "ליל טבילה",
      "חציצה",
      "ציפורניים",
      "שיער",
      "בלנית",
      "צאת הכוכבים",
      "מה צריך להכין לפני הטבילה",
    ],
    suggestedQuestions: [
      "מה צריך להכין לפני הטבילה?",
      "איך יודעים שאין חציצה לפני המקווה?",
    ],
    sefariaRefs: [
      createSource("שולחן ערוך יורה דעה", "שולחן ערוך, יורה דעה קצח", "Shulchan_Arukh%2C_Yoreh_De'ah.198", "דיני טבילה וחציצה"),
      createSource("ויקרא טו", "ויקרא טו, כח", "Leviticus.15.28", "סיום הספירה וכניסה לטבילה"),
    ],
  },
  {
    ...SITE_KNOWLEDGE_TOPICS["laws-distance"],
    triggerTerms: [
      "הרחקות",
      "מגע",
      "הושטה",
      "שינה במיטה אחת",
      "אסורים במגע",
      "קרבה גופנית",
      "מה אסור בזמן הווסת",
      "לגעת",
    ],
    suggestedQuestions: [
      "אילו הרחקות נוהגות בזמן הווסת?",
      "האם מותר להעביר חפץ מיד ליד?",
    ],
    sefariaRefs: [
      createSource("ויקרא יח", "ויקרא יח, יט", "Leviticus.18.19", "יסוד איסור הקרבה"),
      createSource("שולחן ערוך יורה דעה", "שולחן ערוך, יורה דעה קצה", "Shulchan_Arukh%2C_Yoreh_De'ah.195", "דיני ההרחקות בין בני הזוג"),
    ],
  },
  {
    ...SITE_KNOWLEDGE_TOPICS["laws-guidance"],
    triggerTerms: [
      "כתם",
      "כתמים",
      "נייר טואלט",
      "מגבת",
      "בגד תחתון",
      "מתי לשאול רב",
      "עשי ואל תעשי",
      "המלצות",
      "הפרשה גבולית",
      "צבע גבולי",
    ],
    suggestedQuestions: [
      "מה עושים אחרי שרואים כתם?",
      "מתי עדיף לשאול רב ולא להחליט לבד?",
    ],
    sefariaRefs: [
      createSource("שולחן ערוך יורה דעה", "שולחן ערוך, יורה דעה קצ", "Shulchan_Arukh%2C_Yoreh_De'ah.190", "דיני כתמים וספקות"),
      createSource("שולחן ערוך יורה דעה", "שולחן ערוך, יורה דעה קצו", "Shulchan_Arukh%2C_Yoreh_De'ah.196", "המשך הנחיות סביב בדיקות וספירה"),
    ],
  },
];

export const CHATBOT_SUGGESTED_QUESTIONS = Array.from(
  new Set([
    ...CHATBOT_WELCOME_QUESTIONS,
    ...CHATBOT_TOPICS.flatMap((topic) => topic.suggestedQuestions),
  ]),
).slice(0, 8);
