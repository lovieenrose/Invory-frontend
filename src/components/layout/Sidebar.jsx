import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutGrid, Boxes, Truck, ShoppingCart, PiggyBank, LogOut, Package, Settings } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { initials } from '../../utils/format';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutGrid, end: true },
  { to: '/inventory', label: 'Inventory', icon: Boxes },
  { to: '/incoming-stock', label: 'Incoming Stock', icon: Truck },
  { to: '/sales', label: 'Sales / POS', icon: ShoppingCart },
  { to: '/financials', label: 'Financials', icon: PiggyBank },
];

const BOTTOM_NAV_ITEMS = [
  { to: '/settings', label: 'Settings', icon: Settings },
];

function NavItem({ to, label, icon: Icon, end, mobile }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        mobile
          ? `flex flex-col items-center justify-center gap-1 flex-1 py-2.5 text-xs font-medium transition-colors ${
              isActive ? 'text-brand-500' : 'text-ink-faint'
            }`
          : `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              isActive ? 'bg-brand-50 text-brand-600' : 'text-ink-soft hover:bg-paper hover:text-ink'
            }`
      }
    >
      <Icon size={mobile ? 20 : 18} strokeWidth={2} />
      {mobile ? <span>{label}</span> : <span>{label}</span>}
    </NavLink>
  );
}

export default function Sidebar() {
  const { profile, logout } = useAuth();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r border-border bg-surface">
        <div className="flex items-center gap-2.5 px-5 h-16 border-b border-border">
          <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
            <Package size={17} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="font-display font-semibold text-lg tracking-tight">Invory</span>
        </div>

        <nav className="flex-1 flex flex-col gap-1 p-3 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
        </nav>

        <div className="p-3 border-t border-border">
          <nav className="flex flex-col gap-1 mb-3">
            {BOTTOM_NAV_ITEMS.map((item) => (
              <NavItem key={item.to} {...item} />
            ))}
          </nav>
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-semibold shrink-0">
              {initials(profile?.business_name || 'Seller')}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink truncate">{profile?.business_name || 'My Business'}</p>
              <p className="text-xs text-ink-faint truncate">{profile?.full_name || 'Seller account'}</p>
            </div>
            <button
              onClick={logout}
              className="p-1.5 rounded-md text-ink-faint hover:text-rust-500 hover:bg-rust-50 transition-colors"
              title="Log out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-surface border-t border-border flex items-stretch pb-[env(safe-area-inset-bottom)]">
        {NAV_ITEMS.map((item) => (
          <NavItem key={item.to} {...item} mobile />
        ))}
        {BOTTOM_NAV_ITEMS.map((item) => (
          <NavItem key={item.to} {...item} mobile />
        ))}
      </nav>
    </>
  );
}
