/**
 * Test Script for AgenticAI Chatbot POC
 * Use this to test API endpoints locally
 */

const http = require('http');

// Configuration
const BASE_URL = 'http://localhost:3000';
const USER_ID = 'default-user';

// Color codes for console
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
};

// Helper function to make HTTP requests
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(responseData),
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            data: responseData,
          });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Test functions
async function testHealth() {
  console.log(`\n${colors.blue}Testing Health Endpoint...${colors.reset}`);
  try {
    const result = await makeRequest('GET', '/health');
    console.log(`${colors.green}✓ Status: ${result.status}${colors.reset}`);
    console.log(JSON.stringify(result.data, null, 2));
  } catch (error) {
    console.error(`${colors.red}✗ Error: ${error.message}${colors.reset}`);
  }
}

async function testAuthInit() {
  console.log(`\n${colors.blue}Testing Auth Init Endpoint...${colors.reset}`);
  console.log(`${colors.yellow}⚠ You will need to visit the provided URL to complete OAuth${colors.reset}`);
  try {
    const result = await makeRequest('GET', '/auth/init');
    console.log(`${colors.green}✓ Status: ${result.status}${colors.reset}`);
    console.log(JSON.stringify(result.data, null, 2));
  } catch (error) {
    console.error(`${colors.red}✗ Error: ${error.message}${colors.reset}`);
  }
}

async function testCalendarToday() {
  console.log(`\n${colors.blue}Testing Calendar Today Endpoint...${colors.reset}`);
  try {
    const result = await makeRequest(
      'GET',
      `/calendar/today?userId=${USER_ID}`
    );
    console.log(`${colors.green}✓ Status: ${result.status}${colors.reset}`);
    console.log(JSON.stringify(result.data, null, 2));
  } catch (error) {
    console.error(`${colors.red}✗ Error: ${error.message}${colors.reset}`);
  }
}

async function testCalendarUpcoming() {
  console.log(`\n${colors.blue}Testing Calendar Upcoming Endpoint...${colors.reset}`);
  try {
    const result = await makeRequest(
      'GET',
      `/calendar/upcoming?days=7&userId=${USER_ID}`
    );
    console.log(`${colors.green}✓ Status: ${result.status}${colors.reset}`);
    console.log(JSON.stringify(result.data, null, 2));
  } catch (error) {
    console.error(`${colors.red}✗ Error: ${error.message}${colors.reset}`);
  }
}

async function testChatbotMessage() {
  console.log(`\n${colors.blue}Testing Chatbot Message Endpoint...${colors.reset}`);
  const message = {
    text: "What's my schedule for today?",
    userId: USER_ID,
  };
  try {
    const result = await makeRequest('POST', '/chatbot/message', message);
    console.log(`${colors.green}✓ Status: ${result.status}${colors.reset}`);
    console.log(JSON.stringify(result.data, null, 2));
  } catch (error) {
    console.error(`${colors.red}✗ Error: ${error.message}${colors.reset}`);
  }
}

// Main test runner
async function runTests() {
  console.log(`${colors.green}
╔════════════════════════════════════════╗
║  AgenticAI Chatbot - API Test Suite    ║
╚════════════════════════════════════════╝
${colors.reset}`);

  console.log(`${colors.yellow}Make sure the server is running: npm start${colors.reset}`);

  // Test 1: Health
  await testHealth();

  // Test 2: Auth Init
  await testAuthInit();

  // Test 3: Calendar Today (will fail without auth)
  await testCalendarToday();

  // Test 4: Calendar Upcoming
  await testCalendarUpcoming();

  // Test 5: Chatbot Message
  await testChatbotMessage();

  console.log(`\n${colors.green}
╔════════════════════════════════════════╗
║  Test Suite Complete                   ║
╚════════════════════════════════════════╝
${colors.reset}`);

  console.log(`\n${colors.yellow}Next Steps:${colors.reset}`);
  console.log('1. Visit the Auth Init URL and complete OAuth flow');
  console.log('2. Re-run calendar tests after authentication');
  console.log('3. Test more queries in the Chatbot');
}

// Run tests
runTests().catch(console.error);
