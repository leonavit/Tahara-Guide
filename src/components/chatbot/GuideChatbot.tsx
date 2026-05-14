import * as Dialog from "@radix-ui/react-dialog";
import {
  autoUpdate,
  flip,
  FloatingFocusManager,
  FloatingPortal,
  offset,
  shift,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
} from "@floating-ui/react";
import {
  BookOpenText,
  ExternalLink,
  MessageCircle,
  Phone,
  SendHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { resolveChatAnswer } from "../../lib/chatbot/resolveChatAnswer";
import { CHATBOT_SUGGESTED_QUESTIONS } from "../../lib/chatbot/topicMappings";
import type { ChatAnswerSection, ResolvedChatAnswer } from "../../lib/chatbot/types";
import { getWhatsAppLink } from "../../lib/siteGuideContent";
import { Button } from "../ui/Button";

interface UserChatMessage {
  id: string;
  role: "user";
  text: string;
}

interface AssistantChatMessage {
  id: string;
  resolution: ResolvedChatAnswer;
  role: "assistant";
  text: string;
}

type ChatMessage = UserChatMessage | AssistantChatMessage;

function createMessageId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const updateIsMobile = () => setIsMobile(mediaQuery.matches);

    updateIsMobile();
    mediaQuery.addEventListener("change", updateIsMobile);

    return () => mediaQuery.removeEventListener("change", updateIsMobile);
  }, [breakpoint]);

  return isMobile;
}

function buildAssistantPreview(answer: ResolvedChatAnswer) {
  if (answer.mode === "fallback") {
    return answer.fallback?.message ?? answer.title;
  }

  return answer.siteAnswer[0]?.paragraphs[0] ?? answer.title;
}

function ContactQuickCard({
  cta,
  name,
  phone,
  role,
}: {
  cta: string;
  name: string;
  phone: string;
  role: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-white/75 bg-white/90 p-4 shadow-soft">
      <p className="text-xs font-semibold text-text-plum">{cta}</p>
      <p className="mt-2 font-heading text-xl text-slate-900">{name}</p>
      <p className="mt-1 text-sm text-slate-600">{role}</p>
      <p className="mt-3 text-sm font-semibold text-slate-800">{phone}</p>

      <div className="mt-4 flex gap-2">
        <a
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-text-plum px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#7f616a]"
          href={`tel:${phone.replace(/-/g, "")}`}
        >
          <Phone className="h-4 w-4" />
          התקשרות
        </a>
        <a
          className="inline-flex items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
          href={getWhatsAppLink(phone)}
          rel="noreferrer"
          target="_blank"
        >
          ווטסאפ
        </a>
      </div>
    </div>
  );
}

