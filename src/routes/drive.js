const express = require('express');
const router = express.Router();
const TokenStorage = require('../../utils/TokenStorage');
const DriveService = require('../../services/DriveService');

const tokenStorage = new TokenStorage('memory');

/**
 * Middleware to authenticate user
 */
const authenticateUser = async (req, res, next) => {
  const userId = req.query.userId || req.body.userId || 'default-user';

  try {
    const token = await tokenStorage.getToken(userId);

    if (!token) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No valid token found. Please authenticate first.',
        authUrl: '/auth/init',
      });
    }

    req.authToken = token;
    req.userId = userId;
    next();
  } catch (error) {
    res.status(500).json({
      error: 'Authentication failed',
      message: error.message,
    });
  }
};

/**
 * Get recent files
 * GET /drive/recent?maxResults=10&userId=user-id
 */
router.get('/recent', authenticateUser, async (req, res) => {
  const maxResults = parseInt(req.query.maxResults) || 10;

  try {
    const driveService = new DriveService(req.authToken);
    const files = await driveService.getRecentFiles(maxResults);

    res.json({
      status: 'success',
      userId: req.userId,
      fileCount: files.length,
      files,
    });
  } catch (error) {
    console.error('Error fetching recent files:', error);
    res.status(500).json({
      error: 'Failed to fetch files',
      message: error.message,
    });
  }
});

/**
 * Search for files
 * GET /drive/search?query=report&maxResults=10&userId=user-id
 */
router.get('/search', authenticateUser, async (req, res) => {
  const { query } = req.query;
  const maxResults = parseInt(req.query.maxResults) || 10;

  if (!query) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'query parameter is required',
    });
  }

  try {
    const driveService = new DriveService(req.authToken);
    const files = await driveService.searchFiles(query, maxResults);

    res.json({
      status: 'success',
      userId: req.userId,
      query,
      fileCount: files.length,
      files,
    });
  } catch (error) {
    console.error(`Error searching for files with query "${query}":`, error);
    res.status(500).json({
      error: 'Failed to search files',
      message: error.message,
    });
  }
});

/**
 * Get files in a folder
 * GET /drive/folder?folderName=Documents&maxResults=10&userId=user-id
 */
router.get('/folder', authenticateUser, async (req, res) => {
  const { folderName } = req.query;
  const maxResults = parseInt(req.query.maxResults) || 10;

  if (!folderName) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'folderName parameter is required',
    });
  }

  try {
    const driveService = new DriveService(req.authToken);
    const files = await driveService.getFilesInFolder(folderName, maxResults);

    res.json({
      status: 'success',
      userId: req.userId,
      folderName,
      fileCount: files.length,
      files,
    });
  } catch (error) {
    console.error(`Error getting files in folder "${folderName}":`, error);
    res.status(500).json({
      error: 'Failed to get files from folder',
      message: error.message,
    });
  }
});

/**
 * Get file count
 * GET /drive/count?userId=user-id
 */
router.get('/count', authenticateUser, async (req, res) => {
  try {
    const driveService = new DriveService(req.authToken);
    const count = await driveService.getFileCount();

    res.json({
      status: 'success',
      userId: req.userId,
      fileCount: count,
    });
  } catch (error) {
    console.error('Error getting file count:', error);
    res.status(500).json({
      error: 'Failed to get file count',
      message: error.message,
    });
  }
});

/**
 * Create a new folder
 * POST /drive/folder/create
 * Body: { folderName, parentFolderId, userId }
 */
router.post('/folder/create', authenticateUser, async (req, res) => {
  const { folderName, parentFolderId } = req.body;

  if (!folderName) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'folderName is required',
    });
  }

  try {
    const driveService = new DriveService(req.authToken);
    const result = await driveService.createFolder(folderName, parentFolderId);

    res.json({
      status: 'success',
      userId: req.userId,
      result,
    });
  } catch (error) {
    console.error(`Error creating folder "${folderName}":`, error);
    res.status(500).json({
      error: 'Failed to create folder',
      message: error.message,
    });
  }
});

/**
 * Upload a file
 * POST /drive/upload
 * Body: { filePath, fileName, parentFolderId, userId }
 */
router.post('/upload', authenticateUser, async (req, res) => {
  const { filePath, fileName, parentFolderId } = req.body;

  if (!filePath) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'filePath is required',
    });
  }

  try {
    const driveService = new DriveService(req.authToken);
    const result = await driveService.uploadFile(filePath, fileName, parentFolderId);

    res.json({
      status: 'success',
      userId: req.userId,
      result,
    });
  } catch (error) {
    console.error(`Error uploading file:`, error);
    res.status(500).json({
      error: 'Failed to upload file',
      message: error.message,
    });
  }
});

/**
 * Delete a file or folder
 * DELETE /drive/delete/:fileId
 */
router.delete('/delete/:fileId', authenticateUser, async (req, res) => {
  const { fileId } = req.params;

  if (!fileId) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'fileId is required',
    });
  }

  try {
    const driveService = new DriveService(req.authToken);
    const result = await driveService.deleteFile(fileId);

    res.json({
      status: 'success',
      userId: req.userId,
      result,
    });
  } catch (error) {
    console.error(`Error deleting file ${fileId}:`, error);
    res.status(500).json({
      error: 'Failed to delete file',
      message: error.message,
    });
  }
});

/**
 * Share a file
 * POST /drive/share
 * Body: { fileId, emailAddresses, role, userId }
 * role can be: reader, commenter, writer, organizer
 */
router.post('/share', authenticateUser, async (req, res) => {
  const { fileId, emailAddresses, role = 'reader' } = req.body;

  if (!fileId || !emailAddresses || emailAddresses.length === 0) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'fileId and emailAddresses are required',
    });
  }

  try {
    const driveService = new DriveService(req.authToken);
    const result = await driveService.shareFile(fileId, emailAddresses, role);

    res.json({
      status: 'success',
      userId: req.userId,
      result,
    });
  } catch (error) {
    console.error('Error sharing file:', error);
    res.status(500).json({
      error: 'Failed to share file',
      message: error.message,
    });
  }
});

module.exports = router;
