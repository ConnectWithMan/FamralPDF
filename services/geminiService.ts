
import { GoogleGenAI } from "@google/genai";
import { ChatMessage } from "../types";

const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found in environment variables");
  }
  return new GoogleGenAI({ apiKey });
};

export const chatWithContext = async (
  history: ChatMessage[],
  newMessage: string,
  context: string
): Promise<string> => {
  try {
    const ai = getAIClient();
    
    // Check if context is too large (Gemini 3 Flash has large context window)
    const effectiveContext = context ? context : "No PDF document loaded.";

    // Using gemini-3-flash-preview for basic document interaction tasks
    const chat = ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: {
        systemInstruction: `You are an intelligent PDF assistant. 
        You have access to the full text content of the uploaded PDF document.
        
        DOCUMENT CONTEXT:
        ${effectiveContext}
        
        INSTRUCTIONS:
        1. Answer the user's questions based strictly on the provided document context.
        2. If the answer is not in the document, state that you cannot find the information in the provided file.
        3. Be concise, professional, and helpful.
        4. If asked to summarize, provide a structured summary of the key points.`,
      },
      history: history.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.text }]
      }))
    });

    const response = await chat.sendMessage({ message: newMessage });
    return response.text || "I couldn't generate a response.";
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    return "Sorry, I encountered an error communicating with the AI. Please try again.";
  }
};
