# AgenticAI Chatbot - Architecture & Flow Documentation

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          USER LAYER                              │
├─────────────────────────────────────────────────────────────────┤
│  • Google Chat Web App                                           │
│  • Google Chat Mobile App                                        │
│  • Custom Chat Interface                                         │
│  • API Client (Postman, cURL, etc.)                             │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    INTEGRATION LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│  Google Chat API  │  HTTPS Webhook  │  REST API Endpoints       │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                             │
│                    (Express.js Server)                           │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Routes & Controllers                                     │   │
│  │  • /auth/*          (OAuth 2.0 Flow)                     │   │
│  │  • /calendar/*      (Calendar Endpoints)                 │   │
│  │  • /chatbot/*       (Chat Message Handling)              │   │
│  │  • /gmail/*         (Gmail Endpoints - TODO)             │   │
│  │  • /drive/*         (Drive Endpoints - TODO)             │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Business Logic Layer                                     │   │
│  │  • ChatBotHandler    (Intent Detection & Routing)        │   │
│  │  • NLP Processing    (Understanding user queries)        │   │
│  │  • Service Manager   (Coordinating service calls)        │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Service Layer                                            │   │
│  │  • CalendarService   (Google Calendar API)               │   │
│  │  • GmailService      (Google Gmail API)                  │   │
│  │  • DriveService      (Google Drive API)                  │   │
│  │  • AuthService       (OAuth 2.0 Management)              │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Utilities                                                │   │
│  │  • TokenStorage      (In-memory or Firestore)            │   │
│  │  • ErrorHandling     (Logging & Exception Mgmt)          │   │
│  │  • Formatters        (Response Formatting)               │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
    ┌─────────┐     ┌─────────┐    ┌──────────┐
    │ Google  │     │ Google  │    │ Google   │
    │Calendar │     │ Gmail   │    │ Drive    │
    │ API     │     │ API     │    │ API      │
    └─────────┘     └─────────┘    └──────────┘
```

## Data Flow Diagram

### 1. User Query Flow

```
┌──────────────────────┐
│  User sends message  │
│  "Show my events"    │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ Google Chat / API receives message   │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ Express Server (Webhook Handler)     │
│ Route: /chatbot/message              │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ Authenticate User (OAuth Token)      │
│ Retrieve stored token from storage   │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ ChatBotHandler                       │
│ • Parse user query                   │
│ • Detect intent (calendar/gmail/etc) │
│ • Extract parameters (date, filters) │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ Route to Appropriate Service         │
│ (CalendarService, GmailService, etc) │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ Call Google API with User Token      │
│ • Apply filters and parameters       │
│ • Handle rate limits                 │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ Format Response                      │
│ • Parse API response                 │
│ • Create human-readable text         │
│ • Add metadata (dates, times, etc)   │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ Send Response                        │
│ • Send to Google Chat                │
│ • Display in chat thread             │
└──────────────────────────────────────┘
```

### 2. OAuth Authentication Flow

```
┌─────────────────────────────────────────────────────────────┐
│ User visits: http://localhost:3000/auth/init               │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
        ┌───────────────────────┐
        │ /auth/init endpoint   │
        │ Generates OAuth URL   │
        └────────┬──────────────┘
                 │
                 ▼
    ┌────────────────────────────────┐
    │ Google OAuth Consent Screen    │
    │ User logs in & grants access   │
    └────────┬───────────────────────┘
             │
             ▼ (with authorization code)
    ┌────────────────────────────────┐
    │ Redirect to callback endpoint  │
    │ /auth/callback?code=...        │
    └────────┬───────────────────────┘
             │
             ▼
    ┌────────────────────────────────┐
    │ Exchange code for tokens       │
    │ • Access token (expires)       │
    │ • Refresh token (long-lived)   │
    └────────┬───────────────────────┘
             │
             ▼
    ┌────────────────────────────────┐
    │ Store tokens securely          │
    │ In-memory (POC) or DB (prod)   │
    └────────┬───────────────────────┘
             │
             ▼
    ┌────────────────────────────────┐
    │ Return success response        │
    │ User is now authenticated      │
    └────────────────────────────────┘
```

## Component Interactions

### CalendarService Example

```
User Query: "What are my events today?"
                    │
                    ▼
         ChatBotHandler.detectIntent()
         Intent Type: "calendar"
                    │
                    ▼
         ChatBotHandler.handleCalendarQuery()
                    │
                    ▼
         CalendarService.handleNaturalLanguageQuery()
         Pattern: "today" found
                    │
                    ▼
         CalendarService.getTodayEvents()
         │
         ├─ Get current date
         ├─ Calculate start/end of day
         ├─ Call: calendar.events.list({
         │    timeMin: startOfDay,
         │    timeMax: endOfDay,
         │    singleEvents: true,
         │    orderBy: 'startTime'
         │  })
         │
         └─ Return formatted events
                    │
                    ▼
         ChatBotHandler.formatCalendarResponse()
         Creates readable output
                    │
                    ▼
    "📅 Your Events
     1. Team Meeting
        📍 Conference Room A
        🕐 2024-05-15 10:00 AM
     2. Lunch"
```

## Request/Response Examples

### Example 1: Get Today's Calendar Events

**Request:**
```bash
GET /calendar/today?userId=default-user
```

**Response:**
```json
{
  "status": "success",
  "userId": "default-user",
  "date": "2024-05-15",
  "eventCount": 3,
  "events": [
    {
      "id": "event1",
      "title": "Team Standup",
      "description": "Daily sync",
      "start": "2024-05-15T09:00:00-07:00",
      "end": "2024-05-15T09:30:00-07:00",
      "location": "Zoom",
      "organizer": "manager@company.com",
      "attendees": ["team@company.com"]
    },
    {
      "id": "event2",
      "title": "Client Call",
      "description": "",
      "start": "2024-05-15T14:00:00-07:00",
      "end": "2024-05-15T15:00:00-07:00",
      "location": "Virtual",
      "organizer": "client@external.com",
      "attendees": []
    }
  ]
}
```

### Example 2: Chat Message

**Request:**
```bash
POST /chatbot/message
Content-Type: application/json

{
  "text": "What's my schedule for tomorrow?",
  "userId": "default-user"
}
```

**Response:**
```json
{
  "status": "success",
  "userId": "default-user",
  "userMessage": "What's my schedule for tomorrow?",
  "botResponse": "📅 Your Events for May 16, 2024\n\n1. Product Review\n   📍 Board Room\n   🕐 10:00 AM - 11:30 AM\n\n2. Team Retrospective\n   📍 Zoom\n   🕐 2:00 PM - 3:00 PM",
  "thread": null
}
```

## Intent Detection Logic

```
User Input: "Show my schedule"
            │
            ├─ Contains "calendar"? ──────→ CALENDAR intent
            ├─ Contains "schedule"? ──────→ CALENDAR intent
            ├─ Contains "event"? ─────────→ CALENDAR intent
            ├─ Contains "meeting"? ───────→ CALENDAR intent
            ├─ Contains "email"? ────────→ GMAIL intent
            ├─ Contains "mail"? ────────→ GMAIL intent
            ├─ Contains "file"? ───────→ DRIVE intent
            ├─ Contains "document"? ───→ DRIVE intent
            ├─ Contains "help"? ────────→ HELP intent
            │
            └─ No match ───────────────→ UNKNOWN intent
                                        (Ask for clarification)
```

## Error Handling Flow

```
Try to fetch calendar events
    │
    ├─ Success
    │  └─ Return formatted data
    │
    └─ Failure
       │
       ├─ 401 Unauthorized
       │  └─ Token expired/invalid
       │     └─ Return: "Re-authenticate required"
       │
       ├─ 403 Forbidden
       │  └─ Insufficient permissions
       │     └─ Return: "Permission denied"
       │
       ├─ 404 Not Found
       │  └─ No events found
       │     └─ Return: "No events found"
       │
       ├─ 429 Too Many Requests
       │  └─ Rate limit exceeded
       │     └─ Return: "Too many requests, try again later"
       │
       └─ 5xx Server Error
          └─ Google API error
             └─ Return: "Service error, try again"
```

## Multi-User Token Management

```
User A                          User B
  │                               │
  ├─ OAuth Login                  ├─ OAuth Login
  │ /auth/init                    │ /auth/init
  │                               │
  ├─ Receives Token A             ├─ Receives Token B
  │ userId: "user-a"              │ userId: "user-b"
  │                               │
  ├─ TokenStorage.saveToken()     ├─ TokenStorage.saveToken()
  │ tokens["user-a"] = {          │ tokens["user-b"] = {
  │   access_token: "...",        │   access_token: "...",
  │   refresh_token: "...",       │   refresh_token: "...",
  │   expiry_date: ...            │   expiry_date: ...
  │ }                             │ }
  │                               │
  └─ /calendar/today?userId=...──┐ └─ /calendar/today?userId=...──┐
    Retrieves Token A             │   Retrieves Token B             │
    Loads User A's calendar       │   Loads User B's calendar       │
```

## Next Steps: Enhancements

### Phase 2: Advanced NLP
- Implement Dialogflow integration for better intent detection
- Add entity extraction (dates, people, locations)
- Support for complex queries

### Phase 3: Production Deployment
- Deploy to Google Cloud Run or App Engine
- Set up Firestore for persistent token storage
- Implement proper logging and monitoring
- Add rate limiting and caching

### Phase 4: Google Chat Native Integration
- Create proper Google Chat bot configuration
- Support rich message formatting (cards, buttons)
- Add threading support for conversations

### Phase 5: Additional Services
- Gmail full integration
- Google Drive search and sharing
- Google Photos integration
- Calendar event creation/modification

---

For more information, see README.md and QUICKSTART.md
