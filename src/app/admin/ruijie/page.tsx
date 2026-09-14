'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Radio,
  RefreshCw,
  Search,
  Download,
  Building2,
  AlertTriangle,
  Server,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Info,
  ShieldCheck,
  Activity,
  Zap,
  X,
  Send,
  Bell,
  Eye,
  EyeOff,
  QrCode,
  Key,
  ShieldAlert,
  MapPin,
  HelpCircle,
  Play,
  RotateCw,
  Filter,
  SlidersHorizontal,
  Table as TableIcon,
  LayoutGrid,
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface TanggamusHost {
  no: number;
  name: string;
  ip: string;
  category: string;
  status: 'UP' | 'DOWN' | 'PENDING';
  latency: number | null;
  lastCheck?: string;
  lastSeenUp?: string;
  downSince?: string | null;
  consecutiveDownCount: number;
  alertSent: boolean;
}

interface NetworkMonitoringSummary {
  total: number;
  online: number;
  down: number;
  avgLatency: number;
  healthScore: number;
}

interface DownHistoryEntry {
  id: string;
  no: number;
  name: string;
  ip: string;
  category: string;
  downAt: string;
  recoveredAt?: string | null;
  durationMinutes?: number | null;
}

interface WifiItem {
  id: string;
  ssid: string;
  password?: string;
  group_name: string;
  group_id?: number;
  encryption?: string;
  is_hide?: boolean;
}

