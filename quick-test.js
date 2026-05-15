/**
 * ManageMyDay Agent - Quick Test with Auth
 * Run: node quick-test.js
 */

const http = require('http');

function makeRequest(path, method = 'GET', payload = null) {
  return new Promise((resolve, reject) => {
    const isHttps = false;
    const hostname = 'localhost';
    const port = 3000;

    let data = null;
    let headers = {
      'Content-Type': 'application/json'
    };

    if (payload) {
      data = JSON.stringify(payload);
      headers['Content-Length'] = data.length;
    }

    const options = {
      hostname,
      port,
      path,
      method,
      headers
    };

    const req = http.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          resolve(JSON.parse(responseData));
        } catch (error) {
          resolve({ error: 'Parse error', rawData: responseData });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(data);
    }
    req.end();
  });
}

async function runQuickTest() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║        ManageMyDay Agent - Quick Test                  ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  // Test 1: Health check
  console.log('[1] Testing Server Health...');
  try {
    const health = await makeRequest('/health');
    console.log(`✅ Server is healthy: ${health.message}\n`);
  } catch (error) {
    console.log(`❌ Server is not running: ${error.message}\n`);
    process.exit(1);
  }

  // Test 2: API Endpoints
  console.log('[2] Testing Available Endpoints...');
  try {
    const endpoints = await makeRequest('/');
    console.log(`✅ Server Name: ${endpoints.name}`);
    console.log(`✅ Version: ${endpoints.version}`);
    console.log(`✅ Status: ${endpoints.status}\n`);
  } catch (error) {
    console.log(`❌ Failed to get endpoints: ${error.message}\n`);
  }

  // Test 3: Test help command (no auth needed)
  console.log('[3] Testing Chatbot Help Command (No Auth Required)...');
  try {
    const helpResponse = await makeRequest('/chatbot/message', 'POST', {
      text: 'help',
      userId: 'test-user'
    });

    if (helpResponse.error) {
      console.log(`⚠️  Response: ${helpResponse.error}`);
      if (helpResponse.message) {
        console.log(`   ${helpResponse.message}`);
      }
    } else {
      console.log(`✅ Help Command Works!`);
      console.log(`   Bot Response:\n${helpResponse.botResponse.substring(0, 150)}...\n`);
    }
  } catch (error) {
    console.log(`❌ Failed to test help: ${error.message}\n`);
  }

  // Authentication instructions
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║              AUTHENTICATION REQUIRED                   ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  console.log('To test all features, you need to authenticate:\n');
  console.log('1. Open: http://localhost:3000/auth/init');
  console.log('2. Click the authorization URL');
  console.log('3. Sign in with your Google account');
  console.log('4. Allow permissions for Calendar, Gmail, and Drive');
  console.log('5. You\'ll be redirected back with a token saved\n');

  console.log('After authentication, run: node test-chatbot.js\n');

  console.log('Quick Manual Test (after auth):');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\ncurl -X POST http://localhost:3000/chatbot/message \\');
  console.log('  -H "Content-Type: application/json" \\');
  console.log('  -d \'{"text": "What is my schedule today?", "userId": "default-user"}\'');
  console.log('\n');
}

runQuickTest().catch(console.error);
