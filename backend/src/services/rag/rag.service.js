const { callGemini, parseJSONFromText } = require("../../utils/gemini");
const { retrieveRelevantChunks } = require("./retrieval.service");

/**
 * Build system instructions based on student grade level and selected mode
 */
function buildSystemPrompt({
  classLevel = "Class 8",
  mode = "material",
  explanationLevel = "simple",
  hasMaterial = false,
}) {
  const gradeTone = `You are SHS AI, a friendly, encouraging, and highly capable personal study copilot for a student in **${classLevel}**.
Adapt your vocabulary, explanation depth, math steps, and analogies to be crystal clear and age-appropriate for a **${classLevel}** school student.
Never use dry academic jargon without explaining it simply first. Keep formatting clean with headings, bullet points, bold key terms, and neat examples.`;

  if (mode === "material") {
    return `${gradeTone}

CRITICAL RULES FOR MATERIAL MODE:
1. Answer the student's question primarily using the RETRIEVED STUDY MATERIAL supplied below.
2. Ground all specific claims in the provided material. Do not claim facts appear in the student's notes unless they are explicitly present in the context.
3. If the supplied study material does NOT contain enough information to fully answer the question, clearly state: "Your uploaded notes don't fully cover this specific detail, but here is what they say..." then provide the relevant context and brief helpful educational explanation.
4. Always explain concepts pedagogically with clear examples.
5. Provide helpful next steps or check the student's understanding.`;
  }

  if (mode === "tutor") {
    return `${gradeTone}

CRITICAL RULES FOR TUTOR MODE (Socratic Teaching):
1. Act as a patient, interactive school teacher.
2. Instead of just blurting out the complete final answer immediately:
   - Break complex ideas into 2-3 manageable steps.
   - Explain the core concept using an intuitive everyday analogy.
   - Give a clear step-by-step example.
   - Ask 1 quick guiding question at the end to check if the student understood.
3. If the student explicitly asks "Give me the full solution" or "Explain everything", provide the complete breakdown clearly.`;
  }

  if (mode === "exam") {
    return `${gradeTone}

CRITICAL RULES FOR EXAM PREP MODE:
1. Provide a crisp, high-scoring exam answer formatted for school exams (Class 5–10 standard).
2. Structure the answer with:
   - **Key Definition / Core Statement** (1-2 sentences)
   - **Key Points / Mechanism / Formula** (numbered or bulleted)
   - **Example / Diagram Description / Application**
   - **Examiner's Tip / Remember This**
3. Highlight important keywords in bold that fetch marks in school exams.`;
  }

  // General mode
  return `${gradeTone}

CRITICAL RULES FOR GENERAL AI STUDY MODE:
1. Answer general academic questions clearly and accurately.
2. If study material is provided, reference it where helpful, but feel free to provide general educational guidance.
3. Encourage curiosity, explain 'why' things work, and give real-life examples.`;
}

/**
 * Format conversation history into compact context
 */
function formatHistory(history = []) {
  if (!Array.isArray(history) || history.length === 0) return "";
  const recent = history.slice(-6); // last 6 turns
  return recent
    .map((m) => `${m.role === "user" ? "Student" : "SHS AI"}: ${String(m.content).substring(0, 400)}`)
    .join("\n");
}

/**
 * Generate RAG response
 */
