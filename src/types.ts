export type NavigationTab = 'dashboard' | 'projects' | 'team' | 'reports' | 'laundry' | 'maintenance' | 'schedule' | 'ot' | 'rags_gloves' | 'settings' | 'profile';

export type WorkScheduleStatus = 'ทำงาน' | 'วันหยุด' | 'ลาพักร้อน' | 'ลาป่วย' | 'ลากิจ' | 'ขาดงาน' | 'วันนักขัตฤกษ์';

export interface EmployeeScheduleItem {
  id: string;
  seq: number;
  dateStr: string;
  dayOfWeek: string;
  employeeName: string;
  department: string;
  shiftTime: string;
  status: WorkScheduleStatus;
  note?: string;
}

export interface DailyWorkSchedule {
  id: string;
  seq: number;
  dayOfWeek: string;
  dateStr: string;
  formattedDate: string;
  onDutyEmployees: { name: string; shiftTime: string; department: string }[];
  offDutyEmployees: { name: string; department: string }[];
  leaveEmployees: { name: string; department: string; leaveType: WorkScheduleStatus }[];
  totalOnDuty: number;
  totalOffDuty: number;
  totalLeaves: number;
}

export interface OtRecord {
  id: string;
  seq: number;
  recordedDate: string; // วันที่บันทึกข้อมูล
  employeeId: string;   // รหัสพนักงาน
  employeeName: string; // ชื่อ - นามสกุล
  department: string;   // ฝ่ายงาน
  otDate: string;       // วันที่ทำ OT
  startTime: string;    // เวลาเริ่มต้น (เช่น 14.30, 6.00)
  endTime: string;      // เวลาสิ้นสุด (เช่น 18.30, 14.30)
  totalHours: number;   // คำนวณชั่วโมง OT
  docNo: string;        // เลขที่เอกสาร
  status: string;       // สถานะ เช่น Approved, Confirm
  note?: string;        // หมายเหตุ
}

export type MaintenanceStatus = 'แจ้งใหม่' | 'อยู่ระหว่างดำเนินการ' | 'เสร็จแล้ว';

export interface MaintenanceTicket {
  id: string;
  seq: number;
  workOrderNo: string;
  department: string;
  issueDetail: string;
  reportedDate: string;
  status: MaintenanceStatus;
  actionDate?: string;
  requester: string;
  completedDate?: string;
  note?: string;
  location?: string;
  priority?: 'normal' | 'high' | 'urgent';
  estimatedDays?: number;
}

export type ProjectStatus = 'In Progress' | 'Review' | 'Completed' | 'Planning';
export type ProjectCategory = 'Enterprise' | 'SMB' | 'Startup';

export type LaundryStage = 'received' | 'washing' | 'drying' | 'ironing' | 'quality_check' | 'ready' | 'delivered';
export type LaundryPriority = 'normal' | 'high' | 'express';
export type LaundryServiceType = 'Wash & Fold' | 'Dry Cleaning' | 'Premium Steam Press' | 'Delicate Fabrics' | 'Heavy Bedding & Linens' | 'Express 3-Hour Service';

export interface LaundryItemDetail {
  id: string;
  name: string;
  category: 'Clothing' | 'Bedding' | 'Suits/Dresses' | 'Towels & Linens' | 'Delicates' | 'Specialty';
  quantity: number;
  unitPrice: number;
  careNote?: string;
}

export interface LaundryOrder {
  id: string;
  trackingCode: string;
  customerName: string;
  customerPhone?: string;
  customerRoomOrDept?: string;
  serviceType: LaundryServiceType;
  priority: LaundryPriority;
  stage: LaundryStage;
  items: LaundryItemDetail[];
  totalWeightKg: number;
  totalPrice: number;
  paymentStatus: 'Paid' | 'Pending' | 'Billed to Room' | 'Corporate Invoice';
  assignedStaff: string;
  assignedStaffAvatar?: string;
  assignedMachine?: string;
  waterTemp?: 'Cold (30°C)' | 'Warm (40°C)' | 'Hot (60°C)' | 'Eco Gentle';
  specialInstructions?: string;
  notes?: string;
  orderDate?: string; // YYYY-MM-DD format
  receivedAt: string;
  estimatedCompletion: string;
  completedAt?: string;
  historyTimeline: {
    stage: LaundryStage;
    label: string;
    timestamp: string;
    note: string;
    operator: string;
  }[];
}

