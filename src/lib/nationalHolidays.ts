// Indonesian National Holidays & Cuti Bersama (SKB 3 Menteri)
// Covers 2024, 2025, 2026, 2027

export interface HolidayEntry {
  name: string
  type: 'libur_nasional' | 'cuti_bersama'
}

export interface HolidayInfoResult {
  isHoliday: boolean
  name: string | null
  type: 'libur_nasional' | 'cuti_bersama' | 'khusus' | null
  isNational: boolean
  isCutiBersama: boolean
}

export const INDONESIAN_HOLIDAYS_MAP: Record<string, HolidayEntry> = {
  // ================= 2024 =================
  '2024-01-01': { name: 'Tahun Baru 2024 Masehi', type: 'libur_nasional' },
  '2024-02-08': { name: 'Isra Mi\'raj Nabi Muhammad SAW', type: 'libur_nasional' },
  '2024-02-09': { name: 'Cuti Bersama Tahun Baru Imlek', type: 'cuti_bersama' },
  '2024-02-10': { name: 'Tahun Baru Imlek 2575 Kongzili', type: 'libur_nasional' },
  '2024-03-11': { name: 'Hari Suci Nyepi (Tahun Baru Saka 1946)', type: 'libur_nasional' },
  '2024-03-12': { name: 'Cuti Bersama Hari Suci Nyepi', type: 'cuti_bersama' },
  '2024-03-29': { name: 'Wafat Yesus Kristus', type: 'libur_nasional' },
  '2024-03-31': { name: 'Hari Paskah', type: 'libur_nasional' },
  '2024-04-08': { name: 'Cuti Bersama Hari Raya Idul Fitri 1445 H', type: 'cuti_bersama' },
  '2024-04-09': { name: 'Cuti Bersama Hari Raya Idul Fitri 1445 H', type: 'cuti_bersama' },
  '2024-04-10': { name: 'Hari Raya Idul Fitri 1445 H', type: 'libur_nasional' },
  '2024-04-11': { name: 'Hari Raya Idul Fitri 1445 H', type: 'libur_nasional' },
  '2024-04-12': { name: 'Cuti Bersama Hari Raya Idul Fitri 1445 H', type: 'cuti_bersama' },
  '2024-04-15': { name: 'Cuti Bersama Hari Raya Idul Fitri 1445 H', type: 'cuti_bersama' },
  '2024-05-01': { name: 'Hari Buruh Internasional', type: 'libur_nasional' },
  '2024-05-09': { name: 'Kenaikan Yesus Kristus', type: 'libur_nasional' },
  '2024-05-10': { name: 'Cuti Bersama Kenaikan Yesus Kristus', type: 'cuti_bersama' },
  '2024-05-23': { name: 'Hari Raya Waisak 2568 BE', type: 'libur_nasional' },
  '2024-05-24': { name: 'Cuti Bersama Hari Raya Waisak', type: 'cuti_bersama' },
  '2024-06-01': { name: 'Hari Lahir Pancasila', type: 'libur_nasional' },
  '2024-06-17': { name: 'Hari Raya Idul Adha 1445 H', type: 'libur_nasional' },
  '2024-06-18': { name: 'Cuti Bersama Hari Raya Idul Adha 1445 H', type: 'cuti_bersama' },
  '2024-07-07': { name: 'Tahun Baru Islam 1446 H', type: 'libur_nasional' },
  '2024-08-17': { name: 'Hari Kemerdekaan Republik Indonesia', type: 'libur_nasional' },
  '2024-09-16': { name: 'Maulid Nabi Muhammad SAW', type: 'libur_nasional' },
  '2024-12-25': { name: 'Hari Raya Natal', type: 'libur_nasional' },
  '2024-12-26': { name: 'Cuti Bersama Hari Raya Natal', type: 'cuti_bersama' },

  // ================= 2025 =================
  '2025-01-01': { name: 'Tahun Baru 2025 Masehi', type: 'libur_nasional' },
  '2025-01-27': { name: 'Isra Mi\'raj Nabi Muhammad SAW', type: 'libur_nasional' },
  '2025-01-28': { name: 'Cuti Bersama Tahun Baru Imlek', type: 'cuti_bersama' },
  '2025-01-29': { name: 'Tahun Baru Imlek 2576 Kongzili', type: 'libur_nasional' },
  '2025-03-28': { name: 'Cuti Bersama Hari Suci Nyepi', type: 'cuti_bersama' },
  '2025-03-29': { name: 'Hari Suci Nyepi (Tahun Baru Saka 1947)', type: 'libur_nasional' },
  '2025-03-31': { name: 'Hari Raya Idul Fitri 1446 H', type: 'libur_nasional' },
  '2025-04-01': { name: 'Hari Raya Idul Fitri 1446 H', type: 'libur_nasional' },
  '2025-04-02': { name: 'Cuti Bersama Hari Raya Idul Fitri 1446 H', type: 'cuti_bersama' },
  '2025-04-03': { name: 'Cuti Bersama Hari Raya Idul Fitri 1446 H', type: 'cuti_bersama' },
  '2025-04-04': { name: 'Cuti Bersama Hari Raya Idul Fitri 1446 H', type: 'cuti_bersama' },
  '2025-04-07': { name: 'Cuti Bersama Hari Raya Idul Fitri 1446 H', type: 'cuti_bersama' },
  '2025-04-18': { name: 'Wafat Yesus Kristus', type: 'libur_nasional' },
  '2025-04-20': { name: 'Hari Paskah', type: 'libur_nasional' },
  '2025-05-01': { name: 'Hari Buruh Internasional', type: 'libur_nasional' },
  '2025-05-12': { name: 'Hari Raya Waisak 2569 BE', type: 'libur_nasional' },
  '2025-05-13': { name: 'Cuti Bersama Hari Raya Waisak', type: 'cuti_bersama' },
  '2025-05-29': { name: 'Kenaikan Yesus Kristus', type: 'libur_nasional' },
  '2025-05-30': { name: 'Cuti Bersama Kenaikan Yesus Kristus', type: 'cuti_bersama' },
  '2025-06-01': { name: 'Hari Lahir Pancasila', type: 'libur_nasional' },
  '2025-06-06': { name: 'Hari Raya Idul Adha 1446 H', type: 'libur_nasional' },
  '2025-06-09': { name: 'Cuti Bersama Hari Raya Idul Adha 1446 H', type: 'cuti_bersama' },
  '2025-06-27': { name: 'Tahun Baru Islam 1447 H', type: 'libur_nasional' },
  '2025-08-17': { name: 'Hari Kemerdekaan Republik Indonesia', type: 'libur_nasional' },
  '2025-09-05': { name: 'Maulid Nabi Muhammad SAW', type: 'libur_nasional' },
  '2025-12-25': { name: 'Hari Raya Natal', type: 'libur_nasional' },
  '2025-12-26': { name: 'Cuti Bersama Hari Raya Natal', type: 'cuti_bersama' },

  // ================= 2026 =================
  '2026-01-01': { name: 'Tahun Baru 2026 Masehi', type: 'libur_nasional' },
  '2026-02-16': { name: 'Isra Mi\'raj Nabi Muhammad SAW', type: 'libur_nasional' },
  '2026-02-17': { name: 'Tahun Baru Imlek 2577 Kongzili', type: 'libur_nasional' },
  '2026-02-18': { name: 'Cuti Bersama Tahun Baru Imlek', type: 'cuti_bersama' },
  '2026-03-18': { name: 'Cuti Bersama Hari Suci Nyepi', type: 'cuti_bersama' },
  '2026-03-19': { name: 'Hari Suci Nyepi (Tahun Baru Saka 1948)', type: 'libur_nasional' },
  '2026-03-20': { name: 'Hari Raya Idul Fitri 1447 H', type: 'libur_nasional' },
  '2026-03-21': { name: 'Hari Raya Idul Fitri 1447 H', type: 'libur_nasional' },
  '2026-03-23': { name: 'Cuti Bersama Hari Raya Idul Fitri 1447 H', type: 'cuti_bersama' },
  '2026-03-24': { name: 'Cuti Bersama Hari Raya Idul Fitri 1447 H', type: 'cuti_bersama' },
  '2026-03-25': { name: 'Cuti Bersama Hari Raya Idul Fitri 1447 H', type: 'cuti_bersama' },
  '2026-04-03': { name: 'Wafat Yesus Kristus', type: 'libur_nasional' },
  '2026-04-05': { name: 'Hari Paskah', type: 'libur_nasional' },
  '2026-05-01': { name: 'Hari Buruh Internasional', type: 'libur_nasional' },
  '2026-05-14': { name: 'Kenaikan Yesus Kristus', type: 'libur_nasional' },
  '2026-05-15': { name: 'Cuti Bersama Kenaikan Yesus Kristus', type: 'cuti_bersama' },
  '2026-05-27': { name: 'Hari Raya Idul Adha 1447 H', type: 'libur_nasional' },
  '2026-05-28': { name: 'Cuti Bersama Hari Raya Idul Adha 1447 H', type: 'cuti_bersama' },
  '2026-05-31': { name: 'Hari Raya Waisak 2570 BE', type: 'libur_nasional' },
  '2026-06-01': { name: 'Hari Lahir Pancasila', type: 'libur_nasional' },
  '2026-06-16': { name: 'Tahun Baru Islam 1448 H', type: 'libur_nasional' },
  '2026-08-17': { name: 'Hari Kemerdekaan Republik Indonesia (HUT RI)', type: 'libur_nasional' },
  '2026-08-25': { name: 'Maulid Nabi Muhammad SAW', type: 'libur_nasional' },
  '2026-12-25': { name: 'Hari Raya Natal', type: 'libur_nasional' },
  '2026-12-26': { name: 'Cuti Bersama Hari Raya Natal', type: 'cuti_bersama' },

  // ================= 2027 =================
  '2027-01-01': { name: 'Tahun Baru 2027 Masehi', type: 'libur_nasional' },
  '2027-02-06': { name: 'Isra Mi\'raj Nabi Muhammad SAW', type: 'libur_nasional' },
  '2027-02-07': { name: 'Tahun Baru Imlek 2578 Kongzili', type: 'libur_nasional' },
  '2027-02-08': { name: 'Cuti Bersama Tahun Baru Imlek', type: 'cuti_bersama' },
  '2027-03-08': { name: 'Cuti Bersama Hari Raya Idul Fitri 1448 H', type: 'cuti_bersama' },
  '2027-03-09': { name: 'Hari Raya Idul Fitri 1448 H', type: 'libur_nasional' },
  '2027-03-10': { name: 'Hari Raya Idul Fitri 1448 H', type: 'libur_nasional' },
  '2027-03-11': { name: 'Cuti Bersama Hari Raya Idul Fitri 1448 H', type: 'cuti_bersama' },
  '2027-03-12': { name: 'Cuti Bersama Hari Raya Idul Fitri 1448 H', type: 'cuti_bersama' },
  '2027-03-26': { name: 'Wafat Yesus Kristus', type: 'libur_nasional' },
  '2027-03-28': { name: 'Hari Paskah', type: 'libur_nasional' },
  '2027-04-08': { name: 'Hari Suci Nyepi (Tahun Baru Saka 1949)', type: 'libur_nasional' },
  '2027-05-01': { name: 'Hari Buruh Internasional', type: 'libur_nasional' },
  '2027-05-06': { name: 'Kenaikan Yesus Kristus', type: 'libur_nasional' },
  '2027-05-07': { name: 'Cuti Bersama Kenaikan Yesus Kristus', type: 'cuti_bersama' },
  '2027-05-16': { name: 'Hari Raya Idul Adha 1448 H', type: 'libur_nasional' },
  '2027-05-20': { name: 'Hari Raya Waisak 2571 BE', type: 'libur_nasional' },
  '2027-06-01': { name: 'Hari Lahir Pancasila', type: 'libur_nasional' },
  '2027-06-06': { name: 'Tahun Baru Islam 1449 H', type: 'libur_nasional' },
  '2027-08-15': { name: 'Maulid Nabi Muhammad SAW', type: 'libur_nasional' },
  '2027-08-17': { name: 'Hari Kemerdekaan Republik Indonesia', type: 'libur_nasional' },
  '2027-12-25': { name: 'Hari Raya Natal', type: 'libur_nasional' },
  '2027-12-26': { name: 'Cuti Bersama Hari Raya Natal', type: 'cuti_bersama' },
}

