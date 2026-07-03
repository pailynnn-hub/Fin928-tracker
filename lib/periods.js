// helper สำหรับคำนวณวันเริ่ม-สิ้นสุดของแต่ละช่วงเวลา อิงตามวันที่ปัจจุบัน

export const ACTIVITY_FIELDS = [
  { key: 'calls_prospecting', label: 'โทรทาบทามทำนัด' },
  { key: 'visits', label: 'เข้าพบลูกค้า' },
  { key: 'fact_finding', label: 'Fact Finding' },
  { key: 'fhc', label: 'Financial Health Check' },
  { key: 'storytelling', label: 'สร้างปัญหา/Story Telling' },
  { key: 'plans_presented', label: 'เสนอแผน' },
  { key: 'closing_attempts', label: 'ทึกทักปิดการขาย' },
  { key: 'policies_closed', label: 'กรมธรรม์ที่ปิดได้' },
  { key: 'fyp_amount', label: 'ยอด FYP (บาท)', isCurrency: true },
  { key: 'fyc_amount', label: 'ยอด FYC (บาท)', isCurrency: true },
  { key: 'life_count', label: 'จำนวนราย (Life)' },
]

export const RECRUITING_FIELDS = [
  { key: 'screening_questions', label: 'ตั้งคำถามเกณฑ์' },
  { key: 'career_pitch', label: 'ชวน/ขายอาชีพ' },
  { key: 'interviews_sent', label: 'ส่งเข้าสัมภาษณ์' },
  { key: 'exam_passed', label: 'สอบผ่าน' },
  { key: 'codes_issued', label: 'ได้ออกโค้ด' },
  { key: 'real_agents', label: 'ได้เป็น Real Agent' },
  { key: 'fas_count', label: 'ได้เป็น FAS' },
  { key: 'fap_count', label: 'ได้เป็น FAP' },
]

// เฉพาะฟิลด์ที่ใช้กับแคมเปญ (FYP / FYC / Life เท่านั้น)
export const CAMPAIGN_FIELDS = [
  { key: 'fyp_amount', targetKey: 'target_fyp_amount', label: 'FYP', isCurrency: true },
  { key: 'fyc_amount', targetKey: 'target_fyc_amount', label: 'FYC', isCurrency: true },
  { key: 'life_count', targetKey: 'target_life_count', label: 'จำนวนราย (Life)' },
]

export function getPeriodRange(type, refDate = new Date()) {
  const d = new Date(refDate)
  d.setHours(0, 0, 0, 0)

  if (type === 'day') {
    return { start: d, end: d }
  }
  if (type === 'week') {
    const day = d.getDay()
    const start = new Date(d)
    start.setDate(d.getDate() - day)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    return { start, end }
  }
  if (type === 'month') {
    const start = new Date(d.getFullYear(), d.getMonth(), 1)
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0)
    return { start, end }
  }
  if (type === 'quarter') {
    const q = Math.floor(d.getMonth() / 3)
    const start = new Date(d.getFullYear(), q * 3, 1)
    const end = new Date(d.getFullYear(), q * 3 + 3, 0)
    return { start, end }
  }
  if (type === 'half_year') {
    const h = d.getMonth() < 6 ? 0 : 6
    const start = new Date(d.getFullYear(), h, 1)
    const end = new Date(d.getFullYear(), h + 6, 0)
    return { start, end }
  }
  if (type === 'year') {
    const start = new Date(d.getFullYear(), 0, 1)
    const end = new Date(d.getFullYear(), 11, 31)
    return { start, end }
  }
  return { start: d, end: d }
}

export function toISODate(date) {
  return date.toISOString().split('T')[0]
}

export const PERIOD_LABELS = {
  day: 'รายวัน',
  week: 'รายสัปดาห์',
  month: 'รายเดือน',
  quarter: 'รายไตรมาส',
  half_year: 'ราย 6 เดือน',
  year: 'รายปี',
}

// จำนวนวันที่เหลือถึงวันที่กำหนด (นับรวมวันนี้), 0 หรือติดลบ = หมดเขตแล้ว
export function daysRemaining(endDateStr) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const end = new Date(endDateStr)
  end.setHours(0, 0, 0, 0)
  const diffMs = end.getTime() - today.getTime()
  return Math.round(diffMs / (1000 * 60 * 60 * 24))
}

export function formatThaiDate(date = new Date()) {
  return date.toLocaleDateString('th-TH', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
