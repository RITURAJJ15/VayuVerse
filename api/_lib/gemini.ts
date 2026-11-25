import { GoogleGenAI, Type } from "@google/genai";
import {
  GeminiDayPlanOutputSchema,
  type DayPlanResponse,
  type DeterministicRulesResult,
  type DayPlanSection,
} from "../../src/types/recommendations.js";

const DEFAULT_API_KEY = process.env.GEMINI_API_KEY || "";

const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

/**
 * System Prompt for VayuVerse Evidence-Grounded AI Engine
 */
export const VAYUVERSE_SYSTEM_PROMPT = `
You are VayuVerse's Evidence-Grounded AI Recommendation Engine — a personal clean-air navigator for India.
Your mission is to generate actionable, personalized, diurnal clean-air guidance for individuals and households across India.

CRITICAL INTEGRITY RULES & SAFEGUARDS (MUST NEVER BE VIOLATED):
1. ZERO FABRICATED ENVIRONMENTAL DATA: You must NEVER invent, extrapolate, or hallucinate AQI values, PM2.5/PM10 readings, monitoring station names, observation timestamps, or forecast numbers. Cite ONLY the exact numbers and stations provided in the evidence payload.
2. NO MEDICAL DIAGNOSES: Never state or imply medical diagnoses (e.g. diagnosing asthma, heart attacks, or COPD) or state individual disease-risk percentages (e.g., 'reduces asthma risk by 14%'). Provide preventive respiratory and environmental wellness measures only.
3. NO INVENTED NUMERICAL CLAIMS: Never invent unsupported CO2 offset numbers or carbon metrics unless directly documented.
4. EVIDENCE GROUNDING: Every recommendation must explicitly reference evidence from the payload (e.g., specific OpenAQ station reading, CAMS solar ventilation window, or user living parameters).
5. DETERMINISTIC SAFETY CONSTRAINTS OVERRIDE ALL: You must adhere strictly to the deterministic safety constraints provided in the context. Never recommend outdoor running or heavy exercise when PM2.5 > 60 µg/m³ or AQI > 100. Never assume unpurified indoor air or biomass cooking environments are clean.
6. TAILOR SPECIFICALLY TO PERSONA: Ensure guidance addresses the user's specific daily commute, timings, home type, purifier setup, and household members (children, seniors).
`.trim();

/**
 * Structured Output Schema definition for Gemini
 */
const GEMINI_DAY_PLAN_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    morning: {
      type: Type.OBJECT,
      properties: {
        atmosphericContext: {
          type: Type.STRING,
          description: "Brief summary of morning inversion / atmospheric conditions.",
        },
        recommendations: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              action: { type: Type.STRING },
              explanation: { type: Type.STRING },
              timeWindow: { type: Type.STRING },
              evidenceReferences: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              confidenceLevel: {
                type: Type.STRING,
                enum: ["High", "Medium", "Low"],
              },
              limitations: { type: Type.STRING },
              actionCategory: {
                type: Type.STRING,
                enum: [
                  "commute",
                  "indoor",
                  "outdoor",
                  "lifestyle",
                  "health_protection",
                ],
              },
            },
            required: [
              "title",
              "action",
              "explanation",
              "timeWindow",
              "evidenceReferences",
              "confidenceLevel",
              "limitations",
              "actionCategory",
            ],
          },
        },
      },
      required: ["atmosphericContext", "recommendations"],
    },
    afternoon: {
      type: Type.OBJECT,
      properties: {
        atmosphericContext: {
          type: Type.STRING,
          description: "Brief summary of midday solar boundary layer mixing window.",
        },
        recommendations: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              action: { type: Type.STRING },
              explanation: { type: Type.STRING },
              timeWindow: { type: Type.STRING },
              evidenceReferences: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              confidenceLevel: {
                type: Type.STRING,
                enum: ["High", "Medium", "Low"],
              },
              limitations: { type: Type.STRING },
              actionCategory: {
                type: Type.STRING,
                enum: [
                  "commute",
                  "indoor",
                  "outdoor",
                  "lifestyle",
                  "health_protection",
                ],
              },
            },
            required: [
              "title",
              "action",
              "explanation",
              "timeWindow",
              "evidenceReferences",
              "confidenceLevel",
              "limitations",
              "actionCategory",
            ],
          },
        },
      },
      required: ["atmosphericContext", "recommendations"],
    },
    evening: {
      type: Type.OBJECT,
      properties: {
        atmosphericContext: {
          type: Type.STRING,
          description: "Brief summary of evening rush descent / nocturnal accumulation.",
        },
        recommendations: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              action: { type: Type.STRING },
              explanation: { type: Type.STRING },
              timeWindow: { type: Type.STRING },
              evidenceReferences: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              confidenceLevel: {
                type: Type.STRING,
                enum: ["High", "Medium", "Low"],
              },
              limitations: { type: Type.STRING },
              actionCategory: {
                type: Type.STRING,
                enum: [
                  "commute",
                  "indoor",
                  "outdoor",
                  "lifestyle",
                  "health_protection",
                ],
              },
            },
            required: [
              "title",
              "action",
              "explanation",
              "timeWindow",
              "evidenceReferences",
              "confidenceLevel",
              "limitations",
              "actionCategory",
            ],
          },
        },
      },
      required: ["atmosphericContext", "recommendations"],
    },
  },
  required: ["morning", "afternoon", "evening"],
};

