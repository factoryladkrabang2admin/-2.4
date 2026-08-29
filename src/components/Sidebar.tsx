import React, { useState, useMemo } from 'react';
import { NavigationTab } from '../types';
import { LOGO_URL } from '../data/mockData';
import { 
  LayoutDashboard, 
  X, 
  Shirt,
  DoorOpen,
  Wrench,
  CalendarDays,
  Clock,
  CreditCard
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { DEFAULT_ADMIN_USER, AdminUserAccount } from '../data/mockData';
import { 
  BreadIcon, 
  BreadKind, 
  FloatingBreadParticles,
  CroissantIcon
} from './BreadIcons';
import { RotatingAvatar } from './RotatingAvatar';

interface SidebarProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  laundryCount?: number;
  maintenanceCount?: number;
  isAuthenticated?: boolean;
  currentUser?: AdminUserAccount;
  onLogin?: () => void;
  onLogout?: () => void;
  onOpenProfile?: () => void;
  onOpenSettings?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  mobileOpen,
  onCloseMobile,
  isAuthenticated = true,
  currentUser = DEFAULT_ADMIN_USER,
  onLogin,
  onLogout,
  onOpenProfile,
  onOpenSettings,
}) => {
  const { t, language } = useLanguage();
  const [activeBreadHover, setActiveBreadHover] = useState<string | null>(null);

  const navItems: { 
    id: NavigationTab; 
    label: string; 
    icon: React.ReactNode; 
    breadKind: BreadKind; 
    breadName: string;
    requiresAuth: boolean;
    isExternal?: boolean;
    url?: string;
  }[] = [
    {
      id: 'dashboard',
      label: t.dashboard,
      icon: <LayoutDashboard className="w-5 h-5" />,
      breadKind: 'croissant',
      breadName: 'ครัวซองต์เนยสด',
      requiresAuth: true,
    },
    {
      id: 'laundry',
      label: t.laundryTracking,
      icon: <Shirt className="w-5 h-5" />,
      breadKind: 'toast',
      breadName: 'ขนมปังปิ้งเนยฉ่ำ',
      requiresAuth: false,
    },
    {
      id: 'meeting_room',
      label: t.meetingRoomBooking,
      icon: <DoorOpen className="w-5 h-5" />,
      breadKind: 'bagel',
      breadName: 'เบเกิลอบหอมกรุ่น',
      requiresAuth: false,
    },
    {
      id: 'maintenance',
      label: t.maintenanceTracking,
      icon: <Wrench className="w-5 h-5" />,
      breadKind: 'pretzel',
      breadName: 'เพรทเซลอบเกลือ',
      requiresAuth: true,
    },
    {
      id: 'schedule',
      label: t.workSchedule,
      icon: <CalendarDays className="w-5 h-5" />,
      breadKind: 'baguette',
      breadName: 'บาแกตต์กรอบนอกนุ่มใน',
      requiresAuth: true,
    },
    {
      id: 'ot',
      label: t.otCheck,
      icon: <Clock className="w-5 h-5" />,
      breadKind: 'donut',
      breadName: 'โดนัทหวานกรอบ',
      requiresAuth: true,
    },
    {
      id: 'payslip',
      label: t.payslip,
      icon: <CreditCard className="w-5 h-5" />,
      breadKind: 'farmhouse',
      breadName: 'ขนมปังฟาร์มเฮ้าส์',
      requiresAuth: true,
      isExternal: true,
      url: 'https://epay.pbplc.co.th/',
    },
  ];

  const visibleNavItems = useMemo(() => {
    if (isAuthenticated) {
      return navItems;
    }
    // General users can only view Laundry and Meeting Rooms
    return navItems.filter((item) => !item.requiresAuth);
  }, [isAuthenticated, navItems]);

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-xs transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      {/* Main Sidebar Container - Animated Rainbow Background with Floating Bakery Items */}
      <aside
        className={`fixed left-0 top-0 h-screen w-[280px] animated-rainbow-sidebar border-r border-white/20 shadow-2xl flex flex-col z-50 transition-transform duration-300 ease-in-out md:translate-x-0 overflow-hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Soft Glass Tint Overlay for High Contrast & Text Legibility */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-[#0a1128]/45 to-black/60 backdrop-blur-[2px] pointer-events-none z-0" />

        {/* Ambient Floating Bread Particles across the Rainbow Sky */}
        <FloatingBreadParticles />

        {/* Foreground Content with Relative Positioning */}
        <div className="relative z-10 flex flex-col h-full py-6 select-none">
          {/* Brand Header */}
          <div className="px-5 mb-6 flex items-center justify-between">
            <div 
              className="flex items-center gap-3 cursor-pointer group"
              onClick={() => {
                if (!isAuthenticated) {
                  onSelectTab('laundry');
                } else {
                  onSelectTab('dashboard');
                }
                onCloseMobile();
              }}
            >
              {/* Rotating Avatar Face Icon Container */}
              <div className="relative shrink-0 flex items-center justify-center group-hover:scale-105 transition-all duration-300">
                <RotatingAvatar size={44} />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-base font-extrabold text-white tracking-tight leading-snug drop-shadow-md truncate" title={t.appName}>
                  {t.appName}
                </h1>
              </div>
            </div>

            {/* Close button on mobile */}
            <button 
              onClick={onCloseMobile}
              className="md:hidden text-white/80 hover:text-white p-2 rounded-xl bg-black/20 hover:bg-black/40 border border-white/10 cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links with Bread Partner Icons */}
          <nav className="flex-1 px-3 space-y-2 overflow-y-auto">
            {visibleNavItems.map((item) => {
              const isActive = currentTab === item.id;
              const isHovered = activeBreadHover === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.isExternal && item.url) {
                      window.open(item.url, '_blank', 'noopener,noreferrer');
                    } else if (item.id === 'settings' && onOpenSettings) {
                      onOpenSettings();
                    } else {
                      onSelectTab(item.id);
                    }
                    onCloseMobile();
                  }}
                  onMouseEnter={() => setActiveBreadHover(item.id)}
                  onMouseLeave={() => setActiveBreadHover(null)}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-medium transition-all duration-300 group cursor-pointer backdrop-blur-md border ${
                    isActive
                      ? 'text-white bg-white/25 border-white/40 shadow-lg font-bold pl-4 scale-[1.02]'
                      : 'text-white/85 hover:text-white bg-black/20 hover:bg-white/15 border-white/10 hover:border-white/25 hover:scale-[1.01]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span 
                      className={`p-1.5 rounded-xl transition-all duration-300 ${
                        isActive 
                          ? 'bg-white/30 text-white shadow-xs scale-110' 
                          : 'bg-black/30 text-white/90 group-hover:bg-white/20 group-hover:scale-110'
                      }`}
                    >
                      {item.icon}
                    </span>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="tracking-wide drop-shadow-xs font-semibold truncate">{item.label}</span>
                    </div>
                  </div>

                  {/* Distinct Animated Bread Icon for each navigation tab */}
                  <div 
                    className={`transition-all duration-300 transform flex items-center justify-center shrink-0 ${
                      isActive 
                        ? 'scale-125 rotate-6 animate-bread-bob' 
                        : isHovered 
                        ? 'scale-120 -rotate-12 animate-bread-wobble' 
                        : 'scale-100 opacity-90 group-hover:scale-110'
                    }`}
                    title={item.breadName}
                  >
                    <BreadIcon kind={item.breadKind} size={24} />
                  </div>
                </button>
              );
            })}
          </nav>
        </div>
      </aside>
    </>
  );
};


