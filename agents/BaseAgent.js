/**
 * BaseAgent
 *
 * Implements the ReAct (Reason + Act) agentic loop on top of Google Gemini.
 *
 * Flow:
 *   1. Receive user message (with conversation history)
 *   2. Send to Gemini with registered tool declarations
 *   3. If Gemini responds with a functionCall → execute tool → feed result back as functionResponse
 *   4. Repeat step 2-3 until Gemini produces a plain text response (final answer)
 *   5. Return final answer + updated conversation history
 *
 * Subclasses register their own tool declarations and executors.
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

const MAX_TOOL_ROUNDS = 10; // Prevent infinite loops

class BaseAgent {
  /**
   * @param {object} options
   * @param {string} options.name          - Human-readable agent name (for logging)
   * @param {string} options.systemPrompt  - System instruction for this agent
   * @param {string} [options.model]       - Gemini model name (default: gemini-1.5-flash)
   */
  constructor({ name, systemPrompt, model = 'gemini-1.5-flash' }) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        'GEMINI_API_KEY environment variable is not set. ' +
          'Get a free key at https://aistudio.google.com/app/apikey'
      );
    }

    this.name = name;
    this.systemPrompt = systemPrompt;
    this.model = model;

    this._genAI = new GoogleGenerativeAI(apiKey);

    // Tool declarations (Gemini FunctionDeclaration format) registered by subclasses
    this._toolDeclarations = [];

    // Tool executors: map of toolName → async (args) => result
    this._toolExecutors = new Map();
  }

  // ─── Registration ─────────────────────────────────────────────────────────

  /**
   * Register tool declarations (Gemini FunctionDeclaration schema) and their executor.
   * @param {Array}  declarations  - Array of Gemini FunctionDeclaration objects
   * @param {object} executor      - Object with canHandle(name) and execute(name, args) methods
   */
  registerTools(declarations, executor) {
    this._toolDeclarations.push(...declarations);
    for (const decl of declarations) {
      this._toolExecutors.set(decl.name, executor);
    }
  }

  // ─── Core Agent Loop ──────────────────────────────────────────────────────

  /**
   * Run the agent on a user message.
   *
   * @param {string} userMessage       - The user's natural-language request
   * @param {Array}  [history=[]]      - Previous conversation turns [{role, parts}]
   * @returns {{ response: string, history: Array }}
   */
  async run(userMessage, history = []) {
    const generativeModel = this._genAI.getGenerativeModel({
      model: this.model,
      systemInstruction: this.systemPrompt,
      tools:
        this._toolDeclarations.length > 0
          ? [{ functionDeclarations: this._toolDeclarations }]
          : undefined,
    });

    // Build conversation history plus current user turn
    const contents = [
      ...history,
      { role: 'user', parts: [{ text: userMessage }] },
    ];

    let rounds = 0;

    while (rounds < MAX_TOOL_ROUNDS) {
      rounds++;

      let result;
      try {
        result = await generativeModel.generateContent({ contents });
      } catch (err) {
        console.error(`[${this.name}] Gemini API error:`, err.message);
        throw err;
      }

      const candidate = result.response.candidates?.[0];
      if (!candidate) {
        throw new Error('Gemini returned no candidates');
      }

      const responseParts = candidate.content.parts;

      // Check if Gemini wants to call a tool
      const functionCallPart = responseParts.find(p => p.functionCall);

      if (!functionCallPart) {
        // ── Final text response ──────────────────────────────────────────
        const textPart = responseParts.find(p => p.text);
        const finalText = textPart?.text || 'Done.';

        // Append assistant turn + user turn to history
        const updatedHistory = [
          ...contents,
          { role: 'model', parts: responseParts },
        ];

        return { response: finalText, history: updatedHistory };
      }

      // ── Execute tool call ────────────────────────────────────────────────
      const { name: toolName, args } = functionCallPart.functionCall;
      console.log(`[${this.name}] Tool call → ${toolName}`, args);

      let toolResult;
      try {
        const executor = this._toolExecutors.get(toolName);
        if (!executor) {
          throw new Error(`No executor registered for tool: ${toolName}`);
        }
        toolResult = await executor.execute(toolName, args);
      } catch (toolErr) {
        console.error(`[${this.name}] Tool execution error (${toolName}):`, toolErr.message);
        toolResult = { error: toolErr.message };
      }

      console.log(`[${this.name}] Tool result ←`, JSON.stringify(toolResult).slice(0, 200));

      // Append model's function-call turn and the tool response to contents
      contents.push({ role: 'model', parts: responseParts });
      contents.push({
        role: 'user',
        parts: [
          {
            functionResponse: {
              name: toolName,
              response: { result: toolResult },
            },
          },
        ],
      });
    }

    throw new Error(`[${this.name}] Exceeded maximum tool-call rounds (${MAX_TOOL_ROUNDS})`);
  }

  // ─── Utility ──────────────────────────────────────────────────────────────

  /** Returns a new empty conversation history array */
  newHistory() {
    return [];
  }
}

module.exports = BaseAgent;
