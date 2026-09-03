'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { ShieldAlert, Clock, User, Eye, X, RefreshCw } from 'lucide-react'
import { formatDate, formatTime } from '@/lib/utils'
import { useToast } from '@/components/Toast'

export default function AdminAuditPage() {
  const { showToast } = useToast()
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedLog, setSelectedLog] = useState<any>(null)

  const loadLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/audit-logs')
      if (res.ok) {
        const json = await res.json()
        setLogs(json.logs || [])
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadLogs()
  }, [loadLogs])

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadLogs()
    showToast('Data audit log berhasil diperbarui!', 'success')
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-indigo-400" />
            Audit Log Aktivitas Superadmin
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Rekaman jejak digital setiap perubahan data, penambahan manual, maupun penghapusan oleh admin
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="btn-outline text-xs py-2.5 px-3.5 flex items-center gap-1.5 border-white/10 hover:border-indigo-500/40 self-start sm:self-auto"
          title="Perbarui data audit log"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-indigo-400' : 'text-gray-400'}`} />
          <span>{refreshing ? 'Memperbarui...' : 'Perbarui'}</span>
        </button>
      </div>

      {/* Audit Log Table */}
      <div className="glass-card border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Waktu (WIB)</th>
                <th>Pelaksana (Admin)</th>
                <th>Aksi</th>
                <th>Tabel</th>
                <th className="text-right">Detail Perubahan</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-xs text-gray-500">
                    Memuat catatan audit...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-xs text-gray-500">
                    Belum ada riwayat aktivitas yang tercatat.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <div className="text-xs">
                        <p className="font-semibold text-white">{formatDate(log.created_at)}</p>
                        <p className="text-[11px] text-gray-400">{formatTime(log.created_at)}</p>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2 text-xs">
                        <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-[10px]">
                          A
                        </div>
                        <span className="font-medium text-white">{log.actor_name || 'Superadmin'}</span>
                      </div>
                    </td>
                    <td>
                      <span className="badge bg-indigo-500/10 text-indigo-400 border-indigo-500/20 text-[10px] font-mono">
                        {log.action}
                      </span>
                    </td>
                    <td>
                      <span className="text-xs font-mono text-gray-400">{log.table_name}</span>
                    </td>
                    <td className="text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="btn-outline text-[11px] py-1 px-2.5 inline-flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Lihat Data</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAIL JSON MODAL */}
      {selectedLog && (
        <div className="modal-overlay">
          <div className="glass-card p-6 w-full max-w-lg border border-white/10 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div>
                <h3 className="font-bold text-white text-sm">
                  Detail Audit: {selectedLog.action}
                </h3>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {formatDate(selectedLog.created_at)} · {formatTime(selectedLog.created_at)}
                </p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 text-xs">
              {/* Old Data */}
              <div>
                <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block mb-1">
                  Nilai Sebelum (Old Data)
                </span>
                <pre className="p-3 rounded-xl bg-black/60 border border-white/5 text-[11px] font-mono text-rose-300 overflow-x-auto">
                  {selectedLog.old_data
                    ? JSON.stringify(selectedLog.old_data, null, 2)
                    : 'Tidak ada data sebelum (Data Baru)'}
                </pre>
              </div>

              {/* New Data */}
              <div>
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block mb-1">
                  Nilai Sesudah (New Data)
                </span>
                <pre className="p-3 rounded-xl bg-black/60 border border-white/5 text-[11px] font-mono text-emerald-300 overflow-x-auto">
                  {selectedLog.new_data
                    ? JSON.stringify(selectedLog.new_data, null, 2)
                    : 'Tidak ada data sesudah (Data Dihapus)'}
                </pre>
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 mt-3 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="btn-outline text-xs py-1.5 px-4"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
