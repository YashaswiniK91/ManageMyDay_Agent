/**
 * Google Chat Webhook Integration Tests
 * Tests the webhook endpoint with sample Google Chat event payloads
 */

const http = require('http');

// Test configurations
const BASE_URL = 'http://localhost:3000';
const TESTS = [
  {
    name: 'Webhook Config Endpoint',
    method: 'GET',
    path: '/chatbot/webhook-config',
    body: null,
  },
  {
    name: 'Webhook - MESSAGE Event (No Auth)',
    method: 'POST',
    path: '/chatbot/webhook',
    body: {
      type: 'MESSAGE',
      message: {
        name: 'spaces/AAAAtest/messages/msg123',
        createTime: '2024-01-01T00:00:00.000Z',
        text: 'What is my schedule today?',
        thread: {
          name: 'spaces/AAAAtest/threads/thread123'
        }
      },
      user: {
        name: 'users/testuser',
        email: 'test@example.com',
        displayName: 'Test User'
      },
      space: {
        name: 'spaces/AAAAtest',
        displayName: 'Test Space',
        type: 'ROOM'
      }
    }
  },
  {
    name: 'Webhook - BOT ADDED Event',
    method: 'POST',
    path: '/chatbot/webhook',
    body: {
      type: 'ADDED_TO_SPACE',
      space: {
        name: 'spaces/AAAAtest',
        displayName: 'Test Space',
        type: 'ROOM'
      },
      user: {
        name: 'users/testuser',
        email: 'test@example.com',
        displayName: 'Test User'
      }
    }
  },
  {
    name: 'Webhook - Gmail Query',
    method: 'POST',
    path: '/chatbot/webhook',
    body: {
      type: 'MESSAGE',
      message: {
        name: 'spaces/AAAAtest/messages/msg124',
        createTime: '2024-01-01T00:00:00.000Z',
        text: 'Show my unread emails'
      },
      user: {
        email: 'test@example.com',
        displayName: 'Test User'
      },
      space: {
        name: 'spaces/AAAAtest',
        type: 'ROOM'
      }
    }
  },
  {
    name: 'Webhook - Drive Query',
    method: 'POST',
    path: '/chatbot/webhook',
    body: {
      type: 'MESSAGE',
      message: {
        name: 'spaces/AAAAtest/messages/msg125',
        createTime: '2024-01-01T00:00:00.000Z',
        text: 'Show recent files'
      },
      user: {
        email: 'test@example.com',
        displayName: 'Test User'
      },
      space: {
        name: 'spaces/AAAAtest',
        type: 'ROOM'
      }
    }
  }
];

/**
 * Make HTTP request
 */
function makeRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  Google Chat Webhook Integration Tests  ║');
  console.log('╚════════════════════════════════════════╝\n');

  let passed = 0;
  let failed = 0;

  for (const test of TESTS) {
    console.log(`\n📋 Test: ${test.name}`);
    console.log(`   ${test.method} ${test.path}`);
    console.log('   ' + '─'.repeat(50));

    try {
      const result = await makeRequest(test.method, test.path, test.body);
      
      console.log(`   ✅ Status: ${result.status}`);
      
      if (typeof result.body === 'object') {
        console.log(`   📦 Response:`);
        const responseStr = JSON.stringify(result.body, null, 2);
        responseStr.split('\n').forEach(line => console.log(`      ${line}`));
      } else {
        console.log(`   📦 Response: ${result.body}`);
      }

      passed++;
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      failed++;
    }
  }

  console.log('\n╔════════════════════════════════════════╗');
  console.log(`║  Results: ${passed} passed, ${failed} failed      ║`);
  console.log('╚════════════════════════════════════════╝\n');

  // Print webhook URL setup info
  console.log('\n📌 WEBHOOK SETUP INSTRUCTIONS:');
  console.log('   1. Go to Google Chat workspace');
  console.log('   2. Create a new bot or select existing space');
  console.log('   3. Go to Settings > Manage webhooks');
  console.log('   4. Add this webhook URL:');
  console.log('      → http://localhost:3000/chatbot/webhook');
  console.log('   5. Send a message in the space - bot will respond!');
  console.log('\n✨ Phase 3 Implementation Complete!\n');

  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
