# React Integration Guide

## Adding UI Components to Existing React App

### 1. Copy Components
Copy the following files to your React application:

```
client/src/pages/credit-notes-management.tsx
client/src/pages/debit-notes-management.tsx
client/src/pages/intercompany-adjustments.tsx
```

### 2. Add Routes
Add these routes to your App.tsx or router configuration:

```tsx
import CreditNotesManagement from '@/pages/credit-notes-management';
import DebitNotesManagement from '@/pages/debit-notes-management';
import IntercompanyAdjustments from '@/pages/intercompany-adjustments';

// Add these routes
<Route path="/credit-notes-management" component={CreditNotesManagement} />
<Route path="/debit-notes-management" component={DebitNotesManagement} />
<Route path="/intercompany-adjustments" component={IntercompanyAdjustments} />
```

### 3. Required Dependencies
Ensure these packages are installed:

```bash
npm install @tanstack/react-query @hookform/resolvers
npm install react-hook-form zod lucide-react
```

### 4. UI Components
Copy required Shadcn UI components from the components/ui folder.

### 5. Navigation
Add navigation links to your sidebar or menu:

```tsx
<Link to="/credit-notes-management">Credit Notes</Link>
<Link to="/debit-notes-management">Debit Notes</Link>
<Link to="/intercompany-adjustments">Intercompany Adjustments</Link>
```
