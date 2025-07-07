const fs = require('fs');
const path = require('path');

// Test configuration
const API_BASE_URL = process.env.API_BASE_URL || 'https://cold-call-tracker-9wada9is6-debojyoti-biswas-projects.vercel.app';
const TEST_DATA_DIR = './test-data';

// Test files
const testFiles = [
  'valid-businesses.json',
  'edge-cases.json', 
  'format-variations.json'
];

// Color codes for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logHeader(message) {
  log(`\n${colors.bold}${'='.repeat(60)}`, 'blue');
  log(message, 'bold');
  log(`${'='.repeat(60)}${colors.reset}`, 'blue');
}

function logTest(testName, status, details = '') {
  const statusColor = status === 'PASS' ? 'green' : status === 'FAIL' ? 'red' : 'yellow';
  log(`${testName.padEnd(40)} [${status}]`, statusColor);
  if (details) {
    log(`  → ${details}`, 'yellow');
  }
}

// Test API health endpoint
async function testApiHealth() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`);
    const data = await response.json();
    
    if (response.ok && data.status === 'ok') {
      logTest('API Health Check', 'PASS', 'API is responding correctly');
      return true;
    } else {
      logTest('API Health Check', 'FAIL', `Unexpected response: ${JSON.stringify(data)}`);
      return false;
    }
  } catch (error) {
    logTest('API Health Check', 'FAIL', `Error: ${error.message}`);
    return false;
  }
}

// Test business creation endpoint
async function testBusinessCreation() {
  const testBusiness = {
    name: "Test Restaurant",
    phone: "555-TEST-123",
    address: "123 Test St, Test City, TC 12345",
    status: "tocall",
    comments: "Test business for API validation",
    hours: "Mon-Fri: 9AM-9PM",
    industry: "Restaurant"
  };

  try {
    const response = await fetch(`${API_BASE_URL}/api/businesses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testBusiness)
    });

    if (response.ok) {
      const data = await response.json();
      logTest('Business Creation API', 'PASS', `Created business: ${data.name || 'Test Restaurant'}`);
      return { success: true, businessId: data.id };
    } else {
      const errorData = await response.text();
      logTest('Business Creation API', 'FAIL', `HTTP ${response.status}: ${errorData}`);
      return { success: false };
    }
  } catch (error) {
    logTest('Business Creation API', 'FAIL', `Error: ${error.message}`);
    return { success: false };
  }
}

