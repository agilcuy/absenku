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

export default function RuijieMonitoringPage() {
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
  const [deviceTypes, setDeviceTypes] = useState<string[]>([]);
  const [isFromCache, setIsFromCache] = useState(false);

  // View Mode: Grid (Hardware cards) vs Table
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');

  // Selected device for Detail Drawer
  const [selectedDevice, setSelectedDevice] = useState<RuijieDevice | null>(null);

  // Quick Copy Feedback state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Telegram & Cloud Worker State
  const [telegramModalOpen, setTelegramModalOpen] = useState(false);
  const [wifiModalOpen, setWifiModalOpen] = useState(false);
  const [telegramData, setTelegramData] = useState<any>(null);
  const [telegramTokenInput, setTelegramTokenInput] = useState('');
  const [telegramChatInput, setTelegramChatInput] = useState('');
  const [telegramAuthUsersInput, setTelegramAuthUsersInput] = useState('');
  const [telegramAlertEnabled, setTelegramAlertEnabled] = useState(true);
  const [isSavingTelegram, setIsSavingTelegram] = useState(false);
  const [isTestingTelegram, setIsTestingTelegram] = useState(false);
  const [isRegisteringWebhook, setIsRegisteringWebhook] = useState(false);
  const [isRunningWorker, setIsRunningWorker] = useState(false);
  const [telegramNotice, setTelegramNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Wi-Fi State
  const [showWifiPassword, setShowWifiPassword] = useState<Record<string, boolean>>({});
  const [selectedQrSsid, setSelectedQrSsid] = useState('DISKOMINFO_TANGGAMUS_PKL');

  // Load Telegram Config & Worker Health
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
    fetchTelegramInfo();
  }, [fetchTelegramInfo]);

  // Handle Save Telegram Config
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

  // Handle Test Telegram Alert
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
      setTelegramNotice({ type: 'success', text: 'Pesan tes berhasil terkirim ke Telegram Anda!' });
      fetchTelegramInfo();
    } catch (err: any) {
      setTelegramNotice({ type: 'error', text: err.message });
    } finally {
      setIsTestingTelegram(false);
    }
  };

  // Handle Register Webhook
  const handleRegisterWebhook = async () => {
    setIsRegisteringWebhook(true);
    setTelegramNotice(null);
    try {
      const res = await fetch('/api/admin/ruijie/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'register_webhook' }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal mendaftarkan webhook');
      setTelegramNotice({ type: 'success', text: 'Webhook berhasil aktif di server cloud Vercel!' });
    } catch (err: any) {
      setTelegramNotice({ type: 'error', text: err.message });
    } finally {
      setIsRegisteringWebhook(false);
    }
  };

  // Handle Trigger Cloud Worker Now
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

  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'OFF' | 'ON'>('OFF');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [countdown, setCountdown] = useState(60);

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = viewMode === 'grid' ? 16 : 25;

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
        setDeviceTypes(data.deviceTypes || []);
        setIsFromCache(Boolean(data.fromCache));

        // Visual flash effect on refresh
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

  // Initial load
  useEffect(() => {
    fetchData(false);
  }, [fetchData]);

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
  };

  const handleCopy = (text: string, id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!text || text === '-') return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  // Top 5 locations with highest offline devices (Spotlight)
  const topOfflineLocations = useMemo(() => {
    const counts: Record<string, number> = {};
    devices.forEach((d) => {
      if (d.onlineStatus !== 'ON') {
        const grp = d.groupName || 'Tanpa Lokasi';
        counts[grp] = (counts[grp] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([group, count]) => ({ group, count }));
  }, [devices]);

  // Device Breakdown statistics
  const deviceTypeStats = useMemo(() => {
    const apTotal = devices.filter((d) => d.commonType === 'AP').length;
    const apOnline = devices.filter((d) => d.commonType === 'AP' && d.onlineStatus === 'ON').length;
    const wrTotal = devices.filter((d) => d.commonType === 'WR').length;
    const wrOnline = devices.filter((d) => d.commonType === 'WR' && d.onlineStatus === 'ON').length;
    const otherTotal = devices.filter((d) => d.commonType !== 'AP' && d.commonType !== 'WR').length;
    const otherOnline = devices.filter(
      (d) => d.commonType !== 'AP' && d.commonType !== 'WR' && d.onlineStatus === 'ON'
    ).length;

    return {
      ap: { total: apTotal, online: apOnline, rate: apTotal ? Math.round((apOnline / apTotal) * 100) : 0 },
      wr: { total: wrTotal, online: wrOnline, rate: wrTotal ? Math.round((wrOnline / wrTotal) * 100) : 0 },
      other: { total: otherTotal, online: otherOnline, rate: otherTotal ? Math.round((otherOnline / otherTotal) * 100) : 0 },
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
      if (statusFilter === 'OFF' && d.onlineStatus === 'ON') return false;
      if (statusFilter === 'ON' && d.onlineStatus !== 'ON') return false;
      if (selectedNetwork && d.groupName !== selectedNetwork) return false;
      if (selectedType && d.commonType !== selectedType) return false;

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
  }, [devices, statusFilter, selectedNetwork, selectedType, searchQuery]);

  // Paginated devices
  const totalPages = Math.ceil(filteredDevices.length / pageSize) || 1;
  const paginatedDevices = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredDevices.slice(start, start + pageSize);
  }, [filteredDevices, page, pageSize]);

  // Reset page when filters or viewMode change
  useEffect(() => {
    setPage(1);
  }, [statusFilter, searchQuery, selectedNetwork, selectedType, viewMode]);

  // Export to Excel
  const handleExportExcel = () => {
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
      'Versi Hardware': d.hardwareVersion || '-',
      'Terakhir Online': d.lastOnline
        ? new Date(d.lastOnline).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
        : '-',
      'Alasan Offline': d.offlineReason || '-',
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Ruijie Monitoring');

    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `Ruijie_Monitoring_Tanggamus_${dateStr}.xlsx`);
  };

  const formatLastSeen = (timestamp?: number) => {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    return date.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getRelativeTime = (timestamp?: number) => {
    if (!timestamp) return 'Waktu tidak tersedia';
    const diffMs = Date.now() - timestamp;
    if (diffMs < 0) return 'Baru saja';
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Baru saja';
    if (diffMin < 60) return `${diffMin} menit lalu`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour} jam ${diffMin % 60} mnt lalu`;
    const diffDays = Math.floor(diffHour / 24);
    return `${diffDays} hari lalu`;
  };

  return (
    <div className="space-y-6">
      {/* Header Banner - NOC Command Center Aesthetic */}
      <div
        className={`relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#070b19] via-[#0d1430] to-[#070b19] border transition-all duration-700 p-6 lg:p-7 shadow-2xl ${
          recentlyRefreshed ? 'border-emerald-500/50 shadow-emerald-900/20' : 'border-white/10 shadow-indigo-950/20'
        }`}
      >
        {/* Subtle mesh glows */}
        <div className="absolute -right-16 -top-16 w-80 h-80 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-80 h-80 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-4">
              {/* Radar Scanner Animation */}
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
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm shadow-amber-950">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      Snapshot Cache
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm shadow-emerald-950">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      Live Cloud Sync
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-400 mt-1 flex items-center gap-2">
                  <span>Telemetri & Pemantauan Perangkat Jaringan se-Kabupaten Tanggamus</span>
                  <span className="hidden sm:inline text-slate-600">&bull;</span>
                  <span className="hidden sm:inline font-mono text-xs text-indigo-300/80">329 Perangkat Terdaftar</span>
                </p>
              </div>
            </div>
          </div>

          {/* Action buttons with Countdown Ring */}
          <div className="flex items-center flex-wrap gap-2.5">
            {/* Auto-Refresh with Countdown Ring */}
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              title={autoRefresh ? 'Matikan Auto-Refresh' : 'Aktifkan Auto-Refresh (60s)'}
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
              <span>
                Auto-Sync: <span className="font-bold text-white">{autoRefresh ? `${countdown}s` : 'OFF'}</span>
              </span>
            </button>

            {/* Manual Refresh */}
            <button
              onClick={handleManualRefresh}
              disabled={refreshing || loading}
              className="px-4 py-2.5 text-xs font-semibold rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-50 text-white shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Menyinkronkan...' : 'Refresh Sekarang'}</span>
            </button>

            {/* Wi-Fi & QR Code Tool */}
            <button
              onClick={() => setWifiModalOpen(true)}
              className="px-3.5 py-2.5 text-xs font-semibold rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 shadow-sm flex items-center gap-2 transition-all active:scale-95"
              title="Informasi SSID Wi-Fi & QR Code Instan"
            >
              <Wifi className="w-3.5 h-3.5 text-purple-400" />
              <span>Info Wi-Fi & QR</span>
            </button>

            {/* Telegram Bot Setting & Test */}
            <button
              onClick={() => setTelegramModalOpen(true)}
              className="px-3.5 py-2.5 text-xs font-semibold rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 shadow-sm flex items-center gap-2 transition-all active:scale-95 relative"
              title="Konfigurasi Bot Telegram & Alert 24/7"
            >
              <Send className="w-3.5 h-3.5 text-blue-400" />
              <span>Bot Telegram</span>
              {telegramData?.config?.has_token && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </button>

            {/* Export Excel */}
            <button
              onClick={handleExportExcel}
              disabled={filteredDevices.length === 0}
              className="px-4 py-2.5 text-xs font-semibold rounded-xl bg-emerald-600/90 hover:bg-emerald-500 disabled:opacity-50 text-white shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition-all active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Excel</span>
            </button>
          </div>
        </div>

        {summary.lastChecked && (
          <div className="mt-5 pt-3.5 border-t border-white/5 text-xs text-slate-400 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
              <span>{isFromCache ? 'Waktu snapshot cache:' : 'Pemeriksaan live terakhir:'}</span>
              <span className="text-slate-200 font-mono font-medium">
                {new Date(summary.lastChecked).toLocaleString('id-ID')} WIB
              </span>
            </div>
            <span className="text-slate-500 text-[11px]">
              Region: Asia-Pacific (AS) &bull; Cloud Service Tenant: Tanggamus (441225)
            </span>
          </div>
        )}
      </div>

      {/* Cloud Monitoring 24/7 Engine Status Bar */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900/90 via-indigo-950/40 to-slate-900/90 border border-indigo-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
            <Activity className="w-5 h-5 text-indigo-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-white tracking-wide uppercase">
                Mesin Cloud Monitoring (Skenario PC Mati)
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Vercel Cron 24/7 Mandiri
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Pengecekan cloud terakhir:{' '}
              <b className="text-slate-200 font-mono">
                {telegramData?.worker_health?.last_run_at
                  ? new Date(telegramData.worker_health.last_run_at).toLocaleTimeString('id-ID') + ' WIB'
                  : 'Baru saja'}
              </b>{' '}
              &bull; Alert Telegram:{' '}
              <span className={telegramData?.config?.alert_enabled ? 'text-emerald-400 font-semibold' : 'text-slate-400'}>
                {telegramData?.config?.alert_enabled ? 'Aktif' : 'Non-aktif'}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto">
          <button
            type="button"
            disabled={isRunningWorker}
            onClick={handleTriggerCloudWorker}
            className="px-3 py-1.5 rounded-xl border border-indigo-500/40 hover:bg-indigo-500/20 text-indigo-200 text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRunningWorker ? 'animate-spin text-indigo-400' : ''}`} />
            <span>{isRunningWorker ? 'Mengecek...' : 'Picu Cek Cloud'}</span>
          </button>
        </div>
      </div>

      {/* Snapshot Cache Notice if offline */}
      {isFromCache && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <span className="font-semibold text-amber-200">Mode Snapshot Cadangan Aktif</span>
              <p className="text-xs text-amber-300/80 mt-0.5">
                Menampilkan data snapshot cadangan lokal terakhir. Klik &apos;Sinkronkan Ulang&apos; untuk mencoba menghubungkan langsung ke Ruijie Cloud.
              </p>
            </div>
          </div>
          <button
            onClick={handleManualRefresh}
            disabled={refreshing || loading}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30 shrink-0 transition-colors shadow-sm"
          >
            Sinkronkan Ulang
          </button>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-start gap-3 shadow-lg">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">Gagal Menghubungi Ruijie Cloud</div>
            <div className="text-xs text-rose-400/90 mt-1">{error}</div>
          </div>
        </div>
      )}

      {/* Analytics & Stats Command Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Network Health Score Meter (4 cols) */}
        <div className="lg:col-span-4 bg-[#0a0d17] border border-white/5 rounded-3xl p-5 relative overflow-hidden shadow-xl flex flex-col justify-between">
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

          {/* Large Health Radial Bar */}
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

            {/* Circular Gauge Graphic */}
            <div className="relative w-18 h-18 flex items-center justify-center shrink-0">
              <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                <circle
                  className="text-white/5"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  r="15.9155"
                  cx="18"
                  cy="18"
                />
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

          {/* Segmented Bar */}
          <div className="space-y-1.5 pt-2 border-t border-white/5">
            <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden flex">
              <div
                style={{ width: `${healthRate}%` }}
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-700"
              />
              <div
                style={{ width: `${100 - healthRate}%` }}
                className="h-full bg-rose-500 transition-all duration-700"
              />
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

        {/* 4 Stats Cards (8 cols) */}
        <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {/* Total Devices */}
          <div
            onClick={() => setStatusFilter('all')}
            className={`cursor-pointer bg-[#0a0d17] border rounded-3xl p-5 relative overflow-hidden transition-all shadow-xl hover:-translate-y-1 ${
              statusFilter === 'all' ? 'border-blue-500/50 bg-blue-950/20 ring-1 ring-blue-500/20' : 'border-white/5 hover:border-white/20'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Alat</span>
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <Server className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-white tracking-tight">
                {loading ? '...' : summary.total}
              </span>
              <span className="text-xs text-slate-400">Unit</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Terpasang se-Tanggamus</p>
          </div>

          {/* Online Devices */}
          <div
            onClick={() => setStatusFilter('ON')}
            className={`cursor-pointer bg-[#0a0d17] border rounded-3xl p-5 relative overflow-hidden transition-all shadow-xl hover:-translate-y-1 ${
              statusFilter === 'ON' ? 'border-emerald-500/50 bg-emerald-950/20 ring-1 ring-emerald-500/30' : 'border-white/5 hover:border-emerald-500/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Online Normal</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <Wifi className="w-4 h-4 text-emerald-400" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-emerald-400 tracking-tight">
                {loading ? '...' : summary.online}
              </span>
              <span className="text-xs text-emerald-400/70 font-semibold">
                ({summary.total ? Math.round((summary.online / summary.total) * 100) : 0}%)
              </span>
            </div>
            <p className="text-[11px] text-emerald-500/60 mt-1 font-medium">Beroperasi lancar</p>
          </div>

          {/* Offline Devices */}
          <div
            onClick={() => setStatusFilter('OFF')}
            className={`cursor-pointer bg-[#0a0d17] border rounded-3xl p-5 relative overflow-hidden transition-all shadow-xl hover:-translate-y-1 ${
              statusFilter === 'OFF' ? 'border-rose-500/60 bg-rose-950/30 ring-2 ring-rose-500/30' : 'border-white/5 hover:border-rose-500/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider">Offline</span>
              <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
                <WifiOff className="w-4 h-4 text-rose-400 animate-pulse" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-rose-400 tracking-tight">
                {loading ? '...' : summary.offline}
              </span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold text-[10px]">
                Perlu Cek
              </span>
            </div>
            <p className="text-[11px] text-rose-400/70 mt-1">Mati / terputus</p>
          </div>

          {/* Total Networks */}
          <div className="bg-[#0a0d17] border border-white/5 rounded-3xl p-5 relative overflow-hidden shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">Titik Lokasi</span>
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-purple-400" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-white tracking-tight">
                {loading ? '...' : summary.totalNetworks}
              </span>
              <span className="text-xs text-slate-400">Jaringan</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Kecamatan & Puskesmas</p>
          </div>
        </div>
      </div>

      {/* Spotlight: Top 5 OPD / Lokasi Terdampak Offline */}
      {summary.offline > 0 && topOfflineLocations.length > 0 && (
        <div className="p-5 rounded-3xl bg-gradient-to-r from-rose-950/40 via-[#0d1022] to-slate-900 border border-rose-500/30 shadow-xl space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500" />
              </span>
              <span className="text-sm font-bold text-white tracking-wide">
                Spotlight Gangguan: 5 Lokasi dengan Perangkat Offline Terbanyak
              </span>
            </div>
            <span className="text-xs text-slate-400">
              Klik lokasi untuk langsung memfilter daftar perangkat
            </span>
          </div>

          {/* Quick Filter Chips */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 pt-1">
            {topOfflineLocations.map(({ group, count }) => {
              const isSelected = selectedNetwork === group && statusFilter === 'OFF';
              return (
                <button
                  key={group}
                  onClick={() => {
                    if (isSelected) {
                      setSelectedNetwork('');
                    } else {
                      setSelectedNetwork(group);
                      setStatusFilter('OFF');
                    }
                  }}
                  className={`px-3.5 py-2.5 rounded-2xl border text-left transition-all flex items-center justify-between gap-2 ${
                    isSelected
                      ? 'bg-rose-500/30 border-rose-400 text-white shadow-lg shadow-rose-900/30 ring-1 ring-rose-400'
                      : 'bg-white/5 border-white/10 hover:border-rose-500/40 hover:bg-rose-500/10 text-slate-200'
                  }`}
                >
                  <div className="truncate pr-1">
                    <div className="text-xs font-semibold truncate">{group}</div>
                    <div className="text-[10px] text-rose-400 mt-0.5 flex items-center gap-1">
                      <WifiOff className="w-3 h-3 shrink-0" />
                      <span>{count} unit offline</span>
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Hardware Distribution Mini-Bar */}
      <div className="bg-[#0a0d17] border border-white/5 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2 text-slate-400">
          <Cpu className="w-4 h-4 text-indigo-400" />
          <span className="font-semibold text-slate-300">Distribusi Kategori Perangkat:</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* AP */}
          <button
            onClick={() => setSelectedType(selectedType === 'AP' ? '' : 'AP')}
            className={`px-3 py-1.5 rounded-xl border transition-all flex items-center gap-2 ${
              selectedType === 'AP'
                ? 'bg-indigo-600/30 border-indigo-400 text-white'
                : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-indigo-400" />
            <span>
              Access Point (AP): <strong>{deviceTypeStats.ap.total}</strong> ({deviceTypeStats.ap.rate}% Online)
            </span>
          </button>

          {/* WR (Router) */}
          <button
            onClick={() => setSelectedType(selectedType === 'WR' ? '' : 'WR')}
            className={`px-3 py-1.5 rounded-xl border transition-all flex items-center gap-2 ${
              selectedType === 'WR'
                ? 'bg-indigo-600/30 border-indigo-400 text-white'
                : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
            }`}
          >
            <Router className="w-3.5 h-3.5 text-indigo-400" />
            <span>
              Wireless Router (WR): <strong>{deviceTypeStats.wr.total}</strong> ({deviceTypeStats.wr.rate}% Online)
            </span>
          </button>

          {deviceTypeStats.other.total > 0 && (
            <span className="text-slate-400 px-2 py-1 bg-white/5 rounded-xl">
              Lainnya: <strong>{deviceTypeStats.other.total}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Filter & Search Bar + View Mode Toggle */}
      <div className="bg-[#0a0d17] border border-white/5 rounded-3xl p-5 space-y-4 shadow-xl">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama perangkat, IP, MAC, Serial Number, atau Lokasi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            />
          </div>

          <div className="flex items-center gap-2.5">
            {/* Status Tabs */}
            <div className="flex p-1 bg-white/5 rounded-2xl border border-white/10 shrink-0">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all ${
                  statusFilter === 'all'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/50'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Semua ({summary.total})
              </button>
              <button
                onClick={() => setStatusFilter('OFF')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 ${
                  statusFilter === 'OFF'
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-900/50'
                    : 'text-rose-400 hover:text-rose-300'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-rose-400" />
                Offline ({summary.offline})
              </button>
              <button
                onClick={() => setStatusFilter('ON')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 ${
                  statusFilter === 'ON'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/50'
                    : 'text-emerald-400 hover:text-emerald-300'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Online ({summary.online})
              </button>
            </div>

            {/* View Switcher (Table vs Grid) */}
            <div className="flex p-1 bg-white/5 rounded-2xl border border-white/10 shrink-0">
              <button
                onClick={() => setViewMode('table')}
                title="Tampilan Tabel (Ringkas)"
                className={`p-2 rounded-xl transition-all ${
                  viewMode === 'table'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/50'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <TableIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                title="Tampilan Grid Card Hardware (Visual)"
                className={`p-2 rounded-xl transition-all ${
                  viewMode === 'grid'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/50'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Dropdown Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2 border-t border-white/5">
          {/* Lokasi / Group dropdown */}
          <div>
            <label className="block text-xs text-slate-400 mb-1 font-medium">Filter Lokasi / OPD / Kecamatan:</label>
            <select
              value={selectedNetwork}
              onChange={(e) => setSelectedNetwork(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="">Semua Lokasi ({networks.length} Jaringan)</option>
              {networks.map((net) => (
                <option key={net} value={net}>
                  {net}
                </option>
              ))}
            </select>
          </div>

          {/* Tipe Alat */}
          <div>
            <label className="block text-xs text-slate-400 mb-1 font-medium">Filter Tipe Perangkat:</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="">Semua Tipe Perangkat</option>
              {deviceTypes.map((t) => (
                <option key={t} value={t}>
                  {t === 'WR' ? 'Wireless Router (WR)' : t === 'AP' ? 'Access Point (AP)' : t === 'SW' ? 'Switch (SW)' : t}
                </option>
              ))}
            </select>
          </div>

          {/* Clear Filter button */}
          <div className="flex items-end">
            {(selectedNetwork || selectedType || searchQuery) && (
              <button
                onClick={() => {
                  setSelectedNetwork('');
                  setSelectedType('');
                  setSearchQuery('');
                }}
                className="w-full py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-300 font-medium transition-colors"
              >
                Reset Filter
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Devices Content (Grid or Table) */}
      <div className="bg-[#0a0d17] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
        {/* Table/Grid Header summary count */}
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <div className="text-sm font-semibold text-white flex items-center gap-2.5">
            <span>Daftar Perangkat Ruijie Cloud</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/10 text-slate-300 font-mono">
              {filteredDevices.length} dari {summary.total} alat
            </span>
          </div>
          {filteredDevices.length > 0 && (
            <div className="text-xs text-slate-400 font-medium">
              Halaman {page} dari {totalPages} &bull; Mode: {viewMode === 'grid' ? 'Grid Cards' : 'Tabel'}
            </div>
          )}
        </div>

        {/* Loading State with Shimmer Skeletons */}
        {loading ? (
          <div className="p-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 animate-pulse space-y-3">
                  <div className="h-4 bg-white/10 rounded-md w-2/3" />
                  <div className="h-3 bg-white/5 rounded-md w-1/2" />
                  <div className="h-8 bg-white/5 rounded-lg" />
                </div>
              ))}
            </div>
          </div>
        ) : filteredDevices.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-400">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-3" />
            <p className="text-base font-semibold text-white">Tidak ada perangkat yang cocok</p>
            <p className="text-xs text-slate-500 mt-1">
              {statusFilter === 'OFF'
                ? 'Luar biasa! Tidak ada perangkat offline pada kriteria filter ini.'
                : 'Coba ubah kata kunci atau reset filter pencarian.'}
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          /* ============================================================
             VIEW MODE 1: GRID CARDS (HARDWARE NOC STYLE)
             ============================================================ */
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {paginatedDevices.map((dev) => {
                const isOnline = dev.onlineStatus === 'ON';
                return (
                  <div
                    key={dev.serialNumber}
                    onClick={() => setSelectedDevice(dev)}
                    className={`group relative rounded-2xl p-5 border transition-all duration-300 cursor-pointer shadow-lg hover:-translate-y-1 hover:shadow-2xl flex flex-col justify-between ${
                      isOnline
                        ? 'bg-gradient-to-b from-[#0c1226] to-[#070b16] border-white/5 hover:border-emerald-500/40 hover:shadow-emerald-950/20'
                        : 'bg-gradient-to-b from-rose-950/20 to-[#070b16] border-rose-500/20 hover:border-rose-500/50 hover:shadow-rose-950/30 ring-1 ring-rose-500/10'
                    }`}
                  >
                    <div>
                      {/* Top Bar: Icon + Model + LED status */}
                      <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/5">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                              isOnline ? 'bg-indigo-500/10 text-indigo-400' : 'bg-rose-500/10 text-rose-400'
                            }`}
                          >
                            {dev.commonType === 'WR' ? (
                              <Router className="w-4 h-4" />
                            ) : (
                              <Radio className="w-4 h-4" />
                            )}
                          </div>
                          <span className="text-xs font-semibold text-slate-300 font-mono">
                            {dev.productClass}
                          </span>
                        </div>

                        {/* Status LED Badge */}
                        <div className="flex items-center gap-1.5">
                          {isOnline ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              ONLINE
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
                              OFFLINE
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Device Name & Location */}
                      <div className="mt-3">
                        <h3 className="font-bold text-sm text-white group-hover:text-indigo-300 transition-colors truncate">
                          {dev.name || dev.aliasName || 'Perangkat Tanpa Nama'}
                        </h3>
                        <div className="text-xs text-slate-400 mt-1 flex items-center gap-1 truncate">
                          <Building2 className="w-3 h-3 text-indigo-400 shrink-0" />
                          <span className="truncate">{dev.groupName || 'Tanpa Grup'}</span>
                        </div>
                      </div>

                      {/* Technical Info Box */}
                      <div className="mt-3.5 p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-1.5 text-xs font-mono">
                        {/* IP with copy */}
                        <div className="flex items-center justify-between text-slate-300">
                          <span className="text-[11px] text-slate-500 font-sans">IP Lokal:</span>
                          <button
                            onClick={(e) => handleCopy(dev.localIp, `ip-${dev.serialNumber}`, e)}
                            className="hover:text-indigo-300 flex items-center gap-1 text-[11px]"
                            title="Klik untuk menyalin IP"
                          >
                            <span>{dev.localIp || '-'}</span>
                            {copiedId === `ip-${dev.serialNumber}` ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3 text-slate-500 hover:text-slate-300" />
                            )}
                          </button>
                        </div>

                        {/* MAC with copy */}
                        <div className="flex items-center justify-between text-slate-400">
                          <span className="text-[11px] text-slate-500 font-sans">MAC:</span>
                          <button
                            onClick={(e) => handleCopy(dev.mac, `mac-${dev.serialNumber}`, e)}
                            className="hover:text-indigo-300 flex items-center gap-1 text-[11px]"
                            title="Klik untuk menyalin MAC"
                          >
                            <span className="truncate max-w-[120px]">{dev.mac || '-'}</span>
                            {copiedId === `mac-${dev.serialNumber}` ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3 text-slate-500 hover:text-slate-300" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Card Footer: Last Seen & Detail button */}
                    <div className="mt-3.5 pt-2.5 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
                      <span>{getRelativeTime(dev.lastOnline)}</span>
                      <span className="text-indigo-400 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                        Detail &rarr;
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* ============================================================
             VIEW MODE 2: TABLE VIEW (COMPACT)
             ============================================================ */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02] text-xs font-semibold text-slate-400">
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-4">Nama Perangkat</th>
                  <th className="py-3.5 px-4">Lokasi / Jaringan</th>
                  <th className="py-3.5 px-4">Model & Tipe</th>
                  <th className="py-3.5 px-4">Alamat IP</th>
                  <th className="py-3.5 px-4">MAC Address</th>
                  <th className="py-3.5 px-6">Terakhir Online</th>
                  <th className="py-3.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm text-slate-300">
                {paginatedDevices.map((dev) => {
                  const isOnline = dev.onlineStatus === 'ON';
                  return (
                    <tr
                      key={dev.serialNumber}
                      onClick={() => setSelectedDevice(dev)}
                      className="hover:bg-white/[0.03] transition-colors group cursor-pointer"
                    >
                      {/* Status Badge */}
                      <td className="py-3.5 px-6 whitespace-nowrap">
                        {isOnline ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            ONLINE
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
                            OFFLINE
                          </span>
                        )}
                      </td>

                      {/* Device Name */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white group-hover:text-indigo-400 transition-colors">
                          {dev.name || dev.aliasName || 'Perangkat Tanpa Nama'}
                        </div>
                        <div className="text-xs text-slate-500 font-mono mt-0.5">
                          SN: {dev.serialNumber}
                        </div>
                      </td>

                      {/* Location / Group */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-200 bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
                          <Building2 className="w-3 h-3 text-indigo-400 shrink-0" />
                          {dev.groupName || 'Tanpa Grup'}
                        </span>
                      </td>

                      {/* Model & Type */}
                      <td className="py-3.5 px-4">
                        <div className="text-xs font-semibold text-slate-200">
                          {dev.productClass}
                        </div>
                        <div className="text-xs text-slate-500">
                          {dev.commonType === 'WR'
                            ? 'Router Gateway'
                            : dev.commonType === 'AP'
                            ? 'Access Point'
                            : dev.commonType || 'Device'}
                        </div>
                      </td>

                      {/* IP Addresses with copy */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1 text-xs font-mono text-slate-300">
                          <span>{dev.localIp || '-'}</span>
                          {dev.localIp && (
                            <button
                              onClick={(e) => handleCopy(dev.localIp, `tip-${dev.serialNumber}`, e)}
                              className="text-slate-500 hover:text-white p-0.5"
                              title="Salin IP"
                            >
                              {copiedId === `tip-${dev.serialNumber}` ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          )}
                        </div>
                        {dev.cpeIp && (
                          <div className="text-[11px] font-mono text-slate-500">
                            Publik: {dev.cpeIp}
                          </div>
                        )}
                      </td>

                      {/* MAC Address with copy */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1 text-xs font-mono text-slate-400">
                          <span>{dev.mac || '-'}</span>
                          {dev.mac && (
                            <button
                              onClick={(e) => handleCopy(dev.mac, `tmac-${dev.serialNumber}`, e)}
                              className="text-slate-500 hover:text-white p-0.5"
                              title="Salin MAC"
                            >
                              {copiedId === `tmac-${dev.serialNumber}` ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Last Seen */}
                      <td className="py-3.5 px-6 whitespace-nowrap">
                        <span className="text-xs text-slate-300">
                          {formatLastSeen(dev.lastOnline)}
                        </span>
                        <div className="text-[11px] text-slate-500">
                          {getRelativeTime(dev.lastOnline)}
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right">
                        <span className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold text-indigo-400 border border-white/5 inline-flex items-center gap-1">
                          Detail &rarr;
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {filteredDevices.length > pageSize && (
          <div className="px-6 py-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-slate-400">
              Menampilkan {(page - 1) * pageSize + 1} -{' '}
              {Math.min(page * pageSize, filteredDevices.length)} dari {filteredDevices.length} perangkat
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-xs font-medium rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 text-white border border-white/10 transition-colors"
              >
                Sebelumnya
              </button>
              <span className="text-xs font-medium text-slate-300 px-2 font-mono">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-xs font-medium rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 text-white border border-white/10 transition-colors"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================
         SLIDE-OVER DETAIL DRAWER FOR SELECTED DEVICE
         ============================================================ */}
      {selectedDevice && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
            onClick={() => setSelectedDevice(null)}
          />

          {/* Slide panel */}
          <div className="relative w-full max-w-lg bg-[#0a0d18] border-l border-white/10 shadow-2xl flex flex-col h-full z-10 animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="p-6 border-b border-white/10 flex items-start justify-between bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${
                    selectedDevice.onlineStatus === 'ON'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  }`}
                >
                  {selectedDevice.commonType === 'WR' ? (
                    <Router className="w-6 h-6" />
                  ) : (
                    <Radio className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white leading-snug">
                    {selectedDevice.name || selectedDevice.aliasName || 'Perangkat Ruijie'}
                  </h2>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Model: <span className="font-mono text-slate-200">{selectedDevice.productClass}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedDevice(null)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Status Banner */}
              <div
                className={`p-4 rounded-2xl border flex items-center justify-between ${
                  selectedDevice.onlineStatus === 'ON'
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`w-3 h-3 rounded-full ${
                      selectedDevice.onlineStatus === 'ON' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400 animate-ping'
                    }`}
                  />
                  <span className="font-bold text-sm tracking-wide">
                    STATUS: {selectedDevice.onlineStatus === 'ON' ? 'ONLINE (TERHUBUNG)' : 'OFFLINE (TERPUTUS)'}
                  </span>
                </div>
                <span className="text-xs text-slate-300">
                  {getRelativeTime(selectedDevice.lastOnline)}
                </span>
              </div>

              {/* Network & Location Section */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                  Lokasi & Jaringan
                </h4>
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">OPD / Kelompok:</span>
                    <span className="font-semibold text-white text-right max-w-[240px]">
                      {selectedDevice.groupName || '-'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Group ID:</span>
                    <span className="font-mono text-slate-300">{selectedDevice.groupId || '-'}</span>
                  </div>
                  {selectedDevice.buildingId && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Building ID:</span>
                      <span className="font-mono text-slate-300">{selectedDevice.buildingId}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* IP & Network Specs Section */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-cyan-400" />
                  Alamat IP & Identifikasi Fisik
                </h4>
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3 text-xs">
                  {/* Local IP */}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Alamat IP Lokal:</span>
                    <div className="flex items-center gap-1.5 font-mono text-white">
                      <span>{selectedDevice.localIp || '-'}</span>
                      {selectedDevice.localIp && (
                        <button
                          onClick={() => handleCopy(selectedDevice.localIp, 'drawer-ip')}
                          className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white"
                          title="Salin IP"
                        >
                          {copiedId === 'drawer-ip' ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Public IP */}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">CPE Public IP:</span>
                    <div className="flex items-center gap-1.5 font-mono text-slate-300">
                      <span>{selectedDevice.cpeIp || '-'}</span>
                      {selectedDevice.cpeIp && (
                        <button
                          onClick={() => handleCopy(selectedDevice.cpeIp, 'drawer-cpe')}
                          className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white"
                          title="Salin CPE IP"
                        >
                          {copiedId === 'drawer-cpe' ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* MAC Address */}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">MAC Address:</span>
                    <div className="flex items-center gap-1.5 font-mono text-slate-300">
                      <span>{selectedDevice.mac || '-'}</span>
                      {selectedDevice.mac && (
                        <button
                          onClick={() => handleCopy(selectedDevice.mac, 'drawer-mac')}
                          className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white"
                          title="Salin MAC"
                        >
                          {copiedId === 'drawer-mac' ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Serial Number */}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Serial Number:</span>
                    <div className="flex items-center gap-1.5 font-mono text-indigo-300">
                      <span>{selectedDevice.serialNumber}</span>
                      <button
                        onClick={() => handleCopy(selectedDevice.serialNumber, 'drawer-sn')}
                        className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white"
                        title="Salin SN"
                      >
                        {copiedId === 'drawer-sn' ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Hardware & Software Version */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Cpu className="w-3.5 h-3.5 text-purple-400" />
                  Firmware & Perangkat Keras
                </h4>
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Hardware Version:</span>
                    <span className="font-mono text-slate-200">{selectedDevice.hardwareVersion || '-'}</span>
                  </div>
                  <div className="flex flex-col gap-1 pt-1">
                    <span className="text-slate-400">ReyeeOS / Firmware Version:</span>
                    <span className="font-mono text-[11px] text-slate-300 bg-black/40 p-2 rounded-lg border border-white/5 break-all">
                      {selectedDevice.softwareVersion || 'ReyeeOS standar'}
                    </span>
                  </div>
                  {selectedDevice.offlineReason && (
                    <div className="flex flex-col gap-1 pt-1 text-rose-300">
                      <span className="text-slate-400">Penyebab Offline:</span>
                      <span className="bg-rose-500/10 p-2 rounded-lg border border-rose-500/20 text-xs">
                        {selectedDevice.offlineReason}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-6 border-t border-white/10 bg-white/[0.02] flex items-center gap-3">
              <a
                href="https://cloud-as.ruijienetworks.com/macc5/adminIntl/"
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/30 active:scale-95"
              >
                <span>Buka di Ruijie Cloud Web GUI</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                onClick={() => setSelectedDevice(null)}
                className="py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold text-xs border border-white/10 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 1: PENGATURAN & TEST TELEGRAM BOT 24/7                 */}
      {/* ============================================================ */}
      {telegramModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="glass-card w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 sm:p-7 border border-blue-500/30 bg-[#0a0f24] shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    Telegram Bot & Cloud Alert 24/7
                    {telegramData?.config?.has_token && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                        Terhubung
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Notifikasi otomatis perangkat offline/recovery & perintah teknisi via Telegram
                  </p>
                </div>
              </div>
              <button
                onClick={() => setTelegramModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {telegramNotice && (
              <div
                className={`p-3.5 rounded-xl text-xs flex items-center gap-2 border ${
                  telegramNotice.type === 'success'
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                }`}
              >
                <Info className="w-4 h-4 shrink-0" />
                <span>{telegramNotice.text}</span>
              </div>
            )}

            <form onSubmit={handleSaveTelegram} className="space-y-4 text-xs">
              {/* Token Bot */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1 flex items-center justify-between">
                  <span>Token Bot Telegram (dari @BotFather)</span>
                  {telegramData?.config?.masked_token && (
                    <span className="font-mono text-[11px] text-emerald-400 font-normal">
                      Tersimpan: {telegramData.config.masked_token}
                    </span>
                  )}
                </label>
                <input
                  type="password"
                  value={telegramTokenInput}
                  onChange={(e) => setTelegramTokenInput(e.target.value)}
                  placeholder={telegramData?.config?.has_token ? '••••••••••••••••••••••••' : 'Contoh: 1234567890:ABCdefGhIJKlmNoPQRstuVWXyz'}
                  className="input-field text-xs font-mono"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Buat bot baru melalui chat <b>@BotFather</b> di aplikasi Telegram untuk mendapatkan token ini. Kosongkan jika tidak ingin mengubah.
                </p>
              </div>

              {/* Chat ID Target */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Target Chat ID / Group ID Penerima Alert
                </label>
                <input
                  type="text"
                  required
                  value={telegramChatInput}
                  onChange={(e) => setTelegramChatInput(e.target.value)}
                  placeholder="Contoh: 123456789 (chat pribadi) atau -1001234567890 (group)"
                  className="input-field text-xs font-mono"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  ID akun Telegram Anda atau Group Tim NOC Tanggamus yang akan menerima notifikasi 🚨 Offline & ✅ Recovery.
                </p>
              </div>

              {/* User ID yang Diizinkan */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  User ID Teknisi Berwenang (Otorisasi RBAC)
                </label>
                <input
                  type="text"
                  value={telegramAuthUsersInput}
                  onChange={(e) => setTelegramAuthUsersInput(e.target.value)}
                  placeholder="Pisahkan dengan koma, contoh: 123456789, 987654321"
                  className="input-field text-xs font-mono"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Hanya ID pengguna di atas yang diizinkan menjalankan perintah <code>/status</code>, <code>/offline</code>, <code>/wifi</code>, dll.
                </p>
              </div>

              {/* Toggle Alert */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="tg-alert-toggle"
                  checked={telegramAlertEnabled}
                  onChange={(e) => setTelegramAlertEnabled(e.target.checked)}
                  className="rounded bg-white/5 border-white/20 text-blue-500 focus:ring-0 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="tg-alert-toggle" className="text-slate-300 text-xs cursor-pointer select-none">
                  Aktifkan Notifikasi Otomatis 24/7 (🚨 Offline & ✅ Recovery)
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-white/10">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isTestingTelegram || !telegramData?.config?.has_token}
                    onClick={handleTestTelegram}
                    className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5 text-blue-400" />
                    <span>{isTestingTelegram ? 'Mengirim...' : 'Kirim Pesan Tes'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={isRegisteringWebhook || !telegramData?.config?.has_token}
                    onClick={handleRegisterWebhook}
                    className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>{isRegisteringWebhook ? 'Mendaftarkan...' : 'Aktifkan Webhook Cloud'}</span>
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isSavingTelegram}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition disabled:opacity-50"
                >
                  {isSavingTelegram ? 'Menyimpan...' : 'Simpan Konfigurasi'}
                </button>
              </div>
            </form>

            {/* Riwayat Notifikasi Terakhir */}
            {telegramData?.recent_logs && telegramData.recent_logs.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-white/10 text-xs">
                <h4 className="font-bold text-slate-300 flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-indigo-400" />
                  Log Pengiriman Notifikasi Terakhir
                </h4>
                <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                  {telegramData.recent_logs.map((log: any) => (
                    <div
                      key={log.id}
                      className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between text-[11px]"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            log.notification_type === 'OFFLINE_ALERT'
                              ? 'bg-rose-500 animate-pulse'
                              : 'bg-emerald-400'
                          }`}
                        />
                        <span className="font-bold text-white">{log.device_name}</span>
                        <span className="text-slate-400">({log.notification_type})</span>
                      </div>
                      <span className="text-slate-500 font-mono">
                        {new Date(log.sent_at).toLocaleTimeString('id-ID')} WIB
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 2: WI-FI INFORMATION & INSTANT QR CODE GENERATOR       */}
      {/* ============================================================ */}
      {wifiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="glass-card w-full max-w-lg rounded-3xl p-6 sm:p-7 border border-purple-500/30 bg-[#0d0f26] shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <Wifi className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Informasi Wi-Fi & QR Code</h3>
                  <p className="text-xs text-slate-400">Kredensial jaringan resmi instansi & generator QR instan</p>
                </div>
              </div>
              <button
                onClick={() => setWifiModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List of Official Wi-Fi Networks */}
            <div className="space-y-3 text-xs">
              {[
                {
                  ssid: 'DISKOMINFO_TANGGAMUS_PKL',
                  location: 'Gedung Diskominfo Kabupaten Tanggamus',
                  pass: 'TanggamusHebat2026',
                  security: 'WPA2-PSK',
                },
                {
                  ssid: 'GENZ_TECH_INTERN',
                  location: 'DeryGarage X Gen z Code (Bernung)',
                  pass: 'BernungKreatif2026',
                  security: 'WPA2-PSK',
                },
              ].map((net) => {
                const isShowing = showWifiPassword[net.ssid];
                const isSelected = selectedQrSsid === net.ssid;
                const wifiString = `WIFI:T:WPA;S:${net.ssid};P:${net.pass};;`;
                const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
                  wifiString
                )}`;

                return (
                  <div
                    key={net.ssid}
                    className={`p-4 rounded-2xl border transition-all ${
                      isSelected
                        ? 'border-purple-500/50 bg-purple-500/10'
                        : 'border-white/10 bg-white/[0.02]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-white text-sm">{net.ssid}</h4>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-300">
                            {net.security}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">{net.location}</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedQrSsid(net.ssid)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                          isSelected
                            ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                            : 'bg-white/5 text-slate-300 hover:bg-white/10'
                        }`}
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>{isSelected ? 'Aktif' : 'Lihat QR'}</span>
                      </button>
                    </div>

                    <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Key className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-slate-400 text-[11px]">Kata Sandi:</span>
                        <span className="font-mono text-xs text-white">
                          {isShowing ? net.pass : '••••••••••••'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            setShowWifiPassword((prev) => ({
                              ...prev,
                              [net.ssid]: !prev[net.ssid],
                            }))
                          }
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition"
                          title={isShowing ? 'Sembunyikan' : 'Tampilkan'}
                        >
                          {isShowing ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopy(net.pass, `pass-${net.ssid}`)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition"
                          title="Salin Password"
                        >
                          {copiedId === `pass-${net.ssid}` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* QR Code Preview if selected */}
                    {isSelected && (
                      <div className="mt-4 pt-4 border-t border-purple-500/20 text-center space-y-3 animate-fade-in">
                        <div className="p-3 bg-white rounded-2xl inline-block shadow-xl border border-white/20">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={qrUrl}
                            alt={`QR Code Wi-Fi ${net.ssid}`}
                            className="w-44 h-44 mx-auto rounded-lg"
                          />
                        </div>
                        <p className="text-[11px] text-purple-200">
                          📷 Arahkan kamera smartphone Android/iPhone Anda ke kode di atas untuk langsung terhubung tanpa mengetik password.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="pt-2 border-t border-white/10 text-right">
              <button
                type="button"
                onClick={() => setWifiModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold text-xs transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

