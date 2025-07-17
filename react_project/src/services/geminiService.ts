import { GoogleGenerativeAI } from "@google/generative-ai";
import { GenerationOptions } from "../models/types";

// fallback画像
function getPlaceholderBase64Image(): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">
      <rect width="100%" height="100%" fill="#ccc" />
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="32" fill="#333">No API Key</text>
    </svg>
  `.trim();
  return "data:image/svg+xml;base64," + Buffer.from(svg).toString("base64");
}

export async function generateImageWithGemini(prompt: string, options: GenerationOptions): Promise<string> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_API_KEY;
  if (!apiKey) {
    console.warn("No Gemini API Key found. Returning placeholder image.");
    return getPlaceholderBase64Image();
  }

  const ai = new GoogleGenerativeAI(apiKey);

  const generationPrompt = prompt;
  const modelName = options.generationEngineForService || "models/gemini-1.5-pro";

  console.log("Final prompt for Gemini:", generationPrompt);

  try {
    const imageResponse = await ai.models.generateImages({
      model: modelName,
      prompt: generationPrompt,
    });

    const base64Image = imageResponse.data[0];
    return base64Image.startsWith("data:image/") ? base64Image : `data:image/jpeg;base64,${base64Image}`;
  } catch (error) {
    console.error("Error generating image from Gemini:", error);
    return getPlaceholderBase64Image();
  }
}
