# Credit and Debit Notes Module Documentation

This document provides an overview of the Credit and Debit Notes functionality implemented in the multi-tenant accounting system.

## Overview

Credit and Debit Notes are essential accounting documents used to adjust invoices and bills:

- **Credit Notes**: Created by sellers/companies to reduce the amount owed by customers due to returns, discounts, or corrections.
- **Debit Notes**: Created by buyers/companies to reduce the amount owed to vendors due to returns, overcharges, or corrections.

## Database Schema

### Credit Notes
- `credit_notes`: Main table storing credit note records
- `credit_note_items`: Line items for each credit note

### Debit Notes  
- `debit_notes`: Main table storing debit note records  
- `debit_note_items`: Line items for each debit note

## API Endpoints

### Credit Notes API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/credit-notes` | List credit notes for active company |
| GET | `/api/credit-notes/:id` | Get a specific credit note |
| POST | `/api/credit-notes` | Create a new credit note |
| PUT | `/api/credit-notes/:id/status` | Update credit note status |
| DELETE | `/api/credit-notes/:id` | Delete a draft credit note |

### Debit Notes API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/debit-notes` | List debit notes for active company |
| GET | `/api/debit-notes/:id` | Get a specific debit note |
| POST | `/api/debit-notes` | Create a new debit note |
| PUT | `/api/debit-notes/:id/status` | Update debit note status |
| DELETE | `/api/debit-notes/:id` | Delete a draft debit note |

## Status Workflow

Both credit and debit notes follow this status workflow:

1. **draft**: Initial state when created
2. **issued**: Note has been issued/finalized to customer/vendor
3. **partial**: Note has been partially applied
4. **applied**: Note has been fully applied to invoice/bill
5. **cancelled**: Note has been cancelled

Notes can only be deleted when in "draft" status.

## Testing the Functionality

### Automated Tests

The system includes automated tests in the `tests` directory:

```bash
# Run all tests
npm test

# Run just the credit/debit notes tests
npm test tests/credit-debit-notes.test.ts
```

### Manual Testing

A comprehensive test plan is available at `tests/manual-test-plan.md`. This document provides step-by-step testing instructions for all features.

Key test scenarios include:
- Creating credit/debit notes
- Linking to existing invoices/bills
- Updating statuses
- Deleting draft notes
- Verifying financial impact

## Usage Examples

### Creating a Credit Note

```javascript
// Client-side example using React Query
const createCreditNote = async (data) => {
  const response = await fetch('/api/credit-notes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  
  if (!response.ok) {
    throw new Error('Failed to create credit note');
  }
  
  return response.json();
};

// Example data structure
const noteData = {
  customerId: 1,
  invoiceId: 5, // Optional reference to original invoice
  issueDate: new Date().toISOString(),
  dueDate: new Date(Date.now() + 30*24*60*60*1000).toISOString(), // 30 days from now
  notes: "Customer returned damaged items",
  items: [
    {
      description: "Product return - damaged in transit",
      quantity: 2,
      unitPrice: 99.99,
      amount: 199.98
    }
  ]
};
```

### Issuing a Credit Note

```javascript
// Client-side example using React Query
const updateCreditNoteStatus = async (id, status) => {
  const response = await fetch(`/api/credit-notes/${id}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
  
  if (!response.ok) {
    throw new Error('Failed to update credit note status');
  }
  
  return response.json();
};

// Issue a draft credit note
updateCreditNoteStatus(1, 'issued');
```

## Financial Impact

When a credit or debit note is issued:

1. **Credit Notes**:
   - Decreases accounts receivable 
   - Decreases revenue or creates a contra revenue entry

2. **Debit Notes**:
   - Decreases accounts payable
   - Decreases expenses or creates a contra expense entry

The system automatically generates the appropriate journal entries when notes change status from "draft" to "issued".

## Security Considerations

- Notes can only be accessed by users with permission to the related company
- Only draft notes can be deleted
- Status transitions are validated on the server
- Company access is verified for all operations