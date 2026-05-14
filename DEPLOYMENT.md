# Deployment & Production Guide

## Local Development vs Production

### Development (Current Setup)
- ✅ Local Express server on port 3000
- ✅ In-memory token storage
- ✅ OAuth callback to localhost
- ✅ No HTTPS required
- ✅ Easy debugging with console logs

### Production
- ⚠️ Serverless deployment (Google Cloud Run)
- ⚠️ Persistent storage (Firestore, Cloud SQL)
- ⚠️ HTTPS required
- ⚠️ Proper secrets management
- ⚠️ Monitoring and logging

---

## Deployment Steps

### Prerequisites
- Google Cloud Project with APIs enabled
- `gcloud` CLI installed
- Docker installed (for Cloud Run)

### Step 1: Create Dockerfile

Create `Dockerfile` in project root:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

### Step 2: Create Cloud Run Configuration

Create `.gcloudignore`:
```
node_modules/
.env
.env.local
.git
.gitignore
credentials.json (will use Secret Manager instead)
*.log
test.js
QUICKSTART.md
ARCHITECTURE.md
DEPLOYMENT.md
```

### Step 3: Deploy to Cloud Run

```bash
# Set your project
gcloud config set project YOUR-PROJECT-ID

# Build and deploy
gcloud run deploy agenticai-chatbot \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "PORT=3000"
```

### Step 4: Configure Secrets

Store sensitive data in Google Cloud Secret Manager:

```bash
# Create secrets
echo -n "your-client-id" | gcloud secrets create GOOGLE_CLIENT_ID --data-file=-
echo -n "your-client-secret" | gcloud secrets create GOOGLE_CLIENT_SECRET --data-file=-

# Grant access to Cloud Run service
gcloud run services update-iam-policy agenticai-chatbot \
  --add-iam-policy-binding \
  --member=serviceAccount:YOUR-SERVICE-ACCOUNT@appspot.gserviceaccount.com \
  --role=roles/secretmanager.secretAccessor
```

### Step 5: Update Environment Variables

Modify your Express app to load secrets from Secret Manager:

```javascript
// In src/app.js
const secretManager = require('@google-cloud/secret-manager');

async function loadSecrets() {
  const client = new secretManager.SecretManagerServiceClient();
  const PROJECT_ID = process.env.PROJECT_ID;

  const getSecret = async (name) => {
    const path = `projects/${PROJECT_ID}/secrets/${name}/versions/latest`;
    const [version] = await client.accessSecretVersion({ name: path });
    return version.payload.data.toString('utf-8');
  };

  return {
    clientId: await getSecret('GOOGLE_CLIENT_ID'),
    clientSecret: await getSecret('GOOGLE_CLIENT_SECRET'),
  };
}
```

---

## Production Configuration Changes

### 1. Token Storage: In-Memory → Firestore

**Update `utils/TokenStorage.js`:**

```javascript
const Firestore = require('@google-cloud/firestore');

class TokenStorage {
  constructor(storageType = 'firestore') {
    this.storageType = storageType;
    
    if (storageType === 'firestore') {
      this.db = new Firestore({
        projectId: process.env.PROJECT_ID,
      });
      this.collection = this.db.collection('user_tokens');
    }
  }

  async saveToken(userId, tokenData) {
    if (this.storageType === 'firestore') {
      await this.collection.doc(userId).set({
        ...tokenData,
        savedAt: new Date(),
      });
      return true;
    }
  }

  async getToken(userId) {
    if (this.storageType === 'firestore') {
      const doc = await this.collection.doc(userId).get();
      return doc.exists ? doc.data() : null;
    }
  }

  async deleteToken(userId) {
    if (this.storageType === 'firestore') {
      await this.collection.doc(userId).delete();
      return true;
    }
  }
}

module.exports = TokenStorage;
```

### 2. Environment-Specific Configuration

Create `config/environment.js`:

