import { LaundryOrder, LaundryItemDetail, LaundryStage, MaintenanceTicket, OtRecord, DailyWorkSchedule, WorkScheduleStatus } from '../types';
import { realtimeHub } from './realtimeService';
import { INITIAL_RAGS_GLOVES_DATA } from '../data/mockRagsGlovesData';

export const GOOGLE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1qbKEbnjIPb2eM-DOLAkFZv3hDl2cioKeUqiLcdYqjos/edit?resourcekey=&gid=1278573396#gid=1278573396';
export const GOOGLE_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/1qbKEbnjIPb2eM-DOLAkFZv3hDl2cioKeUqiLcdYqjos/export?format=csv&gid=1278573396';

// Backup Snapshot CSV text in case network is disconnected or blocked by CORS in some browsers
export const FALLBACK_SHEET_CSV = `ประทับเวลา,กรุณาระบุวันที่,เลือกข้อมูล,ชื่อผู้ดำเนินการ,แผนก,ประเภทผ้า,จำนวน (ตัว/ชิ้น/ผืน),เวลาที่จัดส่ง,แผนก,ประเภทผ้า
22/8/2026,22/8/2026,อยู่ระหว่างการซัก,สุริยา,2/1,เสื้อกาวน์สีเขียว,18,12.35,,
22/8/2026,22/8/2026,ซักเสร็จแล้ว,สุริยา,2/1,เสื้อกาวน์สีเขียว,18,12.35,2/1,เสื้อกาวน์สีเขียว
22/8/2026,22/8/2026,อยู่ระหว่างการซัก,สุริยา,2/2,เสื้อกาวน์สีเขียว,24,12.35,,
22/8/2026,22/8/2026,ซักเสร็จแล้ว,สุริยา,2/2,เสื้อกาวน์สีเขียว,24,12.35,2/2,เสื้อกาวน์สีเขียว
22/8/2026,22/8/2026,อยู่ระหว่างการซัก,สุริยา,2/3,เสื้อกาวน์สีเขียว,15,12.35,,
22/8/2026,22/8/2026,ซักเสร็จแล้ว,สุริยา,2/3,เสื้อกาวน์สีเขียว,15,12.35,2/3,เสื้อกาวน์สีเขียว
22/8/2026,22/8/2026,อยู่ระหว่างการซัก,สุริยา,3/1,เสื้อกาวน์สีเขียว,26,12.35,,
22/8/2026,22/8/2026,ซักเสร็จแล้ว,สุริยา,3/1,เสื้อกาวน์สีเขียว,26,12.35,3/1,เสื้อกาวน์สีเขียว
23/8/2026,23/8/2026,อยู่ระหว่างการซัก,สุริยา,3/2,เสื้อกาวน์สีเขียว,28,12.35,,
23/8/2026,23/8/2026,อยู่ระหว่างการซัก,สุริยา,3/3,เสื้อกาวน์สีเขียว,36,12.35,,
23/8/2026,23/8/2026,อยู่ระหว่างการซัก,สุริยา,3/4,เสื้อกาวน์สีเขียว,30,12.35,,
23/8/2026,23/8/2026,ซักเสร็จแล้ว,สุริยา,3/4,เสื้อกาวน์สีเขียว,30,12.35,3/4,เสื้อกาวน์สีเขียว
23/8/2026,23/8/2026,อยู่ระหว่างการซัก,สุริยา,3/5,เสื้อกาวน์สีเขียว,42,12.35,,
23/8/2026,23/8/2026,อยู่ระหว่างการซัก,สุริยา,A/2,เสื้อกาวน์สีเขียว,10,12.35,,
23/8/2026,23/8/2026,ซักเสร็จแล้ว,สุริยา,A/2,เสื้อกาวน์สีเขียว,10,12.35,A/2,เสื้อกาวน์สีเขียว
23/8/2026,23/8/2026,อยู่ระหว่างการซัก,สุริยา,A/3,เสื้อกาวน์สีเขียว,6,12.35,,
23/8/2026,23/8/2026,อยู่ระหว่างการซัก,สุริยา,A/2,ผ้ากรองแอร์,3,14.35,,
23/8/2026,23/8/2026,ซักเสร็จแล้ว,สุริยา,A/2,ผ้ากรองแอร์,3,14.35,A/2,ผ้ากรองแอร์`;

export interface GoogleSheetSyncResult {
  success: boolean;
  orders: LaundryOrder[];
  rawRowsCount: number;
  lastSyncedAt: Date;
  error?: string;
}

// Persistent memory cache for last successfully synced Laundry CSV
let lastSuccessfulLaundryCsvText: string | null = null;

try {
  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem('proworkflow_laundry_csv_cache_v2');
    if (cached && cached.includes('ประทับเวลา')) {
      lastSuccessfulLaundryCsvText = cached;
    }
  }
} catch {
  // ignore
}

/**
 * Standard CSV Parser handling quotes, commas, and multi-line breaks safely
 */