function AnswerSectionCard({ section }: { section: ChatAnswerSection }) {
  return (
    <section className="rounded-[1.5rem] border border-white/75 bg-bg-main/70 p-4">
      <h4 className="text-sm font-semibold text-slate-900">{section.title}</h4>

      <div className="mt-3 space-y-2 text-sm leading-7 text-slate-700">
        {section.paragraphs.map((paragraph) => (
          <p key={`${section.id}-${paragraph}`}>{paragraph}</p>
        ))}
      </div>

      {section.bullets?.length ? (
        <ul className="mt-3 space-y-2 pr-5 text-sm leading-7 text-slate-700">
          {section.bullets.map((bullet) => (
            <li key={`${section.id}-${bullet}`} className="list-disc">
              {bullet}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function AssistantMessageCard({ resolution }: { resolution: ResolvedChatAnswer }) {
  return (
    <div className="rounded-[1.8rem] border border-white/75 bg-white/92 p-4 shadow-soft">
      <div className="flex items-center gap-2 text-sm font-semibold text-text-plum">
        <Sparkles className="h-4 w-4" />
        <span>{resolution.title}</span>
      </div>

      {resolution.mode === "answer" ? (
        <>
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">תשובת האתר</p>
            <div className="mt-2 space-y-3">
              {resolution.siteAnswer.map((section) => (
                <AnswerSectionCard key={section.id} section={section} />
              ))}
            </div>
          </div>

          {resolution.sources.length ? (
            <div className="mt-5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                <BookOpenText className="h-4 w-4 text-text-plum" />
                <span>מקורות נוספים</span>
              </div>

              <div className="mt-3 space-y-2">
                {resolution.sources.map((source) => (
                  <a
                    key={`${source.ref}-${source.href}`}
                    className="flex items-start justify-between gap-3 rounded-[1.4rem] border border-white/75 bg-white px-4 py-3 text-right transition hover:border-brand-rose/45 hover:bg-brand-blush/25"
                    href={source.href}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{source.ref}</p>
                      <p className="mt-1 text-xs text-slate-600">{source.label}</p>
                      {source.note ? <p className="mt-1 text-xs text-text-plum/80">{source.note}</p> : null}
                    </div>
                    <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                  </a>
                ))}
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <>
          <div className="mt-4 rounded-[1.5rem] border border-amber-100 bg-amber-50/90 p-4 text-sm leading-7 text-amber-900">
            {resolution.fallback?.message}
          </div>

          {resolution.fallback?.contacts.length ? (
            <div className="mt-4 grid gap-3">
              {resolution.fallback.contacts.map((contact) => (
                <ContactQuickCard key={`${contact.name}-${contact.phone}`} {...contact} />
              ))}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function ChatPanel({
  messages,
  messagesContainerRef,
  onClose,
  onQuestionChange,
  onSubmitQuestion,
  question,
}: {
  messages: ChatMessage[];
  messagesContainerRef: React.RefObject<HTMLDivElement | null>;
  onClose: () => void;
  onQuestionChange: (value: string) => void;
  onSubmitQuestion: (question: string) => void;
  question: string;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="flex max-h-[min(34rem,calc(100vh-7rem))] w-[min(23rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-[2rem] border border-white/80 bg-bg-main/95 shadow-[0_28px_80px_-42px_rgba(73,41,51,0.45)] backdrop-blur-xl sm:w-[23rem]">
      <div className="flex items-start justify-between gap-3 border-b border-white/65 px-5 py-4">
        <div className="text-right">
          <div className="flex items-center justify-end gap-2 text-sm font-semibold text-text-plum">
            <MessageCircle className="h-4 w-4" />
            <span>שאלי את המדריך</span>
          </div>
          <p className="mt-1 text-sm text-slate-600">תשובות קצרות מתוך תוכן האתר, עם מקורות נוספים מספריא.</p>
        </div>
        <button
          aria-label="סגירת הצ׳ט"
          className="rounded-full border border-white/75 bg-white/85 p-2 text-slate-600 transition hover:bg-white"
          type="button"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div ref={messagesContainerRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {messages.length ? (
          <div className="flex flex-col gap-3">
            {messages.map((message) =>
              message.role === "user" ? (
                <div
                  key={message.id}
                  className="mr-auto max-w-[85%] rounded-[1.6rem] bg-text-plum px-4 py-3 text-sm text-white shadow-blush"
                >
                  {message.text}
                </div>
              ) : (
                <AssistantMessageCard key={message.id} resolution={message.resolution} />
              ),
            )}
          </div>
        ) : (
          <div className="space-y-4 text-right">
            <div className="rounded-[1.7rem] border border-white/75 bg-white/90 p-4 shadow-soft">
              <p className="text-sm leading-7 text-slate-700">
                אפשר לשאול כאן שאלות בסיסיות על התוכן שבאתר. אם אין התאמה ברורה, הצ׳ט לא ימציא תשובה ויציע לפנות
                לרב או לרבנית.
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">שאלות מוצעות</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {CHATBOT_SUGGESTED_QUESTIONS.slice(0, 6).map((suggestedQuestion) => (
                  <button
                    key={suggestedQuestion}
                    className="rounded-full border border-white/75 bg-white px-3 py-2 text-sm text-slate-700 transition hover:border-brand-rose/45 hover:bg-brand-blush/25"
                    type="button"
                    onClick={() => onSubmitQuestion(suggestedQuestion)}
                  >
                    {suggestedQuestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <form
        className="border-t border-white/65 px-4 py-4"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmitQuestion(question);
        }}
      >
        <label className="block text-right text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          כתבי שאלה קצרה
        </label>
        <div className="mt-2 flex items-center gap-2">
          <Button className="shrink-0" size="sm" type="submit" variant="primary">
            <SendHorizontal className="h-4 w-4" />
            שלחי
          </Button>
          <input
            ref={inputRef}
            className="w-full rounded-full border border-white/75 bg-white/90 px-4 py-3 text-right text-sm text-slate-800 shadow-sm outline-none transition focus:border-brand-rose focus:ring-2 focus:ring-brand-rose/25"
            dir="rtl"
            placeholder="למשל: כמה בדיקות צריך בשבעה נקיים?"
            type="text"
            value={question}
            onChange={(event) => onQuestionChange(event.target.value)}
          />
        </div>
        <p className="mt-2 text-right text-xs leading-5 text-slate-500">המידע כאן מבוסס על תוכן האתר בלבד ואינו מחליף שאלת רב.</p>
      </form>
    </div>
  );
}

export default function GuideChatbot() {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

  const { context, floatingStyles, refs } = useFloating({
    open: isOpen && !isMobile,
    onOpenChange: setIsOpen,
    placement: "top-start",
    strategy: "fixed",
    whileElementsMounted: autoUpdate,
    middleware: [offset(12), flip({ padding: 16 }), shift({ padding: 16 })],
  });

  const dismiss = useDismiss(context);
  const role = useRole(context);
  const { getFloatingProps } = useInteractions([dismiss, role]);

  useEffect(() => {
    if (!isOpen || !messagesContainerRef.current) {
      return;
    }

    const container = messagesContainerRef.current;
    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  }, [isOpen, messages]);

  function submitQuestion(rawQuestion: string) {
    const trimmedQuestion = rawQuestion.trim();

    if (!trimmedQuestion) {
      return;
    }

    const resolution = resolveChatAnswer(trimmedQuestion);

    setMessages((currentMessages) => [
      ...currentMessages,
      { id: createMessageId(), role: "user", text: trimmedQuestion },
      {
        id: createMessageId(),
        role: "assistant",
        text: buildAssistantPreview(resolution),
        resolution,
      },
    ]);
    setQuestion("");
    setIsOpen(true);
  }

  return (
    <>
      {isMobile ? (
        <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-[2147483646] bg-slate-900/30 backdrop-blur-sm" />
            <Dialog.Content className="fixed inset-x-3 bottom-3 z-[2147483647] outline-none">
              <Dialog.Title className="sr-only">שאלי את המדריך</Dialog.Title>
              <ChatPanel
                messages={messages}
                messagesContainerRef={messagesContainerRef}
                onClose={() => setIsOpen(false)}
                onQuestionChange={setQuestion}
                onSubmitQuestion={submitQuestion}
                question={question}
              />
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      ) : null}

      {!isMobile && isOpen ? (
        <FloatingPortal>
          <FloatingFocusManager context={context} modal={false}>
            <div
              ref={refs.setFloating}
              style={floatingStyles}
              {...getFloatingProps()}
              className="z-[2147483647] outline-none"
            >
              <ChatPanel
                messages={messages}
                messagesContainerRef={messagesContainerRef}
                onClose={() => setIsOpen(false)}
                onQuestionChange={setQuestion}
                onSubmitQuestion={submitQuestion}
                question={question}
              />
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      ) : null}

      <div className="pointer-events-auto fixed bottom-24 left-4 z-[2147483647] sm:bottom-6 sm:left-6">
        <button
          ref={refs.setReference}
          aria-expanded={isOpen}
          aria-label="פתיחת צ׳ט הלכתי"
          className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/92 px-4 py-3 text-sm font-semibold text-slate-800 shadow-soft backdrop-blur-md transition hover:bg-white"
          type="button"
          onClick={() => setIsOpen((currentValue) => !currentValue)}
        >
          <MessageCircle className="h-4 w-4 text-text-plum" />
          <span>שאלי את המדריך</span>
        </button>
      </div>
    </>
  );
}
