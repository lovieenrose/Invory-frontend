import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './routes/ProtectedRoute';
import { CurrencyProvider } from './context/CurrencyContext';
import AppLayout from './components/layout/AppLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import IncomingStock from './pages/IncomingStock';
import Sales from './pages/Sales';
import Financials from './pages/Financials';
import Pricelist from './pages/Pricelist';
import Settings from './pages/Settings';

/**
 * Route table. Every authenticated feature module is mounted once here
 * inside AppLayout — adding a new module (e.g. "/invoices") means adding
 * one <Route> plus its sidebar entry in Sidebar.jsx.
 */
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <CurrencyProvider>
              <AppLayout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/inventory" element={<Inventory />} />
                  <Route path="/incoming-stock" element={<IncomingStock />} />
                  <Route path="/sales" element={<Sales />} />
                  <Route path="/pricelist" element={<Pricelist />} />
                  <Route path="/financials" element={<Financials />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </AppLayout>
            </CurrencyProvider>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
