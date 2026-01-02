
import { GoogleGenAI } from "@google/genai";
import { SYSTEM_PROMPT, RESPONSE_SCHEMA } from "../constants";
import { GeneratedSiteData, GeneratorInputs } from "../types";

/**
 * Utility to strip markdown code blocks from AI response text
 */
const cleanJsonResponse = (text: string): string => {
  return text
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();
};

export const generateSiteContent = async (inputs: GeneratorInputs): Promise<GeneratedSiteData> => {
  // Always create a new instance right before usage to get the latest environment state
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const textPrompt = SYSTEM_PROMPT
    .replace("{industry}", inputs.industry)
    .replace("{companyName}", inputs.companyName)
    .replace("{location}", inputs.location)
    .replace("{phone}", inputs.phone);

  try {
    // 1. Generate Text Content
    const textResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: textPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA as any,
      },
    });

    const rawText = textResponse.text || "{}";
    const cleanedText = cleanJsonResponse(rawText);
    const siteData: Partial<GeneratedSiteData> = JSON.parse(cleanedText);

    // 2. Prepare Image Prompts (3-Image Strategy)
    const imagePromptHero = `Wide establishing shot of a professional ${inputs.industry} team at a job site in ${inputs.location}. Professional uniforms, cinematic lighting, 8k resolution. No text.`;
    const imagePromptValue = `Action shot of a ${inputs.industry} professional performing service. Close-up on tools and expert workmanship, natural lighting, high quality. No text.`;
    const imagePromptTeam = `Professional team portrait of 4-6 ${inputs.industry} contractors in uniform standing confidently in front of a service vehicle in ${inputs.location}. Trustworthy and established business vibe. No text.`;

    // 3. Generate Images in Parallel
    const [heroImgRes, valueImgRes, teamImgRes] = await Promise.all([
      ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: imagePromptHero }] },
      }),
      ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: imagePromptValue }] },
      }),
      ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: imagePromptTeam }] },
      })
    ]);

    const extractImage = (response: any) => {
      try {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            return `data:image/png;base64,${part.inlineData.data}`;
          }
        }
      } catch (e) {
        console.warn("Failed to extract image, using fallback", e);
      }
      return `https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&q=80&w=1200`;
    };

    // 4. Combine and Sanitize
    if (!siteData.hero) siteData.hero = {} as any;
    if (!siteData.contact) siteData.contact = {} as any;
    if (!siteData.valueProposition) siteData.valueProposition = {} as any;
    if (!siteData.credentials) siteData.credentials = {} as any;

    siteData.hero.heroImage = extractImage(heroImgRes);
    siteData.valueProposition.image = extractImage(valueImgRes);
    siteData.credentials.teamImage = extractImage(teamImgRes);

    siteData.contact.phone = inputs.phone;
    siteData.contact.location = inputs.location;
    siteData.contact.companyName = inputs.companyName;

    return siteData as GeneratedSiteData;
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    // Propagate a clean error message if it's a model issue
    if (error.message?.includes("Requested entity was not found")) {
      throw new Error("Model not found or API key restricted. Please ensure your API key is correctly configured.");
    }
    throw error;
  }
};
