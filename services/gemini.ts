
import { GoogleGenAI, Type, FunctionDeclaration, Modality } from "@google/genai";
import { Task } from "../types";

// Define function declarations for tool use
const addTaskFn: FunctionDeclaration = {
  name: 'addTask',
  parameters: {
    type: Type.OBJECT,
    description: 'Add a new task to the user\'s pinboard.',
    properties: {
      title: { type: Type.STRING, description: 'The title of the task.' },
      description: { type: Type.STRING, description: 'Detailed notes about the task.' },
      deadline: { type: Type.STRING, description: 'ISO format date string for when the task is due.' },
      priority: { 
        type: Type.STRING, 
        description: 'The urgency level of the task.', 
        enum: ['Low', 'Medium', 'High', 'Urgent'] 
      },
    },
    required: ['title', 'deadline', 'priority'],
  },
};

const updateTaskFn: FunctionDeclaration = {
  name: 'updateTask',
  parameters: {
    type: Type.OBJECT,
    description: 'Update an existing task\'s details.',
    properties: {
      id: { type: Type.STRING, description: 'The unique ID of the task to update.' },
      title: { type: Type.STRING },
      description: { type: Type.STRING },
      deadline: { type: Type.STRING },
      priority: { type: Type.STRING, enum: ['Low', 'Medium', 'High', 'Urgent'] },
      status: { type: Type.STRING, enum: ['Pending', 'Completed'] },
    },
    required: ['id'],
  },
};

const deleteTaskFn: FunctionDeclaration = {
  name: 'deleteTask',
  parameters: {
    type: Type.OBJECT,
    description: 'Delete a task by its ID.',
    properties: {
      id: { type: Type.STRING, description: 'ID of the task to delete.' },
    },
    required: ['id'],
  },
};

/**
 * Generates a text response from Gemini using reasoning capabilities.
 */
export async function getGeminiResponse(
  prompt: string,
  tasks: Task[],
  history: any[] = []
) {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const systemInstruction = `You are "AI Pinboard PA", a highly intelligent personal assistant managing a user's digital pinboard. 
  Your goal is to help users manage tasks, deadlines, and productivity. 
  Current user location/time context: ${new Date().toLocaleString()}.
  
  CURRENT TASKS ON PINBOARD:
  ${JSON.stringify(tasks, null, 2)}

  CAPABILITIES:
  - Add tasks, edit tasks, delete tasks.
  - Analyze priorities.
  - Plan schedules.
  
  Keep responses concise, especially if the user is using voice input.`;

  const generateWithRetry = async (retryCount = 0): Promise<any> => {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: [
          ...history,
          { role: 'user', parts: [{ text: prompt }] }
        ],
        config: {
          systemInstruction,
          tools: [{ functionDeclarations: [addTaskFn, updateTaskFn, deleteTaskFn] }],
          temperature: 0.7,
        },
      });
      return response;
    } catch (error: any) {
      if (retryCount < 2 && (error?.message?.includes('INTERNAL') || error?.status === 500)) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        return generateWithRetry(retryCount + 1);
      }
      throw error;
    }
  };

  return generateWithRetry();
}

/**
 * Generates high-quality speech from text using gemini-2.5-flash-preview-tts.
 */
export async function generateSpeech(text: string) {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' }, // Warm, helpful professional voice
          },
        },
      },
    });

    // The audio data is in the first part of the first candidate as inlineData
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    return base64Audio;
  } catch (error) {
    console.error("Speech Generation Error:", error);
    return null;
  }
}
