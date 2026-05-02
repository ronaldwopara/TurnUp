"use client";

import { useCallback, useEffect, useState, type CSSProperties, type MouseEvent, type TouchEvent } from "react";
import { useRouter } from "next/navigation";
import {
  TweakColor,
  TweakSection,
  TweakSlider,
  TweaksPanel,
  useTweaks,
} from "@/components/tweaks-panel";

const EVENT_WORDS = [
  "world",
  "festival",
  "run club",
  "art show",
  "pop up",
  "paint & sip",
  "seminar",
  "open mic",
  "game night",
  "hackathon",
  "block party",
  "mixer",
  "study hall",
  "showcase",
  "open house",
];

function CyclingWord({
  words,
  interval = 2200,
  className = "",
  style = {},
}: {
  words: string[];
  interval?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState("active");

  useEffect(() => {
    const timer = setInterval(() => {
      setPhase("exit-up");
      setTimeout(() => {
        setIdx((i) => (i + 1) % words.length);
        setPhase("enter-from-below");
        setTimeout(() => {
          setPhase("active");
        }, 30);
      }, 400);
    }, interval);
    return () => clearInterval(timer);
  }, [words, interval]);

  return (
    <span className="word-animated" style={style}>
      <span className={`word-inner ${phase} ${className}`}>{words[idx]}</span>
    </span>
  );
}

const TOTAL_SLIDES = 3;

function ProgressBars({ total, current }: { total: number; current: number }) {
  return (
    <div className="progress-bars">
      {Array.from({ length: total }).map((_, i) => (
        <div className="progress-bar-track" key={i}>
          <div className={`progress-bar-fill${i <= current ? " complete" : " empty"}`} />
        </div>
      ))}
    </div>
  );
}

function Slide1({
  headlineSize,
  lightOffset,
  accentColor,
}: {
  headlineSize: number;
  lightOffset: number;
  accentColor: string;
}) {
  const beamTranslateY = lightOffset;
  return (
    <div className="phone-screen" style={{ position: "absolute", inset: 0 }}>
      <div className="bg-image" />
      <svg
        className="beams"
        viewBox="0 0 390 600"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
        style={{ transform: `translateY(${beamTranslateY}px)` }}
      >
        <defs>
          <radialGradient id="beam1" cx="50%" cy="0%" r="80%">
            <stop offset="0%" stopColor={accentColor} stopOpacity="0.4" />
            <stop offset="100%" stopColor={accentColor} stopOpacity="0" />
          </radialGradient>
          <radialGradient id="beam2" cx="50%" cy="0%" r="80%">
            <stop offset="0%" stopColor="#ff3366" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#ff3366" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="lbeam1" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={accentColor} stopOpacity="0.28" />
            <stop offset="100%" stopColor={accentColor} stopOpacity="0" />
          </linearGradient>
          <linearGradient id="lbeam2" x1="1" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ff6688" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#ff6688" stopOpacity="0" />
          </linearGradient>
        </defs>
        <ellipse cx="195" cy="120" rx="180" ry="200" fill="url(#beam1)" />
        <ellipse cx="300" cy="180" rx="140" ry="160" fill="url(#beam2)" />
        <polygon className="beam-poly1" points="120,80 160,80 300,420 220,420" fill="url(#lbeam1)" />
        <polygon className="beam-poly2" points="240,70 290,70 380,380 310,380" fill="url(#lbeam2)" />
        <polygon className="beam-poly3" points="60,90 100,90 50,360 20,360" fill="url(#lbeam1)" opacity="0.5" />
        <circle className="spot1" cx="130" cy="88" r="12" fill="#fff" fillOpacity="0.7" />
        <circle className="spot2" cx="200" cy="72" r="8" fill="#fff" fillOpacity="0.5" />
        <circle className="spot3" cx="270" cy="82" r="10" fill="#fff" fillOpacity="0.55" />
        <circle className="spot4" cx="330" cy="95" r="7" fill="#aaddff" fillOpacity="0.6" />
        <circle className="spot5" cx="75" cy="105" r="9" fill="#ffaacc" fillOpacity="0.5" />
      </svg>
      <svg
        className="crowd-svg"
        viewBox="0 0 390 220"
        preserveAspectRatio="xMidYMax meet"
        xmlns="http://www.w3.org/2000/svg"
        style={{ height: "42%" }}
      >
        <path
          d="M0,220 L0,160 C10,155 18,148 25,140 C30,132 28,125 35,120 C42,115 50,118 55,125 C60,132 58,145 65,148 C70,150 75,144 82,138 C88,132 85,122 92,118 C99,114 107,118 112,125 C118,132 116,142 122,146 C127,149 133,143 140,136 C146,129 143,118 150,114 C157,110 165,115 170,122 C175,129 173,140 179,144 C185,148 191,142 197,134 C202,126 200,115 207,111 C214,107 222,113 227,120 C232,127 230,138 236,143 C242,148 249,142 255,134 C260,126 258,114 265,110 C272,106 280,112 285,120 C290,128 288,140 295,144 C301,148 308,140 314,132 C320,124 317,112 324,108 C331,104 340,110 345,118 C350,126 348,138 354,142 C360,146 366,138 370,130 C374,122 372,112 378,108 C383,105 388,110 390,115 L390,220 Z"
          fill="#000"
        />
        <rect x="88" y="105" width="4" height="22" rx="2" fill="#000" />
        <rect x="175" y="95" width="4" height="28" rx="2" fill="#000" />
        <rect x="260" y="98" width="4" height="24" rx="2" fill="#000" />
        <rect x="340" y="100" width="4" height="20" rx="2" fill="#000" />
        <rect x="45" y="110" width="4" height="18" rx="2" fill="#000" />
      </svg>
      <div className="bottom-fade" />
      <div className="headline-wrap">
        <div className="headline" style={{ fontSize: Math.min(headlineSize, 62) }}>
          <span className="headline-line1">
            <span className="find-text">find </span>
            <span style={{ color: "#fff" }}>your</span>
          </span>
          <CyclingWord words={EVENT_WORDS} interval={2400} className="grad-text" />
        </div>
      </div>
    </div>
  );
}

function Slide2() {
  return (
    <div style={{ position: "absolute", inset: 0, background: "#1a0a0a" }}>
      <div className="slide-color" style={{ color: "#fff" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 24 }}>
          <div className="slide-big-text" style={{ color: "#f87171" }}>
            your campus
            <br />
            network.
          </div>
          <div className="slide-sub">
            Discover events across your campus and nearby universities — all in one place.
          </div>
        </div>
      </div>
      <div style={{ position: "absolute", top: 40, right: -40, pointerEvents: "none" }}>
        <div
          style={{
            width: 200,
            height: 200,
            borderRadius: "50%",
            border: "1.5px solid rgba(248,113,113,0.25)",
            animation: "bounce-circle 3.8s ease-in-out infinite",
          }}
        />
      </div>
      <div style={{ position: "absolute", top: 100, right: 20, pointerEvents: "none" }}>
        <div
          style={{
            width: 110,
            height: 110,
            borderRadius: "50%",
            border: "1px solid rgba(248,113,113,0.15)",
            animation: "bounce-circle2 5.2s ease-in-out infinite 0.6s",
          }}
        />
      </div>
      <div style={{ position: "absolute", bottom: 200, left: -30, pointerEvents: "none" }}>
        <div
          style={{
            width: 140,
            height: 140,
            borderRadius: "50%",
            background: "rgba(248,113,113,0.06)",
            border: "1px solid rgba(248,113,113,0.12)",
            animation: "bounce-circle 4.5s ease-in-out infinite 1.2s",
          }}
        />
      </div>
    </div>
  );
}

function Slide3() {
  return (
    <div style={{ position: "absolute", inset: 0, background: "#0a1f0f" }}>
      <div className="slide-color" style={{ color: "#fff" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 24 }}>
          <div className="slide-big-text" style={{ color: "#4ade80" }}>
            create,
            <br />
            share,
            <br />
            turn up.
          </div>
          <div className="slide-sub">
            Host your own events or just show up. Either way, the vibe starts here.
          </div>
        </div>
      </div>
      <div style={{ position: "absolute", top: 60, right: -50, pointerEvents: "none" }}>
        <div
          style={{
            width: 220,
            height: 220,
            borderRadius: "50%",
            border: "1.5px solid rgba(74,222,128,0.2)",
            animation: "bounce-circle2 4.2s ease-in-out infinite",
          }}
        />
      </div>
      <div style={{ position: "absolute", bottom: 220, left: -60, pointerEvents: "none" }}>
        <div
          style={{
            width: 200,
            height: 200,
            borderRadius: "50%",
            border: "1px solid rgba(74,222,128,0.15)",
            animation: "bounce-circle 5.5s ease-in-out infinite 0.8s",
          }}
        />
      </div>
      <div style={{ position: "absolute", top: 200, right: 30, pointerEvents: "none" }}>
        <div
          style={{
            width: 70,
            height: 70,
            borderRadius: "50%",
            background: "rgba(74,222,128,0.07)",
            border: "1px solid rgba(74,222,128,0.18)",
            animation: "bounce-circle 3.2s ease-in-out infinite 1.5s",
          }}
        />
      </div>
    </div>
  );
}

const TOASTS = [
  { msg: "You can still discover events anywhere. Turn on location for what's near you.", color: "slide1" },
  { msg: "Be the first to know. Never miss what's happening.", color: "slide2" },
  { msg: "Snap posters, capture moments, and create events in seconds.", color: "slide3" },
];

type ToastItem = { msg: string; color: string; key?: number };

function Toaster({ toast }: { toast: ToastItem | null }) {
  const [phase, setPhase] = useState("hidden");

  useEffect(() => {
    if (!toast) return;
    setPhase("hidden");
    const t0 = setTimeout(() => setPhase("visible"), 50);
    const t1 = setTimeout(() => setPhase("exit"), 3200);
    const t2 = setTimeout(() => setPhase("hidden"), 3600);
    return () => {
      clearTimeout(t0);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [toast]);

  if (!toast || phase === "hidden") return null;

  return (
    <div className="toaster-wrap">
      <div
        className={`toaster ${toast.color}${phase === "visible" ? " visible" : phase === "exit" ? " exit" : ""}`}
      >
        {toast.msg}
      </div>
    </div>
  );
}

type TweakDefaults = {
  lightOffset: number;
  accentColor: string;
  headlineSize: number;
};

function PhoneScreen() {
  const router = useRouter();
  const [tweaks, setTweak] = useTweaks<TweakDefaults>({
    lightOffset: -8,
    accentColor: "#4466ff",
    headlineSize: 96,
  });

  const { lightOffset, accentColor, headlineSize } = tweaks;

  const PERMISSION_STEPS = [
    { btn: "Use current location", skip: "Not now" },
    { btn: "Allow notifications", skip: "Not now" },
    { btn: "Allow camera", skip: "Not now" },
  ];

  const [currentSlide, setCurrentSlide] = useState(0);
  const [permStep, setPermStep] = useState(0);
  const [activeToast, setActiveToast] = useState<ToastItem | null>(null);

  const goToSlide = (idx: number) => {
    const clamped = Math.max(0, Math.min(TOTAL_SLIDES - 1, idx));
    setCurrentSlide(clamped);
  };

  const handleTap = (e: MouseEvent<HTMLDivElement> | TouchEvent<HTMLDivElement>) => {
    let x: number | undefined;
    if ("changedTouches" in e && e.changedTouches?.length) {
      x = e.changedTouches[0].clientX;
    } else if ("touches" in e && e.touches?.length) {
      x = e.touches[0].clientX;
    } else if ("clientX" in e) {
      x = e.clientX;
    }
    if (x == null) return;
    const w = e.currentTarget.offsetWidth;
    if (x < w / 2) {
      goToSlide(currentSlide - 1);
    } else {
      goToSlide(currentSlide + 1);
    }
  };

  const goCamera = () => {
    router.push("/camera");
  };

  return (
    <div className="phone-screen" onClick={handleTap} onTouchEnd={handleTap}>
      <div
        className="slide"
        style={{
          opacity: currentSlide === 0 ? 1 : 0,
          transition: "opacity 0.5s ease",
          position: "absolute",
          inset: 0,
          pointerEvents: currentSlide === 0 ? "all" : "none",
        }}
      >
        <Slide1 headlineSize={headlineSize} lightOffset={lightOffset} accentColor={accentColor} />
      </div>
      <div
        className="slide"
        style={{
          opacity: currentSlide === 1 ? 1 : 0,
          transition: "opacity 0.5s ease",
          position: "absolute",
          inset: 0,
          pointerEvents: currentSlide === 1 ? "all" : "none",
        }}
      >
        <Slide2 />
      </div>
      <div
        className="slide"
        style={{
          opacity: currentSlide === 2 ? 1 : 0,
          transition: "opacity 0.5s ease",
          position: "absolute",
          inset: 0,
          pointerEvents: currentSlide === 2 ? "all" : "none",
        }}
      >
        <Slide3 />
      </div>

      <div
        className="logo"
        onClick={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
      >
        <span className="logo-name">TurnUp</span>
        <span className="logo-tagline">
          events for students,
          <br />
          by students
        </span>
      </div>

      <ProgressBars total={TOTAL_SLIDES} current={currentSlide} />

      <Toaster toast={activeToast} />

      <div
        className="bottom-actions"
        onClick={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
      >
        <div className="uni-input-wrap">
          <input
            className="uni-input"
            type="text"
            placeholder={PERMISSION_STEPS[Math.min(permStep, PERMISSION_STEPS.length - 1)].btn}
            readOnly
            style={{ cursor: "pointer" }}
            onClick={() => {
              if (permStep === PERMISSION_STEPS.length - 1) {
                goCamera();
              } else {
                setPermStep((p) => p + 1);
              }
            }}
          />
        </div>
        <button
          type="button"
          className="browse-btn"
          onClick={() => {
            setActiveToast({ ...TOASTS[permStep], key: Date.now() });
            if (permStep < PERMISSION_STEPS.length - 1) {
              setPermStep((p) => p + 1);
            } else {
              setTimeout(() => {
                goCamera();
              }, 400);
            }
          }}
        >
          Not now
        </button>
      </div>

      <TweaksPanel>
        <TweakSection label="Lights">
          <TweakSlider
            label="Vertical position"
            value={lightOffset}
            min={-200}
            max={100}
            step={1}
            onChange={(v) => setTweak("lightOffset", v)}
          />
          <TweakColor label="Accent color" value={accentColor} onChange={(v) => setTweak("accentColor", v)} />
        </TweakSection>
        <TweakSection label="Headline">
          <TweakSlider
            label="Font size"
            value={headlineSize}
            min={36}
            max={96}
            step={1}
            onChange={(v) => setTweak("headlineSize", v)}
          />
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

function IntroScreen({ onDone }: { onDone: () => void }) {
  const [logoVisible, setLogoVisible] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setLogoVisible(true), 300);
    const t2 = setTimeout(() => setFadeOut(true), 2200);
    const t3 = setTimeout(() => onDone(), 3100);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onDone]);

  return (
    <div className={`intro-screen${fadeOut ? " fade-out" : ""}`}>
      <span className={`intro-logo${logoVisible ? " visible" : ""}`}>TurnUp</span>
      <span className={`intro-by${logoVisible ? " visible" : ""}`}>by</span>
      <div className={`intro-partner-logo${logoVisible ? " visible" : ""}`}>
        <span>your logo here</span>
      </div>
    </div>
  );
}

export default function SplashApp() {
  const [introDone, setIntroDone] = useState(false);
  const [mainVisible, setMainVisible] = useState(false);

  const handleIntroDone = useCallback(() => {
    setIntroDone(true);
    setTimeout(() => setMainVisible(true), 100);
  }, []);

  return (
    <div className="mobile-frame">
      {!introDone && <IntroScreen onDone={handleIntroDone} />}
      <div className={`main-wrap${mainVisible ? " visible" : ""}`}>
        <PhoneScreen />
      </div>
    </div>
  );
}
