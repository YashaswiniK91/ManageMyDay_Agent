const express = require('express');
const router = express.Router();
const TokenStorage = require('../../utils/TokenStorage');
const CalendarService = require('../../services/CalendarService');

const tokenStorage = new TokenStorage('memory');

/**
 * Middleware to authenticate user
 */
const authenticateUser = async (req, res, next) => {
  const userId = req.query.userId || 'default-user';

  try {
    const token = await tokenStorage.getToken(userId);

    if (!token) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No valid token found. Please authenticate first.',
        authUrl: '/auth/init',
      });
    }

    req.authToken = token;
    req.userId = userId;
    next();
  } catch (error) {
    res.status(500).json({
      error: 'Authentication failed',
      message: error.message,
    });
  }
};

/**
 * Get today's events
 * GET /calendar/today?userId=user-id
 */
router.get('/today', authenticateUser, async (req, res) => {
  try {
    const calendarService = new CalendarService(req.authToken);
    const events = await calendarService.getTodayEvents();

    res.json({
      status: 'success',
      userId: req.userId,
      date: new Date().toISOString().split('T')[0],
      eventCount: events.length,
      events,
    });
  } catch (error) {
    console.error('Error fetching today\'s events:', error);
    res.status(500).json({
      error: 'Failed to fetch calendar events',
      message: error.message,
    });
  }
});

/**
 * Get events for a specific date
 * GET /calendar/date?date=2024-05-15&userId=user-id
 */
router.get('/date', authenticateUser, async (req, res) => {
  const { date } = req.query;

  if (!date) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Date parameter is required (format: YYYY-MM-DD)',
    });
  }

  try {
    const calendarService = new CalendarService(req.authToken);
    const events = await calendarService.getEventsByDate(date);

    res.json({
      status: 'success',
      userId: req.userId,
      date,
      eventCount: events.length,
      events,
    });
  } catch (error) {
    console.error(`Error fetching events for ${date}:`, error);
    res.status(500).json({
      error: 'Failed to fetch calendar events',
      message: error.message,
    });
  }
});

/**
 * Get upcoming events
 * GET /calendar/upcoming?days=7&userId=user-id
 */
router.get('/upcoming', authenticateUser, async (req, res) => {
  const days = parseInt(req.query.days) || 7;

  if (days < 1 || days > 90) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Days parameter must be between 1 and 90',
    });
  }

  try {
    const calendarService = new CalendarService(req.authToken);
    const events = await calendarService.getUpcomingEvents(days);

    res.json({
      status: 'success',
      userId: req.userId,
      days,
      eventCount: events.length,
      events,
    });
  } catch (error) {
    console.error('Error fetching upcoming events:', error);
    res.status(500).json({
      error: 'Failed to fetch calendar events',
      message: error.message,
    });
  }
});

/**
 * Get events for a date range
 * GET /calendar/range?startDate=2024-05-15&endDate=2024-05-20&userId=user-id
 */
router.get('/range', authenticateUser, async (req, res) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Both startDate and endDate parameters are required (format: YYYY-MM-DD)',
    });
  }

  try {
    const calendarService = new CalendarService(req.authToken);
    const events = await calendarService.getEventsByDateRange(startDate, endDate);

    res.json({
      status: 'success',
      userId: req.userId,
      startDate,
      endDate,
      eventCount: events.length,
      events,
    });
  } catch (error) {
    console.error(`Error fetching events from ${startDate} to ${endDate}:`, error);
    res.status(500).json({
      error: 'Failed to fetch calendar events',
      message: error.message,
    });
  }
});

/**
 * Create a new event
 * POST /calendar/create
 * Body: { title, startTime, endTime, description, attendees, userId }
 */
router.post('/create', authenticateUser, async (req, res) => {
  const { title, startTime, endTime, description, attendees } = req.body;

  if (!title || !startTime || !endTime) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Title, startTime, and endTime are required',
    });
  }

  try {
    const calendarService = new CalendarService(req.authToken);
    const event = await calendarService.createEvent({
      title,
      startTime,
      endTime,
      description,
      attendees,
    });

    res.json({
      status: 'success',
      userId: req.userId,
      event,
    });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({
      error: 'Failed to create event',
      message: error.message,
    });
  }
});

/**
 * Update an existing event
 * PUT /calendar/update/:eventId
 * Body: { title, startTime, endTime, description, attendees, userId }
 */
router.put('/update/:eventId', authenticateUser, async (req, res) => {
  const { eventId } = req.params;
  const { title, startTime, endTime, description, attendees } = req.body;

  if (!eventId) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Event ID is required',
    });
  }

  try {
    const calendarService = new CalendarService(req.authToken);
    const event = await calendarService.updateEvent(eventId, {
      title,
      startTime,
      endTime,
      description,
      attendees,
    });

    res.json({
      status: 'success',
      userId: req.userId,
      event,
    });
  } catch (error) {
    console.error(`Error updating event ${eventId}:`, error);
    res.status(500).json({
      error: 'Failed to update event',
      message: error.message,
    });
  }
});

/**
 * Delete an event
 * DELETE /calendar/delete/:eventId
 */
router.delete('/delete/:eventId', authenticateUser, async (req, res) => {
  const { eventId } = req.params;

  if (!eventId) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Event ID is required',
    });
  }

  try {
    const calendarService = new CalendarService(req.authToken);
    const result = await calendarService.deleteEvent(eventId);

    res.json({
      status: 'success',
      userId: req.userId,
      result,
    });
  } catch (error) {
    console.error(`Error deleting event ${eventId}:`, error);
    res.status(500).json({
      error: 'Failed to delete event',
      message: error.message,
    });
  }
});

/**
 * Health check for calendar service
 * GET /calendar/health
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'Calendar API',
    message: 'Calendar service is operational',
  });
});

module.exports = router;
