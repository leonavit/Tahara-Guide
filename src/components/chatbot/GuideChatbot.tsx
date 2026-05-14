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
          aria-label={`פתיחת ווטסאפ עם ${name}`}
          className="inline-flex items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-700 transition hover:bg-emerald-100"
          href={getWhatsAppLink(phone)}
          rel="noreferrer"
          target="_blank"
        >
          <WhatsAppIcon className="h-5 w-5" />
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
  autoFocusInput,
  messages,
  messagesContainerRef,
  onClose,
  onQuestionChange,
  onSubmitQuestion,
  question,
  scrollAnchorMessageId,
}: {
  autoFocusInput: boolean;
  messages: ChatMessage[];
  messagesContainerRef: React.RefObject<HTMLDivElement | null>;
  onClose: () => void;
  onQuestionChange: (value: string) => void;
  onSubmitQuestion: (question: string) => void;
  question: string;
  scrollAnchorMessageId: string | null;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const scrollAnchorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (autoFocusInput) {
      inputRef.current?.focus();
    }
  }, [autoFocusInput]);

  useEffect(() => {
    if (scrollAnchorMessageId && scrollAnchorRef.current) {
      scrollAnchorRef.current.scrollIntoView({ behavior: "smooth", block: "start", inline: "nearest" });
    }
  }, [scrollAnchorMessageId, messages.length]);

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
                  ref={message.id === scrollAnchorMessageId ? scrollAnchorRef : undefined}
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
            className="w-full rounded-full border border-white/75 bg-white/90 px-4 py-3 text-right text-base text-slate-800 shadow-sm outline-none transition focus:border-brand-rose focus:ring-2 focus:ring-brand-rose/25 sm:text-sm"
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
  const [scrollAnchorMessageId, setScrollAnchorMessageId] = useState<string | null>(null);
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

  function submitQuestion(rawQuestion: string) {
    const trimmedQuestion = rawQuestion.trim();

    if (!trimmedQuestion) {
      return;
    }

    const resolution = resolveChatAnswer(trimmedQuestion);
    const userMessageId = createMessageId();
    const assistantMessageId = createMessageId();

    setMessages((currentMessages) => [
      ...currentMessages,
      { id: userMessageId, role: "user", text: trimmedQuestion },
      {
        id: assistantMessageId,
        role: "assistant",
        text: buildAssistantPreview(resolution),
        resolution,
      },
    ]);
    setScrollAnchorMessageId(userMessageId);
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
                autoFocusInput={false}
                messages={messages}
                messagesContainerRef={messagesContainerRef}
                onClose={() => setIsOpen(false)}
                onQuestionChange={setQuestion}
                onSubmitQuestion={submitQuestion}
                question={question}
                scrollAnchorMessageId={scrollAnchorMessageId}
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
                autoFocusInput={true}
                messages={messages}
                messagesContainerRef={messagesContainerRef}
                onClose={() => setIsOpen(false)}
                onQuestionChange={setQuestion}
                onSubmitQuestion={submitQuestion}
                question={question}
                scrollAnchorMessageId={scrollAnchorMessageId}
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
          className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/80 bg-white/92 p-0 text-sm font-semibold text-slate-800 shadow-soft backdrop-blur-md transition hover:bg-white sm:h-auto sm:w-auto sm:gap-2 sm:px-4 sm:py-3"
          type="button"
          onClick={() => setIsOpen((currentValue) => !currentValue)}
        >
          <MessageCircle className="h-5 w-5 text-text-plum sm:h-4 sm:w-4" />
          <span className="hidden sm:inline">שאלי את המדריך</span>
        </button>
      </div>
    </>
  );
}
