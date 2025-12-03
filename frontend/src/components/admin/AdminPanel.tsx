/**
 * Admin Panel - Trang quản lý admin chính
 */
import React, { useState } from 'react';
import { LayoutDashboard, Users, FileText, Settings } from 'lucide-react';
import { AdminDashboard, UserManagement, PostManagement } from './index';

interface AdminPanelProps {
  showToast: (msg: string, type: 'success' | 'error') => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ showToast, activeTab, onTabChange }) => {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'users', label: 'Quản lý Users', icon: Users },
    { id: 'posts', label: 'Quản lý Posts', icon: FileText },
  ];

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-neutral-200">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Icon size={18} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div>
        {activeTab === 'dashboard' && <AdminDashboard showToast={showToast} />}
        {activeTab === 'users' && <UserManagement showToast={showToast} />}
        {activeTab === 'posts' && <PostManagement showToast={showToast} />}
      </div>
    </div>
  );
};

export default AdminPanel;

