/**
 * Register Transaction API Script
 * 
 * This script dynamically registers the order transaction processor API
 * in the Express server's middleware.
 */

const fs = require('fs');
const path = require('path');

// Get the path to app.js which contains the Express setup
const appFilePath = path.join(__dirname, 'app.js');

// Check if app.js exists, and if not, look for express-server.js
let mainServerFile = fs.existsSync(appFilePath) ? 
  appFilePath : 
  path.join(__dirname, 'express-server.js');

// If neither exists, use the first file in the server directory that looks like it sets up Express
if (!fs.existsSync(mainServerFile)) {
  const serverFiles = fs.readdirSync(__dirname)
    .filter(file => file.endsWith('.js') && !file.startsWith('order-transaction-processor-api'))
    .map(file => path.join(__dirname, file));
  
  const expressFile = serverFiles.find(file => {
    try {
      const content = fs.readFileSync(file, 'utf8');
      return content.includes('express()') || content.includes('require("express")') || content.includes('import express');
    } catch (err) {
      return false;
    }
  });
  
  if (expressFile) {
    mainServerFile = expressFile;
  } else {
    console.error('Could not find main Express server file. Please register the API manually.');
    process.exit(1);
  }
}

console.log(`Found main server file: ${mainServerFile}`);

// Read the file content
let content = fs.readFileSync(mainServerFile, 'utf8');

// Check if our API is already registered
if (content.includes('order-transaction-processor-api')) {
  console.log('Order transaction processor API is already registered.');
  process.exit(0);
}

// Create a string representing the import and use statements for our API
const apiImportAndUse = `
// Register order transaction processor API
const orderTransactionProcessorRouter = require('./order-transaction-processor-api');
app.use(orderTransactionProcessorRouter);
`;

// Find a suitable location to insert our code - after other API registrations
// but before the server starts listening
let insertPosition = content.indexOf('app.listen');
if (insertPosition === -1) {
  insertPosition = content.indexOf('server.listen');
}
if (insertPosition === -1) {
  insertPosition = content.indexOf('export default');
}
if (insertPosition === -1) {
  insertPosition = content.lastIndexOf('}');
}

if (insertPosition === -1) {
  console.error('Could not find a suitable position to insert the API registration.');
  process.exit(1);
}

// Insert our code at the determined position
const newContent = content.substring(0, insertPosition) + apiImportAndUse + content.substring(insertPosition);

// Write the updated content back to the file
fs.writeFileSync(mainServerFile, newContent);

console.log(`Successfully registered order transaction processor API in ${mainServerFile}`);