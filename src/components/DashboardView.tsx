import React, { useState, useMemo } from 'react';
import { 
  Shirt, 
  AlertTriangle, 
  Gauge, 
  TrendingUp, 
  ArrowRight, 
  CheckCircle2, 
  FileText, 
  Sparkles, 
  PackageCheck, 
  Waves, 
  Bell, 
  Info,
  Wrench,
  Cog,
  CheckCheck,
  PieChart,
  Layers,
  Building2,
  Activity,
  Check,
  BarChart3,
  Calendar,
  CalendarDays,
  Tag,
  Package
} from 'lucide-react';
import { ActivityItem, LaundryOrder, AppNotification, MaintenanceTicket } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface DashboardViewProps {
  activities?: ActivityItem[];
  notifications?: AppNotification[];
  laundryOrders?: LaundryOrder[];
  maintenanceTickets?: MaintenanceTicket[];
  onCreateLaundryOrder?: () => void;
  onNavigateToLaundry?: () => void;
  onNavigateToRagsGloves?: () => void;
  onNavigateToMaintenance?: () => void;
  onNavigateToReports?: () => void;
  onOpenNotifications?: () => void;
  onSelectNotificationOrder?: (orderIdOrCode: string) => void;
  onSelectNotificationMaintenance?: (workOrderNoOrId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  activities = [],
  notifications = [],
  laundryOrders = [],
  maintenanceTickets = [],
  onCreateLaundryOrder,
  onNavigateToLaundry,
  onNavigateToRagsGloves,
  onNavigateToMaintenance,
  onNavigateToReports,
  onOpenNotifications,
  onSelectNotificationOrder,
  onSelectNotificationMaintenance,
}) => {
  const { language, t } = useLanguage();
  const [hoveredStatusIndex, setHoveredStatusIndex] = useState<number | null>(null);
  const [hoveredDeptIndex, setHoveredDeptIndex] = useState<number | null>(null);
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);
  const [barChartMode, setBarChartMode] = useState<'daily' | 'category'>('daily');

  // Helper to extract date YYYY-MM-DD from order
  const getOrderDateString = (order: LaundryOrder): string | null => {
    if (order.orderDate) {
      const match = order.orderDate.match(/(\d{4})-(\d{2})-(\d{2})/);
      if (match) return `${match[1]}-${match[2]}-${match[3]}`;
    }
    if (order.receivedAt) {
      const slashMatch = order.receivedAt.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
      if (slashMatch) {
        let yr = parseInt(slashMatch[3], 10);
        if (yr > 2400) yr -= 543;
        else if (yr < 100) yr += 2000;
        const mm = slashMatch[2].padStart(2, '0');
        const dd = slashMatch[1].padStart(2, '0');
        return `${yr}-${mm}-${dd}`;
      }
      const matchISO = order.receivedAt.match(/(\d{4})-(\d{2})-(\d{2})/);
      if (matchISO) return `${matchISO[1]}-${matchISO[2]}-${matchISO[3]}`;
    }
    const matchCode = order.trackingCode.replace(/\s+/g, '').match(/LKB2-?(\d{2})(\d{2})(\d{2})/i);
    if (matchCode) {
      const yy = parseInt(matchCode[1], 10);
      const year = yy < 50 ? `20${matchCode[1]}` : (yy > 2400 ? `${yy - 543}` : `19${matchCode[1]}`);
      const month = matchCode[2];
      const day = matchCode[3];
      return `${year}-${month}-${day}`;
    }
    if (order.id) {
      const match = order.id.match(/(\d{4})-(\d{2})-(\d{2})/);
      if (match) return `${match[1]}-${match[2]}-${match[3]}`;
    }
    return null;
  };

  // Current Month calculation
  const currentNow = new Date();
  const currentYear = currentNow.getFullYear();
  const currentMonth = currentNow.getMonth() + 1;
  const currentYearMonthStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

  const thaiMonthNames = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  const englishMonthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const thaiShortMonths = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
  ];
  const currentMonthDisplayName = language === 'th'
    ? `${thaiMonthNames[currentMonth - 1]} ${currentYear + 543}`
    : `${englishMonthNames[currentMonth - 1]} ${currentYear}`;

  // Filter laundry orders strictly for the current month
  const currentMonthLaundryOrders = useMemo(() => {
    return laundryOrders.filter((order) => {
      const d = getOrderDateString(order);
      const ym = d ? d.substring(0, 7) : currentYearMonthStr;
      return ym === currentYearMonthStr;
    });
  }, [laundryOrders, currentYearMonthStr]);

  // Active counts for laundry
  const inWashingLaundryCount = laundryOrders.filter(o => o.stage !== 'ready' && o.stage !== 'delivered' && o.stage !== 'completed').length;
  const readyLaundryCount = laundryOrders.filter(o => o.stage === 'ready' || o.stage === 'delivered').length;
  const completedLaundryCount = laundryOrders.filter(o => o.stage === 'ready' || o.stage === 'delivered' || o.stage === 'completed').length;
  const activeLaundryCount = laundryOrders.filter(o => o.stage !== 'completed').length;

  // Active counts for maintenance tickets (รวมงานแจ้งซ่อม)
  const activeMaintenanceCount = maintenanceTickets.filter(t => t.status !== 'เสร็จแล้ว').length;
  const completedMaintenanceCount = maintenanceTickets.filter(t => t.status === 'เสร็จแล้ว').length;

  // Combined totals (งานผ้า + งานแจ้งซ่อม)
  const totalActiveTasks = activeLaundryCount + activeMaintenanceCount;
  const totalCompletedTasks = readyLaundryCount + completedMaintenanceCount;
  const totalTasks = laundryOrders.length + maintenanceTickets.length;
  
  const overallCompletionRate = totalTasks > 0
    ? Math.round(((completedLaundryCount + completedMaintenanceCount) / totalTasks) * 100)
    : 100;

  // Chart 1: Status Breakdown Data
  const statusSegmentsData = useMemo(() => {
    const raw = [
      {
        id: 'laundry_ready',
        label: language === 'th' ? 'ผ้าพร้อมส่ง / สำเร็จ' : 'Ready Laundry',
        count: readyLaundryCount,
        color: '#10b981', // Vibrant Emerald
        gradient: 'from-emerald-500 to-teal-400',
        textColor: 'text-emerald-700',
        bgPill: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        icon: PackageCheck
      },
      {
        id: 'laundry_washing',
        label: language === 'th' ? 'ผ้าอยู่ระหว่างซัก' : 'In Washing',
        count: inWashingLaundryCount,
        color: '#f59e0b', // Vibrant Amber
        gradient: 'from-amber-500 to-yellow-400',
        textColor: 'text-amber-700',
        bgPill: 'bg-amber-50 text-amber-900 border-amber-200',
        icon: Waves
      },
      {
        id: 'maintenance_done',
        label: language === 'th' ? 'แจ้งซ่อมเสร็จแล้ว' : 'Repaired',
        count: completedMaintenanceCount,
        color: '#06b6d4', // Vibrant Cyan
        gradient: 'from-cyan-500 to-blue-400',
        textColor: 'text-cyan-700',
        bgPill: 'bg-cyan-50 text-cyan-800 border-cyan-200',
        icon: CheckCircle2
      },
      {
        id: 'maintenance_active',
        label: language === 'th' ? 'แจ้งซ่อมกำลังทำ' : 'In Repair',
        count: activeMaintenanceCount,
        color: '#6366f1', // Vibrant Indigo
        gradient: 'from-indigo-500 to-purple-400',
        textColor: 'text-indigo-700',
        bgPill: 'bg-indigo-50 text-indigo-800 border-indigo-200',
        icon: Wrench
      }
    ];

    const total = raw.reduce((sum, item) => sum + item.count, 0) || 1;
    const radius = 52;
    const circumference = 2 * Math.PI * radius;
    let accumulatedOffset = 0;

    return {
      total,
      segments: raw.map((item, idx) => {
        const percentageVal = item.count / total;
        const strokeLength = percentageVal * circumference;
        const dashOffset = accumulatedOffset;
        accumulatedOffset += strokeLength;

        return {
          ...item,
          percentage: (percentageVal * 100).toFixed(1),
          strokeLength,
          dashOffset,
          radius,
          circumference,
          idx
        };
      })
    };
  }, [readyLaundryCount, inWashingLaundryCount, completedMaintenanceCount, activeMaintenanceCount, language]);

  // Chart 2: Department / Room Breakdown Data - ภาพรวมเดือนปัจจุบัน Top 5
  const deptSegmentsData = useMemo(() => {
    const deptMap: Record<string, { pieces: number; orders: number }> = {};
    let totalPieces = 0;

    currentMonthLaundryOrders.forEach(order => {
      const dept = order.customerRoomOrDept?.trim() || (language === 'th' ? 'ส่วนกลาง' : 'General');
      const orderPieces = order.items.reduce((s, i) => s + i.quantity, 0) || 1;
      if (!deptMap[dept]) {
        deptMap[dept] = { pieces: 0, orders: 0 };
      }
      deptMap[dept].pieces += orderPieces;
      deptMap[dept].orders += 1;
      totalPieces += orderPieces;
    });

    const modernPalette = ['#0284c7', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#f97316'];
    const sorted = Object.entries(deptMap).sort((a, b) => b[1].pieces - a[1].pieces);
    
    // Top 5 + Others (ตามความต้องการข้อ 1: Top 5 ของเดือนปัจจุบัน)
    const top5 = sorted.slice(0, 5);
    const others = sorted.slice(5);
    const othersPieces = others.reduce((sum, [, val]) => sum + val.pieces, 0);
    const othersOrders = others.reduce((sum, [, val]) => sum + val.orders, 0);

    const finalItems = top5.map(([name, val], i) => ({
      name,
      pieces: val.pieces,
      orders: val.orders,
      color: modernPalette[i % modernPalette.length]
    }));

    if (othersPieces > 0) {
      finalItems.push({
        name: language === 'th' ? 'แผนกอื่นๆ' : 'Others',
        pieces: othersPieces,
        orders: othersOrders,
        color: '#64748b'
      });
    }

    if (finalItems.length === 0) {
      finalItems.push({
        name: language === 'th' ? 'ไม่มีข้อมูลในเดือนนี้' : 'No Data This Month',
        pieces: 1,
        orders: 0,
        color: '#0284c7'
      });
      totalPieces = 1;
    }

    const total = totalPieces || 1;
    const radius = 52;
    const circumference = 2 * Math.PI * radius;
    let accumulatedOffset = 0;

    return {
      totalPieces,
      segments: finalItems.map((item, idx) => {
        const percentageVal = item.pieces / total;
        const strokeLength = percentageVal * circumference;
        const dashOffset = accumulatedOffset;
        accumulatedOffset += strokeLength;

        return {
          ...item,
          percentage: (percentageVal * 100).toFixed(1),
          strokeLength,
          dashOffset,
          radius,
          circumference,
          idx
        };
      })
    };
  }, [currentMonthLaundryOrders, language]);

  // Chart 3: Monthly Overview Bar Chart Data (ภาพรวมเดือนปัจจุบัน)
  const monthlyBarChartData = useMemo(() => {
    // 1. Daily Breakdown
    const dayMap: Record<string, { readyPieces: number; washingPieces: number; totalPieces: number; orders: number }> = {};
    
    currentMonthLaundryOrders.forEach(order => {
      const dStr = getOrderDateString(order);
      const dayKey = dStr ? dStr.split('-')[2] : '23';
      const orderPieces = order.items.reduce((s, i) => s + i.quantity, 0) || 1;
      const isReady = order.stage === 'ready' || order.stage === 'delivered';

      if (!dayMap[dayKey]) {
        dayMap[dayKey] = { readyPieces: 0, washingPieces: 0, totalPieces: 0, orders: 0 };
      }
      if (isReady) {
        dayMap[dayKey].readyPieces += orderPieces;
      } else {
        dayMap[dayKey].washingPieces += orderPieces;
      }
      dayMap[dayKey].totalPieces += orderPieces;
      dayMap[dayKey].orders += 1;
    });

    const sortedDays = Object.entries(dayMap).sort((a, b) => parseInt(a[0], 10) - parseInt(b[0], 10));
    
    // 2. Category Breakdown
    const catMap: Record<string, { pieces: number; orders: number }> = {};
    currentMonthLaundryOrders.forEach(order => {
      const garmentType = order.notes?.match(/ประเภทผ้า:\s*([^|]+)/)?.[1]?.trim() || 
                          order.items[0]?.name || (language === 'th' ? 'ผ้าทั่วไป' : 'General Linen');
      const orderPieces = order.items.reduce((s, i) => s + i.quantity, 0) || 1;
      if (!catMap[garmentType]) {
        catMap[garmentType] = { pieces: 0, orders: 0 };
      }
      catMap[garmentType].pieces += orderPieces;
      catMap[garmentType].orders += 1;
    });
    const sortedCats = Object.entries(catMap).sort((a, b) => b[1].pieces - a[1].pieces).slice(0, 6);

    const maxDayPieces = Math.max(...sortedDays.map(([, v]) => v.totalPieces), 1);
    const maxCatPieces = Math.max(...sortedCats.map(([, v]) => v.pieces), 1);
    const totalMonthPieces = currentMonthLaundryOrders.reduce((sum, o) => sum + o.items.reduce((isum, i) => isum + i.quantity, 0), 0);
    const totalMonthOrders = currentMonthLaundryOrders.length;
    const avgPiecesPerOrder = totalMonthOrders > 0 ? (totalMonthPieces / totalMonthOrders).toFixed(1) : '0';

    return {
      dailyBars: sortedDays.map(([day, val]) => ({
        day,
        label: `${parseInt(day, 10)} ${language === 'th' ? thaiShortMonths[currentMonth - 1] : englishMonthNames[currentMonth - 1].substring(0, 3)}`,
        readyPieces: val.readyPieces,
        washingPieces: val.washingPieces,
        totalPieces: val.totalPieces,
        orders: val.orders,
        readyPercent: val.totalPieces > 0 ? (val.readyPieces / val.totalPieces) * 100 : 0,
        washingPercent: val.totalPieces > 0 ? (val.washingPieces / val.totalPieces) * 100 : 0,
        heightRatio: val.totalPieces / maxDayPieces
      })),
      categoryBars: sortedCats.map(([name, val]) => ({
        name,
        pieces: val.pieces,
        orders: val.orders,
        heightRatio: val.pieces / maxCatPieces
      })),
      totalMonthPieces,
      totalMonthOrders,
      avgPiecesPerOrder,
      maxDayPieces
    };
  }, [currentMonthLaundryOrders, currentMonth, language]);

  const getNotificationIcon = (n: AppNotification) => {
    if (n.type === 'maintenance_new') {
      return (
        <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center shrink-0 border border-amber-300 shadow-2xs">
          <Wrench className="w-5 h-5" />
        </div>
      );
    }
    if (n.type === 'maintenance_status') {
      if (n.maintenanceStatus === 'เสร็จแล้ว' || n.title.includes('เสร็จแล้ว')) {
        return (
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-300 shadow-2xs">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        );
      }
      return (
        <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center shrink-0 border border-sky-300 shadow-2xs">
          <Cog className="w-5 h-5 animate-spin" />
        </div>
      );
    }
    if (n.type === 'laundry_new') {
      return (
        <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0061a5] flex items-center justify-center shrink-0 border border-blue-200/80 shadow-2xs">
          <Shirt className="w-5 h-5" />
        </div>
      );
    }
    if (n.type === 'laundry_status') {
      if (n.stage === 'ready' || n.title.includes('เสร็จ') || n.title.includes('Ready')) {
        return (
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200/80 shadow-2xs">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        );
      }
      return (
        <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center shrink-0 border border-amber-200/80 shadow-2xs">
          <Waves className="w-5 h-5 animate-pulse" />
        </div>
      );
    }
    if (n.type === 'alert') {
      return (
        <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center shrink-0 border border-rose-200/80 shadow-2xs">
          <AlertTriangle className="w-5 h-5" />
        </div>
      );
    }
    if (n.type === 'report') {
      return (
        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 border border-indigo-200/80 shadow-2xs">
          <FileText className="w-5 h-5" />
        </div>
      );
    }
    return (
      <div className="w-10 h-10 rounded-xl bg-slate-50 text-[#002045] flex items-center justify-center shrink-0 border border-slate-200/80 shadow-2xs">
        <Bell className="w-5 h-5 text-[#0061a5]" />
      </div>
    );
  };

  const displayedNotifications = notifications.slice(0, 6);

  const activeStatusHoverItem = hoveredStatusIndex !== null ? statusSegmentsData.segments[hoveredStatusIndex] : null;
  const activeDeptHoverItem = hoveredDeptIndex !== null ? deptSegmentsData.segments[hoveredDeptIndex] : null;
  const activeHoverBar = hoveredBarIndex !== null ? monthlyBarChartData.dailyBars[hoveredBarIndex] : null;

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Welcome Section */}
      <div>
        <h2 className="text-2xl md:text-3xl font-bold text-[#1a1c1c] tracking-tight">
          {t.welcomeBack}
        </h2>
        <p className="text-base text-[#43474e] mt-1">
          {language === 'th' 
            ? 'นี่คือภาพรวมความคืบหน้ารายการผ้าและกิจกรรมงานแจ้งซ่อมทั้งหมดของคุณวันนี้' 
            : "Here's what's happening with your operations, laundry orders, and maintenance requests today."}
        </p>
      </div>

      {/* 3 Bento Summary Cards (รวมงานแจ้งซ่อม) - แสดงข้อมูลอย่างเดียว ไม่สามารถกดได้ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Active Work Items Card (Laundry + Maintenance) - Non-clickable */}
        <div className="bg-white rounded-xl border border-[#e2e8f0] card-shadow p-6 flex flex-col justify-between relative overflow-hidden select-none">
          <div className="absolute top-3 right-3 p-3 opacity-10 text-[#002045]">
            <TrendingUp className="w-16 h-16" />
          </div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-[#43474e] uppercase tracking-wider">
              {language === 'th' ? 'รายการที่กำลังดำเนินการรวม' : 'Active Tasks & Orders'}
            </h3>
            <span className="text-[#0061a5] bg-[#d2e4ff]/30 p-1.5 rounded-md">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>

          <div>
            <div className="flex items-baseline gap-3 mt-2">
              <span className="text-4xl md:text-5xl font-bold text-[#1a1c1c] tracking-tight">
                {totalActiveTasks}
              </span>
              <span className="text-xs text-[#0061a5] bg-[#d2e4ff]/40 px-2.5 py-1 rounded-md border border-[#adc7f7] font-medium">
                {totalTasks} {language === 'th' ? 'รายการทั้งหมด' : 'total'}
              </span>
            </div>

            {/* Breakdown between Laundry and Maintenance */}
            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100 text-xs">
              <span className="flex items-center gap-1 text-slate-700 font-medium bg-slate-100 px-2 py-0.5 rounded">
                <Shirt className="w-3.5 h-3.5 text-[#0061a5]" />
                <span>{language === 'th' ? 'ผ้า' : 'Laundry'}: {activeLaundryCount}</span>
              </span>
              <span className="flex items-center gap-1 text-amber-900 font-medium bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60">
                <Wrench className="w-3.5 h-3.5 text-amber-600" />
                <span>{language === 'th' ? 'แจ้งซ่อม' : 'Maint'}: {activeMaintenanceCount}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Ready / Completed Card - Non-clickable */}
        <div className="bg-white rounded-xl border border-[#e2e8f0] card-shadow p-6 flex flex-col justify-between relative overflow-hidden select-none">
          <div className="absolute top-3 right-3 p-3 opacity-10 text-emerald-600">
            <PackageCheck className="w-16 h-16" />
          </div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-[#43474e] uppercase tracking-wider">
              {language === 'th' ? 'รายการที่ดำเนินการเรียบร้อย' : 'Completed Items'}
            </h3>
            <span className="text-emerald-700 bg-emerald-50 p-1.5 rounded-md">
              <PackageCheck className="w-4 h-4" />
            </span>
          </div>

          <div>
            <div className="flex items-baseline gap-3 mt-2">
              <span className="text-4xl md:text-5xl font-bold text-emerald-600 tracking-tight">
                {totalCompletedTasks}
              </span>
              <span className="text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 font-medium">
                {language === 'th' ? 'พร้อมส่งมอบ/เสร็จสิ้น' : 'Done & Ready'}
              </span>
            </div>

            {/* Breakdown between Laundry Ready and Maintenance Done */}
            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100 text-xs">
              <span className="flex items-center gap-1 text-emerald-800 font-medium bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
                <PackageCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>{language === 'th' ? 'ผ้าพร้อมส่ง' : 'Laundry'}: {readyLaundryCount}</span>
              </span>
              <span className="flex items-center gap-1 text-teal-800 font-medium bg-teal-50 px-2 py-0.5 rounded border border-teal-200/60">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                <span>{language === 'th' ? 'ซ่อมเสร็จแล้ว' : 'Repaired'}: {completedMaintenanceCount}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Team Velocity & Efficiency Card - Non-clickable */}
        <div className="bg-white rounded-xl border border-[#e2e8f0] card-shadow p-6 flex flex-col justify-between relative overflow-hidden select-none">
          <div className="absolute top-3 right-3 p-3 opacity-10 text-[#0061a5]">
            <Gauge className="w-16 h-16" />
          </div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold text-[#43474e] uppercase tracking-wider">
              {language === 'th' ? 'อัตราความสำเร็จรวม' : 'Combined Completion'}
            </h3>
            <span className="text-[#0061a5] bg-[#d2e4ff]/30 p-1.5 rounded-md">
              <Gauge className="w-4 h-4" />
            </span>
          </div>

          <div>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-4xl md:text-5xl font-bold text-[#1a1c1c] tracking-tight">
                {overallCompletionRate}%
              </span>
              <span className="text-xs text-[#0061a5] font-medium">
                {language === 'th' ? 'เป้าหมายรายวัน 100%' : 'Daily Target 100%'}
              </span>
            </div>

            <div className="w-full bg-[#f3f3f4] h-2.5 rounded-full overflow-hidden">
              <div 
                className="bg-[#0061a5] h-full rounded-full transition-all duration-700 ease-out"
                style={{ width: `${overallCompletionRate}%` }}
              />
            </div>

            <p className="text-[11px] text-[#74777f] mt-3">
              {language === 'th' 
                ? 'คำนวณจากงานผ้าพร้อมส่งและงานแจ้งซ่อมที่เสร็จสิ้น' 
                : 'Calculated from ready laundry and resolved maintenance tickets'}
            </p>
          </div>
        </div>
      </div>

      {/* Modern Vibrant Circular Charts Section (กราฟวงกลมแบบโมเดิร์นสดใส) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donut Chart 1: สัดส่วนสถานะงานปฏิบัติการรวม */}
        <div className="bg-white rounded-2xl border border-[#e2e8f0] card-shadow p-5 sm:p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-xs">
                <PieChart className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-[#1a1c1c]">
                  {language === 'th' ? 'สัดส่วนสถานะงานปฏิบัติการรวม' : 'Operations Status Proportion'}
                </h3>
                <p className="text-xs text-slate-500">
                  {language === 'th' ? 'แยกตามสถานะงานผ้าและงานแจ้งซ่อม' : 'Breakdown by laundry and maintenance stage'}
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
              {totalTasks} {language === 'th' ? 'งานรวม' : 'tasks'}
            </span>
          </div>

          <div className="py-6 flex flex-col sm:flex-row items-center justify-center gap-6">
            {/* SVG Modern Donut */}
            <div className="relative w-44 h-44 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 140 140">
                {/* Background Ring */}
                <circle
                  cx="70"
                  cy="70"
                  r="52"
                  fill="transparent"
                  stroke="#f1f5f9"
                  strokeWidth="15"
                />

                {/* Donut Segments */}
                {statusSegmentsData.segments.map((seg) => {
                  const isHovered = hoveredStatusIndex === seg.idx;
                  return (
                    <circle
                      key={seg.id}
                      cx="70"
                      cy="70"
                      r="52"
                      fill="transparent"
                      stroke={seg.color}
                      strokeWidth={isHovered ? 18 : 15}
                      strokeDasharray={`${seg.strokeLength} ${seg.circumference}`}
                      strokeDashoffset={-seg.dashOffset}
                      className="transition-all duration-300 cursor-pointer"
                      style={{
                        filter: isHovered ? `drop-shadow(0 0 6px ${seg.color}80)` : 'none'
                      }}
                      onMouseEnter={() => setHoveredStatusIndex(seg.idx)}
                      onMouseLeave={() => setHoveredStatusIndex(null)}
                    />
                  );
                })}
              </svg>

              {/* Donut Center Display */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center p-2">
                {activeStatusHoverItem ? (
                  <div className="animate-in zoom-in-90 duration-150">
                    <span className="text-xl sm:text-2xl font-black text-[#1a1c1c]">
                      {activeStatusHoverItem.percentage}%
                    </span>
                    <p className="text-[10px] font-bold text-slate-500 truncate max-w-[90px]">
                      {activeStatusHoverItem.count} {language === 'th' ? 'รายการ' : 'items'}
                    </p>
                  </div>
                ) : (
                  <div>
                    <span className="text-xl sm:text-2xl font-black text-[#1a1c1c]">
                      {overallCompletionRate}%
                    </span>
                    <p className="text-[10px] font-bold text-slate-500">
                      {language === 'th' ? 'ความสำเร็จ' : 'Success Rate'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Legend Column */}
            <div className="flex-1 w-full space-y-2">
              {statusSegmentsData.segments.map((seg) => {
                const isHovered = hoveredStatusIndex === seg.idx;
                const IconComponent = seg.icon;
                return (
                  <div
                    key={seg.id}
                    onMouseEnter={() => setHoveredStatusIndex(seg.idx)}
                    onMouseLeave={() => setHoveredStatusIndex(null)}
                    className={`flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer border ${
                      isHovered
                        ? 'bg-slate-50 border-slate-300 shadow-2xs scale-[1.02]'
                        : 'border-transparent hover:bg-slate-50/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-3 h-3 rounded-full shrink-0 shadow-2xs"
                        style={{ backgroundColor: seg.color }}
                      />
                      <IconComponent className="w-4 h-4 text-slate-500 shrink-0" />
                      <span className="text-xs font-semibold text-slate-700 truncate">
                        {seg.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-black text-slate-900">
                        {seg.count}
                      </span>
                      <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md min-w-[42px] text-right">
                        {seg.percentage}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Donut Chart 2: สัดส่วนงานผ้าตามแผนก (Top 5 ภาพรวมเดือนปัจจุบัน) */}
        <div className="bg-white rounded-2xl border border-[#e2e8f0] card-shadow p-5 sm:p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-xs">
                <Building2 className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-[#1a1c1c] flex items-center gap-1.5">
                  <span>{language === 'th' ? 'สัดส่วนงานผ้าแยกตามแผนก (Top 5)' : 'Laundry by Dept (Top 5)'}</span>
                </h3>
                <p className="text-xs text-slate-500">
                  {language === 'th' ? `ภาพรวมประจำเดือน ${currentMonthDisplayName}` : `Monthly Overview (${currentMonthDisplayName})`}
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-[#0061a5] bg-[#d2e4ff]/40 px-2.5 py-1 rounded-lg border border-[#adc7f7]/60">
              {deptSegmentsData.totalPieces.toLocaleString()} {language === 'th' ? 'ชิ้นในเดือนนี้' : 'pcs this month'}
            </span>
          </div>

          <div className="py-6 flex flex-col sm:flex-row items-center justify-center gap-6">
            {/* SVG Modern Donut */}
            <div className="relative w-44 h-44 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 140 140">
                {/* Background Ring */}
                <circle
                  cx="70"
                  cy="70"
                  r="52"
                  fill="transparent"
                  stroke="#f1f5f9"
                  strokeWidth="15"
                />

                {/* Donut Segments */}
                {deptSegmentsData.segments.map((seg) => {
                  const isHovered = hoveredDeptIndex === seg.idx;
                  return (
                    <circle
                      key={seg.name}
                      cx="70"
                      cy="70"
                      r="52"
                      fill="transparent"
                      stroke={seg.color}
                      strokeWidth={isHovered ? 18 : 15}
                      strokeDasharray={`${seg.strokeLength} ${seg.circumference}`}
                      strokeDashoffset={-seg.dashOffset}
                      className="transition-all duration-300 cursor-pointer"
                      style={{
                        filter: isHovered ? `drop-shadow(0 0 6px ${seg.color}80)` : 'none'
                      }}
                      onMouseEnter={() => setHoveredDeptIndex(seg.idx)}
                      onMouseLeave={() => setHoveredDeptIndex(null)}
                    />
                  );
                })}
              </svg>

              {/* Donut Center Display */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center p-2">
                {activeDeptHoverItem ? (
                  <div className="animate-in zoom-in-90 duration-150">
                    <span className="text-xl sm:text-2xl font-black text-[#1a1c1c]">
                      {activeDeptHoverItem.percentage}%
                    </span>
                    <p className="text-[10px] font-bold text-slate-500 truncate max-w-[90px]">
                      {activeDeptHoverItem.pieces} {language === 'th' ? 'ชิ้น' : 'pcs'}
                    </p>
                  </div>
                ) : (
                  <div>
                    <span className="text-xl sm:text-2xl font-black text-[#1a1c1c]">
                      {deptSegmentsData.totalPieces.toLocaleString()}
                    </span>
                    <p className="text-[10px] font-bold text-slate-500">
                      {language === 'th' ? 'ชิ้นผ้ารายเดือน' : 'Month Pieces'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Legend Column (Top 5 + Others) */}
            <div className="flex-1 w-full space-y-2">
              {deptSegmentsData.segments.map((seg) => {
                const isHovered = hoveredDeptIndex === seg.idx;
                return (
                  <div
                    key={seg.name}
                    onMouseEnter={() => setHoveredDeptIndex(seg.idx)}
                    onMouseLeave={() => setHoveredDeptIndex(null)}
                    className={`flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer border ${
                      isHovered
                        ? 'bg-slate-50 border-slate-300 shadow-2xs scale-[1.02]'
                        : 'border-transparent hover:bg-slate-50/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-3 h-3 rounded-full shrink-0 shadow-2xs"
                        style={{ backgroundColor: seg.color }}
                      />
                      <span className="text-xs font-semibold text-slate-700 truncate">
                        {seg.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-black text-slate-900">
                        {seg.pieces} {language === 'th' ? 'ชิ้น' : 'pcs'}
                      </span>
                      <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md min-w-[42px] text-right">
                        {seg.percentage}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* NEW: Modern Monthly Bar Chart Section (กราฟแท่งภาพรวมเดือนปัจจุบัน ใต้กราฟวงกลม) */}
      <div className="bg-white rounded-2xl border border-[#e2e8f0] card-shadow p-5 sm:p-6 space-y-6">
        {/* Header & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white flex items-center justify-center shadow-md">
              <BarChart3 className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-[#1a1c1c]">
                  {language === 'th' ? 'ภาพรวมปริมาณงานผ้าประจำเดือน' : 'Monthly Laundry Volume Overview'}
                </h3>
                <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                  {currentMonthDisplayName}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {language === 'th' 
                  ? 'เปรียบเทียบแนวโน้มปริมาณชิ้นผ้า สถานะความพร้อมส่งมอบ และสถิติงานรายวัน' 
                  : 'Daily timeline and category distribution of laundry loads throughout this month'}
              </p>
            </div>
          </div>

          {/* Toggle Daily Timeline vs Category Bars */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl shrink-0 self-start sm:self-auto border border-slate-200/80">
            <button
              type="button"
              onClick={() => setBarChartMode('daily')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                barChartMode === 'daily'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {language === 'th' ? 'รายวัน (Daily)' : 'Daily Timeline'}
            </button>
            <button
              type="button"
              onClick={() => setBarChartMode('category')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                barChartMode === 'category'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {language === 'th' ? 'แยกตามประเภทผ้า (Categories)' : 'By Categories'}
            </button>
          </div>
        </div>

        {/* Quick Month Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/60">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 block">
              {language === 'th' ? 'ปริมาณชิ้นผ้ารวมทั้งเดือน' : 'Total Month Pieces'}
            </span>
            <p className="text-lg sm:text-xl font-black text-slate-900 mt-0.5">
              {monthlyBarChartData.totalMonthPieces.toLocaleString()} <span className="text-xs font-normal text-slate-500">{language === 'th' ? 'ชิ้น' : 'pcs'}</span>
            </p>
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 block">
              {language === 'th' ? 'จำนวนคำสั่งซักรวม' : 'Total Intake Orders'}
            </span>
            <p className="text-lg sm:text-xl font-black text-indigo-600 mt-0.5">
              {monthlyBarChartData.totalMonthOrders} <span className="text-xs font-normal text-slate-500">{language === 'th' ? 'รายการ' : 'orders'}</span>
            </p>
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 block">
              {language === 'th' ? 'เฉลี่ยชิ้นผ้าต่อรายการ' : 'Avg. Pieces / Order'}
            </span>
            <p className="text-lg sm:text-xl font-black text-emerald-600 mt-0.5">
              {monthlyBarChartData.avgPiecesPerOrder} <span className="text-xs font-normal text-slate-500">{language === 'th' ? 'ชิ้น' : 'pcs'}</span>
            </p>
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 block">
              {language === 'th' ? 'ปริมาณสูงสุดต่อวัน' : 'Peak Day Volume'}
            </span>
            <p className="text-lg sm:text-xl font-black text-amber-600 mt-0.5">
              {monthlyBarChartData.maxDayPieces} <span className="text-xs font-normal text-slate-500">{language === 'th' ? 'ชิ้น' : 'pcs'}</span>
            </p>
          </div>
        </div>

        {/* Bar Chart Visualization */}
        {barChartMode === 'daily' ? (
          <div className="space-y-4">
            {/* Legend */}
            <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-emerald-500 shadow-2xs" />
                  <span className="font-semibold text-slate-700">{language === 'th' ? 'ผ้าซักเสร็จสมบูรณ์ / พร้อมส่ง' : 'Ready / Completed'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-amber-400 shadow-2xs" />
                  <span className="font-semibold text-slate-700">{language === 'th' ? 'ผ้าอยู่ระหว่างซัก' : 'In Washing'}</span>
                </div>
              </div>
              <span className="text-[11px] text-slate-400">
                {language === 'th' ? '* โฮเวอร์ที่แท่งกราฟเพื่อดูรายละเอียดเชิงลึก' : '* Hover over bars to see breakdown details'}
              </span>
            </div>

            {/* Daily Bars Container with Mobile Scroll Support */}
            <div className="h-52 sm:h-64 flex items-end justify-start sm:justify-between gap-2 sm:gap-3 pt-8 pb-3 px-1 sm:px-2 border-b border-slate-200 overflow-x-auto scrollbar-thin">
              {monthlyBarChartData.dailyBars.length === 0 ? (
                <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs sm:text-sm py-8">
                  {language === 'th' ? 'ยังไม่มีข้อมูลการบันทึกผ้าในเดือนนี้' : 'No recorded laundry data for this month'}
                </div>
              ) : (
                monthlyBarChartData.dailyBars.map((bar, idx) => {
                  const isHovered = hoveredBarIndex === idx;
                  const barHeightPct = Math.max(14, Math.round(bar.heightRatio * 100));
                  return (
                    <div
                      key={bar.day}
                      onMouseEnter={() => setHoveredBarIndex(idx)}
                      onMouseLeave={() => setHoveredBarIndex(null)}
                      className="min-w-[40px] sm:min-w-0 sm:flex-1 flex flex-col items-center justify-end h-full relative group cursor-pointer shrink-0 sm:shrink"
                    >
                      {/* Floating Tooltip */}
                      {isHovered && (
                        <div className="absolute -top-24 z-30 bg-slate-900 text-white rounded-xl p-2.5 shadow-xl text-left pointer-events-none min-w-[125px] sm:min-w-[135px] animate-in fade-in zoom-in-95 duration-150">
                          <p className="text-[11px] font-bold text-slate-200 border-b border-slate-700 pb-1 mb-1">
                            {bar.label} {currentYear + 543}
                          </p>
                          <div className="space-y-0.5 text-[10.5px]">
                            <div className="flex justify-between gap-2">
                              <span className="text-emerald-400 font-medium">{language === 'th' ? 'เสร็จแล้ว:' : 'Ready:'}</span>
                              <span className="font-bold">{bar.readyPieces} {language === 'th' ? 'ชิ้น' : 'pcs'}</span>
                            </div>
                            <div className="flex justify-between gap-2">
                              <span className="text-amber-400 font-medium">{language === 'th' ? 'กำลังซัก:' : 'Washing:'}</span>
                              <span className="font-bold">{bar.washingPieces} {language === 'th' ? 'ชิ้น' : 'pcs'}</span>
                            </div>
                            <div className="flex justify-between gap-2 pt-1 border-t border-slate-800 text-white font-bold">
                              <span>{language === 'th' ? 'รวม:' : 'Total:'}</span>
                              <span>{bar.totalPieces} {language === 'th' ? 'ชิ้น' : 'pcs'} ({bar.orders} {language === 'th' ? 'งาน' : 'jobs'})</span>
                            </div>
                          </div>
                          {/* Triangle Arrow */}
                          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-900 rotate-45" />
                        </div>
                      )}

                      {/* Number on Top of Bar */}
                      <span className={`text-[9.5px] sm:text-[10px] font-black mb-1.5 transition-all ${
                        isHovered ? 'text-indigo-600 scale-110 font-extrabold' : 'text-slate-500'
                      }`}>
                        {bar.totalPieces}
                      </span>

                      {/* Stacked Vertical Bar */}
                      <div 
                        className={`w-full max-w-[28px] sm:max-w-[42px] rounded-t-xl overflow-hidden flex flex-col justify-end transition-all duration-300 ${
                          isHovered ? 'ring-2 ring-indigo-500 shadow-lg scale-x-105' : 'shadow-2xs'
                        }`}
                        style={{ height: `${barHeightPct}%` }}
                      >
                        {/* Washing portion (Amber Top) */}
                        {bar.washingPieces > 0 && (
                          <div 
                            className="w-full bg-gradient-to-t from-amber-500 to-yellow-400 transition-all"
                            style={{ height: `${bar.washingPercent}%` }}
                          />
                        )}
                        {/* Ready portion (Emerald Bottom) */}
                        {bar.readyPieces > 0 && (
                          <div 
                            className="w-full bg-gradient-to-t from-emerald-600 to-teal-500 transition-all"
                            style={{ height: `${bar.readyPercent}%` }}
                          />
                        )}
                      </div>

                      {/* Day Label Underneath */}
                      <span className="text-[10px] sm:text-[11px] font-bold text-slate-600 mt-2 truncate max-w-full text-center">
                        {bar.label}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          /* Category Horizontal Bar Breakdown */
          <div className="space-y-3 pt-2">
            {monthlyBarChartData.categoryBars.map((cat, idx) => {
              const colors = ['#0284c7', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
              const currentColor = colors[idx % colors.length];
              const pct = monthlyBarChartData.totalMonthPieces > 0 ? ((cat.pieces / monthlyBarChartData.totalMonthPieces) * 100).toFixed(1) : '0';
              return (
                <div key={cat.name} className="space-y-1 group">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Tag className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-bold text-slate-800">{cat.name}</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="font-black text-slate-900">{cat.pieces.toLocaleString()} {language === 'th' ? 'ชิ้น' : 'pcs'}</span>
                      <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        {pct}%
                      </span>
                    </div>
                  </div>

                  {/* Horizontal Bar */}
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500 group-hover:brightness-110"
                      style={{
                        width: `${Math.max(6, Math.round(cat.heightRatio * 100))}%`,
                        backgroundColor: currentColor
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Grid: Recent Activity Feed */}
      <div className="w-full">
        {/* Recent Activity Feed */}
        <div className="w-full bg-white rounded-xl border border-[#e2e8f0] card-shadow flex flex-col overflow-hidden">
          <div className="p-6 border-b border-[#e2e8f0] flex justify-between items-center">
            <h3 className="text-lg font-semibold text-[#1a1c1c] flex items-center gap-2">
              <span>{t.recentActivity}</span>
              {notifications.some(n => n.unread) && (
                <span className="px-2 py-0.5 text-[11px] font-bold bg-blue-100 text-[#0061a5] rounded-full">
                  {notifications.filter(n => n.unread).length} {language === 'th' ? 'ใหม่' : 'new'}
                </span>
              )}
            </h3>
            <button 
              onClick={onOpenNotifications || onNavigateToLaundry}
              className="text-sm font-medium text-[#0061a5] hover:text-[#002045] transition-colors flex items-center gap-1 group cursor-pointer"
            >
              {t.viewAll}
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>

          <div className="flex-1 divide-y divide-[#e2e8f0]/60">
            {displayedNotifications.length === 0 ? (
              <div className="p-10 text-center flex flex-col items-center justify-center text-slate-400">
                <Bell className="w-10 h-10 stroke-1 text-slate-300 mb-2" />
                <p className="text-sm font-medium text-slate-500">
                  {language === 'th' ? 'ยังไม่มีกิจกรรมแจ้งเตือนล่าสุด' : 'No recent notification activity'}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {language === 'th' ? 'เมื่อมีรายการผ้าใหม่ การเปลี่ยนสถานะ หรือการแจ้งซ่อม ข้อมูลจะปรากฏที่นี่แบบเรียลไทม์' : 'New laundry intake and maintenance updates will appear here in real-time.'}
                </p>
              </div>
            ) : (
              displayedNotifications.map((notif) => {
                const isMaintenance = notif.type === 'maintenance_new' || notif.type === 'maintenance_status' || Boolean(notif.workOrderNo || notif.ticketId);
                const isLaundry = notif.type === 'laundry_new' || notif.type === 'laundry_status' || Boolean(notif.trackingCode || notif.orderId);
                const isClickable = isMaintenance || isLaundry || Boolean(onOpenNotifications);

                return (
                  <div
                    key={notif.id}
                    onClick={() => {
                      if (isMaintenance && onSelectNotificationMaintenance) {
                        onSelectNotificationMaintenance(notif.workOrderNo || notif.ticketId || '');
                      } else if ((notif.trackingCode || notif.orderId) && onSelectNotificationOrder) {
                        onSelectNotificationOrder(notif.trackingCode || notif.orderId || '');
                      } else if (onOpenNotifications) {
                        onOpenNotifications();
                      }
                    }}
                    className={`p-5 transition-all flex gap-4 items-start ${
                      isClickable ? 'hover:bg-[#f8fafc] cursor-pointer' : ''
                    } ${notif.unread ? 'bg-[#f0f7ff]/40' : ''}`}
                  >
                    {getNotificationIcon(notif)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-[#1a1c1c] flex items-center gap-2">
                          <span>{notif.title}</span>
                          {notif.unread && (
                            <span className="w-2 h-2 rounded-full bg-[#0061a5] shrink-0" />
                          )}
                        </p>
                        <span className="text-xs text-[#74777f] whitespace-nowrap shrink-0">
                          {notif.time}
                        </span>
                      </div>
                      <p className="text-xs text-[#43474e] mt-1 leading-relaxed">
                        {notif.desc}
                      </p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {notif.trackingCode && (
                          <span className="text-[11px] font-mono font-bold text-[#002045] bg-[#d2e4ff]/40 px-2 py-0.5 rounded border border-[#adc7f7]/60">
                            {notif.trackingCode}
                          </span>
                        )}
                        {notif.workOrderNo && (
                          <span className="text-[11px] font-mono font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            {notif.workOrderNo}
                          </span>
                        )}
                        {notif.department && (
                          <span className="text-[11px] font-medium text-[#43474e] bg-[#f3f3f4] px-2 py-0.5 rounded">
                            {notif.department}
                          </span>
                        )}
                        {notif.stage && (
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            notif.stage === 'ready' 
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                              : 'bg-amber-100 text-amber-900 border border-amber-200'
                          }`}>
                            {notif.stage === 'ready' ? (language === 'th' ? 'ซักเสร็จแล้ว' : 'Ready') : (language === 'th' ? 'อยู่ระหว่างซัก' : 'In Washing')}
                          </span>
                        )}
                        {notif.maintenanceStatus && (
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            notif.maintenanceStatus === 'เสร็จแล้ว'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : notif.maintenanceStatus === 'อยู่ระหว่างดำเนินการ'
                              ? 'bg-sky-100 text-sky-800 border border-sky-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}>
                            {notif.maintenanceStatus}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
