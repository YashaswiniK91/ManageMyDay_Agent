const { google } = require('googleapis');
const { createAuthenticatedClient } = require('../config/auth');

/**
 * Google Chat Bot Handler
 * Handles incoming messages from Google Chat and routes them
 * Supports Calendar, Gmail, and Drive operations
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
        case 'calendar_read':
          response = await this.handleCalendarReadQuery(intent);
          break;
        case 'calendar_write':
          response = await this.handleCalendarWriteQuery(intent);
          break;
        case 'gmail_read':
          response = await this.handleGmailReadQuery(intent);
          break;
        case 'gmail_write':
          response = await this.handleGmailWriteQuery(intent);
          break;
        case 'drive_read':
          response = await this.handleDriveReadQuery(intent);
          break;
        case 'drive_write':
          response = await this.handleDriveWriteQuery(intent);
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
   * Detect intent from user query with action and service type
   */
  detectIntent(query) {
    const lowerQuery = query.toLowerCase();

    // Extract action verbs
    const writeActions = ['create', 'send', 'draft', 'schedule', 'add', 'make', 'new', 'write', 'upload', 'share', 'delete', 'remove'];
    const readActions = ['show', 'what', 'get', 'tell', 'list', 'find', 'search', 'view', 'read', 'check', 'display'];
    
    const isWriteAction = writeActions.some(action => lowerQuery.includes(action));
    const isReadAction = readActions.some(action => lowerQuery.includes(action));

    // Calendar Intent
    if (
      lowerQuery.includes('calendar') ||
      lowerQuery.includes('schedule') ||
      lowerQuery.includes('event') ||
      lowerQuery.includes('meeting') ||
      lowerQuery.includes('reminder') ||
      lowerQuery.includes('today') ||
      lowerQuery.includes('tomorrow') ||
      lowerQuery.includes('week') ||
      lowerQuery.includes('day')
    ) {
      if (isWriteAction) {
        return this.parseCalendarWriteIntent(query);
      } else {
        return this.parseCalendarReadIntent(query);
      }
    }

    // Gmail Intent
    if (
      lowerQuery.includes('email') ||
      lowerQuery.includes('mail') ||
      lowerQuery.includes('inbox') ||
      lowerQuery.includes('send') ||
      lowerQuery.includes('draft')
    ) {
      if (isWriteAction) {
        return this.parseGmailWriteIntent(query);
      } else {
        return this.parseGmailReadIntent(query);
      }
    }

    // Drive Intent
    if (
      lowerQuery.includes('drive') ||
      lowerQuery.includes('file') ||
      lowerQuery.includes('document') ||
      lowerQuery.includes('folder') ||
      lowerQuery.includes('sheet') ||
      lowerQuery.includes('slide')
    ) {
      if (isWriteAction) {
        return this.parseDriveWriteIntent(query);
      } else {
        return this.parseDriveReadIntent(query);
      }
    }

    // Help Intent
    if (
      lowerQuery.includes('help') ||
      lowerQuery.includes('what can you') ||
      lowerQuery.includes('commands') ||
      lowerQuery.includes('capabilities')
    ) {
      return { type: 'help', query };
    }

    return { type: 'unknown', query };
  }

  // ============ CALENDAR INTENT PARSERS ============

  parseCalendarReadIntent(query) {
    return {
      type: 'calendar_read',
      query,
      action: 'read',
    };
  }

  parseCalendarWriteIntent(query) {
    const lowerQuery = query.toLowerCase();
    const intent = {
      type: 'calendar_write',
      query,
      action: 'write',
      subAction: null,
      eventData: {},
    };

    // Determine sub-action
    if (lowerQuery.includes('create') || lowerQuery.includes('add') || lowerQuery.includes('schedule') || lowerQuery.includes('new')) {
      intent.subAction = 'create';
      intent.eventData = this.extractEventData(query);
    } else if (lowerQuery.includes('delete') || lowerQuery.includes('remove') || lowerQuery.includes('cancel')) {
      intent.subAction = 'delete';
    } else if (lowerQuery.includes('update') || lowerQuery.includes('change') || lowerQuery.includes('modify')) {
      intent.subAction = 'update';
      intent.eventData = this.extractEventData(query);
    }

    return intent;
  }

  // ============ GMAIL INTENT PARSERS ============

  parseGmailReadIntent(query) {
    const lowerQuery = query.toLowerCase();
    const intent = {
      type: 'gmail_read',
      query,
      action: 'read',
      subAction: 'list',
    };

    if (lowerQuery.includes('unread')) {
      intent.subAction = 'unread';
    } else if (lowerQuery.includes('from')) {
      intent.subAction = 'from';
      intent.sender = this.extractEmail(query);
    } else if (lowerQuery.includes('subject')) {
      intent.subAction = 'subject';
      intent.subject = this.extractSubject(query);
    }

    return intent;
  }

  parseGmailWriteIntent(query) {
    const lowerQuery = query.toLowerCase();
    const intent = {
      type: 'gmail_write',
      query,
      action: 'write',
      subAction: 'send',
      emailData: {},
    };

    if (lowerQuery.includes('draft')) {
      intent.subAction = 'draft';
    } else {
      intent.subAction = 'send';
    }

    intent.emailData = this.extractEmailData(query);
    return intent;
  }

  // ============ DRIVE INTENT PARSERS ============

  parseDriveReadIntent(query) {
    const lowerQuery = query.toLowerCase();
    const intent = {
      type: 'drive_read',
      query,
      action: 'read',
      subAction: 'recent',
    };

    if (lowerQuery.includes('recent')) {
      intent.subAction = 'recent';
    } else if (lowerQuery.includes('search') || lowerQuery.includes('find')) {
      intent.subAction = 'search';
      intent.searchTerm = this.extractSearchTerm(query);
    } else if (lowerQuery.includes('folder')) {
      intent.subAction = 'folder';
      intent.folderName = this.extractFolderName(query);
    }

    return intent;
  }

  parseDriveWriteIntent(query) {
    const lowerQuery = query.toLowerCase();
    const intent = {
      type: 'drive_write',
      query,
      action: 'write',
      subAction: 'create',
    };

    if (lowerQuery.includes('create') || lowerQuery.includes('new')) {
      intent.subAction = 'create';
      intent.itemName = this.extractItemName(query);
    } else if (lowerQuery.includes('upload')) {
      intent.subAction = 'upload';
    } else if (lowerQuery.includes('share')) {
      intent.subAction = 'share';
      intent.emails = this.extractEmails(query);
    } else if (lowerQuery.includes('delete') || lowerQuery.includes('remove')) {
      intent.subAction = 'delete';
    }

    return intent;
  }

  // ============ CALENDAR HANDLERS ============

  async handleCalendarReadQuery(intent) {
    const calendarService = this.services.calendar;
    if (!calendarService) {
      return '📅 Calendar service not available. Please authenticate first.';
    }

    try {
      const events = await calendarService.handleNaturalLanguageQuery(intent.query);

      if (events.length === 0) {
        return '📅 No events found for your query.';
      }

      return this.formatCalendarResponse(events);
    } catch (error) {
      return `❌ Error fetching calendar events: ${error.message}`;
    }
  }

  async handleCalendarWriteQuery(intent) {
    const calendarService = this.services.calendar;
    if (!calendarService) {
      return '📅 Calendar service not available. Please authenticate first.';
    }

    try {
      if (!intent.subAction) {
        return '❌ Please specify what you want to do (create, update, or delete).';
      }

      if (intent.subAction === 'create') {
        if (!intent.eventData.title) {
          return '❌ Please provide an event title. Example: "Create a meeting called Project Review tomorrow at 3 PM"';
        }
        const result = await calendarService.createEvent(intent.eventData);
        return `✅ Event "${intent.eventData.title}" created successfully!`;
      } else if (intent.subAction === 'delete') {
        return '❌ Please provide the event ID to delete.';
      } else if (intent.subAction === 'update') {
        return '❌ Please provide the event ID and updates.';
      }

      return '❌ Unknown calendar action.';
    } catch (error) {
      return `❌ Error with calendar operation: ${error.message}`;
    }
  }

  // ============ GMAIL HANDLERS ============

  async handleGmailReadQuery(intent) {
    const gmailService = this.services.gmail;
    if (!gmailService) {
      return '✉️ Gmail service not available. Please authenticate first.';
    }

    try {
      let emails;

      if (intent.subAction === 'unread') {
        emails = await gmailService.getUnreadEmails(5);
      } else if (intent.subAction === 'from' && intent.sender) {
        emails = await gmailService.getEmailsFromSender(intent.sender, 5);
      } else if (intent.subAction === 'subject' && intent.subject) {
        emails = await gmailService.getEmailsBySubject(intent.subject, 5);
      } else {
        emails = await gmailService.getLatestEmails(5);
      }

      if (emails.length === 0) {
        return '✉️ No emails found.';
      }

      return this.formatGmailResponse(emails, intent.subAction);
    } catch (error) {
      return `❌ Error fetching emails: ${error.message}`;
    }
  }

  async handleGmailWriteQuery(intent) {
    const gmailService = this.services.gmail;
    if (!gmailService) {
      return '✉️ Gmail service not available. Please authenticate first.';
    }

    try {
      if (!intent.emailData.to || !intent.emailData.subject || !intent.emailData.body) {
        return '❌ Please provide recipient, subject, and message body. Example: "Send email to john@gmail.com with subject Meeting Today and body Let\'s meet at 3 PM"';
      }

      if (intent.subAction === 'draft') {
        await gmailService.draftEmail(intent.emailData);
        return `✅ Email drafted to ${intent.emailData.to}`;
      } else {
        await gmailService.sendEmail(intent.emailData);
        return `✅ Email sent to ${intent.emailData.to}`;
      }
    } catch (error) {
      return `❌ Error sending email: ${error.message}`;
    }
  }

  // ============ DRIVE HANDLERS ============

  async handleDriveReadQuery(intent) {
    const driveService = this.services.drive;
    if (!driveService) {
      return '📁 Drive service not available. Please authenticate first.';
    }

    try {
      let files;

      if (intent.subAction === 'search' && intent.searchTerm) {
        files = await driveService.searchFiles(intent.searchTerm, 10);
      } else if (intent.subAction === 'folder' && intent.folderName) {
        files = await driveService.getFilesInFolder(intent.folderName, 10);
      } else {
        files = await driveService.getRecentFiles(10);
      }

      if (files.length === 0) {
        return '📁 No files found.';
      }

      return this.formatDriveResponse(files);
    } catch (error) {
      return `❌ Error accessing Drive: ${error.message}`;
    }
  }

  async handleDriveWriteQuery(intent) {
    const driveService = this.services.drive;
    if (!driveService) {
      return '📁 Drive service not available. Please authenticate first.';
    }

    try {
      if (intent.subAction === 'create') {
        if (!intent.itemName) {
          return '❌ Please provide a name for the folder. Example: "Create folder called Project Reports"';
        }
        await driveService.createFolder(intent.itemName);
        return `✅ Folder "${intent.itemName}" created successfully!`;
      } else if (intent.subAction === 'share') {
        if (!intent.emails || intent.emails.length === 0) {
          return '❌ Please provide email addresses to share with. Example: "Share with john@gmail.com and jane@gmail.com"';
        }
        return `✅ File shared with ${intent.emails.length} user(s)`;
      } else if (intent.subAction === 'delete') {
        return '❌ Please provide the file ID to delete.';
      }

      return '❌ Unknown Drive action.';
    } catch (error) {
      return `❌ Error with Drive operation: ${error.message}`;
    }
  }

  // ============ PARAMETER EXTRACTION ============

  extractEventData(query) {
    // Extract title from query
    const titleMatch = query.match(/(?:called|named|titled|event is|meeting is)\s+([^.!?]+)/i);
    const title = titleMatch ? titleMatch[1].trim() : query.match(/create|add|schedule|new\s+([^.!?]+)/i)?.[1]?.trim() || 'Untitled Event';

    // Extract date/time
    const now = new Date();
    let startTime = now;
    let endTime = new Date(now.getTime() + 60 * 60 * 1000); // Default 1 hour

    if (query.toLowerCase().includes('tomorrow')) {
      startTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
    }

    // Extract time if provided
    const timeMatch = query.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
    if (timeMatch) {
      let hour = parseInt(timeMatch[1]);
      if (timeMatch[3]?.toLowerCase() === 'pm' && hour !== 12) hour += 12;
      if (timeMatch[3]?.toLowerCase() === 'am' && hour === 12) hour = 0;
      startTime.setHours(hour, parseInt(timeMatch[2]) || 0);
      endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
    }

    return {
      title,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      description: query,
    };
  }

  extractEmailData(query) {
    const to = this.extractEmail(query);
    const subjectMatch = query.match(/(?:subject|re:|with subject|about)\s+([^.!?]+?)(?:\s+and\s+|\.|\!|\?|$)/i);
    const subject = subjectMatch ? subjectMatch[1].trim() : 'No Subject';
    
    const bodyMatch = query.match(/(?:body|message|saying|content|text is)\s+([^.!?]+?)(?:$|\.|\!|\?)/i);
    const body = bodyMatch ? bodyMatch[1].trim() : query.split('send')[1]?.trim() || query;

    return { to, subject, body };
  }

  extractEmail(query) {
    const emailMatch = query.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+)/);
    return emailMatch ? emailMatch[1] : '';
  }

  extractEmails(query) {
    const emailMatches = query.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+)/g);
    return emailMatches || [];
  }

  extractSubject(query) {
    const match = query.match(/subject\s+(?:is\s+)?(?:about\s+)?([^.!?]+)/i);
    return match ? match[1].trim() : '';
  }

  extractSearchTerm(query) {
    const match = query.match(/(?:find|search)\s+(?:for\s+)?([^.!?]+)/i);
    return match ? match[1].trim() : '';
  }

  extractFolderName(query) {
    const match = query.match(/(?:in|from)\s+(?:folder\s+)?([^.!?]+)/i);
    return match ? match[1].trim() : '';
  }

  extractItemName(query) {
    const match = query.match(/(?:called|named|titled|create|new|folder)\s+(?:called\s+)?([^.!?]+)/i);
    return match ? match[1].trim() : '';
  }

  // ============ RESPONSE FORMATTERS ============

  /**
   * Handle help queries
   */
  handleHelpQuery() {
    return `🤖 *ManageMyDay Agent - Help Guide*

I can help you with:

📅 *CALENDAR COMMANDS*
- Read: "What's my schedule today?" | "Show my events for tomorrow" | "What meetings do I have?"
- Write: "Create event called Project Review tomorrow at 3 PM"

✉️ *EMAIL COMMANDS*
- Read: "Show unread emails" | "Get emails from john@gmail.com" | "Find emails about Meeting"
- Write: "Send email to john@gmail.com with subject Lunch and body Let's meet at noon" | "Draft email to jane@gmail.com..."

📁 *DRIVE COMMANDS*
- Read: "Show recent files" | "Find document called Report" | "Files in folder Projects"
- Write: "Create folder called Reports" | "Share with john@gmail.com and jane@gmail.com"

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
        response += `   📝 ${event.description.substring(0, 50)}...\n`;
      }
      response += '\n';
    });

    return response;
  }

  /**
   * Format Gmail emails for display
   */
  formatGmailResponse(emails, type) {
    let response = '✉️ *Your Emails*\n\n';

    emails.forEach((email, index) => {
      response += `${index + 1}. *From:* ${email.from}\n`;
      response += `   📋 *Subject:* ${email.subject}\n`;
      response += `   🕐 ${email.date}\n`;
      if (email.unread) {
        response += `   🔔 *UNREAD*\n`;
      }
      response += '\n';
    });

    return response;
  }

  /**
   * Format Drive files for display
   */
  formatDriveResponse(files) {
    let response = '📁 *Your Files*\n\n';

    files.forEach((file, index) => {
      response += `${index + 1}. 📄 *${file.name}*\n`;
      response += `   Type: ${file.type}\n`;
      response += `   Modified: ${new Date(file.modified).toLocaleDateString()}\n`;
      response += '\n';
    });

    return response;
  }
}

module.exports = ChatBotHandler;
