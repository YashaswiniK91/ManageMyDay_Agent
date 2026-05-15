const express = require('express');
const router = express.Router();
const TokenStorage = require('../../utils/TokenStorage');
const GmailService = require('../../services/GmailService');

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
 * Get unread emails
 * GET /gmail/unread?maxResults=5&userId=user-id
 */
router.get('/unread', authenticateUser, async (req, res) => {
  const maxResults = parseInt(req.query.maxResults) || 5;

  try {
    const gmailService = new GmailService(req.authToken);
    const emails = await gmailService.getUnreadEmails(maxResults);

    res.json({
      status: 'success',
      userId: req.userId,
      emailCount: emails.length,
      emails,
    });
  } catch (error) {
    console.error('Error fetching unread emails:', error);
    res.status(500).json({
      error: 'Failed to fetch emails',
      message: error.message,
    });
  }
});

/**
 * Get latest emails
 * GET /gmail/latest?maxResults=5&userId=user-id
 */
router.get('/latest', authenticateUser, async (req, res) => {
  const maxResults = parseInt(req.query.maxResults) || 5;

  try {
    const gmailService = new GmailService(req.authToken);
    const emails = await gmailService.getLatestEmails(maxResults);

    res.json({
      status: 'success',
      userId: req.userId,
      emailCount: emails.length,
      emails,
    });
  } catch (error) {
    console.error('Error fetching latest emails:', error);
    res.status(500).json({
      error: 'Failed to fetch emails',
      message: error.message,
    });
  }
});

/**
 * Get emails from a specific sender
 * GET /gmail/from?senderEmail=example@gmail.com&maxResults=5&userId=user-id
 */
router.get('/from', authenticateUser, async (req, res) => {
  const { senderEmail } = req.query;
  const maxResults = parseInt(req.query.maxResults) || 5;

  if (!senderEmail) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'senderEmail parameter is required',
    });
  }

  try {
    const gmailService = new GmailService(req.authToken);
    const emails = await gmailService.getEmailsFromSender(senderEmail, maxResults);

    res.json({
      status: 'success',
      userId: req.userId,
      senderEmail,
      emailCount: emails.length,
      emails,
    });
  } catch (error) {
    console.error(`Error fetching emails from ${senderEmail}:`, error);
    res.status(500).json({
      error: 'Failed to fetch emails',
      message: error.message,
    });
  }
});

/**
 * Get emails by subject
 * GET /gmail/subject?subject=Meeting&maxResults=5&userId=user-id
 */
router.get('/subject', authenticateUser, async (req, res) => {
  const { subject } = req.query;
  const maxResults = parseInt(req.query.maxResults) || 5;

  if (!subject) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'subject parameter is required',
    });
  }

  try {
    const gmailService = new GmailService(req.authToken);
    const emails = await gmailService.getEmailsBySubject(subject, maxResults);

    res.json({
      status: 'success',
      userId: req.userId,
      subject,
      emailCount: emails.length,
      emails,
    });
  } catch (error) {
    console.error(`Error fetching emails with subject "${subject}":`, error);
    res.status(500).json({
      error: 'Failed to fetch emails',
      message: error.message,
    });
  }
});

/**
 * Get email count
 * GET /gmail/count?userId=user-id
 */
router.get('/count', authenticateUser, async (req, res) => {
  try {
    const gmailService = new GmailService(req.authToken);
    const count = await gmailService.getEmailCount();

    res.json({
      status: 'success',
      userId: req.userId,
      count,
    });
  } catch (error) {
    console.error('Error getting email count:', error);
    res.status(500).json({
      error: 'Failed to get email count',
      message: error.message,
    });
  }
});

/**
 * Send an email
 * POST /gmail/send
 * Body: { to, subject, body, cc, bcc, userId }
 */
router.post('/send', authenticateUser, async (req, res) => {
  const { to, subject, body, cc, bcc } = req.body;

  if (!to || !subject || !body) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'to, subject, and body are required',
    });
  }

  try {
    const gmailService = new GmailService(req.authToken);
    const result = await gmailService.sendEmail({
      to,
      subject,
      body,
      cc,
      bcc,
    });

    res.json({
      status: 'success',
      userId: req.userId,
      result,
    });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({
      error: 'Failed to send email',
      message: error.message,
    });
  }
});

/**
 * Draft an email
 * POST /gmail/draft
 * Body: { to, subject, body, cc, bcc, userId }
 */
router.post('/draft', authenticateUser, async (req, res) => {
  const { to, subject, body, cc, bcc } = req.body;

  if (!to || !subject || !body) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'to, subject, and body are required',
    });
  }

  try {
    const gmailService = new GmailService(req.authToken);
    const result = await gmailService.draftEmail({
      to,
      subject,
      body,
      cc,
      bcc,
    });

    res.json({
      status: 'success',
      userId: req.userId,
      result,
    });
  } catch (error) {
    console.error('Error drafting email:', error);
    res.status(500).json({
      error: 'Failed to draft email',
      message: error.message,
    });
  }
});

/**
 * Delete an email
 * DELETE /gmail/delete/:messageId
 */
router.delete('/delete/:messageId', authenticateUser, async (req, res) => {
  const { messageId } = req.params;

  if (!messageId) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'messageId is required',
    });
  }

  try {
    const gmailService = new GmailService(req.authToken);
    const result = await gmailService.deleteEmail(messageId);

    res.json({
      status: 'success',
      userId: req.userId,
      result,
    });
  } catch (error) {
    console.error(`Error deleting email ${messageId}:`, error);
    res.status(500).json({
      error: 'Failed to delete email',
      message: error.message,
    });
  }
});

/**
 * Mark email as read
 * PUT /gmail/markread/:messageId
 */
router.put('/markread/:messageId', authenticateUser, async (req, res) => {
  const { messageId } = req.params;

  if (!messageId) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'messageId is required',
    });
  }

  try {
    const gmailService = new GmailService(req.authToken);
    const result = await gmailService.markAsRead(messageId);

    res.json({
      status: 'success',
      userId: req.userId,
      result,
    });
  } catch (error) {
    console.error(`Error marking email ${messageId} as read:`, error);
    res.status(500).json({
      error: 'Failed to mark email as read',
      message: error.message,
    });
  }
});

module.exports = router;
