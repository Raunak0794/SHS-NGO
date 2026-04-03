const express = require("express");
const router = express.Router();
const calendarController = require("../controllers/calendar.controller");
const authMiddleware = require("../middleware/auth");

// @route   POST /api/calendar/sync-microgoal
// @desc    Sync a micro-goal to Google Calendar
// @access  Private
router.post("/sync-microgoal", authMiddleware, calendarController.syncMicroGoalToCalendar);

// @route   DELETE /api/calendar/:microGoalId
// @desc    Remove micro-goal from Google Calendar
// @access  Private
router.delete("/:microGoalId", authMiddleware, calendarController.removeMicroGoalFromCalendar);

// @route   GET /api/calendar/events
// @desc    Get user's Google Calendar events
// @access  Private
router.get("/events", authMiddleware, calendarController.getCalendarEvents);

// @route   POST /api/calendar/sync-all
// @desc    Sync all micro-goals to Google Calendar
// @access  Private
router.post("/sync-all", authMiddleware, calendarController.syncAllMicroGoalsToCalendar);

module.exports = router;
