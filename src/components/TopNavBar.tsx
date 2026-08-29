import React, { useState } from 'react';
import { CURRENT_USER_AVATAR } from '../data/mockData';
import { 
  Search, 
  Bell, 
  Menu, 
  ChevronDown, 
  Check, 
  Settings, 
  User, 
  LogOut,
  LogIn,
  Globe,
  HeartHandshake,
  ExternalLink
} from 'lucide-react';
import { NavigationTab, LaundryOrder } from '../types';
import { useLanguage, LANGUAGE_CONFIGS, getLanguageConfig } from '../contexts/LanguageContext';
import { FlagIcon } from './FlagIcon';
import { RotatingAvatar } from './RotatingAvatar';

import { DEFAULT_ADMIN_USER, AdminUserAccount, isUserAdminOrSupervisor } from '../data/mockData';

interface TopNavBarProps {
  currentTab: NavigationTab;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenMobile: () => void;
  onOpenSettings: () => void;
  onOpenProfile: () => void;
  unreadNotificationsCount?: number;
  onToggleNotifications: () => void;
  onOpenHelp?: () => void;
  laundryOrders?: LaundryOrder[];
  onSimulateOrder?: (newOrder: LaundryOrder) => void;
  isAuthenticated?: boolean;
  currentUser?: AdminUserAccount;
  onLogin?: () => void;
  onLogout?: () => void;
}

