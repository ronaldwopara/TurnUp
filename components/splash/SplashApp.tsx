"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent, type TouchEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  TweakColor,
  TweakSection,
  TweakSlider,
  TweaksPanel,
  useTweaks,
} from "@/components/tweaks-panel";

import { getUserProfile, setUserProfile } from "@/lib/discoveries-store";
import { getPermissionStep, setPermissionStep } from "@/lib/onboarding-perms";
import { UNIVERSITIES, universitiesForCity } from "@/lib/browse-data";
import { requestUserCityFromBrowser } from "@/lib/onboarding-location";

const EVENT_WORDS = [
  "tribe",
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
  "date night"
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

const PERMISSION_TOAST_MSGS = [
  "You can still discover events anywhere. Turn on location for what's near you.",
  "Be the first to know. Never miss what's happening.",
  "Snap posters, capture moments, and create events in seconds.",
];

const LOCATION_PERMISSION_ERRORS: Record<string, string> = {
  unsupported: "Location isn't supported in this browser. You can pick your university manually.",
  denied: "Location permission denied. You can still continue and choose manually.",
  unavailable: "We couldn't get your location. Try again or continue without it.",
  timeout: "Location request timed out. Try again or continue without it.",
  unknown: "Couldn't get your location right now. You can continue without it.",
  geocode_failed: "Location found, but city lookup failed. You can continue without it.",
};

/** Toast chrome follows the visible onboarding slide (0 = accent from tweaks, 1 = red slide, 2 = green slide). */
type ToastItem = {
  msg: string;
  slideIndex: number;
  accentColor?: string;
  key?: number;
};

/** Dominant colours from each slide — must stay in sync with Slide1 accent / Slide2 & Slide3 headline colours */
function toastBackgroundForSlide(toast: ToastItem): string {
  switch (toast.slideIndex) {
    case 0:
      return toast.accentColor ?? "#6366f1";
    case 1:
      return "#f87171";
    case 2:
      return "#4ade80";
    default:
      return "#6366f1";
  }
}

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

  const motion = phase === "visible" ? " visible" : phase === "exit" ? " exit" : "";
  const bgStyle: CSSProperties = { background: toastBackgroundForSlide(toast) };

  return (
    <div className="toaster-wrap">
      <div className={`toaster${motion}`} style={bgStyle}>
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

function PhoneScreen({ fromProfile = false }: { fromProfile?: boolean }) {
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
  const [permStep, setPermStepState] = useState(0);
  const [activeToast, setActiveToast] = useState<ToastItem | null>(null);
  const [locationCity, setLocationCity] = useState("");

  useEffect(() => {
    // Always start onboarding permissions from step 0 on each reload.
    setPermissionStep(0);
    setPermStepState(0);
    const profile = getUserProfile();
    if (profile?.locationCity) {
      setLocationCity(profile.locationCity);
    }
  }, []);

  const setPermStep = (updater: number | ((p: number) => number)) => {
    setPermStepState((prev) => {
      const next = typeof updater === "function" ? (updater as (p: number) => number)(prev) : updater;
      const clamped = Math.max(0, Math.min(PERMISSION_STEPS.length - 1, next));
      setPermissionStep(clamped);
      return clamped;
    });
  };

  const goToSlide = (idx: number) => {
    const clamped = Math.max(0, Math.min(TOTAL_SLIDES - 1, idx));
    setCurrentSlide(clamped);
  };

  const handleTap = (e: MouseEvent<HTMLDivElement> | TouchEvent<HTMLDivElement>) => {
    let clientX: number | undefined;
    if ("changedTouches" in e && e.changedTouches?.length) {
      clientX = e.changedTouches[0].clientX;
    } else if ("touches" in e && e.touches?.length) {
      clientX = e.touches[0].clientX;
    } else if ("clientX" in e) {
      clientX = e.clientX;
    }
    if (clientX == null) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const localX = clientX - rect.left;
    if (localX < rect.width / 2) {
      goToSlide(currentSlide - 1);
    } else {
      goToSlide(currentSlide + 1);
    }
  };

  const goCamera = () => {
    router.push("/camera");
  };

  const persistDetectedCity = (city: string) => {
    const previous = getUserProfile();
    const localUniversities = universitiesForCity(city);
    setUserProfile({
      ...(previous ?? {}),
      name: previous?.name ?? "",
      university: previous?.university ?? "",
      locationCity: city,
      availableUniversityIds: localUniversities.map((school) => school.id),
    });
    setLocationCity(city);
  };

  const movePermissionStepForward = () => {
    if (permStep === PERMISSION_STEPS.length - 1) {
      goCamera();
      return;
    }
    setPermStep((p) => p + 1);
  };

  const handlePrimaryPermissionAction = async () => {
    if (permStep !== 0) {
      movePermissionStepForward();
      return;
    }

    const result = await requestUserCityFromBrowser();
    if (result.ok) {
      persistDetectedCity(result.city);
      setActiveToast({
        msg: `Location enabled. Showing campuses near ${result.city}.`,
        slideIndex: currentSlide,
        accentColor,
        key: Date.now(),
      });
      movePermissionStepForward();
      return;
    }

    setActiveToast({
      msg: LOCATION_PERMISSION_ERRORS[result.reason],
      slideIndex: currentSlide,
      accentColor,
      key: Date.now(),
    });
  };

  const currentPermissionLabel =
    permStep === 0 ? "Use current location" : PERMISSION_STEPS[Math.min(permStep, PERMISSION_STEPS.length - 1)].btn;

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

      {fromProfile ? (
        <header className="perms-header-shell">
          <div className="perms-progress-slot">
            <ProgressBars total={TOTAL_SLIDES} current={currentSlide} />
          </div>
          <div className="perms-brand-row">
            <button
              type="button"
              className="perms-back-pill"
              onClick={(e) => {
                e.stopPropagation();
                router.push("/profile");
              }}
              onTouchEnd={(e) => e.stopPropagation()}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M15 6l-6 6 6 6" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Profile
            </button>
            <span className="perms-brand-title">TurnUp</span>
            <span className="perms-brand-tagline">
              events for students,
              <br />
              by students
            </span>
          </div>
        </header>
      ) : (
        <>
          <div className="logo">
            <span className="logo-name">TurnUp</span>
            <span className="logo-tagline">
              events for students,
              <br />
              by students
            </span>
          </div>
          <ProgressBars total={TOTAL_SLIDES} current={currentSlide} />
        </>
      )}

      <Toaster toast={activeToast} />

      <div className="bottom-actions">
        <div className="uni-input-wrap">
          <input
            className="uni-input"
            type="text"
            placeholder={currentPermissionLabel}
            readOnly
            style={{ cursor: "pointer" }}
            onClick={async (e) => {
              e.stopPropagation();
              await handlePrimaryPermissionAction();
            }}
            onTouchEnd={(e) => e.stopPropagation()}
          />
        </div>
        <button
          type="button"
          className="browse-btn"
          onClick={(e) => {
            e.stopPropagation();
            setActiveToast({
              msg: PERMISSION_TOAST_MSGS[permStep],
              slideIndex: currentSlide,
              accentColor,
              key: Date.now(),
            });
            if (permStep < PERMISSION_STEPS.length - 1) {
              setPermStep((p) => p + 1);
            } else {
              setTimeout(() => {
                goCamera();
              }, 400);
            }
          }}
          onTouchEnd={(e) => e.stopPropagation()}
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

// ─── Gallery screen ──────────────────────────────────────────────────────────

const GALLERY_IMAGES: { id: number; src: string; tilt: number }[] = [
  { id: 1, tilt: -12, src: "https://images.pexels.com/photos/32025694/pexels-photo-32025694/free-photo-of-romantic-wedding-in-ancient-ruins.jpeg?auto=compress&cs=tinysrgb&w=400" },
  { id: 2, tilt:   6, src: "https://images.pexels.com/photos/31596551/pexels-photo-31596551/free-photo-of-winter-scene-with-lake-view-in-van-turkiye.jpeg?auto=compress&cs=tinysrgb&w=400" },
  { id: 3, tilt:  10, src: "https://images.pexels.com/photos/31890053/pexels-photo-31890053/free-photo-of-moody-portrait-with-heart-shaped-light.jpeg?auto=compress&cs=tinysrgb&w=400" },
  { id: 4, tilt:  -5, src: "https://images.pexels.com/photos/19936068/pexels-photo-19936068/free-photo-of-women-sitting-on-hilltop-with-clouds-below.jpeg?auto=compress&cs=tinysrgb&w=400" },
  { id: 5, tilt:  -8, src: "https://images.pexels.com/photos/20494995/pexels-photo-20494995/free-photo-of-head-of-peacock.jpeg?auto=compress&cs=tinysrgb&w=400" },
  { id: 6, tilt:  14, src: "https://images.pexels.com/photos/32025694/pexels-photo-32025694/free-photo-of-romantic-wedding-in-ancient-ruins.jpeg?auto=compress&cs=tinysrgb&w=400" },
  { id: 7, tilt:  -3, src: "https://images.pexels.com/photos/31890053/pexels-photo-31890053/free-photo-of-moody-portrait-with-heart-shaped-light.jpeg?auto=compress&cs=tinysrgb&w=400" },
];

const ORBIT_RADIUS = 105;
const ORBIT_SPEED = 0.018;

type GalleryRole = "student" | "organiser";

function GalleryScreen({ onDone }: { onDone: () => void }) {
  const [ready, setReady] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [university, setUniversity] = useState("");
  const [name, setName] = useState("");
  const [schoolEmail, setSchoolEmail] = useState("");
  const [role, setRole] = useState<GalleryRole>("student");
  const [dataPrivacyAccepted, setDataPrivacyAccepted] = useState(false);
  const [orbitAngle, setOrbitAngle] = useState(0);
  const [cityHint, setCityHint] = useState("");

  const onboardingProfile = useMemo(() => getUserProfile(), []);
  const availableUniversities = useMemo(() => {
    const ids = onboardingProfile?.availableUniversityIds ?? [];
    const fromIds = ids
      .map((id) => UNIVERSITIES.find((school) => school.id === id))
      .filter((school): school is (typeof UNIVERSITIES)[number] => Boolean(school));
    return fromIds.length > 0 ? fromIds : UNIVERSITIES;
  }, [onboardingProfile]);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 400);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (availableUniversities.length > 0 && !university) {
      setUniversity(availableUniversities[0].name);
    }
    setCityHint(onboardingProfile?.locationCity ?? "");
  }, [availableUniversities, onboardingProfile, university]);

  useEffect(() => {
    let raf: number;
    let last = 0;
    const tick = (now: number) => {
      if (last) {
        const dt = now - last;
        setOrbitAngle((a) => (a + dt * ORBIT_SPEED) % 360);
      }
      last = now;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const handleContinue = () => {
    if (!dataPrivacyAccepted) return;
    const prev = getUserProfile();
    const normalizedUniversity = university.trim().toLowerCase();
    const selectedSchool = availableUniversities.find(
      (school) => school.name.trim().toLowerCase() === normalizedUniversity,
    );
    setUserProfile({
      ...(prev ?? {}),
      name: name.trim() || prev?.name || "",
      university: university.trim() || prev?.university || "",
      universityId: selectedSchool?.id ?? prev?.universityId,
      schoolEmail: schoolEmail.trim() || prev?.schoolEmail,
      role,
      dataPrivacyAccepted: true,
    });
    setExiting(true);
    setTimeout(onDone, 650);
  };

  const total = GALLERY_IMAGES.length;

  return (
    <div className={`gallery-screen${exiting ? " gallery-screen--exit" : ""}`}>
      {/* Orbiting photo carousel */}
      <div className={`gallery-orbit${ready ? " gallery-orbit--visible" : ""}`}>
        {GALLERY_IMAGES.map((img, i) => {
          const deg = orbitAngle + (i * 360) / total;
          const rad = (deg * Math.PI) / 180;
          const x = Math.cos(rad) * ORBIT_RADIUS;
          const y = Math.sin(rad) * ORBIT_RADIUS * 0.55;
          const depth = Math.sin(rad);
          const scale = 0.78 + (depth + 1) * 0.12;
          return (
            <div
              key={img.id}
              className="gallery-card"
              style={{
                transform: `translate(${x}px, ${y}px) rotate(${img.tilt}deg) scale(${scale})`,
                opacity: 0.5 + (depth + 1) * 0.25,
                zIndex: Math.round((depth + 1) * 10),
              } as CSSProperties}
            >
              <img src={img.src} alt="" className="gallery-card-img" draggable={false} decoding="async" />
            </div>
          );
        })}
      </div>

      {/* Lower section — text + form */}
      <div className={`gallery-lower${ready ? " gallery-lower--visible" : ""}`}>
        <div className="gallery-text">
          <h1 className="gallery-heading">Welcome to TurnUp</h1>
          <p className="gallery-sub">events for students, by students</p>
        </div>

        <div className="gallery-form">
          <input
            className="gallery-input"
            type="text"
            placeholder="Enter your University"
            value={university}
            onChange={(e) => setUniversity(e.target.value)}
            autoComplete="organization"
            aria-label="Enter your university"
          />
          {cityHint ? <p className="gallery-sub" style={{ marginTop: 2 }}>Campuses near {cityHint}</p> : null}
          <input
            className="gallery-input"
            type="text"
            placeholder="Enter your Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="given-name"
          />
          <input
            className="gallery-input"
            type="email"
            placeholder="School email"
            value={schoolEmail}
            onChange={(e) => setSchoolEmail(e.target.value)}
            autoComplete="email"
          />

          <div className="gallery-role-row">
            <button
              type="button"
              className={`gallery-role-btn${role === "organiser" ? " gallery-role-btn--active" : ""}`}
              onClick={() => setRole("organiser")}
            >
              Organiser
            </button>
            <button
              type="button"
              className={`gallery-role-btn${role === "student" ? " gallery-role-btn--active" : ""}`}
              onClick={() => setRole("student")}
            >
              Student
            </button>
          </div>

          <label className="gallery-consent-row">
            <input
              type="checkbox"
              className="gallery-consent-check"
              checked={dataPrivacyAccepted}
              onChange={(e) => setDataPrivacyAccepted(e.target.checked)}
            />
            <span className="gallery-consent-label">Data &amp; privacy — I agree to TurnUp&apos;s use of my information.</span>
          </label>

          <button
            type="button"
            className={`gallery-cta${ready ? " gallery-cta--visible" : ""}`}
            onClick={handleContinue}
            disabled={!dataPrivacyAccepted}
          >
            Get Started
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── IntroScreen ─────────────────────────────────────────────────────────────

const INTRO_PARTNER_LOGO_URL =
  "https://res.cloudinary.com/drabss9om/image/upload/q_auto/f_auto/v1777704719/Gemini_Generated_Image_zbdgl3zbdgl3zbdg_u5syxq.jpg";

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
        <img
          src={INTRO_PARTNER_LOGO_URL}
          alt=""
          className="intro-partner-logo-img"
          width={400}
          height={160}
          decoding="async"
        />
      </div>
    </div>
  );
}

export default function SplashApp() {
  const searchParams = useSearchParams();
  const resumeHandled = useRef(false);
  const [stage, setStage] = useState<"intro" | "gallery" | "main">("intro");
  const [mainVisible, setMainVisible] = useState(false);
  const [fromProfile, setFromProfile] = useState(false);

  const resumePermissionsIntent = searchParams.get("resume") === "permissions";

  useEffect(() => {
    if (!resumePermissionsIntent) {
      resumeHandled.current = false;
      return;
    }
    if (resumeHandled.current) return;
    resumeHandled.current = true;
    setFromProfile(true);
    setStage("main");
    setTimeout(() => setMainVisible(true), 80);
  }, [resumePermissionsIntent]);

  const handleIntroDone = useCallback(() => setStage("gallery"), []);
  const handleGalleryDone = useCallback(() => {
    setStage("main");
    setTimeout(() => setMainVisible(true), 80);
  }, []);

  return (
    <div className="mobile-frame">
      {stage === "intro" && <IntroScreen onDone={handleIntroDone} />}
      {stage === "gallery" && <GalleryScreen onDone={handleGalleryDone} />}
      <div className={`main-wrap${mainVisible ? " visible" : ""}`}>
        <PhoneScreen fromProfile={fromProfile} />
      </div>
    </div>
  );
}
