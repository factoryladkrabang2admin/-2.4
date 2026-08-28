import { Project, TeamMember, ActivityItem, ReportItem, AnalyticsData } from '../types';

export const INITIAL_PROJECTS: Project[] = [];

export const INITIAL_TEAM_MEMBERS: TeamMember[] = [];

export const DASHBOARD_ACTIVITIES: ActivityItem[] = [];

export const TEAM_RECENT_ACTIVITIES: Array<{
  id: string;
  user: string;
  action: string;
  target: string;
  time: string;
  highlightClass: string;
}> = [];

export const INITIAL_REPORTS: ReportItem[] = [];

export const ANALYTICS_DATA: AnalyticsData = {
  timeRange: '30 Days',
  totalRevenue: 0,
  revenueChange: 0,
  activeProjects: 0,
  projectsChange: 0,
  avgCompletionDays: 0,
  completionChange: 0,
  satisfactionScore: 5.0,
  satisfactionChange: 0.0,
  categoryDistribution: [],
  resourceAllocation: [],
  trendMonths: [],
};

export const LOGO_URL = 'https://lh3.googleusercontent.com/aida-public/AB6AXuB9B0pbqmcIUj6X1VLWkNQPs63-hZzWrdplpQm9wjQQyxLEZdoAKvmyFdA4_5ywkeaggqB0y5k-s795cceL3tux84iZVwZNtZTg0vTB78E0I6_ZSADZXmNzLbWxqy3MqTY8SGrxpFBkDdIXSDAz6Kq3xujYHfCuka_P6X2dtDF3k44zkAgLuSXcZB6HKfAYd8YjzsPervSu76NI4DUoDRH54Vax7SMBo3eqATkc5Y-eAgVg38qJKbTj3w';
export const CURRENT_USER_AVATAR = 'https://lh3.googleusercontent.com/aida-public/AB6AXuDOt7uGvM7wmf5FyO-ytN5B2czjD6OeErJex8aDUIDpl72UqJaUgpQfaKwWRSpBBzjRu4gAsjhusgGmHZm9g6t9aVD3bs7_mgf8oObnlh0NbODxTHwsRCVnTgFDwd0XYtaU8JZlMwOtbF3s-_FCLtlS_4aBgbj-qhh_zdVObgK8mipsHdILEFK0Re3I_6mmXj7KtInGyZSqx1BPvpDSvhTKBEnp_d1BfnmmDRak8EV0uYKwtLC6hF-yZA';

export interface AdminUserAccount {
  username: string;
  name: string;
  email: string;
  role: string;
  password: string;
  employeeId?: string;
  avatarUrl?: string;
  lastLogin?: string;
  isAdmin?: boolean;
  canEdit?: boolean;
  permissions?: {
    canEditData?: boolean;
    canManageOrders?: boolean;
    canManageProjects?: boolean;
    canDeleteData?: boolean;
  };
}

export function getUserEmployeeId(user?: AdminUserAccount | null): string {
  if (!user) return '';
  if (user.employeeId && user.employeeId.trim()) {
    return user.employeeId.trim().toUpperCase();
  }
  const role = user.role || '';
  const match = role.match(/(?:รหัสพนักงาน:?\s*|emp:?\s*|id:?\s*)([a-zA-Z0-9_-]+)/i);
  if (match && match[1]) {
    return match[1].trim().toUpperCase();
  }
  // Check username if it's alphanumeric and not generic
  const username = (user.username || '').trim().replace(/^@/, '');
  if (username && !['guest', 'admin', 'reizosischen', 'administrator', 'staff'].includes(username.toLowerCase())) {
    return username.toUpperCase();
  }
  return '';
}

export function isOtRecordMatchedToUser(
  record: { employeeId?: string; employeeName?: string },
  user?: AdminUserAccount | null,
  customEmployeeId?: string
): boolean {
  if (customEmployeeId && customEmployeeId.trim()) {
    const cleanCustom = customEmployeeId.trim().toUpperCase();
    const cleanRecEmp = (record.employeeId || '').trim().toUpperCase();
    if (cleanRecEmp && cleanRecEmp === cleanCustom) return true;
  }

  if (!user) return false;

  const targetEmpId = getUserEmployeeId(user);
  const cleanRecEmpId = (record.employeeId || '').trim().toUpperCase();
  const cleanRecName = (record.employeeName || '').trim().toLowerCase();

  // Match by Employee ID
  if (targetEmpId && cleanRecEmpId && targetEmpId === cleanRecEmpId) {
    return true;
  }

  // Match by User's exact name
  const userName = (user.name || '').trim().toLowerCase();
  if (userName && cleanRecName && (cleanRecName.includes(userName) || userName.includes(cleanRecName))) {
    return true;
  }

  // Match by User's username if it matches employeeId
  const rawUser = (user.username || '').trim().toUpperCase().replace(/^@/, '');
  if (rawUser && cleanRecEmpId && rawUser === cleanRecEmpId) {
    return true;
  }

  return false;
}

export const DEFAULT_ADMIN_USER: AdminUserAccount = {
  username: 'reizosischen',
  name: 'reizosischen',
  email: 'reizosischen@proworkflow.com',
  role: 'Super Administrator (ผู้ดูแลระบบสูงสุด)',
  password: '724754',
  lastLogin: 'Active Session',
  isAdmin: true,
  canEdit: true,
  permissions: {
    canEditData: true,
    canManageOrders: true,
    canManageProjects: true,
    canDeleteData: true,
  }
};

export const MARK_ADMIN_USER: AdminUserAccount = {
  username: 'Mark',
  name: 'Mark (Administrator)',
  email: 'mark@proworkflow.com',
  role: 'Administrator (ผู้ดูแลระบบ)',
  password: '717681',
  lastLogin: 'Active Session',
  isAdmin: true,
  canEdit: true,
  permissions: {
    canEditData: true,
    canManageOrders: true,
    canManageProjects: true,
    canDeleteData: true,
  }
};

export const DEFAULT_GUEST_USER: AdminUserAccount = {
  username: 'guest',
  name: 'พนักงานทั่วไป (Staff)',
  email: 'staff@system.local',
  role: 'พนักงานฝ่ายผลิต (Staff)',
  password: '',
  isAdmin: false,
  canEdit: true,
  permissions: {
    canEditData: true,
    canManageOrders: true,
    canManageProjects: false,
    canDeleteData: false,
  }
};

export function isUserAdminOrSupervisor(user?: AdminUserAccount | null, isAuthenticated: boolean = true): boolean {
  if (!isAuthenticated || !user) return false;
  if (user.isAdmin === true) return true;
  const username = (user.username || '').toLowerCase().replace(/^@/, '').trim();
  if (username === 'reizosischen' || username === 'mark' || username === 'admin') return true;

  const role = (user.role || '').toLowerCase().trim();
  
  // If role specifically specifies general staff / employee without admin privileges
  if (role.startsWith('รหัสพนักงาน') || role.startsWith('emp') || role.includes('พนักงาน') || role.includes('staff') || role.includes('operator')) {
    return false;
  }

  if (
    role === 'admin' ||
    role === 'administrator' ||
    role === 'super admin' ||
    role.includes('ผู้ดูแลระบบ') ||
    role.includes('ผู้ดูแล') ||
    role.includes('แอดมิน') ||
    role.includes('supervisor') ||
    role.includes('manager') ||
    role.includes('หัวหน้า')
  ) {
    return true;
  }

  return false;
}
