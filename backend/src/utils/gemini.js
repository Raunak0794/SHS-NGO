import Groq from "groq-sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";

const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

export async function generateAIResponse(prompt) {
    // Try Gemini first
    try {
        console.log("🤖 Trying Gemini...");

        const model = gemini.getGenerativeModel({
            model: "gemini-2.5-flash",
        });

        const result = await model.generateContent(prompt);

        console.log("✅ Gemini succeeded");

        return result.response.text();

    } catch (geminiError) {
        console.error("❌ Gemini failed:", geminiError.message);

        // Gemini quota/rate limit
        const isGeminiLimit =
            geminiError.status === 429 ||
            geminiError.statusCode === 429 ||
            geminiError.message?.toLowerCase().includes("quota") ||
            geminiError.message?.toLowerCase().includes("too many requests") ||
            geminiError.message?.includes("RESOURCE_EXHAUSTED");

        if (!isGeminiLimit) {
            throw geminiError;
        }

        console.log("⚠️ Gemini limit reached → switching to Groq...");

        // Try Groq
        try {
            const completion = await groq.chat.completions.create({
                model: "llama-3.3-70b-versatile",
                messages: [
                    {
                        role: "user",
                        content: prompt,
                    },
                ],
            });

            console.log("✅ Groq succeeded");

            return completion.choices[0].message.content;

        } catch (groqError) {
            console.error("❌ Groq also failed:", groqError.message);

            throw groqError;
        }
    }
}