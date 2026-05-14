const { google } = require('googleapis');
const { createAuthenticatedClient } = require('../config/auth');

/**
 * Google Drive Service
 * Handles Google Drive API interactions
 * 
 * TODO: Implement full Drive functionality
 */

class DriveService {
  constructor(authToken) {
    this.authToken = authToken;
    this.drive = null;
    this.initialize();
  }

  initialize() {
    if (!this.authToken) {
      throw new Error('Authorization token required for Drive Service');
    }

    const auth = createAuthenticatedClient(this.authToken);
    this.drive = google.drive({ version: 'v3', auth });
  }

  /**
   * Get recent files
   */
  async getRecentFiles(maxResults = 10) {
    try {
      const response = await this.drive.files.list({
        spaces: 'drive',
        fields: 'nextPageToken, files(id, name, mimeType, modifiedTime, webViewLink)',
        pageSize: maxResults,
        orderBy: 'modifiedTime desc',
      });

      return this._formatFiles(response.data.files || []);
    } catch (error) {
      console.error('Error fetching recent files:', error);
      throw error;
    }
  }

  /**
   * Search for files by name
   */
  async searchFiles(query, maxResults = 10) {
    try {
      const response = await this.drive.files.list({
        spaces: 'drive',
        fields: 'nextPageToken, files(id, name, mimeType, modifiedTime, webViewLink)',
        pageSize: maxResults,
        q: `name contains '${query}' and trashed=false`,
      });

      return this._formatFiles(response.data.files || []);
    } catch (error) {
      console.error(`Error searching for files with query "${query}":`, error);
      throw error;
    }
  }

  /**
   * Get files in a specific folder
   */
  async getFilesInFolder(folderName, maxResults = 10) {
    try {
      // First, find the folder
      const folderResponse = await this.drive.files.list({
        spaces: 'drive',
        fields: 'files(id, name)',
        pageSize: 1,
        q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      });

      const folders = folderResponse.data.files || [];
      if (folders.length === 0) {
        return [];
      }

      const folderId = folders[0].id;

      // Get files in the folder
      const filesResponse = await this.drive.files.list({
        spaces: 'drive',
        fields: 'nextPageToken, files(id, name, mimeType, modifiedTime, webViewLink)',
        pageSize: maxResults,
        q: `'${folderId}' in parents and trashed=false`,
      });

      return this._formatFiles(filesResponse.data.files || []);
    } catch (error) {
      console.error(`Error getting files in folder "${folderName}":`, error);
      throw error;
    }
  }

  /**
   * Get file count
   */
  async getFileCount() {
    try {
      const response = await this.drive.files.list({
        spaces: 'drive',
        fields: 'files(id)',
        q: 'trashed=false',
      });

      return response.data.files?.length || 0;
    } catch (error) {
      console.error('Error getting file count:', error);
      throw error;
    }
  }

  /**
   * Helper: Format files for display
   */
  _formatFiles(files) {
    if (!files || files.length === 0) {
      return [];
    }

    return files.map(file => ({
      id: file.id,
      name: file.name,
      type: this._getMimeTypeLabel(file.mimeType),
      modified: file.modifiedTime,
      link: file.webViewLink,
    }));
  }

  /**
   * Helper: Convert MIME type to readable label
   */
  _getMimeTypeLabel(mimeType) {
    const mimeLabels = {
      'application/vnd.google-apps.document': 'Google Doc',
      'application/vnd.google-apps.spreadsheet': 'Google Sheet',
      'application/vnd.google-apps.presentation': 'Google Slide',
      'application/vnd.google-apps.folder': 'Folder',
      'application/pdf': 'PDF',
      'text/plain': 'Text File',
      'image/jpeg': 'Image',
      'image/png': 'Image',
    };

    return mimeLabels[mimeType] || 'File';
  }

  /**
   * Parse natural language query and fetch files
   */
  async handleNaturalLanguageQuery(query) {
    const lowerQuery = query.toLowerCase();

    if (lowerQuery.includes('recent')) {
      return await this.getRecentFiles(10);
    }

    if (lowerQuery.includes('folder') || lowerQuery.includes('directory')) {
      // Extract folder name from query
      // TODO: Implement more sophisticated parsing
      const words = query.split(' ');
      const folderIndex = words.findIndex(w => 
        w.toLowerCase() === 'folder' || w.toLowerCase() === 'directory'
      );
      if (folderIndex > 0) {
        const folderName = words[folderIndex - 1];
        return await this.getFilesInFolder(folderName, 10);
      }
    }

    if (lowerQuery.includes('find') || lowerQuery.includes('search')) {
      // Extract search term
      // TODO: Implement more sophisticated parsing
      const match = query.match(/(?:find|search)\s+(.+?)(?:\s+in|$)/i);
      if (match) {
        return await this.searchFiles(match[1], 10);
      }
    }

    // Default: return recent files
    return await this.getRecentFiles(10);
  }
}

module.exports = DriveService;
