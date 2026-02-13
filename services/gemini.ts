
import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { Task } from "../types";

const API_KEY = process.env.API_KEY || "";

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

export async function getGeminiResponse(
  prompt: string,
  tasks: Task[],
  history: any[] = []
) {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  
  const systemInstruction = `You are "AI Pinboard PA", a highly intelligent personal assistant managing a user's digital pinboard. 
  Your goal is to help users manage tasks, deadlines, and productivity. 
  Current user location/time context: ${new Date().toLocaleString()}.
  
  CURRENT TASKS ON PINBOARD:
  ${JSON.stringify(tasks, null, 2)}

  CAPABILITIES:
  - Add tasks (title, description, deadline, priority)
  - Edit/Update tasks
  - Delete tasks
  - Mark tasks complete (using updateTask)
  - Analyze priorities and suggest what to do next.
  - Plan the user's day or week.
  
  Always respond warmly and professionally. If you execute a tool, confirm what you've done.`;

  const generateWithRetry = async (retryCount = 0): Promise<any> => {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
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
      // Retry for internal errors (500) up to 2 times with exponential backoff
      if (retryCount < 2 && (error?.message?.includes('INTERNAL') || error?.status === 500)) {
        console.warn(`Retrying Gemini API call due to error (attempt ${retryCount + 1})...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        return generateWithRetry(retryCount + 1);
      }
      throw error;
    }
  };

  return generateWithRetry();
}
