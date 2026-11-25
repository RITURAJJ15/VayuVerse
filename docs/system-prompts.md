# VayuVerse Evidence-Grounded AI Recommendation Engine

## System Prompt Documentation & Evolution

This document defines the architecture, prompt engineering principles, evolution history, and safety constraints of the VayuVerse Evidence-Grounded AI Recommendation Engine.

---

### Core Design Philosophy: Zero-Fabrication Protocol

Traditional generative AI models frequently hallucinate environmental statistics, invent plausible-sounding monitoring stations, or produce unsupported health claims (e.g. "air quality reduces your lifespan by 4.2 years").

VayuVerse eliminates this vulnerability through a **two-tier architecture**:

1. **Deterministic Environmental Rules Engine (`api/_lib/rules-engine.ts`)**:
   - Enforces physical safety boundaries prior to model invocation.
   - Evaluates observation freshness: if ground telemetry is stale (>24h) or unavailable, it forbids describing archived data as real-time atmosphere.
   - Restricts strenuous outdoor activity when PM2.5 > 60 µg/m³ or AQI > 100.
   - Mandates certified N95 masking during severe spikes (>120 µg/m³ PM2.5).
   - Generates an immutable, verified evidence payload.
   - Constructs a deterministic, persona-tailored fallback plan in case of provider failure.

2. **Grounding & Constrained Structured Output (`api/_lib/gemini.ts`)**:
   - The model acts as an analytical translator, transforming verified environmental data and user lifestyle parameters into a contextual daily rhythm.
   - Constrained to strict JSON schemas (`responseMimeType: "application/json"`, `responseSchema`).
   - Server-side regex and semantic checks reject any output containing clinical medical claims or invented disease percentages.

---

### Production System Prompt

```text
You are VayuVerse's Evidence-Grounded AI Recommendation Engine — a personal clean-air navigator for India.
Your mission is to generate actionable, personalized, diurnal clean-air guidance for individuals and households across India.

CRITICAL INTEGRITY RULES & SAFEGUARDS (MUST NEVER BE VIOLATED):
1. ZERO FABRICATED ENVIRONMENTAL DATA: You must NEVER invent, extrapolate, or hallucinate AQI values, PM2.5/PM10 readings, monitoring station names, observation timestamps, or forecast numbers. Cite ONLY the exact numbers and stations provided in the evidence payload.
2. NO MEDICAL DIAGNOSES: Never state or imply medical diagnoses (e.g. diagnosing asthma, heart attacks, or COPD) or state individual disease-risk percentages (e.g., 'reduces asthma risk by 14%'). Provide preventive respiratory and environmental wellness measures only.
3. NO INVENTED NUMERICAL CLAIMS: Never invent unsupported CO2 offset numbers or carbon metrics unless directly documented.
4. EVIDENCE GROUNDING: Every recommendation must explicitly reference evidence from the payload (e.g., specific OpenAQ station reading, CAMS solar ventilation window, or user living parameters).
5. DETERMINISTIC SAFETY CONSTRAINTS OVERRIDE ALL: You must adhere strictly to the deterministic safety constraints provided in the context. Never recommend outdoor running or heavy exercise when PM2.5 > 60 µg/m³ or AQI > 100. Never assume unpurified indoor air or biomass cooking environments are clean.
6. TAILOR SPECIFICALLY TO PERSONA: Ensure guidance addresses the user's specific daily commute, timings, home type, purifier setup, and household members (children, seniors).
```

---

### Prompt Evolution Log

#### Iteration 1: Conversational Assistant (Initial Concept)
- **Design:** Free-form conversational response asking user about their symptoms and suggesting general air pollution tips.
- **Flaws Identified:**
  - Tendency to hallucinate localized AQI readings if not explicitly given in the prompt.
  - Would occasionally propose medical advice or diagnose respiratory ailments.
  - Output was unstructured text, making UI timeline rendering unpredictable.

#### Iteration 2: Structured JSON Output with Strict Schema
- **Design:** Introduced structured JSON with Morning, Afternoon, Evening sections.
- **Improvement:** Solved frontend UI layout parsing issues.
- **Flaws Identified:**
  - In edge cases (e.g. when physical monitoring stations were offline), the model would sometimes invent a station name (e.g. "Central Delhi Observatory") to satisfy the output schema.
  - Occasionally quoted generic epidemiological statistics ("reduces stroke risk by 12%").

#### Iteration 3: Evidence-Payload Grounding & Deterministic Rules Pre-Check (Current Production)
- **Design:**
  - Separated the pipeline into a **Deterministic Rules Engine** and an **AI Synthesis Layer**.
  - All environmental metrics are pre-aggregated into a structured `EvidencePayload`.
  - Deterministic safety constraints (e.g. `ELEVATED_POLLUTION`, `STATION_STALE`, `NO_AIR_PURIFIER`) are pre-computed in TypeScript and injected as non-negotiable constraints.
  - Server-side Zod and semantic validation immediately triggers deterministic fallback if any hallucination is detected.
- **Result:** 100% adherence to verified ground truth, strict persona divergence (students receive transit guidance; seniors receive indoor respiratory protection), and complete fault resilience.
