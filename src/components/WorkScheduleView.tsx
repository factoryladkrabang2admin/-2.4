import React, { useState, useEffect, useMemo } from 'react';
import {
  CalendarDays,
  Search,
  Filter,
  FileSpreadsheet,
  BarChart3,
  List,
  LayoutGrid,
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  User,
  Building2,
  X,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  CalendarCheck,
  UserX,
  Plane,
  AlertTriangle,
  Briefcase
} from 'lucide-react';
import { DailyWorkSchedule, WorkScheduleStatus } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import {
  fetchGoogleSheetWorkSchedule,
  WORK_SCHEDULE_SHEET_URL
} from '../services/googleSheetSyncService';
import { AdminUserAccount, isUserAdminOrSupervisor } from '../data/mockData';

const STORAGE_KEY = 'proworkflow_work_schedule_cache_v1';
const BACKGROUND_POLL_INTERVAL_MS = 20000;
const TABLE_ITEMS_PER_PAGE = 15;
const CARD_ITEMS_PER_PAGE = 6;

interface WorkScheduleViewProps {
  currentUser?: AdminUserAccount | null;
  isAuthenticated?: boolean;
}

export const WorkScheduleView: React.FC<WorkScheduleViewProps> = ({
  currentUser,
  isAuthenticated = false,
}) => {
  const { language } = useLanguage();
  const [schedules, setSchedules] = useState<DailyWorkSchedule[]>(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch {
      // ignore
    }
    return [];
  });

  // Filter states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDay, setSelectedDay] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all'); // all, onDuty, leave, offDuty

  // View mode
  const [viewMode, setViewMode] = useState<'grid' | 'table' | 'calendar'>('grid');
  const [selectedSchedule, setSelectedSchedule] = useState<DailyWorkSchedule | null>(null);

  // Pagination
  const [tableCurrentPage, setTableCurrentPage] = useState<number>(1);
  const [cardCurrentPage, setCardCurrentPage] = useState<number>(1);

  // Modals
  const [showAnalyticsModal, setShowAnalyticsModal] = useState<boolean>(false);
  const [showFilterModal, setShowFilterModal] = useState<boolean>(false);

  // Sorting
  const [sortBy, setSortBy] = useState<'date_asc' | 'date_desc'>('date_asc');

  const canAccessGoogleSheet = useMemo(() => {
    return isUserAdminOrSupervisor(currentUser, isAuthenticated);
  }, [currentUser, isAuthenticated]);

  // Load data silently
  const loadData = async () => {
    try {
      const result = await fetchGoogleSheetWorkSchedule();
      if (result.success && result.schedules.length > 0) {
        setSchedules(result.schedules);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(result.schedules));
        } catch {
          // ignore
        }
      }
    } catch {
      // Keep existing data quietly
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, BACKGROUND_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  // Distinct lists for dropdowns
  const dayOptions = useMemo(() => {
    const set = new Set<string>();
    schedules.forEach(s => {
      if (s.dayOfWeek) set.add(s.dayOfWeek);
    });
    return Array.from(set);
  }, [schedules]);

  const monthOptions = useMemo(() => {
    const set = new Set<string>();
    schedules.forEach(s => {
      const parts = s.dateStr.split('/');
      if (parts.length === 3) {
        const m = parts[1];
        const y = parts[2];
        set.add(`${m}/${y}`);
      }
    });
    return Array.from(set).sort();
  }, [schedules]);

  const allEmployeesList = useMemo(() => {
    const set = new Set<string>();
    schedules.forEach(s => {
      s.onDutyEmployees.forEach(e => set.add(e.name));
      s.offDutyEmployees.forEach(e => set.add(e.name));
      s.leaveEmployees.forEach(e => set.add(e.name));
    });
    return Array.from(set).sort();
  }, [schedules]);

  // Filter schedules
  const filteredSchedules = useMemo(() => {
    return schedules.filter(item => {
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesDay = item.dayOfWeek.toLowerCase().includes(q);
        const matchesDate = item.dateStr.toLowerCase().includes(q);
        const matchesFormatted = item.formattedDate.toLowerCase().includes(q);
        const matchesOnDuty = item.onDutyEmployees.some(e => e.name.toLowerCase().includes(q) || e.department.toLowerCase().includes(q));
        const matchesOffDuty = item.offDutyEmployees.some(e => e.name.toLowerCase().includes(q));
        const matchesLeave = item.leaveEmployees.some(e => e.name.toLowerCase().includes(q) || e.leaveType.toLowerCase().includes(q));

        if (!matchesDay && !matchesDate && !matchesFormatted && !matchesOnDuty && !matchesOffDuty && !matchesLeave) {
          return false;
        }
      }

      // Filter by Day
      if (selectedDay !== 'all' && item.dayOfWeek !== selectedDay) {
        return false;
      }

      // Filter by Month (e.g. 8/2026 or 9/2026)
      if (selectedMonth !== 'all') {
        const parts = item.dateStr.split('/');
        if (parts.length === 3) {
          const mY = `${parts[1]}/${parts[2]}`;
          if (mY !== selectedMonth) return false;
        }
      }

      // Filter by Employee
      if (selectedEmployee !== 'all') {
        const hasEmp = item.onDutyEmployees.some(e => e.name === selectedEmployee) ||
                       item.offDutyEmployees.some(e => e.name === selectedEmployee) ||
                       item.leaveEmployees.some(e => e.name === selectedEmployee);
        if (!hasEmp) return false;
      }

      // Filter by Status focus
      if (selectedStatus === 'has_leave' && item.totalLeaves === 0) {
        return false;
      }
      if (selectedStatus === 'weekend_only' && !['วันเสาร์', 'วันอาทิตย์'].includes(item.dayOfWeek)) {
        return false;
      }
      if (selectedStatus === 'weekday_only' && ['วันเสาร์', 'วันอาทิตย์'].includes(item.dayOfWeek)) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'date_desc') return b.seq - a.seq;
      return a.seq - b.seq;
    });
  }, [schedules, searchQuery, selectedDay, selectedMonth, selectedEmployee, selectedStatus, sortBy]);

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (selectedDay !== 'all') count++;
    if (selectedMonth !== 'all') count++;
    if (selectedEmployee !== 'all') count++;
    if (selectedStatus !== 'all') count++;
    return count;
  }, [searchQuery, selectedDay, selectedMonth, selectedEmployee, selectedStatus]);

  // Reset filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedDay('all');
    setSelectedMonth('all');
    setSelectedEmployee('all');
    setSelectedStatus('all');
    setSortBy('date_asc');
    setTableCurrentPage(1);
    setCardCurrentPage(1);
  };

  useEffect(() => {
    setTableCurrentPage(1);
    setCardCurrentPage(1);
  }, [searchQuery, selectedDay, selectedMonth, selectedEmployee, selectedStatus, sortBy]);

  // Pagination for Table View
  const tableTotalPages = Math.max(1, Math.ceil(filteredSchedules.length / TABLE_ITEMS_PER_PAGE));
  const validTablePage = Math.min(Math.max(1, tableCurrentPage), tableTotalPages);
  const tableStartIndex = (validTablePage - 1) * TABLE_ITEMS_PER_PAGE;
  const paginatedTableSchedules = useMemo(() => {
    return filteredSchedules.slice(tableStartIndex, tableStartIndex + TABLE_ITEMS_PER_PAGE);
  }, [filteredSchedules, tableStartIndex]);

  // Pagination for Card View
  const cardTotalPages = Math.max(1, Math.ceil(filteredSchedules.length / CARD_ITEMS_PER_PAGE));
  const validCardPage = Math.min(Math.max(1, cardCurrentPage), cardTotalPages);
  const cardStartIndex = (validCardPage - 1) * CARD_ITEMS_PER_PAGE;
  const paginatedCardSchedules = useMemo(() => {
    return filteredSchedules.slice(cardStartIndex, cardStartIndex + CARD_ITEMS_PER_PAGE);
  }, [filteredSchedules, cardStartIndex]);

  // Overall Stats
  const stats = useMemo(() => {
    let totalDays = schedules.length;
    let totalOnDutyShifts = 0;
    let totalLeavesCount = 0;
    let totalOffDutyCount = 0;

    schedules.forEach(s => {
      totalOnDutyShifts += s.totalOnDuty;
      totalLeavesCount += s.totalLeaves;
      totalOffDutyCount += s.totalOffDuty;
    });

    const avgOnDutyPerDay = totalDays > 0 ? (totalOnDutyShifts / totalDays).toFixed(1) : '0';

    return {
      totalDays,
      totalOnDutyShifts,
      totalLeavesCount,
      totalOffDutyCount,
      avgOnDutyPerDay,
      totalEmployees: allEmployeesList.length
    };
  }, [schedules, allEmployeesList]);

  // Helper for Day Badge Color
  const getDayBadge = (day: string) => {
    switch (day) {
      case 'วันจันทร์':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'วันอังคาร':
        return 'bg-pink-100 text-pink-900 border-pink-300';
      case 'วันพุธ':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300';
      case 'วันพฤหัสบดี':
        return 'bg-orange-100 text-orange-900 border-orange-300';
      case 'วันศุกร์':
        return 'bg-sky-100 text-sky-900 border-sky-300';
      case 'วันเสาร์':
        return 'bg-purple-100 text-purple-900 border-purple-300';
      case 'วันอาทิตย์':
        return 'bg-red-100 text-red-900 border-red-300';
      default:
        return 'bg-slate-100 text-slate-900 border-slate-300';
    }
  };

  // Helper for Leave Tag Color
  const getLeaveTag = (leaveType: WorkScheduleStatus) => {
    switch (leaveType) {
      case 'ลาพักร้อน':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'ลาป่วย':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'ลากิจ':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'ขาดงาน':
        return 'bg-red-100 text-red-800 border-red-300 font-bold';
      case 'วันนักขัตฤกษ์':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Header Banner matching MaintenanceView Style */}
      <div className="animated-orange-header rounded-3xl p-6 sm:p-7 text-[#7c2d12] shadow-xl border border-orange-200/80 relative overflow-hidden space-y-5">
        {/* Floating Ambient Glow Orbs */}
        <div className="absolute -top-12 -left-12 w-64 h-64 bg-orange-300/40 rounded-full blur-3xl pointer-events-none animate-orb-1" />
        <div className="absolute -bottom-12 -right-12 w-72 h-72 bg-amber-200/40 rounded-full blur-3xl pointer-events-none animate-orb-2" />

        {/* Animated Floating Calendar / Schedule Icons in Background */}
        <div className="absolute right-0 top-0 bottom-0 w-1/2 pointer-events-none overflow-hidden select-none">
          <CalendarDays className="w-44 h-44 sm:w-56 sm:h-56 animate-tool-float text-orange-600 opacity-20 absolute right-4 sm:right-12 top-1/2 -translate-y-1/2" />
          <Clock className="w-28 h-28 animate-tool-spin text-amber-700 opacity-20 absolute right-24 sm:right-40 bottom-1" />
          <Sparkles className="w-5 h-5 text-amber-500 animate-pulse absolute left-12 top-6 opacity-60" />
          <Sparkles className="w-4 h-4 text-orange-400 animate-pulse absolute left-28 bottom-4 opacity-50" />
        </div>

        {/* Top Header Row */}
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="relative w-12 h-12 rounded-2xl bg-white/90 backdrop-blur-md border border-orange-200 shadow-md flex items-center justify-center shrink-0">
              <CalendarDays className="w-6 h-6 text-orange-600 animate-pulse" />
              <Sparkles className="w-3.5 h-3.5 text-amber-500 absolute -top-1 -right-1" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#7c2d12] drop-shadow-xs">
                {language === 'th' ? 'ตารางทำงาน' : 'Work Schedule'}
              </h1>
            </div>
          </div>

          {/* Action Buttons Toolbar in Header */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 flex-wrap">
            {/* 1. ปุ่มสถิติและการวิเคราะห์ */}
            <button
              type="button"
              onClick={() => setShowAnalyticsModal(true)}
              className="p-2.5 rounded-xl bg-white/85 hover:bg-white text-orange-950 border border-orange-200/80 backdrop-blur-md transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center shadow-xs"
              title={language === 'th' ? 'สถิติและสรุปตารางทำงาน' : 'Schedule Analytics'}
              aria-label="Analytics"
            >
              <BarChart3 className="w-5 h-5" />
            </button>

            {/* 2. ลิงก์ Google Sheet */}
            {canAccessGoogleSheet && (
              <a
                href={WORK_SCHEDULE_SHEET_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 rounded-xl bg-white/85 hover:bg-white text-emerald-800 border border-orange-200/80 backdrop-blur-md transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center shadow-xs"
                title={language === 'th' ? 'เปิดดู Google Sheet ตารางทำงาน' : 'Open Google Sheet'}
                aria-label="Google Sheet"
              >
                <FileSpreadsheet className="w-5 h-5" />
              </a>
            )}

            {/* 3. ตัวกรองการค้นหา */}
            <button
              type="button"
              onClick={() => setShowFilterModal(true)}
              className={`p-2.5 rounded-xl border backdrop-blur-md transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center relative shadow-xs ${
                activeFiltersCount > 0
                  ? 'bg-amber-500 text-white border-amber-400 shadow-md ring-2 ring-amber-300'
                  : 'bg-white/85 hover:bg-white text-orange-950 border-orange-200/80'
              }`}
              title={language === 'th' ? 'ตัวกรองค้นหา' : 'Filter Options'}
              aria-label="Filters"
            >
              <Filter className="w-5 h-5" />
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-600 text-white text-[10px] font-black flex items-center justify-center border-2 border-white shadow-xs">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {/* 4. สลับมุมมอง */}
            <div className="flex items-center bg-white/85 backdrop-blur-md rounded-xl p-1 border border-orange-200/80 shadow-xs">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === 'grid'
                    ? 'bg-orange-600 text-white shadow-xs'
                    : 'text-orange-900 hover:text-orange-950 hover:bg-orange-100/50'
                }`}
                title={language === 'th' ? 'มุมมองการ์ดรายวัน' : 'Grid View'}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === 'table'
                    ? 'bg-orange-600 text-white shadow-xs'
                    : 'text-orange-900 hover:text-orange-950 hover:bg-orange-100/50'
                }`}
                title={language === 'th' ? 'มุมมองตารางรายการ' : 'Table View'}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Quick Filter Search Bar */}
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-1">
          <div className="relative sm:col-span-6">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-orange-700/60" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={language === 'th' ? 'ค้นหาชื่อพนักงาน, วันที่, ฝ่ายงาน, หรือประเภทการลา...' : 'Search employee, date, department, leave type...'}
              className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-white/95 border border-orange-200 text-orange-950 placeholder-orange-800/40 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-orange-600 hover:text-orange-900"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="sm:col-span-3">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-white/95 border border-orange-200 text-orange-950 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-xs"
            >
              <option value="all">{language === 'th' ? '📅 ทุกเดือน' : '📅 All Months'}</option>
              {monthOptions.map(m => (
                <option key={m} value={m}>
                  {language === 'th' ? `เดือน ${m}` : `Month ${m}`}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-3">
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-white/95 border border-orange-200 text-orange-950 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-xs"
            >
              <option value="all">{language === 'th' ? '👤 พนักงานทุกคน' : '👤 All Staff'}</option>
              {allEmployeesList.map(emp => (
                <option key={emp} value={emp}>{emp}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Metric Pill Summary Bar */}
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
          <div className="bg-white/80 backdrop-blur-md rounded-2xl p-3 border border-orange-200 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-700 shrink-0">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-orange-900/70 font-semibold">{language === 'th' ? 'จำนวนวันทำงาน' : 'Total Days'}</div>
              <div className="text-lg font-black text-orange-950">{stats.totalDays} วัน</div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-md rounded-2xl p-3 border border-orange-200 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700 shrink-0">
              <Briefcase className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-orange-900/70 font-semibold">{language === 'th' ? 'พนักงานในระบบ' : 'Staff Count'}</div>
              <div className="text-lg font-black text-blue-950">{stats.totalEmployees} คน</div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-md rounded-2xl p-3 border border-orange-200 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
              <Sun className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-orange-900/70 font-semibold">{language === 'th' ? 'ปฏิบัติงานเฉลี่ย' : 'Avg On Duty/Day'}</div>
              <div className="text-lg font-black text-emerald-950">{stats.avgOnDutyPerDay} คน/วัน</div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-md rounded-2xl p-3 border border-orange-200 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-700 shrink-0">
              <Plane className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-orange-900/70 font-semibold">{language === 'th' ? 'วันลา/หยุดพิเศษ' : 'Total Leaves'}</div>
              <div className="text-lg font-black text-rose-950">{stats.totalLeavesCount} ครั้ง</div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Content Area */}
      {filteredSchedules.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-orange-50 text-orange-500 mx-auto flex items-center justify-center">
            <CalendarDays className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-800">
              {language === 'th' ? 'ไม่พบข้อมูลตารางทำงานตามเงื่อนไข' : 'No schedule records match your search'}
            </h3>
            <p className="text-sm text-slate-500">
              {language === 'th' ? 'ลองล้างตัวกรองหรือค้นหาด้วยคำอื่น' : 'Try clearing filters or search with another term'}
            </p>
          </div>
          {activeFiltersCount > 0 && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-4 py-2 rounded-xl bg-orange-600 text-white font-medium text-sm hover:bg-orange-700 transition-all shadow-sm"
            >
              {language === 'th' ? 'ล้างตัวกรองทั้งหมด' : 'Clear All Filters'}
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID / CARD VIEW */
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {paginatedCardSchedules.map((schedule) => (
              <div
                key={schedule.id}
                onClick={() => setSelectedSchedule(schedule)}
                className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm hover:shadow-md hover:border-orange-300 transition-all cursor-pointer flex flex-col justify-between space-y-4 group"
              >
                {/* Card Top */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className={`px-3 py-1 rounded-full text-xs font-black border ${getDayBadge(schedule.dayOfWeek)}`}>
                      {schedule.dayOfWeek}
                    </span>
                    <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                      {schedule.formattedDate}
                    </span>
                  </div>

                  {/* Summary counts */}
                  <div className="flex items-center gap-2 pt-1">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
                      <Sun className="w-3.5 h-3.5 text-emerald-600" />
                      เข้างาน {schedule.totalOnDuty} คน
                    </span>
                    {schedule.totalLeaves > 0 && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-800 text-xs font-bold border border-rose-200">
                        <Plane className="w-3.5 h-3.5 text-rose-600" />
                        ลา {schedule.totalLeaves} คน
                      </span>
                    )}
                    {schedule.totalOffDuty > 0 && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200">
                        <Moon className="w-3.5 h-3.5 text-slate-500" />
                        หยุด {schedule.totalOffDuty} คน
                      </span>
                    )}
                  </div>

                  {/* On Duty Employees Badges */}
                  <div className="space-y-1.5 pt-2">
                    <div className="text-xs font-bold text-slate-600 flex items-center justify-between">
                      <span>รายชื่อพนักงานเข้ากะ:</span>
                      <span className="text-[11px] text-slate-400 font-normal">คลิกดูทั้งหมด</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-hidden">
                      {schedule.onDutyEmployees.slice(0, 6).map((emp, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 hover:bg-orange-50 border border-slate-200 text-slate-700 text-[11px] font-medium transition-colors"
                        >
                          <User className="w-3 h-3 text-orange-600" />
                          {emp.name}
                          <span className="text-[9px] text-slate-400">({emp.shiftTime.includes('08.00') ? 'เช้า' : 'ปกติ'})</span>
                        </span>
                      ))}
                      {schedule.onDutyEmployees.length > 6 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-orange-100 text-orange-800 text-[11px] font-bold">
                          +{schedule.onDutyEmployees.length - 6} คน
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Leave preview if any */}
                  {schedule.leaveEmployees.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 space-y-1">
                      <div className="text-[11px] font-bold text-rose-700 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        รายการลา:
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {schedule.leaveEmployees.map((l, idx) => (
                          <span
                            key={idx}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] border ${getLeaveTag(l.leaveType)}`}
                          >
                            {l.name} ({l.leaveType})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-orange-700 font-semibold group-hover:translate-x-1 transition-transform">
                  <span>ดูรายละเอียดตารางงานวัน</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            ))}
          </div>

          {/* Card View Pagination */}
          {cardTotalPages > 1 && (
            <div className="flex items-center justify-between bg-white px-4 py-3 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-500">
                แสดง {cardStartIndex + 1}-{Math.min(cardStartIndex + CARD_ITEMS_PER_PAGE, filteredSchedules.length)} จาก {filteredSchedules.length} วัน
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={validCardPage <= 1}
                  onClick={() => setCardCurrentPage(p => Math.max(1, p - 1))}
                  className="p-2 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-bold text-slate-800 px-2">
                  หน้า {validCardPage} / {cardTotalPages}
                </span>
                <button
                  type="button"
                  disabled={validCardPage >= cardTotalPages}
                  onClick={() => setCardCurrentPage(p => Math.min(cardTotalPages, p + 1))}
                  className="p-2 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider">
                    <th className="py-3.5 px-4">วัน / วันที่</th>
                    <th className="py-3.5 px-4">จำนวนเข้างาน</th>
                    <th className="py-3.5 px-4">รายชื่อพนักงานเข้ากะทำงาน</th>
                    <th className="py-3.5 px-4">การลา / หยุดพิเศษ</th>
                    <th className="py-3.5 px-4 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedTableSchedules.map((schedule) => (
                    <tr
                      key={schedule.id}
                      onClick={() => setSelectedSchedule(schedule)}
                      className="hover:bg-orange-50/50 cursor-pointer transition-colors"
                    >
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-black border ${getDayBadge(schedule.dayOfWeek)}`}>
                            {schedule.dayOfWeek}
                          </span>
                          <span className="font-bold text-slate-800">{schedule.formattedDate}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-900 font-bold text-xs">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                          {schedule.totalOnDuty} คน
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1.5 max-w-xl">
                          {schedule.onDutyEmployees.map((emp, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-xs font-medium border border-slate-200"
                            >
                              <User className="w-3 h-3 text-slate-500" />
                              {emp.name}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {schedule.leaveEmployees.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {schedule.leaveEmployees.map((l, i) => (
                              <span
                                key={i}
                                className={`px-2 py-0.5 rounded text-xs border ${getLeaveTag(l.leaveType)}`}
                              >
                                {l.name} ({l.leaveType})
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSchedule(schedule);
                          }}
                          className="px-3 py-1 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 font-semibold text-xs border border-orange-200 transition-colors"
                        >
                          ดูรายละเอียด
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Table View Pagination */}
          {tableTotalPages > 1 && (
            <div className="flex items-center justify-between bg-white px-4 py-3 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-500">
                แสดง {tableStartIndex + 1}-{Math.min(tableStartIndex + TABLE_ITEMS_PER_PAGE, filteredSchedules.length)} จาก {filteredSchedules.length} วัน
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={validTablePage <= 1}
                  onClick={() => setTableCurrentPage(p => Math.max(1, p - 1))}
                  className="p-2 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-bold text-slate-800 px-2">
                  หน้า {validTablePage} / {tableTotalPages}
                </span>
                <button
                  type="button"
                  disabled={validTablePage >= tableTotalPages}
                  onClick={() => setTableCurrentPage(p => Math.min(tableTotalPages, p + 1))}
                  className="p-2 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* DETAIL MODAL FOR A SELECTED SCHEDULE DAY */}
      {selectedSchedule && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 shadow-2xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-700 flex items-center justify-center">
                  <CalendarDays className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-black border ${getDayBadge(selectedSchedule.dayOfWeek)}`}>
                      {selectedSchedule.dayOfWeek}
                    </span>
                    <h2 className="text-xl font-bold text-slate-900">{selectedSchedule.formattedDate}</h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">รายละเอียดกะการทำงานและสถานะพนักงานประจำวัน</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSchedule(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Shift Breakdown */}
            <div className="space-y-4">
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Sun className="w-4 h-4 text-amber-600" />
                  พนักงานปฏิบัติงานตามกะ ({selectedSchedule.onDutyEmployees.length} คน)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {selectedSchedule.onDutyEmployees.map((emp, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50/60 border border-emerald-200"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-emerald-200/80 text-emerald-800 font-black text-xs flex items-center justify-center">
                          {emp.name.slice(0, 2)}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-900">{emp.name}</div>
                          <div className="text-xs text-slate-500">{emp.department}</div>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-emerald-800 px-2 py-0.5 rounded-md bg-emerald-100">
                        {emp.shiftTime}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Leaves Section */}
              {selectedSchedule.leaveEmployees.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <h4 className="text-sm font-bold text-rose-800 flex items-center gap-2">
                    <Plane className="w-4 h-4 text-rose-600" />
                    พนักงานลา / วันหยุดพิเศษ ({selectedSchedule.leaveEmployees.length} คน)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {selectedSchedule.leaveEmployees.map((emp, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 rounded-2xl bg-rose-50/60 border border-rose-200"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-rose-200/80 text-rose-800 font-black text-xs flex items-center justify-center">
                            {emp.name.slice(0, 2)}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-slate-900">{emp.name}</div>
                            <div className="text-xs text-slate-500">{emp.department}</div>
                          </div>
                        </div>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-md border ${getLeaveTag(emp.leaveType)}`}>
                          {emp.leaveType}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Off Duty Section */}
              {selectedSchedule.offDutyEmployees.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <Moon className="w-4 h-4 text-slate-500" />
                    วันหยุดประจำสัปดาห์ / ไม่เข้ากะ ({selectedSchedule.offDutyEmployees.length} คน)
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedSchedule.offDutyEmployees.map((emp, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200"
                      >
                        <UserX className="w-3.5 h-3.5 text-slate-400" />
                        {emp.name} ({emp.department})
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedSchedule(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition-colors"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FILTER MODAL */}
      {showFilterModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-lg">
                <Filter className="w-5 h-5 text-orange-600" />
                ตัวกรองตารางทำงาน
              </div>
              <button
                type="button"
                onClick={() => setShowFilterModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">เลือกวันในสัปดาห์</label>
                <select
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="all">ทุกวันในสัปดาห์</option>
                  {dayOptions.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">เลือกเดือน</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="all">ทุกเดือน</option>
                  {monthOptions.map(m => (
                    <option key={m} value={m}>เดือน {m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">เลือกพนักงาน</label>
                <select
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="all">พนักงานทุกคน</option>
                  {allEmployeesList.map(e => (
                    <option key={e} value={e}>{e}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ประเภทสถานะ</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="all">ทั้งหมด</option>
                  <option value="has_leave">เฉพาะวันที่มีพนักงานลา</option>
                  <option value="weekend_only">เฉพาะวันเสาร์-อาทิตย์</option>
                  <option value="weekday_only">เฉพาะวันจันทร์-ศุกร์</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs font-bold text-orange-600 hover:text-orange-800"
              >
                ล้างค่าตัวกรอง
              </button>
              <button
                type="button"
                onClick={() => setShowFilterModal(false)}
                className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm shadow-sm"
              >
                นำไปใช้
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ANALYTICS MODAL */}
      {showAnalyticsModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 shadow-2xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-700 flex items-center justify-center">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">สรุปสถิติตารางทำงาน</h2>
                  <p className="text-xs text-slate-500">ข้อมูลการเข้ากะและการลาของพนักงานในระบบ</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAnalyticsModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-orange-50/80 border border-orange-200 text-center">
                <div className="text-xs font-semibold text-orange-800">วันทำงานทั้งหมด</div>
                <div className="text-2xl font-black text-orange-950 mt-1">{stats.totalDays} วัน</div>
              </div>
              <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-center">
                <div className="text-xs font-semibold text-emerald-800">จำนวนครั้งเข้างานรวม</div>
                <div className="text-2xl font-black text-emerald-950 mt-1">{stats.totalOnDutyShifts} กะ</div>
              </div>
              <div className="p-4 rounded-2xl bg-rose-50/80 border border-rose-200 text-center">
                <div className="text-xs font-semibold text-rose-800">จำนวนการลา/หยุดพิเศษ</div>
                <div className="text-2xl font-black text-rose-950 mt-1">{stats.totalLeavesCount} ครั้ง</div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-bold text-slate-800">รายชื่อพนักงานทั้งหมด ({allEmployeesList.length} ท่าน):</h4>
              <div className="flex flex-wrap gap-2">
                {allEmployeesList.map((emp, i) => (
                  <span
                    key={i}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-800 font-medium text-xs border border-slate-200"
                  >
                    {emp}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAnalyticsModal(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
