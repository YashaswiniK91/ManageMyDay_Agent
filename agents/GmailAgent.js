/**
 * GmailAgent
 *
 * Specialised agent for all Gmail operations.
 * Inherits the ReAct loop from BaseAgent and registers Gmail tools.
 */

const BaseAgent = require('./BaseAgent');
const { GMAIL_TOOL_DECLARATIONS, GmailToolExecutor } = require('../tools/GmailTools');

const GMAIL_SYSTEM_PROMPT = `You are a helpful Gmail assistant integrated into the ManageMyDay agent.
Your job is to help users read, search, send, and manage their email.

Today's date is ${new Date().toDateString()}.

Guidelines:
- Never send an email without first confirming the recipient, subject, and key content with the user.
- When displaying emails, show: sender, subject, date, and a brief snippet if available.
- Protect user privacy — do not repeat full email body content unless explicitly asked.
- For "show my emails" or "check inbox" type requests, use get_unread_emails or get_latest_emails.
- When the user asks to reply to an email, use the original sender address as the recipient.
- Keep responses concise and clearly formatted.`;

class GmailAgent extends BaseAgent {
  /**
   * @param {object} authToken - OAuth token for the authenticated user
   */
  constructor(authToken) {
    super({
      name: 'GmailAgent',
      systemPrompt: GMAIL_SYSTEM_PROMPT,
    });

    const executor = new GmailToolExecutor(authToken);
    this.registerTools(GMAIL_TOOL_DECLARATIONS, executor);
  }
}

module.exports = GmailAgent;
