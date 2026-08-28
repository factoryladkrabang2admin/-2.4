import React, { useState, useEffect } from 'react';
import { 
  X, 
  Settings, 
  Bell, 
  Shield, 
  Sliders, 
  Check, 
  Globe,
  Sparkles,
  KeyRound,
  Eye,
  EyeOff,
  Copy,
  Trash2,
  RotateCcw,
  Database,
  AlertTriangle,
  CheckCircle2,
  Users,
  Search,
  Lock,
  UserCheck,
  UserX,
  BadgeCheck,
  ShieldCheck,
  ShieldAlert,
  Crown,
  UserCog,
  Edit3,
  FileEdit,
  Pencil,
  Info
} from 'lucide-react';
import { useLanguage, LANGUAGE_CONFIGS } from '../contexts/LanguageContext';
import { FlagIcon } from './FlagIcon';
import { DEFAULT_ADMIN_USER, AdminUserAccount } from '../data/mockData';
import { realtimeHub } from '../services/realtimeService';

export type SettingsTabType = 'language' | 'general' | 'notifications' | 'security';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: SettingsTabType;
  currentUser?: AdminUserAccount;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, 
  onClose,
  initialTab = 'language',
  currentUser,
}) => {
  const { language, setLanguage, t } = useLanguage();
  const [activeTab, setActiveTab] = useState<SettingsTabType>(initialTab);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [slackSync, setSlackSync] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [showAdminPass, setShowAdminPass] = useState(false);

  // Determine if current active user is the super admin (reizosischen) or an administrator
  const activeUser = currentUser || (() => {
    try {
      const saved = localStorage.getItem('proworkflow_current_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  })();
  const isSuperAdmin = (activeUser?.username || '').toLowerCase() === 'reizosischen';
  const isUserAdmin = Boolean(
    activeUser?.isAdmin ||
    isSuperAdmin ||
    (activeUser?.role && (
      activeUser.role.toLowerCase().includes('admin') ||
      activeUser.role.includes('ผู้ดูแลระบบ') ||
      activeUser.role.includes('ผู้ดูแล')
    )) ||
    activeUser?.permissions?.canDeleteData
  );

  // Sample data management state
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [keepGoogleSheetData, setKeepGoogleSheetData] = useState(true);
  const [clearActionFeedback, setClearActionFeedback] = useState<{ type: 'cleared' | 'restored' | null; message: string }>({ type: null, message: '' });

  // Counts of current stored sample items
  const [currentOrderCount, setCurrentOrderCount] = useState(0);
  const [currentProjectCount, setCurrentProjectCount] = useState(0);

  // Registered users state
  const [registeredUsers, setRegisteredUsers] = useState<AdminUserAccount[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [copiedUserPass, setCopiedUserPass] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [confirmClearAllUsers, setConfirmClearAllUsers] = useState(false);
  const [userActionToast, setUserActionToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  const [adminAuth, setAdminAuth] = useState<AdminUserAccount>(() => {
    try {
      const saved = localStorage.getItem('proworkflow_admin_auth');
      return saved ? JSON.parse(saved) : DEFAULT_ADMIN_USER;
    } catch {
      return DEFAULT_ADMIN_USER;
    }
  });

  const [adminUsernameInput, setAdminUsernameInput] = useState(adminAuth.username || 'reizosischen');
  const [adminPasswordInput, setAdminPasswordInput] = useState(adminAuth.password || '724754');

  // Load and refresh settings data
  const refreshSettingsData = () => {
    try {
      const saved = localStorage.getItem('proworkflow_admin_auth');
      const data = saved ? JSON.parse(saved) : DEFAULT_ADMIN_USER;
      setAdminAuth(data);
      setAdminUsernameInput(data.username || 'reizosischen');
      setAdminPasswordInput(data.password || '724754');

      // Update registered users
      const users = realtimeHub.getStoredRegisteredUsers();
      setRegisteredUsers(users);

      // Update counts
      const orders = realtimeHub.getStoredLaundryOrders();
      const projects = realtimeHub.getStoredProjects();
      setCurrentOrderCount(orders.length);
      setCurrentProjectCount(projects.length);
    } catch (e) {
      console.warn('Error refreshing settings data:', e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (initialTab === 'security' && !isUserAdmin) {
        setActiveTab('general');
      } else if (initialTab) {
        setActiveTab(initialTab);
      }
      refreshSettingsData();
    }
  }, [isOpen, initialTab, isUserAdmin]);

  // Subscribe to real-time events for registered users and sync
  useEffect(() => {
    if (!isOpen) return;

    const unsubscribe = realtimeHub.subscribe((msg) => {
      if (msg.type === 'USER_REGISTERED' || msg.type === 'SYNC_ALL') {
        const users = realtimeHub.getStoredRegisteredUsers();
        setRegisteredUsers(users);
      }
    });

    return () => unsubscribe();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyPassword = () => {
    navigator.clipboard?.writeText(adminPasswordInput);
    setCopiedPassword(true);
    setTimeout(() => setCopiedPassword(false), 1500);
  };

  const handleToggleUserPassword = (username: string) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [username]: !prev[username]
    }));
  };

  const handleCopyUserPassword = (username: string, pass: string) => {
    navigator.clipboard?.writeText(pass);
    setCopiedUserPass(username);
    setTimeout(() => setCopiedUserPass(null), 1500);
  };

  const handleDeleteUser = (username: string) => {
    realtimeHub.deleteRegisteredUser(username);
    setRegisteredUsers(realtimeHub.getStoredRegisteredUsers());
    setUserToDelete(null);
  };

  const handleClearAllRegisteredUsers = () => {
    realtimeHub.saveRegisteredUsers([]);
    setRegisteredUsers([]);
    setConfirmClearAllUsers(false);
  };

  const handleToggleAdminRole = (username: string) => {
    const users = realtimeHub.getStoredRegisteredUsers();
    const targetUser = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (!targetUser) return;

    const newIsAdmin = !targetUser.isAdmin;
    const updatedUsers = users.map(u => {
      if (u.username.toLowerCase() === username.toLowerCase()) {
        const empCode = (u.role.match(/(?:รหัสพนักงาน:?\s*|EMP:?\s*)([A-Z0-9_-]+)/i) || [])[1] || '';
        const baseRole = empCode ? `รหัสพนักงาน: ${empCode}` : 'เจ้าหน้าที่ปฏิบัติการ';
        return {
          ...u,
          isAdmin: newIsAdmin,
          role: newIsAdmin 
            ? (empCode ? `ผู้ดูแลระบบ (Admin) • ${empCode}` : (language === 'th' ? 'ผู้ดูแลระบบ (Admin)' : 'Administrator'))
            : baseRole,
          canEdit: newIsAdmin ? true : (u.canEdit ?? true),
          permissions: {
            canEditData: true,
            canManageOrders: true,
            canManageProjects: true,
            canDeleteData: newIsAdmin,
            ...(u.permissions || {})
          }
        };
      }
      return u;
    });

    realtimeHub.saveRegisteredUsers(updatedUsers);
    setRegisteredUsers(updatedUsers);
    try {
      localStorage.setItem('proworkflow_registered_users', JSON.stringify(updatedUsers));
      const cur = localStorage.getItem('proworkflow_current_user');
      if (cur) {
        const parsedCur = JSON.parse(cur);
        if (parsedCur.username.toLowerCase() === username.toLowerCase()) {
          const updatedCur = updatedUsers.find(u => u.username.toLowerCase() === username.toLowerCase());
          if (updatedCur) {
            localStorage.setItem('proworkflow_current_user', JSON.stringify(updatedCur));
          }
        }
      }
    } catch {
      // storage
    }

    setUserActionToast({
      message: newIsAdmin
        ? (language === 'th' ? `ปรับสิทธิ์ @${username} เป็นแอดมิน (Admin) เรียบร้อยแล้ว` : `Granted Admin privileges to @${username}`)
        : (language === 'th' ? `เปลี่ยนสิทธิ์ @${username} เป็นสมาชิกทั่วไปเรียบร้อยแล้ว` : `Changed @${username} to Member role`),
      type: 'success'
    });
    setTimeout(() => setUserActionToast(null), 3000);
  };

  const handleToggleEditPermission = (username: string) => {
    const users = realtimeHub.getStoredRegisteredUsers();
    const targetUser = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (!targetUser) return;

    const newCanEdit = targetUser.canEdit === false ? true : false;
    const updatedUsers = users.map(u => {
      if (u.username.toLowerCase() === username.toLowerCase()) {
        return {
          ...u,
          canEdit: newCanEdit,
          permissions: {
            ...(u.permissions || {}),
            canEditData: newCanEdit,
            canManageOrders: newCanEdit,
            canManageProjects: newCanEdit
          }
        };
      }
      return u;
    });

    realtimeHub.saveRegisteredUsers(updatedUsers);
    setRegisteredUsers(updatedUsers);
    try {
      localStorage.setItem('proworkflow_registered_users', JSON.stringify(updatedUsers));
      const cur = localStorage.getItem('proworkflow_current_user');
      if (cur) {
        const parsedCur = JSON.parse(cur);
        if (parsedCur.username.toLowerCase() === username.toLowerCase()) {
          const updatedCur = updatedUsers.find(u => u.username.toLowerCase() === username.toLowerCase());
          if (updatedCur) {
            localStorage.setItem('proworkflow_current_user', JSON.stringify(updatedCur));
          }
        }
      }
    } catch {
      // storage
    }

    setUserActionToast({
      message: newCanEdit
        ? (language === 'th' ? `เปิดสิทธิ์การแก้ไขข้อมูลให้ @${username} แล้ว` : `Enabled edit permissions for @${username}`)
        : (language === 'th' ? `จำกัดสิทธิ์ @${username} เป็นดูได้อย่างเดียว (ห้ามแก้ไข)` : `Restricted @${username} to view-only mode`),
      type: 'success'
    });
    setTimeout(() => setUserActionToast(null), 3000);
  };

  const handleUpdateGranularPermission = (
    username: string, 
    permKey: 'canEditData' | 'canManageOrders' | 'canManageProjects' | 'canDeleteData', 
    val: boolean
  ) => {
    const users = realtimeHub.getStoredRegisteredUsers();
    const updatedUsers = users.map(u => {
      if (u.username.toLowerCase() === username.toLowerCase()) {
        const currentPerms = u.permissions || {
          canEditData: u.canEdit !== false,
          canManageOrders: u.canEdit !== false,
          canManageProjects: u.canEdit !== false,
          canDeleteData: false,
        };
        const updatedPerms = { ...currentPerms, [permKey]: val };
        const anyEditPerm = Boolean(updatedPerms.canEditData || updatedPerms.canManageOrders || updatedPerms.canManageProjects);
        return {
          ...u,
          canEdit: anyEditPerm,
          permissions: updatedPerms
        };
      }
      return u;
    });

    realtimeHub.saveRegisteredUsers(updatedUsers);
    setRegisteredUsers(updatedUsers);
    try {
      localStorage.setItem('proworkflow_registered_users', JSON.stringify(updatedUsers));
      const cur = localStorage.getItem('proworkflow_current_user');
      if (cur) {
        const parsedCur = JSON.parse(cur);
        if (parsedCur.username.toLowerCase() === username.toLowerCase()) {
          const updatedCur = updatedUsers.find(u => u.username.toLowerCase() === username.toLowerCase());
          if (updatedCur) {
            localStorage.setItem('proworkflow_current_user', JSON.stringify(updatedCur));
          }
        }
      }
    } catch {
      // storage
    }
  };

  const handleClearSampleData = () => {
    const res = realtimeHub.clearAllSampleData({ keepGoogleSheetOrders: keepGoogleSheetData });
    if (res.success) {
      setClearActionFeedback({
        type: 'cleared',
        message: language === 'th' 
          ? 'ลบข้อมูลตัวอย่างในระบบทั้งหมดเรียบร้อยแล้ว!' 
          : 'All sample data has been completely removed from the system!'
      });
      setCurrentOrderCount(realtimeHub.getStoredLaundryOrders().length);
      setCurrentProjectCount(realtimeHub.getStoredProjects().length);
      setConfirmClearOpen(false);
      setTimeout(() => {
        setClearActionFeedback({ type: null, message: '' });
      }, 3500);
    }
  };

  const handleRestoreSampleData = () => {
    const res = realtimeHub.restoreSampleData();
    if (res.success) {
      setClearActionFeedback({
        type: 'restored',
        message: language === 'th' 
          ? 'กู้คืนข้อมูลตัวอย่างเริ่มต้นกลับมาเรียบร้อยแล้ว!' 
          : 'Sample demo data has been successfully restored!'
      });
      setCurrentOrderCount(realtimeHub.getStoredLaundryOrders().length);
      setCurrentProjectCount(realtimeHub.getStoredProjects().length);
      setTimeout(() => {
        setClearActionFeedback({ type: null, message: '' });
      }, 3500);
    }
  };

  const handleSave = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isSuperAdmin) {
      const updated: AdminUserAccount = {
        ...adminAuth,
        username: adminUsernameInput.trim() || 'reizosischen',
        name: adminUsernameInput.trim() || 'reizosischen',
        password: adminPasswordInput || '724754',
        lastLogin: 'Active Session'
      };
      setAdminAuth(updated);
      try {
        localStorage.setItem('proworkflow_admin_auth', JSON.stringify(updated));
      } catch {
        // storage error
      }
    }

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  // Filter registered users by search query
  const filteredRegisteredUsers = registeredUsers.filter(u => {
    if (!userSearchQuery.trim()) return true;
    const q = userSearchQuery.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      (u.role && u.role.toLowerCase().includes(q))
    );
  });

  if (!isOpen || !isUserAdmin) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Dark backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-xs" onClick={onClose} />

      {/* Modal Dialog Window with stopPropagation */}
      <div 
        className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-[#e2e8f0] overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150 flex flex-col md:flex-row max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Settings Sidebar */}
        <div className="w-full md:w-60 bg-[#f9f9f9] border-r border-[#e2e8f0] p-4 flex flex-col justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-5 px-2">
              <Settings className="w-5 h-5 text-[#002045]" />
              <span className="font-bold text-sm text-[#002045]">{t.settingsTitle}</span>
            </div>

            <div className="space-y-1 text-xs font-semibold">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveTab('language');
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-colors cursor-pointer ${
                  activeTab === 'language' ? 'bg-[#d2e4ff] text-[#001d37] font-bold shadow-2xs' : 'text-[#43474e] hover:bg-[#e8e8e8]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-[#0061a5]" />
                  <span>{t.languageSettings}</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 bg-white rounded font-mono font-bold uppercase text-[#0061a5]">
                  {language.toUpperCase()}
                </span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveTab('general');
                }}
                className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left transition-colors cursor-pointer ${
                  activeTab === 'general' ? 'bg-[#d2e4ff] text-[#001d37] font-bold shadow-2xs' : 'text-[#43474e] hover:bg-[#e8e8e8]'
                }`}
              >
                <Sliders className="w-4 h-4 text-[#0061a5]" />
                <span>{t.generalSettings}</span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveTab('notifications');
                }}
                className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left transition-colors cursor-pointer ${
                  activeTab === 'notifications' ? 'bg-[#d2e4ff] text-[#001d37] font-bold shadow-2xs' : 'text-[#43474e] hover:bg-[#e8e8e8]'
                }`}
              >
                <Bell className="w-4 h-4 text-[#0061a5]" />
                <span>{t.notificationsSettings}</span>
              </button>

              {/* Security & Access Tab - Only visible and accessible by Admins */}
              {isUserAdmin && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveTab('security');
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-colors cursor-pointer ${
                    activeTab === 'security' ? 'bg-[#d2e4ff] text-[#001d37] font-bold shadow-2xs' : 'text-[#43474e] hover:bg-[#e8e8e8]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[#0061a5]" />
                    <span>{t.securitySettings}</span>
                  </div>
                  {registeredUsers.length > 0 && (
                    <span className="px-1.5 py-0.2 bg-[#0061a5] text-white text-[10px] font-bold rounded-full">
                      {registeredUsers.length}
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>

          <div className="text-[11px] text-[#74777f] px-2 pt-4 border-t border-[#e2e8f0] truncate">
            {t.appName} v3.8.4 Enterprise
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col justify-between p-6 overflow-hidden">
          <div className="flex items-center justify-between pb-4 border-b border-[#e2e8f0]">
            <div>
              <h3 className="text-lg font-bold text-[#1a1c1c]">
                {activeTab === 'language' 
                  ? t.languageSettings 
                  : activeTab === 'general' 
                  ? t.generalSettings 
                  : activeTab === 'notifications' 
                  ? t.notificationsSettings 
                  : t.securitySettings}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-[#74777f] hover:text-[#1a1c1c] p-1 rounded-md hover:bg-[#f3f3f4] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="py-4 space-y-4 text-xs flex-1 overflow-y-auto pr-1">
            {/* Language Tab */}
            {activeTab === 'language' && (
              <div className="space-y-4">
                <div>
                  <label className="block font-bold text-sm text-[#1a1c1c] mb-1">
                    {t.interfaceLanguage}
                  </label>
                  <p className="text-[#74777f] text-xs mb-4">
                    {t.interfaceLanguageDesc}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {LANGUAGE_CONFIGS.map((cfg) => {
                    const isSelected = language === cfg.code;
                    const descriptions: Record<string, string> = {
                      th: 'แสดงผลเมนู แดชบอร์ด รายงาน และระบบติดตามผ้าเป็นภาษาไทยทั้งหมด',
                      en: 'Standard international terminology across all modules and pipelines.',
                    };

                    const activeLabels: Record<string, string> = {
                      th: 'ใช้งานอยู่',
                      en: 'Active',
                    };

                    return (
                      <div
                        key={cfg.code}
                        onClick={() => setLanguage(cfg.code)}
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                          isSelected
                            ? 'border-[#0061a5] bg-[#f0f7ff] shadow-sm'
                            : 'border-[#e2e8f0] bg-white hover:border-[#c4c6cf] hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3.5">
                          <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-white shadow-2xs border border-[#e2e8f0] w-14 shrink-0">
                            <FlagIcon code={cfg.code} size="md" />
                            <span className="mt-1 font-extrabold text-[10px] text-[#002045] bg-[#f0f4f9] px-1.5 py-0.2 rounded border border-[#e2e8f0]">
                              {cfg.shortCode}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-sm text-[#002045]">
                                {cfg.nativeName} ({cfg.englishName})
                              </h4>
                              {isSelected && (
                                <span className="px-2 py-0.2 bg-[#0061a5] text-white text-[10px] font-bold rounded-full">
                                  {activeLabels[language] || 'Active'}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-[#43474e] mt-0.5">
                              {descriptions[cfg.code] || `${cfg.englishName} interface`}
                            </p>
                          </div>
                        </div>

                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          isSelected ? 'border-[#0061a5] bg-[#0061a5] text-white' : 'border-[#c4c6cf]'
                        }`}>
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="p-3 bg-[#f8fafc] rounded-xl border border-[#e2e8f0] text-xs text-[#74777f] flex items-center gap-2 mt-2">
                  <Sparkles className="w-4 h-4 text-[#0061a5] shrink-0" />
                  <span>
                    {language === 'th' 
                      ? 'ระบบจะจดจำภาษาที่คุณเลือกไว้ใช้งานโดยอัตโนมัติสำหรับการเข้าใช้งานครั้งถัดไป'
                      : 'Your language choice is automatically saved for your next session.'}
                  </span>
                </div>
              </div>
            )}

            {/* General Tab */}
            {activeTab === 'general' && (
              <div className="space-y-5">
                <div>
                  <label className="block font-semibold text-[#1a1c1c] mb-1">{t.orgName}</label>
                  <input
                    type="text"
                    defaultValue={t.appName}
                    className="w-full px-3 py-2 border border-[#c4c6cf] rounded-lg text-xs outline-hidden focus:border-[#0061a5]"
                  />
                  <p className="text-[11px] text-[#74777f] mt-1.5">
                    {language === 'th' 
                      ? 'ชื่อองค์กรและระบบงานจะแสดงในส่วนหัวและรายงานอย่างเป็นทางการ' 
                      : 'Used in email headers, exports, and automated audit trails.'}
                  </p>
                </div>

                {/* Database & Sample Data Management Panel - Only visible and accessible by Admins */}
                {isUserAdmin && (
                  <div className="mt-6 pt-5 border-t border-[#e2e8f0]">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Database className="w-4 h-4 text-[#0061a5]" />
                        <h4 className="font-bold text-xs text-[#002045]">
                          {language === 'th' ? 'การจัดการข้อมูลตัวอย่างในระบบ' : 'Sample Data & Storage Management'}
                        </h4>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-900 rounded-full border border-amber-300 flex items-center gap-1">
                          <Crown className="w-2.5 h-2.5 text-amber-600 fill-amber-500" />
                          <span>{language === 'th' ? 'สิทธิ์ผู้ดูแลและแอดมิน' : 'Admin Access'}</span>
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full font-bold">
                          {currentOrderCount} {language === 'th' ? 'รายการผ้า' : 'orders'}
                        </span>
                      </div>
                    </div>

                    <p className="text-[11px] text-[#74777f] mb-3">
                      {language === 'th'
                        ? 'คุณสามารถเลือกลบข้อมูลตัวอย่างทั้งหมดเพื่อเริ่มต้นใช้งานด้วยข้อมูลจริง หรือกู้คืนข้อมูลตัวอย่างกลับมาได้ตลอดเวลา (เฉพาะผู้ดูแลและแอดมิน)'
                        : 'Reset or restore demo items to work exclusively with real factory production data (Admin & Managers only).'}
                    </p>

                    {/* Feedback toast message */}
                    {clearActionFeedback.type && (
                      <div className={`p-3 rounded-xl mb-3 flex items-center gap-2 text-xs font-semibold animate-in fade-in duration-200 ${
                        clearActionFeedback.type === 'cleared'
                          ? 'bg-rose-50 text-rose-800 border border-rose-200'
                          : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      }`}>
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>{clearActionFeedback.message}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {/* Clear Sample Data Button */}
                      <button
                        type="button"
                        onClick={() => setConfirmClearOpen(true)}
                        className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs hover:shadow-xs"
                      >
                        <Trash2 className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>{language === 'th' ? 'ลบข้อมูลตัวอย่างทั้งหมด' : 'Clear All Sample Data'}</span>
                      </button>

                      {/* Restore Sample Data Button */}
                      <button
                        type="button"
                        onClick={handleRestoreSampleData}
                        className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-[#002045] border border-slate-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs hover:shadow-xs"
                      >
                        <RotateCcw className="w-4 h-4 text-[#0061a5] shrink-0" />
                        <span>{language === 'th' ? 'กู้คืนข้อมูลตัวอย่างเริ่มต้น' : 'Restore Demo Sample Data'}</span>
                      </button>
                    </div>

                    {/* Confirmation Modal for Clearing Data */}
                    {confirmClearOpen && (
                      <div className="mt-3 p-4 bg-rose-50/80 rounded-xl border-2 border-rose-300 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-start gap-2.5">
                          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <h5 className="font-bold text-xs text-rose-900">
                              {language === 'th' ? 'ยืนยันการลบข้อมูลตัวอย่าง?' : 'Confirm Clear Sample Data?'}
                            </h5>
                            <p className="text-[11px] text-rose-800 mt-1">
                              {language === 'th'
                                ? 'ระบบจะลบข้อมูลจำลองของรายการผ้าและประวัติกิจกรรมทั้งหมด'
                                : 'This will purge simulated demo laundry orders and activities.'}
                            </p>

                            <div className="mt-2.5 mb-3 bg-white p-2.5 rounded-lg border border-rose-200">
                              <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={keepGoogleSheetData}
                                  onChange={(e) => setKeepGoogleSheetData(e.target.checked)}
                                  className="rounded text-rose-600 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                                />
                                <span className="font-medium text-[11px] text-rose-950">
                                  {language === 'th' 
                                    ? 'คงข้อมูลจริงที่ซิงค์จาก Google Sheet ไว้ (ลบเฉพาะข้อมูลจำลอง)' 
                                    : 'Keep real data synced from Google Sheet'}
                                </span>
                              </label>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={handleClearSampleData}
                                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-xs"
                              >
                                {language === 'th' ? 'ยืนยันลบข้อมูล' : 'Yes, Delete Demo Data'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmClearOpen(false)}
                                className="px-3 py-1.5 bg-white border border-[#c4c6cf] text-[#43474e] rounded-lg text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                              >
                                {language === 'th' ? 'ยกเลิก' : 'Cancel'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="space-y-4">
                <label className="flex items-center justify-between p-3 bg-[#f9f9f9] rounded-xl border border-[#e2e8f0] cursor-pointer">
                  <div>
                    <p className="font-semibold text-[#1a1c1c]">{t.emailDigest}</p>
                    <p className="text-[11px] text-[#74777f]">{t.emailDigestDesc}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={emailAlerts}
                    onChange={(e) => setEmailAlerts(e.target.checked)}
                    className="rounded text-[#0061a5] focus:ring-0 w-4 h-4"
                  />
                </label>

                <label className="flex items-center justify-between p-3 bg-[#f9f9f9] rounded-xl border border-[#e2e8f0] cursor-pointer">
                  <div>
                    <p className="font-semibold text-[#1a1c1c]">{t.realtimeSync}</p>
                    <p className="text-[11px] text-[#74777f]">{t.realtimeSyncDesc}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={slackSync}
                    onChange={(e) => setSlackSync(e.target.checked)}
                    className="rounded text-[#0061a5] focus:ring-0 w-4 h-4"
                  />
                </label>
              </div>
            )}

            {/* Security & Access Tab - Only visible and accessible by Admins */}
            {activeTab === 'security' && isUserAdmin && (
              <div className="space-y-5">
                {/* 1. Super Admin Account Credentials - Restricted to reizosischen */}
                {isSuperAdmin ? (
                  <div className="p-4 bg-gradient-to-br from-amber-50/40 via-white to-slate-50 rounded-2xl border border-amber-200 shadow-2xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-2.5 border-b border-slate-200">
                      <div className="flex items-center gap-2 text-[#002045] font-bold text-xs">
                        <KeyRound className="w-4 h-4 text-[#0061a5]" />
                        <span>{language === 'th' ? 'ข้อมูลการเข้าสู่ระบบของผู้ดูแลระบบสูงสุด (Super Admin)' : 'Administrator Credentials'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-extrabold border border-amber-300">
                          <Crown className="w-3 h-3 text-amber-600 fill-amber-500" />
                          <span>{language === 'th' ? 'ผู้ดูแลระบบสูงสุด (Admin)' : 'Super Admin'}</span>
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-300">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>{language === 'th' ? 'สิทธิ์แก้ไขเต็มรูปแบบ' : 'Full Edit Access'}</span>
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div>
                        <label className="block font-semibold text-[#1a1c1c] mb-1">
                          {language === 'th' ? '1. ชื่อผู้ใช้ (Username)' : '1. Username'}
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={adminUsernameInput}
                            onChange={(e) => setAdminUsernameInput(e.target.value)}
                            className="w-full px-3 py-2 border border-[#c4c6cf] rounded-lg text-xs font-mono font-bold text-[#002045] bg-white outline-hidden focus:border-[#0061a5]"
                            placeholder="reizosischen"
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block font-semibold text-[#1a1c1c]">
                            {language === 'th' ? '2. รหัสผ่าน (Password)' : '2. Password'}
                          </label>
                          <button
                            type="button"
                            onClick={handleCopyPassword}
                            className="text-[11px] font-medium text-[#0061a5] hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <Copy className="w-3 h-3" />
                            {copiedPassword ? (language === 'th' ? 'คัดลอกแล้ว!' : 'Copied!') : (language === 'th' ? 'คัดลอกรหัส' : 'Copy')}
                          </button>
                        </div>
                        <div className="relative">
                          <input
                            type={showAdminPass ? 'text' : 'password'}
                            value={adminPasswordInput}
                            onChange={(e) => setAdminPasswordInput(e.target.value)}
                            className="w-full pl-3 pr-10 py-2 border border-[#c4c6cf] rounded-lg text-xs font-mono font-bold tracking-wider text-[#002045] bg-white outline-hidden focus:border-[#0061a5]"
                            placeholder="724754"
                          />
                          <button
                            type="button"
                            onClick={() => setShowAdminPass(!showAdminPass)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#74777f] hover:text-[#002045] p-1 cursor-pointer"
                            title={showAdminPass ? 'Hide password' : 'Show password'}
                          >
                            {showAdminPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50/90 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-slate-200/90 text-slate-700 flex items-center justify-center shrink-0">
                      <Lock className="w-5 h-5 text-slate-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-xs text-[#002045]">
                          {language === 'th' ? 'ข้อมูลการเข้าสู่ระบบของผู้ดูแลระบบ (Admin Account)' : 'Administrator Credentials'}
                        </h4>
                        <span className="px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold">
                          {language === 'th' ? 'ซ่อนและจำกัดสิทธิ์' : 'Restricted'}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#74777f] mt-0.5">
                        {language === 'th' 
                          ? 'ซ่อนและจำกัดสิทธิ์การมองเห็นและแก้ไขเฉพาะผู้ใช้ @reizosischen เท่านั้น' 
                          : 'Hidden and restricted. Visibility and modification permissions are granted exclusively to @reizosischen.'}
                      </p>
                    </div>
                  </div>
                )}

                {/* 2. Registered Users & Access Management Section */}
                <div className="p-4 bg-white rounded-2xl border-2 border-[#0061a5]/20 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-2.5 border-b border-[#e2e8f0]">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-[#f0f7ff] text-[#0061a5] flex items-center justify-center shrink-0">
                        <Users className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-[#002045]">
                          {language === 'th' ? 'ข้อมูลผู้ลงทะเบียนเข้าใช้งานระบบ' : 'Registered User Accounts & Access Log'}
                        </h4>
                        <p className="text-[10px] text-[#74777f]">
                          {language === 'th' ? 'รายการผู้ที่ลงทะเบียนใหม่จะแสดงที่นี่โดยอัตโนมัติ' : 'Users registered from portal are listed here automatically'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#f0f7ff] text-[#0061a5] text-[10px] font-bold border border-[#b3d7ff]">
                        {registeredUsers.length} {language === 'th' ? 'บัญชีผู้ลงทะเบียน' : 'registered'}
                      </span>
                      {registeredUsers.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setConfirmClearAllUsers(true)}
                          className="text-[10px] text-rose-600 hover:text-rose-800 font-semibold px-2 py-0.5 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                          title="Clear all registered accounts"
                        >
                          {language === 'th' ? 'ล้างรายชื่อทั้งหมด' : 'Clear All'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Clear All Confirmation Prompt */}
                  {confirmClearAllUsers && (
                    <div className="mb-3 p-3 bg-rose-50 rounded-xl border border-rose-200 animate-in fade-in duration-150">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-xs font-bold text-rose-900">
                            {language === 'th' ? 'ยืนยันลบรายชื่อผู้ลงทะเบียนทั้งหมด?' : 'Clear all registered user accounts?'}
                          </p>
                          <p className="text-[11px] text-rose-700 mt-0.5">
                            {language === 'th' ? 'ผู้ใช้งานที่ลงทะเบียนไว้จะไม่สามารถเข้าสู่ระบบได้' : 'These users will no longer be able to log in.'}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <button
                              type="button"
                              onClick={handleClearAllRegisteredUsers}
                              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-[11px] font-bold cursor-pointer"
                            >
                              {language === 'th' ? 'ยืนยันล้างข้อมูล' : 'Yes, Clear All'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmClearAllUsers(false)}
                              className="px-2.5 py-1 bg-white border border-[#c4c6cf] text-[#43474e] rounded-md text-[11px] font-semibold hover:bg-slate-50 cursor-pointer"
                            >
                              {language === 'th' ? 'ยกเลิก' : 'Cancel'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Search Bar for Registered Users */}
                  {registeredUsers.length > 3 && (
                    <div className="relative mb-3">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#74777f]" />
                      <input
                        type="text"
                        value={userSearchQuery}
                        onChange={(e) => setUserSearchQuery(e.target.value)}
                        placeholder={language === 'th' ? 'ค้นหาชื่อ, ชื่อผู้ใช้, รหัสพนักงาน...' : 'Search registered users...'}
                        className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-[#c4c6cf] rounded-lg text-xs outline-hidden focus:border-[#0061a5] focus:bg-white"
                      />
                    </div>
                  )}

                  {/* User Action Feedback Toast */}
                  {userActionToast && (
                    <div className="mb-3 p-2.5 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs font-semibold animate-in fade-in duration-150">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{userActionToast.message}</span>
                    </div>
                  )}

                  {/* Registered Users List */}
                  {filteredRegisteredUsers.length > 0 ? (
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                      {filteredRegisteredUsers.map((u) => {
                        const isPassVisible = visiblePasswords[u.username] || false;
                        const isCopied = copiedUserPass === u.username;
                        const isConfirmingDelete = userToDelete === u.username;
                        const isUserAdmin = Boolean(u.isAdmin || (u.role && (u.role.includes('Admin') || u.role.includes('ผู้ดูแลระบบ'))));
                        const hasEditPermission = u.canEdit !== false;

                        return (
                          <div
                            key={u.username}
                            className={`p-3.5 rounded-xl border transition-all flex flex-col gap-3 ${
                              isUserAdmin 
                                ? 'bg-gradient-to-br from-amber-50/60 to-white border-amber-200 shadow-2xs' 
                                : 'bg-slate-50 hover:bg-[#f8fafc] border-slate-200'
                            }`}
                          >
                            {/* User Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className={`w-9 h-9 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs uppercase overflow-hidden ${
                                  isUserAdmin
                                    ? 'bg-gradient-to-br from-amber-500 to-amber-700 text-white ring-2 ring-amber-300'
                                    : 'bg-gradient-to-br from-[#0061a5] to-[#002045] text-white'
                                }`}>
                                  {u.avatarUrl ? (
                                    <img src={u.avatarUrl} alt={u.name || u.username} className="w-full h-full object-cover" />
                                  ) : isUserAdmin ? (
                                    <Crown className="w-4 h-4" />
                                  ) : (
                                    u.name ? u.name.charAt(0) : u.username.charAt(0)
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-bold text-xs text-[#002045] truncate">
                                      {u.name}
                                    </span>
                                    <span className="text-[10px] font-mono text-[#0061a5] bg-[#e1effe] px-1.5 py-0.2 rounded font-semibold">
                                      @{u.username}
                                    </span>
                                    {isUserAdmin && (
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-extrabold">
                                        <Crown className="w-3 h-3 text-amber-600 fill-amber-500" />
                                        <span>ADMIN</span>
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 text-[10px] text-[#74777f] mt-0.5 flex-wrap">
                                    <span className="font-semibold text-slate-700 bg-white px-1.5 py-0.2 rounded border border-slate-200">
                                      {u.role || 'เจ้าหน้าที่ปฏิบัติการ'}
                                    </span>
                                    {u.lastLogin && (
                                      <span>
                                        {language === 'th' ? `ลงทะเบียน: ${u.lastLogin}` : `Reg: ${u.lastLogin}`}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Right Action Icons: 1. Toggle Admin Role Icon Button & 2. Active/Delete */}
                              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                                {/* 1. ไอคอนสำหรับปรับเป็นแอดมิน (Admin Status Toggle Button) */}
                                <button
                                  type="button"
                                  onClick={() => handleToggleAdminRole(u.username)}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                                    isUserAdmin
                                      ? 'bg-amber-500 hover:bg-amber-600 text-white border border-amber-600 active:scale-95'
                                      : 'bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-900 border border-slate-300 hover:border-amber-300 active:scale-95'
                                  }`}
                                  title={
                                    isUserAdmin
                                      ? (language === 'th' ? 'สถานะ: แอดมิน (คลิกเพื่อเปลี่ยนเป็นสมาชิกทั่วไป)' : 'Role: Admin (Click to demote to Member)')
                                      : (language === 'th' ? 'คลิกไอคอนนี้เพื่อปรับสิทธิ์เป็นแอดมิน' : 'Click to promote this user to Admin')
                                  }
                                >
                                  {isUserAdmin ? (
                                    <>
                                      <Crown className="w-3.5 h-3.5 fill-amber-100 text-amber-100" />
                                      <span>{language === 'th' ? 'แอดมิน (Admin)' : 'Admin'}</span>
                                    </>
                                  ) : (
                                    <>
                                      <Shield className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-600" />
                                      <span>{language === 'th' ? 'ปรับเป็นแอดมิน' : 'Make Admin'}</span>
                                    </>
                                  )}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setUserToDelete(isConfirmingDelete ? null : u.username)}
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                                  title={language === 'th' ? 'ลบ/เพิกถอนสิทธิ์' : 'Delete user access'}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* 2. ตัวเลือกให้เข้าสิทธิ์การแก้ไขข้อมูล (Edit Data Permissions Controls) */}
                            <div className="pt-2.5 border-t border-slate-200/80">
                              <div className={`p-2.5 rounded-xl border transition-colors ${
                                hasEditPermission 
                                  ? 'bg-white border-emerald-200/80 shadow-2xs' 
                                  : 'bg-slate-100/90 border-slate-200 text-slate-500'
                              }`}>
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                                      hasEditPermission ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                                    }`}>
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-xs font-bold text-[#002045]">
                                          {language === 'th' ? 'สิทธิ์การแก้ไขข้อมูล' : 'Data Edit Permission'}
                                        </span>
                                        {hasEditPermission ? (
                                          <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                            {language === 'th' ? 'มีสิทธิ์แก้ไข' : 'Edit Allowed'}
                                          </span>
                                        ) : (
                                          <span className="px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 text-[10px] font-bold">
                                            {language === 'th' ? 'ดูได้อย่างเดียว' : 'Read Only'}
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-[10px] text-[#74777f]">
                                        {hasEditPermission
                                          ? (language === 'th' ? 'สามารถเพิ่ม บันทึก และแก้ไขข้อมูลในระบบได้' : 'Authorized to add, edit and update system records')
                                          : (language === 'th' ? 'ดูข้อมูลได้อย่างเดียว ไม่อนุญาตให้แก้ไขข้อมูล' : 'View only mode. Data modification is restricted.')}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Toggle Switch */}
                                  <div className="flex items-center gap-2 self-end sm:self-center">
                                    <label className="relative inline-flex items-center cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={hasEditPermission}
                                        onChange={() => handleToggleEditPermission(u.username)}
                                        className="sr-only peer"
                                      />
                                      <div className="w-9 h-5 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0061a5]"></div>
                                    </label>
                                    <span className="text-[11px] font-bold text-[#002045]">
                                      {hasEditPermission ? (language === 'th' ? 'เปิดสิทธิ์' : 'Enabled') : (language === 'th' ? 'ปิดสิทธิ์' : 'Disabled')}
                                    </span>
                                  </div>
                                </div>

                                {/* Granular Option Checkboxes for Edit Access */}
                                <div className="mt-2 pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-[10px]">
                                  <label className="flex items-center gap-1.5 p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 cursor-pointer select-none">
                                    <input
                                      type="checkbox"
                                      checked={u.permissions?.canEditData !== false && hasEditPermission}
                                      disabled={!hasEditPermission}
                                      onChange={(e) => handleUpdateGranularPermission(u.username, 'canEditData', e.target.checked)}
                                      className="rounded text-[#0061a5] focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                                    />
                                    <span className={!hasEditPermission ? 'text-slate-400' : 'text-slate-700 font-medium'}>
                                      {language === 'th' ? 'แก้ไข/บันทึกข้อมูล' : 'Edit & Save Data'}
                                    </span>
                                  </label>
                                  <label className="flex items-center gap-1.5 p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 cursor-pointer select-none">
                                    <input
                                      type="checkbox"
                                      checked={u.permissions?.canManageOrders !== false && hasEditPermission}
                                      disabled={!hasEditPermission}
                                      onChange={(e) => handleUpdateGranularPermission(u.username, 'canManageOrders', e.target.checked)}
                                      className="rounded text-[#0061a5] focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                                    />
                                    <span className={!hasEditPermission ? 'text-slate-400' : 'text-slate-700 font-medium'}>
                                      {language === 'th' ? 'จัดการออเดอร์ซักรีด' : 'Manage Orders'}
                                    </span>
                                  </label>
                                  <label className="flex items-center gap-1.5 p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 cursor-pointer select-none">
                                    <input
                                      type="checkbox"
                                      checked={Boolean(u.permissions?.canDeleteData && hasEditPermission)}
                                      disabled={!hasEditPermission}
                                      onChange={(e) => handleUpdateGranularPermission(u.username, 'canDeleteData', e.target.checked)}
                                      className="rounded text-[#0061a5] focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                                    />
                                    <span className={!hasEditPermission ? 'text-slate-400' : 'text-slate-700 font-medium'}>
                                      {language === 'th' ? 'สิทธิ์ลบข้อมูล' : 'Delete Rights'}
                                    </span>
                                  </label>
                                </div>
                              </div>
                            </div>

                            {/* Credentials audit info */}
                            <div className="flex items-center justify-between pt-1 text-[11px] bg-slate-100/60 p-2 rounded-lg border border-slate-200">
                              <div className="flex items-center gap-2">
                                <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="text-[#74777f] font-medium">
                                  {language === 'th' ? 'รหัสผ่าน:' : 'Password:'}
                                </span>
                                <span className="font-mono font-bold text-[#002045]">
                                  {isPassVisible ? u.password : '••••••••'}
                                </span>
                              </div>

                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleToggleUserPassword(u.username)}
                                  className="p-1 text-slate-500 hover:text-[#002045] rounded-md hover:bg-slate-200 cursor-pointer"
                                  title={isPassVisible ? 'Hide' : 'Show'}
                                >
                                  {isPassVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5 text-slate-500" />}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleCopyUserPassword(u.username, u.password)}
                                  className="px-2 py-0.5 text-[10px] font-semibold text-[#0061a5] hover:bg-[#f0f7ff] rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                                >
                                  <Copy className="w-3 h-3" />
                                  <span>{isCopied ? (language === 'th' ? 'คัดลอกแล้ว' : 'Copied') : (language === 'th' ? 'คัดลอก' : 'Copy')}</span>
                                </button>
                              </div>
                            </div>

                            {/* Delete User Confirmation */}
                            {isConfirmingDelete && (
                              <div className="p-2.5 bg-rose-50 rounded-lg border border-rose-200 flex items-center justify-between gap-2 animate-in fade-in duration-100">
                                <span className="text-[11px] font-bold text-rose-900">
                                  {language === 'th' ? `ลบสิทธิ์ผู้ใช้ @${u.username}?` : `Delete @${u.username}?`}
                                </span>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteUser(u.username)}
                                    className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold cursor-pointer"
                                  >
                                    {language === 'th' ? 'ยืนยันลบ' : 'Confirm'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setUserToDelete(null)}
                                    className="px-2 py-0.5 bg-white text-slate-700 border border-slate-300 rounded text-[10px] font-semibold hover:bg-slate-100 cursor-pointer"
                                  >
                                    {language === 'th' ? 'ยกเลิก' : 'Cancel'}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-5 bg-slate-50/70 rounded-xl border border-dashed border-slate-300 text-center">
                      <div className="w-10 h-10 rounded-full bg-[#e1effe] text-[#0061a5] mx-auto flex items-center justify-center mb-2">
                        <UserCheck className="w-5 h-5" />
                      </div>
                      <h5 className="font-bold text-xs text-[#002045] mb-1">
                        {language === 'th' ? 'ยังไม่มีผู้ลงทะเบียนใหม่ในระบบ' : 'No Registered Users Yet'}
                      </h5>
                      <p className="text-[11px] text-[#74777f] max-w-md mx-auto">
                        {language === 'th'
                          ? 'เมื่อมีผู้ใช้งานลงทะเบียนผ่านหน้าต่าง "ลงทะเบียน" (Register) ข้อมูลบัญชี รหัสพนักงาน และสิทธิ์การเข้าถึงจะถูกส่งเข้ามาแสดงและจัดการในส่วนความปลอดภัยนี้โดยอัตโนมัติแบบเรียลไทม์'
                          : 'When users create an account through the Registration portal, their credentials and access rights will appear here automatically in real-time.'}
                      </p>
                    </div>
                  )}
                </div>

                {/* 3. Security Compliance & Protocols */}
                <div className="p-3.5 bg-emerald-50/90 rounded-xl border border-emerald-200">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 text-emerald-800 font-bold">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>{t.soc2Active}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-200/70 text-emerald-900 text-[10px] font-bold">
                      AES-256 Bit
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-700">{t.soc2Desc}</p>

                  <div className="mt-2.5 pt-2 border-t border-emerald-200/70 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] text-emerald-800 font-medium">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{language === 'th' ? 'รหัสผ่านขั้นต่ำ 8 ตัวอักษร (A-Z, a-z, 0-9)' : 'Password Policy: 8+ chars (A-Z, a-z, 0-9)'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{language === 'th' ? 'การบันทึกประวัติการเข้าใช้งาน Audit Trail' : 'Real-time Security Audit Logging'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-[#e2e8f0] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-semibold text-[#43474e] hover:bg-[#f3f3f4] rounded-lg transition-colors cursor-pointer"
            >
              {t.cancel}
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 font-semibold bg-[#0061a5] hover:bg-[#002045] text-white rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  {t.saved}
                </>
              ) : (
                t.savePreferences
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