/**
 * Server-side safety validator to prevent medical hallucination or unsupported claims
 */
export function sanitizeRecommendationContent(text: string): boolean {
  // Disallow clinical medical claims or percentage disease risk claims
  const forbiddenPatterns = [
    /\bdiagnos(is|ed|ing)\b/i,
    /\bcur(e|ing|ed|es)\b/i,
    /\bcancer risk\b/i,
    /\bstroke risk\b/i,
    /\bheart attack risk\b/i,
    /\bpercent(age)? risk\b/i,
    /\breduces?(\s+.*)?\s+risk\s+by\s+\d+%/i,
    /\b(risk|chance|probability)\s+(of|by)\s+\d+%/i,
    /\b\d+%\s*(lower|higher|reduced|reduction|decrease)\s*(in|of)?\s*(risk|probability|chance)?/i,
  ];

  return !forbiddenPatterns.some((pattern) => pattern.test(text));
}

/**
 * Generates an evidence-grounded personalized day plan using Google Gemini API
 */
export async function generateGeminiDayPlan(
  rulesResult: DeterministicRulesResult,
  customModel?: string
): Promise<DayPlanResponse> {
  const apiKey = DEFAULT_API_KEY;
  const modelName = customModel || DEFAULT_MODEL;

  const { constraints, evidencePayload, fallbackPlan } = rulesResult;

  if (!apiKey) {
    return {
      ...fallbackPlan,
      isAiGenerated: false,
      fallbackReason: "GEMINI_API_KEY is not configured. Displaying verified deterministic plan.",
    };
  }

  try {
    const client = new GoogleGenAI({ apiKey });

    const userPrompt = `
Generate a personalized Daily Clean-Air Plan for this user based on the verified evidence below.

=== EVIDENCE PAYLOAD ===
${JSON.stringify(evidencePayload, null, 2)}

=== DETERMINISTIC SAFETY CONSTRAINTS (MANDATORY) ===
${constraints.map((c, i) => `${i + 1}. ${c}`).join("\n")}

Respond strictly in structured JSON following the required schema.
`.trim();

    const response = await client.models.generateContent({
      model: modelName,
      contents: userPrompt,
      config: {
        systemInstruction: VAYUVERSE_SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema: GEMINI_DAY_PLAN_SCHEMA,
      },
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error("Empty response from Gemini API");
    }

    // Parse JSON
    const parsedJson = JSON.parse(responseText);

    // Validate with Zod
    const validatedOutput = GeminiDayPlanOutputSchema.parse(parsedJson);

    // Run Server-Side Safety Sanity Checks
    const allActions = [
      ...validatedOutput.morning.recommendations,
      ...validatedOutput.afternoon.recommendations,
      ...validatedOutput.evening.recommendations,
    ];

    for (const act of allActions) {
      if (
        !sanitizeRecommendationContent(act.action) ||
        !sanitizeRecommendationContent(act.explanation)
      ) {
        throw new Error(
          `Safety violation: Model output contained prohibited clinical medical claim in '${act.title}'`
        );
      }
    }

    // Assemble final response
    const buildSection = (
      period: "morning" | "afternoon" | "evening",
      title: string,
      timeRange: string,
      data: { atmosphericContext: string; recommendations: typeof allActions }
    ): DayPlanSection => ({
      period,
      title,
      timeRange,
      atmosphericContext: data.atmosphericContext,
      recommendations: data.recommendations.map((r, idx) => ({
        ...r,
        id: `ai-${period}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
        isPlanned: false,
        isDismissed: false,
      })),
    });

    return {
      locationName: evidencePayload.location.name,
      generatedAtUtc: new Date().toISOString(),
      personaTitle: evidencePayload.profile.displayName,
      isAiGenerated: true,
      modelUsed: `Google Gemini (${modelName})`,
      sections: {
        morning: buildSection(
          "morning",
          "Morning Protection & Commute",
          "06:00 – 11:00",
          validatedOutput.morning
        ),
        afternoon: buildSection(
          "afternoon",
          "Midday Solar Window & Activities",
          "11:00 – 17:00",
          validatedOutput.afternoon
        ),
        evening: buildSection(
          "evening",
          "Evening Rush & Night Sanctuary",
          "17:00 – 22:00",
          validatedOutput.evening
        ),
      },
      environmentalSummary: fallbackPlan.environmentalSummary,
      safetyRulesApplied: constraints,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.warn(`[Gemini Engine] Falling back to deterministic plan: ${errorMessage}`);

    return {
      ...fallbackPlan,
      isAiGenerated: false,
      modelUsed: "VayuVerse Deterministic Safety Engine (Fallback)",
      fallbackReason: `AI Generation unavailable (${errorMessage}). Displaying verified deterministic plan.`,
    };
  }
}
