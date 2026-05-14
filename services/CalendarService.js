const { google } = require('googleapis');
const { createAuthenticatedClient, refreshAccessToken, loadSavedToken } = require('../config/auth');

/**
 * Google Calendar Service
 * Handles Calendar API interactions
 */

class CalendarService {
  constructor(authToken) {
    this.authToken = authToken;
    this.calendar = null;
    this.initialize();
  }

  initialize() {
    if (!this.authToken) {
      throw new Error('Authorization token required for Calendar Service');
    }
    
    const auth = createAuthenticatedClient(this.authToken);
    this.calendar = google.calendar({ version: 'v3', auth });
  }

  /**
   * Get today's events
   */
  async getTodayEvents() {
    try {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

      const response = await this.calendar.events.list({
        calendarId: 'primary',
        timeMin: startOfDay.toISOString(),
        timeMax: endOfDay.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 10,
      });

      return this._formatEvents(response.data.items || []);
    } catch (error) {
      console.error('Error fetching today\'s events:', error);
      throw error;
    }
  }

  /**
   * Get events for a specific date
   */
  async getEventsByDate(dateString) {
    try {
      const date = new Date(dateString);
      const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);

      const response = await this.calendar.events.list({
        calendarId: 'primary',
        timeMin: startOfDay.toISOString(),
        timeMax: endOfDay.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 10,
      });

      return this._formatEvents(response.data.items || []);
    } catch (error) {
      console.error(`Error fetching events for ${dateString}:`, error);
      throw error;
    }
  }

  /**
   * Get events for a date range
   */
  async getEventsByDateRange(startDate, endDate) {
    try {
      const response = await this.calendar.events.list({
        calendarId: 'primary',
        timeMin: new Date(startDate).toISOString(),
        timeMax: new Date(endDate).toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 20,
      });

      return this._formatEvents(response.data.items || []);
    } catch (error) {
      console.error(`Error fetching events from ${startDate} to ${endDate}:`, error);
      throw error;
    }
  }

  /**
   * Get upcoming events (next 7 days)
   */
  async getUpcomingEvents(days = 7) {
    try {
      const now = new Date();
      const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

      const response = await this.calendar.events.list({
        calendarId: 'primary',
        timeMin: now.toISOString(),
        timeMax: futureDate.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 20,
      });

      return this._formatEvents(response.data.items || []);
    } catch (error) {
      console.error(`Error fetching upcoming events:`, error);
      throw error;
    }
  }

  /**
   * Create a new event
   */
  async createEvent(eventData) {
    try {
      const response = await this.calendar.events.insert({
        calendarId: 'primary',
        requestBody: {
          summary: eventData.title,
          description: eventData.description || '',
          start: {
            dateTime: new Date(eventData.startTime).toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
          end: {
            dateTime: new Date(eventData.endTime).toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
          attendees: eventData.attendees || [],
        },
      });

      return response.data;
    } catch (error) {
      console.error('Error creating event:', error);
      throw error;
    }
  }

  /**
   * Format events for display
   */
  _formatEvents(events) {
    if (!events || events.length === 0) {
      return [];
    }

    return events.map((event) => ({
      id: event.id,
      title: event.summary || 'No Title',
      description: event.description || '',
      start: event.start.dateTime || event.start.date,
      end: event.end.dateTime || event.end.date,
      location: event.location || '',
      organizer: event.organizer?.email || '',
      attendees: (event.attendees || []).map(a => a.email),
    }));
  }

  /**
   * Parse natural language query and extract date/time info
   */
  async handleNaturalLanguageQuery(query) {
    // Simple pattern matching for POC
    const lowerQuery = query.toLowerCase();

    if (lowerQuery.includes('today') || lowerQuery.includes('today\'s')) {
      return await this.getTodayEvents();
    }

    if (lowerQuery.includes('tomorrow')) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return await this.getEventsByDate(tomorrow.toISOString().split('T')[0]);
    }

    if (lowerQuery.includes('week') || lowerQuery.includes('upcoming')) {
      return await this.getUpcomingEvents(7);
    }

    // Default: return today's events
    return await this.getTodayEvents();
  }
}

module.exports = CalendarService;
