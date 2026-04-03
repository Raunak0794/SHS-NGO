const MicroGoal = require("../models/MicroGoal");
const User = require("../models/user.model");
const {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  listCalendarEvents,
} = require("../services/calendarService");

// Sync micro-goal with Google Calendar
const syncMicroGoalToCalendar = async (req, res) => {
  try {
    const { microGoalId, deadline, title, description } = req.body;
    const userId = req.user.id;

    if (!microGoalId) {
      return res.status(400).json({ message: "microGoalId is required" });
    }

    // Get user's calendar tokens
    const user = await User.findById(userId);
    if (!user || !user.calendarTokens) {
      return res.status(400).json({
        message: "User not connected to Google Calendar. Please authorize calendar access.",
      });
    }

    // Get micro-goal
    const microGoal = await MicroGoal.findById(microGoalId);
    if (!microGoal) {
      return res.status(404).json({ message: "Micro-goal not found" });
    }

    // Create calendar event
    const calendarEvent = await createCalendarEvent(user.calendarTokens, {
      title: title || microGoal.title,
      description: description || microGoal.description,
      deadline: deadline || microGoal.deadline,
    });

    // Update micro-goal with calendar event ID
    microGoal.calendarEventId = calendarEvent.id;
    await microGoal.save();

    res.status(200).json({
      message: "Micro-goal synced to Google Calendar",
      calendarEvent,
      microGoal,
    });
  } catch (error) {
    console.error("Error syncing to calendar:", error);
    res.status(500).json({ message: "Error syncing to calendar", error: error.message });
  }
};

// Remove micro-goal from Google Calendar
const removeMicroGoalFromCalendar = async (req, res) => {
  try {
    const { microGoalId } = req.params;
    const userId = req.user.id;

    if (!microGoalId) {
      return res.status(400).json({ message: "microGoalId is required" });
    }

    // Get user's calendar tokens
    const user = await User.findById(userId);
    if (!user || !user.calendarTokens) {
      return res.status(400).json({
        message: "User not connected to Google Calendar",
      });
    }

    // Get micro-goal
    const microGoal = await MicroGoal.findById(microGoalId);
    if (!microGoal) {
      return res.status(404).json({ message: "Micro-goal not found" });
    }

    // Delete calendar event if it exists
    if (microGoal.calendarEventId) {
      await deleteCalendarEvent(user.calendarTokens, microGoal.calendarEventId);
    }

    // Remove calendar event ID from micro-goal
    microGoal.calendarEventId = null;
    await microGoal.save();

    res.status(200).json({
      message: "Micro-goal removed from Google Calendar",
      microGoal,
    });
  } catch (error) {
    console.error("Error removing from calendar:", error);
    res.status(500).json({
      message: "Error removing from calendar",
      error: error.message,
    });
  }
};

// Get calendar events for user's micro-goals
const getCalendarEvents = async (req, res) => {
  try {
    const userId = req.user.id;
    const { timeMin, timeMax } = req.query;

    // Get user's calendar tokens
    const user = await User.findById(userId);
    if (!user || !user.calendarTokens) {
      return res.status(400).json({
        message: "User not connected to Google Calendar",
      });
    }

    // Get calendar events
    const events = await listCalendarEvents(user.calendarTokens, timeMin, timeMax);

    res.status(200).json({
      events,
      totalEvents: events.length,
    });
  } catch (error) {
    console.error("Error fetching calendar events:", error);
    res.status(500).json({
      message: "Error fetching calendar events",
      error: error.message,
    });
  }
};

// Sync all micro-goals to calendar
const syncAllMicroGoalsToCalendar = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user's calendar tokens
    const user = await User.findById(userId);
    if (!user || !user.calendarTokens) {
      return res.status(400).json({
        message: "User not connected to Google Calendar. Please authorize calendar access.",
      });
    }

    // Get all user's micro-goals without calendar events
    const microGoals = await MicroGoal.find({
      userId,
      calendarEventId: null,
    });

    if (microGoals.length === 0) {
      return res.status(200).json({
        message: "All micro-goals are already synced to calendar",
        syncedCount: 0,
      });
    }

    // Create calendar events for each micro-goal
    let syncedCount = 0;
    const results = [];

    for (const microGoal of microGoals) {
      try {
        const calendarEvent = await createCalendarEvent(user.calendarTokens, {
          title: microGoal.title,
          description: microGoal.description,
          deadline: microGoal.deadline,
        });

        microGoal.calendarEventId = calendarEvent.id;
        await microGoal.save();
        syncedCount++;
        results.push({ microGoalId: microGoal._id, success: true });
      } catch (error) {
        console.error(`Error syncing micro-goal ${microGoal._id}:`, error);
        results.push({
          microGoalId: microGoal._id,
          success: false,
          error: error.message,
        });
      }
    }

    res.status(200).json({
      message: "Batch sync to calendar completed",
      syncedCount,
      totalAttempted: microGoals.length,
      results,
    });
  } catch (error) {
    console.error("Error syncing batch to calendar:", error);
    res.status(500).json({
      message: "Error syncing micro-goals to calendar",
      error: error.message,
    });
  }
};

module.exports = {
  syncMicroGoalToCalendar,
  removeMicroGoalFromCalendar,
  getCalendarEvents,
  syncAllMicroGoalsToCalendar,
};