import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';

// POS BILLING
import { PosBillingPage } from './pages/billing/PosBillingPage';

// BILLS & TRANSACTIONS
import { BillsPage } from './pages/bills/BillsPage';
import { BillDetailPage } from './pages/bills/BillDetailPage';

// PRODUCTS & CUSTOMERS
import { ProductsPage } from './pages/products/ProductsPage';
import { ProductDetailPage } from './pages/products/ProductDetailPage';
import { CustomersPage } from './pages/customers/CustomersPage';
import { CustomerDetailPage } from './pages/customers/CustomerDetailPage';

// SETTINGS (Includes Business, Billing, Printer & Staff)
import { SettingsPage } from './pages/settings/SettingsPage';

// PRICE TAGS & AUDIT
import { PriceTagGeneratorPage } from './pages/tags/PriceTagGeneratorPage';
import { SalesAuditPage } from './pages/audit/SalesAuditPage';

// Redirect helpers for legacy URLs
const RedirectBillId: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/bills/${id}`} replace />;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Login */}
        <Route path="/login" element={<Login />} />

        {/* Primary Authenticated Layout */}
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />

          {/* POS BILLING */}
          <Route path="billing/new" element={<PosBillingPage />} />
          <Route path="billing" element={<Navigate to="/billing/new" replace />} />

          {/* BILLS & TRANSACTIONS */}
          <Route path="bills" element={<BillsPage />} />
          <Route path="bills/:id" element={<BillDetailPage />} />

          {/* PRODUCTS & INVENTORY */}
          <Route path="products" element={<ProductsPage />} />
          <Route path="products/:id" element={<ProductDetailPage />} />

          {/* CUSTOMERS */}
          <Route path="customers" element={<CustomersPage />} />
          <Route path="customers/:id" element={<CustomerDetailPage />} />

          {/* PRICE TAGS & SALES AUDIT */}
          <Route path="tags" element={<PriceTagGeneratorPage />} />
          <Route path="audit" element={<SalesAuditPage />} />

          {/* SETTINGS (BUSINESS, BILLING, PRINTER, STAFF) */}
          <Route path="settings" element={<SettingsPage />} />

          {/* LEGACY URL BACKWARDS COMPATIBILITY REDIRECTS */}
          <Route path="invoices" element={<Navigate to="/bills" replace />} />
          <Route path="invoices/:id" element={<RedirectBillId />} />
          <Route path="orders" element={<Navigate to="/bills" replace />} />
          <Route path="orders/:id" element={<RedirectBillId />} />
          <Route path="payments" element={<Navigate to="/bills" replace />} />
          <Route path="inventory" element={<Navigate to="/products" replace />} />
          <Route path="inventory/history" element={<Navigate to="/products" replace />} />
          <Route path="collections" element={<Navigate to="/products" replace />} />
          <Route path="staff" element={<Navigate to="/settings" replace />} />
          <Route path="fulfillment" element={<Navigate to="/dashboard" replace />} />
          <Route path="shipping" element={<Navigate to="/dashboard" replace />} />
          <Route path="returns" element={<Navigate to="/dashboard" replace />} />
          <Route path="analytics" element={<Navigate to="/dashboard" replace />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
