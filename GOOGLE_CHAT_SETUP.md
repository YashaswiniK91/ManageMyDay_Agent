# Phase 3: Google Chat Webhook Integration

## Overview

ManageMyDay Agent can now be integrated as a Google Chat bot. Users can message the bot directly in Google Chat and it will:
- Fetch their calendar events
- Send and read emails
- Manage Drive files
- All via natural language commands

## Setup Instructions

### Step 1: Verify Your Webhook URL is Accessible

First, ensure your webhook endpoint is publicly accessible:

```bash
# Local development (skip this if not needed)
curl http://localhost:3000/chatbot/webhook-config
```

You should see:
```json
{
  "status": "success",
  "webhookUrl": "http://localhost:3000/chatbot/webhook",
  "instructions": [...]
}
```

### Step 2: Create a Google Chat Bot in GCP

1. **Open Google Cloud Console**
   - Go to: https://console.cloud.google.com
   - Select your ManageMyDay project

2. **Enable Google Chat API**
   - Go to APIs & Services → Library
   - Search for "Google Chat API"
   - Click "Enable"

3. **Create the Bot**
   - Go to APIs & Services → Credentials
   - Click "Create Credentials" → "Service Account"
   - Name: `managemyday-chat-bot`
   - Click "Create and Continue"
   - Grant role: `Editor` (or specific Chat roles)
   - Download the JSON key file
   - Save as `chat-bot-key.json` in project root

4. **Configure Bot Details**
   - Go to Google Chat API → Bots
   - Click "Create a bot"
   - Name: `ManageMyDay Agent`
   - Avatar URL: (optional)
   - Description: "Personal AI assistant for calendar, email, and drive management"

### Step 3: Set Up Webhook in Google Chat

1. **In Google Chat**, go to a space where you want to add the bot
   
2. **Click Settings** → **Apps & integrations** → **Create new bot**

3. **Fill in Bot Details**:
   - Name: `ManageMyDay Agent`
   - Avatar: (upload or use default)

4. **Get Webhook Configuration**
   - Visit: `http://localhost:3000/chatbot/webhook-config`
   - Copy the `webhookUrl` value

5. **Add Webhook URL**
   - In Google Chat, go to Management → Webhook URLs
   - Add your webhook URL:
     ```
     http://localhost:3000/chatbot/webhook
     ```
     (For production, use `https://your-domain.com/chatbot/webhook`)
   - Save

### Step 4: Configure Environment Variables

Update `.env` file:

```bash
# Existing variables
PROJECT_ID=managemyday
CLIENT_ID=your-client-id
CLIENT_SECRET=your-client-secret
...

# New: Webhook configuration
WEBHOOK_HOST=localhost:3000  # Change to your domain in production
NODE_ENV=development         # Set to 'production' for signature verification
CHAT_BOT_KEY_FILE=./chat-bot-key.json  # Path to service account JSON
```

### Step 5: Test the Bot in Google Chat

1. **Send a message in the space**:
   ```
   What's my schedule today?
   ```

2. **Expected Response**:
   ```
   📅 *Your Events*
   
   1. *Meeting Title*
      📍 Location
      🕐 Time
   ```

## Webhook Event Types

### Message Event
```json
{
  "type": "MESSAGE",
  "message": {
    "text": "What are my unread emails?",
    "thread": { "name": "thread-123" }
  },
  "user": {
    "email": "user@example.com",
    "displayName": "John Doe"
  },
  "space": {
    "name": "spaces/123456"
  }
}
```

### Bot Added Event
```json
{
  "type": "ADDED_TO_SPACE",
  "space": { "name": "spaces/123456" },
  "user": { "email": "user@example.com" }
}
```

## Supported Commands in Google Chat

### Calendar Commands
```
📅 Schedule Management:
- "What's my schedule today?"
- "Show my events for tomorrow"
- "What meetings do I have this week?"
- "Create event called Project Review tomorrow at 3 PM"
```

### Email Commands
```
✉️ Email Management:
- "Show unread emails"
- "Get emails from john@gmail.com"
- "Find emails about Budget Report"
- "Send email to jane@example.com with subject Meeting and body Let's discuss the project"
- "Draft email to team@example.com..."
```

### Drive Commands
```
📁 File Management:
- "Show recent files"
- "Find document called Report"
- "Files in Projects folder"
- "Create folder called Q2-Reports"
- "Share with john@example.com and jane@example.com"
```

## User Authentication Flow

When a user first messages the bot:

