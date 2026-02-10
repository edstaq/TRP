import { GoogleGenAI } from "@google/genai";
import { Student } from "../types";
import { APP_CONFIG } from "../config";

export class GeminiService {
  async generateSessionSummary(students: Student[], subject: string) {
    try {
      /* Always initialize GoogleGenAI with the API key from environment variables as required by the latest SDK guidelines */
      const ai = new GoogleGenAI({ apiKey: APP_CONFIG.AI_SETTINGS.API_KEY });

      const studentData = students
        .map(s => `${s.name}: Listening Rate ${s.listeningRate}/5, Review: ${s.review}`)
        .join("\n");

      const prompt = `Analyze this teaching session for the subject ${subject}. 
      Here are the students' performance details:
      ${studentData}
      
      Please provide a brief (1-2 paragraph) summary of the session's overall effectiveness and suggestions for the next class.`;

      /* Call generateContent with both model name and prompt as recommended in the SDK documentation */
      const response = await ai.models.generateContent({
        model: APP_CONFIG.AI_SETTINGS.GEMINI_MODEL,
        contents: prompt,
      });

      /* Access the .text property directly (not a method) as per the SDK property definition */
      return response.text || "No summary generated.";
    } catch (error) {
      console.error("Gemini Error:", error);
      return "Could not generate summary at this time.";
    }
  }
}

export const geminiService = new GeminiService();