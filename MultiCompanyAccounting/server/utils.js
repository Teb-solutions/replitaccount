import crypto from 'crypto';

// Password hashing utility
export async function hash(password) {
  return new Promise((resolve, reject) => {
    // Generate a salt
    crypto.randomBytes(16, (err, salt) => {
      if (err) {
        return reject(err);
      }
      
      // Hash the password with the salt
      crypto.pbkdf2(password, salt, 10000, 64, 'sha512', (err, derivedKey) => {
        if (err) {
          return reject(err);
        }
        
        // Combine salt and hash for storage
        resolve(`${salt.toString('hex')}:${derivedKey.toString('hex')}`);
      });
    });
  });
}

// Password verification utility
export async function verify(storedPassword, suppliedPassword) {
  return new Promise((resolve, reject) => {
    // Extract the salt from the stored password
    const [salt, storedHash] = storedPassword.split(':');
    
    if (!salt || !storedHash) {
      return resolve(false);
    }
    
    // Hash the supplied password with the same salt
    crypto.pbkdf2(suppliedPassword, Buffer.from(salt, 'hex'), 10000, 64, 'sha512', (err, derivedKey) => {
      if (err) {
        return reject(err);
      }
      
      // Compare the hashes
      resolve(derivedKey.toString('hex') === storedHash);
    });
  });
}

// Generate a unique number for documents (sales orders, invoices, etc.)
export function generateDocumentNumber(prefix, companyCode, id) {
  const date = new Date();
  const year = date.getFullYear().toString().substring(2); // Get last 2 digits of year
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const paddedId = id.toString().padStart(4, '0');
  
  return `${prefix}-${companyCode}${year}${month}-${paddedId}`;
}

// Format number as currency
export function formatCurrency(amount, currency = 'USD') {
  const numberAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numberAmount);
}