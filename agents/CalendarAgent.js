/**
 * CalendarAgent
 *
 * Specialised agent for all Google Calendar operations.
 * Inherits the ReAct loop from BaseAgent and registers Calendar tools.
 */

const BaseAgent = require('./BaseAgent');
const { CALENDAR_TOOL_DECLARATIONS, CalendarToolExecutor } = require('../tools/CalendarTools');

const CALENDAR_SYSTEM_PROMPT = `You are a helpful Google Calendar assistant integrated into the ManageMyDay agent.
Your job is to help users manage their schedule, meetings, events, and reminders.

Today's date is ${new Date().toDateString()}.

Guidelines:
- Always confirm before creating or deleting events — summarise what you are about to do.
- When listing events, format them clearly with time, title, and location if available.
- For ambiguous date references (e.g. "next Monday"), infer the correct date based on today.
- If required information is missing (e.g. event title or time), ask the user before calling a tool.
- When an event is created or modified, confirm the action with a friendly summary.
- Keep responses concise and scannable.`;

class CalendarAgent extends BaseAgent {
  /**
   * @param {object} authToken - OAuth token for the authenticated user
   */
  constructor(authToken) {
    super({
      name: 'CalendarAgent',
      systemPrompt: CALENDAR_SYSTEM_PROMPT,
    });

    const executor = new CalendarToolExecutor(authToken);
    this.registerTools(CALENDAR_TOOL_DECLARATIONS, executor);
  }
}

module.exports = CalendarAgent;