/**
 * Checks holiday status for a specific YYYY-MM-DD date.
 */
export function getHolidayInfo(
  dateStr: string,
  customHolidays: { date: string; name: string }[] = []
): HolidayInfoResult {
  // 1. Check custom database holidays first
  const custom = customHolidays.find((h) => h.date === dateStr)
  if (custom) {
    return {
      isHoliday: true,
      name: custom.name,
      type: 'khusus',
      isNational: false,
      isCutiBersama: false,
    }
  }

  // 2. Check national holidays & cuti bersama dictionary
  const national = INDONESIAN_HOLIDAYS_MAP[dateStr]
  if (national) {
    return {
      isHoliday: true,
      name: national.name,
      type: national.type,
      isNational: national.type === 'libur_nasional',
      isCutiBersama: national.type === 'cuti_bersama',
    }
  }

  return {
    isHoliday: false,
    name: null,
    type: null,
    isNational: false,
    isCutiBersama: false,
  }
}

/**
 * Returns all holidays and cuti bersama occurring within a given year and month (0-11).
 * Sorted by day of month.
 */
export function getHolidaysForMonth(
  year: number,
  month: number, // 0-11
  customHolidays: { date: string; name: string }[] = []
): { dateStr: string; day: number; name: string; type: 'libur_nasional' | 'cuti_bersama' | 'khusus' }[] {
  const padMonth = (month + 1).toString().padStart(2, '0')
  const prefix = `${year}-${padMonth}-`
  const results: { dateStr: string; day: number; name: string; type: 'libur_nasional' | 'cuti_bersama' | 'khusus' }[] = []

  // Check national holidays
  for (const [dateStr, val] of Object.entries(INDONESIAN_HOLIDAYS_MAP)) {
    if (dateStr.startsWith(prefix)) {
      const day = parseInt(dateStr.split('-')[2], 10)
      results.push({
        dateStr,
        day,
        name: val.name,
        type: val.type,
      })
    }
  }

  // Check custom holidays
  for (const custom of customHolidays) {
    if (custom.date && custom.date.startsWith(prefix)) {
      const day = parseInt(custom.date.split('-')[2], 10)
      // Check if already in results
      const existing = results.find((r) => r.dateStr === custom.date)
      if (existing) {
        existing.name = custom.name
        existing.type = 'khusus'
      } else {
        results.push({
          dateStr: custom.date,
          day,
          name: custom.name,
          type: 'khusus',
        })
      }
    }
  }

  // Sort chronologically by day
  return results.sort((a, b) => a.day - b.day)
}
