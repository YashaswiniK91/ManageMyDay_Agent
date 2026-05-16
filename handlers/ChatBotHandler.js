/**
 * ChatBotHandler (Agentic)
 *
 * Thin adapter that bridges the existing Express route layer to the new
 * OrchestratorAgent.  All intelligence has moved to the agents/ layer.
 *
 * Per-user OrchestratorAgent instances are cached in a module-level Map so
 * conversation history survives across HTTP requests within the same process.
 */

const OrchestratorAgent = require('../agents/OrchestratorAgent');

// Module-level agent registry: userId → OrchestratorAgent
// (In production swap for a persistent session store: Redis / Firestore)
const _agentRegistry = new Map();

function _getAgent(authToken, userId) {
  if (_agentRegistry.has(userId)) {
    return _agentRegistry.get(userId);
  }
  const agent = new OrchestratorAgent(authToken);
  _agentRegistry.set(userId, agent);
  return agent;
}

class ChatBotHandler {
  /**
   * @param {object} authToken  OAuth token for the authenticated user
   * @param {string} [userId]   Unique user identifier (keys conversation history)
   */
  constructor(authToken, userId = 'default-user') {
    this.authToken = authToken;
    this.userId = userId;
    this._agent = null;
  }

  // Legacy compatibility – services are now managed inside tool executors.
  registerService(_name, _service) {}

  /**
   * Process a user message through the agentic pipeline (OrchestratorAgent).
   *
   * @param {{ text: string, userId?: string, thread?: object }} message
   * @returns {Promise<{ text: string, threadReply: object|null }>}
   */
  async handleMessage(message) {
    const userText = message.text || '';
    const userId = message.userId || this.userId;

    // Special reset command handled outside the LLM
    if (userText.trim().toLowerCase() === '/reset') {
      const agent = _agentRegistry.get(userId);
      if (agent) agent.clearHistory(userId);
      _agentRegistry.delete(userId);
      return {
        text: '🔄 Conversation history cleared. Starting fresh!',
        threadReply: message.thread || null,
      };
    }

    if (!this._agent) {
      this._agent = _getAgent(this.authToken, userId);
    }

    try {
      const responseText = await this._agent.chat(userText, userId);
      return { text: responseText, threadReply: message.thread || null };
    } catch (error) {
      console.error('[ChatBotHandler] Error:', error);
      return { text: `Sorry, I encountered an error: ${error.message}` };
    }
  }
}

module.exports = ChatBotHandler;
