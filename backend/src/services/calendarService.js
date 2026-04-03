const { google } = require('googleapis');

/**
 * Create an OAuth2 client with the user's tokens
 */
function getOAuth2Client(tokens) {
  const oAuth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  oAuth2Client.setCredentials(tokens);
  return oAuth2Client;
}

/**
 * Create a calendar event for a micro-goal
 */
async function createCalendarEvent(tokens, { title, description, deadline }) {
  const oAuth2Client = getOAuth2Client(tokens);
  const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

  const event = {
    summary: title,
    description: description || 'Study micro-goal',
    start: {
      dateTime: new Date(deadline).toISOString(),
      timeZone: 'UTC',
    },
    end: {
      dateTime: new Date(new Date(deadline).getTime() + 60 * 60 * 1000), // 1 hour duration
      timeZone: 'UTC',
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 24 * 60 },
        { method: 'popup', minutes: 30 },
      ],
    },
  };

  const response = await calendar.events.insert({
    calendarId: 'primary',
    resource: event,
  });

  return response.data;
}

/**
 * Update a calendar event
 */
async function updateCalendarEvent(tokens, eventId, { title, description, deadline }) {
  const oAuth2Client = getOAuth2Client(tokens);
  const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

  // First get existing event
  const existing = await calendar.events.get({
    calendarId: 'primary',
    eventId,
  });

  const updatedEvent = {
    ...existing.data,
    summary: title || existing.data.summary,
    description: description || existing.data.description,
    start: {
      dateTime: deadline ? new Date(deadline).toISOString() : existing.data.start.dateTime,
      timeZone: 'UTC',
    },
    end: {
      dateTime: deadline
        ? new Date(new Date(deadline).getTime() + 60 * 60 * 1000).toISOString()
        : existing.data.end.dateTime,
      timeZone: 'UTC',
    },
  };

  const response = await calendar.events.update({
    calendarId: 'primary',
    eventId,
    resource: updatedEvent,
  });

  return response.data;
}

/**
 * Delete a calendar event
 */
async function deleteCalendarEvent(tokens, eventId) {
  const oAuth2Client = getOAuth2Client(tokens);
  const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

  await calendar.events.delete({
    calendarId: 'primary',
    eventId,
  });

  return { success: true };
}

/**
 * List calendar events within a time range
 */
async function listCalendarEvents(tokens, timeMin, timeMax) {
  const oAuth2Client = getOAuth2Client(tokens);
  const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin: timeMin ? new Date(timeMin).toISOString() : new Date().toISOString(),
    timeMax: timeMax ? new Date(timeMax).toISOString() : undefined,
    maxResults: 50,
    singleEvents: true,
    orderBy: 'startTime',
  });

  return response.data.items;
}

module.exports = {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  listCalendarEvents,
};