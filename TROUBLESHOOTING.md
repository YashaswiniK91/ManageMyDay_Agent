# Troubleshooting & FAQ

## Quick Help

### Installation Issues

**Q: npm install fails**
```
Error: npm ERR! code ERESOLVE
```

**Solution:**
```bash
# Use legacy peer deps flag
npm install --legacy-peer-deps

# Or update npm
npm install -g npm@latest
npm install
```

---

**Q: Node.js not found**
```
'node' is not recognized as an internal or external command
```

**Solution:**
- Download and install Node.js from https://nodejs.org/
- Restart your terminal/command prompt
- Verify: `node --version`

---

### Server Issues

**Q: Port 3000 already in use**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution:**

Windows:
```powershell
# Find process using port 3000
netstat -ano | findstr :3000

# Kill the process (replace PID with the number found)
taskkill /PID <PID> /F

# Or change the port
# Edit .env: PORT=3001
npm start
```

macOS/Linux:
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or change the port
PORT=3001 npm start
```

---

**Q: Server starts but crashes immediately**
```
Error: Cannot find module '@google-cloud/...'
```

**Solution:**
```bash
# Make sure all dependencies are installed
npm install

# Check package.json for missing dependencies
npm list

# Install specific missing package
npm install @google-cloud/secret-manager
```

---

### OAuth & Authentication Issues

**Q: "Credentials file not found at config/../credentials.json"**

**Solution:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Go to "Credentials" → "OAuth 2.0 Client IDs"
3. Click on your OAuth client
4. Click "Download JSON"
5. Save file as `credentials.json` in project root

Example file structure:
```
AgenticAI/
├── src/
├── config/
├── credentials.json    ← Put it here
├── package.json
└── ...
```

---

**Q: "Invalid OAuth credentials" or "Token retrieval failed"**

**Solution:**
1. Verify CLIENT_ID in .env matches credentials.json
2. Verify CLIENT_SECRET matches
3. Verify REDIRECT_URI is correct: `http://localhost:3000/auth/callback`
4. Delete token.json if it exists (old token)
5. Try OAuth flow again: `/auth/init`

---

**Q: Authorization URL doesn't work**
```
"Google hasn't verified this app"
```

**Solution:**
This is normal for development. Click "Advanced" → "Go to (unsafe)"

For production:
1. Apply for verification in Google Cloud Console
2. Or add your email to test users in OAuth consent screen

---

**Q: "No token found after authorization"**

**Solution:**
1. Check that you visited the full OAuth URL and authorized
2. Check that you were redirected to `http://localhost:3000/auth/callback?code=...`
3. Check browser console for errors
4. Check server console for detailed error messages

---

### Calendar API Issues

**Q: "No events found" when querying calendar**

**Solution:**
1. Verify you've authorized the app (visited `/auth/init`)
2. Verify you have events on your calendar
3. Check the date format (should be YYYY-MM-DD)
4. Try different date: `/calendar/date?date=2024-05-15`

---

**Q: "Permission denied" or "403 Forbidden"**

**Solution:**
1. Make sure Calendar API is enabled in Google Cloud Console
2. Make sure OAuth scope includes calendar permissions
3. Re-authenticate: delete token.json and visit `/auth/init` again
4. Check that "Read-only" permission is granted

---

**Q: Events show but with wrong timezone**

**Solution:**
The API returns events in their original timezone. To fix display:

1. Check your system timezone
2. In CalendarService.js, update the timezone:
```javascript
timeZone: 'America/New_York' // Change to your timezone
// Or detect automatically:
timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
```

---

### Chatbot Issues

**Q: Chatbot doesn't understand my query**

**Solution:**
This POC uses simple keyword matching. Try:
- "What are my events today?"
- "Show my schedule"
- "Calendar events for tomorrow"

For advanced NLP, implement Dialogflow (see ARCHITECTURE.md)

---

**Q: Bot returns "No events found" but I have events**

**Solution:**
1. The date parsing might be wrong
2. Try `/calendar/today` endpoint directly instead
3. Check the date range you're querying
4. Verify events are in the calendar (not archived)

---

**Q: Chatbot message returns empty response**

**Solution:**
1. Verify you've authenticated (token exists)
2. Check that CalendarService is registered
3. Check server logs for errors
4. Try test endpoint: `curl http://localhost:3000/health`

---

### API Endpoint Issues

**Q: "Unauthorized - No valid token found"**
```json
{
  "error": "Unauthorized",
  "message": "No valid token found. Please authenticate first."
}
```

**Solution:**
1. Visit `/auth/init` to start OAuth flow
2. Complete the authorization
3. Try API again with your userId

---

**Q: 404 Not Found**
```json
{
  "error": "Not Found",
  "message": "Route /calendar/xyz not found"
}
```

**Solution:**
Check that you're using the correct endpoint. Valid endpoints:
- `/calendar/today`
- `/calendar/upcoming`
- `/calendar/date`
- `/calendar/range`
- `/calendar/create`

---

**Q: "Bad Request - Date parameter is required"**

**Solution:**
Add date parameter: `/calendar/date?date=2024-05-15&userId=default-user`

Format: YYYY-MM-DD

---

### Testing Issues

**Q: test.js doesn't run**
```
'node' is not recognized
```

**Solution:**
```bash
# Make sure Node.js is installed
node test.js

# Or run with npm
npm test
```

---

**Q: Tests show "Error: connect ECONNREFUSED"**