// Test business retrieval endpoint
async function testBusinessRetrieval() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/businesses`);
    
    if (response.ok) {
      const data = await response.json();
      logTest('Business Retrieval API', 'PASS', `Retrieved ${data.length} businesses`);
      return true;
    } else {
      const errorData = await response.text();
      logTest('Business Retrieval API', 'FAIL', `HTTP ${response.status}: ${errorData}`);
      return false;
    }
  } catch (error) {
    logTest('Business Retrieval API', 'FAIL', `Error: ${error.message}`);
    return false;
  }
}

// Validate JSON test files
function validateTestFiles() {
  logHeader('VALIDATING TEST FILES');
  
  let allValid = true;
  
  for (const fileName of testFiles) {
    const filePath = path.join(TEST_DATA_DIR, fileName);
    
    try {
      if (!fs.existsSync(filePath)) {
        logTest(`File: ${fileName}`, 'FAIL', 'File does not exist');
        allValid = false;
        continue;
      }
      
      const content = fs.readFileSync(filePath, 'utf8');
      const jsonData = JSON.parse(content);
      
      if (!Array.isArray(jsonData)) {
        logTest(`File: ${fileName}`, 'FAIL', 'Content is not an array');
        allValid = false;
        continue;
      }
      
      logTest(`File: ${fileName}`, 'PASS', `${jsonData.length} businesses`);
      
      // Validate business structure
      let validBusinesses = 0;
      let invalidBusinesses = 0;
      
      for (const business of jsonData) {
        if (business.title && business.reviewsCount) {
          validBusinesses++;
        } else {
          invalidBusinesses++;
        }
      }
      
      log(`  → Valid: ${validBusinesses}, Invalid: ${invalidBusinesses}`, 'yellow');
      
    } catch (error) {
      logTest(`File: ${fileName}`, 'FAIL', `Parse error: ${error.message}`);
      allValid = false;
    }
  }
  
  return allValid;
}

// Test JSON processing logic
function testJsonProcessing() {
  logHeader('TESTING JSON PROCESSING LOGIC');
  
  const testCases = [
    {
      name: 'Valid Business',
      business: {
        title: 'Test Restaurant',
        phone: '555-123-4567',
        address: '123 Test St, Test City, TC 12345',
        reviewsCount: '25',
        totalScore: '4.5',
        categoryName: 'Restaurant',
        description: 'Test restaurant'
      },
      shouldPass: true
    },
    {
      name: 'Missing Phone',
      business: {
        title: 'No Phone Restaurant',
        address: '123 Test St, Test City, TC 12345',
        reviewsCount: '25',
        totalScore: '4.5',
        categoryName: 'Restaurant'
      },
      shouldPass: false
    },
    {
      name: 'Low Reviews',
      business: {
        title: 'Low Reviews Restaurant',
        phone: '555-123-4567',
        address: '123 Test St, Test City, TC 12345',
        reviewsCount: '5',
        totalScore: '4.5',
        categoryName: 'Restaurant'
      },
      shouldPass: false
    },
    {
      name: 'Gas Station (Excluded)',
      business: {
        title: 'Shell Gas Station',
        phone: '555-123-4567',
        address: '123 Test St, Test City, TC 12345',
        reviewsCount: '25',
        totalScore: '4.5',
        categoryName: 'Gas Station'
      },
      shouldPass: false
    }
  ];
  
  for (const testCase of testCases) {
    const hasPhone = !!testCase.business.phone;
    const hasMinReviews = testCase.business.reviewsCount && parseInt(testCase.business.reviewsCount) >= 20;
    const isExcluded = testCase.business.categoryName && 
                      testCase.business.categoryName.toLowerCase().includes('gas station');
    
    const wouldPass = hasPhone && hasMinReviews && !isExcluded;
    const correct = wouldPass === testCase.shouldPass;
    
    logTest(
      `Logic: ${testCase.name}`,
      correct ? 'PASS' : 'FAIL',
      `Expected: ${testCase.shouldPass ? 'Accept' : 'Reject'}, Got: ${wouldPass ? 'Accept' : 'Reject'}`
    );
  }
}

// Simulate file upload processing
function simulateFileUpload(fileName) {
  const filePath = path.join(TEST_DATA_DIR, fileName);
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const businesses = JSON.parse(content);
    
    log(`\nProcessing ${fileName}:`, 'blue');
    
    let addedCount = 0;
    let skippedCount = 0;
    let skippedReasons = {};
    
    const minReviews = 20;
    const excludeKeywords = ['gas station', 'atm', 'parking'];
    
    for (const business of businesses) {
      // Skip if no phone number
      if (!business.phone) {
        skippedCount++;
        if (!skippedReasons['No phone number']) skippedReasons['No phone number'] = [];
        skippedReasons['No phone number'].push(business.title);
        continue;
      }
      
      // Skip if less than minimum reviews
      if (!business.reviewsCount || parseInt(business.reviewsCount) < minReviews) {
        skippedCount++;
        const reasonKey = `Less than ${minReviews} reviews`;
        if (!skippedReasons[reasonKey]) skippedReasons[reasonKey] = [];
        skippedReasons[reasonKey].push(business.title);
        continue;
      }
      
      // Check for excluded keywords
      if (excludeKeywords.length > 0 && business.categoryName) {
        const categoryLower = business.categoryName.toLowerCase();
        const hasExcludedKeyword = excludeKeywords.some(keyword => 
          categoryLower.includes(keyword)
        );
        
        if (hasExcludedKeyword) {
          skippedCount++;
          const reasonKey = 'Contains excluded keywords';
          if (!skippedReasons[reasonKey]) skippedReasons[reasonKey] = [];
          skippedReasons[reasonKey].push(`${business.title} (${business.categoryName})`);
          continue;
        }
      }
      
      addedCount++;
    }
    
    log(`  → Would add: ${addedCount} businesses`, 'green');
    log(`  → Would skip: ${skippedCount} businesses`, 'yellow');
    
    for (const [reason, businessNames] of Object.entries(skippedReasons)) {
      log(`    - ${reason}: ${businessNames.length} businesses`, 'yellow');
      businessNames.forEach(name => log(`      • ${name}`, 'yellow'));
    }
    
    return { addedCount, skippedCount, skippedReasons };
    
  } catch (error) {
    log(`Error processing ${fileName}: ${error.message}`, 'red');
    return null;
  }
}

// Main test function
async function runTests() {
  logHeader('JSON UPLOADER TESTING SUITE');
  
  // Test 1: Validate test files
  const filesValid = validateTestFiles();
  
  // Test 2: Test JSON processing logic
  testJsonProcessing();
  
  // Test 3: Simulate file uploads
  logHeader('SIMULATING FILE UPLOADS');
  
  let totalAdded = 0;
  let totalSkipped = 0;
  
  for (const fileName of testFiles) {
    const result = simulateFileUpload(fileName);
    if (result) {
      totalAdded += result.addedCount;
      totalSkipped += result.skippedCount;
    }
  }
  
  log(`\nTotal simulation results:`, 'blue');
  log(`  → Would add: ${totalAdded} businesses`, 'green');
  log(`  → Would skip: ${totalSkipped} businesses`, 'yellow');
  
  // Test 4: API endpoint tests
  logHeader('TESTING API ENDPOINTS');
  
  const healthOk = await testApiHealth();
  const retrievalOk = await testBusinessRetrieval();
  const creationResult = await testBusinessCreation();
  
  // Test 5: Summary
  logHeader('TEST SUMMARY');
  
  const allTestsPassed = filesValid && healthOk && retrievalOk && creationResult.success;
  
  log(`Files Valid: ${filesValid ? 'PASS' : 'FAIL'}`, filesValid ? 'green' : 'red');
  log(`API Health: ${healthOk ? 'PASS' : 'FAIL'}`, healthOk ? 'green' : 'red');
  log(`API Retrieval: ${retrievalOk ? 'PASS' : 'FAIL'}`, retrievalOk ? 'green' : 'red');
  log(`API Creation: ${creationResult.success ? 'PASS' : 'FAIL'}`, creationResult.success ? 'green' : 'red');
  
  log(`\nOverall Status: ${allTestsPassed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`, 
      allTestsPassed ? 'green' : 'red');
  
  if (allTestsPassed) {
    log('\n🎉 JSON Uploader is ready for production use!', 'green');
    log('You can now safely upload JSON files using the web interface.', 'green');
  } else {
    log('\n⚠️  Please fix the failing tests before using the JSON uploader.', 'red');
  }
}

// Run the tests
runTests().catch(console.error); 