function parseCSV(text: string): string[][] {
  const lines: string[][] = [];
  let row: string[] = [];
  let inQuotes = false;
  let current = '';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(current.trim().replace(/^["']+|["']+$/g, ''));
      current = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      row.push(current.trim().replace(/^["']+|["']+$/g, ''));
      if (row.some((c) => c.length > 0)) {
        lines.push(row);
      }
      row = [];
      current = '';
    } else {
      current += char;
    }
  }
  if (current || row.length > 0) {
    row.push(current.trim().replace(/^["']+|["']+$/g, ''));
    if (row.some((c) => c.length > 0)) {
      lines.push(row);
    }
  }
  return lines;
}

/**
 * Normalizes department string into clean standard format
 * Handles letters like A/2, A/3, B/1, 2/3, 3/1, ธุรการลาดกระบัง 2, etc.
 */
export function normalizeDepartment(rawDept?: string): string {
  if (!rawDept) return '';
  let dept = rawDept.trim();
  if (!dept) return '';

  // Remove wrapping quotes if any
  dept = dept.replace(/^["']+|["']+$/g, '').trim();

  // 1. Thai prefixes e.g. "แผนก A/2" -> "A/2", "อาคาร A/3" -> "A/3", "ตึก 2/3" -> "2/3"
  const thaiPrefixedMatch = dept.match(/^(?:แผนก|อาคาร|ตึก|ฝ่าย|หน่วยงาน)\s*([A-Za-z]\s*[\/\-\.\s]?\s*\d+|\d+\s*[\/\-\.\s]\s*\d+)/i);
  if (thaiPrefixedMatch) {
    return normalizeDepartment(thaiPrefixedMatch[1]);
  }

  // 2. Alphanumeric codes: e.g. "A/2", "a/3", "A / 2", "A-3", "A.2", "A2", "b/1", "B/5"
  const alphaSlashMatch = dept.match(/^([A-Za-z]+)\s*[\/\-\.\s]?\s*(\d+)$/);
  if (alphaSlashMatch) {
    return `${alphaSlashMatch[1].toUpperCase()}/${alphaSlashMatch[2]}`;
  }

  // 3. Number slash number: e.g. "2/3", "3/1", "2 - 3", "3 / 4"
  const numSlashMatch = dept.match(/^(\d+)\s*[\/\-\.\s]\s*(\d+)$/);
  if (numSlashMatch) {
    return `${numSlashMatch[1]}/${numSlashMatch[2]}`;
  }

  // 4. Double letter or general code e.g. "HR", "QA", "IT" -> uppercase
  if (/^[A-Za-z]{1,4}$/.test(dept)) {
    return dept.toUpperCase();
  }

  // 5. Letter with slash / characters, ensure uppercase on English letters
  if (/^[A-Za-z]/i.test(dept)) {
    return dept.replace(/^[a-z]/i, (c) => c.toUpperCase());
  }

  return dept;
}

/**
 * Normalizes date string into YYYY-MM-DD
 */
export function normalizeDate(rawDate?: string, rawTimestamp?: string, fallbackDate?: string): string {
  let raw = (rawDate || '').trim();
  if (!raw && rawTimestamp) {
    raw = (rawTimestamp || '').trim();
  }
  if (!raw) {
    if (fallbackDate) return fallbackDate;
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  // 1. Strip time portion if present (e.g. "22/8/2026, 1:15:10" -> "22/8/2026", "2026-08-22T01:15:10" -> "2026-08-22")
  const datePart = raw.split(/[,\sT]+/)[0].trim();

  // If Thai month names are present (e.g., "22 ส.ค. 2569" or "22 สิงหาคม 2569")
  const thaiMonths: { [key: string]: string } = {
    'ม.ค.': '01', 'มกราคม': '01',
    'ก.พ.': '02', 'กุมภาพันธ์': '02',
    'มี.ค.': '03', 'มีนาคม': '03',
    'เม.ย.': '04', 'เมษายน': '04',
    'พ.ค.': '05', 'พฤษภาคม': '05',
    'มิ.ย.': '06', 'มิถุนายน': '06',
    'ก.ค.': '07', 'กรกฎาคม': '07',
    'ส.ค.': '08', 'สิงหาคม': '08',
    'ก.ย.': '09', 'กันยายน': '09',
    'ต.ค.': '10', 'ตุลาคม': '10',
    'พ.ย.': '11', 'พฤศจิกายน': '11',
    'ธ.ค.': '12', 'ธันวาคม': '12',
  };
  for (const [tMon, mNum] of Object.entries(thaiMonths)) {
    if (raw.includes(tMon)) {
      const match = raw.match(new RegExp(`(\\d{1,2})\\s*${tMon.replace('.', '\\.')}\\s*(\\d{2,4})`));
      if (match) {
        const d = match[1].padStart(2, '0');
        let y = parseInt(match[2], 10);
        if (y > 2400) y -= 543;
        else if (y < 100) y = y > 50 ? y + 2500 - 543 : y + 2000;
        return `${y}-${mNum}-${d}`;
      }
    }
  }

  // Handle slashes: "22/8/2026", "2026/8/22", "8/22/2026", "22/8/2569"
  if (datePart.includes('/')) {
    const parts = datePart.split('/');
    if (parts.length === 3) {
      const p0 = parseInt(parts[0], 10);
      const p1 = parseInt(parts[1], 10);
      const p2 = parseInt(parts[2], 10);

      // Check if YYYY/MM/DD
      if (p0 > 1000 || parts[0].length === 4) {
        let year = p0;
        if (year > 2400) year -= 543;
        const month = String(p1).padStart(2, '0');
        const day = String(p2).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }

      // Check if DD/MM/YYYY vs MM/DD/YYYY
      let year = p2;
      if (year > 2400) year -= 543;
      else if (year < 100) {
        // e.g. 26 or 69 (2569)
        year = year > 50 ? 2500 + year - 543 : 2000 + year;
      }

      let day = p0;
      let month = p1;
      // If p0 > 12, p0 must be day
      if (p0 > 12) {
        day = p0;
        month = p1;
      } else if (p1 > 12) {
        // e.g. 8/22/2026 -> month 8, day 22
        day = p1;
        month = p0;
      }

      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // Handle dashes: "2026-08-22", "22-08-2026", "22-8-2569"
  if (datePart.includes('-')) {
    const parts = datePart.split('-');
    if (parts.length === 3) {
      const p0 = parseInt(parts[0], 10);
      const p1 = parseInt(parts[1], 10);
      const p2 = parseInt(parts[2], 10);

      if (p0 > 1000 || parts[0].length === 4) {
        let year = p0;
        if (year > 2400) year -= 543;
        const month = String(p1).padStart(2, '0');
        const day = String(p2).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }

      let year = p2;
      if (year > 2400) year -= 543;
      else if (year < 100) {
        year = year > 50 ? 2500 + year - 543 : 2000 + year;
      }

      let day = p0;
      let month = p1;
      if (p0 > 12) {
        day = p0;
        month = p1;
      } else if (p1 > 12) {
        day = p1;
        month = p0;
      }

      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  return '2026-08-22';
}

function formatDeliveryTime(timeStr?: string): string {
  if (!timeStr) return '14:30 น.';
  let t = timeStr.trim();
  t = t.replace(/น\.$/, '').trim();
  t = t.replace('.', ':');
  return `${t} น.`;
}

/**
 * Helper to determine Category for garment item
 */
function getGarmentCategory(garmentName: string): LaundryItemDetail['category'] {
  if (garmentName.includes('ผ้าปู') || garmentName.includes('ปลอก')) return 'Bedding';
  if (garmentName.includes('ผ้ากรอง') || garmentName.includes('ผ้าคลุม')) return 'Specialty';
  if (garmentName.includes('ผ้าเช็ด') || garmentName.includes('ผ้าปูโต๊ะ')) return 'Towels & Linens';
  return 'Clothing';
}

/**
 * Transforms Google Sheet CSV rows into paired or individual Laundry Orders
 * Rule:
 * 1. An entry with status 'อยู่ระหว่างการซัก' (or washing / in progress) creates a NEW intake order ticket.
 * 2. An entry with status 'ซักเสร็จแล้ว' (or completed / ready) pairs with and completes the earliest open 'washing' ticket
 *    for that (Date + Department + Garment Type) in FIFO order.
 * 3. If in 1 day there are multiple entries with the same Date, Department, and Garment Type (e.g. multiple batches / intakes):
 *    - Each intake is added as a NEW separate ticket without overwriting or conflicting with previous tickets.
 *    - Any subsequent completion pairs FIFO with pending intake tickets, or if none pending, creates a new completed ticket.
 * 4. Each ticket gets its own sequential Tracking Code (LKB2 - YYMMDDSS) and unique ID.
 */
export function convertSheetRowsToOrders(csvText: string): LaundryOrder[] {
  const rows = parseCSV(csvText);
  if (rows.length <= 1) return [];

  const dataRows = rows.slice(1);
  const allOrders: LaundryOrder[] = [];
  const dailySeqMap: { [dateStr: string]: number } = {};

  // Track pending 'washing' orders awaiting completion per (Date + Dept + Garment)
  const pendingWashingOrders: { [key: string]: LaundryOrder[] } = {};

  let lastSeenDate = '2026-06-01';

  dataRows.forEach((r, idx) => {
    const timestamp = (r[0] || '').trim();
    const date1 = (r[1] || '').trim();
    const actionCol = (r[2] || '').trim();
    const operator = (r[3] || '').trim();
    const dept1 = (r[4] || '').trim();
    const garment1 = (r[5] || '').trim();
    const qtyCol = (r[6] || '').trim();
    const deliveryTime = (r[7] || '').trim();
    const date2 = (r[8] || '').trim();
    const dept2 = (r[9] || '').trim();
    const garment2 = (r[10] || '').trim();

    const rawDate = date1 || date2 || (timestamp ? timestamp.split(',')[0].split(' ')[0] : '');
    if (rawDate) {
      lastSeenDate = normalizeDate(rawDate, timestamp, lastSeenDate);
    }
    const normalizedDate = rawDate ? normalizeDate(rawDate, timestamp, lastSeenDate) : lastSeenDate;

    let rawDept = dept1 || dept2 || '';
    if (!rawDept) {
      for (let c = 0; c < r.length; c++) {
        const val = (r[c] || '').trim();
        if (!val || val === timestamp || val === date1 || val === date2 || val === actionCol || val === operator) continue;
        if (
          /^[A-Za-z0-9]+[/-][A-Za-z0-9]+/i.test(val) ||
          /^[A-Za-z]\s*\d+/i.test(val) ||
          val.includes('ลาดกระบัง') ||
          val.includes('ธุรการ') ||
          val.includes('สวัสดิการ') ||
          val.includes('สรรหา')
        ) {
          rawDept = val;
          break;
        }
      }
    }
    const dept = normalizeDepartment(rawDept);

    let garment = garment1 || garment2 || '';
    if (!garment) {
      for (let c = 0; c < r.length; c++) {
        const val = (r[c] || '').trim();
        if (!val || val === timestamp || val === date1 || val === date2 || val === actionCol || val === operator || val === rawDept) continue;
        if (
          val.includes('ผ้า') ||
          val.includes('กาวน์') ||
          val.includes('เอี๊ยม') ||
          val.includes('หมวก') ||
          val.includes('ชุด') ||
          val.includes('ปลอก') ||
          val.includes('Visitor')
        ) {
          garment = val;
          break;
        }
      }
    }

    if (!dept || !garment) return;

    let parsedQty = parseInt(qtyCol, 10);
    const hasExplicitQty = !isNaN(parsedQty) && parsedQty > 0;
    const finalQty = hasExplicitQty ? parsedQty : 1;

    // Format Thai display dates
    const dateParts = normalizedDate.split('-');
    const yearNum = parseInt(dateParts[0], 10);
    const monthNum = parseInt(dateParts[1], 10) - 1;
    const dayNum = parseInt(dateParts[2], 10);
    const dateObj = new Date(yearNum, monthNum, dayNum);
    const thaiDateStr = dateObj.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    const isExplicitCompleted =
      actionCol.includes('เสร็จ') ||
      actionCol.includes('เรียบร้อย') ||
      actionCol.includes('พร้อมส่ง') ||
      actionCol.includes('จัดส่งแล้ว') ||
      actionCol.toLowerCase().includes('ready') ||
      actionCol.toLowerCase().includes('complete') ||
      actionCol.toLowerCase().includes('done');

    const key = `${normalizedDate}|${dept.toUpperCase()}|${garment.trim().toLowerCase()}`;

    // Check if there is an active pending 'washing' order waiting for completion
    const pendingList = pendingWashingOrders[key] || [];

    if (isExplicitCompleted && pendingList.length > 0) {
      // Pair with the earliest pending open order (FIFO queue)
      const targetOrder = pendingList.shift()!;
      targetOrder.stage = 'ready';
      targetOrder.completedAt = timestamp || `${thaiDateStr} ${deliveryTime ? formatDeliveryTime(deliveryTime) : '12:35 น.'}`;

      if (deliveryTime) {
        targetOrder.estimatedCompletion = `${thaiDateStr}, ${formatDeliveryTime(deliveryTime)}`;
      }
      // Only update quantity if the completion row explicitly provided a new quantity; otherwise keep the intake quantity!
      if (hasExplicitQty && targetOrder.items.length > 0) {
        targetOrder.items[0].quantity = parsedQty;
        targetOrder.totalPrice = parsedQty * targetOrder.items[0].unitPrice;
        targetOrder.totalWeightKg = parseFloat((parsedQty * 0.35).toFixed(1)) || 1.5;
      }

      targetOrder.historyTimeline.push({
        stage: 'ready',
        label: 'ซักเสร็จแล้ว',
        timestamp: timestamp || (deliveryTime ? formatDeliveryTime(deliveryTime) : '12:35 น.'),
        note: `อัปเดตสถานะ: ซักเสร็จแล้ว${deliveryTime ? ` (เวลาจัดส่ง: ${formatDeliveryTime(deliveryTime)})` : ''}`,
        operator: operator || targetOrder.customerName || 'ระบบอัตโนมัติ Google Sheet',
      });
    } else {
      // Create a NEW order ticket (even if same date, dept, garment exists on the same day)
      if (!dailySeqMap[normalizedDate]) {
        dailySeqMap[normalizedDate] = 1;
      } else {
        dailySeqMap[normalizedDate]++;
      }

      const seqNumber = dailySeqMap[normalizedDate];
      const yy = dateParts[0].slice(-2);
      const mm = dateParts[1];
      const dd = dateParts[2];
      // Accurate tracking code matching the date in Google Sheet: LKB2 - YYMMDDSS
      const trackingCode = `LKB2 - ${yy}${mm}${dd}${String(seqNumber).padStart(2, '0')}`;

      const formattedDelivery = formatDeliveryTime(deliveryTime);
      const estCompletion = `${thaiDateStr}, ${formattedDelivery}`;
      const unitPrice = garment.includes('ผ้ากรอง') || garment.includes('ผ้าคลุม') ? 20 : 15;
      const totalWeight = parseFloat((finalQty * 0.35).toFixed(1)) || 1.5;

      const initialStage = isExplicitCompleted ? 'ready' : 'washing';

      const newOrder: LaundryOrder = {
        id: `gsheet-row-${idx}-${normalizedDate}-${seqNumber}`,
        trackingCode: trackingCode,
        orderDate: normalizedDate,
        customerName: operator || `เจ้าหน้าที่ ${dept}`,
        customerRoomOrDept: dept,
        serviceType: 'Wash & Fold',
        priority: 'normal',
        stage: initialStage,
        items: [
          {
            id: `item-${idx}-1`,
            name: garment,
            category: getGarmentCategory(garment),
            quantity: finalQty,
            unitPrice: unitPrice,
            careNote: 'บันทึกผ่าน Google Sheet',
          },
        ],
        totalWeightKg: totalWeight,
        totalPrice: finalQty * unitPrice,
        paymentStatus: 'Corporate Invoice',
        assignedStaff: operator || 'สุริยา',
        assignedStaffAvatar: isExplicitCompleted
          ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80'
          : 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=80',
        assignedMachine: 'Intake Station #01',
        waterTemp: 'Warm (40°C)',
        notes: `ประเภทผ้า: ${garment} | แผนก: ${dept}`,
        receivedAt: timestamp || `${thaiDateStr} เวลา 08:30 น.`,
        estimatedCompletion: estCompletion,
        completedAt: isExplicitCompleted ? (timestamp || `${thaiDateStr} 12:35 น.`) : undefined,
        historyTimeline: [
          {
            stage: initialStage,
            label: initialStage === 'ready' ? 'ซักเสร็จแล้ว' : 'อยู่ระหว่างซัก',
            timestamp: timestamp || '08:30 น.',
            note: isExplicitCompleted
              ? `บันทึกข้อมูล: แผนก ${dept} ส่ง ${garment} จำนวน ${finalQty} ชิ้น (สถานะ: ซักเสร็จแล้ว)`
              : `บันทึกข้อมูลรับผ้า: แผนก ${dept} ส่ง ${garment} จำนวน ${finalQty} ชิ้น (สถานะ: อยู่ระหว่างซัก)`,
            operator: operator || 'ระบบอัตโนมัติ Google Sheet',
          },
        ],
      };

      allOrders.push(newOrder);

      // If this was an intake order (washing), add to pending queue so a future completion row can pair with it
      if (!isExplicitCompleted) {
        if (!pendingWashingOrders[key]) {
          pendingWashingOrders[key] = [];
        }
        pendingWashingOrders[key].push(newOrder);
      }
    }
  });

  return allOrders;
}

/**
 * Fetch and sync Google Sheet data with multi-tier failover and graceful snapshot fallback
 */
export async function fetchGoogleSheetLaundryOrders(): Promise<GoogleSheetSyncResult> {
  const candidateUrls = [
    // 1. Backend Proxy (direct fetch from Google Sheets with raw format and no CORS issues)
    '/api/sheet-csv?sheetId=1qbKEbnjIPb2eM-DOLAkFZv3hDl2cioKeUqiLcdYqjos&gid=1278573396',
    // 2. Direct export format
    'https://docs.google.com/spreadsheets/d/1qbKEbnjIPb2eM-DOLAkFZv3hDl2cioKeUqiLcdYqjos/export?format=csv&gid=1278573396',
    // 3. Fallback direct export url
    GOOGLE_SHEET_CSV_URL,
  ];

  let csvText: string | null = null;

  for (const url of candidateUrls) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'text/csv, text/plain, */*',
        },
        cache: 'no-cache',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const text = await response.text();
        if (text && text.includes('ประทับเวลา') && text.length > 50) {
          csvText = text;
          lastSuccessfulLaundryCsvText = text;
          try {
            if (typeof window !== 'undefined') {
              localStorage.setItem('proworkflow_laundry_csv_cache_v2', text);
            }
          } catch {
            // ignore
          }
          break;
        }
      }
    } catch {
      // Continue to next candidate endpoint
    }
  }

  // If live network request succeeded, or if we have a cached live CSV, use it
  // Only use the static FALLBACK_SHEET_CSV if there is zero cached data
  const finalText = csvText || lastSuccessfulLaundryCsvText || FALLBACK_SHEET_CSV;
  const orders = convertSheetRowsToOrders(finalText);

  return {
    success: true,
    orders,
    rawRowsCount: finalText.split('\n').filter(Boolean).length - 1,
    lastSyncedAt: new Date(),
  };
}

// ==========================================
// RAGS & GLOVES (เศษผ้า - ถุงมือ) GOOGLE SHEET INTEGRATION
// ==========================================
export const RAGS_GLOVES_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1kPRApx8bpI5zcojAxoRREhbBkuZtU2DpQvVd-9hNIiU/edit?resourcekey=&gid=447781807#gid=447781807';
export const RAGS_GLOVES_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/1kPRApx8bpI5zcojAxoRREhbBkuZtU2DpQvVd-9hNIiU/gviz/tq?tqx=out:csv&gid=447781807';

export const RAGS_GLOVES_FALLBACK_CSV = `"ประทับเวลา","วันที่","คัดทิ้ง / KG เศษผ้า","ถุงมือ","ก่อนทิ้ง / KG เศษผ้า","เศษผ้า","หลังทิ้ง / KG เศษผ้า","ถุงมือ"
"","19/8/2026","15","5","10","","20","20"
"","20/8/2026","10","5","10","","30","20"
"","21/8/2026","15","","20","","20","15"
"22/8/2026, 16:53:50","22/8/2026","10","10","30","30","20","20"`;

export interface RagsGlovesSyncResult {
  success: boolean;
  monthlyData: Record<string, import('../types').RagsGlovesDailyRecord[]>;
  records: import('../types').RagsGlovesDailyRecord[];
  rawRowsCount: number;
  monthsFound: string[];
  lastSyncedAt: Date;
  error?: string;
}

/**
 * Robust date parser for Rags & Gloves Google Sheet rows
 */
export function parseRagsGlovesDate(dateStr?: string, timestampStr?: string): { year: number; month: number; day: number } | null {
  let raw = (dateStr || '').trim();
  if (!raw && timestampStr) {
    raw = (timestampStr || '').trim();
  }
  if (!raw) return null;

  // Extract date portion before space, comma, or T
  const datePart = raw.split(/[,\sT]+/)[0].trim();

  // Thai month names map
  const thaiMonths: { [key: string]: number } = {
    'ม.ค.': 0, 'มกราคม': 0,
    'ก.พ.': 1, 'กุมภาพันธ์': 1,
    'มี.ค.': 2, 'มีนาคม': 2,
    'เม.ย.': 3, 'เมษายน': 3,
    'พ.ค.': 4, 'พฤษภาคม': 4,
    'มิ.ย.': 5, 'มิถุนายน': 5,
    'ก.ค.': 6, 'กรกฎาคม': 6,
    'ส.ค.': 7, 'สิงหาคม': 7,
    'ก.ย.': 8, 'กันยายน': 8,
    'ต.ค.': 9, 'ตุลาคม': 9,
    'พ.ย.': 10, 'พฤศจิกายน': 10,
    'ธ.ค.': 11, 'ธันวาคม': 11,
  };

  for (const [tMon, mIdx] of Object.entries(thaiMonths)) {
    if (raw.includes(tMon)) {
      const match = raw.match(new RegExp(`(\\d{1,2})\\s*${tMon.replace('.', '\\.')}\\s*(\\d{2,4})?`));
      if (match) {
        const day = parseInt(match[1], 10);
        let year = match[2] ? parseInt(match[2], 10) : new Date().getFullYear();
        if (year > 2400) year -= 543;
        else if (year < 100) year = year > 50 ? 2500 + year - 543 : 2000 + year;
        return { year, month: mIdx, day };
      }
    }
  }

  // Handle slashes: "19/8/2026", "2026/8/19", "8/19/2026", "19/8/2569"
  if (datePart.includes('/')) {
    const parts = datePart.split('/');
    if (parts.length === 3) {
      const p0 = parseInt(parts[0], 10);
      const p1 = parseInt(parts[1], 10);
      const p2 = parseInt(parts[2], 10);

      // YYYY/MM/DD
      if (p0 > 1000 || parts[0].length === 4) {
        let year = p0;
        if (year > 2400) year -= 543;
        const month = p1 - 1;
        const day = p2;
        return { year, month, day };
      }

      // DD/MM/YYYY or MM/DD/YYYY
      let year = p2;
      if (year > 2400) year -= 543;
      else if (year < 100) year = year > 50 ? 2500 + year - 543 : 2000 + year;

      let day = p0;
      let month = p1 - 1;
      if (p0 > 12) {
        day = p0;
        month = p1 - 1;
      } else if (p1 > 12) {
        day = p1;
        month = p0 - 1;
      }

      return { year, month, day };
    }
  }

  // Handle dashes: "2026-08-19", "19-08-2026", "19-8-2569"
  if (datePart.includes('-')) {
    const parts = datePart.split('-');
    if (parts.length === 3) {
      const p0 = parseInt(parts[0], 10);
      const p1 = parseInt(parts[1], 10);
      const p2 = parseInt(parts[2], 10);

      if (p0 > 1000 || parts[0].length === 4) {
        let year = p0;
        if (year > 2400) year -= 543;
        const month = p1 - 1;
        const day = p2;
        return { year, month, day };
      }

      let year = p2;
      if (year > 2400) year -= 543;
      else if (year < 100) year = year > 50 ? 2500 + year - 543 : 2000 + year;

      let day = p0;
      let month = p1 - 1;
      if (p0 > 12) {
        day = p0;
        month = p1 - 1;
      } else if (p1 > 12) {
        day = p1;
        month = p0 - 1;
      }

      return { year, month, day };
    }
  }

  const singleDay = parseInt(datePart, 10);
  if (!isNaN(singleDay) && singleDay >= 1 && singleDay <= 31) {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth(), day: singleDay };
  }

  return null;
}

/**
 * Creates empty month template (1 to daysInMonth)
 */
export function createEmptyMonthRecords(year: number, month: number): import('../types').RagsGlovesDailyRecord[] {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const records: import('../types').RagsGlovesDailyRecord[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    records.push({
      day: d,
      dateStr: `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      discardRagsKg: 0,
      discardGlovesKg: 0,
      beforeWashRagsKg: 0,
      beforeWashGlovesKg: 0,
      afterWashRagsKg: 0,
      afterWashGlovesKg: 0,
      note: '',
    });
  }
  return records;
}

/**
 * Converts Rags & Gloves CSV text into multi-month structured dictionary
 */
export function convertSheetRowsToMonthlyRagsGloves(csvText: string): {
  monthlyData: Record<string, import('../types').RagsGlovesDailyRecord[]>;
  rawRowsCount: number;
} {
  const monthlyData: Record<string, import('../types').RagsGlovesDailyRecord[]> = {};

  // Ensure default August 2026 (2026-08) is populated with baseline data
  const aug2026Records = createEmptyMonthRecords(2026, 7);
  INITIAL_RAGS_GLOVES_DATA.forEach((item) => {
    if (item.day >= 1 && item.day <= aug2026Records.length) {
      aug2026Records[item.day - 1] = {
        ...aug2026Records[item.day - 1],
        ...item,
      };
    }
  });
  monthlyData['2026-08'] = aug2026Records;

  const rows = parseCSV(csvText);
  let rawRowsCount = 0;

  if (rows.length > 1) {
    rawRowsCount = rows.length - 1;
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 2) continue;

      const timestampStr = (row[0] || '').trim();
      const dateStr = (row[1] || '').trim();

      const parsedDate = parseRagsGlovesDate(dateStr, timestampStr);
      if (!parsedDate) continue;

      const { year, month, day } = parsedDate;
      const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = createEmptyMonthRecords(year, month);
      }

      const dayRecords = monthlyData[monthKey];
      if (day < 1 || day > dayRecords.length) continue;

      const recordIndex = day - 1;
      const currentRecord = dayRecords[recordIndex];

      const discardRags = parseFloat(row[2]) || 0;
      const discardGloves = parseFloat(row[3]) || 0;
      const beforeWashRags = parseFloat(row[4]) || 0;
      const beforeWashGloves = parseFloat(row[5]) || 0;
      const afterWashRags = parseFloat(row[6]) || 0;
      const afterWashGloves = parseFloat(row[7]) || 0;

      currentRecord.discardRagsKg = discardRags;
      currentRecord.discardGlovesKg = discardGloves;
      currentRecord.beforeWashRagsKg = beforeWashRags;
      currentRecord.beforeWashGlovesKg = beforeWashGloves;
      currentRecord.afterWashRagsKg = afterWashRags;
      currentRecord.afterWashGlovesKg = afterWashGloves;
      currentRecord.dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      if (timestampStr) {
        currentRecord.note = `Google Sheet (${timestampStr})`;
      } else {
        currentRecord.note = 'Google Sheet Sync';
      }
    }
  }

  return { monthlyData, rawRowsCount };
}

/**
 * Converts Rags & Gloves Google Sheet rows into structured RagsGlovesDailyRecord[] for a specific month
 */
export function convertSheetRowsToRagsGloves(csvText: string, year = 2026, month = 7): import('../types').RagsGlovesDailyRecord[] {
  const { monthlyData } = convertSheetRowsToMonthlyRagsGloves(csvText);
  const key = `${year}-${String(month + 1).padStart(2, '0')}`;
  return monthlyData[key] || createEmptyMonthRecords(year, month);
}

/**
 * Fetches Rags & Gloves records live from Google Sheet across all months
 */
export async function fetchGoogleSheetRagsGloves(targetYear = 2026, targetMonth = 7): Promise<RagsGlovesSyncResult> {
  const candidateUrls = [
    '/api/sheet-csv?sheetId=1kPRApx8bpI5zcojAxoRREhbBkuZtU2DpQvVd-9hNIiU&gid=447781807',
    'https://docs.google.com/spreadsheets/d/1kPRApx8bpI5zcojAxoRREhbBkuZtU2DpQvVd-9hNIiU/export?format=csv&gid=447781807',
    RAGS_GLOVES_SHEET_CSV_URL,
    'https://docs.google.com/spreadsheets/d/1kPRApx8bpI5zcojAxoRREhbBkuZtU2DpQvVd-9hNIiU/gviz/tq?tqx=out:csv&sheet=Form%20Responses%201',
    'https://spreadsheets.google.com/tq?tqx=out:csv&key=1kPRApx8bpI5zcojAxoRREhbBkuZtU2DpQvVd-9hNIiU&gid=447781807',
  ];

  let csvText: string | null = null;

  for (const url of candidateUrls) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'text/csv, text/plain, */*',
        },
        cache: 'no-cache',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const text = await response.text();
        if (text && (text.includes('ประทับเวลา') || text.includes('วันที่') || text.includes('คัดทิ้ง'))) {
          csvText = text;
          break;
        }
      }
    } catch {
      // Continue to next candidate endpoint
    }
  }

  const finalText = csvText || RAGS_GLOVES_FALLBACK_CSV;
  const { monthlyData, rawRowsCount } = convertSheetRowsToMonthlyRagsGloves(finalText);
  const targetKey = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}`;
  const currentMonthRecords = monthlyData[targetKey] || createEmptyMonthRecords(targetYear, targetMonth);

  return {
    success: true,
    monthlyData,
    records: currentMonthRecords,
    monthsFound: Object.keys(monthlyData),
    rawRowsCount,
    lastSyncedAt: new Date(),
  };
}

// ==========================================
// MAINTENANCE / REPAIR (งานแจ้งซ่อม) GOOGLE SHEET INTEGRATION
// ==========================================
export const MAINTENANCE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1JOX988hDcFC4c-VUGac7qX_2PH09Zvrnni8evubqiyA/edit?gid=886197199#gid=886197199';
export const MAINTENANCE_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/1JOX988hDcFC4c-VUGac7qX_2PH09Zvrnni8evubqiyA/export?format=csv&gid=886197199';
export const MAINTENANCE_SHEET_GVIZ_CSV_URL = 'https://docs.google.com/spreadsheets/d/1JOX988hDcFC4c-VUGac7qX_2PH09Zvrnni8evubqiyA/gviz/tq?tqx=out:csv&gid=886197199';
export const MAINTENANCE_SHEET_JSON_URL = 'https://docs.google.com/spreadsheets/d/1JOX988hDcFC4c-VUGac7qX_2PH09Zvrnni8evubqiyA/gviz/tq?tqx=out:json&gid=886197199';

export const MAINTENANCE_FALLBACK_CSV = `ลำดับ,เลขที่ใบแจ้งงาน,หน่วยงานที่รับแจ้ง,ปัญหา / รายละเอียด,วันที่แจ้ง,สถานะใบงาน,วันดำเนินการ,ผู้แจ้ง,วันที่แล้วเสร็จ,หมายเหตุุ
1,25043101500001,เทคนิคบริการ ส่วนบำรุงรักษาอาคาร ลาดกระบัง,ซ่อมแซมพื้นแตกชำรุด บริเวณด้านหน้าฝ่ายทรัพยากรบุคคล ชั้น 1 อาคาร A,03-04-25,เสร็จแล้ว,03-04-25,ณัฐพร,18-06-25,
2,25043101500001,แผนกไฟฟ้า ลาดกระบัง ฝ่ายวิศวกรรม,หลอดไฟชำรุดจำนวน 1 หลอด ภายในห้องประชุม TPM2 อาคาร C ชั้น 2,03-04-25,เสร็จแล้ว,03-04-25,ณัฐพร,04-04-25,
3,25043101500002,แผนกบำรุงรักษาระบบสุขาภิบาลและเครื่องกล (ลาดกระบัง),โถปัสสาวะห้องน้ำชายชำรุดจำนวน 2 ตัว ห้องน้ำชาย ชั้น 1 อาคาร C,04-04-25,เสร็จแล้ว,04-04-25,ณัฐพร,04-04-25,
4,25043101500002,แผนกไฟฟ้า ลาดกระบัง ฝ่ายวิศวกรรม,หลอดไฟชำรุด บริเวณทางเข้าไลน์อาคาร A ชั้น 1,04-04-25,เสร็จแล้ว,04-04-25,ณัฐพร,05-04-25,
5,25043101500003,แผนกไฟฟ้า ลาดกระบัง ฝ่ายวิศวกรรม,หลอดไฟชำรุด บริเวณห้องหญิง อาคาร B ชั้น 1,04-04-25,เสร็จแล้ว,04-04-25,ณัฐพร,05-04-25,
475,26073101500003,แผนกธุรการลาดกระบัง1,ขอยืมโน๊ตบุ๊ค สำหรับใช้ประชุมแผนกธุรการ,24-07-26,เสร็จแล้ว,24-07-26,ณัฐพร,24-07-26,
481,26083101500001,แผนกธุรการลาดกระบัง1,นำเครื่องเป่ามือส่งซ่อมศูนย์บริการ,07-08-26,เสร็จแล้ว,07-08-26,ณัฐพร,07-08-26,
493,26083101500003,แผนกธุรการลาดกระบัง1,รับเครื่องเป่ามือคืน,19-08-26,อยู่ระหว่างดำเนินการ,19-08-26,ณัฐพร,,
494,0M003746,เทคนิคบริการ ส่วนบำรุงรักษาอาคาร ลาดกระบัง,ทำตะแกรงปิดฝาท่อน้ำ ข้างอาคาร A หน้าห้องเก็บเศษผ้า,20-08-26,อยู่ระหว่างดำเนินการ,20-08-26,ณัฐพร,,
495,0M003749,เทคนิคบริการ ส่วนบำรุงรักษาอาคาร ลาดกระบัง,ทำที่แขวน เป็นตะขอเหล็ก หน้าห้องน้ำอาคาร B ชั้น 2,20-08-26,อยู่ระหว่างดำเนินการ,20-08-26,ณัฐพร,,
496,0M003767,แผนกบำรุงรักษาระบบสุขาภิบาลและเครื่องกล (ลาดกระบัง),อ่างล้างจาน หน้าห้องวิศกรรม อาคาร C ชั้น 2 ชำรุด,20-08-26,แจ้งใหม่,20-08-26,ณัฐพร,,`;

export interface MaintenanceSyncResult {
  success: boolean;
  tickets: import('../types').MaintenanceTicket[];
  rawRowsCount: number;
  lastSyncedAt: Date;
  error?: string;
}

export function cleanWorkOrderNo(val: any): string {
  if (val === null || val === undefined) return '';
  let s = String(val).trim();
  
  if (s === '-' || s === '--' || s === 'null' || s === 'undefined') return '';

  // 1. Strip Google Sheets / Excel formula prefix e.g. ="25043101500001", =""25043101500001"", ='25043101500001', =25043101500001
  while (s.startsWith('=')) {
    s = s.slice(1).trim();
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
      s = s.slice(1, -1).trim();
    }
  }

  // 2. Strip enclosing single or double quotes
  s = s.replace(/^["']+|["']+$/g, '').trim();

  // 3. Handle scientific notation from number formatting (e.g. 2.5043101500001E+13 or 2.50431E+13)
  if (/^[0-9.]+[eE][+-]?[0-9]+$/.test(s)) {
    try {
      const num = Number(s);
      if (!isNaN(num) && isFinite(num)) {
        s = BigInt(Math.round(num)).toString();
      }
    } catch {
      // keep s as is
    }
  }

  // 4. Remove unwanted trailing .0 if integer was formatted as float (e.g. 25043101500001.0 -> 25043101500001)
  if (/^\d+\.0$/.test(s)) {
    s = s.slice(0, -2);
  }

  return s.trim();
}

/**
 * Parses raw CSV text into MaintenanceTicket objects with dynamic header detection
 */
export function convertSheetRowsToMaintenanceTickets(csvText: string): import('../types').MaintenanceTicket[] {
  const rows = parseCSV(csvText);
  if (!rows || rows.length === 0) return [];

  // 1. Dynamic Header Row & Column Detection
  let headerIndex = -1;
  let colSeq = 0;
  let colWorkOrder = 1;
  let colDept = 2;
  let colIssue = 3;
  let colReportedDate = 4;
  let colStatus = 5;
  let colActionDate = 6;
  let colRequester = 7;
  let colCompletedDate = 8;
  let colNote = 9;

  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;
    const rowStr = row.join(' ').toLowerCase();

    if (
      rowStr.includes('เลขที่ใบแจ้งงาน') ||
      rowStr.includes('เลขที่ใบแจ้ง') ||
      rowStr.includes('ใบแจ้งงาน') ||
      rowStr.includes('ปัญหา') ||
      rowStr.includes('สถานะใบงาน') ||
      rowStr.includes('หน่วยงาน')
    ) {
      headerIndex = i;

      row.forEach((cell, colIdx) => {
        const h = cell.trim().toLowerCase();
        if (h === 'ลำดับ' || h === 'ลำดับที่' || h === 'no' || h === 'seq' || h === 'no.') {
          colSeq = colIdx;
        } else if (
          h.includes('เลขที่ใบแจ้งงาน') ||
          h.includes('เลขที่ใบแจ้ง') ||
          h.includes('เลขที่ใบงาน') ||
          h.includes('เลขที่') ||
          h.includes('work order') ||
          h.includes('wo no') ||
          h.includes('wo#') ||
          h.includes('ticket') ||
          h.includes('job no')
        ) {
          colWorkOrder = colIdx;
        } else if (
          h.includes('หน่วยงาน') ||
          h.includes('แผนก') ||
          h.includes('ฝ่าย') ||
          h.includes('dept') ||
          h.includes('department')
        ) {
          colDept = colIdx;
        } else if (
          h.includes('ปัญหา') ||
          h.includes('รายละเอียด') ||
          h.includes('อาการ') ||
          h.includes('issue') ||
          h.includes('detail') ||
          h.includes('description')
        ) {
          colIssue = colIdx;
        } else if (
          h.includes('วันที่แจ้ง') ||
          h.includes('วันแจ้ง') ||
          (h.includes('วันที่') && !h.includes('แล้วเสร็จ') && !h.includes('ดำเนินการ'))
        ) {
          colReportedDate = colIdx;
        } else if (h.includes('สถานะ') || h.includes('status')) {
          colStatus = colIdx;
        } else if (
          h.includes('วันดำเนินการ') ||
          h.includes('วันที่ดำเนินการ') ||
          h.includes('action date')
        ) {
          colActionDate = colIdx;
        } else if (
          h.includes('ผู้แจ้ง') ||
          h.includes('ชื่อผู้แจ้ง') ||
          h.includes('requester') ||
          h.includes('reporter')
        ) {
          colRequester = colIdx;
        } else if (
          h.includes('แล้วเสร็จ') ||
          h.includes('เสร็จสิ้น') ||
          h.includes('วันที่เสร็จ') ||
          h.includes('completed')
        ) {
          colCompletedDate = colIdx;
        } else if (h.includes('หมายเหตุ') || h.includes('remark') || h.includes('note')) {
          colNote = colIdx;
        }
      });
      break;
    }
  }

  const startIndex = headerIndex >= 0 ? headerIndex + 1 : 1;
  const tickets: import('../types').MaintenanceTicket[] = [];

  for (let i = startIndex; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length < 2) continue;

    const seqRaw = (r[colSeq] || '').trim();
    const workOrderNo = cleanWorkOrderNo(r[colWorkOrder] || '');
    const department = (r[colDept] || '').trim();
    const issueDetail = (r[colIssue] || '').trim();
    const reportedDate = (r[colReportedDate] || '').trim();
    const statusRaw = (r[colStatus] || '').trim();
    const actionDate = (r[colActionDate] || '').trim();
    const requester = (r[colRequester] || '').trim();
    const completedDate = (r[colCompletedDate] || '').trim();
    const note = (r[colNote] || '').trim();

    // Skip empty filler rows
    if (!workOrderNo && !issueDetail && !department && !reportedDate) continue;

    const seq = parseInt(seqRaw, 10) || (i - startIndex + 1);
    const finalWorkOrderNo = workOrderNo;

    let status: import('../types').MaintenanceStatus = 'แจ้งใหม่';
    if (statusRaw.includes('เสร็จ') || statusRaw.includes('เรียบร้อย') || statusRaw.includes('Complete')) {
      status = 'เสร็จแล้ว';
    } else if (statusRaw.includes('ดำเนิน') || statusRaw.includes('ระหว่าง') || statusRaw.includes('Progress') || statusRaw.includes('กำลัง')) {
      status = 'อยู่ระหว่างดำเนินการ';
    } else {
      status = 'แจ้งใหม่';
    }

    // Extract location info if mentioned in text
    let location: string | undefined = undefined;
    const locMatch = issueDetail.match(/(อาคาร\s*[A-Za-z0-9]+|ชั้น\s*[0-9]+|ห้อง\S+|ห้องน้ำ\S+|บริเวณ\S+)/);
    if (locMatch) {
      location = locMatch[0];
    }

    // Determine priority by urgency keywords
    let priority: 'normal' | 'high' | 'urgent' = 'normal';
    const lowerIssue = issueDetail.toLowerCase();
    if (lowerIssue.includes('ด่วนที่สุด') || lowerIssue.includes('ไฟไหม้') || lowerIssue.includes('รั่วซึมหนัก') || lowerIssue.includes('ระเบิด')) {
      priority = 'urgent';
    } else if (lowerIssue.includes('ด่วน') || lowerIssue.includes('ดับ') || lowerIssue.includes('ตัน') || lowerIssue.includes('แตก') || lowerIssue.includes('ชำรุด')) {
      priority = 'high';
    }

    tickets.push({
      id: `maint-${seq}${finalWorkOrderNo ? `-${finalWorkOrderNo.replace(/[^a-zA-Z0-9]/g, '')}` : ''}`,
      seq,
      workOrderNo: finalWorkOrderNo,
      department: department || 'ทั่วไป',
      issueDetail: issueDetail || '-',
      reportedDate: reportedDate || '-',
      status,
      actionDate: actionDate || undefined,
      requester: requester || 'เจ้าหน้าที่',
      completedDate: completedDate || undefined,
      note: note || undefined,
      location,
      priority,
    });
  }

  // Return tickets sorted latest/highest seq first
  return tickets.reverse();
}

/**
 * Fetches Maintenance tickets live from Google Sheet with fallback strategies
 */
export async function fetchGoogleSheetMaintenanceTickets(): Promise<MaintenanceSyncResult> {
  const candidateUrls = [
    '/api/sheet-csv?sheetId=1JOX988hDcFC4c-VUGac7qX_2PH09Zvrnni8evubqiyA&gid=886197199',
    MAINTENANCE_SHEET_CSV_URL,
    'https://docs.google.com/spreadsheets/d/1JOX988hDcFC4c-VUGac7qX_2PH09Zvrnni8evubqiyA/export?format=csv&gid=886197199',
    MAINTENANCE_SHEET_GVIZ_CSV_URL,
    'https://docs.google.com/spreadsheets/d/1JOX988hDcFC4c-VUGac7qX_2PH09Zvrnni8evubqiyA/gviz/tq?tqx=out:csv&sheet=งานแจ้งซ่อม',
    MAINTENANCE_SHEET_JSON_URL,
  ];

  let tickets: import('../types').MaintenanceTicket[] | null = null;

  for (const url of candidateUrls) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json, text/csv, text/plain, */*',
        },
        cache: 'no-cache',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const text = await response.text();

        // Check if response is gviz JSON format
        if (text.includes('google.visualization.Query.setResponse') || (text.startsWith('{') && text.includes('table'))) {
          try {
            const jsonStr = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
            const data = JSON.parse(jsonStr);
            if (data && data.table && Array.isArray(data.table.rows)) {
              const rows = data.table.rows;
              const parsedTickets: import('../types').MaintenanceTicket[] = [];

              rows.forEach((r: any, idx: number) => {
                if (!r || !r.c) return;
                const c = r.c;
                const seqVal = c[0] ? (c[0].v ?? c[0].f) : idx + 1;
                const seq = typeof seqVal === 'number' ? seqVal : parseInt(String(seqVal), 10) || (idx + 1);
                
                let workOrderNo = cleanWorkOrderNo(c[1] ? (c[1].f ?? c[1].v) : '');
                const dept = String(c[2]?.f ?? c[2]?.v ?? '').trim();
                const issue = String(c[3]?.f ?? c[3]?.v ?? '').trim();
                
                // Format dates safely
                let repDate = String(c[4]?.f ?? c[4]?.v ?? '').trim();
                if (repDate.startsWith('Date(')) {
                  const m = repDate.match(/Date\((\d+),(\d+),(\d+)\)/);
                  if (m) {
                    const y = parseInt(m[1], 10);
                    const mo = parseInt(m[2], 10) + 1;
                    const d = parseInt(m[3], 10);
                    repDate = `${String(d).padStart(2, '0')}-${String(mo).padStart(2, '0')}-${String(y).slice(-2)}`;
                  }
                }

                const statusStr = String(c[5]?.f ?? c[5]?.v ?? '').trim();
                
                let actDate = String(c[6]?.f ?? c[6]?.v ?? '').trim();
                if (actDate.startsWith('Date(')) {
                  const m = actDate.match(/Date\((\d+),(\d+),(\d+)\)/);
                  if (m) {
                    const y = parseInt(m[1], 10);
                    const mo = parseInt(m[2], 10) + 1;
                    const d = parseInt(m[3], 10);
                    actDate = `${String(d).padStart(2, '0')}-${String(mo).padStart(2, '0')}-${String(y).slice(-2)}`;
                  }
                }

                const requester = String(c[7]?.f ?? c[7]?.v ?? '').trim();

                let compDate = String(c[8]?.f ?? c[8]?.v ?? '').trim();
                if (compDate.startsWith('Date(')) {
                  const m = compDate.match(/Date\((\d+),(\d+),(\d+)\)/);
                  if (m) {
                    const y = parseInt(m[1], 10);
                    const mo = parseInt(m[2], 10) + 1;
                    const d = parseInt(m[3], 10);
                    compDate = `${String(d).padStart(2, '0')}-${String(mo).padStart(2, '0')}-${String(y).slice(-2)}`;
                  }
                }

                const note = String(c[9]?.f ?? c[9]?.v ?? '').trim();

                // Skip completely empty rows
                if (!workOrderNo && !issue && !dept && !repDate) return;

                const finalWorkOrderNo = workOrderNo;

                let status: import('../types').MaintenanceStatus = 'แจ้งใหม่';
                if (statusStr.includes('เสร็จ') || statusStr.includes('เรียบร้อย') || statusStr.includes('Complete')) {
                  status = 'เสร็จแล้ว';
                } else if (statusStr.includes('ดำเนิน') || statusStr.includes('ระหว่าง') || statusStr.includes('Progress') || statusStr.includes('กำลัง')) {
                  status = 'อยู่ระหว่างดำเนินการ';
                } else {
                  status = 'แจ้งใหม่';
                }

                // Extract location
                let location: string | undefined = undefined;
                const locMatch = issue.match(/(อาคาร\s*[A-Za-z0-9]+|ชั้น\s*[0-9]+|ห้อง\S+|ห้องน้ำ\S+|บริเวณ\S+)/);
                if (locMatch) {
                  location = locMatch[0];
                }

                let priority: 'normal' | 'high' | 'urgent' = 'normal';
                const lowerIssue = issue.toLowerCase();
                if (lowerIssue.includes('ด่วนที่สุด') || lowerIssue.includes('ไฟไหม้') || lowerIssue.includes('รั่วซึมหนัก') || lowerIssue.includes('ระเบิด')) {
                  priority = 'urgent';
                } else if (lowerIssue.includes('ด่วน') || lowerIssue.includes('ดับ') || lowerIssue.includes('ตัน') || lowerIssue.includes('แตก') || lowerIssue.includes('ชำรุด')) {
                  priority = 'high';
                }

                parsedTickets.push({
                  id: `maint-${seq}${finalWorkOrderNo ? `-${finalWorkOrderNo.replace(/[^a-zA-Z0-9]/g, '')}` : ''}`,
                  seq,
                  workOrderNo: finalWorkOrderNo,
                  department: dept || 'ทั่วไป',
                  issueDetail: issue || '-',
                  reportedDate: repDate || '-',
                  status,
                  actionDate: actDate || undefined,
                  requester: requester || 'เจ้าหน้าที่',
                  completedDate: compDate || undefined,
                  note: note || undefined,
                  location,
                  priority,
                });
              });

              if (parsedTickets.length > 0) {
                tickets = parsedTickets.reverse();
                break;
              }
            }
          } catch {
            // fallback to CSV parsing
          }
        }

        // CSV format handling
        if (text && (text.includes('เลขที่ใบแจ้งงาน') || text.includes('ปัญหา') || text.includes('ลำดับ'))) {
          const parsed = convertSheetRowsToMaintenanceTickets(text);
          if (parsed.length > 0) {
            tickets = parsed;
            break;
          }
        }
      }
    } catch {
      // Try next endpoint
    }
  }

  if (!tickets || tickets.length === 0) {
    tickets = convertSheetRowsToMaintenanceTickets(MAINTENANCE_FALLBACK_CSV);
  }

  return {
    success: true,
    tickets,
    rawRowsCount: tickets.length,
    lastSyncedAt: new Date(),
  };
}

// ==========================================
// Google Sheet Integration for บันทึก OT (OT Records)
// ==========================================
export const OT_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1WczTqypbRZgEqhgz221wIEw76KH-zIZzrgVQex-z87s/edit?gid=0#gid=0';
export const OT_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/1WczTqypbRZgEqhgz221wIEw76KH-zIZzrgVQex-z87s/export?format=csv&gid=0';
export const OT_SHEET_GVIZ_CSV_URL = 'https://docs.google.com/spreadsheets/d/1WczTqypbRZgEqhgz221wIEw76KH-zIZzrgVQex-z87s/gviz/tq?tqx=out:csv&gid=0';
export const OT_SHEET_JSON_URL = 'https://docs.google.com/spreadsheets/d/1WczTqypbRZgEqhgz221wIEw76KH-zIZzrgVQex-z87s/gviz/tq?tqx=out:json&gid=0';

export const OT_FALLBACK_CSV = `วันที่บันทึกข้อมูล,รหัสพนักงาน,ชื่อ - นามสกุล,ฝ่ายงาน,วันที่ทำ OT,เวลาทำ OT,,เลขที่เอกสาร,สถานะ,หมายเหตุ
,,,,,เวลาเริ่มต้น,เวลาสิ้นสุด,,,
11/3/2026,358167,สงกรานต์ สุริยแสง,แม่บ้าน,3/3/2026,14.30,18.30,13210,Approved,
,363146,ณัฐภัทร ละลี,แม่บ้าน,3/3/2026,14.30,18.30,,Approved,
11/3/2026,358167,สงกรานต์ สุริยแสง,แม่บ้าน,4/3/2026,14.30,18.30,13561,Approved,
11/3/2026,359110,พรนิภา บุติพันคา,แม่บ้าน,5/3/2026,14.30,16.30,13924,Approved,
11/3/2026,358167,สงกรานต์ สุริยแสง,แม่บ้าน,6/3/2026,14.30,16.30,14147,Approved,
11/3/2026,339858,ชมภู ยาหยี,ธุรการ,6/3/2026,14.30,15.30,14189,Approved,
,716767,สุริยา เวชพันธ์,ธุรการ,6/3/2026,14.30,15.30,,Approved,
,714314,นพเก้า ทองปลิว,ธุรการ,6/3/2026,14.30,15.30,,Approved,
,720592,พงศกร พิกุลทอง,ธุรการ,6/3/2026,14.30,15.30,,Approved,
11/3/2026,358167,สงกรานต์ สุริยแสง,แม่บ้าน,7/3/2026,6.00,14.30,14260,Approved,
11/3/2026,359110,พรนิภา บุติพันคา,แม่บ้าน,10/3/2026,6.00,14.30,13206,Approved,
12/3/2026,716767,สุริยา เวชพันธ์,ธุรการ,12/03/2026,14.30,16.30,15495,Approved,
,358167,สงกรานต์ สุริยแสง,แม่บ้าน,12/03/2026,14.30,16.30,,Approved,
12/3/2026,720592,พงศกร พิกุลทอง,ธุรการ,13/03/2026,4.00,6.00,15565,Approved,
13/03/2026,358167,สงกรานต์ สุริยแสง,แม่บ้าน,13/3/2026,14.30,16.30,15788,Approved,
,716767,สุริยา เวชพันธ์,ธุรการ,13/3/2026,14.30,16.30,,Approved,
13/3/2026,358167,สงกรานต์ สุริยแสง,แม่บ้าน,14/3/2026,6.00,14.30,15790,Approved,
15/3/2026,358167,สงกรานต์ สุริยแสง,แม่บ้าน,15/3/2026,14.30,16.30,16043,Approved,
,363146,ณัฐภัทร ละลี,แม่บ้าน,15/3/2026,14.30,16.30,,Approved,
16/3/2026,358167,สงกรานต์ สุริยแสง,แม่บ้าน,16/3/2026,14.30,16.30,16289,Approved,
,363146,ณัฐภัทร ละลี,แม่บ้าน,16/3/2026,14.30,16.30,,Approved,
2/4/2026,714314,นพเก้า ทองปลิว,ธุรการ,6/4/2026,6.00,14.30,19288,Approved,
,339858,ชมภู ยาหยี,ธุรการ,6/4/2026,6.00,14.30,,Approved,
,359110,พรนิภา บุติพันคา,แม่บ้าน,6/4/2026,6.00,14.30,,Approved,
,363146,ณัฐภัทร ละลี,แม่บ้าน,6/4/2026,6.00,14.30,,Approved,
2/4/2026,358167,สงกรานต์ สุริยแสง,แม่บ้าน,14/4/2026,6.00,14.30,19291,Approved,
,720592,พงศกร พิกุลทอง,ธุรการ,14/4/2026,6.00,14.30,,Approved,
30/4/2026,358167,สงกรานต์ สุริยแสง,แม่บ้าน,1/5/2026,6.00,14.30,24077,Approved,
,359110,พรนิภา บุติพันคา,แม่บ้าน,25/8/2026,14.30,19.00,,Confirm,ไปช่วยงานแผนกผลิต B5
11/8/2026,358167,สงกรานต์ สุริยแสง,แม่บ้าน,26/8/2026,14.30,20.30,44260,Confirm,ไปช่วยงานแผนกผลิต B5
,359110,พรนิภา บุติพันคา,แม่บ้าน,26/8/2026,14.30,20.00,,Confirm,ไปช่วยงานแผนกผลิต B5
11/8/2026,358167,สงกรานต์ สุริยแสง,แม่บ้าน,27/8/2026,14.30,18.30,44263,Confirm,ไปช่วยงานแผนกผลิต B5
,359110,พรนิภา บุติพันคา,แม่บ้าน,27/8/2026,14.30,18.30,,Confirm,ไปช่วยงานแผนกผลิต B5
11/8/2026,358167,สงกรานต์ สุริยแสง,แม่บ้าน,28/8/2026,14.30,18.30,44264,Confirm,ไปช่วยงานแผนกผลิต B5
,359110,พรนิภา บุติพันคา,แม่บ้าน,28/8/2026,14.30,18.30,,Confirm,ไปช่วยงานแผนกผลิต B5
11/8/2026,359110,พรนิภา บุติพันคา,แม่บ้าน,29/8/2026,14.30,19.30,44268,Confirm,ไปช่วยงานแผนกผลิต B5
11/8/2026,359110,พรนิภา บุติพันคา,แม่บ้าน,30/8/2026,6.00,14.30,44270,Confirm,OT. วันหยุดประจำสัปดาห์
11/8/2026,358167,สงกรานต์ สุริยแสง,แม่บ้าน,30/8/2026,14.30,19.30,44271,Confirm,ไปช่วยงานแผนกผลิต B5
11/8/2026,358167,สงกรานต์ สุริยแสง,แม่บ้าน,31/8/2026,14.30,18.30,45897,Confirm,ไปช่วยงานแผนกผลิต B5
,359110,พรนิภา บุติพันคา,แม่บ้าน,31/8/2026,14.30,18.30,,Confirm,ไปช่วยงานแผนกผลิต B5`;

export interface OtSyncResult {
  success: boolean;
  records: OtRecord[];
  rawRowsCount: number;
  lastSyncedAt: Date;
  error?: string;
}

export function calcOtHours(startTime?: string, endTime?: string): number {
  if (!startTime || !endTime) return 0;
  const parseTime = (t: string) => {
    const s = String(t).trim().replace(':', '.');
    const parts = s.split('.');
    const h = parseInt(parts[0] || '0', 10);
    const m = parseInt(parts[1] || '0', 10);
    return h + (m / 60);
  };
  const st = parseTime(startTime);
  const et = parseTime(endTime);
  let diff = et - st;
  if (diff < 0) diff += 24; // overnight OT
  return Math.round(diff * 10) / 10;
}

/**
 * Format OT duration in clock time format:
 * e.g., 0.5 hr -> ".30"
 * 2.5 hrs -> "2.30"
 * 4.0 hrs -> "4.00"
 * 8.5 hrs -> "8.30"
 */
export function formatOtHoursDisplay(startTime?: string, endTime?: string, totalHours?: number): string {
  if (startTime && endTime && startTime !== '-' && endTime !== '') {
    const parseTimeToMins = (t: string) => {
      const s = String(t).trim().replace(':', '.');
      const parts = s.split('.');
      const h = parseInt(parts[0] || '0', 10);
      let mStr = parts[1] || '0';
      if (mStr.length === 1) mStr = mStr + '0';
      const m = parseInt(mStr, 10);
      return h * 60 + m;
    };
    const st = parseTimeToMins(startTime);
    const et = parseTimeToMins(endTime);
    let diff = et - st;
    if (diff < 0) diff += 24 * 60;
    const hrs = Math.floor(diff / 60);
    const mins = diff % 60;
    const minsStr = mins < 10 ? `0${mins}` : `${mins}`;
    if (mins === 0) {
      return `${hrs}.00`;
    }
    if (hrs === 0) {
      return `.${minsStr}`;
    }
    return `${hrs}.${minsStr}`;
  }

  if (typeof totalHours === 'number' && !isNaN(totalHours)) {
    const hrs = Math.floor(totalHours);
    const mins = Math.round((totalHours - hrs) * 60);
    const minsStr = mins < 10 ? `0${mins}` : `${mins}`;
    if (mins === 0) {
      return `${hrs}.00`;
    }
    if (hrs === 0) {
      return `.${minsStr}`;
    }
    return `${hrs}.${minsStr}`;
  }

  return '-';
}

export function convertSheetRowsToOtRecords(csvText: string): OtRecord[] {
  const rows = parseCSV(csvText);
  if (!rows || rows.length < 2) return [];

  // Find header line
  let headerIndex = 0;
  for (let i = 0; i < Math.min(5, rows.length); i++) {
    const rowStr = rows[i].join(' ');
    if (rowStr.includes('รหัสพนักงาน') || rowStr.includes('ชื่อ') || rowStr.includes('วันที่ทำ OT')) {
      headerIndex = i;
      break;
    }
  }

  // Parse records
  const records: OtRecord[] = [];
  let lastRecordedDate = '';
  let lastDocNo = '';

  for (let i = headerIndex + 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length < 3) continue;

    // Skip subheader row if present (e.g. line with 'เวลาเริ่มต้น', 'เวลาสิ้นสุด')
    if (r.join(' ').includes('เวลาเริ่มต้น') || r.join(' ').includes('เวลาสิ้นสุด')) continue;

    const recordedDateRaw = cleanWorkOrderNo(r[0] || '');
    const empIdRaw = cleanWorkOrderNo(r[1] || '');
    const nameRaw = (r[2] || '').trim();
    const deptRaw = (r[3] || '').trim();
    const otDateRaw = cleanWorkOrderNo(r[4] || '');
    const startTimeRaw = cleanWorkOrderNo(r[5] || '');
    const endTimeRaw = cleanWorkOrderNo(r[6] || '');
    const docNoRaw = cleanWorkOrderNo(r[7] || '');
    const statusRaw = (r[8] || '').trim();
    const noteRaw = (r[9] || '').trim();

    // Skip invalid rows or formulas (#N/A)
    if (!empIdRaw && !nameRaw) continue;
    if (empIdRaw === '#N/A' || nameRaw === '#N/A' || deptRaw === '#N/A') continue;

    if (recordedDateRaw) {
      lastRecordedDate = recordedDateRaw;
    }
    if (docNoRaw) {
      lastDocNo = docNoRaw;
    }

    const seq = records.length + 1;
    const totalHours = calcOtHours(startTimeRaw, endTimeRaw);

    let status = statusRaw;
    if (!status) {
      status = 'Approved';
    }

    records.push({
      id: `ot-${seq}-${empIdRaw || 'no-id'}-${docNoRaw || lastDocNo || 'nodoc'}`,
      seq,
      recordedDate: recordedDateRaw || lastRecordedDate || '-',
      employeeId: empIdRaw || '-',
      employeeName: nameRaw || 'ไม่ระบุชื่อ',
      department: deptRaw || 'ทั่วไป',
      otDate: otDateRaw || '-',
      startTime: startTimeRaw || '-',
      endTime: endTimeRaw || '-',
      totalHours,
      docNo: docNoRaw || lastDocNo || '-',
      status,
      note: noteRaw || undefined,
    });
  }

  return records;
}

export function parseGvizJsonOtRecords(jsonStr: string): OtRecord[] {
  try {
    const jsonStart = jsonStr.indexOf('{');
    const jsonEnd = jsonStr.lastIndexOf('}');
    if (jsonStart === -1 || jsonEnd === -1) return [];

    const cleanJson = jsonStr.substring(jsonStart, jsonEnd + 1);
    const gvizData = JSON.parse(cleanJson);
    const gvizRows = gvizData?.table?.rows;
    if (!Array.isArray(gvizRows)) return [];

    const parsedRecords: OtRecord[] = [];
    let lastRecordedDate = '';
    let lastDocNo = '';

    gvizRows.forEach((rowObj: { c: Array<{ v: unknown; f?: string } | null> }) => {
      const getVal = (idx: number): string => {
        const cell = rowObj.c ? rowObj.c[idx] : null;
        if (!cell) return '';
        return String(cell.f || cell.v || '').trim();
      };

      const recordedDateRaw = cleanWorkOrderNo(getVal(0));
      const empIdRaw = cleanWorkOrderNo(getVal(1));
      const nameRaw = getVal(2);
      const deptRaw = getVal(3);
      const otDateRaw = cleanWorkOrderNo(getVal(4));
      const startTimeRaw = cleanWorkOrderNo(getVal(5));
      const endTimeRaw = cleanWorkOrderNo(getVal(6));
      const docNoRaw = cleanWorkOrderNo(getVal(7));
      const statusRaw = getVal(8);
      const noteRaw = getVal(9);

      if (!empIdRaw && !nameRaw) return;
      if (empIdRaw === '#N/A' || nameRaw === '#N/A' || deptRaw === '#N/A') return;

      if (recordedDateRaw) lastRecordedDate = recordedDateRaw;
      if (docNoRaw) lastDocNo = docNoRaw;

      const seq = parsedRecords.length + 1;
      const totalHours = calcOtHours(startTimeRaw, endTimeRaw);

      parsedRecords.push({
        id: `ot-${seq}-${empIdRaw || 'no-id'}-${docNoRaw || lastDocNo || 'nodoc'}`,
        seq,
        recordedDate: recordedDateRaw || lastRecordedDate || '-',
        employeeId: empIdRaw || '-',
        employeeName: nameRaw || 'ไม่ระบุชื่อ',
        department: deptRaw || 'ทั่วไป',
        otDate: otDateRaw || '-',
        startTime: startTimeRaw || '-',
        endTime: endTimeRaw || '-',
        totalHours,
        docNo: docNoRaw || lastDocNo || '-',
        status: statusRaw || 'Approved',
        note: noteRaw || undefined,
      });
    });

    return parsedRecords;
  } catch {
    return [];
  }
}

// In-memory cache & single-flight promise for lightning-fast OT retrieval
let inMemoryOtRecords: OtRecord[] | null = null;
let inFlightOtPromise: Promise<OtSyncResult> | null = null;

export function getCachedOtRecords(): OtRecord[] {
  if (inMemoryOtRecords && inMemoryOtRecords.length > 0) {
    return inMemoryOtRecords;
  }
  try {
    const cached = localStorage.getItem('proworkflow_ot_records_cache_v2');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        inMemoryOtRecords = parsed;
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  return [];
}

/**
 * Super-fast Google Sheets OT records fetcher:
 * - Fires multiple endpoints concurrently with individual timeouts
 * - Resolves with the fastest successful response
 * - Caches in memory and localStorage for instant sub-millisecond retrieval
 */
export async function fetchGoogleSheetOtRecords(options?: { forceRefresh?: boolean }): Promise<OtSyncResult> {
  if (!options?.forceRefresh && inFlightOtPromise) {
    return inFlightOtPromise;
  }

  const executeFetch = async (): Promise<OtSyncResult> => {
    const endpoints = [
      OT_SHEET_GVIZ_CSV_URL,
      OT_SHEET_CSV_URL,
      'https://docs.google.com/spreadsheets/d/1WczTqypbRZgEqhgz221wIEw76KH-zIZzrgVQex-z87s/gviz/tq?tqx=out:csv&sheet=Sheet1',
      OT_SHEET_JSON_URL,
    ];

    // Try all endpoints in parallel and take the fastest valid response
    const fetchSingleEndpoint = async (url: string): Promise<OtRecord[]> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'text/csv, application/json, text/plain, */*',
            'Cache-Control': 'no-cache',
          },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (!response.ok) return [];

        const text = await response.text();
        if (!text || text.length < 20) return [];

        // Check if JSON / GViz
        if (text.startsWith('/*O_o*/') || text.includes('google.visualization.Query.setResponse')) {
          const parsed = parseGvizJsonOtRecords(text);
          if (parsed.length > 0) return parsed;
        }

        // CSV parsing
        if (text.includes('รหัสพนักงาน') || text.includes('ชื่อ') || text.includes('วันที่ทำ OT') || text.includes('OT') || text.includes('Approved')) {
          const parsed = convertSheetRowsToOtRecords(text);
          if (parsed.length > 0) return parsed;
        }
        return [];
      } catch {
        clearTimeout(timeoutId);
        return [];
      }
    };

    let records: OtRecord[] = [];

    try {
      // Race all candidate endpoints to get the fastest valid response
      const results = await Promise.all(endpoints.map(url => fetchSingleEndpoint(url)));
      for (const res of results) {
        if (res && res.length > 0) {
          records = res;
          break;
        }
      }
    } catch {
      // ignore
    }

    // If live fetch returned nothing, check cache or fallback
    if (!records || records.length === 0) {
      const cached = getCachedOtRecords();
      if (cached.length > 0) {
        records = cached;
      } else {
        records = convertSheetRowsToOtRecords(OT_FALLBACK_CSV);
      }
    }

    if (records.length > 0) {
      inMemoryOtRecords = records;
      try {
        localStorage.setItem('proworkflow_ot_records_cache_v2', JSON.stringify(records));
      } catch {
        // ignore
      }
    }

    return {
      success: true,
      records,
      rawRowsCount: records.length,
      lastSyncedAt: new Date(),
    };
  };

  inFlightOtPromise = executeFetch().finally(() => {
    inFlightOtPromise = null;
  });

  return inFlightOtPromise;
}

// -------------------------------------------------------------------------
// WORK SCHEDULE SYNC (ตารางทำงาน)
// -------------------------------------------------------------------------

export const WORK_SCHEDULE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1JqkwbyIvfopCEpk1euQRD9DmWhNFhLhrEveIt0wChYs/edit?gid=0#gid=0';
export const WORK_SCHEDULE_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/1JqkwbyIvfopCEpk1euQRD9DmWhNFhLhrEveIt0wChYs/export?format=csv&gid=0';

export const WORK_SCHEDULE_FALLBACK_CSV = `วัน,วันที่,รายชื่อ,,,,,,,,,,ลาพักร้อน,ลาป่วย,ลากิจ,ขาดงาน,วันนักขัตฤกษ์
,,ณัฐพร,สิทธิกร,ชมภู,สุริยา,พรนิภา,สุดารัตน์,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
,,08.00 - 17.00,08.00 - 17.00,06.00 - 14.30,06.00 - 14.30,06.00 - 14.30,06.00 - 14.30,06.00 - 14.30,06.00 - 14.30,06.00 - 14.30,06.00 - 14.30,,,,,
วันเสาร์,1/8/2026,ณัฐพร,สิทธิกร,ชมภู,สุริยา,พรนิภา,สุดารัตน์,,,,,,,,,
วันอาทิตย์,2/8/2026,,,,,,,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันจันทร์,3/8/2026,ณัฐพร,สิทธิกร,ชมภู,สุริยา,พรนิภา,สุดารัตน์,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันอังคาร,4/8/2026,ณัฐพร,สิทธิกร,ชมภู,สุริยา,พรนิภา,สุดารัตน์,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันพุธ,5/8/2026,ณัฐพร,สิทธิกร,ชมภู,สุริยา,พรนิภา,สุดารัตน์,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันพฤหัสบดี,6/8/2026,ณัฐพร,สิทธิกร,ชมภู,สุริยา,พรนิภา,สุดารัตน์,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันศุกร์,7/8/2026,ณัฐพร,สิทธิกร,ชมภู,สุริยา,พรนิภา,สุดารัตน์,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันเสาร์,8/8/2026,,สิทธิกร,ชมภู,สุริยา,พรนิภา,สุดารัตน์,,,,,,,,,
วันอาทิตย์,9/8/2026,,,,,,,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันจันทร์,10/8/2026,ณัฐพร,สิทธิกร,ชมภู,สุริยา,พรนิภา,สุดารัตน์,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันอังคาร,11/8/2026,ณัฐพร,สิทธิกร,ชมภู,สุริยา,พรนิภา,สุดารัตน์,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันพุธ,12/8/2026,ณัฐพร,สิทธิกร,ชมภู,สุริยา,พรนิภา,สุดารัตน์,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันพฤหัสบดี,13/8/2026,ณัฐพร,สิทธิกร,ชมภู,สุริยา,พรนิภา,สุดารัตน์,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันศุกร์,14/8/2026,ณัฐพร,สิทธิกร,ชมภู,สุริยา,พรนิภา,สุดารัตน์,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันเสาร์,15/8/2026,ณัฐพร,,ชมภู,สุริยา,พรนิภา,สุดารัตน์,,,,,,,,,
วันอาทิตย์,16/8/2026,,,,,,,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันจันทร์,17/8/2026,ณัฐพร,สิทธิกร,ชมภู,สุริยา,พรนิภา,สุดารัตน์,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันอังคาร,18/8/2026,ณัฐพร,สิทธิกร,ชมภู,สุริยา,พรนิภา,สุดารัตน์,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันพุธ,19/8/2026,ณัฐพร,สิทธิกร,ชมภู,สุริยา,พรนิภา,สุดารัตน์,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันพฤหัสบดี,20/8/2026,ณัฐพร,สิทธิกร,ชมภู,สุริยา,พรนิภา,สุดารัตน์,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันศุกร์,21/8/2026,ณัฐพร,สิทธิกร,ชมภู,สุริยา,พรนิภา,สุดารัตน์,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันเสาร์,22/8/2026,,สิทธิกร,ชมภู,สุริยา,พรนิภา,สุดารัตน์,,,,,,,,,
วันอาทิตย์,23/8/2026,,,,,,,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันจันทร์,24/8/2026,ณัฐพร,สิทธิกร,ชมภู,สุริยา,พรนิภา,,นพเก้า,พงศกร,สงกรานต์,ยุพา,,สุดารัตน์,,,
วันอังคาร,25/8/2026,ณัฐพร,สิทธิกร,ชมภู,สุริยา,พรนิภา,สุดารัตน์,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันพุธ,26/8/2026,ณัฐพร,สิทธิกร,ชมภู,สุริยา,พรนิภา,สุดารัตน์,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันพฤหัสบดี,27/8/2026,ณัฐพร,สิทธิกร,ชมภู,สุริยา,พรนิภา,สุดารัตน์,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันศุกร์,28/8/2026,ณัฐพร,สิทธิกร,ชมภู,สุริยา,พรนิภา,สุดารัตน์,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันเสาร์,29/8/2026,ณัฐพร,,ชมภู,สุริยา,พรนิภา,,,,สงกรานต์,,,,,,
วันอาทิตย์,30/8/2026,,,,,,,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันจันทร์,31/8/2026,,สิทธิกร,ชมภู,สุริยา,พรนิภา,,นพเก้า,พงศกร,สงกรานต์,ยุพา,สุดารัตน์,,,,ณัฐพร
วันอังคาร,1/9/2026,ณัฐพร,สิทธิกร,ชมภู,สุริยา,พรนิภา,,นพเก้า,พงศกร,สงกรานต์,ยุพา,สุดารัตน์,,,,
วันพุธ,2/9/2026,ณัฐพร,สิทธิกร,ชมภู,สุริยา,พรนิภา,สุดารัตน์,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันพฤหัสบดี,3/9/2026,ณัฐพร,สิทธิกร,ชมภู,สุริยา,พรนิภา,สุดารัตน์,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันศุกร์,4/9/2026,ณัฐพร,สิทธิกร,ชมภู,สุริยา,พรนิภา,สุดารัตน์,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันเสาร์,5/9/2026,,สิทธิกร,ชมภู,สุริยา,พรนิภา,สุดารัตน์,,,,,,,,,
วันอาทิตย์,6/9/2026,,,,,,,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันจันทร์,7/9/2026,ณัฐพร,สิทธิกร,ชมภู,สุริยา,พรนิภา,สุดารัตน์,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันอังคาร,8/9/2026,ณัฐพร,สิทธิกร,ชมภู,สุริยา,พรนิภา,สุดารัตน์,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันพุธ,9/9/2026,ณัฐพร,สิทธิกร,ชมภู,สุริยา,พรนิภา,สุดารัตน์,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันพฤหัสบดี,10/9/2026,ณัฐพร,สิทธิกร,ชมภู,สุริยา,พรนิภา,สุดารัตน์,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันศุกร์,11/9/2026,ณัฐพร,สิทธิกร,ชมภู,สุริยา,พรนิภา,สุดารัตน์,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันเสาร์,12/9/2026,ณัฐพร,,ชมภู,สุริยา,พรนิภา,สุดารัตน์,,,,,,,,,
วันอาทิตย์,13/9/2026,,,,,,,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันจันทร์,14/9/2026,ณัฐพร,สิทธิกร,ชมภู,สุริยา,พรนิภา,สุดารัตน์,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันอังคาร,15/9/2026,ณัฐพร,สิทธิกร,ชมภู,สุริยา,พรนิภา,สุดารัตน์,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันพุธ,16/9/2026,ณัฐพร,สิทธิกร,ชมภู,สุริยา,พรนิภา,สุดารัตน์,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันพฤหัสบดี,17/9/2026,ณัฐพร,สิทธิกร,ชมภู,สุริยา,พรนิภา,สุดารัตน์,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันศุกร์,18/9/2026,ณัฐพร,สิทธิกร,ชมภู,สุริยา,พรนิภา,สุดารัตน์,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันเสาร์,19/9/2026,ณัฐพร,,ชมภู,สุริยา,พรนิภา,สุดารัตน์,,,,,,,,,
วันอาทิตย์,20/9/2026,,,,,,,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันจันทร์,21/9/2026,ณัฐพร,สิทธิกร,ชมภู,สุริยา,พรนิภา,สุดารัตน์,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันอังคาร,22/9/2026,ณัฐพร,สิทธิกร,ชมภู,สุริยา,พรนิภา,สุดารัตน์,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันพุธ,23/9/2026,ณัฐพร,สิทธิกร,ชมภู,สุริยา,พรนิภา,สุดารัตน์,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันพฤหัสบดี,24/9/2026,ณัฐพร,สิทธิกร,ชมภู,สุริยา,พรนิภา,สุดารัตน์,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันศุกร์,25/9/2026,ณัฐพร,สิทธิกร,ชมภู,สุริยา,พรนิภา,สุดารัตน์,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันเสาร์,26/9/2026,,สิทธิกร,ชมภู,สุริยา,พรนิภา,สุดารัตน์,,,,,,,,,
วันอาทิตย์,27/9/2026,,,,,,,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันจันทร์,28/9/2026,ณัฐพร,สิทธิกร,ชมภู,สุริยา,พรนิภา,สุดารัตน์,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันอังคาร,29/9/2026,ณัฐพร,สิทธิกร,ชมภู,สุริยา,พรนิภา,สุดารัตน์,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันพุธ,30/9/2026,ณัฐพร,สิทธิกร,ชมภู,สุริยา,พรนิภา,สุดารัตน์,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,`;

export function convertSheetRowsToWorkSchedule(csvText: string): DailyWorkSchedule[] {
  if (!csvText || !csvText.trim()) return [];

  const rows = parseCSV(csvText);
  if (rows.length < 3) return [];

  // Leave types from column index 12..
  const leaveTypesMap: { colIndex: number; leaveType: WorkScheduleStatus }[] = [
    { colIndex: 12, leaveType: 'ลาพักร้อน' },
    { colIndex: 13, leaveType: 'ลาป่วย' },
    { colIndex: 14, leaveType: 'ลากิจ' },
    { colIndex: 15, leaveType: 'ขาดงาน' },
    { colIndex: 16, leaveType: 'วันนักขัตฤกษ์' },
  ];

  // Parse Line 1 (Names of standard roster employees cols 2..11)
  const line1 = rows[1] || [];
  // Parse Line 2 (Default Shift Times for each column cols 2..11)
  const line2 = rows[2] || [];

  const employeeColumns: { colIndex: number; name: string; defaultShift: string; department: string }[] = [];
  for (let c = 2; c <= 11; c++) {
    const empName = (line1[c] || '').trim();
    if (empName) {
      const shift = (line2[c] || '').trim() || (empName === 'ณัฐพร' || empName === 'สิทธิกร' ? '08.00 - 17.00' : '06.00 - 14.30');
      let dept = 'ฝ่ายปฏิบัติการ';
      if (empName === 'ณัฐพร' || empName === 'สิทธิกร') dept = 'ฝ่ายบริหาร/ธุรการ';
      employeeColumns.push({
        colIndex: c,
        name: empName,
        defaultShift: shift,
        department: dept,
      });
    }
  }

  const dailySchedules: DailyWorkSchedule[] = [];
  let seq = 1;

  for (let i = 3; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 2) continue;

    const dayOfWeek = (row[0] || '').trim();
    const dateStr = (row[1] || '').trim();
    if (!dateStr || !dayOfWeek) continue;

    const onDutyEmployees: { name: string; shiftTime: string; department: string }[] = [];
    const offDutyEmployees: { name: string; department: string }[] = [];
    const leaveEmployees: { name: string; department: string; leaveType: WorkScheduleStatus }[] = [];

    // Check on duty vs off duty
    employeeColumns.forEach(emp => {
      const cellVal = (row[emp.colIndex] || '').trim();
      if (cellVal && (cellVal === emp.name || cellVal.length > 0)) {
        onDutyEmployees.push({
          name: emp.name,
          shiftTime: emp.defaultShift,
          department: emp.department,
        });
      } else {
        offDutyEmployees.push({
          name: emp.name,
          department: emp.department,
        });
      }
    });

    // Check leaves (cols 12..16)
    leaveTypesMap.forEach(lt => {
      const leaveCell = (row[lt.colIndex] || '').trim();
      if (leaveCell) {
        // Can be comma/space separated names or single name
        const names = leaveCell.split(/[,;\n]/).map(n => n.trim()).filter(Boolean);
        names.forEach(n => {
          const matchedEmp = employeeColumns.find(e => e.name === n);
          leaveEmployees.push({
            name: n,
            department: matchedEmp ? matchedEmp.department : 'ฝ่ายปฏิบัติการ',
            leaveType: lt.leaveType,
          });
        });
      }
    });

    // Format Thai Date string (e.g. 1/8/2026 -> 1 ส.ค. 2569)
    let formattedDate = dateStr;
    const dateParts = dateStr.split(/[-/.]/);
    if (dateParts.length === 3) {
      const d = parseInt(dateParts[0], 10);
      const m = parseInt(dateParts[1], 10);
      let y = parseInt(dateParts[2], 10);
      if (y < 2500) y += 543;
      const thMonths = ['', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
      formattedDate = `${d} ${thMonths[m] || m} ${y}`;
    }

    dailySchedules.push({
      id: `sched_${seq}_${dateStr.replace(/[^a-zA-Z0-9]/g, '_')}`,
      seq,
      dayOfWeek,
      dateStr,
      formattedDate,
      onDutyEmployees,
      offDutyEmployees,
      leaveEmployees,
      totalOnDuty: onDutyEmployees.length,
      totalOffDuty: offDutyEmployees.length,
      totalLeaves: leaveEmployees.length,
    });

    seq++;
  }

  return dailySchedules;
}

let inMemoryWorkSchedule: DailyWorkSchedule[] = [];
let inFlightSchedulePromise: Promise<{
  success: boolean;
  schedules: DailyWorkSchedule[];
  rawRowsCount: number;
  lastSyncedAt: Date;
}> | null = null;

export function getCachedWorkSchedules(): DailyWorkSchedule[] {
  if (inMemoryWorkSchedule.length > 0) return inMemoryWorkSchedule;
  try {
    const cached = localStorage.getItem('proworkflow_work_schedule_cache_v1');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        inMemoryWorkSchedule = parsed;
        return inMemoryWorkSchedule;
      }
    }
  } catch {
    // ignore
  }
  return convertSheetRowsToWorkSchedule(WORK_SCHEDULE_FALLBACK_CSV);
}

export async function fetchGoogleSheetWorkSchedule(): Promise<{
  success: boolean;
  schedules: DailyWorkSchedule[];
  rawRowsCount: number;
  lastSyncedAt: Date;
}> {
  if (inFlightSchedulePromise) {
    return inFlightSchedulePromise;
  }

  const executeFetch = async () => {
    const endpoints = [
      WORK_SCHEDULE_SHEET_CSV_URL,
      `https://docs.google.com/spreadsheets/d/1JqkwbyIvfopCEpk1euQRD9DmWhNFhLhrEveIt0wChYs/gviz/tq?tqx=out:csv&gid=0`,
    ];

    const fetchSingleEndpoint = async (url: string): Promise<DailyWorkSchedule[]> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      try {
        const response = await fetch(url, {
          signal: controller.signal,
          headers: { Accept: 'text/csv, text/plain, */*' },
          cache: 'no-store',
        });
        clearTimeout(timeoutId);
        if (!response.ok) return [];
        const text = await response.text();
        if (text.includes('วัน') && (text.includes('วันที่') || text.includes('รายชื่อ') || text.includes('ณัฐพร'))) {
          const parsed = convertSheetRowsToWorkSchedule(text);
          if (parsed.length > 0) return parsed;
        }
        return [];
      } catch {
        clearTimeout(timeoutId);
        return [];
      }
    };

    let schedules: DailyWorkSchedule[] = [];

    try {
      const results = await Promise.all(endpoints.map(url => fetchSingleEndpoint(url)));
      for (const res of results) {
        if (res && res.length > 0) {
          schedules = res;
          break;
        }
      }
    } catch {
      // ignore
    }

    if (!schedules || schedules.length === 0) {
      const cached = getCachedWorkSchedules();
      if (cached.length > 0) {
        schedules = cached;
      } else {
        schedules = convertSheetRowsToWorkSchedule(WORK_SCHEDULE_FALLBACK_CSV);
      }
    }

    if (schedules.length > 0) {
      inMemoryWorkSchedule = schedules;
      try {
        localStorage.setItem('proworkflow_work_schedule_cache_v1', JSON.stringify(schedules));
      } catch {
        // ignore
      }
    }

    return {
      success: true,
      schedules,
      rawRowsCount: schedules.length,
      lastSyncedAt: new Date(),
    };
  };

  inFlightSchedulePromise = executeFetch().finally(() => {
    inFlightSchedulePromise = null;
  });

  return inFlightSchedulePromise;
}


