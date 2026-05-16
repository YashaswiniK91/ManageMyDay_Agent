require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const authRoutes = require('./routes/auth');
const chatbotRoutes = require('./routes/chatbot');
const calendarRoutes = require('./routes/calendar');
const gmailRoutes = require('./routes/gmail');
const driveRoutes = require('./routes/drive');

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
app.use('/gmail', gmailRoutes);
app.use('/drive', driveRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'AgenticAI Bot is running' });
});

// Home endpoint with setup instructions
app.get('/', (req, res) => {
  res.json({
    status: 'running',
    name: 'ManageMyDay Agent - AgenticAI Chatbot',
    version: '1.0.0',
    description: 'Agentic AI with Google Workspace Integration',
    endpoints: {
      health: '/health',
      auth: {
        initiate: '/auth/init',
        callback: '/auth/callback',
      },
      calendar: {
        today: 'GET /calendar/today',
        upcoming: 'GET /calendar/upcoming',
        byDate: 'GET /calendar/date?date=YYYY-MM-DD',
        byRange: 'GET /calendar/range?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD',
        create: 'POST /calendar/create',
        update: 'PUT /calendar/update/:eventId',
        delete: 'DELETE /calendar/delete/:eventId',
      },
      gmail: {
        unread: 'GET /gmail/unread',
        latest: 'GET /gmail/latest',
        from: 'GET /gmail/from?senderEmail=email@gmail.com',
        subject: 'GET /gmail/subject?subject=Meeting',
        count: 'GET /gmail/count',
        send: 'POST /gmail/send',
        draft: 'POST /gmail/draft',
        delete: 'DELETE /gmail/delete/:messageId',
        markread: 'PUT /gmail/markread/:messageId',
      },
      drive: {
        recent: 'GET /drive/recent',
        search: 'GET /drive/search?query=report',
        folder: 'GET /drive/folder?folderName=Documents',
        count: 'GET /drive/count',
        createFolder: 'POST /drive/folder/create',
        upload: 'POST /drive/upload',
        delete: 'DELETE /drive/delete/:fileId',
        share: 'POST /drive/share',
      },
      chatbot: {
        message: 'POST /chatbot/message',
        webhook: 'POST /chatbot/webhook',
        webhookConfig: 'GET /chatbot/webhook-config',
        health: 'GET /chatbot/health',
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
