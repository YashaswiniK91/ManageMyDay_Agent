# Quick Start Guide - AgenticAI Chatbot POC

## 5-Minute Setup

### Prerequisites
- Node.js v14+ installed
- Google account

### Steps

#### 1. Install Dependencies (1 min)
```bash
cd c:\Users\karti\OneDrive\Desktop\AgenticAI
npm install
```

#### 2. Create Google Cloud Project (2 min)
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project: `AgenticAI-Chatbot`
3. Enable APIs:
   - Google Calendar API
   - Gmail API
   - Google Drive API
   - Google Chat API

#### 3. Create OAuth Credentials (1 min)
1. Go to "Credentials" → "Create Credentials" → "OAuth Client ID"
2. Configure consent screen (if needed)
3. Application type: "Web application"
4. Add redirect URI: `http://localhost:3000/auth/callback`
5. Download JSON credentials → save as `credentials.json` in project root

#### 4. Configure Environment (1 min)
Update `.env` with your credentials:
```env
PROJECT_ID=your-project-id
CLIENT_ID=from-credentials.json
CLIENT_SECRET=from-credentials.json
```

#### 5. Start Server
```bash
npm start
```

Visit: http://localhost:3000

---

## Testing the Bot

### Test 1: Initialize Authentication
```bash
curl http://localhost:3000/auth/init
```
Copy the `authUrl` and open it in your browser to authorize.

### Test 2: Get Today's Events
```bash
curl "http://localhost:3000/calendar/today?userId=default-user"
```

### Test 3: Chat with Bot
```bash
curl -X POST http://localhost:3000/chatbot/message \
  -H "Content-Type: application/json" \
  -d '{"text": "What are my events today?", "userId": "default-user"}'
```

---

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| "Credentials file not found" | Download credentials.json from Google Cloud Console |
| Port 3000 already in use | Change PORT in .env or kill process on port 3000 |
| "Invalid credentials" | Verify CLIENT_ID and CLIENT_SECRET match your project |
| Token expired | Re-authenticate via `/auth/init` |

---

## Next: Expand the Bot

- [ ] Add Gmail integration (see `services/GmailService.js`)
- [ ] Add Drive integration (see `services/DriveService.js`)
- [ ] Deploy to Google Cloud
- [ ] Connect to Google Chat
- [ ] Add Dialogflow for advanced NLP

---

**For detailed setup, see README.md**
