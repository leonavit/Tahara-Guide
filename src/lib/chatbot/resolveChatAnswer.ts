import { CHATBOT_FALLBACK_STATE } from "./siteKnowledge";
import { CHATBOT_TOPICS } from "./topicMappings";
import type { ChatbotTopicDefinition, ResolvedChatAnswer } from "./types";

const CONFIDENCE_THRESHOLD = 6;
const AMBIGUITY_DELTA = 1.25;

const FINAL_HEBREW_LETTERS: Record<string, string> = {
  ך: "כ",
  ם: "מ",
  ן: "נ",
  ף: "פ",
  ץ: "צ",
};

const STOP_WORDS = new Set([
  "או",
  "אז",
  "איך",
  "אחרי",
  "אם",
  "אני",
  "את",
  "אתה",
  "אתם",
  "אתן",
  "זו",
  "זה",
  "זאת",
  "האם",
  "היא",
  "הם",
  "הן",
  "הכי",
  "הכול",
  "הכל",
  "ולא",
  "ומה",
  "ומהו",
  "ומהי",
  "ומתי",
  "ומי",
  "זהו",
  "זמן",
  "טוב",
  "כך",
  "כמה",
  "כדי",
  "כל",
  "לא",
  "לי",
  "מה",
  "מותר",
  "מתי",
  "מי",
  "צריך",
  "צריכה",
  "של",
  "שלי",
  "שלנו",
  "שלכם",
  "שלכן",
  "עם",
  "על",
  "רק",
  "שם",
  "תוך",
  "יש",
  "ישר",
  "יכולה",
  "יכול",
]);

function normalizeText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0591-\u05C7]/g, "")
    .toLowerCase()
    .split("")
    .map((character) => FINAL_HEBREW_LETTERS[character] ?? character)
    .join("")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value: string) {
  return normalizeText(value)
    .split(" ")
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

function toTokenSet(values: string[]) {
  return new Set(values);
}

function intersectionSize(questionTokens: Set<string>, candidateTokens: Set<string>) {
  let count = 0;

  questionTokens.forEach((token) => {
    if (candidateTokens.has(token)) {
      count += 1;
    }
  });

  return count;
}

function buildContentCorpus(topic: ChatbotTopicDefinition) {
  return topic.siteAnswerSections.flatMap((section) => [
    section.title,
    ...section.paragraphs,
    ...(section.bullets ?? []),
  ]);
}

const indexedTopics = CHATBOT_TOPICS.map((topic) => {
  const normalizedTriggers = topic.triggerTerms.map(normalizeText).filter(Boolean);
  const triggerTokens = toTokenSet(topic.triggerTerms.flatMap(tokenize));
  const titleTokens = toTokenSet(tokenize(topic.title));
  const contentTokens = toTokenSet(buildContentCorpus(topic).flatMap(tokenize));

  return {
    topic,
    normalizedTitle: normalizeText(topic.title),
    normalizedTriggers,
    triggerTokens,
    titleTokens,
    contentTokens,
  };
});

function scoreTopic(normalizedQuestion: string, questionTokens: Set<string>, topic: (typeof indexedTopics)[number]) {
  let score = 0;

  if (!normalizedQuestion) {
    return score;
  }

  if (normalizedQuestion === topic.normalizedTitle) {
    score += 12;
  } else if (normalizedQuestion.includes(topic.normalizedTitle)) {
    score += 7;
  }

  topic.normalizedTriggers.forEach((trigger) => {
    if (!trigger) {
      return;
    }

    if (normalizedQuestion === trigger) {
      score += 12;
      return;
    }

    if (normalizedQuestion.includes(trigger)) {
      score += 6;
    }
  });

  score += intersectionSize(questionTokens, topic.titleTokens) * 3;
  score += intersectionSize(questionTokens, topic.triggerTokens) * 2;
  score += Math.min(intersectionSize(questionTokens, topic.contentTokens), 5);

  if (questionTokens.size <= 1 && score < 7) {
    score -= 1;
  }

  return score;
}

function createFallbackAnswer(question: string, normalizedQuestion: string): ResolvedChatAnswer {
  return {
    question,
    normalizedQuestion,
    mode: "fallback",
    confidence: 0.22,
    matchedTopicId: null,
    title: "לא מצאתי תשובה מדויקת באתר",
    siteAnswer: [],
    sources: [],
    fallback: CHATBOT_FALLBACK_STATE,
    suggestedFollowUps: [],
  };
}

export function resolveChatAnswer(question: string): ResolvedChatAnswer {
  const normalizedQuestion = normalizeText(question);

  if (!normalizedQuestion) {
    return createFallbackAnswer(question, normalizedQuestion);
  }

  const questionTokens = toTokenSet(tokenize(question));
  const rankedTopics = indexedTopics
    .map((topic) => ({
      score: scoreTopic(normalizedQuestion, questionTokens, topic),
      topic: topic.topic,
    }))
    .sort((left, right) => right.score - left.score);

  const bestMatch = rankedTopics[0];
  const secondBestMatch = rankedTopics[1];

  if (!bestMatch) {
    return createFallbackAnswer(question, normalizedQuestion);
  }

  const confidentlyAhead =
    !secondBestMatch ||
    bestMatch.score - secondBestMatch.score >= AMBIGUITY_DELTA ||
    bestMatch.score >= secondBestMatch.score + 3;

  if (bestMatch.score < CONFIDENCE_THRESHOLD || !confidentlyAhead) {
    return createFallbackAnswer(question, normalizedQuestion);
  }

  return {
    question,
    normalizedQuestion,
    mode: "answer",
    confidence: Math.min(0.98, bestMatch.score / 14),
    matchedTopicId: bestMatch.topic.topicId,
    title: bestMatch.topic.title,
    siteAnswer: bestMatch.topic.siteAnswerSections,
    sources: bestMatch.topic.sefariaRefs,
    fallback: null,
    suggestedFollowUps: bestMatch.topic.suggestedQuestions
      .filter((suggestedQuestion) => normalizeText(suggestedQuestion) !== normalizedQuestion)
      .slice(0, 2),
  };
}