export default function TanggamusNetworkMonitoringPage() {
  // Main State
  const [activeTab, setActiveTab] = useState<'hosts' | 'history' | 'telegram' | 'wifi'>('hosts');
  const [hosts, setHosts] = useState<TanggamusHost[]>([]);
  const [summary, setSummary] = useState<NetworkMonitoringSummary>({
    total: 69,
    online: 0,
    down: 0,
    avgLatency: 0,
    healthScore: 100,
  });
  const [downHistory, setDownHistory] = useState<DownHistoryEntry[]>([]);
  const [lastCheckAt, setLastCheckAt] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [pingingAll, setPingingAll] = useState<boolean>(false);
  const [pingProgress, setPingProgress] = useState<{ current: number; total: number; currentHost?: string }>({
    current: 0,
    total: 69,
  });
  const [pingingSingleIp, setPingingSingleIp] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UP' | 'DOWN'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Wi-Fi Tab State (282 SSIDs)
  const [wifiList, setWifiList] = useState<WifiItem[]>([]);
  const [wifiSearch, setWifiSearch] = useState<string>('');
  const [showWifiPasswords, setShowWifiPasswords] = useState<Record<string, boolean>>({});
  const [qrModalItem, setQrModalItem] = useState<WifiItem | null>(null);

  // Telegram Config State
  const [tgChatId, setTgChatId] = useState<string>('6555969768');
  const [tgBotToken, setTgBotToken] = useState<string>('8858219898:AAHgTA1ARc67k3A_0z9T85fgCHMqa2WXdCs');
  const [tgAlertEnabled, setTgAlertEnabled] = useState<boolean>(true);
  const [tgSendingTest, setTgSendingTest] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [copiedIp, setCopiedIp] = useState<string | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Fetch Host Status Data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/network/hosts');
      const json = await res.json();
      if (json.success && json.data) {
        setHosts(json.data.hosts || []);
        if (json.data.summary) {
          setSummary(json.data.summary);
        }
        if (json.data.down_history) {
          setDownHistory(json.data.down_history);
        }
        if (json.data.last_check_at) {
          setLastCheckAt(json.data.last_check_at);
        }
        if (json.data.telegram_config) {
          if (json.data.telegram_config.default_chat_id) {
            setTgChatId(json.data.telegram_config.default_chat_id);
          }
          if (json.data.telegram_config.alert_enabled !== undefined) {
            setTgAlertEnabled(json.data.telegram_config.alert_enabled);
          }
        }
      }
    } catch (err: any) {
      console.error('Fetch hosts error:', err);
      showToast('Gagal memuat data monitoring jaringan.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch Wi-Fi 282 SSIDs
  const fetchWifi = useCallback(async () => {
    try {
      const res = await fetch('/api/ruijie/wifi?limit=300');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setWifiList(json.data);
      }
    } catch (e) {
      console.error('Fetch Wi-Fi error:', e);
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchWifi();

    // Polling refresh setiap 30 detik
    const timer = setInterval(() => {
      if (!pingingAll) {
        fetchData();
      }
    }, 30000);

    return () => clearInterval(timer);
  }, [fetchData, fetchWifi, pingingAll]);

  // Handle Sequential Ping to All 69 Hosts
  const handlePingAll = async () => {
    if (pingingAll) return;
    try {
      setPingingAll(true);
      showToast('Memulai pengecekan ping berurutan ke 69 host Tanggamus...', 'info');

      // Simulasi progress step untuk UI responsiveness
      let step = 0;
      const total = hosts.length || 69;
      const progressInterval = setInterval(() => {
        step = Math.min(step + 1, total - 1);
        const currentHost = hosts[step]?.name || `Host #${step + 1}`;
        setPingProgress({ current: step + 1, total, currentHost });
      }, 250);

      const res = await fetch('/api/network/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true, sendAlerts: true }),
      });

      clearInterval(progressInterval);
      setPingProgress({ current: total, total });

      const json = await res.json();
      if (json.success && json.data) {
        setHosts(json.data.hosts || []);
        setSummary(json.data.summary);
        setDownHistory(json.data.down_history || []);
        setLastCheckAt(json.data.last_check_at);
        showToast(
          `Pengecekan selesai! 🟢 ${json.data.summary.online} Online, 🔴 ${json.data.summary.down} Down.`,
          'success'
        );
      } else {
        showToast(json.message || 'Gagal mengeping host.', 'error');
      }
    } catch (err: any) {
      showToast('Terjadi kesalahan saat ping jaringan: ' + err.message, 'error');
    } finally {
      setPingingAll(false);
    }
  };

  // Handle Single Ping per Host
  const handlePingSingle = async (ip: string, name: string) => {
    if (pingingSingleIp) return;
    try {
      setPingingSingleIp(ip);
      const res = await fetch('/api/network/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip, sendAlerts: true }),
      });

      const json = await res.json();
      if (json.success) {
        if (json.isOnline) {
          showToast(`🟢 ${name} (${ip}) ONLINE: ${json.latency} ms`, 'success');
        } else {
          showToast(`🔴 ${name} (${ip}) DOWN: Request Timed Out`, 'error');
        }

        // Update host di local state
        setHosts((prev) =>
          prev.map((h) => (h.ip === ip ? { ...h, status: json.isOnline ? 'UP' : 'DOWN', latency: json.latency } : h))
        );
        fetchData();
      }
    } catch (err: any) {
      showToast(`Gagal ping ${name}: ` + err.message, 'error');
    } finally {
      setPingingSingleIp(null);
    }
  };

  // Copy IP to Clipboard
  const handleCopyIp = (ip: string) => {
    navigator.clipboard.writeText(ip);
    setCopiedIp(ip);
    showToast(`IP ${ip} disalin ke clipboard`, 'info');
    setTimeout(() => setCopiedIp(null), 2000);
  };

  // Export to Excel
  const handleExportExcel = () => {
    const dataToExport = hosts.map((h) => ({
      'No': h.no,
      'Nama Tempat': h.name,
      'IP Address': h.ip,
      'Kategori': h.category,
      'Status': h.status === 'UP' ? 'ONLINE' : 'DOWN',
      'Latensi (ms)': h.latency !== null ? h.latency : 'Timeout',
      'Terakhir Cek': h.lastCheck ? new Date(h.lastCheck).toLocaleString('id-ID') : '-',
      'Durasi Padam': h.downSince ? `${Math.round((Date.now() - new Date(h.downSince).getTime()) / 60000)} menit` : '-',
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Monitoring 69 Host Tanggamus');
    XLSX.writeFile(wb, `Monitoring_Jaringan_Tanggamus_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showToast('Data monitoring berhasil diekspor ke Excel.', 'success');
  };

  // Send Test Telegram Alert
  const handleSendTestTelegram = async () => {
    try {
      setTgSendingTest(true);
      const res = await fetch('/api/admin/ruijie/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test_message',
          custom_message: `🔔 <b>TES MONITORING JARINGAN TANGGAMUS</b>\n\nSistem monitoring 69 host ONU Tanggamus terhubung normal.\n\n🟢 <b>Host Online:</b> ${summary.online}\n🔴 <b>Host Down:</b> ${summary.down}\n⚡ <b>Latensi:</b> ${summary.avgLatency} ms\n\n<i>Pesan uji coba berhasil terkirim!</i>`,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showToast('Pesan uji coba berhasil dikirim ke Telegram!', 'success');
      } else {
        showToast(json.message || 'Gagal mengirim pesan ke Telegram', 'error');
      }
    } catch (e: any) {
      showToast('Error koneksi: ' + e.message, 'error');
    } finally {
      setTgSendingTest(false);
    }
  };

  // Categories extraction
  const categories = useMemo(() => {
    const set = new Set<string>();
    hosts.forEach((h) => {
      if (h.category) set.add(h.category);
    });
    return Array.from(set).sort();
  }, [hosts]);

  // Filtered Hosts
  const filteredHosts = useMemo(() => {
    return hosts.filter((h) => {
      const matchSearch =
        h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        h.ip.includes(searchQuery) ||
        h.category.toLowerCase().includes(searchQuery.toLowerCase());

      const matchStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'UP' && h.status === 'UP') ||
        (statusFilter === 'DOWN' && h.status === 'DOWN');

      const matchCategory = categoryFilter === 'ALL' || h.category === categoryFilter;

      return matchSearch && matchStatus && matchCategory;
    });
  }, [hosts, searchQuery, statusFilter, categoryFilter]);

  // Filtered Wi-Fi List
  const filteredWifi = useMemo(() => {
    if (!wifiSearch) return wifiList;
    const q = wifiSearch.toLowerCase();
    return wifiList.filter(
      (w) =>
        (w.ssid && w.ssid.toLowerCase().includes(q)) ||
        (w.group_name && w.group_name.toLowerCase().includes(q)) ||
        (w.password && w.password.toLowerCase().includes(q))
    );
  }, [wifiList, wifiSearch]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 custom-scrollbar">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-5 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200'
              : toastMessage.type === 'error'
              ? 'bg-rose-950/90 border-rose-500/40 text-rose-200'
              : 'bg-indigo-950/90 border-indigo-500/40 text-indigo-200'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : toastMessage.type === 'error' ? (
            <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
          ) : (
            <Info className="w-5 h-5 text-indigo-400 shrink-0" />
          )}
          <span className="text-sm font-medium">{toastMessage.text}</span>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 via-sky-500 to-emerald-400 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.4)]">
              <Radio className="w-6 h-6 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                  Monitoring Jaringan Tanggamus
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  ICMP PING REALTIME
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  NOC TELEGRAM 24/7
                </span>
              </div>
              <p className="text-xs md:text-sm text-slate-400 mt-1">
                Sistem Pemantauan Status 69 Host ONU & Jaringan OPD Pemerintah Kabupaten Tanggamus
              </p>
            </div>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handlePingAll}
            disabled={pingingAll}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-semibold text-xs md:text-sm shadow-lg shadow-indigo-600/30 transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
          >
            {pingingAll ? (
              <RefreshCw className="w-4 h-4 animate-spin text-white" />
            ) : (
              <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
            )}
            <span>{pingingAll ? 'Mengeping 69 Host...' : 'Ping Semua Host Sekarang'}</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-xs md:text-sm font-medium transition-all active:scale-[0.98]"
            title="Ekspor ke Excel"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Ekspor Excel</span>
          </button>

          <button
            onClick={fetchData}
            disabled={loading || pingingAll}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-all active:scale-[0.98] disabled:opacity-50"
            title="Refresh Status"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* ACTIVE PING PROGRESS BANNER */}
      {pingingAll && (
        <div className="mt-4 p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 backdrop-blur-md animate-in fade-in slide-in-from-top-3">
          <div className="flex items-center justify-between text-xs md:text-sm mb-2">
            <span className="font-semibold text-indigo-300 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
              Memproses ICMP Ping Berurutan... ({pingProgress.current} dari {pingProgress.total} Host)
            </span>
            <span className="text-slate-400 font-mono">
              {Math.round((pingProgress.current / pingProgress.total) * 100)}%
            </span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-slate-900 overflow-hidden border border-white/5">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-400 transition-all duration-300 rounded-full"
              style={{ width: `${(pingProgress.current / pingProgress.total) * 100}%` }}
            />
          </div>
          {pingProgress.currentHost && (
            <p className="text-[11px] text-slate-400 mt-2">
              Target saat ini: <span className="text-slate-200 font-medium">{pingProgress.currentHost}</span>
            </p>
          )}
        </div>
      )}

      {/* METRICS & SUMMARY CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5 mt-6">
        {/* Card 1: Total Host */}
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Total Host</span>
            <Server className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-2 text-2xl md:text-3xl font-black tracking-tight text-white">
            {summary.total}
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">Lokasi ONU Terdaftar</span>
        </div>

        {/* Card 2: Host Online */}
        <div className="p-4 rounded-2xl bg-emerald-500/[0.05] border border-emerald-500/20 hover:border-emerald-500/40 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-400">Host Online</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-2 text-2xl md:text-3xl font-black tracking-tight text-emerald-400">
            {summary.online}
          </div>
          <span className="text-[10px] text-emerald-500/80 mt-1 block">
            {summary.total > 0 ? `${((summary.online / summary.total) * 100).toFixed(1)}% Terhubung` : '0%'}
          </span>
        </div>

        {/* Card 3: Host Down */}
        <div className="p-4 rounded-2xl bg-rose-500/[0.05] border border-rose-500/20 hover:border-rose-500/40 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-400">Host Down / Padam</span>
            <XCircle className="w-4 h-4 text-rose-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-2 text-2xl md:text-3xl font-black tracking-tight text-rose-400">
            {summary.down}
          </div>
          <span className="text-[10px] text-rose-400/80 mt-1 block">
            {summary.down > 0 ? 'Perlu tindakan teknisi' : 'Semua host normal'}
          </span>
        </div>

        {/* Card 4: Avg Latency */}
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Rata-rata Latensi</span>
            <Activity className="w-4 h-4 text-sky-400" />
          </div>
          <div className="mt-2 text-2xl md:text-3xl font-black tracking-tight text-sky-400">
            {summary.avgLatency} <span className="text-sm font-normal text-slate-400">ms</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">Kecepatan Respons ICMP</span>
        </div>

        {/* Card 5: Health Score */}
        <div className="col-span-2 md:col-span-1 p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Skor Kesehatan</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl md:text-3xl font-black tracking-tight text-white flex items-baseline gap-1">
            {summary.healthScore}
            <span className="text-sm text-slate-400">%</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">
            {lastCheckAt ? `Update: ${new Date(lastCheckAt).toLocaleTimeString('id-ID')}` : 'Siap cek'}
          </span>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex items-center gap-2 border-b border-white/10 mt-8 overflow-x-auto custom-scrollbar pb-1">
        <button
          onClick={() => setActiveTab('hosts')}
          className={`flex items-center gap-2 px-4 py-3 rounded-t-xl text-xs md:text-sm font-semibold transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'hosts'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]'
          }`}
        >
          <Server className="w-4 h-4" />
          <span>Daftar 69 Host Tanggamus</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/10 text-slate-300">
            {hosts.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-3 rounded-t-xl text-xs md:text-sm font-semibold transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'history'
              ? 'border-rose-500 text-rose-400 bg-rose-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Riwayat Gangguan & Log</span>
          {downHistory.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-500/20 text-rose-300 font-bold">
              {downHistory.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('telegram')}
          className={`flex items-center gap-2 px-4 py-3 rounded-t-xl text-xs md:text-sm font-semibold transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'telegram'
              ? 'border-sky-500 text-sky-400 bg-sky-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]'
          }`}
        >
          <Send className="w-4 h-4" />
          <span>Telegram NOC Bot</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        </button>

        <button
          onClick={() => setActiveTab('wifi')}
          className={`flex items-center gap-2 px-4 py-3 rounded-t-xl text-xs md:text-sm font-semibold transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'wifi'
              ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]'
          }`}
        >
          <QrCode className="w-4 h-4" />
          <span>Wi-Fi & QR Code Asli OPD</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300">
            {wifiList.length} SSID
          </span>
        </button>
      </div>

      {/* TAB 1: 69 HOST MONITORING */}
      {activeTab === 'hosts' && (
        <div className="mt-6 space-y-4">
          {/* Filter Bar */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col md:flex-row items-center justify-between gap-3">
            {/* Search Box */}
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama tempat atau IP..."
                className="w-full bg-slate-900 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs md:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto custom-scrollbar pb-1 md:pb-0">
              {/* Status Filter */}
              <div className="flex rounded-xl bg-slate-900 p-1 border border-white/5 shrink-0">
                <button
                  onClick={() => setStatusFilter('ALL')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    statusFilter === 'ALL' ? 'bg-white/10 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Semua ({hosts.length})
                </button>
                <button
                  onClick={() => setStatusFilter('UP')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                    statusFilter === 'UP'
                      ? 'bg-emerald-500/20 text-emerald-300 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Online ({summary.online})
                </button>
                <button
                  onClick={() => setStatusFilter('DOWN')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                    statusFilter === 'DOWN'
                      ? 'bg-rose-500/20 text-rose-300 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                  Down ({summary.down})
                </button>
              </div>

              {/* Category Dropdown */}
              <div className="relative shrink-0">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                >
                  <option value="ALL">Semua Kategori</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* View Mode Toggle */}
              <div className="hidden lg:flex items-center rounded-xl bg-slate-900 p-1 border border-white/5 shrink-0">
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-lg transition-all ${
                    viewMode === 'table' ? 'bg-white/10 text-white' : 'text-slate-400'
                  }`}
                  title="Tampilan Tabel"
                >
                  <TableIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('cards')}
                  className={`p-1.5 rounded-lg transition-all ${
                    viewMode === 'cards' ? 'bg-white/10 text-white' : 'text-slate-400'
                  }`}
                  title="Tampilan Grid Kartu"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* TABLE VIEW */}
          {viewMode === 'table' ? (
            <div className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 bg-slate-900/60 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                      <th className="py-3 px-4 w-12 text-center">No</th>
                      <th className="py-3 px-4">Nama Tempat / Host ONU</th>
                      <th className="py-3 px-4">Kategori</th>
                      <th className="py-3 px-4">IP Address</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-center">Latensi ICMP</th>
                      <th className="py-3 px-4">Terakhir Cek</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-xs">
                    {filteredHosts.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-500">
                          Tidak ditemukan host yang cocok dengan kriteria pencarian.
                        </td>
                      </tr>
                    ) : (
                      filteredHosts.map((h) => {
                        const isUp = h.status === 'UP';
                        const isPingingThis = pingingSingleIp === h.ip;

                        return (
                          <tr
                            key={h.ip}
                            className={`hover:bg-white/[0.02] transition-colors ${
                              !isUp ? 'bg-rose-500/[0.02]' : ''
                            }`}
                          >
                            <td className="py-3.5 px-4 text-center font-mono text-slate-500">{h.no}</td>
                            <td className="py-3.5 px-4">
                              <div className="font-semibold text-slate-200">{h.name}</div>
                              {h.downSince && (
                                <div className="text-[10px] text-rose-400 flex items-center gap-1 mt-0.5">
                                  <Clock className="w-3 h-3" />
                                  Padam sejak {new Date(h.downSince).toLocaleTimeString('id-ID')} (
                                  {Math.round((Date.now() - new Date(h.downSince).getTime()) / 60000)} menit)
                                </div>
                              )}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-white/5 text-slate-400 border border-white/5">
                                {h.category}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-1.5 font-mono text-slate-300">
                                <code>{h.ip}</code>
                                <button
                                  onClick={() => handleCopyIp(h.ip)}
                                  className="text-slate-500 hover:text-slate-300 transition-colors p-1"
                                  title="Salin IP"
                                >
                                  {copiedIp === h.ip ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              {isUp ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                  ONLINE
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                                  DOWN
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-center font-mono">
                              {isUp && h.latency !== null ? (
                                <div className="inline-flex items-center gap-1 text-slate-300">
                                  <span
                                    className={`font-semibold ${
                                      h.latency < 20
                                        ? 'text-emerald-400'
                                        : h.latency < 50
                                        ? 'text-amber-400'
                                        : 'text-rose-400'
                                    }`}
                                  >
                                    {h.latency}
                                  </span>
                                  <span className="text-[10px] text-slate-500">ms</span>
                                </div>
                              ) : (
                                <span className="text-[11px] text-slate-500 italic">Timeout</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                              {h.lastCheck ? new Date(h.lastCheck).toLocaleTimeString('id-ID') : '-'}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <button
                                onClick={() => handlePingSingle(h.ip, h.name)}
                                disabled={isPingingThis || pingingAll}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-xs font-medium transition-all active:scale-95 disabled:opacity-50"
                                title="Ping host ini sekarang"
                              >
                                {isPingingThis ? (
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                                ) : (
                                  <Play className="w-3 h-3 text-indigo-400 fill-indigo-400" />
                                )}
                                <span>Ping</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* CARD GRID VIEW */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredHosts.map((h) => {
                const isUp = h.status === 'UP';
                const isPingingThis = pingingSingleIp === h.ip;

                return (
                  <div
                    key={h.ip}
                    className={`p-4 rounded-2xl border transition-all ${
                      isUp
                        ? 'bg-white/[0.02] border-white/5 hover:border-white/15'
                        : 'bg-rose-500/[0.04] border-rose-500/20 hover:border-rose-500/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] text-slate-500 font-mono block">Host #{h.no}</span>
                        <h3 className="font-bold text-slate-200 text-sm mt-0.5">{h.name}</h3>
                      </div>
                      {isUp ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          ONLINE
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          DOWN
                        </span>
                      )}
                    </div>

                    <div className="mt-3 space-y-1.5 text-xs text-slate-400">
                      <div className="flex items-center justify-between">
                        <span>IP Address:</span>
                        <div className="flex items-center gap-1 font-mono text-slate-300">
                          <code>{h.ip}</code>
                          <button onClick={() => handleCopyIp(h.ip)} className="p-0.5 text-slate-500 hover:text-white">
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Kategori:</span>
                        <span className="text-slate-300">{h.category}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Latensi:</span>
                        <span className="font-mono text-slate-200">
                          {isUp && h.latency !== null ? `${h.latency} ms` : 'Request Timeout'}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-500">
                      <span>Cek: {h.lastCheck ? new Date(h.lastCheck).toLocaleTimeString('id-ID') : '-'}</span>
                      <button
                        onClick={() => handlePingSingle(h.ip, h.name)}
                        disabled={isPingingThis || pingingAll}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 font-medium transition-all"
                      >
                        {isPingingThis ? (
                          <RefreshCw className="w-3 h-3 animate-spin text-indigo-400" />
                        ) : (
                          <Play className="w-3 h-3 fill-indigo-400" />
                        )}
                        <span>Ping Host</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: RIWAYAT GANGGUAN & LOG DOWNTIME */}
      {activeTab === 'history' && (
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Log Riwayat Gangguan & Pemulihan Jaringan
            </h2>
            <span className="text-xs text-slate-400">Total {downHistory.length} Insiden Terdata</span>
          </div>

          {downHistory.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white/[0.02] border border-white/5">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
              <h3 className="font-bold text-slate-200">Belum Ada Riwayat Gangguan</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Semua host jaringan ONU Tanggamus beroperasi dengan baik tanpa insiden pemadaman.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 bg-slate-900/60 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                      <th className="py-3 px-4">Nama Tempat / Host</th>
                      <th className="py-3 px-4">IP Address</th>
                      <th className="py-3 px-4">Kategori</th>
                      <th className="py-3 px-4">Waktu Padam (Down)</th>
                      <th className="py-3 px-4">Waktu Pulih (Recovery)</th>
                      <th className="py-3 px-4">Durasi Padam</th>
                      <th className="py-3 px-4 text-center">Status Insiden</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-xs">
                    {downHistory.map((entry) => {
                      const isResolved = Boolean(entry.recoveredAt);
                      return (
                        <tr key={entry.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3.5 px-4 font-semibold text-slate-200">{entry.name}</td>
                          <td className="py-3.5 px-4 font-mono text-slate-300">
                            <code>{entry.ip}</code>
                          </td>
                          <td className="py-3.5 px-4 text-slate-400">{entry.category}</td>
                          <td className="py-3.5 px-4 text-rose-400 font-mono">
                            {new Date(entry.downAt).toLocaleString('id-ID')}
                          </td>
                          <td className="py-3.5 px-4 text-emerald-400 font-mono">
                            {entry.recoveredAt ? new Date(entry.recoveredAt).toLocaleString('id-ID') : '-'}
                          </td>
                          <td className="py-3.5 px-4 text-slate-300 font-medium">
                            {entry.durationMinutes ? `${entry.durationMinutes} Menit` : 'Sedang berlangsung'}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {isResolved ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                PULIH
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse">
                                SEDANG PADAM
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: TELEGRAM NOC BOT */}
      {activeTab === 'telegram' && (
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Settings & Test Alert */}
          <div className="lg:col-span-1 p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-200 text-sm">Konfigurasi Bot Telegram</h3>
                <span className="text-[11px] text-slate-400">@monitoring_tggms_bot</span>
              </div>
            </div>

            <div className="space-y-3 pt-2 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Target Chat ID Telegram:</label>
                <input
                  type="text"
                  value={tgChatId}
                  onChange={(e) => setTgChatId(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Bot Token:</label>
                <input
                  type="password"
                  value={tgBotToken}
                  readOnly
                  className="w-full bg-slate-900/60 border border-white/5 rounded-xl px-3 py-2 text-slate-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-slate-300">Kirim Otomatis Saat Down/Pulih:</span>
                <button
                  onClick={() => setTgAlertEnabled(!tgAlertEnabled)}
                  className={`w-11 h-6 rounded-full transition-colors relative ${
                    tgAlertEnabled ? 'bg-emerald-500' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`block w-5 h-5 rounded-full bg-white transition-transform absolute top-0.5 ${
                      tgAlertEnabled ? 'left-5' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>

              <button
                onClick={handleSendTestTelegram}
                disabled={tgSendingTest}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-semibold text-xs transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
              >
                {tgSendingTest ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <Send className="w-4 h-4 text-white" />
                )}
                <span>Kirim Pesan Tes ke Telegram</span>
              </button>
            </div>
          </div>

          {/* Bot Command Reference */}
          <div className="lg:col-span-2 p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4">
            <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-indigo-400" />
              Perintah Bot Telegram (@monitoring_tggms_bot)
            </h3>
            <p className="text-xs text-slate-400">
              Teknisi NOC dapat mengetik perintah berikut langsung di Telegram 24/7 untuk memantau jaringan tanpa membuka dashboard:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-900 border border-white/5">
                <div className="font-mono text-sky-400 font-bold">/status</div>
                <div className="text-slate-300 text-[11px] mt-1">
                  Menampilkan ringkasan live 69 host (Total, Online, Down, Latensi Rata-rata, Skor).
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900 border border-white/5">
                <div className="font-mono text-rose-400 font-bold">/offline</div>
                <div className="text-slate-300 text-[11px] mt-1">
                  Menampilkan daftar seluruh host ONU yang saat ini padam/down beserta durasi padamnya.
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900 border border-white/5">
                <div className="font-mono text-amber-400 font-bold">/ping [nama/ip]</div>
                <div className="text-slate-300 text-[11px] mt-1">
                  Ping instan ke satu host (misal: <code>/ping capil</code> atau <code>/ping 192.168.97.6</code>).
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900 border border-white/5">
                <div className="font-mono text-emerald-400 font-bold">/check</div>
                <div className="text-slate-300 text-[11px] mt-1">
                  Menjalankan pengecekan paksa ICMP ping berurutan ke 69 host saat itu juga.
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900 border border-white/5">
                <div className="font-mono text-indigo-400 font-bold">/hosts</div>
                <div className="text-slate-300 text-[11px] mt-1">
                  Daftar kategori dan seluruh 69 host yang terdaftar di sistem.
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900 border border-white/5">
                <div className="font-mono text-purple-400 font-bold">/wifi & /qrcode</div>
                <div className="text-slate-300 text-[11px] mt-1">
                  Cari password asli Wi-Fi OPD dan kirim QR Code scan instan.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: WI-FI & QR CODE OPD (282 SSIDs) */}
      {activeTab === 'wifi' && (
        <div className="mt-6 space-y-4">
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col md:flex-row items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-200 flex items-center gap-2">
                <QrCode className="w-5 h-5 text-emerald-400" />
                Daftar 282 Wi-Fi & Password Asli OPD Tanggamus
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Data SSID dan password riil yang diekstrak langsung dari jaringan Tanggamus, lengkap dengan QR Code siap pindai.
              </p>
            </div>

            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={wifiSearch}
                onChange={(e) => setWifiSearch(e.target.value)}
                placeholder="Cari SSID atau OPD..."
                className="w-full bg-slate-900 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs md:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 bg-slate-900/60 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                    <th className="py-3 px-4 w-12 text-center">No</th>
                    <th className="py-3 px-4">Nama Wi-Fi (SSID)</th>
                    <th className="py-3 px-4">Password Asli</th>
                    <th className="py-3 px-4">Lokasi / Instansi OPD</th>
                    <th className="py-3 px-4 text-center">Enkripsi</th>
                    <th className="py-3 px-4 text-right">QR Code</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs">
                  {filteredWifi.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500">
                        Tidak ditemukan Wi-Fi yang cocok.
                      </td>
                    </tr>
                  ) : (
                    filteredWifi.map((w, idx) => {
                      const showPwd = showWifiPasswords[w.id];
                      return (
                        <tr key={w.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 px-4 text-center font-mono text-slate-500">{idx + 1}</td>
                          <td className="py-3 px-4 font-bold text-slate-200">{w.ssid}</td>
                          <td className="py-3 px-4">
                            {w.password ? (
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-emerald-400 font-semibold">
                                  {showPwd ? w.password : '••••••••'}
                                </span>
                                <button
                                  onClick={() =>
                                    setShowWifiPasswords((prev) => ({ ...prev, [w.id]: !prev[w.id] }))
                                  }
                                  className="text-slate-500 hover:text-slate-300"
                                >
                                  {showPwd ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(w.password || '');
                                    showToast('Password disalin!', 'info');
                                  }}
                                  className="text-slate-500 hover:text-slate-300"
                                  title="Salin Password"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-slate-500 italic">Open (Tanpa Password)</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-300">{w.group_name}</td>
                          <td className="py-3 px-4 text-center text-slate-400">
                            <span className="px-2 py-0.5 rounded text-[10px] bg-white/5">
                              {w.encryption || 'WPA2-PSK'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => setQrModalItem(w)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs font-semibold transition-all"
                            >
                              <QrCode className="w-3.5 h-3.5" />
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
          </div>
        </div>
      )}

      {/* QR CODE MODAL POPUP */}
      {qrModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-white/10 rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl relative">
            <button
              onClick={() => setQrModalItem(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-3">
              <QrCode className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-white">{qrModalItem.ssid}</h3>
            <p className="text-xs text-slate-400 mt-0.5">{qrModalItem.group_name}</p>

            {/* QR Image */}
            <div className="mt-5 p-4 rounded-xl bg-white flex items-center justify-center mx-auto w-56 h-56 shadow-inner">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
                  `WIFI:T:${qrModalItem.password ? 'WPA' : 'nopass'};S:${qrModalItem.ssid};P:${
                    qrModalItem.password || ''
                  };;`
                )}`}
                alt={`QR Code ${qrModalItem.ssid}`}
                className="w-full h-full object-contain"
              />
            </div>

            <div className="mt-4 p-3 rounded-xl bg-white/[0.03] border border-white/5 text-xs text-left space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Password:</span>
                <span className="font-mono text-emerald-400 font-bold">
                  {qrModalItem.password || '(Tanpa Password)'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Keamanan:</span>
                <span className="text-slate-300">{qrModalItem.encryption || 'WPA2-PSK'}</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 mt-4">
              Arahkan kamera smartphone Android/iPhone untuk otomatis tersambung ke jaringan ini tanpa mengetik password.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
