const { google } = require('googleapis');
const { createAuthenticatedClient } = require('../config/auth');

/**
 * Google Chat Bot Handler
 * Handles incoming messages from Google Chat and routes them
 */

class ChatBotHandler {
  constructor(authToken) {
    this.authToken = authToken;
    this.services = {};
  }

  registerService(serviceName, service) {
    this.services[serviceName] = service;
  }

  /**
   * Process incoming Google Chat message
   */
  async handleMessage(message) {
    try {
      const userQuery = message.text || '';
      
      // Route based on intent detection
      const intent = this.detectIntent(userQuery);
      
      let response;
      
      switch (intent.type) {
        case 'calendar':
          response = await this.handleCalendarQuery(intent.query);
          break;
        case 'gmail':
          response = await this.handleGmailQuery(intent.query);
          break;
        case 'drive':
          response = await this.handleDriveQuery(intent.query);
          break;
        case 'help':
          response = this.handleHelpQuery();
          break;
        default:
          response = this.handleUnknownQuery(userQuery);
      }

      return {
        text: response,
        threadReply: message.thread || null,
      };
    } catch (error) {
      console.error('Error handling message:', error);
      return {
        text: `Sorry, I encountered an error: ${error.message}`,
      };
    }
  }

  /**
   * Detect intent from user query using keywords
   */
  detectIntent(query) {
    const lowerQuery = query.toLowerCase();

    // Calendar Intent
    if (
      lowerQuery.includes('calendar') ||
      lowerQuery.includes('schedule') ||
      lowerQuery.includes('event') ||
      lowerQuery.includes('meeting') ||
      lowerQuery.includes('today') ||
      lowerQuery.includes('tomorrow') ||
      lowerQuery.includes('week')
    ) {
      return { type: 'calendar', query };
    }

    // Gmail Intent
    if (
      lowerQuery.includes('email') ||
      lowerQuery.includes('mail') ||
      lowerQuery.includes('inbox')
    ) {
      return { type: 'gmail', query };
    }

    // Drive Intent
    if (
      lowerQuery.includes('drive') ||
      lowerQuery.includes('file') ||
      lowerQuery.includes('document') ||
      lowerQuery.includes('folder')
    ) {
      return { type: 'drive', query };
    }

    // Help Intent
    if (
      lowerQuery.includes('help') ||
      lowerQuery.includes('what can you') ||
      lowerQuery.includes('commands')
    ) {
      return { type: 'help', query };
    }

    return { type: 'unknown', query };
  }

  /**
   * Handle calendar-related queries
   */
  async handleCalendarQuery(query) {
    const calendarService = this.services.calendar;
    if (!calendarService) {
      return '📅 Calendar service not available. Please re-authenticate.';
    }

    try {
      const events = await calendarService.handleNaturalLanguageQuery(query);

      if (events.length === 0) {
        return '📅 No events found for your query.';
      }

      return this.formatCalendarResponse(events);
    } catch (error) {
      return `❌ Error fetching calendar events: ${error.message}`;
    }
  }

  /**
   * Handle Gmail-related queries
   */
  async handleGmailQuery(query) {
    const gmailService = this.services.gmail;
    if (!gmailService) {
      return '✉️ Gmail service not available. Please re-authenticate.';
    }

    try {
      // TODO: Implement Gmail service
      return '✉️ Gmail integration coming soon!';
    } catch (error) {
      return `❌ Error fetching emails: ${error.message}`;
    }
  }

  /**
   * Handle Drive-related queries
   */
  async handleDriveQuery(query) {
    const driveService = this.services.drive;
    if (!driveService) {
      return '📁 Drive service not available. Please re-authenticate.';
    }

    try {
      // TODO: Implement Drive service
      return '📁 Drive integration coming soon!';
    } catch (error) {
      return `❌ Error accessing Drive: ${error.message}`;
    }
  }

  /**
   * Handle help queries
   */
  handleHelpQuery() {
    return `🤖 *AgenticAI Bot - Help*

I can help you with:

📅 *Calendar*
- "What's my schedule for today?"
- "Show my events for tomorrow"
- "What meetings do I have this week?"

✉️ *Gmail* (Coming Soon)
- "Show my latest emails"
- "Any new messages from [name]?"

📁 *Drive* (Coming Soon)
- "Show my recent files"
- "Find document [name]"

Type any command above or ask me anything!`;
  }

  /**
   * Handle unknown queries
   */
  handleUnknownQuery(query) {
    return `🤔 I didn't understand that. Try asking about your calendar, emails, or files. Type "help" for available commands.`;
  }

  /**
   * Format calendar events for display
   */
  formatCalendarResponse(events) {
    let response = '📅 *Your Events*\n\n';

    events.forEach((event, index) => {
      const startTime = new Date(event.start).toLocaleString();
      response += `${index + 1}. *${event.title}*\n`;
      response += `   📍 ${event.location || 'No location'}\n`;
      response += `   🕐 ${startTime}\n`;
      if (event.description) {
        response += `   📝 ${event.description}\n`;
      }
      response += '\n';
    });

    return response;
  }
}

module.exports = ChatBotHandler;
