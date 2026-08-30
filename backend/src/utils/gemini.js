const Groq = require("groq-sdk");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-20b";
const AI_PROVIDER = String(process.env.AI_PROVIDER || "gemini").trim().toLowerCase();
const AI_REQUEST_TIMEOUT_MS = Number(process.env.AI_REQUEST_TIMEOUT_MS || 15000);

function normalizeTextResponse(value) {
  if (typeof value === "string") {
    return value.trim();
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeTextResponse(item)).filter(Boolean).join("\n").trim();
  }

  if (value && typeof value === "object") {
    if (typeof value.text === "function") {
      return normalizeTextResponse(value.text());
    }

    if (typeof value.output_text === "string") {
      return value.output_text.trim();
    }
  }

  return "";
}

function tryParseJSON(text, fallback = null) {
  const source = String(text || "").trim();
  if (!source) return fallback;

  try {
    return JSON.parse(source);
  } catch {
    return fallback;
  }
}

function extractJSONBlock(text, openingChar) {
  const source = String(text || "");
  const closingChar = openingChar === "[" ? "]" : "}";
  const startIndex = source.indexOf(openingChar);

  if (startIndex === -1) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = startIndex; index < source.length; index += 1) {
    const char = source[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === openingChar) {
      depth += 1;
    } else if (char === closingChar) {
      depth -= 1;
      if (depth === 0) {
        return source.slice(startIndex, index + 1);
      }
    }
  }

  return null;
}

function parseJSONFromText(text, fallback = null) {
  const source = String(text || "").trim();
  const direct = tryParseJSON(source, null);
  if (direct !== null) {
    return direct;
  }

  const objectBlock = extractJSONBlock(source, "{");
  if (objectBlock) {
    const parsedObject = tryParseJSON(objectBlock, null);
    if (parsedObject !== null) {
      return parsedObject;
    }
  }

  const arrayBlock = extractJSONBlock(source, "[");
  if (arrayBlock) {
    const parsedArray = tryParseJSON(arrayBlock, null);
    if (parsedArray !== null) {
      return parsedArray;
    }
  }

  return fallback;
}

function parseJSONArrayFromText(text) {
  const parsed = parseJSONFromText(text, []);
  return Array.isArray(parsed) ? parsed : [];
}

function canUseGemini() {
  return Boolean(process.env.GEMINI_API_KEY);
}

function canUseGroq() {
  return Boolean(process.env.GROQ_API_KEY);
}

async function withTimeout(promise, provider) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error(`${provider} timed out after ${AI_REQUEST_TIMEOUT_MS}ms.`)),
      AI_REQUEST_TIMEOUT_MS
    );
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timeoutId);
  }
}

const AI_REQUEST_TIMEOUT_MS = Number(process.env.AI_REQUEST_TIMEOUT_MS || 30000);

async function callGeminiProvider(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set.");
  }

  const gemini = new GoogleGenerativeAI(apiKey);
  const modelsToTry = [
    process.env.GEMINI_MODEL,
    process.env.GEMINI_CHAT_MODEL,
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
  ].filter(Boolean);

  const uniqueModels = [...new Set(modelsToTry)];
  const errors = [];

  for (const modelName of uniqueModels) {
    try {
      const model = gemini.getGenerativeModel({ model: modelName });
      const result = await withTimeout(model.generateContent(prompt), `Gemini(${modelName})`);
      const text = normalizeTextResponse(result?.response);
      if (text) return text;
    } catch (err) {
      errors.push(`${modelName}: ${err.message}`);
      console.warn(`[AI Warning] Gemini model ${modelName} failed: ${err.message}. Trying next fallback...`);
    }
  }

  throw new Error(`All Gemini models failed: ${errors.join("; ")}`);
}

async function callGroqProvider(prompt) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not set.");
  }

  const groq = new Groq({ apiKey });
  const completion = await withTimeout(
    groq.chat.completions.create({
      model: GROQ_MODEL,
      temperature: 0.3,
      messages: [{ role: "user", content: prompt }],
    }),
    "Groq"
  );
  return normalizeTextResponse(completion?.choices?.[0]?.message?.content);
}

async function callGemini(prompt) {
  const cleanPrompt = String(prompt || "").trim();

  if (!cleanPrompt) {
    throw new Error("AI prompt is required.");
  }

  const errors = [];
  const providers = AI_PROVIDER === "groq" ? ["groq", "gemini"] : ["gemini", "groq"];

  for (const provider of providers) {
    if (provider === "gemini" && canUseGemini()) {
      try {
        const text = await callGeminiProvider(cleanPrompt);
        if (text) return text;
        errors.push("Gemini returned an empty response.");
      } catch (error) {
        errors.push(`Gemini failed: ${error.message}`);
      }
    }

    if (provider === "groq" && canUseGroq()) {
      try {
        const text = await callGroqProvider(cleanPrompt);
        if (text) return text;
        errors.push("Groq returned an empty response.");
      } catch (error) {
        errors.push(`Groq failed: ${error.message}`);
      }
    }
  }

  if (!canUseGemini() && !canUseGroq()) {
    throw new Error("No AI provider configured. Set GEMINI_API_KEY or GROQ_API_KEY.");
  }

  throw new Error(errors.join(" | "));
}

module.exports = {
  callGemini,
  parseJSONFromText,
  parseJSONArrayFromText,
};
