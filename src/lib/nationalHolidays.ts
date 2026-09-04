// Indonesian National Holidays dataset (Hari Libur Nasional & Cuti Bersama)
// Covers 2024, 2025, 2026, 2027

export interface HolidayItem {
  date: string // YYYY-MM-DD
  name: string
  isNationalHoliday: boolean
}

export const INDONESIAN_NATIONAL_HOLIDAYS: Record<string, string> = {
  // === 2024 ===
  '2024-01-01': 'Tahun Baru 2024 Masehi',
  '2024-02-08': 'Isra Mi\'raj Nabi Muhammad SAW',
  '2024-02-10': 'Tahun Baru Imlek 2575 Kongzili',
  '2024-03-11': 'Hari Suci Nyepi (Tahun Baru Saka 1946)',
  '2024-03-29': 'Wafat Yesus Kristus',
  '2024-03-31': 'Hari Paskah',
  '2024-04-10': 'Hari Raya Idul Fitri 1445 H',
  '2024-04-11': 'Hari Raya Idul Fitri 1445 H',
  '2024-05-01': 'Hari Buruh Internasional',
  '2024-05-09': 'Kenaikan Yesus Kristus',
  '2024-05-23': 'Hari Raya Waisak 2568 BE',
  '2024-06-01': 'Hari Lahir Pancasila',
  '2024-06-17': 'Hari Raya Idul Adha 1445 H',
  '2024-07-07': 'Tahun Baru Islam 1446 H',
  '2024-08-17': 'Hari Kemerdekaan Republik Indonesia',
  '2024-09-16': 'Maulid Nabi Muhammad SAW',
  '2024-12-25': 'Hari Raya Natal',

  // === 2025 ===
  '2025-01-01': 'Tahun Baru 2025 Masehi',
  '2025-01-27': 'Isra Mi\'raj Nabi Muhammad SAW',
  '2025-01-29': 'Tahun Baru Imlek 2576 Kongzili',
  '2025-03-29': 'Hari Suci Nyepi (Tahun Baru Saka 1947)',
  '2025-03-31': 'Hari Raya Idul Fitri 1446 H',
  '2025-04-01': 'Hari Raya Idul Fitri 1446 H',
  '2025-04-18': 'Wafat Yesus Kristus',
  '2025-04-20': 'Hari Paskah',
  '2025-05-01': 'Hari Buruh Internasional',
  '2025-05-12': 'Hari Raya Waisak 2569 BE',
  '2025-05-29': 'Kenaikan Yesus Kristus',
  '2025-06-01': 'Hari Lahir Pancasila',
  '2025-06-06': 'Hari Raya Idul Adha 1446 H',
  '2025-06-27': 'Tahun Baru Islam 1447 H',
  '2025-08-17': 'Hari Kemerdekaan Republik Indonesia',
  '2025-09-05': 'Maulid Nabi Muhammad SAW',
  '2025-12-25': 'Hari Raya Natal',

  // === 2026 ===
  '2026-01-01': 'Tahun Baru 2026 Masehi',
  '2026-02-16': 'Isra Mi\'raj Nabi Muhammad SAW',
  '2026-02-17': 'Tahun Baru Imlek 2577 Kongzili',
  '2026-03-19': 'Hari Suci Nyepi (Tahun Baru Saka 1948)',
  '2026-03-20': 'Hari Raya Idul Fitri 1447 H',
  '2026-03-21': 'Hari Raya Idul Fitri 1447 H',
  '2026-04-03': 'Wafat Yesus Kristus',
  '2026-04-05': 'Hari Paskah',
  '2026-05-01': 'Hari Buruh Internasional',
  '2026-05-14': 'Kenaikan Yesus Kristus',
  '2026-05-31': 'Hari Raya Waisak 2570 BE',
  '2026-06-01': 'Hari Lahir Pancasila',
  '2026-05-27': 'Hari Raya Idul Adha 1447 H',
  '2026-06-16': 'Tahun Baru Islam 1448 H',
  '2026-08-17': 'Hari Kemerdekaan Republik Indonesia',
  '2026-08-25': 'Maulid Nabi Muhammad SAW',
  '2026-12-25': 'Hari Raya Natal',

  // === 2027 ===
  '2027-01-01': 'Tahun Baru 2027 Masehi',
  '2027-02-06': 'Isra Mi\'raj Nabi Muhammad SAW',
  '2027-02-07': 'Tahun Baru Imlek 2578 Kongzili',
  '2027-03-09': 'Hari Raya Idul Fitri 1448 H',
  '2027-03-10': 'Hari Raya Idul Fitri 1448 H',
  '2027-03-26': 'Wafat Yesus Kristus',
  '2027-04-08': 'Hari Suci Nyepi (Tahun Baru Saka 1949)',
  '2027-05-01': 'Hari Buruh Internasional',
  '2027-05-06': 'Kenaikan Yesus Kristus',
  '2027-05-20': 'Hari Raya Waisak 2571 BE',
  '2027-06-01': 'Hari Lahir Pancasila',
  '2027-05-16': 'Hari Raya Idul Adha 1448 H',
  '2027-06-06': 'Tahun Baru Islam 1449 H',
  '2027-08-17': 'Hari Kemerdekaan Republik Indonesia',
  '2027-08-15': 'Maulid Nabi Muhammad SAW',
  '2027-12-25': 'Hari Raya Natal',
}

/**
 * Checks if a specific YYYY-MM-DD date is an Indonesian National Holiday or user-defined holiday.
 * Returns the holiday name or null if not a holiday.
 */
export function getHolidayInfo(
  dateStr: string,
  customHolidays: { date: string; name: string }[] = []
): { isHoliday: boolean; name: string | null; isNational: boolean } {
  // 1. Check custom user/database holidays first
  const custom = customHolidays.find((h) => h.date === dateStr)
  if (custom) {
    return {
      isHoliday: true,
      name: custom.name,
      isNational: false,
    }
  }

  // 2. Check national holiday dictionary
  if (INDONESIAN_NATIONAL_HOLIDAYS[dateStr]) {
    return {
      isHoliday: true,
      name: INDONESIAN_NATIONAL_HOLIDAYS[dateStr],
      isNational: true,
    }
  }

  return {
    isHoliday: false,
    name: null,
    isNational: false,
  }
}
