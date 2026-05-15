const express = require('express');
const router = express.Router();
const TokenStorage = require('../../utils/TokenStorage');
const ChatBotHandler = require('../../handlers/ChatBotHandler');
const CalendarService = require('../../services/CalendarService');
const GmailService = require('../../services/GmailService');
const DriveService = require('../../services/DriveService');

const tokenStorage = new TokenStorage('memory');

/**
 * Middleware to get user token and authenticate
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
 * Initialize chatbot with all services
 */
const initializeChatBot = (authToken) => {
  const chatBot = new ChatBotHandler(authToken);
  
  try {
    const calendarService = new CalendarService(authToken);
    chatBot.registerService('calendar', calendarService);
  } catch (error) {
    console.error('Error initializing Calendar Service:', error);
  }

  try {
    const gmailService = new GmailService(authToken);
    chatBot.registerService('gmail', gmailService);
  } catch (error) {
    console.error('Error initializing Gmail Service:', error);
  }

  try {
    const driveService = new DriveService(authToken);
    chatBot.registerService('drive', driveService);
  } catch (error) {
    console.error('Error initializing Drive Service:', error);
  }

  return chatBot;
};

/**
 * Handle incoming Google Chat message
 * POST /chatbot/message
 * Body: { text: "What's my schedule today?", userId: "user-id" }
 */
router.post('/message', authenticateUser, async (req, res) => {
  const { text } = req.body;

  if (!text) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Message text is required',
    });
  }

  try {
    // Initialize chatbot with all services
    const chatBot = initializeChatBot(req.authToken);
    
    // Process message
    const message = { text, thread: req.body.thread };
    const response = await chatBot.handleMessage(message);

    res.json({
      status: 'success',
      userId: req.userId,
      userMessage: text,
      botResponse: response.text,
      thread: response.threadReply,
    });
  } catch (error) {
    console.error('Error processing chatbot message:', error);
    res.status(500).json({
      error: 'Message processing failed',
      message: error.message,
      userMessage: text,
    });
  }
});

/**
 * Health check for chatbot
 * GET /chatbot/health
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'ChatBot Handler',
    message: 'Chatbot is operational',
  });
});

module.exports = router;
