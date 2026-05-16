/**
 * Gmail Tools
 * Defines Gemini function declarations and execution logic for Gmail operations.
 */

const GmailService = require('../services/GmailService');

// ─── Gemini Function Declarations ────────────────────────────────────────────

const GMAIL_TOOL_DECLARATIONS = [
  {
    name: 'get_unread_emails',
    description: "Get the user's unread emails from Gmail inbox. Use this when the user asks about unread messages, new mail, or inbox status.",
    parameters: {
      type: 'object',
      properties: {
        maxResults: {
          type: 'number',
          description: 'Maximum number of emails to return. Defaults to 5.',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_latest_emails',
    description: "Get the user's most recent emails regardless of read status.",
    parameters: {
      type: 'object',
      properties: {
        maxResults: {
          type: 'number',
          description: 'Maximum number of emails to return. Defaults to 5.',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_emails_from_sender',
    description: "Get emails from a specific sender. Use this when the user asks 'emails from John' or 'messages from someone@example.com'.",
    parameters: {
      type: 'object',
      properties: {
        senderEmail: {
          type: 'string',
          description: 'Email address or name of the sender to filter by.',
        },
        maxResults: {
          type: 'number',
          description: 'Maximum number of emails to return. Defaults to 5.',
        },
      },
      required: ['senderEmail'],
    },
  },
  {
    name: 'get_emails_by_subject',
    description: "Search emails by subject keyword. Use this when the user asks about emails with a specific subject.",
    parameters: {
      type: 'object',
      properties: {
        subject: {
          type: 'string',
          description: 'Subject keyword to search for.',
        },
        maxResults: {
          type: 'number',
          description: 'Maximum number of emails to return. Defaults to 5.',
        },
      },
      required: ['subject'],
    },
  },
  {
    name: 'get_email_count',
    description: 'Get the total and unread email count in the inbox.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'send_email',
    description: "Compose and send an email on behalf of the user. Use this when the user says 'send an email to', 'email X about Y', etc.",
    parameters: {
      type: 'object',
      properties: {
        to: {
          type: 'string',
          description: 'Recipient email address.',
        },
        subject: {
          type: 'string',
          description: 'Email subject line.',
        },
        body: {
          type: 'string',
          description: 'Email body content (plain text).',
        },
        cc: {
          type: 'string',
          description: 'Optional CC email addresses (comma-separated).',
        },
      },
      required: ['to', 'subject', 'body'],
    },
  },
  {
    name: 'draft_email',
    description: "Save an email as a draft without sending. Use this when the user says 'draft an email' or 'save as draft'.",
    parameters: {
      type: 'object',
      properties: {
        to: {
          type: 'string',
          description: 'Recipient email address.',
        },
        subject: {
          type: 'string',
          description: 'Email subject line.',
        },
        body: {
          type: 'string',
          description: 'Email body content.',
        },
      },
      required: ['to', 'subject', 'body'],
    },
  },
  {
    name: 'delete_email',
    description: 'Delete (trash) an email by its message ID.',
    parameters: {
      type: 'object',
      properties: {
        messageId: {
          type: 'string',
          description: 'The Gmail message ID to delete.',
        },
      },
      required: ['messageId'],
    },
  },
  {
    name: 'mark_email_as_read',
    description: 'Mark an email as read by its message ID.',
    parameters: {
      type: 'object',
      properties: {
        messageId: {
          type: 'string',
          description: 'The Gmail message ID to mark as read.',
        },
      },
      required: ['messageId'],
    },
  },
];

// ─── Tool Executor ────────────────────────────────────────────────────────────

class GmailToolExecutor {
  constructor(authToken) {
    this.service = new GmailService(authToken);
  }

  async execute(toolName, args) {
    switch (toolName) {
      case 'get_unread_emails':
        return await this.service.getUnreadEmails(args.maxResults || 5);

      case 'get_latest_emails':
        return await this.service.getLatestEmails(args.maxResults || 5);

      case 'get_emails_from_sender':
        return await this.service.getEmailsFromSender(args.senderEmail, args.maxResults || 5);

      case 'get_emails_by_subject':
        return await this.service.getEmailsBySubject(args.subject, args.maxResults || 5);

      case 'get_email_count':
        return await this.service.getEmailCount();

      case 'send_email': {
        const emailData = {
          to: args.to,
          subject: args.subject,
          body: args.body,
          cc: args.cc || '',
        };
        return await this.service.sendEmail(emailData);
      }

      case 'draft_email': {
        const emailData = {
          to: args.to,
          subject: args.subject,
          body: args.body,
        };
        return await this.service.createDraft(emailData);
      }

      case 'delete_email':
        return await this.service.deleteMessage(args.messageId);

      case 'mark_email_as_read':
        return await this.service.markAsRead(args.messageId);

      default:
        throw new Error(`Unknown Gmail tool: ${toolName}`);
    }
  }

  canHandle(toolName) {
    return GMAIL_TOOL_DECLARATIONS.some(t => t.name === toolName);
  }
}

module.exports = { GMAIL_TOOL_DECLARATIONS, GmailToolExecutor };
