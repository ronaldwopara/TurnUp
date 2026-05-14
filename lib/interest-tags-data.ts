export type InterestTag = {
  id: string;
  label: string;
};

export type InterestCategory = {
  id: string;
  title: string;
  tags: InterestTag[];
};

/** Canonical interest taxonomy — used for onboarding and profile settings. */
export const INTEREST_CATEGORIES: InterestCategory[] = [
  {
    id: "career-professional",
    title: "Career & Professional",
    tags: [
      { id: "career-professional:networking", label: "💼 Networking" },
      { id: "career-professional:career-fairs", label: "🤝 Career Fairs" },
      { id: "career-professional:internships", label: "📝 Internships" },
      { id: "career-professional:resume-workshops", label: "📄 Resume Workshops" },
      { id: "career-professional:seminars", label: "🎤 Seminars" },
      { id: "career-professional:alumni-panels", label: "🎓 Alumni Panels" },
      { id: "career-professional:entrepreneurship", label: "🚀 Entrepreneurship" },
    ],
  },
  {
    id: "social-campus",
    title: "Social & Campus Life",
    tags: [
      { id: "social-campus:mixers", label: "🍹 Mixers" },
      { id: "social-campus:paint-sip", label: "🎨 Paint & Sip" },
      { id: "social-campus:board-game-nights", label: "🎲 Board Game Nights" },
      { id: "social-campus:volunteering", label: "🤝 Volunteering" },
      { id: "social-campus:student-gov", label: "🗳️ Student Gov" },
      { id: "social-campus:cultural-clubs", label: "🌍 Cultural Clubs" },
      { id: "social-campus:weekend-trips", label: "🎒 Weekend Trips" },
    ],
  },
  {
    id: "academics-study",
    title: "Academics & Study",
    tags: [
      { id: "academics-study:study-groups", label: "📚 Study Groups" },
      { id: "academics-study:hackathons", label: "💻 Hackathons" },
      { id: "academics-study:research-symposiums", label: "🔬 Research Symposiums" },
      { id: "academics-study:debate-club", label: "🗣️ Debate Club" },
      { id: "academics-study:language-exchange", label: "🗣️ Language Exchange" },
      { id: "academics-study:tutoring", label: "✏️ Tutoring" },
      { id: "academics-study:book-clubs", label: "📖 Book Clubs" },
    ],
  },
  {
    id: "arts-culture",
    title: "Arts & Culture",
    tags: [
      { id: "arts-culture:live-music", label: "🎸 Live Music" },
      { id: "arts-culture:theater-drama", label: "🎭 Theater & Drama" },
      { id: "arts-culture:photography", label: "📸 Photography" },
      { id: "arts-culture:creative-writing", label: "✍️ Creative Writing" },
      { id: "arts-culture:poetry-slams", label: "🎤 Poetry Slams" },
      { id: "arts-culture:museum-tours", label: "🏛️ Museum Tours" },
      { id: "arts-culture:film-screenings", label: "🎬 Film Screenings" },
    ],
  },
  {
    id: "wellness-recreation",
    title: "Wellness & Recreation",
    tags: [
      { id: "wellness-recreation:intramural-sports", label: "🏆 Intramural Sports" },
      { id: "wellness-recreation:yoga-mindfulness", label: "🧘‍♀️ Yoga & Mindfulness" },
      { id: "wellness-recreation:hiking-outdoors", label: "🥾 Hiking & Outdoors" },
      { id: "wellness-recreation:mental-wellness", label: "🧠 Mental Wellness" },
      { id: "wellness-recreation:group-fitness", label: "💪 Group Fitness" },
      { id: "wellness-recreation:dance-classes", label: "💃 Dance Classes" },
      { id: "wellness-recreation:rock-climbing", label: "🧗 Rock Climbing" },
    ],
  },
  {
    id: "tech-gaming",
    title: "Tech & Gaming",
    tags: [
      { id: "tech-gaming:esports", label: "🎮 Esports" },
      { id: "tech-gaming:coding-clubs", label: "💻 Coding Clubs" },
      { id: "tech-gaming:tabletop-rpgs", label: "🐉 Tabletop RPGs" },
      { id: "tech-gaming:game-dev", label: "🕹️ Game Dev" },
      { id: "tech-gaming:tech-meetups", label: "🔌 Tech Meetups" },
      { id: "tech-gaming:console-gaming", label: "👾 Console Gaming" },
      { id: "tech-gaming:robotics", label: "🤖 Robotics" },
    ],
  },
];
