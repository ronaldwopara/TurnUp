export type University = { id: string; abbr: string; name: string; city: string };

export type EventItem = {
  id: number;
  title: string;
  tag: string;
  date: string;
  priceUsd: number;
  color: string;
  accent: string;
  description?: string;
  location?: string;
  imageUrl?: string;
  sourceUrl?: string;
};

export const ONBOARDING_HOME_UNIVERSITY_ID = "nyu";

export const UNIVERSITIES: University[] = [
  { id: "ualberta", abbr: "UAlberta", name: "University of Alberta", city: "Edmonton" },
  { id: "macewan", abbr: "MacEwan", name: "MacEwan University", city: "Edmonton" },
  { id: "nait", abbr: "NAIT", name: "Northern Alberta Institute of Technology", city: "Edmonton" },
  { id: "uofc", abbr: "UCalgary", name: "University of Calgary", city: "Calgary" },
  { id: "mru", abbr: "MRU", name: "Mount Royal University", city: "Calgary" },
  { id: "nyu", abbr: "NYU", name: "New York University", city: "New York" },
  { id: "columbia", abbr: "Columbia", name: "Columbia University", city: "New York" },
  { id: "ucla", abbr: "UCLA", name: "UCLA", city: "Los Angeles" },
  { id: "usc", abbr: "USC", name: "USC", city: "Los Angeles" },
  { id: "bu", abbr: "BU", name: "Boston University", city: "Boston" },
  { id: "mit", abbr: "MIT", name: "MIT", city: "Boston" },
];

export const ALL_EVENTS: EventItem[] = [
  {
    id: 1,
    title: "Rooftop Jazz & Wine Night",
    tag: "Music",
    date: "Fri May 9 · 8pm",
    priceUsd: 25,
    color: "#1a1230",
    accent: "#9b72cf",
    description: "Live jazz on the rooftop with wine pairings and skyline views.",
    location: "Downtown — Rooftop Lounge",
  },
  {
    id: 2,
    title: "Campus Art Showcase",
    tag: "Art",
    date: "Sat May 10 · 2pm",
    priceUsd: 0,
    color: "#0d1f14",
    accent: "#4ade80",
    description: "Student and alumni artists exhibit across three gallery floors.",
    location: "University Arts Building",
  },
  {
    id: 3,
    title: "Friday Night Run Club",
    tag: "Fitness",
    date: "Fri May 9 · 6am",
    priceUsd: 15,
    color: "#1a0e0e",
    accent: "#f87171",
  },
  {
    id: 4,
    title: "Hackathon 2025",
    tag: "Tech",
    date: "May 11–12",
    priceUsd: 45,
    color: "#0d1520",
    accent: "#60a5fa",
  },
  {
    id: 5,
    title: "Open Mic Night",
    tag: "Performance",
    date: "Thu May 8 · 7pm",
    priceUsd: 12,
    color: "#1a1500",
    accent: "#fbbf24",
    description: "Sign up at the door or DM the host. All genres welcome.",
    location: "The Velvet Room",
  },
  {
    id: 6,
    title: "Paint & Sip Social",
    tag: "Art",
    date: "Sun May 11 · 4pm",
    priceUsd: 35,
    color: "#0f0d1a",
    accent: "#c084fc",
  },
];

export function formatPrice(priceUsd: number) {
  return priceUsd === 0 ? "Free" : `$${priceUsd}`;
}
