# AgenticAI Chatbot POC

A proof-of-concept agentic AI chatbot with integration to Google Workspace (Calendar, Gmail, Drive) and Google Chat.

## Overview

This project demonstrates how to build a chatbot that:
- ✅ Integrates with Google Calendar to fetch events
- ✅ Integrates with Gmail (read/send flows)
- ✅ Integrates with Google Drive operations
- ✅ Responds to messages in Google Chat
- ✅ Uses natural language processing to understand user queries
- ✅ Supports multi-user authentication via OAuth 2.0

## Architecture

```
User (Google Chat)
    ↓
Google Chat API (webhook)
    ↓
Express Server (Node.js)
    ├─ Auth Handler (OAuth 2.0)
    ├─ Chatbot Handler (Intent Detection)
    └─ Services (Calendar, Gmail, Drive APIs)
```

## Prerequisites

Before you start, ensure you have:

- **Node.js** (v14 or higher) - [Download](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Google Cloud Account** - [Sign up](https://cloud.google.com/)
- **Git** (optional, for version control)

## Setup Instructions

### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project: Click the project dropdown → "New Project"
3. Enter project name: `AgenticAI-Chatbot`
4. Wait for the project to be created

### Step 2: Enable Required APIs

In your Google Cloud Project:

1. **Enable Calendar API**:
   - Go to "APIs & Services" → "Library"
   - Search for "Google Calendar API"
   - Click "Enable"

2. **Enable Gmail API**:
   - Search for "Gmail API"
   - Click "Enable"

3. **Enable Drive API**:
   - Search for "Google Drive API"
   - Click "Enable"

4. **Enable Chat API**:
   - Search for "Google Chat API"
   - Click "Enable"

### Step 3: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth Client ID"
3. If prompted, configure the OAuth consent screen first:
   - Choose "External" for user type
   - Fill in app information:
     - App name: `AgenticAI Chatbot`
     - User support email: your email
     - Developer contact: your email
   - Add scopes: `calendar`, `gmail`, `drive`
4. For OAuth Client ID:
   - Application type: "Web application"
   - Name: `AgenticAI Client`
   - Authorized redirect URIs: `http://localhost:3000/auth/callback`
5. Click "Create"
6. Download the JSON credentials file

### Step 4: Set Up Local Environment

1. **Clone/Navigate to the project**:
   ```bash
   cd c:\Users\karti\OneDrive\Desktop\AgenticAI
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   - Copy `.env.example` to `.env`:
     ```bash
     cp .env.example .env
     ```
   - Place your downloaded credentials file as `credentials.json` in the project root
   - Update `.env` with your Google Cloud details:
     ```env
     PROJECT_ID=your-google-cloud-project-id
     CLIENT_ID=your-oauth-client-id
     CLIENT_SECRET=your-oauth-client-secret
     REDIRECT_URI=http://localhost:3000/auth/callback
     PORT=3000
     NODE_ENV=development
     ```

### Step 5: Start the Server

```bash
npm install
npm start
```

You should see:
```
╔════════════════════════════════════════╗
║  AgenticAI Chatbot POC Started         ║
║  🤖 Server running on port 3000        ║
║  📍 http://localhost:3000              ║
╚════════════════════════════════════════╝
```

### Step 6: Authenticate the Bot

1. Open your browser and visit: `http://localhost:3000/auth/init`
2. You'll see a JSON response with an `authUrl`
3. Copy that URL and open it in your browser
4. Sign in with your Google account
5. Grant permissions when prompted
6. You'll be redirected back to the app with a success message

## API Endpoints

### Authentication

- **Initiate OAuth Flow**
  ```
  GET /auth/init
  ```
  Returns authorization URL for user to visit.

- **OAuth Callback**
  ```
  GET /auth/callback?code=...
  ```
  Handles OAuth callback from Google.

### Calendar

- **Get Today's Events**
  ```
  GET /calendar/today?userId=default-user
  ```
  Returns events scheduled for today.

- **Get Events by Date**
  ```
  GET /calendar/date?date=2024-05-15&userId=default-user
  ```
  Returns events for a specific date.

- **Get Upcoming Events**
  ```
  GET /calendar/upcoming?days=7&userId=default-user
  ```
  Returns events for the next N days.

- **Get Events in Date Range**
  ```
  GET /calendar/range?startDate=2024-05-15&endDate=2024-05-20&userId=default-user
  ```
  Returns events within a date range.

- **Create Event**
  ```
  POST /calendar/create
  Body: {
    "title": "Team Meeting",
    "startTime": "2024-05-15T10:00:00",
    "endTime": "2024-05-15T11:00:00",
    "description": "Discuss Q2 goals",
    "attendees": ["colleague@example.com"],
    "userId": "default-user"
  }
  ```

### Chatbot

- **Send Message**
  ```
  POST /chatbot/message
  Body: {
    "text": "What's my schedule for today?",
    "userId": "default-user"
  }
  ```
  Sends a message to the chatbot and gets a response.

- **Google Chat App Webhook**
  ```
  POST /chatbot/webhook
  ```
  Receives Google Chat app events and routes them to the same agentic logic.

- **Google Chat Webhook Config**
  ```
  GET /chatbot/webhook-config
  ```
  Returns the endpoint URL and setup checklist for Google Chat API configuration.

## Usage Examples

### Using Postman or cURL

1. **Initialize Auth**:
   ```bash
   curl http://localhost:3000/auth/init
   ```

2. **Get Today's Events**:
   ```bash
   curl "http://localhost:3000/calendar/today?userId=default-user"
   ```

3. **Send Chatbot Message**:
   ```bash
   curl -X POST http://localhost:3000/chatbot/message \
     -H "Content-Type: application/json" \
     -d '{
       "text": "What are my events today?",
       "userId": "default-user"
     }'
   ```

## Project Structure

```
AgenticAI/
├── src/
│   ├── app.js                 # Main Express app
│   └── routes/
│       ├── auth.js            # Authentication routes
│       ├── calendar.js        # Calendar API routes
│       └── chatbot.js         # Chatbot message handler
├── config/
│   └── auth.js                # OAuth 2.0 configuration
├── services/
│   └── CalendarService.js     # Google Calendar integration
├── handlers/
│   └── ChatBotHandler.js      # Chatbot logic and intent detection
├── utils/
│   └── TokenStorage.js        # Token storage utilities
├── package.json               # Dependencies
├── .env.example               # Environment variables template
├── .gitignore                 # Git ignore rules
└── README.md                  # This file
```

## Features

### Current Features (✅ Implemented)
- OAuth 2.0 authentication
- Google Calendar, Gmail, and Drive agent tools
- Google Chat app webhook integration
- Multi-user mapping using Google Chat user identity
- Agentic natural language responses

### Coming Soon
- Advanced NLP using Dialogflow or OpenAI
- Multi-user token management with Firestore
- Proactive notifications

## Troubleshooting

### Issue: "Credentials file not found"
**Solution**: Download your credentials.json from Google Cloud Console and place it in the project root.

### Issue: "Invalid credentials or authentication failed"
**Solution**: Ensure your CLIENT_ID and CLIENT_SECRET in .env match your Google Cloud project credentials.

### Issue: "Token expired"
**Solution**: Re-authenticate by visiting `/auth/init` again.

### Issue: Port 3000 already in use
**Solution**: Change the PORT in .env or kill the process using port 3000:
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:3000 | xargs kill -9
```

## Next Steps

1. **Test Calendar API**: Call `/calendar/today` endpoint
2. **Test Chatbot**: Send a message via `/chatbot/message`
3. **Implement Gmail Integration**: Create `GmailService.js` based on `CalendarService.js`
4. **Implement Drive Integration**: Create `DriveService.js`
5. **Deploy to Google Cloud**: Use Cloud Functions or App Engine
6. **Set up Google Chat Integration**: Configure webhook in Google Chat

## Advanced: Connecting to Google Chat

To make the bot available in Google Chat:

1. Go to [Google Chat API Console](https://console.cloud.google.com/)
2. Create a bot configuration
3. Set webhook URL to: `http://your-domain.com/chatbot/webhook`
4. Deploy your server with HTTPS (use ngrok for local testing):
   ```bash
   npm install -g ngrok
   ngrok http 3000
   ```
5. Use the ngrok URL as your webhook endpoint

## Security Considerations

⚠️ **This is a POC**. For production:

- Never commit `.env` or credentials files
- Use environment variables for all secrets
- Implement proper token encryption
- Use Firestore or similar for persistent storage
- Add request rate limiting
- Validate webhook signatures from Google Chat
- Use HTTPS everywhere
- Implement proper error handling and logging
- Add authentication to all endpoints

## Resources

- [Google Calendar API Docs](https://developers.google.com/calendar/api/guides/overview)
- [Gmail API Docs](https://developers.google.com/gmail/api/guides)
- [Google Drive API Docs](https://developers.google.com/drive/api/guides/about-sdk)
- [Google Chat API Docs](https://developers.google.com/chat/api/guides/message-formats)
- [OAuth 2.0 Guide](https://developers.google.com/identity/protocols/oauth2)

## License

ISC

## Support

For issues or questions, check the troubleshooting section or review the source code comments.

---

**Happy Coding! 🚀**
