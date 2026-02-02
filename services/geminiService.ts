
import { GoogleGenAI, Type } from "@google/genai";
import { Grade } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
// Sử dụng mô hình lite hoặc flash mới nhất để tiết kiệm quota và tăng tốc độ
const GEMINI_MODEL = 'gemini-3-flash-preview';

/**
 * Hàm hỗ trợ thực hiện lại yêu cầu AI khi gặp lỗi hạn mức (429)
 * Sử dụng chiến thuật Exponential Backoff (thời gian chờ tăng dần)
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 2, delay = 3000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const errorMsg = error.message?.toLowerCase() || "";
    const isQuotaError = error.status === 429 || 
                         errorMsg.includes('quota') || 
                         errorMsg.includes('limit') ||
                         errorMsg.includes('too many requests');
    
    if (retries > 0 && isQuotaError) {
      console.warn(`Hạn mức AI tạm thời hết. Thử lại sau ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

export const extractStudents = async (fileBase64: string, mimeType: string): Promise<string[]> => {
  return withRetry(async () => {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: {
        parts: [
          { inlineData: { data: fileBase64, mimeType: mimeType } },
          { text: "Danh sách học sinh (JSON mảng tên):" }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });
    
    const text = response.text;
    if (!text) return [];
    
    try {
      const cleanedText = text.replace(/```json|```/g, '').trim();
      const result = JSON.parse(cleanedText);
      return Array.isArray(result) ? result.map(n => n.toString().trim()).filter(n => n.length > 0) : [];
    } catch (parseError) {
      const jsonMatch = text.match(/\[.*\]/s);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
      throw new Error("Lỗi định dạng dữ liệu học sinh.");
    }
  });
};

export const generateQuestionsFromDoc = async (keyword: string, grade: Grade, fileBase64?: string, mimeType?: string): Promise<any[]> => {
  return withRetry(async () => {
    const ai = getAI();
    const cleanedKeyword = keyword.replace(/\s/g, '').toUpperCase();
    const charCount = cleanedKeyword.length;

    const promptParts: any[] = [];
    if (fileBase64 && mimeType) {
      promptParts.push({ inlineData: { data: fileBase64, mimeType } });
      promptParts.push({ text: `Soạn ${charCount} câu trắc nghiệm Tin ${grade} theo chữ cái: ${cleanedKeyword.split('').join(', ')}.` });
    } else {
      promptParts.push({ text: `Soạn ${charCount} câu trắc nghiệm Tin ${grade} cho: ${cleanedKeyword}.` });
    }
    
    promptParts.push({ 
      text: `JSON format: [{"text": "...", "options": ["A", "B", "C", "D"], "correctAnswer": 0}].`
    });

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: { parts: promptParts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING }, minItems: 4, maxItems: 4 },
              correctAnswer: { type: Type.INTEGER }
            },
            required: ["text", "options", "correctAnswer"]
          }
        }
      }
    });

    const text = response.text;
    if (!text) return [];
    
    try {
      const cleanedText = text.replace(/```json|```/g, '').trim();
      return JSON.parse(cleanedText);
    } catch (parseError) {
      const jsonMatch = text.match(/\[.*\]/s);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
      return [];
    }
  });
};
