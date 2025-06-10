// Test Console for Intercompany Invoice and Receipt Testing
// Add this to your HTML page to test invoice/receipt creation

(function() {
  // Create test console div
  const testConsole = document.createElement('div');
  testConsole.id = 'test-console';
  testConsole.style.cssText = `
    position: fixed;
    bottom: 0;
    right: 0;
    width: 400px;
    height: 300px;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    font-family: monospace;
    padding: 10px;
    overflow: auto;
    z-index: 9999;
    font-size: 12px;
    border-top-left-radius: 8px;
  `;
  
  // Create header
  const header = document.createElement('div');
  header.textContent = 'Intercompany Transaction Test Console';
  header.style.cssText = `
    font-weight: bold;
    font-size: 14px;
    margin-bottom: 10px;
    padding-bottom: 5px;
    border-bottom: 1px solid #555;
  `;
  testConsole.appendChild(header);
  
  // Create log area
  const logArea = document.createElement('div');
  logArea.id = 'test-console-log';
  logArea.style.cssText = `
    overflow: auto;
    height: calc(100% - 60px);
  `;
  testConsole.appendChild(logArea);
  
  // Create button row
  const buttonRow = document.createElement('div');
  buttonRow.style.cssText = `
    display: flex;
    justify-content: space-between;
    margin-top: 10px;
  `;
  
  // Clear button
  const clearButton = document.createElement('button');
  clearButton.textContent = 'Clear';
  clearButton.style.cssText = `
    background: #555;
    color: white;
    border: none;
    padding: 5px 10px;
    border-radius: 4px;
    cursor: pointer;
  `;
  clearButton.onclick = () => {
    logArea.innerHTML = '';
  };
  buttonRow.appendChild(clearButton);
  
  // Close button
  const closeButton = document.createElement('button');
  closeButton.textContent = 'Close';
  closeButton.style.cssText = `
    background: #f44;
    color: white;
    border: none;
    padding: 5px 10px;
    border-radius: 4px;
    cursor: pointer;
  `;
  closeButton.onclick = () => {
    document.body.removeChild(testConsole);
  };
  buttonRow.appendChild(closeButton);
  
  testConsole.appendChild(buttonRow);
  
  // Add to document
  document.body.appendChild(testConsole);
  
  // Log function
  window.testLog = function(message, data = null) {
    const logItem = document.createElement('div');
    logItem.style.cssText = `
      margin-bottom: 5px;
      border-bottom: 1px solid #333;
      padding-bottom: 5px;
    `;
    
    // Timestamp
    const timestamp = new Date().toLocaleTimeString();
    const timestampSpan = document.createElement('span');
    timestampSpan.textContent = `[${timestamp}] `;
    timestampSpan.style.color = '#aaa';
    logItem.appendChild(timestampSpan);
    
    // Message
    const messageSpan = document.createElement('span');
    messageSpan.textContent = message;
    logItem.appendChild(messageSpan);
    
    // Data (if provided)
    if (data !== null) {
      const dataItem = document.createElement('div');
      dataItem.style.cssText = `
        margin-left: 15px;
        color: #aaa;
        font-size: 11px;
        max-height: 100px;
        overflow: auto;
        word-break: break-all;
      `;
      
      try {
        if (typeof data === 'object') {
          dataItem.textContent = JSON.stringify(data);
        } else {
          dataItem.textContent = String(data);
        }
      } catch (e) {
        dataItem.textContent = '[Unable to stringify data]';
      }
      
      logItem.appendChild(dataItem);
    }
    
    logArea.appendChild(logItem);
    logArea.scrollTop = logArea.scrollHeight;
  };
  
  // Override console methods to capture in our test console
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  
  // Only intercept logs related to intercompany transactions
  console.log = function() {
    originalConsoleLog.apply(console, arguments);
    
    // Check if any argument contains intercompany-related keywords
    const args = Array.from(arguments);
    const message = args[0];
    
    if (typeof message === 'string' && 
        (message.includes('invoice') || 
         message.includes('INVOICE') || 
         message.includes('CRITICAL') || 
         message.includes('intercompany') || 
         message.includes('quantity') || 
         message.includes('unitPrice'))) {
      
      testLog(args[0], args.length > 1 ? args[1] : null);
    }
  };
  
  console.error = function() {
    originalConsoleError.apply(console, arguments);
    
    // Always capture errors
    const args = Array.from(arguments);
    testLog(`ERROR: ${args[0]}`, args.length > 1 ? args[1] : null);
  };
  
  console.warn = function() {
    originalConsoleWarn.apply(console, arguments);
    
    // Check if any argument contains intercompany-related keywords
    const args = Array.from(arguments);
    const message = args[0];
    
    if (typeof message === 'string' && 
        (message.includes('invoice') || 
         message.includes('quantity') || 
         message.includes('unitPrice'))) {
      
      testLog(`WARNING: ${args[0]}`, args.length > 1 ? args[1] : null);
    }
  };
  
  // Test console initialization message
  testLog('Test console initialized and ready');
  testLog('Monitoring for intercompany transaction logs...');
})();