1. **Bot checks** if user has valid OAuth token
2. **If no token**:
   - Bot sends: "Please authenticate first at http://localhost:3000/auth/init"
   - User completes OAuth flow
   - Token is saved for their user ID
3. **If token exists**:
   - Bot processes the request immediately
   - User sees the result in Google Chat

## Production Deployment

For production deployment to Google Cloud Run:

### 1. Update Webhook URL

In Google Chat bot settings, change webhook URL from:
```
http://localhost:3000/chatbot/webhook
```

To your Cloud Run URL:
```
https://managemyday-chatbot-xxx-uc.a.run.app/chatbot/webhook
```

### 2. Enable Signature Verification

In `src/routes/chatbot.js`, implement full Google Chat signature verification:

```javascript
const verifyGoogleChatSignature = (req, res, next) => {
  const token = req.headers['x-goog-chat-request-token'];
  const requestUrl = req.originalUrl;
  
  // Verify token using Google's public key
  // Implementation details in Google Chat API docs
  
  next();
};
```

### 3. Update Environment Variables

```bash
NODE_ENV=production
WEBHOOK_HOST=managemyday-chatbot-xxx-uc.a.run.app
```

### 4. Deploy to Cloud Run

```bash
gcloud run deploy managemyday-chatbot \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "NODE_ENV=production,WEBHOOK_HOST=managemyday-chatbot-xxx-uc.a.run.app"
```

## API Endpoints

### Test Endpoints

#### 1. Webhook Configuration
```bash
GET /chatbot/webhook-config

Response:
{
  "status": "success",
  "webhookUrl": "http://localhost:3000/chatbot/webhook",
  "instructions": [...]
}
```

#### 2. Message Endpoint (REST API)
```bash
POST /chatbot/message
Body: {
  "text": "What's my schedule?",
  "userId": "user123"
}
```

#### 3. Google Chat Webhook
```bash
POST /chatbot/webhook
# Receives events from Google Chat API
```

#### 4. Health Check
```bash
GET /chatbot/health

Response:
{
  "status": "OK",
  "service": "ChatBot Handler",
  "message": "Chatbot is operational"
}
```

## Response Format

### Plain Text Response
```json
{
  "text": "📅 Your Events\n\n1. Meeting at 10 AM\n2. Team Standup at 2 PM"
}
```

### Card Response (Rich Formatting)
```json
{
  "cardsV2": [
    {
      "cardId": "event-123",
      "card": {
        "sections": [
          {
            "header": "📅 Your Events",
            "widgets": [
              {
                "textParagraph": {
                  "text": "1. Meeting\n2. Standup"
                }
              }
            ]
          }
        ]
      }
    }
  ]
}
```

## Troubleshooting

### Bot Not Responding

1. **Check webhook URL is accessible**
   ```bash
   curl http://localhost:3000/chatbot/webhook-config
   ```

2. **Check server logs**
   ```bash
   npm start
   ```

3. **Verify user authentication**
   - Visit: http://localhost:3000/auth/init
   - Complete OAuth flow

4. **Check Google Chat API is enabled**
   - Go to GCP Console → APIs & Services → Library
   - Search "Google Chat API"
   - Ensure it shows "Manage" (not "Enable")

### User Not Authenticated

If bot responds: "Please authenticate first..."

1. User visits: http://localhost:3000/auth/init
2. Completes the OAuth permission flow
3. Token is saved automatically
4. User can now message the bot

### Token Expired

If bot says "Token expired":

1. User needs to re-authenticate
2. Visit: http://localhost:3000/auth/init
3. Complete OAuth flow again

## Security Considerations

### Development (Current)
- Webhook signature verification: DISABLED
- Great for testing and development
- ⚠️ Not suitable for production

### Production (Required)
- Implement full Google Chat signature verification
- Validate `x-goog-chat-request-token` header
- Only accept requests from Google's servers
- Use HTTPS for all webhook URLs
- Store secrets in Secret Manager

## Next Steps

1. ✅ Complete local webhook setup
2. ✅ Test bot in Google Chat space
3. ✅ Deploy to Cloud Run
4. ⏳ Implement signature verification
5. ⏳ Add analytics and logging
6. ⏳ Enhance NLP with ML models

## Support & Documentation

- [Google Chat API Docs](https://developers.google.com/chat/api/guides/message-formats/basic)
- [Webhooks Documentation](https://developers.google.com/chat/api/guides/webhooks)
- [Bot Security](https://developers.google.com/chat/api/guides/auth)

---

**Phase 3 Status**: ✅ Complete

Ready to test the webhook integration!
