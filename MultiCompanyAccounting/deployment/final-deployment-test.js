// Final deployment test - check both ports
const testUrls = [
  'http://localhost:3000/',
  'http://localhost:3000/health', 
  'http://localhost:5000/',
  'http://localhost:5000/health',
  'http://localhost:5000/api/auth/me'
];

console.log('Testing deployment endpoints...\n');

for (const url of testUrls) {
  try {
    const response = await fetch(url);
    const isHtml = url.endsWith('/') && !url.includes('api');
    const content = isHtml ? 'HTML content' : await response.text();
    
    console.log(`✅ ${url} - Status: ${response.status}`);
    if (!isHtml && content.length < 100) {
      console.log(`   Response: ${content}`);
    }
  } catch (error) {
    console.log(`❌ ${url} - Error: ${error.message}`);
  }
}