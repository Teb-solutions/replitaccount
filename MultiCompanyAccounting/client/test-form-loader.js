// Test console for intercompany invoice and receipt testing
// This file helps with debugging form validation and submission

(function() {
  // Create container
  const container = document.createElement('div');
  container.id = 'test-form-loader';
  container.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    width: 300px;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    font-family: monospace;
    padding: 10px;
    border-radius: 5px;
    z-index: 9999;
  `;
  
  // Create header
  const header = document.createElement('h3');
  header.textContent = 'Form Tester';
  header.style.margin = '0 0 10px 0';
  container.appendChild(header);
  
  // Create buttons container
  const buttonsContainer = document.createElement('div');
  buttonsContainer.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: 5px;
  `;
  
  // Function to create a button
  function createButton(text, onClick) {
    const button = document.createElement('button');
    button.textContent = text;
    button.style.cssText = `
      padding: 8px;
      margin: 2px 0;
      background: #2a6ac1;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    `;
    button.addEventListener('click', onClick);
    return button;
  }
  
  // Add test buttons
  buttonsContainer.appendChild(
    createButton('Test Partial Invoice', () => {
      console.log('Testing partial invoice creation');
      
      // Check if we're on the right page
      if (!window.location.pathname.includes('invoice')) {
        alert('Please navigate to an invoice creation page first');
        return;
      }
      
      try {
        // Get form elements
        setTimeout(() => {
          // Select the first product checkbox if it exists
          const checkboxes = document.querySelectorAll('input[type="checkbox"]');
          if (checkboxes.length > 0) {
            checkboxes[0].checked = true;
            checkboxes[0].dispatchEvent(new Event('change', { bubbles: true }));
            console.log('Selected first product for partial invoice');
          }
          
          // Set quantity and price inputs
          setTimeout(() => {
            // Find quantity input
            const quantityInputs = document.querySelectorAll('input[type="number"]');
            if (quantityInputs.length > 0) {
              quantityInputs[0].value = "2";
              quantityInputs[0].dispatchEvent(new Event('input', { bubbles: true }));
              quantityInputs[0].dispatchEvent(new Event('change', { bubbles: true }));
              console.log('Set quantity to 2');
            }
            
            // Find price input
            const priceInputs = document.querySelectorAll('input[placeholder*="price"], input[placeholder*="Price"]');
            if (priceInputs.length > 0) {
              priceInputs[0].value = "150";
              priceInputs[0].dispatchEvent(new Event('input', { bubbles: true }));
              priceInputs[0].dispatchEvent(new Event('change', { bubbles: true }));
              console.log('Set price to 150');
            }
            
            console.log('Form values set for partial invoice test');
          }, 500);
        }, 500);
      } catch (e) {
        console.error('Error setting up partial invoice test:', e);
      }
    })
  );
  
  buttonsContainer.appendChild(
    createButton('Test Full Invoice', () => {
      console.log('Testing full invoice creation');
      
      // Check if we're on the right page
      if (!window.location.pathname.includes('invoice')) {
        alert('Please navigate to an invoice creation page first');
        return;
      }
      
      try {
        // Switch to full invoice tab if available
        setTimeout(() => {
          const fullInvoiceTab = Array.from(document.querySelectorAll('button'))
            .find(btn => btn.textContent?.includes('Full Invoice'));
          
          if (fullInvoiceTab) {
            fullInvoiceTab.click();
            console.log('Switched to Full Invoice tab');
          }
          
          // Set quantity and price inputs for all available items
          setTimeout(() => {
            // Find all quantity inputs
            const quantityInputs = document.querySelectorAll('input[type="number"]');
            quantityInputs.forEach((input, i) => {
              input.value = "3";
              input.dispatchEvent(new Event('input', { bubbles: true }));
              input.dispatchEvent(new Event('change', { bubbles: true }));
              console.log(`Set quantity #${i + 1} to 3`);
            });
            
            // Find all price inputs
            const priceInputs = document.querySelectorAll('input[placeholder*="price"], input[placeholder*="Price"]');
            priceInputs.forEach((input, i) => {
              input.value = "200";
              input.dispatchEvent(new Event('input', { bubbles: true }));
              input.dispatchEvent(new Event('change', { bubbles: true }));
              console.log(`Set price #${i + 1} to 200`);
            });
            
            console.log('Form values set for full invoice test');
          }, 500);
        }, 500);
      } catch (e) {
        console.error('Error setting up full invoice test:', e);
      }
    })
  );
  
  buttonsContainer.appendChild(
    createButton('Test Partial Receipt', () => {
      console.log('Testing partial receipt creation');
      
      // Check if we're on the right page
      if (!window.location.pathname.includes('invoice') && !window.location.pathname.includes('receipt')) {
        alert('Please navigate to a receipt creation page first');
        return;
      }
      
      try {
        // Switch to receipt tab if available
        setTimeout(() => {
          const receiptTab = Array.from(document.querySelectorAll('button'))
            .find(btn => btn.textContent?.includes('Receipt'));
          
          if (receiptTab) {
            receiptTab.click();
            console.log('Switched to Receipt tab');
          }
          
          // Select first invoice if available
          setTimeout(() => {
            const invoiceSelect = document.querySelector('select');
            if (invoiceSelect && invoiceSelect.options.length > 0) {
              invoiceSelect.value = invoiceSelect.options[0].value;
              invoiceSelect.dispatchEvent(new Event('change', { bubbles: true }));
              console.log('Selected first invoice for receipt');
            }
            
            // Set partial payment amount
            setTimeout(() => {
              const amountInputs = document.querySelectorAll('input[type="number"]');
              if (amountInputs.length > 0) {
                // Find the amount input (usually has a placeholder with "amount" in it)
                const amountInput = Array.from(amountInputs)
                  .find(input => input.placeholder?.toLowerCase().includes('amount'));
                
                if (amountInput) {
                  amountInput.value = "75";
                  amountInput.dispatchEvent(new Event('input', { bubbles: true }));
                  amountInput.dispatchEvent(new Event('change', { bubbles: true }));
                  console.log('Set partial receipt amount to 75');
                }
              }
              
              console.log('Form values set for partial receipt test');
            }, 500);
          }, 500);
        }, 500);
      } catch (e) {
        console.error('Error setting up partial receipt test:', e);
      }
    })
  );
  
  buttonsContainer.appendChild(
    createButton('Test Full Receipt', () => {
      console.log('Testing full receipt creation');
      
      // Check if we're on the right page
      if (!window.location.pathname.includes('invoice') && !window.location.pathname.includes('receipt')) {
        alert('Please navigate to a receipt creation page first');
        return;
      }
      
      try {
        // Switch to receipt tab if available
        setTimeout(() => {
          const receiptTab = Array.from(document.querySelectorAll('button'))
            .find(btn => btn.textContent?.includes('Receipt'));
          
          if (receiptTab) {
            receiptTab.click();
            console.log('Switched to Receipt tab');
          }
          
          // Select first invoice if available
          setTimeout(() => {
            const invoiceSelect = document.querySelector('select');
            if (invoiceSelect && invoiceSelect.options.length > 0) {
              invoiceSelect.value = invoiceSelect.options[0].value;
              invoiceSelect.dispatchEvent(new Event('change', { bubbles: true }));
              console.log('Selected first invoice for receipt');
            }
            
            // Set full payment amount (use data-full-amount if available)
            setTimeout(() => {
              const amountInputs = document.querySelectorAll('input[type="number"]');
              if (amountInputs.length > 0) {
                // Find the amount input (usually has a placeholder with "amount" in it)
                const amountInput = Array.from(amountInputs)
                  .find(input => input.placeholder?.toLowerCase().includes('amount'));
                
                if (amountInput) {
                  // Check if there's a full amount data attribute
                  const fullAmount = amountInput.getAttribute('data-full-amount') || '200';
                  amountInput.value = fullAmount;
                  amountInput.dispatchEvent(new Event('input', { bubbles: true }));
                  amountInput.dispatchEvent(new Event('change', { bubbles: true }));
                  console.log(`Set full receipt amount to ${fullAmount}`);
                }
              }
              
              console.log('Form values set for full receipt test');
            }, 500);
          }, 500);
        }, 500);
      } catch (e) {
        console.error('Error setting up full receipt test:', e);
      }
    })
  );
  
  // Close button
  const closeButton = document.createElement('button');
  closeButton.textContent = 'Close';
  closeButton.style.cssText = `
    padding: 8px;
    margin-top: 10px;
    background: #e53935;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  `;
  closeButton.addEventListener('click', () => {
    document.body.removeChild(container);
  });
  
  // Add buttons to container
  container.appendChild(buttonsContainer);
  container.appendChild(closeButton);
  
  // Add to document
  document.body.appendChild(container);
  
  console.log('Form tester loaded. Use the buttons to test different invoice and receipt scenarios.');
})();