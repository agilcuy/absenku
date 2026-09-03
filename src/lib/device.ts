export interface ParsedDeviceInfo {
  deviceType: 'Mobile' | 'Tablet' | 'Desktop'
  os: string
  browser: string
  rawUserAgent: string
}

export function parseUserAgent(uaString?: string | null): ParsedDeviceInfo {
  const ua = uaString || ''

  // 1. Detect Device Type
  let deviceType: 'Mobile' | 'Tablet' | 'Desktop' = 'Desktop'
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    deviceType = 'Tablet'
  } else if (
    /Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/i.test(
      ua
    )
  ) {
    deviceType = 'Mobile'
  }

  // 2. Detect Operating System
  let os = 'Lainnya'
  if (/windows nt 10/i.test(ua)) os = 'Windows 10/11'
  else if (/windows nt 6.3/i.test(ua)) os = 'Windows 8.1'
  else if (/windows nt 6.2/i.test(ua)) os = 'Windows 8'
  else if (/windows nt 6.1/i.test(ua)) os = 'Windows 7'
  else if (/windows/i.test(ua)) os = 'Windows'
  else if (/android/i.test(ua)) {
    const match = ua.match(/android\s([0-9\.]+)/i)
    os = match ? `Android ${match[1]}` : 'Android'
  } else if (/iphone|ipad|ipod/i.test(ua)) {
    const match = ua.match(/os\s([0-9_]+)/i)
    os = match ? `iOS ${match[1].replace(/_/g, '.')}` : 'iOS'
  } else if (/macintosh|mac os x/i.test(ua)) os = 'macOS'
  else if (/linux/i.test(ua)) os = 'Linux'
  else if (/cros/i.test(ua)) os = 'Chrome OS'

  // 3. Detect Browser
  let browser = 'Lainnya'
  if (/edg/i.test(ua)) browser = 'Microsoft Edge'
  else if (/samsungbrowser/i.test(ua)) browser = 'Samsung Internet'
  else if (/opr|opera/i.test(ua)) browser = 'Opera'
  else if (/chrome|crios/i.test(ua)) browser = 'Chrome'
  else if (/firefox|fxios/i.test(ua)) browser = 'Firefox'
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari'

  return {
    deviceType,
    os,
    browser,
    rawUserAgent: ua,
  }
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  const realIp = req.headers.get('x-real-ip')
  if (realIp) {
    return realIp.trim()
  }
  return '127.0.0.1'
}
