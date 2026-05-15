import { gsap } from "gsap";
import { PlusSquare, Share2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const INSTALL_HEART_SRC = `${import.meta.env.BASE_URL.endsWith("/") ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`}images/install-heart.svg`;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isIosDevice() {
  if (typeof navigator === "undefined") {
    return false;
  }

  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function isStandaloneMode() {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

export function PwaInstallButton() {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [showIosHint, setShowIosHint] = useState(false);
  const [hasPulsed, setHasPulsed] = useState(false);

  useEffect(() => {
    setIsIos(isIosDevice());

    if (isStandaloneMode()) {
      return;
    }

    let hintTimer: number | undefined;

    if (isIosDevice() && !localStorage.getItem("pwa-ios-hint-seen")) {
      hintTimer = window.setTimeout(() => {
        setShowIosHint(true);
        localStorage.setItem("pwa-ios-hint-seen", "1");
      }, 1200);
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => setDeferredPrompt(null);

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      if (hintTimer) {
        window.clearTimeout(hintTimer);
      }

      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  useEffect(() => {
    const button = buttonRef.current;

    if (!button || hasPulsed || !deferredPrompt) {
      return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setHasPulsed(true);
      return;
    }

    const tween = gsap.fromTo(
      button,
      { scale: 1 },
      {
        scale: 1.08,
        duration: 0.55,
        ease: "sine.inOut",
        yoyo: true,
        repeat: 3,
      },
    );

    setHasPulsed(true);

    return () => {
      tween.kill();
      gsap.set(button, { scale: 1 });
    };
  }, [deferredPrompt, hasPulsed]);

  if (isStandaloneMode()) {
    return null;
  }

  const showInstallButton = isIos || Boolean(deferredPrompt);

  if (!showInstallButton) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isIos) {
      setShowIosHint(true);
      return;
    }

    if (!deferredPrompt) {
      return;
    }

    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  return (
    <>
      <div className="pwa-install-anchor pointer-events-none fixed inset-x-0 top-0 z-[2147483645]">
        <div className="pointer-events-auto absolute right-4 top-4 sm:right-6 sm:top-6">
          <button
            ref={buttonRef}
            aria-label="התקנה למסך הבית"
            className="pwa-install-button group"
            type="button"
            onClick={handleInstallClick}
          >
            <img
              alt=""
              aria-hidden="true"
              className="h-9 w-9"
              height={36}
              src={INSTALL_HEART_SRC}
              width={36}
            />
            <span className="pwa-install-tooltip">התקנה למסך הבית</span>
          </button>
        </div>
      </div>

      {showIosHint ? (
        <div className="pwa-ios-hint" role="dialog" aria-labelledby="pwa-ios-hint-title">
          <button
            aria-label="סגירה"
            className="pwa-ios-hint__close"
            type="button"
            onClick={() => setShowIosHint(false)}
          >
            <X className="h-4 w-4" />
          </button>
          <p id="pwa-ios-hint-title" className="pwa-ios-hint__title">
            להתקנה במסך הבית
          </p>
          <p className="pwa-ios-hint__text">
            לחצי על כפתור השיתוף
            <Share2 aria-hidden="true" className="pwa-ios-hint__inline-icon" />
            ואז על «הוספה למסך הבית»
            <PlusSquare aria-hidden="true" className="pwa-ios-hint__inline-icon" />
          </p>
        </div>
      ) : null}
    </>
  );
}
