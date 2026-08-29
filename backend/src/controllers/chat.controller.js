const mongoose = require("mongoose");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const User = require("../models/user.model");
const {
  generateRagResponse,
  simplifyExplanation,
  assistHomework,
  evaluateStudentAnswer,
} = require("../services/rag/rag.service");
const { recordTopicAttempt } = require("../services/mastery.service");

/**
 * POST /api/chat/message
 * Send a message and receive an adaptive RAG response with citations
 */
const sendMessage = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const {
      message,
      conversationId,
      mode = "material",
      scope = "all",
      documentId,
      documentIds = [],
      subject = "General",
    } = req.body || {};

    const cleanMessage = String(message || "").trim();
    if (!cleanMessage) {
      return res.status(400).json({ success: false, message: "Message cannot be empty." });
    }

    const user = await User.findById(userId).lean();

    // 1. Find or create conversation
    let conversation = null;
    if (conversationId && mongoose.Types.ObjectId.isValid(conversationId)) {
      conversation = await Conversation.findOne({ _id: conversationId, userId });
    }

    if (!conversation) {
      const generatedTitle = cleanMessage.length > 35 ? `${cleanMessage.substring(0, 35)}...` : cleanMessage;
      conversation = await Conversation.create({
        userId,
        title: generatedTitle || "New Study Chat",
        subject: subject || "General",
        mode: mode || "material",
        scope: scope || "all",
        documentIds: Array.isArray(documentIds) && documentIds.length ? documentIds : documentId ? [documentId] : [],
        lastMessageAt: new Date(),
      });
    }

    // 2. Fetch recent conversation history
    const historyMessages = await Message.find({ conversationId: conversation._id })
      .sort({ createdAt: 1 })
      .limit(10)
      .lean();

    // 3. Save student message
    await Message.create({
      conversationId: conversation._id,
      userId,
      role: "user",
      content: cleanMessage,
      mode,
    });

    // 4. Generate grounded RAG response
    const ragResult = await generateRagResponse({
      user,
      message: cleanMessage,
      mode: mode || conversation.mode || "material",
      scope: scope || conversation.scope || "all",
      documentId: documentId || conversation.documentIds?.[0],
      documentIds: documentIds.length ? documentIds : conversation.documentIds,
      subject: subject || conversation.subject || "General",
      conversationHistory: historyMessages,
    });

    // 5. Save assistant message
    const assistantMessage = await Message.create({
      conversationId: conversation._id,
      userId,
      role: "assistant",
      content: ragResult.answer,
      mode: ragResult.mode || mode,
      sources: ragResult.sources || [],
      detectedConcepts: ragResult.detectedConcepts || [],
      suggestedFollowUps: ragResult.suggestedFollowUps || [],
    });

    // 6. Update conversation timestamp
    conversation.lastMessageAt = new Date();
    await conversation.save();

    // 7. Track study activity in student topic progress
    if (ragResult.detectedConcepts && ragResult.detectedConcepts.length > 0) {
      for (const concept of ragResult.detectedConcepts.slice(0, 2)) {
        await recordTopicAttempt({
          userId,
          subject: subject || conversation.subject || "General",
          topic: concept,
          isCorrect: true, // studying concept counts as positive engagement
        }).catch(() => {});
      }
    }

    return res.status(200).json({
      success: true,
      conversationId: conversation._id,
      message: assistantMessage,
      sources: ragResult.sources,
      suggestedFollowUps: ragResult.suggestedFollowUps,
      mode: ragResult.mode,
    });
  } catch (error) {
    console.error("Chat message error:", error);
    return res.status(500).json({
      success: false,
      message: "SHS AI couldn't generate an answer right now. Please try again.",
    });
  }
};

/**
 * GET /api/chat/conversations
 * List user's conversations
 */
const getConversations = async (req, res) => {
  try {
    const userId = req.user.id;
    const conversations = await Conversation.find({ userId })
      .sort({ lastMessageAt: -1 })
      .limit(50)
      .lean();

    return res.status(200).json({
      success: true,
      conversations,
    });
  } catch (error) {
    console.error("Get conversations error:", error);
    return res.status(500).json({ success: false, message: "Could not load conversations" });
  }
};

/**
 * POST /api/chat/conversations
 * Create a new conversation session
 */
const createConversation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, subject, mode, scope, documentIds } = req.body || {};

    const conversation = await Conversation.create({
      userId,
      title: title || "New Study Chat",
      subject: subject || "General",
      mode: mode || "material",
      scope: scope || "all",
      documentIds: Array.isArray(documentIds) ? documentIds : [],
      lastMessageAt: new Date(),
    });

    return res.status(201).json({
      success: true,
      conversation,
    });
  } catch (error) {
    console.error("Create conversation error:", error);
    return res.status(500).json({ success: false, message: "Could not create conversation" });
  }
};

