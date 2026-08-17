import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { completeChat, hasChatLlm } from "./llm";

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

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  private get apiKey() {
    return process.env.OPENAI_API_KEY?.trim() || undefined;
  }

  private get model() {
    return process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  }

  detectLanguage(input: string): SupportedLanguage {
    if (/[\u0A00-\u0A7F]/.test(input)) return "pa";
    if (/[\u0900-\u097F]/.test(input)) return "hi";
    return "en";
  }

  private normalizeIntent(value: unknown): Intent {
    if (typeof value === "string" && (INTENTS as readonly string[]).includes(value)) {
      return value as Intent;
    }
    return "FAQ";
  }

  private normalizeEntities(raw: unknown): IntentEntities {
    if (!raw || typeof raw !== "object") return {};
    const source = raw as Record<string, unknown>;
    const asString = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : undefined);
    const asStringArray = (value: unknown) => {
      if (Array.isArray(value)) {
        return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
      }
      if (typeof value === "string" && value.trim()) {
        return value
          .split(/[,|]/)
          .map((part) => part.trim())
          .filter(Boolean);
      }
      return undefined;
    };
    return {
      skills: asStringArray(source.skills),
      qualification: asString(source.qualification),
      location: asString(source.location),
      sector: asString(source.sector),
      keywords: asStringArray(source.keywords),
      jobId: asString(source.jobId),
    };
  }

  isProductQuestion(input: string): boolean {
    const text = input.toLowerCase();
    const mentionsRival =
      /\b(linkedin|indeed|glassdoor|internshala|naukri|naukari|pgrkam\.com)\b/.test(text);
    const isComparison =
      /\b(over|vs\.?|versus|compared? to|better than|instead of|rather than)\b/.test(text);
    return (
      (mentionsRival &&
        (isComparison || /\b(why|this (web)?app|this website|pgrkam ai|should i use|use this)\b/.test(text))) ||
      (isComparison && /\b(this|it|here|pgrkam|app|website|webapp|site|chatbot|assistant)\b/.test(text)) ||
      /\bwhy .{0,80}\b(use|choose|pick) (this|it|pgrkam|the app)\b/.test(text) ||
      /\b(what can (you|this|the)\b|who are you|what (is|are) (this|pgrkam ai|you)\b|why (should i|do i|would i|i should|to) use\b|why (this|the) (app|webapp|website|site|bot|assistant)\b|about (this|the) (app|webapp|website|site|bot|assistant|pgrkam ai)\b|how does (this|the) (app|webapp|website|bot|assistant) work\b|how (do i|to) use (this|the) (app|website|site|chat)\b|features of (this|the|pgrkam)|what (does|do) (this|the) (app|website|webapp|bot|assistant)|capabilities|why (use|choose) (this|pgrkam))\b/i.test(
        text,
      ) ||
      /यह (ऐप|वेबसाइट|वेब ऐप)|इस (ऐप|वेबसाइट)|क्या कर (सकता|सकती)|क्यों (इस्तेमाल|यूज़|use)|यह क्या है|लिंक्डइन|नौकरी डॉट कॉम/.test(
        text,
      ) ||
      /ਇਹ (ਐਪ|ਵੈੱਬਸਾਈਟ)|ਇਸ (ਐਪ|ਵੈੱਬਸਾਈਟ)|ਕੀ ਕਰ ਸਕਦਾ|ਕਿਉਂ ਵਰਤ|ਇਹ ਕੀ ਹੈ/.test(text) ||
      (/\b(this (web)?app|this website|pgrkam ai)\b/.test(text) &&
        /\b(what|why|how|who|feature|use|do|over)\b/.test(text))
    );
  }

  /** True when the user is asking for an official PGRKAM fact we must not invent. */
  needsOfficialFacts(input: string): boolean {
    const text = input.toLowerCase();
    return /\b(eligib|पात्र|ਯੋਗਤਾ|allowance amount|deadline|last date|notification|vacanc|आवेदन की अंतिम|documents? (needed|required)|exact (amount|date|fee)|district (employment )?office|how (do i|to) register on pgrkam|pgrkam पर पंजीकरण)\b/i.test(
      text,
    );
  }

  fallbackIntent(input: string): IntentResult {
    const text = input.toLowerCase();
    let intent: Intent = "FAQ";
    let confidence = 0.62;

    if (this.isProductQuestion(input)) {
      intent = "HELP";
      confidence = 0.92;
    } else if (/recommend|for me|मेरे लिए|ਮੇਰੇ ਲਈ|jobs for me|मेरी प्रोफ़ाइल|ਮੇਰੀ ਪ੍ਰੋਫਾਈਲ/.test(text)) {
      intent = "JOB_RECOMMENDATION";
      confidence = 0.78;
    } else if (/job|vacanc|opening|naukri|नौकरी|ਨੌਕਰੀ|सरकारी/.test(text)) {
      intent = "JOB_SEARCH";
      confidence = 0.76;
    } else if (/scheme|allowance|yojana|भत्ता|ਭੱਤਾ|योजना|ਸਕੀਮ/.test(text)) {
      intent = "SCHEME_SEARCH";
      confidence = 0.74;
    } else if (/register|registration|पंजीकरण|ਰਜਿਸਟਰ/.test(text)) {
      intent = "REGISTRATION";
      confidence = 0.8;
    } else if (/vocational|iti|skill course|व्यावसायिक|ਵੋਕੇਸ਼ਨਲ/.test(text)) {
      intent = "VOCATIONAL_GUIDANCE";
      confidence = 0.72;
    } else if (/career|after 12|after graduation|करियर|ਕਰੀਅਰ/.test(text)) {
      intent = "CAREER_GUIDANCE";
      confidence = 0.72;
    } else if (
      /^(hi|hello|hey|yo|namaste|sat sri|good morning|good evening|good afternoon|gm\b|ਸਤ ਸ੍ਰੀ|नमस्ते)\b/i.test(
        text.trim(),
      )
    ) {
      intent = "GREETING";
      confidence = 0.93;
    } else if (/help|मदद|ਮਦਦ|what can you|kaise madad/.test(text)) {
      intent = "HELP";
      confidence = 0.85;
    }

    const locationMatch = text.match(
      /\b(punjab|chandigarh|ludhiana|amritsar|jalandhar|mohali|patiala|bathinda|ਪੰਜਾਬ|पंजाब)\b/i,
    );
    const sectorMatch = text.match(
      /\b(it|software|healthcare|education|manufacturing|agriculture|government|finance)\b/i,
    );
    const qualificationMatch = text.match(
      /\b(b\.?\s?tech|m\.?\s?tech|bca|mca|mba|ba|bcom|12th|graduate|diploma|iti)\b/i,
    );

    const stop = new Set([
      "a",
      "an",
      "the",
      "for",
      "me",
      "my",
      "in",
      "on",
      "at",
      "to",
      "of",
      "and",
      "or",
      "find",
      "show",
      "get",
      "please",
      "want",
      "looking",
      "search",
      "with",
      "from",
      "jobs",
      "job",
      "vacancy",
      "vacancies",
      "opening",
      "openings",
      "naukri",
      "fresher",
      "freshers",
    ]);
    const keywords = text
      .split(/[^a-z0-9.+#\u0900-\u097F\u0A00-\u0A7F]+/i)
      .map((part) => part.trim())
      .filter((part) => part.length > 1 && !stop.has(part.toLowerCase()))
      .slice(0, 6);

    return {
      intent,
      language: this.detectLanguage(input),
      confidence,
      entities: {
        location: locationMatch?.[1],
        sector: sectorMatch?.[1],
        qualification: qualificationMatch?.[1],
        keywords: keywords.length ? keywords : undefined,
      },
    };
  }

  async classify(input: string): Promise<IntentResult> {
    const fallback = this.fallbackIntent(input);
    if (!hasChatLlm()) return fallback;

    try {
      const content = await completeChat({
        logger: this.logger,
        json: true,
        temperature: 0,
        messages: [
          {
            role: "system",
            content: `You classify queries for the PGRKAM AI Career Assistant.
Return JSON only with keys: intent, language, confidence, entities.
intent must be one of: ${INTENTS.join(", ")}.
language must be en, hi, or pa.
confidence is 0..1.
GREETING = hi/hello/good morning and similar.
HELP = what this app does, why use it vs LinkedIn/Naukri, features, who you are.
FAQ = PGRKAM portal facts only.
entities may include skills[], qualification, location, sector, keywords[], jobId.`,
          },
          { role: "user", content: input },
        ],
      });
      if (!content) return fallback;
      const parsed = JSON.parse(content) as Partial<IntentResult>;
      const intent =
        fallback.intent === "HELP" && this.normalizeIntent(parsed.intent) === "FAQ"
          ? "HELP"
          : this.normalizeIntent(parsed.intent);
      const parsedConfidence =
        typeof parsed.confidence === "number"
          ? Math.min(1, Math.max(0, parsed.confidence))
          : fallback.confidence;
      return {
        intent,
        language:
          parsed.language === "hi" || parsed.language === "pa" || parsed.language === "en"
            ? parsed.language
            : fallback.language,
        confidence: intent === "HELP" ? Math.max(parsedConfidence, 0.85) : parsedConfidence,
        entities: { ...fallback.entities, ...this.normalizeEntities(parsed.entities) },
      };
    } catch {
      return fallback;
    }
  }

  async embed(text: string): Promise<number[]> {
    if (!this.apiKey) {
      throw new ServiceUnavailableException("OPENAI_API_KEY is required for embeddings.");
    }
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: text,
        dimensions: 1536,
      }),
    });
    if (!response.ok) {
      throw new ServiceUnavailableException("Embedding service is unavailable.");
    }
    const body = (await response.json()) as { data: Array<{ embedding: number[] }> };
    return body.data[0]?.embedding ?? [];
  }

  async answer(question: string, context: string, language: SupportedLanguage): Promise<string> {
    const languageName = language === "hi" ? "Hindi" : language === "pa" ? "Punjabi" : "English";
    const fallbackFromContext = () => {
      if (!context.trim()) {
        return language === "hi"
          ? "मैं इसे PGRKAM ज्ञान आधार से सत्यापित नहीं कर सका।"
          : language === "pa"
            ? "ਮੈਂ ਇਸ ਨੂੰ PGRKAM ਗਿਆਨ ਅਧਾਰ ਤੋਂ ਤਸਦੀਕ ਨਹੀਂ ਕਰ ਸਕਿਆ।"
            : "I couldn't verify this from the PGRKAM knowledge base.";
      }
      const snippet = context
        .split(/\n+/)
        .filter(Boolean)
        .slice(0, 4)
        .join("\n");
      return `${snippet}\n\n(Answer grounded in retrieved PGRKAM sources${this.apiKey ? "" : `; add a working OPENAI_API_KEY for fuller ${languageName} answers`}.)`;
    };

    if (!hasChatLlm()) return fallbackFromContext();

    const content = await completeChat({
      logger: this.logger,
      temperature: 0.35,
      messages: [
        {
          role: "system",
          content: `You are PGRKAM AI, a warm career guide for Punjab employment.
Answer in ${languageName}. Sound like a helpful person, not a form.
Use ONLY the supplied PGRKAM context for official facts. If context is weak, say you could not verify — never invent eligibility, amounts, deadlines, or URLs.
Cite source URLs when present. Do not invent job openings that are not in the context.`,
        },
        {
          role: "user",
          content: `Question: ${question}\n\nContext:\n${context || "(no retrieved context)"}`,
        },
      ],
    });
    return content || fallbackFromContext();
  }

  unverified(language: SupportedLanguage): string {
    if (language === "hi") return "मैं इसे PGRKAM स्रोतों से सत्यापित नहीं कर सका।";
    if (language === "pa") return "ਮੈਂ ਇਸ ਨੂੰ PGRKAM ਸਰੋਤਾਂ ਤੋਂ ਤਸਦੀਕ ਨਹੀਂ ਕਰ ਸਕਿਆ।";
    return "I couldn't verify this from the PGRKAM knowledge base.";
  }

  /**
   * Open-ended assistant reply (product comparisons, career advice, basic Q&A).
   * Must not invent PGRKAM vacancies, scheme amounts, eligibility, deadlines, or URLs.
   */
  async converse(input: {
    question: string;
    language: SupportedLanguage;
    history?: Array<{ role: string; content: string }>;
  }): Promise<string> {
    const languageName =
      input.language === "hi" ? "Hindi" : input.language === "pa" ? "Punjabi" : "English";
    const history = (input.history ?? [])
      .filter((item) => item.role === "user" || item.role === "assistant")
      .slice(-8)
      .map((item) => ({
        role: item.role === "assistant" ? ("assistant" as const) : ("user" as const),
        content: item.content.slice(0, 2000),
      }));

    const content = await completeChat({
      logger: this.logger,
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content: `You are PGRKAM AI, a conversational career copilot for Punjab jobseekers. Reply like ChatGPT: natural, warm, and specific — never like a scripted IVR or FAQ card.

Answer in ${languageName}.

If they greet you (hi, good morning, etc.), greet back in kind, then ask one useful question (jobs, schemes, profile, or how this app can help). Do not dump a feature list unless they ask.

If they ask why use this vs LinkedIn/Naukri/Indeed: be honest and conversational. LinkedIn is a global professional network. This app is Punjab/PGRKAM-focused — government + local jobs, schemes, EN/HI/PA, cited answers, official next-step buttons. They complement each other; this is not a LinkedIn clone.

You may answer career, resume, interview, and general questions freely.
Never invent job openings, salaries, scheme amounts, eligibility, deadlines, or URLs. For those official facts, say you could not verify from PGRKAM sources.
Never paste a canned bullet brochure. Never say you are a language model.`,
        },
        ...history,
        { role: "user", content: input.question },
      ],
    });

    if (content) return content;
    this.logger.warn("No chat LLM available; add GROQ_API_KEY (recommended) or OLLAMA_MODEL.");
    return input.language === "hi"
      ? "मैं यहाँ हूँ — बताइए, नौकरियाँ, योजनाएँ, या यह ऐप LinkedIn से कैसे अलग है?"
      : input.language === "pa"
        ? "ਮੈਂ ਇੱਥੇ ਹਾਂ — ਦੱਸੋ, ਨੌਕਰੀਆਂ, ਸਕੀਮਾਂ, ਜਾਂ ਇਹ ਐਪ LinkedIn ਤੋਂ ਕਿਵੇਂ ਵੱਖਰਾ ਹੈ?"
        : "Hey — I'm here. What do you want to do: look for Punjab jobs, check a scheme, or hear how this differs from LinkedIn?";
  }

  async openEndedOrUnverified(input: {
    question: string;
    language: SupportedLanguage;
    history?: Array<{ role: string; content: string }>;
    officialOnly?: boolean;
  }): Promise<string> {
    if (input.officialOnly || this.needsOfficialFacts(input.question)) {
      return this.unverified(input.language);
    }
    return this.converse(input);
  }

  /**
   * Natural-language reply over structured tool results (jobs, schemes, recommendations).
   * Falls back to a short template when OpenAI is unavailable.
   */
  async compose(input: {
    question: string;
    language: SupportedLanguage;
    intent: Intent;
    fallback: string;
    toolContext: string;
  }): Promise<string> {
    if (!hasChatLlm() || !input.toolContext.trim()) return input.fallback;

    const languageName =
      input.language === "hi" ? "Hindi" : input.language === "pa" ? "Punjabi" : "English";

    const text = await completeChat({
      logger: this.logger,
      temperature: 0.5,
      messages: [
        {
          role: "system",
          content: `You are PGRKAM AI. Write in ${languageName} like a helpful person, not a template.
Intent: ${input.intent}.
Use ONLY the tool data. Never invent jobs, schemes, salaries, deadlines, or URLs.
Mention 2–4 concrete matches by title/employer when available and why they fit.
If the list is empty, say so and suggest broadening search or completing a profile.
End with one short next-step question. No JSON, no "as an AI".`,
        },
        {
          role: "user",
          content: `User message: ${input.question}\n\nTool data:\n${input.toolContext}`,
        },
      ],
    });
    return text || input.fallback;
  }

  clarifyingQuestion(language: SupportedLanguage): string {
    if (language === "hi") {
      return "कृपया स्पष्ट करें — आपको नौकरियाँ, योजनाएँ, पंजीकरण, या करियर मार्गदर्शन चाहिए?";
    }
    if (language === "pa") {
      return "ਕਿਰਪਾ ਕਰਕੇ ਸਪਸ਼ਟ ਕਰੋ — ਤੁਹਾਨੂੰ ਨੌਕਰੀਆਂ, ਸਕੀਮਾਂ, ਰਜਿਸਟ੍ਰੇਸ਼ਨ, ਜਾਂ ਕਰੀਅਰ ਮਾਰਗਦਰਸ਼ਨ ਚਾਹੀਦਾ ਹੈ?";
    }
    return "Could you clarify what you need help with—jobs, schemes, registration, or career guidance?";
  }

  greeting(language: SupportedLanguage): string {
    if (language === "hi") {
      return "नमस्ते! मैं PGRKAM AI करियर सहायक हूँ — पंजाब की नौकरियाँ, योजनाएँ और पंजीकरण, उद्धृत जवाबों के साथ। पूछें: “लुधियाना में IT जॉब्स” या “बेरोजगारी भत्ता”।";
    }
    if (language === "pa") {
      return "ਸਤ ਸ੍ਰੀ ਅਕਾਲ! ਮੈਂ PGRKAM AI ਕਰੀਅਰ ਸਹਾਇਕ ਹਾਂ — ਪੰਜਾਬ ਦੀਆਂ ਨੌਕਰੀਆਂ, ਸਕੀਮਾਂ ਅਤੇ ਰਜਿਸਟ੍ਰੇਸ਼ਨ, ਹਵਾਲਿਆਂ ਨਾਲ। ਪੁੱਛੋ: “ਲੁਧਿਆਣਾ IT ਨੌਕਰੀਆਂ” ਜਾਂ “ਬੇਰੁਜ਼ਗਾਰੀ ਭੱਤਾ”।";
    }
    return "Hello! I'm the PGRKAM AI Career Assistant — Punjab jobs, schemes, and registration with cited answers, not guesses. Try “IT jobs in Ludhiana” or “unemployment allowance”.";
  }

  help(language: SupportedLanguage): string {
    if (language === "hi") {
      return `PGRKAM AI पंजाब के आधिकारिक रोज़गार पोर्टल के ऊपर एक करियर सहायक है — ताकि आपको पूरी साइट खुद न खंगालनी पड़े।

अभी आप कर सकते हैं:
• नौकरियाँ खोजें (स्थान, क्षेत्र, योग्यता)
• प्रोफ़ाइल से व्यक्तिगत सिफ़ारिशें (“मेरे लिए नौकरियाँ”)
• योजनाएँ और पंजीकरण — स्रोतों के साथ; कमज़ोर जानकारी पर हम अनुमान नहीं लगाते
• अंग्रेज़ी, हिन्दी या पंजाबी में बात करें

शुरू करें: “पंजाब में सरकारी IT जॉब” या “बेरोजगारी भत्ता के लिए पात्रता?”`;
    }
    if (language === "pa") {
      return `PGRKAM AI ਪੰਜਾਬ ਦੇ ਅਧਿਕਾਰਤ ਰੁਜ਼ਗਾਰ ਪੋਰਟਲ ਉੱਤੇ ਇੱਕ ਕਰੀਅਰ ਸਹਾਇਕ ਹੈ — ਤਾਂ ਜੋ ਤੁਹਾਨੂੰ ਸਾਰੀ ਸਾਈਟ ਖੁਦ ਨਾ ਖੋਜਣੀ ਪਵੇ।

ਹੁਣ ਤੁਸੀਂ ਕਰ ਸਕਦੇ ਹੋ:
• ਨੌਕਰੀਆਂ ਲੱਭੋ (ਟਿਕਾਣਾ, ਖੇਤਰ, ਯੋਗਤਾ)
• ਪ੍ਰੋਫਾਈਲ ਤੋਂ ਨਿੱਜੀ ਸਿਫਾਰਸ਼ਾਂ (“ਮੇਰੇ ਲਈ ਨੌਕਰੀਆਂ”)
• ਸਕੀਮਾਂ ਅਤੇ ਰਜਿਸਟ੍ਰੇਸ਼ਨ — ਸਰੋਤਾਂ ਨਾਲ; ਕਮਜ਼ੋਰ ਜਾਣਕਾਰੀ ਤੇ ਅੰਦਾਜ਼ਾ ਨਹੀਂ
• ਅੰਗਰੇਜ਼ੀ, ਹਿੰਦੀ ਜਾਂ ਪੰਜਾਬੀ ਵਿੱਚ ਗੱਲ ਕਰੋ

ਸ਼ੁਰੂ ਕਰੋ: “ਪੰਜਾਬ ਵਿੱਚ ਸਰਕਾਰੀ IT ਨੌਕਰੀ” ਜਾਂ “ਬੇਰੁਜ਼ਗਾਰੀ ਭੱਤੇ ਦੀ ਯੋਗਤਾ?”`;
    }
    return `PGRKAM AI is a career copilot on top of Punjab’s official employment portal — so you don’t have to hunt through pages yourself.

You can:
• Search jobs by location, sector, and qualification
• Get ranked matches from a saved profile (“jobs for me”) with a short why
• Ask about schemes and registration — answers are cited; we refuse to guess when sources are weak
• Chat in English, Hindi, or Punjabi

Start with “government IT jobs in Punjab” or “am I eligible for unemployment allowance?”

Unlike LinkedIn or Naukri, this is not a global professional network — it is Punjab/PGRKAM-focused: local and government jobs, schemes, Punjabi/Hindi, and answers that cite sources instead of guessing. Use LinkedIn for networking; use this when you want Punjab employment help.`;
  }

  productBrief(): string {
    return `Product: PGRKAM AI Career Assistant (this website), SIH1305.
Audience: Punjab jobseekers who want faster help than browsing pgrkam.com alone.
Why use it: intent-aware chat in EN/HI/PA; structured job filters; explainable recommendations from a profile; RAG-grounded scheme/guidance answers with citations; official PGRKAM CTAs (URLs are never invented). Weak or missing sources → we say we could not verify, instead of hallucinating.
What works now:
- Chat: jobs, schemes, registration, career/vocational guidance, “jobs for me”
- Pages: Home, Chat, Jobs browse/detail, Profile, Recommendations, Upcoming (roadmap)
- Auth: sign up / sign in, or guest chat
- Languages: English, Hindi, Punjabi
What is not live yet: voice, resume upload, live PGRKAM crawl, skill-gap courses, scheme eligibility scoring UI, admin dashboard.
Example user questions: "find IT jobs in Ludhiana for a B.Tech fresher"; "am I eligible for unemployment allowance?"; "how do I register on PGRKAM?"; "jobs for me".
If they ask why they should use the webapp, contrast with manually searching the portal: faster matching, cited answers, language support, saved profile.`;
  }
}
