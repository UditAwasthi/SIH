export const INTENTS = [
  "JOB_SEARCH",
  "JOB_DETAILS",
  "SCHEME_SEARCH",
  "CAREER_GUIDANCE",
  "VOCATIONAL_GUIDANCE",
  "REGISTRATION",
  "FAQ",
  "GREETING",
  "HELP",
  "JOB_RECOMMENDATION",
] as const;

export type Intent = (typeof INTENTS)[number];
export type SupportedLanguage = "en" | "hi" | "pa";

export interface IntentEntities {
  skills?: string[];
  qualification?: string;
  location?: string;
  sector?: string;
  keywords?: string[];
  jobId?: string;
}

export interface IntentResult {
  intent: Intent;
  language: SupportedLanguage;
  confidence: number;
  entities: IntentEntities;
}

export interface Citation {
  sourceUrl: string;
  title?: string;
  lastCrawledAt?: string;
}

export interface NavigationCta {
  intent: string;
  ctaLabel: string;
  targetUrl: string;
  description: string;
}

export interface JobCard {
  id: string;
  title: string;
  employer: string;
  location: string;
  sector: string;
  qualification?: string | null;
  minExperience?: number | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  requiredSkills: string[];
  deadline?: string | null;
  sourceUrl: string;
}

export interface RecommendationWhy {
  matchedSkills: string[];
  educationMatch: boolean;
  locationMatch: boolean;
  sectorMatch: boolean;
}

export interface JobRecommendation {
  job: JobCard;
  score: number;
  why: RecommendationWhy;
}

export interface ChatMessageResponse {
  conversationId: string;
  message: {
    id: string;
    role: "user" | "assistant";
    content: string;
    detectedLanguage?: string | null;
    intent?: string | null;
    sources?: Citation[] | null;
  };
  intent: IntentResult;
  jobs: JobCard[];
  recommendations?: JobRecommendation[];
  navigation: NavigationCta | null;
  sources: Citation[];
}

export const EXAMPLE_PROMPTS = {
  en: [
    "What can this app do?",
    "Find government jobs in Punjab for a B.Tech CSE fresher",
    "Am I eligible for unemployment allowance?",
    "How do I register on PGRKAM?",
    "Suggest careers after 12th commerce",
    "Jobs for me based on my profile",
  ],
  hi: [
    "यह ऐप क्या कर सकता है?",
    "पंजाब में बी.टेक सीएसई फ्रेशर के लिए सरकारी नौकरियाँ खोजें",
    "क्या मैं बेरोजगारी भत्ते के लिए पात्र हूँ?",
    "PGRKAM पर पंजीकरण कैसे करें?",
    "12वीं कॉमर्स के बाद करियर सुझाव",
    "मेरी प्रोफ़ाइल के अनुसार नौकरियाँ",
  ],
  pa: [
    "ਇਹ ਐਪ ਕੀ ਕਰ ਸਕਦਾ ਹੈ?",
    "ਪੰਜਾਬ ਵਿੱਚ ਬੀ.ਟੈਕ ਸੀਐਸਈ ਫਰੈਸ਼ਰ ਲਈ ਸਰਕਾਰੀ ਨੌਕਰੀਆਂ ਲੱਭੋ",
    "ਕੀ ਮੈਂ ਬੇਰੁਜ਼ਗਾਰੀ ਭੱਤੇ ਲਈ ਯੋਗ ਹਾਂ?",
    "PGRKAM ਤੇ ਰਜਿਸਟਰ ਕਿਵੇਂ ਕਰੀਏ?",
    "12ਵੀਂ ਕਾਮਰਸ ਤੋਂ ਬਾਅਦ ਕਰੀਅਰ ਸੁਝਾਅ",
    "ਮੇਰੀ ਪ੍ਰੋਫਾਈਲ ਅਨੁਸਾਰ ਨੌਕਰੀਆਂ",
  ],
} as const;
