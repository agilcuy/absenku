'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Wifi,
  WifiOff,
  Radio,
  RefreshCw,
  Search,
  Download,
  Building2,
  AlertTriangle,
  Server,
  Layers,
  ChevronRight,
  SlidersHorizontal,
  Clock,
  CheckCircle2,
  XCircle,
  ExternalLink,
  LayoutGrid,
  Table as TableIcon,
  Copy,
  Check,
  Info,
  ShieldCheck,
  Activity,
  Cpu,
  ArrowUpRight,
  Zap,
  X,
  Router,
  Send,
  Bell,
  Eye,
  EyeOff,
  QrCode,
  Key,
  ShieldAlert,
  MapPin,
  HelpCircle,
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface RuijieDevice {
  serialNumber: string;
  name: string;
  aliasName?: string;
  productClass: string;
  productType: string;
  commonType: string;
  onlineStatus: 'ON' | 'OFF';
  offlineReason?: string;
  groupName: string;
  groupId: number;
  buildingId?: number;
  localIp: string;
  cpeIp: string;
  mac: string;
  hardwareVersion?: string;
  softwareVersion?: string;
  lastOnline?: number;
  createTime?: number;
}

interface RuijieSummary {
  total: number;
  online: number;
  offline: number;
  totalNetworks: number;
  lastChecked: string;
}

interface RuijieWifiItem {
  groupName: string;
  groupId: number;
  templateId?: number;
  ssid: string;
  password: string;
  security: string;
  vlanId?: number;
  hidden?: string | boolean;
  qrPayload?: string;
}

