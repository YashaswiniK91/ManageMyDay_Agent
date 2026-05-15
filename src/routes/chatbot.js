const express = require('express');
const router = express.Router();
const crypto = require('crypto');
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
 * Middleware to verify Google Chat webhook signature
 * Ensures request came from Google Chat API
 */
const verifyGoogleChatSignature = (req, res, next) => {
  // For development, skip signature verification
  // In production, implement proper verification
  if (process.env.NODE_ENV === 'production') {
    const signature = req.headers['x-goog-chat-request-token'];
    if (!signature) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing Google Chat request token',
      });
    }
  }
  next();
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
 * Parse Google Chat message format
 */
const parseGoogleChatMessage = (googleChatEvent) => {
  const message = {
    text: googleChatEvent.message?.text || '',
    userId: googleChatEvent.user?.email?.split('@')[0] || 'google-chat-user',
    userEmail: googleChatEvent.user?.email || 'unknown@google.com',
    userName: googleChatEvent.user?.displayName || 'Unknown User',
    threadId: googleChatEvent.message?.thread?.name || null,
    spaceId: googleChatEvent.space?.name || null,
    rawEvent: googleChatEvent,
  };
  return message;
};

/**
 * Format response as Google Chat text message
 */
const formatGoogleChatResponse = (botResponse) => {
  return {
    text: botResponse,
  };
};

/**
 * Format response as Google Chat card (rich formatting)
 */
const formatGoogleChatCard = (title, content, actionText = null) => {
  const card = {
    sections: [
      {
        header: title,
        widgets: [
          {
            textParagraph: {
              text: content,
            },
          },
        ],
      },
    ],
  };

  if (actionText) {
    card.sections[0].widgets.push({
      buttons: [
        {
          textButton: {
            text: actionText,
            onClick: {
              action: {
                actionMethodName: 'actionMethodName',
              },
            },
          },
        },
      ],
    });
  }

  return {
    cardsV2: [
      {
        cardId: 'chatbot-response-' + Date.now(),
        card: card,
      },
    ],
  };
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
 * Google Chat Webhook Endpoint
 * POST /chatbot/webhook
 * Receives messages directly from Google Chat
 * 
 * To set up:
 * 1. In Google Chat, create a webhook
 * 2. Set webhook URL to: https://your-domain.com/chatbot/webhook
 * 3. This endpoint will receive all messages in that space
 */
router.post('/webhook', verifyGoogleChatSignature, async (req, res) => {
  try {
    // Parse Google Chat event
    const googleChatEvent = req.body;
    
    // Ignore message edits and other non-message events
    if (googleChatEvent.type === 'MESSAGE' && googleChatEvent.message?.text) {
      const message = parseGoogleChatMessage(googleChatEvent);
      
      console.log(`📨 Google Chat Message from ${message.userName}: ${message.text}`);

      // Get or create token for this user
      let authToken = await tokenStorage.getToken(message.userId);
      
      if (!authToken) {
        // If no token, inform user they need to authenticate
        return res.json({
          text: `Hello ${message.userName}! 👋\n\nTo use ManageMyDay Agent, please authenticate first:\n\n1. Visit: http://localhost:3000/auth/init\n2. Complete the OAuth flow\n3. Your token will be saved\n\nAfter that, you can use all features!`,
        });
      }

      // Initialize chatbot with services for this user
      const chatBot = initializeChatBot(authToken);

      // Process the message
      const response = await chatBot.handleMessage(message);

      // Send response back to Google Chat
      return res.json(formatGoogleChatResponse(response.text));
    }

    // Handle other event types (optional)
    if (googleChatEvent.type === 'ADDED_TO_SPACE') {
      return res.json({
        text: `👋 Thanks for adding ManageMyDay Agent!\n\nI can help with:\n• 📅 Calendar (schedule, create events)\n• ✉️ Gmail (read, send emails)\n• 📁 Drive (files, folders)\n\nType "help" to see all commands!`,
      });
    }

    // Default response
    res.json({ text: '✅ Webhook received' });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({
      text: `❌ Error: ${error.message}`,
    });
  }
});

/**
 * Webhook Configuration Endpoint
 * GET /chatbot/webhook-config
 * Returns configuration for setting up Google Chat webhook
 */
router.get('/webhook-config', (req, res) => {
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  const host = process.env.WEBHOOK_HOST || 'localhost:3000';
  const webhookUrl = `${protocol}://${host}/chatbot/webhook`;

  res.json({
    status: 'success',
    webhookUrl: webhookUrl,
    instructions: [
      '1. Go to Google Chat and create a new space or select existing one',
      '2. Click Settings > Apps & integrations',
      '3. Click "Create new bot"',
      '4. Name: ManageMyDay Agent',
      '5. Avatar: (upload image)',
      '6. Go to Management > Webhook URLs',
      `7. Add webhook URL: ${webhookUrl}`,
      '8. Save and test!'
    ],
    features: [
      '📅 Calendar management',
      '✉️ Email handling',
      '📁 Drive operations',
      '🤖 Natural language processing'
    ]
  });
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
