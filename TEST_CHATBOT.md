# ManageMyDay Agent - Chatbot Testing Guide

## Server Status
✅ Server running on: `http://localhost:3000`

## Quick Test - Chatbot Endpoint

The chatbot is available at: **`POST /chatbot/message`**

### Test Examples with cURL

#### 1. **Calendar - Read Today's Schedule**
```bash
curl -X POST http://localhost:3000/chatbot/message \
  -H "Content-Type: application/json" \
  -d '{
    "text": "What'\''s my schedule for today?",
    "userId": "default-user"
  }'
```

**Expected Response:**
```json
{
  "status": "success",
  "userId": "default-user",
  "userMessage": "What's my schedule for today?",
  "botResponse": "📅 *Your Events*\n\n1. *Meeting Title*\n   📍 Location\n   🕐 [time]\n\n"
}
```

---

#### 2. **Calendar - Create Event**
```bash
curl -X POST http://localhost:3000/chatbot/message \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Create event called Project Review tomorrow at 3 PM",
    "userId": "default-user"
  }'
```

**Expected Response:**
```json
{
  "status": "success",
  "userMessage": "Create event called Project Review tomorrow at 3 PM",
  "botResponse": "✅ Event \"Project Review\" created successfully!"
}
```

---

#### 3. **Gmail - Get Unread Emails**
```bash
curl -X POST http://localhost:3000/chatbot/message \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Show unread emails",
    "userId": "default-user"
  }'
```

**Expected Response:**
```json
{
  "status": "success",
  "userMessage": "Show unread emails",
  "botResponse": "✉️ *Your Emails*\n\n1. *From:* john@gmail.com\n   📋 *Subject:* Meeting Tomorrow\n   🕐 May 15, 2026\n   🔔 *UNREAD*\n\n"
}
```

---

#### 4. **Gmail - Send Email**
```bash
curl -X POST http://localhost:3000/chatbot/message \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Send email to john@gmail.com with subject Project Update and body Let'\''s discuss the progress",
    "userId": "default-user"
  }'
```

**Expected Response:**
```json
{
  "status": "success",
  "userMessage": "Send email to john@gmail.com with subject Project Update and body Let's discuss the progress",
  "botResponse": "✅ Email sent to john@gmail.com"
}
```

---

#### 5. **Gmail - Draft Email**
```bash
curl -X POST http://localhost:3000/chatbot/message \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Draft email to jane@gmail.com with subject Meeting Notes and body Please review the attached document",
    "userId": "default-user"
  }'
```

**Expected Response:**
```json
{
  "status": "success",
  "userMessage": "Draft email to jane@gmail.com...",
  "botResponse": "✅ Email drafted to jane@gmail.com"
}
```

---

#### 6. **Drive - Show Recent Files**
```bash
curl -X POST http://localhost:3000/chatbot/message \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Show my recent files",
    "userId": "default-user"
  }'
```

**Expected Response:**
```json
{
  "status": "success",
  "userMessage": "Show my recent files",
  "botResponse": "📁 *Your Files*\n\n1. 📄 *Report.pdf*\n   Type: PDF\n   Modified: 5/15/2026\n\n2. 📄 *Presentation.pptx*\n   Type: Google Slide\n   Modified: 5/14/2026\n\n"
}
```

---

#### 7. **Drive - Create Folder**
```bash
curl -X POST http://localhost:3000/chatbot/message \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Create folder called Q2-Reports",
    "userId": "default-user"
  }'
```

**Expected Response:**
```json
{
  "status": "success",
  "userMessage": "Create folder called Q2-Reports",
  "botResponse": "✅ Folder \"Q2-Reports\" created successfully!"
}
```

---

#### 8. **Help Command**
```bash
curl -X POST http://localhost:3000/chatbot/message \
  -H "Content-Type: application/json" \
  -d '{
    "text": "help",
    "userId": "default-user"
  }'
```

**Expected Response:**
```json
{
  "status": "success",
  "userMessage": "help",
  "botResponse": "🤖 *ManageMyDay Agent - Help Guide*\n\nI can help you with:\n\n📅 *CALENDAR COMMANDS*\n- Read: \"What's my schedule today?\" ...\n- Write: \"Create event called Project Review...\""
}
```

---

## Testing via Web Browser (Postman/Insomnia)

### Method: POST
### URL: `http://localhost:3000/chatbot/message`
### Headers:
```
Content-Type: application/json
```

### Request Body:
```json
{
  "text": "What's my schedule today?",
  "userId": "default-user"
}
```

---

## Intent Detection Examples

### Calendar Intents
- ✅ Read: "What's my schedule?", "Show events for tomorrow", "Do I have meetings this week?"
- ✅ Write: "Create event", "Schedule meeting", "Add reminder"

### Gmail Intents
- ✅ Read: "Show unread emails", "Get emails from john@gmail.com", "Find emails about Budget"
- ✅ Write: "Send email", "Draft message"

### Drive Intents
- ✅ Read: "Show recent files", "Find document Report", "Files in Projects folder"
- ✅ Write: "Create folder", "Share with user@gmail.com"

### Help
- ✅ "help", "what can you do?", "commands"

---

## Troubleshooting

### Issue: "No valid token found"
**Solution:** 
1. Go to `http://localhost:3000/auth/init`
2. Complete OAuth authentication
3. Token will be saved automatically

### Issue: "Service not available"
**Solution:** 
1. Make sure all API scopes are enabled in GCP
2. Verify credentials.json exists in project root
3. Check `.env` file has correct credentials

### Issue: "Authentication failed"
**Solution:**
1. Delete `token.json` file
2. Re-authenticate via `/auth/init`
3. Ensure you're using the same userId in requests

---

## Direct API Testing (Without Chatbot)

If you want to test individual services directly:

### Test Calendar API
```bash
curl http://localhost:3000/calendar/today
```

### Test Gmail API
```bash
curl http://localhost:3000/gmail/unread
```

### Test Drive API
```bash
curl http://localhost:3000/drive/recent
```

---

## Next Steps

Once testing is complete:

1. **Phase 3**: Google Chat Webhook Integration
2. **Phase 4**: Production Deployment to Cloud Run
3. **Phase 5**: Enhance NLP with better entity extraction
4. **Phase 6**: Add database persistence (Firestore)

---

## Notes

- All responses include status, userId, userMessage, and botResponse
- Error responses include error type and detailed message
- Chatbot is stateless (doesn't remember previous conversations)
- Each request needs a userId (defaults to 'default-user')