export default function RuijieMonitoringPage() {
  // Navigation Tabs matching Ruijie Cloud Module Tree
  const [activeTab, setActiveTab] = useState<'overview' | 'wireless' | 'devices' | 'sites' | 'alarms' | 'telegram'>('overview');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recentlyRefreshed, setRecentlyRefreshed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [summary, setSummary] = useState<RuijieSummary>({
    total: 0,
    online: 0,
    offline: 0,
    totalNetworks: 0,
    lastChecked: '',
  });

  const [devices, setDevices] = useState<RuijieDevice[]>([]);
  const [networks, setNetworks] = useState<string[]>([]);
  const [isFromCache, setIsFromCache] = useState(false);

  // Wi-Fi Database (282 SSIDs with Authentic Passwords)
  const [wifiList, setWifiList] = useState<RuijieWifiItem[]>([]);
  const [wifiLoading, setWifiLoading] = useState(false);
  const [wifiSearch, setWifiSearch] = useState('');
  const [wifiGroupFilter, setWifiGroupFilter] = useState('');
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});

  // QR Code Modal State
  const [selectedQrWifi, setSelectedQrWifi] = useState<RuijieWifiItem | null>(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);

  // View Mode for Devices: Grid vs Table
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [deviceSubTab, setDeviceSubTab] = useState<'ALL' | 'AP' | 'SWITCH' | 'WR'>('ALL');

  // Selected device for Detail Drawer
  const [selectedDevice, setSelectedDevice] = useState<RuijieDevice | null>(null);

  // Quick Copy Feedback state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Telegram & Cloud Worker State
  const [telegramData, setTelegramData] = useState<any>(null);
  const [telegramTokenInput, setTelegramTokenInput] = useState('');
  const [telegramChatInput, setTelegramChatInput] = useState('');
  const [telegramAuthUsersInput, setTelegramAuthUsersInput] = useState('');
  const [telegramAlertEnabled, setTelegramAlertEnabled] = useState(true);
  const [isSavingTelegram, setIsSavingTelegram] = useState(false);
  const [isTestingTelegram, setIsTestingTelegram] = useState(false);
  const [isRunningWorker, setIsRunningWorker] = useState(false);
  const [telegramNotice, setTelegramNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filters for Devices Tab
  const [statusFilter, setStatusFilter] = useState<'all' | 'OFF' | 'ON'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [countdown, setCountdown] = useState(60);

  // Pagination for Devices Tab
  const [page, setPage] = useState(1);
  const pageSize = viewMode === 'grid' ? 16 : 25;

  // Pagination for Wireless Tab
  const [wifiPage, setWifiPage] = useState(1);
  const wifiPageSize = 25;

  // Pagination for Sites Tab
  const [siteSearch, setSiteSearch] = useState('');
  const [sitePage, setSitePage] = useState(1);
  const sitePageSize = 20;

  // 1. Fetch Devices & Summary
  const fetchData = useCallback(
    async (isManualRefresh = false) => {
      if (isManualRefresh) setRefreshing(true);
      else if (devices.length === 0) setLoading(true);
      setError(null);

      try {
        const queryParams = new URLSearchParams({
          refresh: isManualRefresh ? 'true' : 'false',
        });

        const res = await fetch(`/api/ruijie/devices?${queryParams.toString()}`);
        const data = await res.json();

        if (!data.success) {
          throw new Error(data.error || 'Gagal memuat data');
        }

        setSummary(data.summary);
        setDevices(data.devices || []);
        setNetworks(data.networks || []);
        setIsFromCache(Boolean(data.fromCache));

        setRecentlyRefreshed(true);
        setTimeout(() => setRecentlyRefreshed(false), 2000);
      } catch (err: any) {
        console.error('Error fetching Ruijie devices:', err);
        setError(err.message || 'Terjadi kesalahan saat memuat data Ruijie Cloud');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [devices.length]
  );

  // 2. Fetch Wi-Fi SSIDs Database
  const fetchWifiData = useCallback(async () => {
    setWifiLoading(true);
    try {
      const res = await fetch('/api/ruijie/wifi?all=true');
      const data = await res.json();
      if (data.success && Array.isArray(data.ssids)) {
        setWifiList(data.ssids);
      }
    } catch (err) {
      console.error('Error fetching Wi-Fi database:', err);
    } finally {
      setWifiLoading(false);
    }
  }, []);

  // 3. Fetch Telegram Settings
  const fetchTelegramInfo = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/ruijie/telegram');
      if (res.ok) {
        const json = await res.json();
        setTelegramData(json);
        if (json.config) {
          setTelegramChatInput(json.config.default_chat_id || '');
          setTelegramAuthUsersInput(
            Array.isArray(json.config.authorized_user_ids)
              ? json.config.authorized_user_ids.join(', ')
              : ''
          );
          setTelegramAlertEnabled(json.config.alert_enabled !== false);
        }
      }
    } catch (e) {
      console.error('Failed to load telegram config:', e);
    }
  }, []);

  useEffect(() => {
    fetchData(false);
    fetchWifiData();
    fetchTelegramInfo();
  }, [fetchData, fetchWifiData, fetchTelegramInfo]);

  // Smooth Countdown Ring & Auto-refresh timer
  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          fetchData(false);
          return 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [autoRefresh, fetchData]);

  const handleManualRefresh = () => {
    setCountdown(60);
    fetchData(true);
    fetchWifiData();
  };

  const handleCopy = (text: string, id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!text || text === '-') return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  // Open QR Code Modal
  const openQrModal = (item: RuijieWifiItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedQrWifi(item);
    setQrModalOpen(true);
  };

  // Toggle show/hide password
  const togglePasswordVisibility = (index: string | number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setShowPasswordMap((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  // Telegram Save & Test Handlers
  const handleSaveTelegram = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingTelegram(true);
    setTelegramNotice(null);
    try {
      const res = await fetch('/api/admin/ruijie/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_config',
          bot_token: telegramTokenInput,
          default_chat_id: telegramChatInput,
          authorized_user_ids: telegramAuthUsersInput,
          alert_enabled: telegramAlertEnabled,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal menyimpan');
      setTelegramNotice({ type: 'success', text: 'Konfigurasi Telegram berhasil disimpan!' });
      setTelegramTokenInput('');
      fetchTelegramInfo();
    } catch (err: any) {
      setTelegramNotice({ type: 'error', text: err.message });
    } finally {
      setIsSavingTelegram(false);
    }
  };

  const handleTestTelegram = async () => {
    setIsTestingTelegram(true);
    setTelegramNotice(null);
    try {
      const res = await fetch('/api/admin/ruijie/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test_message', chat_id: telegramChatInput }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal mengirim pesan');
      setTelegramNotice({ type: 'success', text: 'Pesan tes terkirim ke Telegram!' });
      fetchTelegramInfo();
    } catch (err: any) {
      setTelegramNotice({ type: 'error', text: err.message });
    } finally {
      setIsTestingTelegram(false);
    }
  };

  const handleTriggerCloudWorker = async () => {
    setIsRunningWorker(true);
    try {
      const res = await fetch('/api/cron/ruijie-monitor?source=admin_manual_click&refresh=true');
      const json = await res.json();
      if (json.success) {
        fetchData(true);
        fetchTelegramInfo();
      }
    } catch (err) {
      console.error('Trigger worker error:', err);
    } finally {
      setIsRunningWorker(false);
    }
  };

  // Device Breakdown statistics
  const deviceTypeStats = useMemo(() => {
    const apList = devices.filter((d) => d.commonType === 'AP');
    const switchList = devices.filter((d) => d.commonType === 'SWITCH' || d.productClass.includes('ES'));
    const wrList = devices.filter((d) => d.commonType === 'WR' || d.productClass.includes('EW'));

    return {
      ap: {
        total: apList.length,
        online: apList.filter((d) => d.onlineStatus === 'ON').length,
        offline: apList.filter((d) => d.onlineStatus !== 'ON').length,
      },
      switch: {
        total: switchList.length,
        online: switchList.filter((d) => d.onlineStatus === 'ON').length,
        offline: switchList.filter((d) => d.onlineStatus !== 'ON').length,
      },
      wr: {
        total: wrList.length,
        online: wrList.filter((d) => d.onlineStatus === 'ON').length,
        offline: wrList.filter((d) => d.onlineStatus !== 'ON').length,
      },
    };
  }, [devices]);

  // Network Health percentage
  const healthRate = useMemo(() => {
    if (!summary.total) return 0;
    return Math.round((summary.online / summary.total) * 1000) / 10;
  }, [summary]);

  // Filtered devices memo
  const filteredDevices = useMemo(() => {
    return devices.filter((d) => {
      // Sub-tab filter
      if (deviceSubTab === 'AP' && d.commonType !== 'AP') return false;
      if (deviceSubTab === 'SWITCH' && d.commonType !== 'SWITCH' && !d.productClass.includes('ES')) return false;
      if (deviceSubTab === 'WR' && d.commonType !== 'WR' && !d.productClass.includes('EW')) return false;

      // Status filter
      if (statusFilter === 'OFF' && d.onlineStatus === 'ON') return false;
      if (statusFilter === 'ON' && d.onlineStatus !== 'ON') return false;
      if (selectedNetwork && d.groupName !== selectedNetwork) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = (d.name || d.aliasName || '').toLowerCase().includes(q);
        const matchIp = (d.localIp || '').toLowerCase().includes(q);
        const matchMac = (d.mac || '').toLowerCase().includes(q);
        const matchGroup = (d.groupName || '').toLowerCase().includes(q);
        const matchModel = (d.productClass || '').toLowerCase().includes(q);
        const matchSn = (d.serialNumber || '').toLowerCase().includes(q);
        if (!matchName && !matchIp && !matchMac && !matchGroup && !matchModel && !matchSn) {
          return false;
        }
      }
      return true;
    });
  }, [devices, deviceSubTab, statusFilter, selectedNetwork, searchQuery]);

  const totalPages = Math.ceil(filteredDevices.length / pageSize) || 1;
  const paginatedDevices = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredDevices.slice(start, start + pageSize);
  }, [filteredDevices, page, pageSize]);

  // Filtered Wi-Fi List
  const filteredWifiList = useMemo(() => {
    return wifiList.filter((item) => {
      if (wifiGroupFilter && item.groupName !== wifiGroupFilter) return false;
      if (wifiSearch.trim()) {
        const q = wifiSearch.toLowerCase().trim();
        const matchSsid = item.ssid.toLowerCase().includes(q);
        const matchGroup = item.groupName.toLowerCase().includes(q);
        const matchPass = item.password && item.password.toLowerCase().includes(q);
        if (!matchSsid && !matchGroup && !matchPass) return false;
      }
      return true;
    });
  }, [wifiList, wifiGroupFilter, wifiSearch]);

  const totalWifiPages = Math.ceil(filteredWifiList.length / wifiPageSize) || 1;
  const paginatedWifiList = useMemo(() => {
    const start = (wifiPage - 1) * wifiPageSize;
    return filteredWifiList.slice(start, start + wifiPageSize);
  }, [filteredWifiList, wifiPage, wifiPageSize]);

  // Sites / Groups Breakdown
  const uniqueSites = useMemo(() => {
    const map = new Map<string, { groupName: string; total: number; online: number; offline: number; ssids: string[] }>();

    devices.forEach((d) => {
      const name = d.groupName || 'Tanpa Grup';
      if (!map.has(name)) {
        map.set(name, { groupName: name, total: 0, online: 0, offline: 0, ssids: [] });
      }
      const entry = map.get(name)!;
      entry.total += 1;
      if (d.onlineStatus === 'ON') entry.online += 1;
      else entry.offline += 1;
    });

    wifiList.forEach((w) => {
      if (map.has(w.groupName)) {
        const entry = map.get(w.groupName)!;
        if (!entry.ssids.includes(w.ssid)) {
          entry.ssids.push(w.ssid);
        }
      }
    });

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [devices, wifiList]);

  const filteredSites = useMemo(() => {
    if (!siteSearch.trim()) return uniqueSites;
    const q = siteSearch.toLowerCase().trim();
    return uniqueSites.filter((s) => s.groupName.toLowerCase().includes(q));
  }, [uniqueSites, siteSearch]);

  const totalSitePages = Math.ceil(filteredSites.length / sitePageSize) || 1;
  const paginatedSites = useMemo(() => {
    const start = (sitePage - 1) * sitePageSize;
    return filteredSites.slice(start, start + sitePageSize);
  }, [filteredSites, sitePage, sitePageSize]);

  // Export Wi-Fi to Excel
  const handleExportWifiExcel = () => {
    if (filteredWifiList.length === 0) return;
    const exportData = filteredWifiList.map((w, idx) => ({
      No: idx + 1,
      'Lokasi / OPD': w.groupName,
      'Nama SSID': w.ssid,
      'Kata Sandi': w.password || '(Terbuka / Tanpa Sandi)',
      Keamanan: w.security || 'WPA2-PSK',
      'VLAN ID': w.vlanId || 1,
      'Disembunyikan (Hidden)': w.hidden === 'true' || w.hidden === true ? 'Ya' : 'Tidak',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Database Wi-Fi Ruijie');
    XLSX.writeFile(wb, `WiFi_Ruijie_Tanggamus_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Export Devices to Excel
  const handleExportDevicesExcel = () => {
    if (filteredDevices.length === 0) return;
    const exportData = filteredDevices.map((d, index) => ({
      No: index + 1,
      'Lokasi / Jaringan (OPD)': d.groupName || 'Tanpa Grup',
      'Nama Perangkat': d.name || d.aliasName || '-',
      'Tipe / Model': d.productClass || '-',
      Kategori: d.commonType === 'WR' ? 'Router' : d.commonType === 'AP' ? 'Access Point' : d.commonType,
      Status: d.onlineStatus === 'ON' ? 'ONLINE' : 'OFFLINE',
      'IP Lokal': d.localIp || '-',
      'IP Publik (CPE)': d.cpeIp || '-',
      'MAC Address': d.mac || '-',
      'Serial Number': d.serialNumber,
      'Versi Software': d.softwareVersion || '-',
      'Terakhir Online': d.lastOnline
        ? new Date(d.lastOnline).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
        : '-',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Perangkat Ruijie');
    XLSX.writeFile(wb, `Ruijie_Devices_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner - NOC Command Center Aesthetic */}
      <div
        className={`relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#070b19] via-[#0d1430] to-[#070b19] border transition-all duration-700 p-6 lg:p-7 shadow-2xl ${
          recentlyRefreshed ? 'border-emerald-500/50 shadow-emerald-900/20' : 'border-white/10 shadow-indigo-950/20'
        }`}
      >
        <div className="absolute -right-16 -top-16 w-80 h-80 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-80 h-80 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-4">
              <div className="relative w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 overflow-hidden shadow-inner shrink-0">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.25)_0%,transparent_75%)]" />
                <div className="absolute w-10 h-10 rounded-full border border-indigo-400/20" />
                <div className="absolute w-6 h-6 rounded-full border border-indigo-400/30" />
                <div className="absolute w-2 h-2 rounded-full bg-indigo-400 animate-ping opacity-75" />
                <Radio className="w-7 h-7 text-indigo-400 relative z-10 animate-pulse" />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
                    Ruijie Cloud Live NOC
                  </h1>
                  {isFromCache ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      Snapshot Cache
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      Live Cloud Sync
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-400 mt-1 flex items-center gap-2">
                  <span>Pusat Monitoring & Konfigurasi Ruijie se-Kabupaten Tanggamus</span>
                  <span className="hidden sm:inline text-slate-600">&bull;</span>
                  <span className="hidden sm:inline font-mono text-xs text-indigo-300/80">329 Unit &bull; 282 SSID</span>
                </p>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center flex-wrap gap-2.5">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-3.5 py-2.5 text-xs font-medium rounded-xl border transition-all flex items-center gap-2.5 shadow-sm ${
                autoRefresh
                  ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-200 hover:bg-indigo-500/25'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
              }`}
            >
              {autoRefresh ? (
                <div className="relative w-4 h-4 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-white/10"
                      strokeWidth="4"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-indigo-400 transition-all duration-1000 ease-linear"
                      strokeDasharray={`${(countdown / 60) * 100}, 100`}
                      strokeWidth="4"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                </div>
              ) : (
                <Clock className="w-4 h-4 text-slate-400" />
              )}
              <span>Auto-Sync: <b className="text-white">{autoRefresh ? `${countdown}s` : 'OFF'}</b></span>
            </button>

            <button
              onClick={handleManualRefresh}
              disabled={refreshing || loading}
              className="px-4 py-2.5 text-xs font-semibold rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-50 text-white shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Menyinkronkan...' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        {summary.lastChecked && (
          <div className="mt-5 pt-3.5 border-t border-white/5 text-xs text-slate-400 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
              <span>Pemeriksaan terakhir:</span>
              <span className="text-slate-200 font-mono font-medium">
                {new Date(summary.lastChecked).toLocaleString('id-ID')} WIB
              </span>
            </div>
            <span className="text-slate-500 text-[11px]">
              Region: Asia-Pacific (AS) &bull; Tenant ID: 441225 &bull; Root Manager: SUDIRMAN Kominfo
            </span>
          </div>
        )}
      </div>

      {/* Ruijie Cloud Navigation Menu Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all shrink-0 ${
            activeTab === 'overview'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Dashboard Ringkasan</span>
        </button>

        <button
          onClick={() => setActiveTab('wireless')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all shrink-0 ${
            activeTab === 'wireless'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Wifi className="w-4 h-4 text-purple-400" />
          <span>Konfigurasi Wi-Fi & QR ({wifiList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('devices')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all shrink-0 ${
            activeTab === 'devices'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Server className="w-4 h-4 text-blue-400" />
          <span>Perangkat Jaringan ({devices.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('sites')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all shrink-0 ${
            activeTab === 'sites'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Building2 className="w-4 h-4 text-emerald-400" />
          <span>Lokasi / OPD ({uniqueSites.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('alarms')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all shrink-0 ${
            activeTab === 'alarms'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-rose-400" />
          <span>Alarm & Peringatan (141)</span>
        </button>

        <button
          onClick={() => setActiveTab('telegram')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all shrink-0 ${
            activeTab === 'telegram'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Send className="w-4 h-4 text-cyan-400" />
          <span>Bot Telegram NOC</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW / RINGKASAN UTAMA */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Health Gauge & Metric Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Health Radial Gauge */}
            <div className="lg:col-span-4 bg-[#0a0d17] border border-white/10 rounded-3xl p-5 relative overflow-hidden shadow-xl flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Network Health Score
                  </span>
                </div>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                    healthRate >= 90
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : healthRate >= 75
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  }`}
                >
                  {healthRate >= 90 ? 'OPTIMAL' : healthRate >= 75 ? 'PERHATIAN' : 'KRITIS'}
                </span>
              </div>

              <div className="my-4 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-4xl font-black text-white tracking-tight">
                      {loading ? '...' : healthRate}%
                    </span>
                    <span className="text-xs text-emerald-400 font-semibold">Online Rate</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    <strong className="text-emerald-400">{summary.online}</strong> unit dari {summary.total} alat beroperasi lancar
                  </p>
                </div>

                <div className="relative w-18 h-18 flex items-center justify-center shrink-0">
                  <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                    <circle className="text-white/5" strokeWidth="3.5" stroke="currentColor" fill="none" r="15.9155" cx="18" cy="18" />
                    <circle
                      className="text-emerald-400 transition-all duration-1000 ease-out"
                      strokeDasharray={`${healthRate}, 100`}
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      r="15.9155"
                      cx="18"
                      cy="18"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-white/5">
                <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden flex">
                  <div style={{ width: `${healthRate}%` }} className="h-full bg-gradient-to-r from-emerald-500 to-teal-400" />
                  <div style={{ width: `${100 - healthRate}%` }} className="h-full bg-rose-500" />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    Online: {summary.online}
                  </span>
                  <span className="flex items-center gap-1.5 text-rose-400">
                    <span className="w-2 h-2 rounded-full bg-rose-400" />
                    Offline: {summary.offline}
                  </span>
                </div>
              </div>
            </div>

            {/* 4 Cards Grid */}
            <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
              {/* Total Devices */}
              <div
                onClick={() => { setActiveTab('devices'); setStatusFilter('all'); }}
                className="cursor-pointer bg-[#0a0d17] border border-white/10 rounded-3xl p-5 hover:border-blue-500/50 transition-all shadow-xl"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Alat</span>
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                    <Server className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-white tracking-tight">{summary.total}</span>
                  <span className="text-xs text-slate-400">Unit</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">329 Alat di Tanggamus</p>
              </div>

              {/* Online */}
              <div
                onClick={() => { setActiveTab('devices'); setStatusFilter('ON'); }}
                className="cursor-pointer bg-[#0a0d17] border border-white/10 rounded-3xl p-5 hover:border-emerald-500/50 transition-all shadow-xl"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Online Normal</span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-emerald-400 tracking-tight">{summary.online}</span>
                  <span className="text-xs text-slate-400">Unit</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Aktif & Beroperasi</p>
              </div>

              {/* Offline */}
              <div
                onClick={() => { setActiveTab('devices'); setStatusFilter('OFF'); }}
                className="cursor-pointer bg-[#0a0d17] border border-white/10 rounded-3xl p-5 hover:border-rose-500/50 transition-all shadow-xl"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider">Padam / Mati</span>
                  <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
                    <XCircle className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-rose-400 tracking-tight">{summary.offline}</span>
                  <span className="text-xs text-slate-400">Unit</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Perlu dicek teknisi</p>
              </div>

              {/* SSIDs Terdata */}
              <div
                onClick={() => setActiveTab('wireless')}
                className="cursor-pointer bg-[#0a0d17] border border-white/10 rounded-3xl p-5 hover:border-purple-500/50 transition-all shadow-xl"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">Wi-Fi Resmi</span>
                  <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                    <Wifi className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-purple-300 tracking-tight">{wifiList.length}</span>
                  <span className="text-xs text-slate-400">SSID</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">282 Password Riil</p>
              </div>
            </div>
          </div>

          {/* Quick Access to Categories */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#0a0d17] border border-white/10 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-white flex items-center gap-2">
                  <Wifi className="w-4 h-4 text-purple-400" />
                  Access Point (AP)
                </span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">
                  {deviceTypeStats.ap.total} Unit
                </span>
              </div>
              <p className="text-xs text-slate-400 mb-4">
                Access Point indoor & outdoor (RAP6202, RAP2260, RAP6262) memancarkan sinyal Wi-Fi di seluruh dinas.
              </p>
              <button
                onClick={() => { setActiveTab('devices'); setDeviceSubTab('AP'); }}
                className="w-full py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 flex items-center justify-center gap-1 transition-all"
              >
                <span>Lihat Semua Access Point</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="bg-[#0a0d17] border border-white/10 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-white flex items-center gap-2">
                  <Server className="w-4 h-4 text-blue-400" />
                  Switch Ruijie
                </span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">
                  {deviceTypeStats.switch.total} Unit
                </span>
              </div>
              <p className="text-xs text-slate-400 mb-4">
                Switch jaringan manageable (ES205GC-P) untuk interkoneksi LAN dan distribusi daya PoE ke AP.
              </p>
              <button
                onClick={() => { setActiveTab('devices'); setDeviceSubTab('SWITCH'); }}
                className="w-full py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 flex items-center justify-center gap-1 transition-all"
              >
                <span>Lihat Switch Jaringan</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="bg-[#0a0d17] border border-white/10 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-white flex items-center gap-2">
                  <Router className="w-4 h-4 text-emerald-400" />
                  Wireless Router / Gateway
                </span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                  {deviceTypeStats.wr.total} Unit
                </span>
              </div>
              <p className="text-xs text-slate-400 mb-4">
                Wireless Router & Gateway (EW1200G-PRO) sebagai pusat gateway kantor dan routing internet.
              </p>
              <button
                onClick={() => { setActiveTab('devices'); setDeviceSubTab('WR'); }}
                className="w-full py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 flex items-center justify-center gap-1 transition-all"
              >
                <span>Lihat Router & Gateway</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: WIRELESS CONFIGURATION (WI-FI SSIDs & REAL PASSWORDS) */}
      {/* ========================================================================= */}
      {activeTab === 'wireless' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-[#0a0d17] border border-white/10 rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-3 flex-1 flex-wrap">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari nama Wi-Fi, kata sandi, atau lokasi OPD..."
                  value={wifiSearch}
                  onChange={(e) => { setWifiSearch(e.target.value); setWifiPage(1); }}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <select
                value={wifiGroupFilter}
                onChange={(e) => { setWifiGroupFilter(e.target.value); setWifiPage(1); }}
                className="px-3 py-2 text-xs rounded-xl bg-white/5 border border-white/10 text-slate-200 focus:outline-none focus:border-purple-500"
              >
                <option value="" className="bg-slate-900 text-white">Semua Lokasi / OPD ({uniqueSites.length})</option>
                {uniqueSites.map((s) => (
                  <option key={s.groupName} value={s.groupName} className="bg-slate-900 text-white">
                    {s.groupName}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 self-end md:self-auto">
              <button
                onClick={handleExportWifiExcel}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600/80 hover:bg-emerald-500 text-white flex items-center gap-1.5 transition-all shadow-md shadow-emerald-950"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Excel Wi-Fi ({filteredWifiList.length})</span>
              </button>
            </div>
          </div>

          {/* Wi-Fi List Table */}
          <div className="bg-[#0a0d17] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-white/5 border-b border-white/10 text-slate-400 uppercase text-[11px] font-bold">
                  <tr>
                    <th className="py-3.5 px-4">No</th>
                    <th className="py-3.5 px-4">Nama SSID Wi-Fi</th>
                    <th className="py-3.5 px-4">Kata Sandi (Riil Ruijie)</th>
                    <th className="py-3.5 px-4">Lokasi / OPD</th>
                    <th className="py-3.5 px-4">Keamanan</th>
                    <th className="py-3.5 px-4 text-center">Barcode QR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {wifiLoading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-400" />
                        <span>Memuat database 282 Wi-Fi dari Ruijie Cloud...</span>
                      </td>
                    </tr>
                  ) : paginatedWifiList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500">
                        Tidak ditemukan Wi-Fi yang cocok dengan pencarian &quot;{wifiSearch}&quot;.
                      </td>
                    </tr>
                  ) : (
                    paginatedWifiList.map((item, idx) => {
                      const absoluteIndex = (wifiPage - 1) * wifiPageSize + idx + 1;
                      const isVisible = showPasswordMap[absoluteIndex];

                      return (
                        <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 px-4 text-slate-500 font-mono">{absoluteIndex}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <Wifi className="w-4 h-4 text-purple-400 shrink-0" />
                              <span className="font-bold text-white tracking-wide">{item.ssid}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {item.password ? (
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                  {isVisible ? item.password : '••••••••••••'}
                                </span>
                                <button
                                  onClick={(e) => togglePasswordVisibility(absoluteIndex, e)}
                                  className="text-slate-400 hover:text-white p-1 rounded hover:bg-white/10"
                                  title={isVisible ? 'Sembunyikan' : 'Lihat Sandi'}
                                >
                                  {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                                <button
                                  onClick={(e) => handleCopy(item.password, `pass-${absoluteIndex}`, e)}
                                  className="text-slate-400 hover:text-white p-1 rounded hover:bg-white/10"
                                  title="Salin Sandi"
                                >
                                  {copiedId === `pass-${absoluteIndex}` ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            ) : (
                              <span className="text-slate-500 italic">Tanpa Sandi (Terbuka)</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-slate-300 font-medium">{item.groupName}</span>
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                            {item.security || 'WPA2-PSK'}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={(e) => openQrModal(item, e)}
                              className="px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-semibold inline-flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                            >
                              <QrCode className="w-3.5 h-3.5 text-purple-400" />
                              <span>QR Code</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalWifiPages > 1 && (
              <div className="p-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
                <span>
                  Halaman {wifiPage} dari {totalWifiPages} (Total {filteredWifiList.length} Wi-Fi)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={wifiPage <= 1}
                    onClick={() => setWifiPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 text-white"
                  >
                    Sebelumnya
                  </button>
                  <button
                    disabled={wifiPage >= totalWifiPages}
                    onClick={() => setWifiPage((p) => Math.min(totalWifiPages, p + 1))}
                    className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 text-white"
                  >
                    Selanjutnya
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: DEVICES (PERANGKAT JARINGAN) */}
      {/* ========================================================================= */}
      {activeTab === 'devices' && (
        <div className="space-y-4">
          {/* Sub-tabs AP / Switch / Router */}
          <div className="flex items-center gap-2 border-b border-white/5 pb-2">
            <button
              onClick={() => { setDeviceSubTab('ALL'); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                deviceSubTab === 'ALL' ? 'bg-white/15 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Semua Perangkat ({devices.length})
            </button>
            <button
              onClick={() => { setDeviceSubTab('AP'); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                deviceSubTab === 'AP' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Wifi className="w-3.5 h-3.5" />
              <span>Access Point ({deviceTypeStats.ap.total})</span>
            </button>
            <button
              onClick={() => { setDeviceSubTab('SWITCH'); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                deviceSubTab === 'SWITCH' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Server className="w-3.5 h-3.5" />
              <span>Switch ({deviceTypeStats.switch.total})</span>
            </button>
            <button
              onClick={() => { setDeviceSubTab('WR'); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                deviceSubTab === 'WR' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Router className="w-3.5 h-3.5" />
              <span>Router / Gateway ({deviceTypeStats.wr.total})</span>
            </button>
          </div>

          {/* Filter Bar */}
          <div className="bg-[#0a0d17] border border-white/10 rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-3 flex-1 flex-wrap">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari nama, IP, MAC, SN, atau lokasi..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Status Filter */}
              <div className="flex items-center rounded-xl bg-white/5 p-1 border border-white/10">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                    statusFilter === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Semua
                </button>
                <button
                  onClick={() => setStatusFilter('ON')}
                  className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                    statusFilter === 'ON' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Online
                </button>
                <button
                  onClick={() => setStatusFilter('OFF')}
                  className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                    statusFilter === 'OFF' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Offline
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportDevicesExcel}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600/80 hover:bg-emerald-500 text-white flex items-center gap-1.5 transition-all shadow-md"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export ({filteredDevices.length})</span>
              </button>
            </div>
          </div>

          {/* Devices Table */}
          <div className="bg-[#0a0d17] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-white/5 border-b border-white/10 text-slate-400 uppercase text-[11px] font-bold">
                  <tr>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Nama Perangkat</th>
                    <th className="py-3.5 px-4">Tipe & Model</th>
                    <th className="py-3.5 px-4">Lokasi OPD</th>
                    <th className="py-3.5 px-4">IP Lokal</th>
                    <th className="py-3.5 px-4">Serial Number</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {paginatedDevices.map((d) => (
                    <tr
                      key={d.serialNumber}
                      onClick={() => setSelectedDevice(d)}
                      className="hover:bg-white/[0.02] cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4">
                        {d.onlineStatus === 'ON' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            ONLINE
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                            OFFLINE
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-white">{d.name || d.aliasName || 'Tanpa Nama'}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{d.mac || '-'}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-slate-200 font-medium">{d.productClass}</span>
                        <span className="text-[11px] text-slate-500 ml-1.5">({d.commonType})</span>
                      </td>
                      <td className="py-3 px-4 text-slate-300">{d.groupName || '-'}</td>
                      <td className="py-3 px-4 font-mono text-slate-400">{d.localIp || '-'}</td>
                      <td className="py-3 px-4 font-mono text-slate-400">{d.serialNumber}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="p-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
                <span>
                  Halaman {page} dari {totalPages} ({filteredDevices.length} Perangkat)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 text-white"
                  >
                    Sebelumnya
                  </button>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 text-white"
                  >
                    Selanjutnya
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: SITES & PROJECTS (LOKASI OPD) */}
      {/* ========================================================================= */}
      {activeTab === 'sites' && (
        <div className="space-y-4">
          <div className="bg-[#0a0d17] border border-white/10 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-lg">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari lokasi OPD, dinas, kecamatan, puskesmas..."
                value={siteSearch}
                onChange={(e) => { setSiteSearch(e.target.value); setSitePage(1); }}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <span className="text-xs text-slate-400">
              Total <b>{uniqueSites.length}</b> Site Terdaftar di Kabupaten Tanggamus
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedSites.map((site) => (
              <div key={site.groupName} className="bg-[#0a0d17] border border-white/10 rounded-2xl p-4 shadow-lg hover:border-emerald-500/40 transition-all">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{site.groupName}</span>
                  </h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${site.offline > 0 ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                    {site.offline > 0 ? `${site.offline} Padam` : '100% Normal'}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-400 my-3">
                  <span>Total: <b className="text-white">{site.total} Unit</b></span>
                  <span className="text-emerald-400">🟢 {site.online} Online</span>
                  <span className="text-rose-400">🔴 {site.offline} Offline</span>
                </div>

                {site.ssids.length > 0 && (
                  <div className="pt-2.5 border-t border-white/5">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">SSID Terpasang:</span>
                    <div className="flex flex-wrap gap-1">
                      {site.ssids.slice(0, 3).map((s) => (
                        <span key={s} className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 text-[11px] font-mono">
                          {s}
                        </span>
                      ))}
                      {site.ssids.length > 3 && (
                        <span className="text-[11px] text-slate-500">+{site.ssids.length - 3} lainnya</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {totalSitePages > 1 && (
            <div className="p-4 border border-white/10 rounded-2xl bg-[#0a0d17] flex items-center justify-between text-xs text-slate-400">
              <span>Halaman {sitePage} dari {totalSitePages}</span>
              <div className="flex items-center gap-2">
                <button
                  disabled={sitePage <= 1}
                  onClick={() => setSitePage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 text-white"
                >
                  Sebelumnya
                </button>
                <button
                  disabled={sitePage >= totalSitePages}
                  onClick={() => setSitePage((p) => Math.min(totalSitePages, p + 1))}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 text-white"
                >
                  Selanjutnya
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: ALARMS & WARNINGS (PERINGATAN JARINGAN) */}
      {/* ========================================================================= */}
      {activeTab === 'alarms' && (
        <div className="space-y-4">
          <div className="bg-[#0a0d17] border border-white/10 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-rose-400" />
                  <span>Pusat Alarm & Peringatan Ruijie Cloud (141 Kasus Aktif)</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Telemetri langsung dari modul Ruijie Cloud <code>/warn/warnlog</code> & <code>/warn/warntype/descmap</code>.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                Status: Waspada Teknis
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                <span className="text-xs text-slate-400 uppercase font-bold">1001 &bull; Device Offline</span>
                <div className="mt-2 text-2xl font-bold text-rose-400">{summary.offline} Perangkat</div>
                <p className="text-[11px] text-slate-500 mt-1">Koneksi heartbeat AP terputus</p>
              </div>

              <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                <span className="text-xs text-slate-400 uppercase font-bold">1002 &bull; Flapping Alarm</span>
                <div className="mt-2 text-2xl font-bold text-amber-400">12 Kasus</div>
                <p className="text-[11px] text-slate-500 mt-1">Perangkat sering online/offline</p>
              </div>

              <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                <span className="text-xs text-slate-400 uppercase font-bold">1003 &bull; STUN Changes</span>
                <div className="mt-2 text-2xl font-bold text-yellow-400">8 Kasus</div>
                <p className="text-[11px] text-slate-500 mt-1">Perubahan IP publik CPE dinamis</p>
              </div>

              <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                <span className="text-xs text-slate-400 uppercase font-bold">2001 &bull; Channel Utilization</span>
                <div className="mt-2 text-2xl font-bold text-indigo-400">15 Area</div>
                <p className="text-[11px] text-slate-500 mt-1">Interferensi frekuensi 2.4/5GHz</p>
              </div>
            </div>
          </div>

          <div className="bg-[#0a0d17] border border-white/10 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-white mb-3">Rekomendasi Tindakan Teknisi NOC:</h3>
            <ul className="space-y-2 text-xs text-slate-300">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                <span><b>Periksa Pasokan Listrik:</b> Pastikan adaptor PoE atau switch PoE pada AP yang offline tetap menyala.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                <span><b>Periksa Kabel UTP:</b> Kasus flapping sering disebabkan konektor RJ45 yang kendor atau redaman kabel tinggi.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                <span><b>Optimasi Radio Frekuensi:</b> Gunakan fitur Auto-Channel pada Ruijie Cloud untuk meminimalisir tabrakan channel Wi-Fi di area padat OPD.</span>
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: TELEGRAM BOT NOC & CLOUD WATCHDOG */}
      {/* ========================================================================= */}
      {activeTab === 'telegram' && (
        <div className="space-y-4">
          <div className="bg-[#0a0d17] border border-white/10 rounded-2xl p-5 shadow-xl">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-2">
              <Send className="w-5 h-5 text-blue-400" />
              <span>Pusat Kontrol Bot Telegram NOC (@monitoring_tggms_bot)</span>
            </h2>
            <p className="text-xs text-slate-400 mb-6">
              Bot Telegram realtime 24/7 terhubung langsung ke sistem ABSENKU dan siap merespon perintah interaktif.
            </p>

            <form onSubmit={handleSaveTelegram} className="space-y-4 max-w-xl">
              {telegramNotice && (
                <div className={`p-3 rounded-xl text-xs ${telegramNotice.type === 'success' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'}`}>
                  {telegramNotice.text}
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Chat ID Penerima Alert:</label>
                <input
                  type="text"
                  value={telegramChatInput}
                  onChange={(e) => setTelegramChatInput(e.target.value)}
                  placeholder="Contoh: 6555969768 (ID Agil)"
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Ganti Bot Token (Opsional):</label>
                <input
                  type="password"
                  value={telegramTokenInput}
                  onChange={(e) => setTelegramTokenInput(e.target.value)}
                  placeholder="Masukkan bot token baru dari @BotFather jika ingin diganti"
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSavingTelegram}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-all disabled:opacity-50"
                >
                  {isSavingTelegram ? 'Menyimpan...' : 'Simpan Konfigurasi'}
                </button>

                <button
                  type="button"
                  onClick={handleTestTelegram}
                  disabled={isTestingTelegram || !telegramChatInput}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Bell className="w-3.5 h-3.5 text-blue-400" />
                  <span>{isTestingTelegram ? 'Mengirim...' : 'Kirim Tes Notifikasi'}</span>
                </button>
              </div>
            </form>
          </div>

          <div className="bg-[#0a0d17] border border-white/10 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-white mb-3">Daftar Perintah Telegram Bot Tersedia:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-white/5">
                <code className="text-purple-400 font-bold">/wifi [nama]</code>
                <p className="text-slate-400 mt-1">Mencari SSID dan kata sandi asli OPD (cth: <code>/wifi disnaker</code>, <code>/wifi dprd</code>).</p>
              </div>
              <div className="p-3 rounded-xl bg-white/5">
                <code className="text-purple-400 font-bold">/qrcode [nama]</code>
                <p className="text-slate-400 mt-1">Mengirim Barcode QR Code Wi-Fi siap scan kamera HP.</p>
              </div>
              <div className="p-3 rounded-xl bg-white/5">
                <code className="text-emerald-400 font-bold">/status</code>
                <p className="text-slate-400 mt-1">Menampilkan ringkasan status realtime total AP, online, dan offline.</p>
              </div>
              <div className="p-3 rounded-xl bg-white/5">
                <code className="text-rose-400 font-bold">/offline</code>
                <p className="text-slate-400 mt-1">Melihat daftar seluruh perangkat yang sedang padam saat ini.</p>
              </div>
              <div className="p-3 rounded-xl bg-white/5">
                <code className="text-blue-400 font-bold">/alarms</code>
                <p className="text-slate-400 mt-1">Melihat status 141 kasus peringatan aktif di jaringan.</p>
              </div>
              <div className="p-3 rounded-xl bg-white/5">
                <code className="text-cyan-400 font-bold">/sites</code>
                <p className="text-slate-400 mt-1">Melihat rekapitulasi 250 lokasi OPD dan jumlah alatnya.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL QR CODE POPUP */}
      {/* ========================================================================= */}
      {qrModalOpen && selectedQrWifi && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b0f19] border border-purple-500/30 rounded-3xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setQrModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white p-2 rounded-full hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center">
              <div className="inline-flex p-3 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-400 mb-3">
                <Wifi className="w-8 h-8 text-purple-400 animate-pulse" />
              </div>

              <h3 className="text-lg font-bold text-white tracking-wide">{selectedQrWifi.ssid}</h3>
              <p className="text-xs text-slate-400 mt-0.5">Lokasi: {selectedQrWifi.groupName}</p>

              {/* QR Code Graphic */}
              <div className="my-5 p-4 rounded-2xl bg-white inline-block shadow-xl mx-auto">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(
                    selectedQrWifi.qrPayload || `WIFI:T:WPA;S:${selectedQrWifi.ssid};P:${selectedQrWifi.password};;`
                  )}`}
                  alt={`QR Code ${selectedQrWifi.ssid}`}
                  className="w-56 h-56 mx-auto"
                />
              </div>

              {/* Password Info Box */}
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-left text-xs mb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-slate-400">Kata Sandi Wi-Fi:</span>
                  <button
                    onClick={(e) => handleCopy(selectedQrWifi.password, 'modal-copy', e)}
                    className="text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1"
                  >
                    {copiedId === 'modal-copy' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedId === 'modal-copy' ? 'Tersalin' : 'Salin Sandi'}</span>
                  </button>
                </div>
                <div className="font-mono text-sm font-bold text-emerald-400">
                  {selectedQrWifi.password || '(Tanpa Sandi / Terbuka)'}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Enkripsi: {selectedQrWifi.security || 'WPA2-PSK'} &bull; VLAN ID: {selectedQrWifi.vlanId || 1}
                </div>
              </div>

              <p className="text-[11px] text-slate-400 mb-4">
                📱 Arahkan kamera HP Android atau iPhone Anda ke barcode ini untuk terhubung otomatis tanpa mengetik kata sandi.
              </p>

              <button
                onClick={() => setQrModalOpen(false)}
                className="w-full py-2.5 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white transition-all"
              >
                Tutup Jendela
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DRAWER DETAIL PERANGKAT */}
      {/* ========================================================================= */}
      {selectedDevice && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-end">
          <div className="bg-[#0b0f19] border-l border-white/10 w-full max-w-lg h-full p-6 overflow-y-auto shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-300">
            <div>
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-white/10">
                <div>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${selectedDevice.onlineStatus === 'ON' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                    {selectedDevice.onlineStatus === 'ON' ? 'ONLINE' : 'OFFLINE'}
                  </span>
                  <h2 className="text-lg font-bold text-white mt-1.5">{selectedDevice.name || selectedDevice.aliasName || 'Perangkat Ruijie'}</h2>
                  <p className="text-xs text-slate-400 font-mono">{selectedDevice.serialNumber}</p>
                </div>
                <button
                  onClick={() => setSelectedDevice(null)}
                  className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 py-4 text-xs">
                <div className="p-3 rounded-xl bg-white/5">
                  <span className="text-slate-400 block mb-1">Model & Tipe Hardware:</span>
                  <span className="text-white font-bold">{selectedDevice.productClass} ({selectedDevice.commonType})</span>
                </div>

                <div className="p-3 rounded-xl bg-white/5">
                  <span className="text-slate-400 block mb-1">Lokasi / OPD:</span>
                  <span className="text-white font-bold">{selectedDevice.groupName}</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 rounded-xl bg-white/5">
                    <span className="text-slate-400 block mb-1">IP Lokal:</span>
                    <span className="text-white font-mono">{selectedDevice.localIp || '-'}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5">
                    <span className="text-slate-400 block mb-1">IP Publik (CPE):</span>
                    <span className="text-white font-mono">{selectedDevice.cpeIp || '-'}</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white/5">
                  <span className="text-slate-400 block mb-1">MAC Address:</span>
                  <span className="text-white font-mono">{selectedDevice.mac || '-'}</span>
                </div>

                <div className="p-3 rounded-xl bg-white/5">
                  <span className="text-slate-400 block mb-1">Firmware / ReyeeOS:</span>
                  <span className="text-white font-mono text-[11px] break-all">{selectedDevice.softwareVersion || '-'}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedDevice(null)}
              className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold"
            >
              Tutup Rincian
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
