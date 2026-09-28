
import { GoogleGenAI, Type } from "@google/genai";

// Retrieve Gemini API Key from environment or local storage fallback
export const getGeminiApiKey = (): string => {
  if (typeof process !== 'undefined' && process.env?.API_KEY) {
    return process.env.API_KEY;
  }
  if (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) {
    return process.env.GEMINI_API_KEY;
  }
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem('gemini_api_key') || '';
  }
  return '';
};

// Safe helper to obtain the Gemini client instance only when a key exists
const getAIClient = (): GoogleGenAI | null => {
  const apiKey = getGeminiApiKey();
  if (!apiKey) return null;
  try {
    return new GoogleGenAI({ apiKey });
  } catch (error) {
    console.warn("Failed to initialize Google GenAI SDK:", error);
    return null;
  }
};

// Basic runtime cache to prevent redundant heavy calls during component remounts
const insightCache: Record<string, string> = {};

export const suggestSubtasks = async (taskTitle: string, taskDescription: string) => {
  try {
    const ai = getAIClient();
    if (!ai) {
      // Smart default fallback subtasks when Gemini API key is not configured
      return [
        { title: `Define specifications for "${taskTitle}"` },
        { title: `Execute core implementation and testing` },
        { title: `Review results and align with team` }
      ];
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Suggest 3-5 logical sub-tasks for a project task titled "${taskTitle}" with description "${taskDescription}". Return as a list.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
            },
            required: ["title"]
          }
        }
      }
    });
    
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Error suggesting subtasks:", error);
    return [
      { title: `Review ${taskTitle}` },
      { title: `Complete implementation` },
      { title: `Verify deliverables` }
    ];
  }
};

export const generateTaskDescription = async (taskTitle: string) => {
  try {
    const ai = getAIClient();
    if (!ai) {
      return `Coordinate and execute all operational deliverables for ${taskTitle}. Ensure quality control and milestone delivery.`;
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Write a concise 2-sentence professional description for a task titled "${taskTitle}".`,
    });
    return response.text.trim();
  } catch (error) {
    console.error("Error generating description:", error);
    return `Plan, execute, and deliver ${taskTitle} in accordance with project timeline and operational standards.`;
  }
};

export const analyzeProgress = async (tasks: any[]) => {
  try {
    // Create a unique key based on task titles and statuses
    const cacheKey = tasks.map(t => `${t.id}-${t.status}`).sort().join("|");
    if (insightCache[cacheKey]) return insightCache[cacheKey];

    const ai = getAIClient();
    if (!ai) {
      const total = tasks.length;
      const done = tasks.filter(t => t.status === 'done').length;
      const inProgress = tasks.filter(t => t.status === 'in-progress').length;
      const rate = total > 0 ? Math.round((done / total) * 100) : 0;
      return `Team completion is at ${rate}% (${done}/${total} tasks finished, ${inProgress} in progress). Maintain focus on high-priority milestones.`;
    }

    const taskSummary = tasks.map(t => `${t.title} (${t.status})`).join(", ");
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Based on these tasks: ${taskSummary}, provide a one-sentence summary of overall project progress and one key suggestion for improvement.`,
    });
    
    const result = response.text.trim();
    insightCache[cacheKey] = result;
    return result;
  } catch (error) {
    return "Keep up the great work! Focus on clearing your pending tasks.";
  }
};
