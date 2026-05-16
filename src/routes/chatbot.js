const express = require('express');
const router = express.Router();
const TokenStorage = require('../../utils/TokenStorage');
const ChatBotHandler = require('../../handlers/ChatBotHandler');

const tokenStorage = new TokenStorage('memory');

const GOOGLE_CHAT_EVENT = {
  MESSAGE: 'MESSAGE',
  ADDED_TO_SPACE: 'ADDED_TO_SPACE',
  REMOVED_FROM_SPACE: 'REMOVED_FROM_SPACE',
  CARD_CLICKED: 'CARD_CLICKED',
};

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
  const expectedToken = process.env.GOOGLE_CHAT_VERIFICATION_TOKEN;

  // If no verification token is configured we allow the request for local development.
  if (!expectedToken) {
    return next();
  }

  const requestToken = req.headers['x-goog-chat-bot-token'];
  if (!requestToken || requestToken !== expectedToken) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid Google Chat verification token',
      });
  }

  next();
};

/**
 * Initialize chatbot with all services
 */
const initializeChatBot = (authToken, userId) => {
  return new ChatBotHandler(authToken, userId);
};

/**
 * Parse Google Chat message format
 */
const parseGoogleChatMessage = (googleChatEvent) => {
  const userEmail = googleChatEvent.user?.email || '';
  const messageText = googleChatEvent.message?.argumentText || googleChatEvent.message?.text || '';
  const cleanedText = messageText.replace(/<users\/[\w-]+>/g, '').trim();
  const derivedUserId = userEmail || googleChatEvent.user?.name || 'google-chat-user';

  const message = {
    text: cleanedText,
    userId: derivedUserId,
    userEmail: userEmail || 'unknown@google.com',
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

const getBaseUrl = () => {
  if (process.env.APP_BASE_URL) {
    return process.env.APP_BASE_URL.replace(/\/$/, '');
  }

  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  const host = process.env.WEBHOOK_HOST || 'localhost:3000';
  return `${protocol}://${host}`;
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
    const chatBot = new ChatBotHandler(req.authToken, req.userId);
    const message = { text, userId: req.userId, thread: req.body.thread };
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

    // Ignore messages sent by bots to prevent loops.
    if (googleChatEvent.message?.sender?.type === 'BOT') {
      return res.json({ text: '' });
    }
    
    // Ignore message edits and other non-message events
    if (
      googleChatEvent.type === GOOGLE_CHAT_EVENT.MESSAGE
      && (googleChatEvent.message?.text || googleChatEvent.message?.argumentText)
    ) {
      const message = parseGoogleChatMessage(googleChatEvent);
      
      console.log(`📨 Google Chat Message from ${message.userName}: ${message.text}`);

      // Get or create token for this user
      let authToken = await tokenStorage.getToken(message.userId);
      
      if (!authToken) {
        const authPath = `/auth/init?userId=${encodeURIComponent(message.userId)}`;
        const baseUrl = getBaseUrl();
        // If no token, inform user they need to authenticate
        return res.json({
          text: `Hello ${message.userName}!\n\nTo use ManageMyDay Agent, authenticate first:\n1. Open: ${baseUrl}${authPath}\n2. Complete Google OAuth\n3. Come back and send your request again`,
        });
      }

      // Initialize chatbot with services for this user
      const chatBot = initializeChatBot(authToken, message.userId);

      // Process the message
      const response = await chatBot.handleMessage(message);

      // Send response back to Google Chat
      return res.json(formatGoogleChatResponse(response.text));
    }

    // Handle other event types (optional)
    if (googleChatEvent.type === GOOGLE_CHAT_EVENT.ADDED_TO_SPACE) {
      const userId = googleChatEvent.user?.email || googleChatEvent.user?.name || 'google-chat-user';
      const authPath = `/auth/init?userId=${encodeURIComponent(userId)}`;
      const baseUrl = getBaseUrl();

      return res.json({
        text: `Thanks for adding ManageMyDay Agent.\n\nBefore first use, authenticate here:\n${baseUrl}${authPath}\n\nThen ask things like:\n- What's my schedule today?\n- Show unread emails\n- Find files named quarterly report`,
      });
    }

    if (googleChatEvent.type === GOOGLE_CHAT_EVENT.REMOVED_FROM_SPACE) {
      return res.json({ text: 'Goodbye from ManageMyDay Agent.' });
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
  const webhookUrl = `${getBaseUrl()}/chatbot/webhook`;

  res.json({
    status: 'success',
    webhookUrl: webhookUrl,
    instructions: [
      '1. Open Google Cloud Console > Google Chat API > Configuration',
      '2. Choose App URL',
      `3. Set endpoint URL: ${webhookUrl}`,
      '4. Add a verification token and set GOOGLE_CHAT_VERIFICATION_TOKEN in .env',
      '5. Publish app to your Workspace domain or test users',
      '6. Add the app in Google Chat and send a message'
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
