
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
  Play,
  Filter,
  Table as TableIcon,
  LayoutGrid,
  Network,
  HelpCircle,
  Layers,
  ArrowUpRight,
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

export default function TanggamusIpMonitoringPage() {
  // Main State
  const [activeTab, setActiveTab] = useState<'hosts' | 'history' | 'subnet' | 'telegram'>('hosts');
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
      showToast('Gagal memuat data monitoring IP jaringan.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Polling refresh data setiap 30 detik
    const timer = setInterval(() => {
      if (!pingingAll) {
        fetchData();
      }
    }, 30000);

    return () => clearInterval(timer);
  }, [fetchData, pingingAll]);

  // Handle Sequential Ping to All 69 Hosts
  const handlePingAll = async () => {
    if (pingingAll) return;
    try {
      setPingingAll(true);
      showToast('Memulai pengecekan ping berurutan ke 69 host Tanggamus...', 'info');

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
      'Nama Tempat / Host': h.name,
      'IP Address': h.ip,
      'Kategori': h.category,
      'Status': h.status === 'UP' ? 'ONLINE' : 'DOWN',
      'Latensi ICMP (ms)': h.latency !== null ? h.latency : 'Timeout',
      'Terakhir Dicek': h.lastCheck ? new Date(h.lastCheck).toLocaleString('id-ID') : '-',
      'Durasi Padam': h.downSince ? `${Math.round((Date.now() - new Date(h.downSince).getTime()) / 60000)} menit` : '-',
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Monitoring 69 IP Tanggamus');
    XLSX.writeFile(wb, `Monitoring_IP_Tanggamus_${new Date().toISOString().slice(0, 10)}.xlsx`);
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
          custom_message: `🔔 <b>TES MONITORING IP JARINGAN TANGGAMUS</b>\n\nSistem monitoring 69 host ONU Tanggamus terhubung normal.\n\n🟢 <b>Host Online:</b> ${summary.online}\n🔴 <b>Host Down:</b> ${summary.down}\n⚡ <b>Latensi:</b> ${summary.avgLatency} ms\n\n<i>Pesan uji coba berhasil terkirim!</i>`,
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
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-sky-500 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.4)]">
              <Radio className="w-6 h-6 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                  Monitoring IP Jaringan Tanggamus
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  ICMP PING REALTIME
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/30">
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
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs md:text-sm shadow-lg shadow-emerald-600/30 transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
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
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* ACTIVE PING PROGRESS BANNER */}
      {pingingAll && (
        <div className="mt-4 p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 backdrop-blur-md animate-in fade-in slide-in-from-top-3">
          <div className="flex items-center justify-between text-xs md:text-sm mb-2">
            <span className="font-semibold text-emerald-300 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
              Memproses ICMP Ping Berurutan... ({pingProgress.current} dari {pingProgress.total} Host)
            </span>
            <span className="text-slate-400 font-mono">
              {Math.round((pingProgress.current / pingProgress.total) * 100)}%
            </span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-slate-900 overflow-hidden border border-white/5">
            <div
              className="h-full bg-gradient-to-r from-teal-500 via-emerald-400 to-sky-400 transition-all duration-300 rounded-full"
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
            <Server className="w-4 h-4 text-teal-400" />
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
              ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
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
          onClick={() => setActiveTab('subnet')}
          className={`flex items-center gap-2 px-4 py-3 rounded-t-xl text-xs md:text-sm font-semibold transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'subnet'
              ? 'border-teal-500 text-teal-400 bg-teal-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]'
          }`}
        >
          <Network className="w-4 h-4" />
          <span>Alokasi IP & Subnet (192.168.97.x)</span>
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
                className="w-full bg-slate-900 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs md:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all"
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
                  className="bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
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
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                                ) : (
                                  <Play className="w-3 h-3 text-emerald-400 fill-emerald-400" />
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
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 font-medium transition-all"
                      >
                        {isPingingThis ? (
                          <RefreshCw className="w-3 h-3 animate-spin text-emerald-400" />
                        ) : (
                          <Play className="w-3 h-3 fill-emerald-400" />
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

      {/* TAB 3: ALOKASI IP & SUBNET (192.168.97.x) */}
      {activeTab === 'subnet' && (
        <div className="mt-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-200 flex items-center gap-2">
                <Network className="w-5 h-5 text-teal-400" />
                Pemetaan Alokasi Subnet IP 192.168.97.0/24
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Struktur blok alamat IP jaringan ONU Pemerintah Kabupaten Tanggamus berdasarkan kelompok dan fungsi.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Blok 1 */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-teal-500/30 transition-all">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-500/20 text-teal-300">
                  BLOK 1 (OPD & Sekda)
                </span>
                <span className="font-mono text-xs text-slate-400">.2 s/d .30</span>
              </div>
              <h3 className="font-bold text-slate-200 text-sm mt-3">Kantor Dinas & Sekretariat</h3>
              <p className="text-xs text-slate-400 mt-1">
                Meliputi ONU Capil, Perikanan, PUPR, Pemadam, Pendidikan, Sekda Tanggamus (1-4), Rupatama, dan ULP.
              </p>
              <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-slate-500 font-mono">
                <span>Total: 29 Host</span>
                <span className="text-emerald-400">Prioritas Tinggi</span>
              </div>
            </div>

            {/* Blok 2 */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-teal-500/30 transition-all">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-300">
                  BLOK 2 (Dinas & Dewan)
                </span>
                <span className="font-mono text-xs text-slate-400">.66 s/d .80</span>
              </div>
              <h3 className="font-bold text-slate-200 text-sm mt-3">Keuangan, DPRD & Rumdis</h3>
              <p className="text-xs text-slate-400 mt-1">
                Meliputi Bapenda, Sekwan DPRD, Dinkes, Disnaker, Pol PP, Keuangan (Backup & RO), Rumdis BUP, Rumdis Dewan.
              </p>
              <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-slate-500 font-mono">
                <span>Total: 15 Host</span>
                <span className="text-emerald-400">Prioritas Tinggi</span>
              </div>
            </div>

            {/* Blok 3 */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-teal-500/30 transition-all">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300">
                  BLOK 3 (Kec & Puskesmas)
                </span>
                <span className="font-mono text-xs text-slate-400">.82 s/d .103</span>
              </div>
              <h3 className="font-bold text-slate-200 text-sm mt-3">Kecamatan, RSUD & Kelurahan</h3>
              <p className="text-xs text-slate-400 mt-1">
                Meliputi Kota Agung Timur, KOPUS, RSUD BM, Puskesmas Pasar Simpang, Kuripan, Baros, Pasar Madang, Pos Damkar.
              </p>
              <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-slate-500 font-mono">
                <span>Total: 22 Host</span>
                <span className="text-emerald-400">Layanan Publik</span>
              </div>
            </div>

            {/* Blok 4 */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-teal-500/30 transition-all">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300">
                  BLOK 4 (Publik & Wisata)
                </span>
                <span className="font-mono text-xs text-slate-400">.142 s/d .154</span>
              </div>
              <h3 className="font-bold text-slate-200 text-sm mt-3">Wabup, Dispora & Rest Area</h3>
              <p className="text-xs text-slate-400 mt-1">
                Meliputi ONU Wabup (192.168.97.142), ONU Dispora (192.168.97.146), dan ONU Rest Area (192.168.97.154).
              </p>
              <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-slate-500 font-mono">
                <span>Total: 3 Host</span>
                <span className="text-emerald-400">Wisata & Publik</span>
              </div>
            </div>
          </div>

          {/* Subnet Quick IP Grid */}
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5">
            <h3 className="text-sm font-bold text-slate-200 mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              Tampilan Status Matriks IP 192.168.97.x
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {hosts.map((h) => {
                const isUp = h.status === 'UP';
                return (
                  <div
                    key={h.ip}
                    className={`p-2.5 rounded-xl border flex flex-col justify-between transition-all ${
                      isUp
                        ? 'bg-emerald-500/[0.03] border-emerald-500/20 hover:border-emerald-500/40'
                        : 'bg-rose-500/[0.04] border-rose-500/20 hover:border-rose-500/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] font-bold text-slate-300">{h.ip.replace('192.168.97.', '.')}</span>
                      <span className={`w-2 h-2 rounded-full ${isUp ? 'bg-emerald-400' : 'bg-rose-400 animate-pulse'}`} />
                    </div>
                    <div className="text-[11px] text-slate-300 font-medium truncate mt-1" title={h.name}>
                      {h.name}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1 font-mono">
                      {isUp && h.latency !== null ? `${h.latency}ms` : 'Down'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: TELEGRAM NOC BOT */}
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
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-emerald-600 hover:from-sky-500 hover:to-emerald-500 text-white font-semibold text-xs transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
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
              <HelpCircle className="w-4 h-4 text-emerald-400" />
              Perintah Bot Telegram (@monitoring_tggms_bot)
            </h3>
            <p className="text-xs text-slate-400">
              Teknisi NOC dapat mengetik perintah berikut langsung di Telegram 24/7 untuk memantau jaringan tanpa membuka dashboard:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-900 border border-white/5">
                <div className="font-mono text-sky-400 font-bold">/status</div>
                <div className="text-slate-300 text-[11px] mt-1">
                  Menampilkan ringkasan live 69 host (Total, Online, Down, Latensi Rata-rata, Skor Kesehatan).
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
                <div className="font-mono text-teal-400 font-bold">/hosts</div>
                <div className="text-slate-300 text-[11px] mt-1">
                  Daftar kategori dan seluruh 69 host yang terdaftar di sistem.
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900 border border-white/5">
                <div className="font-mono text-purple-400 font-bold">/daftargrup</div>
                <div className="text-slate-300 text-[11px] mt-1">
                  Mendaftarkan chat/grup ini sebagai target penerima notifikasi otomatis 24/7.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
