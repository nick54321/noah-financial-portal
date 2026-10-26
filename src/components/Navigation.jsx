import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  CreditCard,
  Send,
  ArrowLeftRight,
  ShieldCheck,
  Award,
  Wallet,
  Menu,
  X,
  LogOut,
  UserCheck,
  Server,
  Settings,
} from 'lucide-react';

export const Sidebar = ({ isOpen, setIsOpen }) => {
  const { user, entitlements, logout } = useAuth();
  const navigate = useNavigate();

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'IBAN Accounts', path: '/accounts', icon: CreditCard, badge: entitlements?.usd || entitlements?.eur ? 'Active' : 'Upgrade' },
    { name: 'Payouts & Beneficiaries', path: '/payouts', icon: Send },
    { name: 'On-Ramp & Off-Ramp', path: '/conversions', icon: ArrowLeftRight },
    { name: 'KYC & Onboarding', path: '/onboarding', icon: ShieldCheck },
    { name: 'Subscription Plans', path: '/subscriptions', icon: Award },
    { name: 'Wallet Settings', path: '/wallet', icon: Wallet },
    { name: 'Domain & Webhooks', path: '/migration', icon: Server },
  ];

  if (user?.role === 'admin') {
    navItems.push({ name: 'Admin Pricing & Revenue', path: '/admin', icon: Settings });
  }

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 left-0 bottom-0 w-64 bg-slate-900 text-white z-50 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:z-auto ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } flex flex-col justify-between`}
      >
        <div>
          {/* Header / Brand */}
          <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-blue-500/30">
                N
              </div>
              <span className="text-lg font-bold tracking-tight text-white">
                NOAH <span className="text-blue-400 text-xs font-semibold uppercase px-1.5 py-0.5 bg-blue-900/50 rounded">Portal</span>
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="lg:hidden text-slate-400 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* User Brief */}
          <div className="p-4 mx-3 my-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-slate-200 font-semibold">
                {user?.full_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user?.full_name || 'Noah User'}
                </p>
                <p className="text-xs text-slate-400 truncate">{user?.email}</p>
              </div>
            </div>
            {user?.noah_onboarding_status === 'approved' ? (
              <div className="mt-2.5 flex items-center text-xs text-emerald-400 font-medium">
                <UserCheck className="w-3.5 h-3.5 mr-1" /> Verified Noah Identity
              </div>
            ) : (
              <div className="mt-2.5 flex items-center text-xs text-amber-400 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 mr-1" /> KYC Verification Needed
              </div>
            )}
          </div>

          {/* Nav Links */}
          <nav className="px-3 space-y-1 mt-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`
                  }
                >
                  <div className="flex items-center space-x-3">
                    <Icon className="w-5 h-5 text-slate-400 group-hover:text-white" />
                    <span>{item.name}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        item.badge === 'Active'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Footer Logout */}
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export const Navbar = ({ onMenuClick }) => {
  const { user, entitlements } = useAuth();

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 lg:px-8 flex items-center justify-between sticky top-0 z-30 shadow-sm">
      <div className="flex items-center space-x-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
          aria-label="Toggle Navigation Menu"
        >
          <Menu className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-bold text-slate-800 hidden sm:block">
          Financial Infrastructure Portal
        </h1>
      </div>

      <div className="flex items-center space-x-3 sm:space-x-4">
        {/* Wallet status pill */}
        <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-full bg-slate-100 text-xs font-medium text-slate-700 border border-slate-200">
          <Wallet className="w-3.5 h-3.5 text-blue-600" />
          <span>
            {user?.wallet_address
              ? `${user.wallet_address.slice(0, 6)}...${user.wallet_address.slice(-4)}`
              : 'No Wallet Connected'}
          </span>
        </div>

        {/* Plan status pill */}
        <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-blue-50 text-xs font-semibold text-blue-700 border border-blue-200">
          <Award className="w-3.5 h-3.5 text-blue-600" />
          <span>
            {entitlements?.combo
              ? 'Combo (USD+EUR)'
              : entitlements?.usd
              ? 'USD Plan'
              : entitlements?.eur
              ? 'EUR Plan'
              : 'No Active Subscription'}
          </span>
        </div>
      </div>
    </header>
  );
};
