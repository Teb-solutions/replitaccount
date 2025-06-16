import { Switch, Route } from "wouter";
import { AuthProvider } from "@/hooks/use-auth";
import { TenantProvider } from "@/hooks/use-tenant";
import { CompanyProvider } from "@/hooks/use-company";
import Layout from "@/components/layout";
import Dashboard from "@/pages/dashboard";
import ChartOfAccounts from "@/pages/chart-of-accounts";
import GasAccounts from "@/pages/gas-accounts";
import AuthPage from "@/pages/auth-page";
import Companies from "@/pages/companies";
import SimpleCompanyCreate from "@/pages/simple-company-create";
import DirectCompanyForm from "@/pages/direct-company-form";
import CompleteCompanyForm from "@/pages/complete-company-form";
import BasicCompanyForm from "@/pages/basic-company-form";
import EmergencyCompanyPage from "@/pages/emergency-company";
import DistributorCompanyForm from "@/pages/distributor-company-form";
import Users from "@/pages/users";
import IntercompanyTransactions from "@/pages/intercompany-transactions";
import IntercompanyOrderForm from "@/pages/intercompany-order-form";
import ExistingOrderTransactionForm from "@/pages/existing-order-transaction-form";
import IntercompanyInvoiceForm from "@/pages/intercompany-invoice-form";
import IntercompanyInvoiceDebug from "@/pages/intercompany-invoice-debug";
import InvoiceItemDebug from "@/pages/invoice-item-debug";
import IntercompanyPaymentForm from "@/pages/intercompany-payment-form";
import IntercompanyReceiptForm from "@/pages/intercompany-receipt-form";
import IntercompanyReceiptEligibleTransactions from "@/pages/intercompany-receipt-eligible-transactions";
import IntercompanyDeliveryNoteForm from "@/pages/intercompany-delivery-note-form";
import IntercompanyGoodsReceiptForm from "@/pages/intercompany-goods-receipt-form";
import TestIntercompanyWorkflow from "@/pages/test-intercompany-workflow";
import TestCompleteWorkflow from "@/pages/test-complete-workflow";
import QuickProductCreate from "@/pages/quick-product-create";
import ProductsDashboard from "@/pages/products-dashboard";
import CompanyProducts from "@/pages/company-products";
import Banking from "@/pages/banking";
import SalesOrders from "@/pages/sales-orders";
import PurchaseOrders from "@/pages/purchase-orders";
import Invoices from "@/pages/invoices";
import InvoiceForm from "@/pages/invoice-form";
import CreateInvoiceFromSalesOrder from "@/pages/create-invoice-from-sales-order";
import SalesOrderPaymentForm from "@/pages/sales-order-payment-form";
import DeliveryNotes from "@/pages/delivery-notes";
import CreditNotes from "@/pages/credit-notes";
import DebitNotes from "@/pages/debit-notes";
import CreditNotesManagement from "@/pages/credit-notes-management";
import DebitNotesManagement from "@/pages/debit-notes-management";
import IntercompanyAdjustments from "@/pages/intercompany-adjustments";
import PaymentTerms from "@/pages/payment-terms";
import JournalEntries from "@/pages/journal-entries";
import FinancialReports from "@/pages/financial-reports-fixed";
import Bills from "@/pages/bills";
import TaxCalculator from "@/pages/tax-calculator";
import NotFound from "@/pages/not-found";
import ProtectedRoute from "@/components/protected-route";

