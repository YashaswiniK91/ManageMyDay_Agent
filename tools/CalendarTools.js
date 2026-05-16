/**
 * Calendar Tools
 * Defines Gemini function declarations and execution logic for Google Calendar operations.
 * These tools are registered with the LLM agent so it can reason about when to call them.
 */

const CalendarService = require('../services/CalendarService');

// ─── Gemini Function Declarations ────────────────────────────────────────────

const CALENDAR_TOOL_DECLARATIONS = [
  {
    name: 'get_today_events',
    description: "Get the user's calendar events for today. Use this when the user asks about today's schedule, meetings, or agenda.",
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_upcoming_events',
    description: "Get the user's upcoming calendar events for the next N days. Use this for questions about the week ahead, upcoming meetings, or future schedule.",
    parameters: {
      type: 'object',
      properties: {
        days: {
          type: 'number',
          description: 'Number of days to look ahead. Defaults to 7.',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_events_by_date',
    description: "Get calendar events for a specific date. Use this when the user asks about a specific day (e.g., 'What's on Monday?', 'Show me Friday's schedule').",
    parameters: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: 'Date in YYYY-MM-DD format.',
        },
      },
      required: ['date'],
    },
  },
  {
    name: 'get_events_by_date_range',
    description: "Get calendar events between two dates. Use this for queries spanning a range (e.g., 'meetings this week', 'events from Monday to Friday').",
    parameters: {
      type: 'object',
      properties: {
        startDate: {
          type: 'string',
          description: 'Start date in YYYY-MM-DD format.',
        },
        endDate: {
          type: 'string',
          description: 'End date in YYYY-MM-DD format.',
        },
      },
      required: ['startDate', 'endDate'],
    },
  },
  {
    name: 'create_calendar_event',
    description: "Create a new event on the user's Google Calendar. Use this when the user wants to schedule a meeting, add a reminder, or block time.",
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Event title / summary.',
        },
        startDateTime: {
          type: 'string',
          description: 'Start date-time in ISO 8601 format (e.g., 2025-06-15T10:00:00).',
        },
        endDateTime: {
          type: 'string',
          description: 'End date-time in ISO 8601 format. If not provided, default to 1 hour after start.',
        },
        description: {
          type: 'string',
          description: 'Optional event description or agenda.',
        },
        attendees: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional list of attendee email addresses.',
        },
        location: {
          type: 'string',
          description: 'Optional event location.',
        },
      },
      required: ['title', 'startDateTime'],
    },
  },
  {
    name: 'delete_calendar_event',
    description: 'Delete a calendar event by its event ID.',
    parameters: {
      type: 'object',
      properties: {
        eventId: {
          type: 'string',
          description: 'The Google Calendar event ID to delete.',
        },
      },
      required: ['eventId'],
    },
  },
  {
    name: 'update_calendar_event',
    description: 'Update an existing calendar event. Use this when the user wants to reschedule, rename, or modify an event.',
    parameters: {
      type: 'object',
      properties: {
        eventId: {
          type: 'string',
          description: 'The Google Calendar event ID to update.',
        },
        title: {
          type: 'string',
          description: 'New event title (optional).',
        },
        startDateTime: {
          type: 'string',
          description: 'New start date-time in ISO 8601 format (optional).',
        },
        endDateTime: {
          type: 'string',
          description: 'New end date-time in ISO 8601 format (optional).',
        },
        description: {
          type: 'string',
          description: 'New event description (optional).',
        },
      },
      required: ['eventId'],
    },
  },
];

// ─── Tool Executor ────────────────────────────────────────────────────────────

class CalendarToolExecutor {
  constructor(authToken) {
    this.service = new CalendarService(authToken);
  }

  async execute(toolName, args) {
    switch (toolName) {
      case 'get_today_events':
        return await this.service.getTodayEvents();

      case 'get_upcoming_events':
        return await this.service.getUpcomingEvents(args.days || 7);

      case 'get_events_by_date':
        return await this.service.getEventsByDate(args.date);

      case 'get_events_by_date_range':
        return await this.service.getEventsByDateRange(args.startDate, args.endDate);

      case 'create_calendar_event': {
        // Build the event data object expected by CalendarService
        const endDateTime = args.endDateTime || (() => {
          const end = new Date(args.startDateTime);
          end.setHours(end.getHours() + 1);
          return end.toISOString();
        })();

        const eventData = {
          summary: args.title,
          description: args.description || '',
          location: args.location || '',
          start: {
            dateTime: new Date(args.startDateTime).toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
          end: {
            dateTime: new Date(endDateTime).toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
          attendees: (args.attendees || []).map(email => ({ email })),
        };

        return await this.service.createEvent(eventData);
      }

      case 'delete_calendar_event':
        return await this.service.deleteEvent(args.eventId);

      case 'update_calendar_event': {
        const updates = {};
        if (args.title) updates.summary = args.title;
        if (args.startDateTime) {
          updates.start = {
            dateTime: new Date(args.startDateTime).toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          };
        }
        if (args.endDateTime) {
          updates.end = {
            dateTime: new Date(args.endDateTime).toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          };
        }
        if (args.description) updates.description = args.description;
        return await this.service.updateEvent(args.eventId, updates);
      }

      default:
        throw new Error(`Unknown calendar tool: ${toolName}`);
    }
  }

  canHandle(toolName) {
    return CALENDAR_TOOL_DECLARATIONS.some(t => t.name === toolName);
  }
}

module.exports = { CALENDAR_TOOL_DECLARATIONS, CalendarToolExecutor };
