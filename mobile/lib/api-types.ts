export type ApiSuccess<T> = { data: T };

export type ApiError = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export type CommunityFlyer = {
  id: string;
  title: string;
  description?: string;
  eventDate?: string;
  price?: string;
  imageUrl?: string;
  sourceUrl?: string;
  calendarUrl?: string;
  color: string;
  accent: string;
  createdAt: string;
  postedBy: string;
  impressions: number;
  saves: number;
  clicks: number;
};

export type ProfileStashItem = {
  id: string;
  type: "document" | "link" | "image" | "video";
  title: string;
  subtitle?: string | null;
  detailLabel?: string | null;
  sourceUrl?: string | null;
  thumbnailUrl?: string | null;
  createdAt?: string;
};

export type ProfileLearnedFact = {
  id: string;
  text: string;
  type?: string;
  confidence?: number;
  generatedAt?: string;
};

export type ProfileBundle = {
  profile?: {
    displayName?: string;
    university?: string;
    universityId?: string;
  };
  stashes?: ProfileStashItem[];
  learnedFacts?: ProfileLearnedFact[];
};

export type IngestEventPayload = {
  event?: {
    title?: string;
    date?: string;
    time?: string;
    location?: string;
    description?: string;
    calendarSchedule?: "daily_same_hours" | "multi_day_continuous";
  };
  calendarPayload?: { googleCalendarUrl?: string };
  extractedText?: string;
  ambiguityNotes?: string[];
  deterministic?: {
    confidence?: number;
    warnings?: string[];
  };
  flyerId?: string;
  alreadyPosted?: boolean;
};

export type ParsedEvent = {
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
  googleCalendarUrl?: string;
  confidence?: number;
  warnings?: string[];
};