export interface LaundryEquipment {
  id: string;
  name: string;
  type: 'Washer' | 'Dryer' | 'Steam Press' | 'Ozone Disinfector';
  capacityKg: number;
  status: 'running' | 'idle' | 'maintenance' | 'completed';
  currentOrderId?: string;
  currentCycle?: string;
  remainingMinutes?: number;
  totalRunsToday: number;
  temperature?: string;
}

export interface RagsGlovesDailyRecord {
  day: number; // 1 to 31
  dateStr?: string;
  discardRagsKg: number; // คัดทิ้ง เศษผ้า
  discardGlovesKg: number; // คัดทิ้ง ถุงมือ
  beforeWashRagsKg: number; // ก่อนซัก เศษผ้า
  beforeWashGlovesKg: number; // ก่อนซัก ถุงมือ
  afterWashRagsKg: number; // หลังซัก เศษผ้า
  afterWashGlovesKg: number; // หลังซัก ถุงมือ
  note?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  department: 'Engineering' | 'Design' | 'Product' | 'Marketing' | 'Sales';
  status: 'Online' | 'Offline' | 'Do Not Disturb' | 'Last active 2h ago' | string;
  statusType: 'online' | 'offline' | 'dnd' | 'away';
  avatarUrl?: string;
  initials?: string;
  roleBadgeClass?: string;
  isOnline: boolean;
  projectsAssigned?: number;
  recentAction?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  progress: number;
  dueDate: string;
  isOverdue?: boolean;
  category: ProjectCategory;
  members: {
    id: string;
    name: string;
    avatarUrl?: string;
    initials?: string;
  }[];
  totalMembersCount?: number;
  tasksCompleted?: number;
  tasksTotal?: number;
  updatedAt?: string;
}

export interface ActivityItem {
  id: string;
  type: 'task_completed' | 'comment' | 'report_generated' | 'commit' | 'design_update' | 'issue_closed' | 'member_joined';
  user: string;
  userAvatar?: string;
  userInitials?: string;
  title: string;
  highlightText?: string;
  quote?: string;
  subtitle: string;
  timestamp: string;
  badgeType?: 'success' | 'comment' | 'system' | 'code' | 'figma';
}

export interface ReportItem {
  id: string;
  name: string;
  generatedDate: string;
  status: 'READY' | 'GENERATING' | 'FAILED';
  category: string;
  downloadUrl?: string;
  fileSize?: string;
}

export interface AnalyticsData {
  timeRange: '30 Days' | 'Quarter' | 'Year' | 'Custom';
  totalRevenue: number;
  revenueChange: number;
  activeProjects: number;
  projectsChange: number;
  avgCompletionDays: number;
  completionChange: number;
  satisfactionScore: number;
  satisfactionChange: number;
  categoryDistribution: {
    category: string;
    percentage: number;
    count: number;
    color: string;
  }[];
  resourceAllocation: {
    department: string;
    percentage: number;
    color: string;
  }[];
  trendMonths: {
    month: string;
    revenue: number;
    costs: number;
    revenuePct: number;
    costsPct: number;
  }[];
}

export interface AppNotification {
  id: string;
  type: 'laundry_new' | 'laundry_status' | 'maintenance_new' | 'maintenance_status' | 'alert' | 'success' | 'report' | 'info';
  title: string;
  desc: string;
  time: string;
  timestamp: number;
  unread: boolean;
  orderId?: string;
  trackingCode?: string;
  customerName?: string;
  department?: string;
  stage?: LaundryStage;
  workOrderNo?: string;
  ticketId?: string;
  maintenanceStatus?: MaintenanceStatus;
  requester?: string;
}
