/**
 * Drive Tools
 * Defines Gemini function declarations and execution logic for Google Drive operations.
 */

const DriveService = require('../services/DriveService');

// ─── Gemini Function Declarations ────────────────────────────────────────────

const DRIVE_TOOL_DECLARATIONS = [
  {
    name: 'get_recent_files',
    description: "Get the user's recently modified files from Google Drive. Use this when the user asks about recent documents, files, or Drive activity.",
    parameters: {
      type: 'object',
      properties: {
        maxResults: {
          type: 'number',
          description: 'Maximum number of files to return. Defaults to 10.',
        },
      },
      required: [],
    },
  },
  {
    name: 'search_files',
    description: "Search for files in Google Drive by name or keyword. Use this when the user asks to find or look up a specific document.",
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search keyword or file name fragment to look for.',
        },
        maxResults: {
          type: 'number',
          description: 'Maximum number of results to return. Defaults to 10.',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_files_in_folder',
    description: "Get files inside a specific Google Drive folder. Use this when the user mentions a folder name.",
    parameters: {
      type: 'object',
      properties: {
        folderName: {
          type: 'string',
          description: 'Name of the Google Drive folder.',
        },
        maxResults: {
          type: 'number',
          description: 'Maximum number of files to return. Defaults to 10.',
        },
      },
      required: ['folderName'],
    },
  },
  {
    name: 'get_drive_file_count',
    description: "Get a count/summary of files in the user's Google Drive.",
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'create_drive_folder',
    description: "Create a new folder in Google Drive. Use this when the user wants to organise files or create a project folder.",
    parameters: {
      type: 'object',
      properties: {
        folderName: {
          type: 'string',
          description: 'Name for the new folder.',
        },
        parentFolderName: {
          type: 'string',
          description: 'Optional parent folder name. Creates at root level if omitted.',
        },
      },
      required: ['folderName'],
    },
  },
  {
    name: 'share_drive_file',
    description: "Share a Google Drive file or folder with another user. Use this when the user says 'share X with Y'.",
    parameters: {
      type: 'object',
      properties: {
        fileId: {
          type: 'string',
          description: 'The Google Drive file or folder ID to share.',
        },
        email: {
          type: 'string',
          description: "Recipient's email address.",
        },
        role: {
          type: 'string',
          description: "Permission role: 'reader', 'commenter', or 'writer'. Defaults to 'reader'.",
        },
      },
      required: ['fileId', 'email'],
    },
  },
  {
    name: 'delete_drive_file',
    description: 'Delete (trash) a file from Google Drive by its file ID.',
    parameters: {
      type: 'object',
      properties: {
        fileId: {
          type: 'string',
          description: 'The Google Drive file ID to delete.',
        },
      },
      required: ['fileId'],
    },
  },
];

// ─── Tool Executor ────────────────────────────────────────────────────────────

class DriveToolExecutor {
  constructor(authToken) {
    this.service = new DriveService(authToken);
  }

  async execute(toolName, args) {
    switch (toolName) {
      case 'get_recent_files':
        return await this.service.getRecentFiles(args.maxResults || 10);

      case 'search_files':
        return await this.service.searchFiles(args.query, args.maxResults || 10);

      case 'get_files_in_folder':
        return await this.service.getFilesInFolder(args.folderName, args.maxResults || 10);

      case 'get_drive_file_count':
        return await this.service.getFileCount();

      case 'create_drive_folder': {
        const folderData = {
          name: args.folderName,
          parentFolderName: args.parentFolderName || null,
        };
        return await this.service.createFolder(folderData);
      }

      case 'share_drive_file':
        return await this.service.shareFile(args.fileId, args.email, args.role || 'reader');

      case 'delete_drive_file':
        return await this.service.deleteFile(args.fileId);

      default:
        throw new Error(`Unknown Drive tool: ${toolName}`);
    }
  }

  canHandle(toolName) {
    return DRIVE_TOOL_DECLARATIONS.some(t => t.name === toolName);
  }
}

module.exports = { DRIVE_TOOL_DECLARATIONS, DriveToolExecutor };