/**
 * GET /api/chat/conversations/:id
 * Retrieve conversation details and messages
 */
const getConversation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid conversation ID" });
    }

    const conversation = await Conversation.findOne({ _id: id, userId }).lean();
    if (!conversation) {
      return res.status(404).json({ success: false, message: "Conversation not found" });
    }

    const messages = await Message.find({ conversationId: id, userId })
      .sort({ createdAt: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      conversation,
      messages,
    });
  } catch (error) {
    console.error("Get conversation error:", error);
    return res.status(500).json({ success: false, message: "Could not load messages" });
  }
};

/**
 * DELETE /api/chat/conversations/:id
 * Delete a conversation and its messages
 */
const deleteConversation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid conversation ID" });
    }

    const deleted = await Conversation.findOneAndDelete({ _id: id, userId });
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Conversation not found" });
    }

    await Message.deleteMany({ conversationId: id, userId });

    return res.status(200).json({
      success: true,
      message: "Conversation deleted successfully",
      deletedId: id,
    });
  } catch (error) {
    console.error("Delete conversation error:", error);
    return res.status(500).json({ success: false, message: "Could not delete conversation" });
  }
};

/**
 * POST /api/chat/messages/:id/save
 * Toggle saved/bookmarked state on a message
 */
const saveMessage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid message ID" });
    }

    const message = await Message.findOne({ _id: id, userId });
    if (!message) {
      return res.status(404).json({ success: false, message: "Message not found" });
    }

    message.isSaved = !message.isSaved;
    await message.save();

    return res.status(200).json({
      success: true,
      isSaved: message.isSaved,
      message: message.isSaved ? "Saved to your revision notes" : "Removed from saved notes",
    });
  } catch (error) {
    console.error("Save message error:", error);
    return res.status(500).json({ success: false, message: "Could not update saved status" });
  }
};

/**
 * GET /api/chat/saved
 * List all saved/bookmarked messages for revision
 */
const getSavedMessages = async (req, res) => {
  try {
    const userId = req.user.id;
    const savedMessages = await Message.find({ userId, isSaved: true })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      savedMessages,
    });
  } catch (error) {
    console.error("Get saved messages error:", error);
    return res.status(500).json({ success: false, message: "Could not load saved messages" });
  }
};

/**
 * POST /api/chat/simplify
 * "I don't understand" / Explain Simpler
 */
const simplifyExplanationHandler = async (req, res) => {
  try {
    const userId = req.user.id;
    const { previousQuestion, previousAnswer, topic } = req.body || {};
    const user = await User.findById(userId).lean();

    const result = await simplifyExplanation({
      user,
      previousQuestion,
      previousAnswer,
      topic,
    });

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Simplify explanation handler error:", error);
    return res.status(500).json({
      success: false,
      message: "Could not generate simpler explanation",
    });
  }
};

/**
 * POST /api/chat/homework
 * Homework helper flow (understand, hint, next_step, solution)
 */
const homeworkHelperHandler = async (req, res) => {
  try {
    const userId = req.user.id;
    const { problem, stepType = "hint", subject = "Mathematics" } = req.body || {};

    if (!problem || !String(problem).trim()) {
      return res.status(400).json({ success: false, message: "Please provide a homework problem." });
    }

    const user = await User.findById(userId).lean();
    const result = await assistHomework({
      user,
      problem: String(problem).trim(),
      stepType,
      subject,
    });

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Homework helper handler error:", error);
    return res.status(500).json({ success: false, message: "Could not process homework question" });
  }
};

/**
 * POST /api/chat/check-answer
 * Answer checker flow
 */
const checkAnswerHandler = async (req, res) => {
  try {
    const userId = req.user.id;
    const { question, studentAnswer, subject = "General" } = req.body || {};

    if (!question || !studentAnswer) {
      return res.status(400).json({
        success: false,
        message: "Question and student answer are both required.",
      });
    }

    const user = await User.findById(userId).lean();
    const evaluation = await evaluateStudentAnswer({
      user,
      question: String(question).trim(),
      studentAnswer: String(studentAnswer).trim(),
      subject,
    });

    return res.status(200).json({
      success: true,
      ...evaluation,
    });
  } catch (error) {
    console.error("Check answer handler error:", error);
    return res.status(500).json({ success: false, message: "Could not evaluate answer" });
  }
};

module.exports = {
  sendMessage,
  getConversations,
  createConversation,
  getConversation,
  deleteConversation,
  saveMessage,
  getSavedMessages,
  simplifyExplanationHandler,
  homeworkHelperHandler,
  checkAnswerHandler,
};
