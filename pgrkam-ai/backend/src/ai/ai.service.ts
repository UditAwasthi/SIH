import { Injectable, ServiceUnavailableException } from "@nestjs/common";

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
  private readonly apiKey = process.env.OPENAI_API_KEY;
  private readonly model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

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

  fallbackIntent(input: string): IntentResult {
    const text = input.toLowerCase();
    let intent: Intent = "FAQ";
    let confidence = 0.62;

    if (/recommend|for me|मेरे लिए|ਮੇਰੇ ਲਈ|jobs for me|मेरी प्रोफ़ाइल|ਮੇਰੀ ਪ੍ਰੋਫਾਈਲ/.test(text)) {
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
    } else if (/help|मदद|ਮਦਦ|what can you/.test(text)) {
      intent = "HELP";
      confidence = 0.85;
    } else if (/^(hi|hello|hey|namaste|sat sri|ਸਤ ਸ੍ਰੀ|नमस्ते)\b/.test(text)) {
      intent = "GREETING";
      confidence = 0.9;
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

    return {
      intent,
      language: this.detectLanguage(input),
      confidence,
      entities: {
        location: locationMatch?.[1],
        sector: sectorMatch?.[1],
        qualification: qualificationMatch?.[1],
        keywords: text
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 8),
      },
    };
  }

  async classify(input: string): Promise<IntentResult> {
    const fallback = this.fallbackIntent(input);
    if (!this.apiKey) return fallback;

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          response_format: { type: "json_object" },
          temperature: 0,
          messages: [
            {
              role: "system",
              content: `You classify queries for the PGRKAM Punjab employment portal assistant.
Return JSON only with keys: intent, language, confidence, entities.
intent must be one of: ${INTENTS.join(", ")}.
language must be en, hi, or pa (match the user's language, including romanized Hindi/Punjabi).
confidence is 0..1. If unsure, keep confidence below 0.55.
entities may include skills[], qualification, location, sector, keywords[], jobId.`,
            },
            { role: "user", content: input },
          ],
        }),
      });
      if (!response.ok) return fallback;
      const body = (await response.json()) as { choices: Array<{ message: { content: string } }> };
      const parsed = JSON.parse(body.choices[0]?.message.content ?? "{}") as Partial<IntentResult>;
      return {
        intent: this.normalizeIntent(parsed.intent),
        language:
          parsed.language === "hi" || parsed.language === "pa" || parsed.language === "en"
            ? parsed.language
            : fallback.language,
        confidence:
          typeof parsed.confidence === "number"
            ? Math.min(1, Math.max(0, parsed.confidence))
            : fallback.confidence,
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
    if (!this.apiKey) {
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
        .slice(0, 3)
        .join(" ");
      return `${snippet}\n\n(Source-backed excerpt; configure OPENAI_API_KEY for a fuller answer in ${languageName}.)`;
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content: `You are the PGRKAM AI Career Assistant for Punjab employment and self-employment services.
Answer in ${languageName}.
Use ONLY the supplied PGRKAM context. If the context is weak or missing, say you could not verify this from PGRKAM sources — never invent eligibility, money amounts, deadlines, or URLs.
Cite source URLs when present in the context.`,
          },
          {
            role: "user",
            content: `Question: ${question}\n\nContext:\n${context || "(no retrieved context)"}`,
          },
        ],
      }),
    });
    if (!response.ok) {
      throw new ServiceUnavailableException("The AI response service is unavailable.");
    }
    const body = (await response.json()) as { choices: Array<{ message: { content: string } }> };
    return body.choices[0]?.message.content ?? "I couldn't verify this from the supplied sources.";
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
      return "नमस्ते! मैं PGRKAM AI करियर सहायक हूँ। नौकरियाँ खोजें, योजनाएँ समझें, या पंजीकरण मार्गदर्शन लें।";
    }
    if (language === "pa") {
      return "ਸਤ ਸ੍ਰੀ ਅਕਾਲ! ਮੈਂ PGRKAM AI ਕਰੀਅਰ ਸਹਾਇਕ ਹਾਂ। ਨੌਕਰੀਆਂ, ਸਕੀਮਾਂ, ਜਾਂ ਰਜਿਸਟ੍ਰੇਸ਼ਨ ਬਾਰੇ ਪੁੱਛੋ।";
    }
    return "Hello! I'm the PGRKAM AI Career Assistant. Ask about jobs, schemes, registration, or career guidance.";
  }

  help(language: SupportedLanguage): string {
    if (language === "hi") {
      return "मैं मदद कर सकता हूँ: नौकरी खोज, योजना जानकारी, करियर/व्यावसायिक मार्गदर्शन, PGRKAM पंजीकरण, और आपकी प्रोफ़ाइल के आधार पर सिफ़ारिशें।";
    }
    if (language === "pa") {
      return "ਮੈਂ ਮਦਦ ਕਰ ਸਕਦਾ ਹਾਂ: ਨੌਕਰੀ ਖੋਜ, ਸਕੀਮ ਜਾਣਕਾਰੀ, ਕਰੀਅਰ/ਵੋਕੇਸ਼ਨਲ ਮਾਰਗਦਰਸ਼ਨ, PGRKAM ਰਜਿਸਟ੍ਰੇਸ਼ਨ, ਅਤੇ ਤੁਹਾਡੀ ਪ੍ਰੋਫਾਈਲ ਅਧਾਰਿਤ ਸਿਫਾਰਸ਼ਾਂ।";
    }
    return "I can help with job search, scheme information, career and vocational guidance, PGRKAM registration, and personalized job recommendations from your profile.";
  }
}
