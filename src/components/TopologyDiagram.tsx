'use client'

import React, { useState } from 'react'
import {
  Network,
  ShieldCheck,
  Wrench,
  Activity,
  ArrowDown,
  ArrowUpRight,
  Radio,
  Cable,
  AlertTriangle,
  CheckCircle2,
  Workflow,
  Sparkles,
  Users,
  Layers,
  ChevronRight,
} from 'lucide-react'

export default function TopologyDiagram() {
  const [activeTab, setActiveTab] = useState<'hierarchy' | 'sop'>('hierarchy')

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-950/80 via-slate-900 to-violet-950/80 p-6 border border-indigo-500/20 shadow-xl">
        <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold mb-2">
              <Network className="w-3.5 h-3.5" />
              <span>Struktur Tim & Topologi Kerja Teknis</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Topologi Jabatan & Tugas Pokok Fungsi (Tupoksi)
            </h2>
            <p className="text-xs sm:text-sm text-gray-400 mt-1 max-w-2xl">
              Diagram hierarki operasional, pembagian tanggung jawab, dan standar alur eskalasi penanganan gangguan jaringan di lingkungan PKL Kominfo Tanggamus.
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center p-1 bg-white/5 border border-white/10 rounded-xl self-start sm:self-auto">
            <button
              onClick={() => setActiveTab('hierarchy')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'hierarchy'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Diagram Struktur
            </button>
            <button
              onClick={() => setActiveTab('sop')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'sop'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Alur Eskalasi (SOP)
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'hierarchy' ? (
        /* ==================== HIERARCHY FLOWCHART ==================== */
        <div className="space-y-8">
          {/* LEVEL 1: POSISI PUNCAK (ATAS) */}
          <div className="flex flex-col items-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-[11px] font-bold uppercase tracking-wider mb-3">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span>Level 1 • Posisi Puncak (Penanggung Jawab)</span>
            </div>

            <div className="w-full max-w-2xl rounded-2xl bg-gradient-to-b from-indigo-950/60 to-slate-900/90 border-2 border-indigo-500/40 p-5 sm:p-6 shadow-2xl shadow-indigo-500/10 relative group hover:border-indigo-400 transition-all duration-300">
              <div className="absolute top-0 right-0 transform translate-x-2 -translate-y-2">
                <span className="flex h-4 w-4 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-indigo-500"></span>
                </span>
              </div>

              {/* Identity Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center text-white text-xl font-black shadow-lg shadow-indigo-500/30 flex-shrink-0">
                    👑
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg sm:text-xl font-black text-white">
                        Rafi Agil Kurniawan
                      </h3>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                        Tier-2 / Core Lead
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5 mt-0.5">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Penanggung Jawab Teknis</span>
                    </p>
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <span className="text-[11px] text-gray-400 block">Tingkat Penanganan</span>
                  <span className="text-xs font-bold text-amber-300">
                    Tingkat Lanjut (Advance / Core Escalation)
                  </span>
                </div>
              </div>

              {/* Tugas & Tanggung Jawab (Tupoksi) */}
              <div className="mt-4">
                <p className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Tugas & Tanggung Jawab Utama:</span>
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  {/* Tupoksi 1 */}
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:border-indigo-500/30 transition">
                    <div className="flex items-center gap-2 text-indigo-300 font-bold mb-1">
                      <Network className="w-4 h-4 flex-shrink-0 text-indigo-400" />
                      <span>Konfigurasi Jaringan Tingkat Lanjut</span>
                    </div>
                    <p className="text-[11px] text-gray-400 leading-relaxed">
                      Mengatur perangkat utama, routing, dan pengaturan sistem inti jaringan (core network switch, router, firewall, dan bandwidth management).
                    </p>
                  </div>

                  {/* Tupoksi 2 */}
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:border-indigo-500/30 transition">
                    <div className="flex items-center gap-2 text-indigo-300 font-bold mb-1">
                      <Activity className="w-4 h-4 flex-shrink-0 text-amber-400" />
                      <span>Penanganan Masalah Utama</span>
                    </div>
                    <p className="text-[11px] text-gray-400 leading-relaxed">
                      Menyelesaikan gangguan teknis yang kompleks pada jaringan pusat (core troubleshooting, loop detection, link failure, dan packet loss kritis).
                    </p>
                  </div>

                  {/* Tupoksi 3 */}
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:border-indigo-500/30 transition">
                    <div className="flex items-center gap-2 text-indigo-300 font-bold mb-1">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                      <span>Keluhan Prioritas Tinggi</span>
                    </div>
                    <p className="text-[11px] text-gray-400 leading-relaxed">
                      Mengambil alih laporan atau komplain kritis yang membutuhkan penanganan khusus dan supervisi langsung dari pengguna prioritas/instansi.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CONNECTOR LINE WITH ESCALATION BADGE */}
          <div className="flex flex-col items-center justify-center my-2">
            <div className="w-0.5 h-6 bg-gradient-to-b from-indigo-500 to-violet-500" />
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-indigo-500/30 shadow-md text-[10px] text-indigo-300 font-medium">
              <span className="flex items-center gap-1 text-emerald-400 font-bold">
                <ArrowDown className="w-3 h-3" /> Delegasi Tugas
              </span>
              <span className="text-gray-500">•</span>
              <span className="flex items-center gap-1 text-amber-400 font-bold">
                <ArrowUpRight className="w-3 h-3" /> Jalur Eskalasi Masalah
              </span>
            </div>
            <div className="w-0.5 h-6 bg-gradient-to-b from-violet-500 to-indigo-500" />
          </div>

          {/* LEVEL 2: TIM PELAKSANA (BAWAH) */}
          <div className="flex flex-col items-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/20 border border-violet-500/30 text-violet-300 text-[11px] font-bold uppercase tracking-wider mb-3">
              <Wrench className="w-3.5 h-3.5 text-violet-400" />
              <span>Level 2 • Tim Pelaksana Operasional (Garis Depan)</span>
            </div>

            <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Member 1: Tiyas */}
              <div className="rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-white/10 p-5 shadow-xl hover:border-violet-500/40 transition-all duration-300">
                <div className="flex items-center justify-between pb-3.5 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-violet-600/30 border border-violet-500/40 flex items-center justify-center text-white font-bold text-lg">
                      T
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-white">Tiyas</h4>
                      <p className="text-xs font-medium text-violet-300 flex items-center gap-1">
                        <Wrench className="w-3 h-3" />
                        <span>Teknisi PKL</span>
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-bold">
                    Tier-1 Responder
                  </span>
                </div>

                <div className="mt-3.5 space-y-2.5 text-xs">
                  <div className="flex items-start gap-2 text-gray-300">
                    <Radio className="w-3.5 h-3.5 text-violet-400 flex-shrink-0 mt-0.5" />
                    <span><b>Respons Cepat:</b> Menangani keluhan awal dan komunikasi ramah dengan pengguna.</span>
                  </div>
                  <div className="flex items-start gap-2 text-gray-300">
                    <Cable className="w-3.5 h-3.5 text-violet-400 flex-shrink-0 mt-0.5" />
                    <span><b>Pengecekan FO:</b> Pemeriksaan kabel optik, patch cord, dan nilai redaman dasar (dBm).</span>
                  </div>
                  <div className="flex items-start gap-2 text-gray-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-violet-400 flex-shrink-0 mt-0.5" />
                    <span><b>Pemeriksaan Awal:</b> Identifikasi perangkat sebelum eskalasi ke PJ Teknis bila rumit.</span>
                  </div>
                </div>
              </div>

              {/* Member 2: Silvi */}
              <div className="rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-white/10 p-5 shadow-xl hover:border-violet-500/40 transition-all duration-300">
                <div className="flex items-center justify-between pb-3.5 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-violet-600/30 border border-violet-500/40 flex items-center justify-center text-white font-bold text-lg">
                      S
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-white">Silvi</h4>
                      <p className="text-xs font-medium text-violet-300 flex items-center gap-1">
                        <Wrench className="w-3 h-3" />
                        <span>Teknisi PKL</span>
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-bold">
                    Tier-1 Responder
                  </span>
                </div>

                <div className="mt-3.5 space-y-2.5 text-xs">
                  <div className="flex items-start gap-2 text-gray-300">
                    <Radio className="w-3.5 h-3.5 text-violet-400 flex-shrink-0 mt-0.5" />
                    <span><b>Respons Cepat:</b> Tanggap pertama terhadap tiket gangguan dan kendala akses jaringan.</span>
                  </div>
                  <div className="flex items-start gap-2 text-gray-300">
                    <Cable className="w-3.5 h-3.5 text-violet-400 flex-shrink-0 mt-0.5" />
                    <span><b>Pengecekan FO:</b> Pengujian sambungan fisik optik dan stabilitas konektor jaringan.</span>
                  </div>
                  <div className="flex items-start gap-2 text-gray-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-violet-400 flex-shrink-0 mt-0.5" />
                    <span><b>Pemeriksaan Awal:</b> Uji ping/traceroute dan dokumentasi hasil pengecekan awal di lapangan.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Combined Team Responsibilities Summary */}
            <div className="w-full max-w-4xl mt-4 rounded-xl bg-white/[0.02] border border-white/5 p-4 text-xs">
              <p className="font-bold text-white mb-2 flex items-center gap-2">
                <Users className="w-4 h-4 text-violet-400" />
                <span>Rangkuman Tupoksi Bersama Teknisi PKL (Tiyas & Silvi):</span>
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] text-gray-400">
                <div className="p-2.5 rounded-lg bg-black/30 border border-white/5">
                  <span className="text-violet-300 font-bold block mb-1">1. Fast-Response Complaint</span>
                  Merespons laporan atau keluhan pertama dari pengguna/pelanggan jaringan secara cepat dan terarah.
                </div>
                <div className="p-2.5 rounded-lg bg-black/30 border border-white/5">
                  <span className="text-violet-300 font-bold block mb-1">2. Basic Fiber Checking</span>
                  Memeriksa kabel optik fisik, redaman sinyal dasar menggunakan OPM/VFL, dan kualitas sambungan.
                </div>
                <div className="p-2.5 rounded-lg bg-black/30 border border-white/5">
                  <span className="text-violet-300 font-bold block mb-1">3. Initial Troubleshooting</span>
                  Melakukan identifikasi dan eliminasi kendala awal sebelum diteruskan/diekskalasi ke Penanggung Jawab Teknis.
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ==================== SOP / ALUR KERJA ESKALASI ==================== */
        <div className="rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-white/10 p-6 shadow-xl space-y-6">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Workflow className="w-5 h-5 text-indigo-400" />
              <span>Standar Alur Penanganan Keluhan (SOP Eskalasi)</span>
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              Tata urutan kerja koordinasi teknis dari laporan pengguna hingga solusi tingkat lanjut.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
            {/* Step 1 */}
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 relative">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center text-xs mb-3">
                01
              </div>
              <h4 className="text-xs font-bold text-white mb-1">Laporan Keluhan Masuk</h4>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Pengguna/pelanggan melaporkan gangguan konektivitas (sinyal drop, LOS, atau sambungan putus).
              </p>
              <span className="inline-block mt-3 px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 text-[10px] font-semibold">
                Pintu Masuk
              </span>
            </div>

            {/* Step 2 */}
            <div className="p-4 rounded-xl bg-white/[0.03] border border-violet-500/30 relative">
              <div className="w-8 h-8 rounded-lg bg-violet-500/20 text-violet-400 font-bold flex items-center justify-center text-xs mb-3">
                02
              </div>
              <h4 className="text-xs font-bold text-white mb-1">Respons & Cek Awal</h4>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                <b>Tiyas & Silvi (Teknisi PKL)</b> melakukan fast-response, verifikasi kabel FO, dan pengecekan redaman dasar.
              </p>
              <span className="inline-block mt-3 px-2 py-0.5 rounded bg-violet-500/10 text-violet-300 text-[10px] font-semibold">
                Tier-1 Response
              </span>
            </div>

            {/* Step 3 */}
            <div className="p-4 rounded-xl bg-white/[0.03] border border-amber-500/30 relative">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-xs mb-3">
                03
              </div>
              <h4 className="text-xs font-bold text-white mb-1">Penyelesaian / Eskalasi</h4>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Jika masalah dasar: selesai di tempat. Jika kendala sistemik/core network: dilaporkan dan diekskalasi ke Level Atas.
              </p>
              <span className="inline-block mt-3 px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 text-[10px] font-semibold">
                Decision Point
              </span>
            </div>

            {/* Step 4 */}
            <div className="p-4 rounded-xl bg-white/[0.03] border border-indigo-500/40 relative">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 font-bold flex items-center justify-center text-xs mb-3">
                04
              </div>
              <h4 className="text-xs font-bold text-white mb-1">Solusi Core & Konfigurasi</h4>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                <b>Rafi Agil Kurniawan (PJ Teknis)</b> mengambil alih komplain prioritas, routing, konfigurasi core, dan verifikasi akhir.
              </p>
              <span className="inline-block mt-3 px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 text-[10px] font-semibold">
                Tier-2 Resolution
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
