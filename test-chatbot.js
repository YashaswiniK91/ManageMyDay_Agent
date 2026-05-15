/**
 * ManageMyDay Agent - Chatbot Testing Script
 * Run: node test-chatbot.js
 */

const http = require('http');

// Test cases
const testCases = [
  {
    name: '📅 Calendar - What is my schedule today?',
    payload: {
      text: "What's my schedule today?",
      userId: 'default-user'
    }
  },
  {
    name: '📅 Calendar - Create event',
    payload: {
      text: 'Create event called Team Standup tomorrow at 10 AM',
      userId: 'default-user'
    }
  },
  {
    name: '✉️ Gmail - Show unread emails',
    payload: {
      text: 'Show unread emails',
      userId: 'default-user'
    }
  },
  {
    name: '✉️ Gmail - Send email',
    payload: {
      text: 'Send email to john@gmail.com with subject Meeting and body Can we discuss the project?',
      userId: 'default-user'
    }
  },
  {
    name: '📁 Drive - Show recent files',
    payload: {
      text: 'Show my recent files',
      userId: 'default-user'
    }
  },
  {
    name: '📁 Drive - Create folder',
    payload: {
      text: 'Create folder called Q2-Reports',
      userId: 'default-user'
    }
  },
  {
    name: '🤖 Help',
    payload: {
      text: 'help',
      userId: 'default-user'
    }
  }
];

// Function to make HTTP request
function makeRequest(payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/chatbot/message',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
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
          resolve({ error: 'Failed to parse response', rawData: responseData });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

// Run tests
async function runTests() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║     ManageMyDay Agent - Chatbot Testing Suite          ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`\n[Test ${i + 1}/${testCases.length}] ${testCase.name}`);
    console.log('─'.repeat(60));

    try {
      const response = await makeRequest(testCase.payload);

      if (response.error) {
        console.log(`❌ ERROR: ${response.error}`);
        if (response.message) console.log(`   ${response.message}`);
      } else if (response.status === 'success') {
        console.log(`✅ SUCCESS`);
        console.log(`   User Query: "${response.userMessage}"`);
        console.log(`   Bot Response:\n   ${response.botResponse.substring(0, 100)}...`);
      } else {
        console.log(`⚠️  UNEXPECTED RESPONSE:`);
        console.log(`   ${JSON.stringify(response, null, 2)}`);
      }
    } catch (error) {
      console.log(`❌ REQUEST FAILED: ${error.message}`);
      console.log('   Make sure the server is running on port 3000');
    }

    // Add delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║                Test Suite Complete                     ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
}

// Run the tests
runTests().catch(console.error);
