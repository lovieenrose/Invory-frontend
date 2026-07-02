import React from 'react';
import Sidebar from './Sidebar';

export default function AppLayout({ children }) {
  return (
    <div className="min-h-screen bg-paper">
      <Sidebar />
      <div className="md:pl-64">
        <main className="pb-20 md:pb-8">{children}</main>
      </div>
    </div>
  );
}
