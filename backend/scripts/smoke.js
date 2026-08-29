require("dotenv").config();

const mongoose = require("mongoose");
const Goal = require("../src/models/Goal");
const MicroGoal = require("../src/models/MicroGoal");
const StudySession = require("../src/models/StudySession");
const User = require("../src/models/user.model");
const WeeklyReview = require("../src/models/WeeklyReview");

const API_URL = String(process.env.SMOKE_BASE_URL || "http://127.0.0.1:5000/api").replace(/\/+$/, "");
const REQUEST_TIMEOUT_MS = Number(process.env.SMOKE_TIMEOUT_MS || 120000);
const runId = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
const credentials = {
  username: `smoke_${runId}`,
  email: `smoke_${runId}@example.com`,
  password: `Smoke-${runId}`,
  fullName: { firstName: "Smoke", lastName: "Test" },
};

let token = "";
let userId = "";
const results = [];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function check(name, path, options = {}) {
  const expected = options.expected || [200];
  const headers = { ...(options.headers || {}) };

  if (token && options.auth !== false) {
    headers.Authorization = `Bearer ${token}`;
  }

  let body = options.body;
  if (body && !(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(body);
  }

  const startedAt = performance.now();
  const response = await fetch(`${API_URL}${path}`, {
    method: options.method || "GET",
    headers,
    body,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const durationMs = Math.round(performance.now() - startedAt);
  const text = await response.text();
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  assert(
    expected.includes(response.status),
    `${name} returned ${response.status}: ${typeof data === "string" ? data : JSON.stringify(data)}`
  );
  if (options.validate) options.validate(data, response.status);

  results.push({ name, status: response.status, durationMs });
  console.log(`PASS ${name} (${response.status}, ${durationMs}ms)`);
  return data;
}

const DocumentChunk = require("../src/models/DocumentChunk");
const Conversation = require("../src/models/Conversation");
const Message = require("../src/models/Message");
const StudentTopicProgress = require("../src/models/StudentTopicProgress");
const StudentMistake = require("../src/models/StudentMistake");
const SavedRevision = require("../src/models/SavedRevision");

async function cleanup() {
  if (!userId || !process.env.MONGO_URI) return;

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  }

  await Promise.all([
    WeeklyReview.deleteMany({ userId }),
    MicroGoal.deleteMany({ userId }),
    StudySession.deleteMany({ userId }),
    Goal.deleteMany({ userId }),
    DocumentChunk.deleteMany({ userId }),
    Conversation.deleteMany({ userId }),
    Message.deleteMany({ userId }),
    StudentTopicProgress.deleteMany({ userId }),
    StudentMistake.deleteMany({ userId }),
    SavedRevision.deleteMany({ userId }),
  ]);
  await User.deleteOne({ _id: userId, email: credentials.email });
  await mongoose.disconnect();
}

async function run() {
  const registration = await check("Register", "/auth/register", {
    method: "POST",
    auth: false,
    expected: [201],
    body: credentials,
    validate: (data) => assert(data?.token && data?.user?._id, "Registration response is incomplete"),
  });
  token = registration.token;
  userId = registration.user._id;

  await check("Current user", "/auth/me", {
    validate: (data) => assert(data?.user?._id === userId, "Current-user response does not match"),
  });

  const login = await check("Login", "/auth/login", {
    method: "POST",
    auth: false,
    body: { identifier: credentials.email, password: credentials.password },
    validate: (data) => assert(data?.token, "Login did not return a token"),
  });
  token = login.token;

  const dashboard = await check("Dashboard", "/dashboard", {
    validate: (data) => assert(data?.nextGoal?._id, "Dashboard did not provide a goal"),
  });
  const goalId = dashboard.nextGoal._id;

  await check("Complete goal", `/dashboard/goals/${goalId}/complete`, {
    method: "POST",
    validate: (data) => assert(data?.goal?.completed === true, "Goal was not completed"),
  });

  const generatedMicroGoals = await check("Generate micro-goals", "/microgoals/generate", {
    method: "POST",
    body: { goalId, numMicroGoals: 2 },
    validate: (data) => assert(data?.microGoals?.length === 2, "Micro-goals were not generated"),
  });
  const microGoalId = generatedMicroGoals.microGoals[0]._id;

  await check("List goal micro-goals", `/microgoals/goal/${goalId}`, {
    validate: (data) => assert(data?.microGoals?.length >= 2, "Goal micro-goals are missing"),
  });
  await check("List all micro-goals", "/microgoals/all", {
    validate: (data) => assert(data?.stats && data?.microGoals?.length >= 2, "Micro-goal summary is incomplete"),
  });
  await check("Update micro-goal", `/microgoals/${microGoalId}`, {
    method: "PUT",
    body: { status: "completed", actualHours: 1 },
    validate: (data) => assert(data?.microGoal?.status === "completed", "Micro-goal was not updated"),
  });

  const form = new FormData();
  form.append(
    "file",
    new Blob([
      "Photosynthesis converts light energy into chemical energy in plants. Chlorophyll captures sunlight, while carbon dioxide and water are used to produce glucose and oxygen.",
    ], { type: "text/plain" }),
    "smoke-study.txt"
  );
  const upload = await check("Upload study material", "/study/upload", {
    method: "POST",
    body: form,
    validate: (data) => assert(data?.studySession?._id, "Study upload did not create a session"),
  });
  const sessionId = upload.studySession._id;

  await check("List study sessions", "/study/sessions", {
    validate: (data) => assert(data?.sessions?.some((session) => session._id === sessionId), "Session list is missing upload"),
  });
  await check("Study session details", `/study/${sessionId}`, {
    validate: (data) => assert(data?.studySession?.content?.rawText, "Study content was not extracted"),
  });
  await check("Generate summary", `/study/${sessionId}/summary`, {
    method: "POST",
    body: {},
    validate: (data) => assert(data?.summary?.aiGenerated, "Summary is missing"),
  });
  const questions = await check("Generate questions", `/study/${sessionId}/questions`, {
    method: "POST",
    body: { numQuestions: 2, difficulty: "beginner" },
    validate: (data) => assert(data?.questions?.length > 0, "Questions were not generated"),
  });
  const question = questions.questions[0];

  await check("Submit quiz answer", "/study/submit-answer", {
    method: "POST",
    body: { sessionId, questionId: question._id, userAnswer: question.correctAnswer },
    validate: (data) => assert(data?.isCorrect === true, "Correct quiz answer was rejected"),
  });

  const learningPath = await check("Generate learning path", `/study/${sessionId}/learning-path`, {
    method: "POST",
    body: {},
    validate: (data) => assert(data?.learningPath?.steps?.length > 0, "Learning path is missing"),
  });
  await check("Update learning progress", `/study/${sessionId}/progress`, {
    method: "PUT",
    body: { stepNumber: learningPath.learningPath.steps[0].step },
    validate: (data) => assert(data?.learningPath?.completedSteps?.length === 1, "Learning progress was not updated"),
  });

  await check("Generate weekly review", "/microgoals/weekly-review/generate", {
    method: "POST",
    body: { moodRating: 4 },
    validate: (data) => assert(data?.weeklyReview?._id, "Weekly review was not generated"),
  });
  await check("List weekly reviews", "/microgoals/weekly-review/all", {
    validate: (data) => assert(data?.reviews?.length > 0, "Weekly review list is empty"),
  });

  await check("AI dashboard", "/ai/dashboard", {
    validate: (data) => assert(data?.data, "AI dashboard response is incomplete"),
  });
  await check("Google Calendar authorization URL", "/auth/google/url", {
    validate: (data) => assert(/^https:\/\/accounts\.google\.com\//.test(data?.url || ""), "Google authorization URL is invalid"),
  });
  await check("Calendar disconnected state", "/calendar/events", {
    expected: [400],
    validate: (data) => assert(/not connected/i.test(data?.message || ""), "Calendar disconnected response is unclear"),
  });

  // ============ NEW RAG & ADAPTIVE COPILOT TESTS ============
  await check("Update profile", "/auth/profile", {
    method: "PUT",
    body: { classLevel: "Class 9", subjects: ["Mathematics", "Science", "English"], onboardingCompleted: true },
    validate: (data) => assert(data?.user?.classLevel === "Class 9", "Profile update failed"),
  });

  const materialsList = await check("List materials", "/materials", {
    validate: (data) => assert(Array.isArray(data?.materials), "Materials list is not an array"),
  });

  await check("Semantic search", "/materials/search/semantic", {
    method: "POST",
    body: { query: "How does light and energy work in plants?" },
    validate: (data) => assert(Array.isArray(data?.results), "Semantic search response is invalid"),
  });

  const chatResp = await check("RAG Chat message", "/chat/message", {
    method: "POST",
    body: { message: "Explain photosynthesis simply from my uploaded notes.", mode: "material" },
    validate: (data) => assert(data?.message?.content && data?.conversationId, "Chat message failed"),
  });
  const conversationId = chatResp.conversationId;

  await check("List conversations", "/chat/conversations", {
    validate: (data) => assert(data?.conversations?.length > 0, "Conversations list is empty"),
  });

  await check("Explain Simpler", "/chat/simplify", {
    method: "POST",
    body: { previousQuestion: "What is photosynthesis?", previousAnswer: "Chemical synthesis using light", topic: "Photosynthesis" },
    validate: (data) => assert(data?.answer, "Explain simpler failed"),
  });

  await check("Homework Helper", "/chat/homework", {
    method: "POST",
    body: { problem: "Solve for x: 2x + 6 = 14", stepType: "hint", subject: "Mathematics" },
    validate: (data) => assert(data?.guidance, "Homework helper failed"),
  });

  await check("Answer Checker", "/chat/check-answer", {
    method: "POST",
    body: { question: "What is photosynthesis?", studentAnswer: "Plants make glucose using sunlight and CO2", subject: "Science" },
    validate: (data) => assert(data?.status, "Answer checker failed"),
  });

  const practiceQuiz = await check("Adaptive Quiz Generation", "/practice/quiz/generate", {
    method: "POST",
    body: { subject: "Science", numQuestions: 3, difficulty: "adaptive" },
    validate: (data) => assert(data?.questions?.length > 0, "Practice quiz generation failed"),
  });

  if (practiceQuiz?.questions?.length > 0) {
    const q0 = practiceQuiz.questions[0];
    await check("Submit Quiz Answers", "/practice/quiz/submit", {
      method: "POST",
      body: {
        subject: "Science",
        answers: [
          {
            _id: q0._id,
            question: q0.question,
            options: q0.options,
            userAnswer: q0.options[1], // intentional answer
            correctAnswer: q0.correctAnswer,
            topic: q0.topic,
          },
        ],
      },
      validate: (data) => assert(data?.totalQuestions === 1, "Quiz submit failed"),
    });
  }

  await check("Mistake Book", "/practice/mistakes", {
    validate: (data) => assert(Array.isArray(data?.mistakes), "Mistake book is not an array"),
  });

  await check("Generate Flashcards", "/practice/flashcards/generate", {
    method: "POST",
    body: { subject: "Science", topic: "Plant Biology" },
    validate: (data) => assert(Array.isArray(data?.flashcards), "Flashcards response is invalid"),
  });

  await check("Generate Revision Notes", "/practice/revision-notes", {
    method: "POST",
    body: { title: "Photosynthesis Quick Notes", subject: "Science", type: "notes" },
    validate: (data) => assert(data?.revision?._id, "Revision notes creation failed"),
  });

  await check("Get Revision Notes", "/practice/revision-notes", {
    validate: (data) => assert(Array.isArray(data?.notes), "Revision notes list is invalid"),
  });

  await check("Progress Dashboard", "/progress/dashboard", {
    validate: (data) => assert(data?.stats && Array.isArray(data?.subjectProgress), "Progress dashboard failed"),
  });

  await check("Study Recommendation", "/progress/recommendation", {
    validate: (data) => assert(data?.recommendations?.priority, "Study recommendation failed"),
  });

  await check("Generate Exam Study Plan", "/progress/study-plan", {
    method: "POST",
    body: { examName: "Mid-Term Science Exam", examDate: new Date(Date.now() + 7 * 86400000).toISOString(), subject: "Science", chapters: ["Light", "Plants", "Chemicals"], dailyMinutes: 45 },
    validate: (data) => assert(data?.plan?.schedule?.length > 0, "Study plan failed"),
  });

  await check("Logout", "/auth/logout", {
    method: "POST",
    headers: { Cookie: `token=${token}` },
    validate: (data) => assert(/logged out/i.test(data?.message || ""), "Logout response is incomplete"),
  });

  const totalMs = results.reduce((sum, result) => sum + result.durationMs, 0);
  const slowest = [...results].sort((a, b) => b.durationMs - a.durationMs).slice(0, 5);
  console.log(`\n${results.length} checks passed in ${totalMs}ms of API time.`);
  console.log("Slowest checks:");
  slowest.forEach((result) => console.log(`- ${result.name}: ${result.durationMs}ms`));
}

run()
  .catch((error) => {
    console.error(`FAIL ${error.message}${error.cause?.message ? `: ${error.cause.message}` : ""}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await cleanup();
      console.log("Smoke-test data removed.");
    } catch (error) {
      console.error(`Cleanup failed: ${error.message}`);
      process.exitCode = 1;
    }
  });