function App() {
  return (
    <AuthProvider>
      <TenantProvider>
        <CompanyProvider>
          <Switch>
            <Route path="/auth" component={AuthPage} />
            <Route path="/chart-of-accounts">
              <ProtectedRoute>
                <Layout>
                  <ChartOfAccounts />
                </Layout>
              </ProtectedRoute>
            </Route>
            <Route path="/gas-accounts">
              <ProtectedRoute>
                <Layout>
                  <GasAccounts />
                </Layout>
              </ProtectedRoute>
            </Route>
            <Route path="/dashboard">
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            </Route>
            <Route path="/">
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            </Route>
            <Route path="/companies">
              <ProtectedRoute>
                <Layout>
                  <Companies />
                </Layout>
              </ProtectedRoute>
            </Route>
            <Route path="/simple-company-create">
              <ProtectedRoute>
                <Layout>
                  <SimpleCompanyCreate />
                </Layout>
              </ProtectedRoute>
            </Route>
            <Route path="/direct-company-form">
              <ProtectedRoute>
                <Layout>
                  <DirectCompanyForm />
                </Layout>
              </ProtectedRoute>
            </Route>
            <Route path="/complete-company-form">
              <ProtectedRoute>
                <Layout>
                  <CompleteCompanyForm />
                </Layout>
              </ProtectedRoute>
            </Route>
            <Route path="/basic-company-form">
              <ProtectedRoute>
                <Layout>
                  <BasicCompanyForm />
                </Layout>
              </ProtectedRoute>
            </Route>
            <Route path="/emergency-company">
              <ProtectedRoute>
                <Layout>
                  <EmergencyCompanyPage />
                </Layout>
              </ProtectedRoute>
            </Route>
            <Route path="/distributor-company-form">
              <ProtectedRoute>
                <Layout>
                  <DistributorCompanyForm />
                </Layout>
              </ProtectedRoute>
            </Route>
            <Route path="/users">
              <ProtectedRoute>
                <Layout>
                  <Users />
                </Layout>
              </ProtectedRoute>
            </Route>
            <Route path="/intercompany-transactions">
              <ProtectedRoute>
                <Layout>
                  <IntercompanyTransactions />
                </Layout>
              </ProtectedRoute>
            </Route>
            <Route path="/intercompany-order-form">
              <ProtectedRoute>
                <Layout>
                  <IntercompanyOrderForm />
                </Layout>
              </ProtectedRoute>
            </Route>
            <Route path="/existing-order-transaction-form">
              <ProtectedRoute>
                <Layout>
                  <ExistingOrderTransactionForm />
                </Layout>
              </ProtectedRoute>
            </Route>
            <Route path="/intercompany-invoice-form">
              <ProtectedRoute>
                <Layout>
                  <IntercompanyInvoiceForm />
                </Layout>
              </ProtectedRoute>
            </Route>
            <Route path="/intercompany-invoice-debug">
              <ProtectedRoute>
                <Layout>
                  <IntercompanyInvoiceDebug />
                </Layout>
              </ProtectedRoute>
            </Route>
            <Route path="/invoice-item-debug">
              <ProtectedRoute>
                <Layout>
                  <InvoiceItemDebug />
                </Layout>
              </ProtectedRoute>
            </Route>
            <Route path="/intercompany-payment-form">
              <ProtectedRoute>
                <Layout>
                  <IntercompanyPaymentForm />
                </Layout>
              </ProtectedRoute>
            </Route>
            <Route path="/intercompany-receipt-form">
              <ProtectedRoute>
                <Layout>
                  <IntercompanyReceiptForm />
                </Layout>
              </ProtectedRoute>
            </Route>
            <Route path="/intercompany-receipt-eligible-transactions">
              <ProtectedRoute>
                <Layout>
                  <IntercompanyReceiptEligibleTransactions />
                </Layout>
              </ProtectedRoute>
            </Route>
            <Route path="/intercompany-delivery-note-form">
              <ProtectedRoute>
                <Layout>
                  <IntercompanyDeliveryNoteForm />
                </Layout>
              </ProtectedRoute>
            </Route>
            <Route path="/intercompany-goods-receipt-form">
              <ProtectedRoute>
                <Layout>
                  <IntercompanyGoodsReceiptForm />
                </Layout>
              </ProtectedRoute>
            </Route>
            <Route path="/test-intercompany-workflow">
              <ProtectedRoute>
                <Layout>
                  <TestIntercompanyWorkflow />
                </Layout>
              </ProtectedRoute>
            </Route>
            <Route path="/test-complete-workflow">
              <ProtectedRoute>
                <Layout>
                  <TestCompleteWorkflow />
                </Layout>
              </ProtectedRoute>
            </Route>
            <Route path="/quick-product-create">
              <ProtectedRoute>
                <Layout>
                  <QuickProductCreate />
                </Layout>
              </ProtectedRoute>
            </Route>
            <Route path="/products-dashboard">
              <ProtectedRoute>
                <Layout>
                  <ProductsDashboard />
                </Layout>
              </ProtectedRoute>
            </Route>
            <Route path="/company-products/:companyId">
              <ProtectedRoute>
                <Layout>
                  <CompanyProducts />
                </Layout>
              </ProtectedRoute>
            </Route>
            <Route path="/banking">
              <ProtectedRoute>
                <Layout>
                  <Banking />
                </Layout>
              </ProtectedRoute>
            </Route>
            <Route path="/sales-orders">
              <ProtectedRoute>
                <Layout>
                  <SalesOrders />
                </Layout>
              </ProtectedRoute>
            </Route>
            <Route path="/purchase-orders">
              <ProtectedRoute>
                <Layout>
                  <PurchaseOrders />
                </Layout>
              </ProtectedRoute>
            </Route>
            <Route path="/invoices">
              <ProtectedRoute>
                <Layout>
                  <Invoices />
                </Layout>
              </ProtectedRoute>
            </Route>
            <Route path="/bills">
              <ProtectedRoute>
                <Layout>
                  <Bills />
                </Layout>
              </ProtectedRoute>
            </Route>
            <Route path="/invoice-form">
              <ProtectedRoute>
                <Layout>
                  <InvoiceForm />
                </Layout>
              </ProtectedRoute>
            </Route>
            <Route path="/create-invoice-from-sales-order">
              <ProtectedRoute>
                <Layout>
                  <CreateInvoiceFromSalesOrder />
                </Layout>
              </ProtectedRoute>
            </Route>
            <Route path="/sales-order-payment-form">
              <ProtectedRoute>
                <Layout>
                  <SalesOrderPaymentForm />
                </Layout>
              </ProtectedRoute>
            </Route>
            <Route path="/delivery-notes">
              <ProtectedRoute>
                <Layout>
                  <DeliveryNotes />
                </Layout>
              </ProtectedRoute>
            </Route>
            <Route path="/credit-notes">
              <ProtectedRoute>
                <Layout>
                  <CreditNotes />
                </Layout>
              </ProtectedRoute>
            </Route>
            <Route path="/credit-notes-management">
              <ProtectedRoute>
                <Layout>
                  <CreditNotesManagement />
                </Layout>
              </ProtectedRoute>
            </Route>
            <Route path="/debit-notes">
              <ProtectedRoute>
                <Layout>
                  <DebitNotes />
                </Layout>
              </ProtectedRoute>
            </Route>
            <Route path="/debit-notes-management">
              <ProtectedRoute>
                <Layout>
                  <DebitNotesManagement />
                </Layout>
              </ProtectedRoute>
            </Route>
            <Route path="/intercompany-adjustments">
              <ProtectedRoute>
                <Layout>
                  <IntercompanyAdjustments />
                </Layout>
              </ProtectedRoute>
            </Route>
            <Route path="/payment-terms">
              <ProtectedRoute>
                <Layout>
                  <PaymentTerms />
                </Layout>
              </ProtectedRoute>
            </Route>
            <Route path="/journal-entries">
              <ProtectedRoute>
                <Layout>
                  <JournalEntries />
                </Layout>
              </ProtectedRoute>
            </Route>
            <Route path="/financial-reports">
              <ProtectedRoute>
                <Layout>
                  <FinancialReports />
                </Layout>
              </ProtectedRoute>
            </Route>
            <Route path="/tax-calculator">
              <ProtectedRoute>
                <Layout>
                  <TaxCalculator />
                </Layout>
              </ProtectedRoute>
            </Route>
            <Route component={NotFound} />
          </Switch>
        </CompanyProvider>
      </TenantProvider>
    </AuthProvider>
  );
}

export default App;
