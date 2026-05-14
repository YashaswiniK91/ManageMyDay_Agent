const { google } = require('googleapis');
const { createAuthenticatedClient } = require('../config/auth');

/**
 * Google Gmail Service
 * Handles Gmail API interactions
 * 
 * TODO: Implement full Gmail functionality
 */

class GmailService {
  constructor(authToken) {
    this.authToken = authToken;
    this.gmail = null;
    this.initialize();
  }

  initialize() {
    if (!this.authToken) {
      throw new Error('Authorization token required for Gmail Service');
    }

    const auth = createAuthenticatedClient(this.authToken);
    this.gmail = google.gmail({ version: 'v1', auth });
  }

  /**
   * Get unread emails from inbox
   */
  async getUnreadEmails(maxResults = 5) {
    try {
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: 'is:unread',
        maxResults,
      });

      const messages = response.data.messages || [];
      return await this._formatMessages(messages);
    } catch (error) {
      console.error('Error fetching unread emails:', error);
      throw error;
    }
  }

  /**
   * Get emails from a specific sender
   */
  async getEmailsFromSender(senderEmail, maxResults = 5) {
    try {
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: `from:${senderEmail}`,
        maxResults,
      });

      const messages = response.data.messages || [];
      return await this._formatMessages(messages);
    } catch (error) {
      console.error(`Error fetching emails from ${senderEmail}:`, error);
      throw error;
    }
  }

  /**
   * Get emails with a specific subject
   */
  async getEmailsBySubject(subject, maxResults = 5) {
    try {
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: `subject:${subject}`,
        maxResults,
      });

      const messages = response.data.messages || [];
      return await this._formatMessages(messages);
    } catch (error) {
      console.error(`Error fetching emails with subject "${subject}":`, error);
      throw error;
    }
  }

  /**
   * Get latest emails
   */
  async getLatestEmails(maxResults = 5) {
    try {
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        maxResults,
      });

      const messages = response.data.messages || [];
      return await this._formatMessages(messages);
    } catch (error) {
      console.error('Error fetching latest emails:', error);
      throw error;
    }
  }

  /**
   * Get email count
   */
  async getEmailCount() {
    try {
      const response = await this.gmail.users.messages.list({
        userId: 'me',
      });

      return {
        total: response.data.resultSizeEstimate || 0,
        unread: await this._getUnreadCount(),
      };
    } catch (error) {
      console.error('Error getting email count:', error);
      throw error;
    }
  }

  /**
   * Helper: Get message details and format
   */
  async _formatMessages(messages) {
    if (!messages || messages.length === 0) {
      return [];
    }

    const formatted = [];

    for (const message of messages) {
      try {
        const fullMessage = await this.gmail.users.messages.get({
          userId: 'me',
          id: message.id,
          format: 'metadata',
          metadataHeaders: ['From', 'Subject', 'Date'],
        });

        const headers = fullMessage.data.payload.headers;
        const subject = headers.find(h => h.name === 'Subject')?.value || 'No Subject';
        const from = headers.find(h => h.name === 'From')?.value || 'Unknown';
        const date = headers.find(h => h.name === 'Date')?.value || '';

        formatted.push({
          id: message.id,
          subject,
          from,
          date,
          unread: fullMessage.data.labelIds?.includes('UNREAD') || false,
        });
      } catch (error) {
        console.error(`Error formatting message ${message.id}:`, error);
      }
    }

    return formatted;
  }

  /**
   * Helper: Get unread email count
   */
  async _getUnreadCount() {
    try {
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: 'is:unread',
      });

      return response.data.resultSizeEstimate || 0;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  /**
   * Parse natural language query and fetch emails
   */
  async handleNaturalLanguageQuery(query) {
    const lowerQuery = query.toLowerCase();

    if (lowerQuery.includes('unread') || lowerQuery.includes('new')) {
      return await this.getUnreadEmails(5);
    }

    if (lowerQuery.includes('from')) {
      // Extract sender email from query (simple parsing)
      // TODO: Implement more sophisticated parsing
      const words = query.split(' ');
      const fromIndex = words.findIndex(w => w.toLowerCase() === 'from');
      if (fromIndex !== -1 && words[fromIndex + 1]) {
        return await this.getEmailsFromSender(words[fromIndex + 1], 5);
      }
    }

    if (lowerQuery.includes('subject')) {
      // Extract subject from query
      // TODO: Implement more sophisticated parsing
      const match = query.match(/subject:?"(.+?)"/i);
      if (match) {
        return await this.getEmailsBySubject(match[1], 5);
      }
    }

    // Default: return latest emails
    return await this.getLatestEmails(5);
  }
}

module.exports = GmailService;
