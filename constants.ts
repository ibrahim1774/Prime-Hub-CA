
import { Type } from "@google/genai";

export const SYSTEM_PROMPT = `
You are a Senior Conversion-Focused Copywriter for Home Services.
Your goal is to write high-conversion landing page copy for a home service contractor.

CONTENT STRATEGY RULES (CRITICAL):
1. Brand Placement: Include Company Name + Location in the Hero Headline and ONE other major section title (e.g. Credentials).
2. Concise Headlines: Aim for 6-8 words maximum.
3. Industry Customization: Adapt terminology to the specific {industry}.
4. Premium Tone: Professional, trustworthy, and practical. Avoid hype.

SECTIONS TO GENERATE:
1. Hero: Headline (3 lines), subtext, badge, and 3-4 key stats (e.g. "Years in Business", "Completed Projects").
2. Services: Exactly 4 distinct service cards with icons.
3. Value Proposition: Section headline, subtitle, descriptive content, and 3-4 highlights (bullet points).
4. Trust Indicators: Exactly 4 blocks highlighting guarantees, licensing, or availability.
5. Benefits/Advantages: Section headline and exactly 6 checklist items.
6. Process: Exactly 3 logical steps from start to finish.
7. Credentials: Title, description, and list of 3-4 certification names/badges.
8. FAQs: Exactly 4 common questions.

Icon Selection: Use Lucide-react icon names in dash-case (e.g., "wrench", "shield-check", "clock").

Industry: {industry}
Company: {companyName}
Location: {location}
Phone: {phone}
`;

export const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    bannerText: { type: Type.STRING },
    hero: {
      type: Type.OBJECT,
      properties: {
        badge: { type: Type.STRING },
        headline: {
          type: Type.OBJECT,
          properties: {
            line1: { type: Type.STRING },
            line2: { type: Type.STRING },
            line3: { type: Type.STRING }
          },
          required: ["line1", "line2", "line3"]
        },
        subtext: { type: Type.STRING },
        stats: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              label: { type: Type.STRING },
              value: { type: Type.STRING }
            },
            required: ["label", "value"]
          },
          minItems: 3,
          maxItems: 4
        }
      },
      required: ["badge", "headline", "subtext", "stats"]
    },
    services: {
      type: Type.OBJECT,
      properties: {
        cards: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              icon: { type: Type.STRING }
            },
            required: ["title", "description", "icon"]
          },
          minItems: 4,
          maxItems: 4
        }
      },
      required: ["cards"]
    },
    valueProposition: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        subtitle: { type: Type.STRING },
        content: { type: Type.STRING },
        highlights: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          minItems: 3,
          maxItems: 4
        }
      },
      required: ["title", "subtitle", "content", "highlights"]
    },
    trustIndicators: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        items: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              icon: { type: Type.STRING }
            },
            required: ["title", "description", "icon"]
          },
          minItems: 4,
          maxItems: 4
        }
      },
      required: ["title", "items"]
    },
    benefits: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        items: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          minItems: 6,
          maxItems: 6
        }
      },
      required: ["title", "items"]
    },
    process: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        steps: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              icon: { type: Type.STRING }
            },
            required: ["title", "description", "icon"]
          },
          minItems: 3,
          maxItems: 3
        }
      },
      required: ["title", "steps"]
    },
    credentials: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        description: { type: Type.STRING },
        badges: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          minItems: 3,
          maxItems: 4
        }
      },
      required: ["title", "description", "badges"]
    },
    faqs: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          question: { type: Type.STRING },
          answer: { type: Type.STRING }
        },
        required: ["question", "answer"]
      },
      minItems: 4,
      maxItems: 4
    },
    contact: {
      type: Type.OBJECT,
      properties: {
        phone: { type: Type.STRING },
        location: { type: Type.STRING },
        companyName: { type: Type.STRING }
      },
      required: ["phone", "location", "companyName"]
    }
  },
  required: ["bannerText", "hero", "services", "valueProposition", "trustIndicators", "benefits", "process", "credentials", "faqs", "contact"]
};

export const STATUS_MESSAGES = [
  "Setting up your website structure...",
  "Creating your homepage layout...",
  "Adding your services and content...",
  "Optimizing layout for mobile and desktop...",
  "Applying your business details...",
  "Finalizing design and sections...",
  "Your site is almost ready..."
];
