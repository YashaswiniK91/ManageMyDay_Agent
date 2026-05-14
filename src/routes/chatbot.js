const express = require('express');
const router = express.Router();
const TokenStorage = require('../../utils/TokenStorage');
const ChatBotHandler = require('../../handlers/ChatBotHandler');
const CalendarService = require('../../services/CalendarService');

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
    // Initialize chatbot handler
    const chatBot = new ChatBotHandler(req.authToken);
    
    // Initialize services
    const calendarService = new CalendarService(req.authToken);
    chatBot.registerService('calendar', calendarService);
    // TODO: Register Gmail and Drive services
    
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
 * Google Chat webhook endpoint (for real integration)
 * POST /chatbot/webhook
 * This would receive messages directly from Google Chat API
 */
router.post('/webhook', authenticateUser, async (req, res) => {
  try {
    const message = req.body;

    // Verify webhook signature (TODO: implement in production)
    
    // For now, extract user ID from message
    const userId = message.user?.email?.split('@')[0] || 'default-user';
    req.userId = userId;

    // Process the message
    const chatBot = new ChatBotHandler(req.authToken);
    const calendarService = new CalendarService(req.authToken);
    chatBot.registerService('calendar', calendarService);

    const response = await chatBot.handleMessage(message);

    // Send response back to Google Chat
    res.json({
      text: response.text,
      thread_reply: response.threadReply,
    });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({
      error: 'Webhook processing failed',
      message: error.message,
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
