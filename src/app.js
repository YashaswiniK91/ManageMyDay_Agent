require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const authRoutes = require('./routes/auth');
const chatbotRoutes = require('./routes/chatbot');
const calendarRoutes = require('./routes/calendar');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Routes
app.use('/auth', authRoutes);
app.use('/chatbot', chatbotRoutes);
app.use('/calendar', calendarRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'AgenticAI Bot is running' });
});

// Home endpoint with setup instructions
app.get('/', (req, res) => {
  res.json({
    status: 'running',
    name: 'AgenticAI Chatbot POC',
    version: '1.0.0',
    description: 'Agentic AI with Google Workspace Integration',
    endpoints: {
      health: '/health',
      auth: {
        initiate: '/auth/init',
        callback: '/auth/callback',
      },
      chatbot: {
        message: 'POST /chatbot/message',
      },
      calendar: {
        today: 'GET /calendar/today',
        upcoming: 'GET /calendar/upcoming',
        byDate: 'GET /calendar/date?date=YYYY-MM-DD',
      },
    },
    setup: 'See README.md for setup instructions',
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║  AgenticAI Chatbot POC Started         ║
║  🤖 Server running on port ${PORT}        ║
║  📍 http://localhost:${PORT}              ║
╚════════════════════════════════════════╝
  `);
  console.log('📚 API Documentation: http://localhost:3000');
  console.log('🔐 Start authentication: http://localhost:3000/auth/init');
});

module.exports = app;
