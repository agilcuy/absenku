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
  localIp: string;
  cpeIp: string;
  mac: string;
  hardwareVersion?: string;
  softwareVersion?: string;
  lastOnline?: number;
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

  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'OFF' | 'ON'>('OFF'); // Default to OFF to highlight problems
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const fetchData = useCallback(
    async (isManualRefresh = false) => {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);
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
      } catch (err: any) {
        console.error('Error fetching Ruijie devices:', err);
        setError(err.message || 'Terjadi kesalahan saat memuat data Ruijie Cloud');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  // Initial load
  useEffect(() => {
    fetchData(false);
  }, [fetchData]);

  // Auto-refresh timer every 60 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchData(true);
    }, 60000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

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

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [statusFilter, searchQuery, selectedNetwork, selectedType]);

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

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/50 to-slate-900 border border-white/10 p-6 shadow-xl">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Radio className="w-5 h-5 animate-pulse text-indigo-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
                  Ruijie Cloud Live Monitoring
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    Live Cloud Sync
                  </span>
                </h1>
                <p className="text-sm text-slate-400 mt-0.5">
                  Pemantauan real-time 320+ Access Point & Router se-Kabupaten Tanggamus
                </p>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center flex-wrap gap-2.5">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-3 py-2 text-xs font-medium rounded-xl border transition-all flex items-center gap-1.5 ${
                autoRefresh
                  ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Auto-Refresh (60s): <span className="font-bold">{autoRefresh ? 'AKTIF' : 'NONAKTIF'}</span>
            </button>

            <button
              onClick={() => fetchData(true)}
              disabled={refreshing || loading}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white shadow-lg shadow-indigo-600/25 flex items-center gap-2 transition-all active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh Sekarang
            </button>

            <button
              onClick={handleExportExcel}
              disabled={filteredDevices.length === 0}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600/90 hover:bg-emerald-600 disabled:opacity-50 text-white shadow-lg shadow-emerald-600/25 flex items-center gap-2 transition-all active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              Export Excel
            </button>
          </div>
        </div>

        {summary.lastChecked && (
          <div className="mt-4 pt-3 border-t border-white/5 text-xs text-slate-400 flex items-center gap-1.5">
            <span>Pemeriksaan terakhir:</span>
            <span className="text-slate-300 font-mono">
              {new Date(summary.lastChecked).toLocaleTimeString('id-ID')} WIB
            </span>
          </div>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">Gagal Menghubungi Ruijie Cloud</div>
            <div className="text-xs text-rose-400/90 mt-1">{error}</div>
          </div>
        </div>
      )}

      {/* Stats Cards (4 Columns) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Devices */}
        <div className="bg-[#0a0d17] border border-white/5 rounded-2xl p-5 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Perangkat</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Server className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white tracking-tight">
              {loading ? '...' : summary.total}
            </span>
            <span className="text-xs text-slate-400">Unit</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Terpasang di seluruh OPD</p>
        </div>

        {/* Online Devices */}
        <div
          onClick={() => setStatusFilter('ON')}
          className={`cursor-pointer bg-[#0a0d17] border rounded-2xl p-5 relative overflow-hidden transition-all shadow-lg ${
            statusFilter === 'ON' ? 'border-emerald-500/50 bg-emerald-950/20' : 'border-white/5 hover:border-emerald-500/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Online Normal</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Wifi className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-emerald-400 tracking-tight">
              {loading ? '...' : summary.online}
            </span>
            <span className="text-xs text-emerald-400/70 font-medium">
              ({summary.total ? Math.round((summary.online / summary.total) * 100) : 0}%)
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Beroperasi lancar</p>
        </div>

        {/* Offline Devices */}
        <div
          onClick={() => setStatusFilter('OFF')}
          className={`cursor-pointer bg-[#0a0d17] border rounded-2xl p-5 relative overflow-hidden transition-all shadow-lg ${
            statusFilter === 'OFF' ? 'border-rose-500/50 bg-rose-950/20 ring-1 ring-rose-500/30' : 'border-white/5 hover:border-rose-500/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider">Perangkat Offline</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <WifiOff className="w-4 h-4 text-rose-400" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-rose-400 tracking-tight">
              {loading ? '...' : summary.offline}
            </span>
            <span className="text-xs text-rose-400/80 font-medium">Perlu Cek</span>
          </div>
          <p className="text-xs text-rose-400/60 mt-1">Mati / terputus koneksi</p>
        </div>

        {/* Total Networks */}
        <div className="bg-[#0a0d17] border border-white/5 rounded-2xl p-5 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Titik Lokasi</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white tracking-tight">
              {loading ? '...' : summary.totalNetworks}
            </span>
            <span className="text-xs text-slate-400">Jaringan</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Kecamatan & Puskesmas</p>
        </div>
      </div>

      {/* Critical Offline Notice if any */}
      {summary.offline > 0 && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-rose-950/40 via-rose-900/20 to-transparent border border-rose-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            </div>
            <div>
              <span className="text-sm font-semibold text-rose-200">
                Peringatan: Terdapat {summary.offline} Perangkat Jaringan yang OFFLINE
              </span>
              <p className="text-xs text-rose-300/80">
                Periksa kabel LAN, adaptor daya PoE, atau koneksi ISP pada lokasi yang terdampak di bawah ini.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setStatusFilter('OFF');
              setSelectedNetwork('');
              setSearchQuery('');
            }}
            className="text-xs font-semibold text-rose-300 hover:text-white px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 transition-all shrink-0"
          >
            Fokus Perangkat Offline &rarr;
          </button>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-[#0a0d17] border border-white/5 rounded-2xl p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama perangkat, IP, MAC, Model, atau Lokasi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex p-1 bg-white/5 rounded-xl border border-white/10 shrink-0">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                statusFilter === 'all'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Semua ({summary.total})
            </button>
            <button
              onClick={() => setStatusFilter('OFF')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                statusFilter === 'OFF'
                  ? 'bg-rose-600 text-white shadow'
                  : 'text-rose-400 hover:text-rose-300'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-400" />
              Offline ({summary.offline})
            </button>
            <button
              onClick={() => setStatusFilter('ON')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                statusFilter === 'ON'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-emerald-400 hover:text-emerald-300'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Online ({summary.online})
            </button>
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

      {/* Devices Table / List */}
      <div className="bg-[#0a0d17] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
        {/* Table Header / Summary count */}
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <div className="text-sm font-semibold text-white flex items-center gap-2">
            <span>Daftar Perangkat</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-slate-300 font-mono">
              Menampilkan {filteredDevices.length} dari {summary.total} alat
            </span>
          </div>
          {filteredDevices.length > 0 && (
            <div className="text-xs text-slate-400 font-medium">
              Halaman {page} dari {totalPages}
            </div>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-500 mb-3" />
            <p className="text-sm font-medium text-white">Memuat data dari Ruijie Cloud...</p>
            <p className="text-xs text-slate-500 mt-1">Mengambil status sinkronisasi 320+ alat</p>
          </div>
        ) : filteredDevices.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-400">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mb-3" />
            <p className="text-base font-semibold text-white">Tidak ada perangkat yang cocok</p>
            <p className="text-xs text-slate-500 mt-1">
              {statusFilter === 'OFF'
                ? 'Luar biasa! Tidak ada perangkat offline pada kriteria filter ini.'
                : 'Coba ubah kata kunci atau reset filter pencarian.'}
            </p>
          </div>
        ) : (
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
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm text-slate-300">
                {paginatedDevices.map((dev) => {
                  const isOnline = dev.onlineStatus === 'ON';
                  return (
                    <tr
                      key={dev.serialNumber}
                      className="hover:bg-white/[0.02] transition-colors group"
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
                        <div className="font-medium text-white group-hover:text-indigo-400 transition-colors">
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

                      {/* IP Addresses */}
                      <td className="py-3.5 px-4">
                        <div className="text-xs font-mono text-slate-300">
                          {dev.localIp || '-'}
                        </div>
                        {dev.cpeIp && (
                          <div className="text-[11px] font-mono text-slate-500">
                            Publik: {dev.cpeIp}
                          </div>
                        )}
                      </td>

                      {/* MAC Address */}
                      <td className="py-3.5 px-4">
                        <span className="text-xs font-mono text-slate-400">
                          {dev.mac || '-'}
                        </span>
                      </td>

                      {/* Last Seen */}
                      <td className="py-3.5 px-6 whitespace-nowrap">
                        <span className="text-xs text-slate-400">
                          {formatLastSeen(dev.lastOnline)}
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
          <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between">
            <div className="text-xs text-slate-400">
              Menampilkan {(page - 1) * pageSize + 1} -{' '}
              {Math.min(page * pageSize, filteredDevices.length)} dari {filteredDevices.length} perangkat
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 text-white border border-white/10 transition-colors"
              >
                Sebelumnya
              </button>
              <span className="text-xs font-medium text-slate-300 px-2">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 text-white border border-white/10 transition-colors"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
