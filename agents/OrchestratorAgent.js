/**
 * OrchestratorAgent
 *
 * The top-level agent that receives every user message.
 *
 * It has ALL tools registered (Calendar + Gmail + Drive), so Gemini can:
 *   • Route single-domain requests to the right tool automatically
 *   • Handle multi-domain tasks in a single conversation turn
 *     (e.g. "email the organiser of my next meeting with a summary of the agenda")
 *
 * Per-user conversation history is stored in-memory keyed by userId.
 * For production, swap in a persistent store (Redis, Firestore, etc.).
 */

const BaseAgent = require('./BaseAgent');
const { CALENDAR_TOOL_DECLARATIONS, CalendarToolExecutor } = require('../tools/CalendarTools');
const { GMAIL_TOOL_DECLARATIONS, GmailToolExecutor } = require('../tools/GmailTools');
const { DRIVE_TOOL_DECLARATIONS, DriveToolExecutor } = require('../tools/DriveTools');

const ORCHESTRATOR_SYSTEM_PROMPT = `You are ManageMyDay, an intelligent personal productivity assistant.
You help users manage their Google Workspace — Calendar, Gmail, and Drive — in a single conversation.

Today's date is ${new Date().toDateString()}.

Your capabilities:
📅 CALENDAR  – View today's/upcoming events, create/update/delete meetings and reminders
📧 GMAIL     – Read inbox, search emails, send/draft emails, manage messages  
📂 DRIVE     – Browse recent files, search documents, manage folders and sharing

How to behave:
1. PLAN before acting: For complex multi-step requests (e.g. "email the person I'm meeting next"), 
   think through the steps and call tools in sequence.
2. CONFIRM destructive actions: Always confirm before sending or deleting. For creating calendar events, proceed immediately when title + time are provided — do NOT ask for confirmation.
3. BE CONCISE: Format output in short, readable lists. Avoid wall-of-text responses.
4. HANDLE AMBIGUITY: If the request is unclear, ask one focused clarifying question.
5. CHAIN TOOLS: You can call multiple tools in a single response to answer compound questions.
   Example: "Do I have any unread emails about my 3pm meeting?" → get today's events → search emails.
6. REMEMBER CONTEXT: Use conversation history to resolve pronouns ("it", "that meeting", "him").

Date and time parsing rules (IMPORTANT — apply to ALL calendar operations):
- Convert any date/time format the user provides into ISO 8601: YYYY-MM-DDTHH:MM:SS
- "18th May 2026 13:00-14:00"   → startDateTime: 2026-05-18T13:00:00, endDateTime: 2026-05-18T14:00:00
- "May 18 2026 1pm-2pm"         → startDateTime: 2026-05-18T13:00:00, endDateTime: 2026-05-18T14:00:00
- "18/05/2026 13:00-14:00"      → startDateTime: 2026-05-18T13:00:00, endDateTime: 2026-05-18T14:00:00
- "tomorrow at 10am for 1 hour" → compute correct date from today
- A time range "HH:MM-HH:MM" means start and end on the same day.
- When no end time is given, default to 1 hour after start.
- Extract event title exactly as given, including any quoted text.

You have access to Calendar, Gmail, and Drive tools. Use them proactively to give helpful answers.`;

// Maximum history turns to keep per user (older turns are pruned to limit token usage)
const MAX_HISTORY_TURNS = 20;

class OrchestratorAgent extends BaseAgent {
  /**
   * @param {object} authToken - OAuth token for the authenticated user
   */
  constructor(authToken) {
    super({
      name: 'OrchestratorAgent',
      systemPrompt: ORCHESTRATOR_SYSTEM_PROMPT,
    });

    // Register all domain tools
    this.registerTools(CALENDAR_TOOL_DECLARATIONS, new CalendarToolExecutor(authToken));
    this.registerTools(GMAIL_TOOL_DECLARATIONS, new GmailToolExecutor(authToken));
    this.registerTools(DRIVE_TOOL_DECLARATIONS, new DriveToolExecutor(authToken));

    // In-memory per-user conversation history: userId → Array of turns
    this._histories = new Map();
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  /**
   * Process a user message and return the agent's response.
   *
   * @param {string} userMessage - The user's natural-language message
   * @param {string} [userId='default'] - Unique user identifier for conversation isolation
   * @returns {Promise<string>} - Agent's final response text
   */
  async chat(userMessage, userId = 'default') {
    const history = this._getHistory(userId);

    console.log(`[OrchestratorAgent] User (${userId}): ${userMessage}`);

    try {
      const { response, history: updatedHistory } = await this.run(userMessage, history);

      // Persist updated history (pruned to last N turns)
      this._setHistory(userId, updatedHistory);

      console.log(`[OrchestratorAgent] Response: ${response.slice(0, 120)}...`);
      return response;
    } catch (err) {
      console.error('[OrchestratorAgent] Error:', err.message);
      return `I encountered an error while processing your request: ${err.message}`;
    }
  }

  /**
   * Clear conversation history for a user (e.g., on new session or /reset command).
   * @param {string} userId
   */
  clearHistory(userId) {
    this._histories.delete(userId);
    console.log(`[OrchestratorAgent] History cleared for user: ${userId}`);
  }

  /**
   * Return the current conversation history for a user (for debugging/testing).
   * @param {string} userId
   * @returns {Array}
   */
  getHistory(userId) {
    return this._getHistory(userId);
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  _getHistory(userId) {
    return this._histories.get(userId) || [];
  }

  _setHistory(userId, history) {
    // Prune to last MAX_HISTORY_TURNS to avoid unbounded growth
    const pruned = history.slice(-MAX_HISTORY_TURNS);
    this._histories.set(userId, pruned);
  }
}

module.exports = OrchestratorAgent;
