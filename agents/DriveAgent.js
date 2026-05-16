/**
 * DriveAgent
 *
 * Specialised agent for all Google Drive operations.
 * Inherits the ReAct loop from BaseAgent and registers Drive tools.
 */

const BaseAgent = require('./BaseAgent');
const { DRIVE_TOOL_DECLARATIONS, DriveToolExecutor } = require('../tools/DriveTools');

const DRIVE_SYSTEM_PROMPT = `You are a helpful Google Drive assistant integrated into the ManageMyDay agent.
Your job is to help users find, organise, share, and manage files in Google Drive.

Today's date is ${new Date().toDateString()}.

Guidelines:
- When searching for files, show: name, type, last modified date, and a link if available.
- Before sharing or deleting a file, confirm the action with the user.
- For vague requests like "find my report", use search_files with the most likely keyword.
- If a folder doesn't exist when the user asks to list its contents, inform them clearly.
- Keep responses concise and clearly formatted.`;

class DriveAgent extends BaseAgent {
  /**
   * @param {object} authToken - OAuth token for the authenticated user
   */
  constructor(authToken) {
    super({
      name: 'DriveAgent',
      systemPrompt: DRIVE_SYSTEM_PROMPT,
    });

    const executor = new DriveToolExecutor(authToken);
    this.registerTools(DRIVE_TOOL_DECLARATIONS, executor);
  }
}

module.exports = DriveAgent;
