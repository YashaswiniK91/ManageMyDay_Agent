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

  /**
   * Create a new folder in Drive
   */
  async createFolder(folderName, parentFolderId = null) {
    try {
      const fileMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
      };

      if (parentFolderId) {
        fileMetadata.parents = [parentFolderId];
      }

      const response = await this.drive.files.create({
        resource: fileMetadata,
        fields: 'id, name, webViewLink',
      });

      return {
        success: true,
        message: `Folder "${folderName}" created successfully`,
        folderId: response.data.id,
        folder: response.data,
      };
    } catch (error) {
      console.error('Error creating folder:', error);
      throw error;
    }
  }

  /**
   * Upload a file to Drive
   */
  async uploadFile(filePath, fileName = null, parentFolderId = null) {
    try {
      const fs = require('fs');
      const path = require('path');

      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      const fileContent = fs.readFileSync(filePath);
      const fileNameToUse = fileName || path.basename(filePath);

      const fileMetadata = {
        name: fileNameToUse,
      };

      if (parentFolderId) {
        fileMetadata.parents = [parentFolderId];
      }

      const response = await this.drive.files.create({
        resource: fileMetadata,
        media: {
          body: fileContent,
        },
        fields: 'id, name, mimeType, webViewLink',
      });

      return {
        success: true,
        message: `File "${fileNameToUse}" uploaded successfully`,
        fileId: response.data.id,
        file: response.data,
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  /**
   * Delete a file or folder
   */
  async deleteFile(fileId) {
    try {
      await this.drive.files.delete({
        fileId: fileId,
      });

      return {
        success: true,
        message: `File/folder deleted successfully`,
        fileId: fileId,
      };
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }

  /**
   * Share a file with others
   */
  async shareFile(fileId, emailAddresses, role = 'reader') {
    try {
      const permissions = [];

      for (const email of emailAddresses) {
        const response = await this.drive.permissions.create({
          fileId: fileId,
          requestBody: {
            role: role, // 'reader', 'commenter', 'writer', 'organizer'
            type: 'user',
            emailAddress: email,
          },
        });
        permissions.push(response.data);
      }

      return {
        success: true,
        message: `File shared with ${emailAddresses.length} user(s)`,
        fileId: fileId,
        permissions: permissions,
      };
    } catch (error) {
      console.error('Error sharing file:', error);
      throw error;
    }
  }
}

module.exports = DriveService;