**Solution:**
The server isn't running. In another terminal:
```bash
npm start
```

Then run tests in a separate terminal.

---

### Google Cloud Console Issues

**Q: Can't find "Enable APIs" button**

**Solution:**
1. Go to https://console.cloud.google.com/
2. Select your project (top left)
3. Click "APIs & Services"
4. Click "Library"
5. Search for "Google Calendar API"
6. Click "Enable"

---

**Q: "This project has no credentials"**

**Solution:**
1. Click "Create Credentials"
2. Choose "OAuth Client ID"
3. Choose "Web application"
4. Add redirect URI: `http://localhost:3000/auth/callback`
5. Click "Create"
6. Download the JSON file

---

**Q: OAuth consent screen shows errors**

**Solution:**
1. Go to "APIs & Services" → "OAuth consent screen"
2. Fill in:
   - App name: "AgenticAI Chatbot"
   - User support email: your email
   - Developer contact info: your email
3. Click "Save and Continue"
4. Add scopes (Calendar, Gmail, Drive)
5. Add test users if not production

---

### Environment & Configuration Issues

**Q: .env variables not loading**

**Solution:**
1. Make sure .env file is in project root:
   ```
   AgenticAI/.env
   ```
2. Make sure it's not .env.txt (check file extension)
3. Make sure format is correct:
   ```env
   KEY=value
   # Not: KEY: value
   # Not: KEY = value
   ```
4. Restart server after editing .env

---

**Q: Different behavior in dev vs prod**

**Solution:**
Check NODE_ENV:
```bash
# Dev mode
NODE_ENV=development npm start

# Prod mode
NODE_ENV=production npm start
```

---

### Windows-Specific Issues

**Q: Long path errors or path not found**

**Solution:**
```powershell
# Enable long paths
New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force

# Then restart PowerShell
```

---

**Q: PowerShell execution policy error**

**Solution:**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

---

### macOS/Linux-Specific Issues

**Q: Permission denied on npm commands**

**Solution:**
```bash
# Install Node.js via nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18

# Or use sudo (not recommended)
sudo npm install -g npm
```

---

### Performance Issues

**Q: Server is slow or hanging**

**Solution:**
1. Check if you're hitting API rate limits
2. Try smaller date ranges
3. Check network connection
4. Check Google API quotas in Cloud Console

---

**Q: Memory usage keeps increasing**

**Solution:**
In production, use Firestore instead of in-memory storage.

For development:
```bash
# Monitor memory
node --max-old-space-size=4096 src/app.js
```

---

## Getting Help

### Check These First
1. **README.md** - Comprehensive setup guide
2. **QUICKSTART.md** - 5-minute quick start
3. **ARCHITECTURE.md** - How the system works
4. **This file** - Troubleshooting guide

### Debug Workflow
1. Check error message carefully
2. Search this file for the error
3. Check Google Cloud Console for API errors
4. Check server console logs (bottom of terminal)
5. Check browser console for client-side errors

### Enable Debug Logging
```javascript
// In src/app.js
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});
```

Then restart server and check terminal output.

### Common Error Messages

| Error | Cause | Fix |
|-------|-------|-----|
| EADDRINUSE | Port already in use | Change port in .env |
| ENOTFOUND | Domain not found | Check URL format |
| EACCES | Permission denied | Check file permissions |
| ERESOLVE | Dependency conflict | npm install --legacy-peer-deps |
| ENOENT | File not found | Check file path |
| 401 Unauthorized | No valid token | Run /auth/init |
| 403 Forbidden | Permission denied | Check API permissions |
| 404 Not Found | Wrong endpoint | Check URL |
| 429 Too Many Requests | Rate limited | Wait and retry |
| 500 Server Error | Internal error | Check server logs |

---

## Still Having Issues?

### Check the Following

1. **Node.js version**
   ```bash
   node --version  # Should be v14+
   ```

2. **npm version**
   ```bash
   npm --version   # Should be v6+
   ```

3. **Dependencies installed**
   ```bash
   npm list        # Should show all packages
   ```

4. **Server running**
   ```bash
   curl http://localhost:3000/health
   ```

5. **Google Cloud project configured**
   - APIs enabled
   - Credentials created
   - OAuth consent screen set up

### Next Steps

- Review ARCHITECTURE.md for system design
- Read test.js for example API calls
- Check Google API documentation for specific service issues
- Enable debug logging (see above)

---

## FAQ - Frequently Asked Questions

**Q: Is this production-ready?**
A: No, this is a POC. See DEPLOYMENT.md for production setup.

**Q: Can I run this on Google Cloud?**
A: Yes, see DEPLOYMENT.md for Cloud Run instructions.

**Q: Will this work on AWS/Azure?**
A: Yes, it's just a Node.js app. Any Node.js host works.

**Q: How many users can this support?**
A: Unlimited. Each user gets their own token and API quota.

**Q: Is data encrypted?**
A: OAuth tokens are encrypted in transit. For at-rest encryption, use Firestore.

**Q: Can I extend this?**
A: Yes! The code is modular. Add new services in `services/` folder.

**Q: How do I add more Google APIs?**
A: Follow the CalendarService pattern and create a new service file.

**Q: Can I use this offline?**
A: No, Google APIs require internet connection.

**Q: How do I contribute?**
A: Make improvements and document them in comments.

---

*For more help, check the documentation files or Google's API documentation.*
