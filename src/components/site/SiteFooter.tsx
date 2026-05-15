import { Share2 } from "lucide-react";
import { useState } from "react";

interface SiteFooterProps {
  accessibilityHref: string;
}

export function SiteFooter({ accessibilityHref }: SiteFooterProps) {
  const [shareMessage, setShareMessage] = useState<string | null>(null);

  const handleShare = async () => {
    setShareMessage(null);

    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: "טהרת המשפחה - המדריך האישי שלך",
          text: "מצאתי כלי עזר מדהים למעקב אחר ימי טהרה והכנה לטבילה, כדאי לך לראות:",
          url: window.location.href,
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        console.log("Error sharing", error);
      }

      return;
    }

    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(window.location.href);
      setShareMessage("הקישור הועתק, מוזמנת לשלוח לחברה!");
    }
  };

  return (
    <footer className="pb-6 text-center text-sm text-slate-600">
      <p>בכל שאלה הלכתית יש לפנות לרב.</p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
        <button
          className="inline-flex items-center gap-1.5 font-semibold text-text-plum underline decoration-text-plum/40 underline-offset-4 transition hover:text-[#7f616a]"
          type="button"
          onClick={handleShare}
        >
          <Share2 className="h-4 w-4" aria-hidden="true" />
          שתפי עם חברה
        </button>
        <a
          className="font-semibold text-text-plum underline decoration-text-plum/40 underline-offset-4"
          href={accessibilityHref}
        >
          הצהרת נגישות
        </a>
      </div>
      {shareMessage ? <p className="mt-2 text-xs text-slate-500">{shareMessage}</p> : null}
    </footer>
  );
}
