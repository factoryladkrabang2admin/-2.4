import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  LogIn, 
  UserPlus, 
  KeyRound, 
  User, 
  Hash, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  Check, 
  ShieldCheck, 
  Lock,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Circle
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { DEFAULT_ADMIN_USER, MARK_ADMIN_USER, AdminUserAccount } from '../data/mockData';
import { realtimeHub } from '../services/realtimeService';
import { ActivityItem } from '../types';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: AdminUserAccount) => void;
  isDismissible?: boolean;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  isDismissible = true,
}) => {
  const { language, t } = useLanguage();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const usernameInputRef = useRef<HTMLInputElement>(null);

  // Login form state
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Register form state
  const [regFullName, setRegFullName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmployeeId, setRegEmployeeId] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(true);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const prevOpenRef = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Password requirement visual checks (as recommendations)
  const isFirstCharUpper = /^[A-Z]/.test(regPassword);
  const hasLowerCase = /[a-z]/.test(regPassword);
  const hasNumber = /[0-9]/.test(regPassword);
  const isMinLength = regPassword.length >= 6;

  // Get stored registered users list
  const getStoredUsers = (): AdminUserAccount[] => {
    try {
      const hubUsers = realtimeHub.getStoredRegisteredUsers();
      if (Array.isArray(hubUsers) && hubUsers.length > 0) {
        return hubUsers;
      }
      const saved = localStorage.getItem('proworkflow_registered_users');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  };

  // Get current admin user
  const getStoredAdmin = (): AdminUserAccount => {
    try {
      const saved = localStorage.getItem('proworkflow_admin_auth');
      return saved ? JSON.parse(saved) : DEFAULT_ADMIN_USER;
    } catch {
      return DEFAULT_ADMIN_USER;
    }
  };

  // Reset modal state ONLY when modal transitions from closed to open
  useEffect(() => {
    if (isOpen && !prevOpenRef.current) {
      setErrorMsg(null);
      setIsSuccess(false);
      setSuccessMessage('');
      setLoginUsername('');
      setLoginPassword('');
      setRegFullName('');
      setRegUsername('');
      setRegEmployeeId('');
      setRegPassword('');
      setRegConfirmPassword('');
      setTimeout(() => {
        usernameInputRef.current?.focus();
      }, 100);
    }
    prevOpenRef.current = isOpen;
  }, [isOpen]);

  // Handle ESC key press (only if dismissible)
  useEffect(() => {
    if (!isOpen || !isDismissible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseRef.current();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDismissible]);

  if (!isOpen) return null;

  // Handle Login Submit
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const rawUser = loginUsername.trim();
    const inputUser = rawUser.toLowerCase();
    const cleanUser = inputUser.replace(/^@/, '').trim();
    const inputPass = loginPassword.trim();

    if (!rawUser || !inputPass) {
      setErrorMsg(
        language === 'th' 
          ? 'กรุณากรอกชื่อผู้ใช้และรหัสผ่านให้ครบถ้วน' 
          : 'Please enter both username and password'
      );
      return;
    }

    const admin = getStoredAdmin();
    const registeredUsers = getStoredUsers();

    // 1. Check if matching Mark Admin (Mark / 717681)
    const isMarkUserMatch = cleanUser === 'mark' || inputUser === 'mark' || rawUser.toLowerCase() === 'mark';
    const isMarkPassMatch = inputPass === '717681' || loginPassword === '717681' || inputPass === (MARK_ADMIN_USER.password || '717681');

    if (isMarkUserMatch && isMarkPassMatch) {
      setIsSuccess(true);
      setSuccessMessage(language === 'th' ? 'เข้าสู่ระบบผู้ดูแลระบบ (Mark) สำเร็จ!' : 'Signed in as Administrator (Mark)!');
      setTimeout(() => {
        onLoginSuccess(MARK_ADMIN_USER);
        onClose();
        setIsSuccess(false);
      }, 500);
      return;
    }

    // 2. Check if matching Super Admin (reizosischen)
    const adminUser = (admin.username || 'reizosischen').toLowerCase().replace(/^@/, '').trim();
    const isAdminUserMatch = 
      cleanUser === adminUser || 
      cleanUser === 'reizosischen' || 
      inputUser === adminUser ||
      inputUser === 'reizosischen';

    const isAdminPassMatch = 
      inputPass === (admin.password || '724754') || 
      inputPass === '724754' || 
      loginPassword === (admin.password || '724754') ||
      loginPassword === '724754';

    if (isAdminUserMatch && isAdminPassMatch) {
      setIsSuccess(true);
      setSuccessMessage(language === 'th' ? 'เข้าสู่ระบบผู้ดูแลระบบสำเร็จ!' : 'Signed in as Administrator!');
      setTimeout(() => {
        onLoginSuccess(admin);
        onClose();
        setIsSuccess(false);
      }, 500);
      return;
    }

    // 3. Check if matching registered user
    const matchedUser = registeredUsers.find(u => {
      const uUsername = (u.username || '').toLowerCase().replace(/^@/, '').trim();
      const uName = (u.name || '').toLowerCase().trim();
      const uEmail = (u.email || '').toLowerCase().trim();
      const uRole = (u.role || '').toLowerCase();

      // Extract employee ID if stored in role e.g. "รหัสพนักงาน: EMP01"
      const empIdMatch = uRole.match(/(?:รหัสพนักงาน:?\s*|emp:?\s*|id:?\s*)([a-z0-9_-]+)/i) || uRole.match(/([a-z0-9_-]+)$/i);
      const empId = empIdMatch ? empIdMatch[1].toLowerCase().trim() : '';

      const isUserMatch = 
        uUsername === cleanUser ||
        uUsername === inputUser ||
        uName === cleanUser ||
        uName === inputUser ||
        uEmail === cleanUser ||
        uEmail === inputUser ||
        (empId && (empId === cleanUser || empId === inputUser)) ||
        uRole.includes(cleanUser);

      const isPassMatch = 
        u.password === loginPassword ||
        u.password === inputPass ||
        (u.password && u.password.trim() === inputPass) ||
        (u.password && u.password.trim() === loginPassword.trim());

      return Boolean(isUserMatch && isPassMatch);
    });

    if (matchedUser) {
      // Ensure employeeId is attached
      if (!matchedUser.employeeId) {
        const empIdMatch = (matchedUser.role || '').match(/(?:รหัสพนักงาน:?\s*|emp:?\s*|id:?\s*)([a-z0-9_-]+)/i);
        if (empIdMatch) {
          matchedUser.employeeId = empIdMatch[1].toUpperCase().trim();
        }
      }
      setIsSuccess(true);
      setSuccessMessage(language === 'th' ? `ยินดีต้อนรับคุณ ${matchedUser.name}!` : `Welcome back, ${matchedUser.name}!`);
      setTimeout(() => {
        onLoginSuccess(matchedUser);
        onClose();
        setIsSuccess(false);
      }, 500);
      return;
    }

    // Diagnostics for helpful error messaging
    const userExists = registeredUsers.some(u => {
      const uUsername = (u.username || '').toLowerCase().replace(/^@/, '').trim();
      const uName = (u.name || '').toLowerCase().trim();
      const uRole = (u.role || '').toLowerCase();
      return uUsername === cleanUser || uUsername === inputUser || uName === inputUser || uRole.includes(cleanUser);
    });

    if (userExists) {
      setErrorMsg(
        language === 'th'
          ? 'รหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบตัวพิมพ์ใหญ่-เล็ก (เช่นตัวแรกเป็นตัวพิมพ์ใหญ่) และตัวเลขอักขระอีกครั้ง'
          : 'Incorrect password. Please verify uppercase/lowercase characters and digits.'
      );
    } else {
      setErrorMsg(
        language === 'th'
          ? 'ไม่พบบัญชีผู้ใช้งานนี้ในระบบ กรุณาตรวจสอบชื่อผู้ใช้ หรือทำการลงทะเบียน'
          : 'Invalid username or password. Please check your credentials or register.'
      );
    }
  };

  // Handle Register Submit
  const handleRegisterSubmit = (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setErrorMsg(null);

    const fullName = regFullName.trim();
    const rawUsername = regUsername.trim();
    const username = rawUsername.toLowerCase().replace(/^@/, '').trim();
    const employeeId = regEmployeeId.trim();
    const password = regPassword.trim();
    const confirmPassword = regConfirmPassword.trim();

    if (!fullName) {
      setErrorMsg(
        language === 'th'
          ? 'กรุณากรอกชื่อ-นามสกุล / ชื่อที่ใช้แสดง'
          : 'Please enter your Full Name'
      );
      return;
    }

    if (!username) {
      setErrorMsg(
        language === 'th'
          ? 'กรุณากรอกชื่อผู้ใช้งาน (Username)'
          : 'Please enter a Username'
      );
      return;
    }

    if (username.length < 2) {
      setErrorMsg(
        language === 'th'
          ? 'ชื่อผู้ใช้งานต้องมีความยาวอย่างน้อย 2 ตัวอักษร'
          : 'Username must be at least 2 characters long'
      );
      return;
    }

    if (!employeeId) {
      setErrorMsg(
        language === 'th'
          ? 'กรุณากรอกรหัสพนักงาน (Employee ID)'
          : 'Please enter your Employee ID'
      );
      return;
    }

    if (!password) {
      setErrorMsg(
        language === 'th'
          ? 'กรุณากรอกรหัสผ่าน (Password)'
          : 'Please enter a Password'
      );
      return;
    }

    // Flexible minimum password length (at least 4 characters)
    if (password.length < 4) {
      setErrorMsg(
        language === 'th'
          ? 'รหัสผ่านต้องมีความยาวอย่างน้อย 4 ตัวอักษร'
          : 'Password must be at least 4 characters long'
      );
      return;
    }

    if (!confirmPassword) {
      setErrorMsg(
        language === 'th'
          ? 'กรุณากรอกยืนยันรหัสผ่าน (Confirm Password)'
          : 'Please confirm your Password'
      );
      return;
    }

    // Passwords match check
    if (password !== confirmPassword) {
      setErrorMsg(
        language === 'th'
          ? 'รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน กรุณาตรวจสอบอีกครั้ง'
          : 'Passwords do not match. Please verify and try again.'
      );
      return;
    }

    // Check if username is already taken
    const existingUsers = getStoredUsers();
    const admin = getStoredAdmin();

    const adminUsername = (admin.username || 'reizosischen').toLowerCase().replace(/^@/, '').trim();
    if (username === 'reizosischen' || username === adminUsername) {
      setErrorMsg(
        language === 'th'
          ? 'ชื่อผู้ใช้งานนี้ถูกสงวนไว้สำหรับผู้ดูแลระบบสูงสุด (@reizosischen)'
          : 'This username is reserved for Administrator'
      );
      return;
    }

    const isDuplicate = existingUsers.some(
      u => (u.username || '').toLowerCase().replace(/^@/, '').trim() === username
    );

    if (isDuplicate) {
      setErrorMsg(
        language === 'th'
          ? 'ชื่อผู้ใช้งานนี้มีอยู่ในระบบแล้ว กรุณาใช้ชื่อผู้ใช้อื่น'
          : 'This username is already registered'
      );
      return;
    }

    const newUser: AdminUserAccount = {
      username: username,
      name: fullName,
      email: `${username}@system.local`,
      role: `รหัสพนักงาน: ${employeeId.toUpperCase()}`,
      employeeId: employeeId.toUpperCase(),
      password: password,
      lastLogin: new Date().toLocaleDateString('th-TH'),
      isAdmin: false,
      canEdit: true,
      permissions: {
        canEditData: true,
        canManageOrders: true,
        canManageProjects: true,
        canDeleteData: false,
      }
    };

    // Save registered user via realtimeHub and localStorage
    const updatedUsers = [
      ...existingUsers.filter(u => (u.username || '').toLowerCase().replace(/^@/, '').trim() !== username),
      newUser
    ];
    realtimeHub.saveRegisteredUsers(updatedUsers);
    try {
      localStorage.setItem('proworkflow_registered_users', JSON.stringify(updatedUsers));
    } catch {
      // ignore
    }

    // Record activity audit trail
    const newActivity: ActivityItem = {
      id: `act-reg-${Date.now()}`,
      type: 'member_joined',
      user: fullName,
      title: language === 'th' ? 'ลงทะเบียนเข้าสู่ระบบใหม่' : 'Registered new user account',
      highlightText: `@${username} (${employeeId.toUpperCase()})`,
      subtitle: language === 'th' ? 'เพิ่มสิทธิ์การเข้าถึงในส่วนความปลอดภัย' : 'Access granted in Security & Access',
      timestamp: language === 'th' ? 'เมื่อสักครู่' : 'Just now',
      badgeType: 'success',
    };
    const currentActivities = realtimeHub.getStoredActivities();
    realtimeHub.saveActivities([newActivity, ...currentActivities]);

    setIsSuccess(true);
    setSuccessMessage(
      language === 'th' 
        ? 'ลงทะเบียนสำเร็จ กำลังเข้าสู่ระบบ...' 
        : 'Registered successfully! Signing in...'
    );

    setTimeout(() => {
      onLoginSuccess(newUser);
      onClose();
      setIsSuccess(false);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="fixed inset-0"
        onClick={isDismissible ? onClose : undefined}
      />
      <div className="relative bg-white rounded-2xl max-w-md w-full shadow-2xl border border-[#e2e8f0] overflow-hidden z-10 animate-in zoom-in-95 duration-150 max-h-[94vh] flex flex-col">
        
        {/* Top Header */}
        <div className="bg-gradient-to-r from-[#002045] to-[#003366] p-4 sm:p-6 text-white relative shrink-0">
          {isDismissible ? (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white/70 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          ) : (
            <div className="absolute top-4 right-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] text-[#adc7f7] font-medium">
              <Lock className="w-3 h-3 text-[#66affe]" />
              <span>{language === 'th' ? 'เข้าสู่ระบบก่อนใช้งาน' : 'Login Required'}</span>
            </div>
          )}
          
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-[#66affe] shadow-inner shrink-0">
              {mode === 'login' ? <KeyRound className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                {mode === 'login' 
                  ? (language === 'th' ? 'เข้าสู่ระบบ' : 'Sign In')
                  : (language === 'th' ? 'ลงทะเบียน' : 'Register')}
              </h3>
              <p className="text-xs text-[#adc7f7]">
                {language === 'th' ? 'ระบบบริหารจัดการ ธุรการลาดกระบัง 2' : 'Ladkrabang 2 Administrative System'}
              </p>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex bg-black/25 p-1 rounded-xl mt-4 border border-white/10">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMsg(null);
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === 'login'
                  ? 'bg-white text-[#002045] shadow-xs'
                  : 'text-[#adc7f7] hover:text-white hover:bg-white/5'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>{language === 'th' ? 'เข้าสู่ระบบ' : 'Sign In'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setErrorMsg(null);
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === 'register'
                  ? 'bg-white text-[#002045] shadow-xs'
                  : 'text-[#adc7f7] hover:text-white hover:bg-white/5'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{language === 'th' ? 'ลงทะเบียน' : 'Register'}</span>
            </button>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {/* Error Message Alert */}
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-700 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Success Message Alert */}
          {isSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs text-emerald-700 font-bold animate-in fade-in">
              <Check className="w-4 h-4 shrink-0 text-emerald-600 stroke-[3]" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* MODE: LOGIN FORM */}
          {mode === 'login' ? (
            <form onSubmit={handleLoginSubmit} noValidate className="space-y-4">
              {/* Security Policy Badge */}
              <div className="p-2.5 bg-sky-50/90 border border-sky-100 rounded-xl flex items-center gap-2 text-[11px] text-[#003366]">
                <ShieldCheck className="w-4 h-4 shrink-0 text-[#0061a5]" />
                <span className="font-medium">
                  {language === 'th' 
                    ? 'ระบบความปลอดภัย: เข้าสู่ระบบใหม่ทันทีเมื่อเปิดเพจเพื่อความปลอดภัยของข้อมูล' 
                    : 'Security Policy: Re-login required upon opening page for data protection'}
                </span>
              </div>

              {/* Username Field */}
              <div>
                <label className="block text-xs font-bold text-[#1a1c1c] mb-1.5">
                  {language === 'th' ? 'ชื่อผู้ใช้งาน (Username)' : 'Username'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#74777f]">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    ref={usernameInputRef}
                    type="text"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    placeholder={language === 'th' ? 'กรอกชื่อผู้ใช้ เช่น Mark' : 'Enter username e.g. Mark'}
                    className="w-full pl-9 pr-3 py-2.5 border border-[#c4c6cf] rounded-xl text-xs font-semibold text-[#002045] outline-hidden focus:border-[#0061a5] focus:ring-2 focus:ring-[#0061a5]/20 transition-all bg-white"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-xs font-bold text-[#1a1c1c] mb-1.5">
                  {language === 'th' ? 'รหัสผ่าน (Password)' : 'Password'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#74777f]">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-2.5 border border-[#c4c6cf] rounded-xl text-xs font-bold tracking-wider text-[#002045] outline-hidden focus:border-[#0061a5] focus:ring-2 focus:ring-[#0061a5]/20 transition-all bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#74777f] hover:text-[#002045] cursor-pointer"
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember & Security badge */}
              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-[#43474e]">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-[#c4c6cf] text-[#0061a5] focus:ring-[#0061a5]"
                  />
                  <span>{language === 'th' ? 'จดจำการเข้าสู่ระบบ' : 'Remember me'}</span>
                </label>
                <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{language === 'th' ? 'ระบบรักษาความปลอดภัย' : 'Secure Access'}</span>
                </span>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSuccess}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md ${
                    isSuccess
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gradient-to-r from-[#0061a5] to-[#004b80] hover:from-[#00518a] hover:to-[#003b66] text-white active:scale-[0.99]'
                  }`}
                >
                  {isSuccess ? (
                    <>
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>{language === 'th' ? 'เข้าสู่ระบบสำเร็จ...' : 'Signed in successfully...'}</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>{language === 'th' ? 'เข้าสู่ระบบ' : 'Sign In'}</span>
                    </>
                  )}
                </button>
              </div>

              {/* Toggle to Register */}
              <div className="text-center pt-2 border-t border-slate-100 flex flex-col items-center gap-2">
                <p className="text-xs text-[#74777f]">
                  {language === 'th' ? 'ยังไม่มีบัญชีใช่หรือไม่?' : "Don't have an account?"}{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('register');
                      setErrorMsg(null);
                    }}
                    className="font-bold text-[#0061a5] hover:underline cursor-pointer ml-1 inline-flex items-center gap-0.5"
                  >
                    <span>{language === 'th' ? 'ลงทะเบียน' : 'Register here'}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </p>

                {isDismissible && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="text-xs text-slate-500 hover:text-slate-800 hover:underline cursor-pointer py-1 px-3 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    {language === 'th' ? 'เข้าใช้งานทั่วไป / ปิดหน้าต่างนี้' : 'Continue as Guest / Close'}
                  </button>
                )}
              </div>
            </form>
          ) : (
            /* MODE: REGISTER FORM FOR NEW USERS */
            <form onSubmit={handleRegisterSubmit} noValidate className="space-y-3.5">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-[#1a1c1c] mb-1">
                  {language === 'th' ? 'ชื่อ-นามสกุล / ชื่อที่ใช้แสดง (Full Name)' : 'Full Name'} <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#74777f]">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    placeholder={language === 'th' ? 'เช่น สมชาย ใจดี' : 'e.g. John Doe'}
                    className="w-full pl-9 pr-3 py-2 border border-[#c4c6cf] rounded-xl text-xs font-medium text-[#002045] outline-hidden focus:border-[#0061a5] focus:ring-2 focus:ring-[#0061a5]/20 bg-white"
                  />
                </div>
              </div>

              {/* Username */}
              <div>
                <label className="block text-xs font-bold text-[#1a1c1c] mb-1">
                  {language === 'th' ? 'ชื่อผู้ใช้งาน (Username สำหรับล็อกอิน)' : 'Username'} <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#74777f]">
                    <BadgeCheck className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    placeholder={language === 'th' ? 'เช่น somchai99' : 'e.g. user123'}
                    className="w-full pl-9 pr-3 py-2 border border-[#c4c6cf] rounded-xl text-xs font-mono font-semibold text-[#002045] outline-hidden focus:border-[#0061a5] focus:ring-2 focus:ring-[#0061a5]/20 bg-white"
                  />
                </div>
              </div>

              {/* Employee ID (รหัสพนักงาน) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-[#1a1c1c]">
                    {language === 'th' ? 'รหัสพนักงาน (Employee ID)' : 'Employee ID'} <span className="text-rose-500">*</span>
                  </label>
                  {regEmployeeId && (
                    <span className="text-[10px] font-semibold text-[#0061a5]">
                      {regEmployeeId.toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#74777f]">
                    <Hash className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={regEmployeeId}
                    onChange={(e) => setRegEmployeeId(e.target.value)}
                    placeholder={language === 'th' ? 'เช่น 102456 หรือ EMP01' : 'e.g. 102456 or EMP01'}
                    className="w-full pl-9 pr-3 py-2 border border-[#c4c6cf] rounded-xl text-xs font-mono font-bold text-[#002045] outline-hidden focus:border-[#0061a5] focus:ring-2 focus:ring-[#0061a5]/20 bg-white tracking-wider"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-[#1a1c1c] mb-1">
                  {language === 'th' ? 'รหัสผ่าน (Password)' : 'Password'} <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#74777f]">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder={language === 'th' ? 'กำหนดรหัสผ่าน' : 'Enter password'}
                    className="w-full pl-9 pr-10 py-2 border border-[#c4c6cf] rounded-xl text-xs font-mono font-bold tracking-wider text-[#002045] outline-hidden focus:border-[#0061a5] focus:ring-2 focus:ring-[#0061a5]/20 bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#74777f] hover:text-[#002045] cursor-pointer"
                  >
                    {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password Recommendations Checklist */}
                {regPassword.length > 0 && (
                  <div className="mt-2 p-2 bg-[#f8fafc] rounded-xl border border-[#e2e8f0] space-y-1 text-[11px]">
                    <p className="font-bold text-[#475569] text-[10.5px]">
                      {language === 'th' ? 'ระดับความปลอดภัยของรหัสผ่าน:' : 'Password Strength:'}
                    </p>
                    <div className="grid grid-cols-1 gap-1">
                      <div className={`flex items-center gap-1.5 transition-colors ${isMinLength ? 'text-emerald-700 font-medium' : 'text-[#64748b]'}`}>
                        {isMinLength ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <Circle className="w-3.5 h-3.5 text-[#94a3b8] shrink-0" />}
                        <span>{language === 'th' ? `ความยาว ${regPassword.length} ตัวอักษร (แนะนำ 6 ตัวอักษรขึ้นไป)` : `Length: ${regPassword.length} (6+ recommended)`}</span>
                      </div>
                      <div className={`flex items-center gap-1.5 transition-colors ${isFirstCharUpper ? 'text-emerald-700 font-medium' : 'text-[#64748b]'}`}>
                        {isFirstCharUpper ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <Circle className="w-3.5 h-3.5 text-[#94a3b8] shrink-0" />}
                        <span>{language === 'th' ? 'ขึ้นต้นด้วยตัวพิมพ์ใหญ่ (A-Z)' : 'Starts with uppercase letter (A-Z)'}</span>
                      </div>
                      <div className={`flex items-center gap-1.5 transition-colors ${hasLowerCase && hasNumber ? 'text-emerald-700 font-medium' : 'text-[#64748b]'}`}>
                        {hasLowerCase && hasNumber ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <Circle className="w-3.5 h-3.5 text-[#94a3b8] shrink-0" />}
                        <span>{language === 'th' ? 'มีตัวพิมพ์เล็กและตัวเลขผสมกัน' : 'Contains lowercase and digits'}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-bold text-[#1a1c1c] mb-1">
                  {language === 'th' ? 'ยืนยันรหัสผ่าน (Confirm Password)' : 'Confirm Password'} <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#74777f]">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showRegConfirmPassword ? 'text' : 'password'}
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder={language === 'th' ? 'กรอกรหัสผ่านตรงกันอีกครั้ง' : 'Repeat password'}
                    className="w-full pl-9 pr-10 py-2 border border-[#c4c6cf] rounded-xl text-xs font-mono font-bold tracking-wider text-[#002045] outline-hidden focus:border-[#0061a5] focus:ring-2 focus:ring-[#0061a5]/20 bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#74777f] hover:text-[#002045] cursor-pointer"
                  >
                    {showRegConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {regConfirmPassword && regPassword === regConfirmPassword && (
                  <p className="text-[11px] text-emerald-600 mt-1 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{language === 'th' ? 'รหัสผ่านตรงกันเรียบร้อย' : 'Passwords match'}</span>
                  </p>
                )}
                {regConfirmPassword && regPassword !== regConfirmPassword && (
                  <p className="text-[11px] text-rose-500 mt-1 font-medium">
                    {language === 'th' ? '• รหัสผ่านและการยืนยันยังไม่ตรงกัน' : '• Passwords do not match'}
                  </p>
                )}
              </div>

              {/* Accept Terms */}
              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-[#43474e]">
                  <input
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    className="rounded border-[#c4c6cf] text-[#0061a5] focus:ring-[#0061a5]"
                  />
                  <span>
                    {language === 'th' 
                      ? 'ยอมรับนโยบายความปลอดภัยและการใช้งานระบบ' 
                      : 'I accept system security and privacy policy'}
                  </span>
                </label>
              </div>

              {/* Submit Register Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  onClick={() => handleRegisterSubmit()}
                  disabled={isSuccess}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md ${
                    isSuccess
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gradient-to-r from-[#0061a5] to-[#004b80] hover:from-[#00518a] hover:to-[#003b66] text-white active:scale-[0.99]'
                  }`}
                >
                  {isSuccess ? (
                    <>
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>{language === 'th' ? 'ลงทะเบียนสำเร็จ...' : 'Registered successfully...'}</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>{language === 'th' ? 'ลงทะเบียนและเข้าสู่ระบบทันที' : 'Register & Sign In'}</span>
                    </>
                  )}
                </button>
              </div>

              {/* Toggle to Login */}
              <div className="text-center pt-2 border-t border-slate-100 flex flex-col items-center gap-2">
                <p className="text-xs text-[#74777f]">
                  {language === 'th' ? 'มีบัญชีอยู่แล้ว?' : 'Already have an account?'}{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setErrorMsg(null);
                    }}
                    className="font-bold text-[#0061a5] hover:underline cursor-pointer ml-1 inline-flex items-center gap-0.5"
                  >
                    <span>{language === 'th' ? 'เข้าสู่ระบบที่นี่' : 'Sign in here'}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </p>

                {isDismissible && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="text-xs text-slate-500 hover:text-slate-800 hover:underline cursor-pointer py-1 px-3 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    {language === 'th' ? 'เข้าใช้งานทั่วไป / ปิดหน้าต่างนี้' : 'Continue as Guest / Close'}
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