async function generateRagResponse({
  user,
  message,
  mode = "material",
  scope = "all",
  documentId,
  documentIds = [],
  subject = "General",
  conversationHistory = [],
}) {
  const classLevel = user?.classLevel || "Class 8";
  const explanationLevel = user?.explanationLevel || "simple";
  const userId = user?.id || user?._id;

  // 1. Retrieve relevant chunks from vector store if in material/tutor/exam mode or if material exists
  let retrievedChunks = [];
  if (mode !== "general" || scope !== "all") {
    retrievedChunks = await retrieveRelevantChunks({
      userId,
      query: message,
      documentId,
      documentIds,
      subject,
      scope,
      topK: 6,
      minScore: 0.2,
    });
  }

  // 2. Format retrieved context
  const contextText = retrievedChunks
    .map(
      (chunk, idx) =>
        `[Source ${idx + 1} | Document: ${chunk.documentName} | Page: ${chunk.pageNumber}]\n${chunk.content}`
    )
    .join("\n\n---\n\n");

  const systemPrompt = buildSystemPrompt({
    classLevel,
    mode,
    explanationLevel,
    hasMaterial: retrievedChunks.length > 0,
  });

  const historyText = formatHistory(conversationHistory);

  // 3. Assemble prompt for Gemini
  const prompt = `${systemPrompt}

${contextText ? `### RETRIEVED STUDY MATERIAL:\n${contextText}\n\n` : "### RETRIEVED STUDY MATERIAL:\nNo specific study documents matched this query.\n\n"}
${historyText ? `### RECENT CONVERSATION CONTEXT:\n${historyText}\n\n` : ""}
### STUDENT QUESTION:
${message}

Respond in valid JSON format:
{
  "answer": "Your detailed, pedagogically structured Markdown answer...",
  "detectedConcepts": ["Concept 1", "Concept 2"],
  "suggestedFollowUps": ["Question 1 student might ask next?", "Question 2?", "Question 3?"]
}
Respond with JSON only.`;

  try {
    const rawResponse = await callGemini(prompt);
    const parsed = parseJSONFromText(rawResponse, null);

    let answer = "";
    let detectedConcepts = [];
    let suggestedFollowUps = [];

    if (parsed && typeof parsed === "object") {
      answer = parsed.answer || rawResponse;
      detectedConcepts = Array.isArray(parsed.detectedConcepts) ? parsed.detectedConcepts : [];
      suggestedFollowUps = Array.isArray(parsed.suggestedFollowUps) ? parsed.suggestedFollowUps : [];
    } else {
      answer = rawResponse;
      detectedConcepts = [subject || "General"];
      suggestedFollowUps = [
        "Can you explain this with a simpler example?",
        "Give me a 5-mark exam question on this.",
        "Test my understanding with a quick question.",
      ];
    }

    // 4. Extract unique source citations from retrieved chunks
    const sources = retrievedChunks.map((c) => ({
      documentId: c.documentId,
      documentName: c.documentName,
      pageNumber: c.pageNumber,
      excerpt: c.excerpt,
      score: c.score,
    }));

    return {
      answer,
      sources,
      detectedConcepts,
      suggestedFollowUps: suggestedFollowUps.slice(0, 4),
      mode,
    };
  } catch (error) {
    console.error("RAG generation error:", error);
    return {
      answer: "I'm having a little trouble thinking right now. Please check your internet connection or ask again in a moment.",
      sources: [],
      detectedConcepts: [],
      suggestedFollowUps: ["Try asking again"],
      mode,
    };
  }
}

/**
 * Simplify an existing explanation ("I don't understand" / Explain Simpler)
 */
async function simplifyExplanation({ user, previousQuestion, previousAnswer, topic }) {
  const classLevel = user?.classLevel || "Class 8";
  const prompt = `You are SHS AI, explaining a concept to a **${classLevel}** student who clicked "I don't understand".

PREVIOUS QUESTION:
${previousQuestion}

PREVIOUS EXPLANATION (which was too difficult or unclear):
${previousAnswer}

TASK:
Explain this in a BRAND NEW, extremely friendly, and simple way:
1. Use an intuitive real-world analogy from a school student's everyday life (e.g. sports, cooking, video games, school bag, cricket).
2. Break it into 3 super simple bite-sized steps.
3. Keep sentences short and clear.
4. Avoid tricky vocabulary.

Respond in JSON format:
{
  "answer": "Simple, friendly explanation with real life analogy...",
  "detectedConcepts": ["${topic || "Key Concept"}"],
  "suggestedFollowUps": ["Does this analogy make sense?", "Give me another example", "Test me with a quick question"]
}
Respond with JSON only.`;

  try {
    const raw = await callGemini(prompt);
    const parsed = parseJSONFromText(raw, null);
    if (parsed?.answer) {
      return {
        answer: parsed.answer,
        detectedConcepts: parsed.detectedConcepts || [topic || "Study Concept"],
        suggestedFollowUps: parsed.suggestedFollowUps || [],
      };
    }
    return {
      answer: raw,
      detectedConcepts: [topic || "Study Concept"],
      suggestedFollowUps: [],
    };
  } catch (err) {
    console.error("Simplify explanation error:", err);
    return {
      answer: "Let's break this down even simpler: Imagine you have a box...",
      detectedConcepts: [topic || "Study Concept"],
      suggestedFollowUps: [],
    };
  }
}

/**
 * Homework Helper: Step-by-step assistance
 */
async function assistHomework({ user, problem, stepType = "hint", subject = "Mathematics" }) {
  const classLevel = user?.classLevel || "Class 8";

  const instructionsByStep = {
    understand: "Help the student understand what the question is asking and what information is given. Do NOT solve it yet.",
    hint: "Provide a smart, helpful clue or formula to point the student in the right direction without giving away the full answer.",
    next_step: "Explain ONLY the next mathematical/logical step to proceed from where they might be stuck.",
    solution: "Provide the complete, step-by-step solution with reasons for every step, tailored for a school student.",
  };

  const currentInstruction = instructionsByStep[stepType] || instructionsByStep.hint;

  const prompt = `You are SHS AI Homework Assistant for a student in **${classLevel}**.
Subject: ${subject}

PROBLEM:
${problem}

MODE REQUESTED: ${stepType.toUpperCase()}
INSTRUCTION: ${currentInstruction}

Format as JSON:
{
  "guidance": "Clear step-by-step guidance...",
  "keyFormula": "Relevant formula or principle (if applicable)",
  "checkQuestion": "A quick question to check if they're ready for the next step"
}
Respond with JSON only.`;

  try {
    const raw = await callGemini(prompt);
    const parsed = parseJSONFromText(raw, null);
    return parsed || { guidance: raw, keyFormula: "", checkQuestion: "" };
  } catch (err) {
    console.error("Homework assist error:", err);
    return { guidance: "Let's look at the given data first.", keyFormula: "", checkQuestion: "" };
  }
}

/**
 * Answer Checker: Evaluate a student's answer with constructive educational feedback
 */
async function evaluateStudentAnswer({ user, question, studentAnswer, subject = "General" }) {
  const classLevel = user?.classLevel || "Class 8";

  const prompt = `You are SHS AI Evaluator for a student in **${classLevel}**.
Subject: ${subject}

QUESTION:
${question}

STUDENT'S ANSWER:
${studentAnswer}

Evaluate the student's answer kindly, constructively, and educationally. Never just say "Wrong".
Structure the response:
1. **Status**: "Correct", "Partially Correct", or "Needs Improvement"
2. **What you did well**: Highlight positive parts of their reasoning
3. **What was missing or needs correction**: Clear explanation of any misunderstanding
4. **Ideal Answer**: A high-scoring model answer suitable for ${classLevel}
5. **Concept to Revise**: Name the specific topic they should review

Format as JSON:
{
  "status": "Correct|Partially Correct|Needs Improvement",
  "scoreOutOf10": 8,
  "whatWasGood": "...",
  "whatToImprove": "...",
  "idealAnswer": "...",
  "conceptToRevise": "..."
}
Respond with JSON only.`;

  try {
    const raw = await callGemini(prompt);
    return parseJSONFromText(raw, {
      status: "Partially Correct",
      scoreOutOf10: 7,
      whatWasGood: "Good attempt!",
      whatToImprove: "Review the key details.",
      idealAnswer: "Here is the standard explanation.",
      conceptToRevise: subject,
    });
  } catch (err) {
    console.error("Answer check error:", err);
    return {
      status: "Partially Correct",
      scoreOutOf10: 7,
      whatWasGood: "Good effort!",
      whatToImprove: "Review the concept carefully.",
      idealAnswer: "",
      conceptToRevise: subject,
    };
  }
}

module.exports = {
  generateRagResponse,
  simplifyExplanation,
  assistHomework,
  evaluateStudentAnswer,
};