```javascript
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

module.exports = {
  isDevelopment,
  isProduction,
  
  storage: {
    type: isProduction ? 'firestore' : 'memory',
  },
  
  auth: {
    redirectUri: isProduction 
      ? process.env.PROD_REDIRECT_URI 
      : process.env.REDIRECT_URI,
  },
  
  logging: {
    level: isProduction ? 'info' : 'debug',
  },
  
  security: {
    https: isProduction,
    corsOrigins: isProduction 
      ? ['https://chat.google.com', process.env.PROD_DOMAIN]
      : ['http://localhost:3000', 'http://localhost:8080'],
  },
};
```

### 3. Add Logging & Monitoring

Install Cloud Logging:

```bash
npm install @google-cloud/logging
```

Update `src/app.js`:

```javascript
const logging = require('@google-cloud/logging');
const expressWinston = require('express-winston');
const winston = require('winston');

const loggingClient = new logging.Logging({
  projectId: process.env.PROJECT_ID,
});

app.use(expressWinston.logger({
  transports: isProduction 
    ? [loggingClient.express.makeMiddleware()]
    : [new winston.transports.Console()],
}));
```

### 4. Add Rate Limiting

```bash
npm install express-rate-limit
```

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use(limiter);
```

### 5. Add CORS Security

```javascript
const cors = require('cors');

const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
```

---

## Production Checklist

- [ ] Environment variables configured in Cloud Run
- [ ] Secrets stored in Secret Manager
- [ ] Token storage using Firestore
- [ ] HTTPS enabled (automatic with Cloud Run)
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Logging configured
- [ ] Error handling and monitoring set up
- [ ] OAuth redirect URIs updated to production domain
- [ ] Firestore database created and indexed
- [ ] Service account created with proper permissions
- [ ] API quotas set in Google Cloud Console
- [ ] Monitoring alerts configured
- [ ] Regular backups enabled
- [ ] CI/CD pipeline set up (Cloud Build)

---

## Google Chat Integration for Production

### 1. Create Chat Bot in Google Cloud Console

```bash
# Register bot endpoint
gcloud chat bots create \
  --display-name="AgenticAI" \
  --api-endpoint="https://your-domain.com/chatbot/webhook"
```

### 2. Update Webhook Handler

The bot will now receive messages directly in the webhook:

```javascript
router.post('/webhook', authenticateWebhook, async (req, res) => {
  const message = req.body;
  
  // Extract user from message
  const userId = message.user.email;
  
  // Get user token
  const token = await tokenStorage.getToken(userId);
  
  if (!token) {
    return res.json({
      text: "Please authenticate first: /auth/init"
    });
  }
  
  // Process message
  const response = await chatBot.handleMessage(message);
  
  res.json(response);
});
```

### 3. Test in Google Chat

1. Open Google Chat
2. Start direct message with your bot
3. Send: "What's my schedule?"

---

## Monitoring & Troubleshooting

### View Logs

```bash
# Cloud Run logs
gcloud run logs read agenticai-chatbot --limit 50

# Stream logs
gcloud run logs read agenticai-chatbot --limit 50 --follow
```

### Check Service Status

```bash
gcloud run services describe agenticai-chatbot --region us-central1
```

### Debug API Calls

Enable detailed logging in services:

```javascript
// In CalendarService.js
if (process.env.DEBUG === 'true') {
  console.log('Calendar API call:', {
    method: 'events.list',
    params: { calendarId, timeMin, timeMax }
  });
}
```

---

## Scaling Considerations

- **Concurrent Users**: Cloud Run auto-scales based on requests
- **API Rate Limits**: Implement caching and queuing
- **Database**: Firestore scales automatically
- **Storage**: Use Cloud Storage for large files

---

## Cost Optimization

- Use Google Cloud Free Tier (up to 2 million requests/month)
- Enable Cloud Scheduler for cleanup tasks
- Set up budget alerts
- Use Cold Start optimization
- Implement result caching

---

## Disaster Recovery

- Regular Firestore backups
- Multi-region deployment
- Monitoring and alerting
- Runbook documentation

---

For more details, see:
- README.md - Local setup
- QUICKSTART.md - Quick start guide
- ARCHITECTURE.md - System architecture