export const TopNavBar: React.FC<TopNavBarProps> = ({
  currentTab,
  searchQuery,
  onSearchChange,
  onOpenMobile,
  onOpenSettings,
  onOpenProfile,
  unreadNotificationsCount = 3,
  onToggleNotifications,
  laundryOrders = [],
  onSimulateOrder,
  isAuthenticated = true,
  currentUser = DEFAULT_ADMIN_USER,
  onLogin,
  onLogout,
}) => {
  const { language, setLanguage, t } = useLanguage();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);

  const currentLang = getLanguageConfig(language);

  // Determine if current active user is the super admin or an administrator
  const isSuperAdmin = (currentUser?.username || '').toLowerCase() === 'reizosischen';
  const isUserAdmin = isUserAdminOrSupervisor(currentUser, isAuthenticated);

  const getPlaceholder = () => {
    switch (currentTab) {
      case 'reports':
        return t.searchReports;
      case 'laundry':
        return t.searchLaundry;
      case 'maintenance':
        return language === 'th' ? 'ค้นหาเลขที่ใบงาน, แผนก, รายละเอียด, ผู้แจ้ง...' : 'Search work order, department, issues...';
      case 'schedule':
        return language === 'th' ? 'ค้นหาชื่อพนักงาน, วันที่, ฝ่ายงาน, สถานะทำงาน/วันหยุด/ลา...' : 'Search employee, date, department, shift status...';
      case 'ot':
        return language === 'th' ? 'ค้นหารหัสพนักงาน, ชื่อ, ฝ่ายงาน, เอกสาร OT...' : 'Search employee ID, name, department, OT doc...';
      case 'payslip':
        return language === 'th' ? 'ระบบสลิปเงินเดือนออนไลน์ e-Pay (epay.pbplc.co.th)...' : 'e-Pay online payslip system...';
      default:
        return t.searchPlaceholder;
    }
  };

  return (
    <header className="fixed top-0 right-0 w-full md:w-[calc(100%-280px)] h-16 bg-white/85 backdrop-blur-md border-b border-sky-100/80 z-30 flex items-center justify-between px-4 md:px-8 shadow-xs">
      {/* Left: Mobile menu toggle and title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobile}
          className="md:hidden p-2 text-[#43474e] hover:text-[#002045] hover:bg-[#f3f3f4] rounded-lg transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 md:hidden">
          <RotatingAvatar size={30} showSparkle={false} />
          <span className="font-semibold text-base text-[#002045] truncate max-w-[160px]">
            {t.appName}
          </span>
        </div>

        {/* Global Search Bar (on_left style matching screenshot) */}
        <div className="hidden sm:flex items-center relative w-64 md:w-80">
          <Search className="w-4 h-4 text-[#74777f] absolute left-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={getPlaceholder()}
            className="w-full pl-9 pr-3 py-1.5 bg-[#f3f3f4] hover:bg-[#ebecef] focus:bg-white text-sm text-[#1a1c1c] placeholder-[#74777f] border border-transparent focus:border-[#0061a5] rounded-md outline-hidden transition-all focus:ring-2 focus:ring-[#66affe]/20"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 text-xs text-[#74777f] hover:text-[#1a1c1c]"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Right: Actions & User Avatar */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Welfare (สวัสดิการ) Link - Restricted to Admin and Page Managers Only (Icon-only วางไว้หน้าไอคอนเปลี่ยนภาษา) */}
        {(isUserAdmin || isSuperAdmin || currentUser?.isAdmin) && (
          <a
            href="https://script.google.com/macros/s/AKfycbzWFzj_Qwy743_V7jeMlqufsK1n8xQYfCcSCqLIIK2WEeI01C76WealY4zEk87HW6-U4w/exec"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 bg-white hover:bg-rose-50/80 text-rose-600 hover:text-rose-700 border border-rose-200/90 hover:border-rose-300 rounded-xl transition-all cursor-pointer shadow-xs group flex items-center justify-center"
            title={language === 'th' ? 'สวัสดิการ (เฉพาะผู้ดูแลและแอดมินเพจ) - เปิดในแท็บใหม่' : 'Welfare System (Admin & Page Manager Only) - Open in new tab'}
            aria-label={language === 'th' ? 'สวัสดิการ' : 'Welfare'}
          >
            <HeartHandshake className="w-4 h-4 text-rose-500 group-hover:scale-110 transition-transform" />
          </a>
        )}

        {/* Quick Language Toggle Pill with Flag Only */}
        <div className="relative">
          <button
            onClick={() => setLangDropdownOpen(!langDropdownOpen)}
            className="flex items-center gap-1.5 px-2 py-1.5 bg-white hover:bg-[#d2e4ff]/40 border border-[#c4c6cf] hover:border-[#0061a5] rounded-xl transition-all cursor-pointer shadow-xs group"
            title={`${currentLang.nativeName} (${currentLang.englishName}) - Switch Language / สลับภาษา`}
          >
            <FlagIcon code={currentLang.code} size="md" className="shrink-0 group-hover:scale-105 transition-transform" />
            <ChevronDown className="w-3.5 h-3.5 text-[#74777f] group-hover:text-[#0061a5] transition-colors shrink-0" />
          </button>

          {langDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setLangDropdownOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-[#e2e8f0] py-2 z-50 animate-in fade-in zoom-in-95 duration-100 max-h-96 overflow-y-auto">
                <div className="px-3.5 py-1.5 text-[11px] font-bold text-[#74777f] uppercase tracking-wider border-b border-[#f3f3f4] flex items-center justify-between">
                  <span>{t.interfaceLanguage}</span>
                  <span className="text-[10px] bg-[#0061a5]/10 text-[#0061a5] font-bold px-2 py-0.5 rounded-full">
                    {LANGUAGE_CONFIGS.length} Languages
                  </span>
                </div>
                
                {LANGUAGE_CONFIGS.map((cfg) => {
                  const isSelected = language === cfg.code;
                  return (
                    <button
                      key={cfg.code}
                      type="button"
                      onClick={() => {
                        setLanguage(cfg.code);
                        setLangDropdownOpen(false);
                      }}
                      className={`w-full px-3 py-2.5 text-left text-xs flex items-center justify-between transition-colors cursor-pointer ${
                        isSelected ? 'bg-[#d2e4ff]/40 text-[#002045] font-bold' : 'text-[#43474e] hover:bg-[#f3f3f4]'
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-white shadow-2xs border border-[#e2e8f0] flex items-center justify-center shrink-0">
                          <FlagIcon code={cfg.code} size="sm" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-[#002045]">{cfg.nativeName}</span>
                            <span className="text-[10px] font-extrabold px-1.5 py-0.2 bg-[#002045] text-white rounded">
                              {cfg.shortCode}
                            </span>
                          </div>
                          <div className="text-[10px] text-[#74777f]">{cfg.englishName} ({cfg.countryName})</div>
                        </div>
                      </span>
                      {isSelected && (
                        <span className="w-5 h-5 rounded-full bg-[#0061a5] text-white flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Notifications Button */}
        <button
          onClick={onToggleNotifications}
          className="relative p-2 text-[#43474e] hover:text-[#002045] hover:bg-[#f3f3f4] rounded-full transition-colors cursor-pointer"
          aria-label={t.notifications}
          title={t.notifications}
        >
          <Bell className="w-5 h-5" />
          {unreadNotificationsCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-[#ba1a1a] text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white shadow-xs">
              {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
            </span>
          )}
        </button>

        {/* Settings Button - Only visible and accessible to Admins & Super Admins */}
        {isUserAdmin && (
          <button
            onClick={onOpenSettings}
            className="p-2 text-[#43474e] hover:text-[#002045] hover:bg-[#f3f3f4] rounded-full transition-colors flex items-center justify-center cursor-pointer"
            aria-label={t.settings}
            title={t.settings}
          >
            <Settings className="w-5 h-5" />
          </button>
        )}

        <div className="h-6 w-px bg-[#e2e8f0] mx-1 hidden sm:block" />

        {/* User Profile Pill / Menu or Login Button */}
        {isAuthenticated ? (
          <div className="relative">
            <button
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="flex items-center gap-2 p-1 rounded-full hover:ring-2 hover:ring-[#66affe]/40 transition-all focus:outline-hidden cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full overflow-hidden border border-[#c4c6cf] relative bg-[#002045] flex items-center justify-center text-white font-extrabold text-xs shadow-2xs">
                {currentUser.avatarUrl ? (
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.name || currentUser.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{currentUser.name ? currentUser.name.slice(0, 2).toUpperCase() : 'RZ'}</span>
                )}
                <span className="absolute bottom-0 right-0 w-2 h-2 bg-[#10b981] rounded-full border border-white" />
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[#74777f] hidden md:block" />
            </button>

            {/* Profile Dropdown Menu */}
            {profileDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setProfileDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-[#e2e8f0] py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-4 py-2 border-b border-[#f3f3f4] flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden border border-[#c4c6cf] bg-[#002045] flex items-center justify-center text-white font-extrabold text-xs shrink-0 shadow-2xs">
                      {currentUser.avatarUrl ? (
                        <img
                          src={currentUser.avatarUrl}
                          alt={currentUser.name || currentUser.username}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>{currentUser.name ? currentUser.name.slice(0, 2).toUpperCase() : 'RZ'}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-[#1a1c1c] truncate">{currentUser.name || 'reizosischen'}</p>
                      <p className="text-xs text-[#74777f] font-mono truncate">@{currentUser.username || 'reizosischen'}</p>
                      <div className="mt-1 flex items-center gap-1">
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.2 text-[10px] font-bold rounded truncate max-w-full ${
                          (currentUser.isAdmin || currentUser.username.toLowerCase() === 'reizosischen' || (currentUser.role && (currentUser.role.includes('Admin') || currentUser.role.includes('ผู้ดูแลระบบ'))))
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-[#d2e4ff] text-[#001d37]'
                        }`}>
                          {(currentUser.isAdmin || currentUser.username.toLowerCase() === 'reizosischen' || (currentUser.role && (currentUser.role.includes('Admin') || currentUser.role.includes('ผู้ดูแลระบบ')))) && (
                            <span className="text-amber-600 font-extrabold">👑</span>
                          )}
                          <span>{currentUser.role || t.adminEnterprise}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        onOpenProfile();
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-[#43474e] hover:bg-[#f3f3f4] hover:text-[#002045] flex items-center gap-2.5 cursor-pointer"
                    >
                      <User className="w-4 h-4 text-[#74777f]" />
                      {t.profileDetails}
                    </button>
                    {isUserAdmin && (
                      <button
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          onOpenSettings();
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-[#43474e] hover:bg-[#f3f3f4] hover:text-[#002045] flex items-center gap-2.5 cursor-pointer"
                      >
                        <Settings className="w-4 h-4 text-[#74777f]" />
                        {t.workspaceSettings}
                      </button>
                    )}
                  </div>

                  <div className="border-t border-[#f3f3f4] pt-1">
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        onLogout?.();
                      }}
                      className="w-full px-4 py-2 text-left text-sm font-semibold text-[#ba1a1a] hover:bg-[#ffdad6]/50 flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 text-[#ba1a1a]" />
                      {t.signOut}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <button
            onClick={onLogin}
            className="p-2 text-[#002045] hover:text-[#0061a5] hover:bg-[#d2e4ff]/40 bg-slate-100/90 rounded-full transition-all duration-200 flex items-center justify-center cursor-pointer shadow-2xs active:scale-95 border border-slate-200/80 shrink-0"
            aria-label={t.signIn}
            title={language === 'th' ? 'เข้าสู่ระบบ (Sign In)' : t.signIn}
          >
            <LogIn className="w-5 h-5 text-[#002045]" />
          </button>
        )}
      </div>
    </header>
  );
};

