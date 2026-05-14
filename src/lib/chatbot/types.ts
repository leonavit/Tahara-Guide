import type { LawSectionId, GuideContact } from "../siteGuideContent";
import type { PhaseId } from "../tracker";

export interface ChatAnswerSection {
  bullets?: string[];
  id: string;
  paragraphs: string[];
  title: string;
}

export interface ChatbotKnowledgeTopic {
  relatedLawSectionIds?: LawSectionId[];
  relatedPhaseIds?: PhaseId[];
  siteAnswerSections: ChatAnswerSection[];
  title: string;
  topicId: string;
}

export interface SefariaSource {
  href: string;
  label: string;
  note?: string;
  ref: string;
}

export interface ChatbotTopicDefinition extends ChatbotKnowledgeTopic {
  sefariaRefs: SefariaSource[];
  suggestedQuestions: string[];
  triggerTerms: string[];
}

export interface ChatbotFallbackState {
  contacts: GuideContact[];
  message: string;
}

export interface ResolvedChatAnswer {
  confidence: number;
  fallback: ChatbotFallbackState | null;
  matchedTopicId: string | null;
  mode: "answer" | "fallback";
  normalizedQuestion: string;
  question: string;
  siteAnswer: ChatAnswerSection[];
  sources: SefariaSource[];
  suggestedFollowUps: string[];
  title: string;
}
