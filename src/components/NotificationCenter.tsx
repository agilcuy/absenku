'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Bell, Check, CheckCheck, FileText, Clock, AlertTriangle, Info, X } from 'lucide-react'
import { Notification } from '@/types'
import { formatLastSeen } from '@/lib/utils'

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const dropdownRef = useRef<HTMLDivElement>(null)

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications')
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications || [])
        setUnreadCount(data.unreadCount || 0)
      }
    } catch (err) {
      // silent fail
    }
  }

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      })
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
        setUnreadCount(0)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleMarkRead = async (id: string, link?: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
      if (link) {
        window.location.href = link
      }
    } catch (err) {
      console.error(err)
    }
  }

  const filtered = notifications.filter((n) =>
    filter === 'unread' ? !n.is_read : true
  )

  const getIcon = (type: string) => {
    switch (type) {
      case 'permit':
        return <FileText className="w-4 h-4 text-blue-400" />
      case 'attendance':
        return <Clock className="w-4 h-4 text-emerald-400" />
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-400" />
      default:
        return <Info className="w-4 h-4 text-indigo-400" />
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-gray-300 hover:text-white hover:bg-white/5 transition border border-white/10"
        title="Pusat Notifikasi"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse shadow-lg">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-slate-900/95 border border-white/10 shadow-2xl backdrop-blur-xl z-50 overflow-hidden flex flex-col max-h-[480px] animate-fade-in-up">
          {/* Header */}
          <div className="p-3.5 border-b border-white/10 flex items-center justify-between bg-black/30">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-indigo-400" />
              <span className="font-semibold text-sm text-white">Notifikasi</span>
              {unreadCount > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 font-semibold border border-rose-500/30">
                  {unreadCount} Baru
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
              >
                <CheckCheck className="w-3.5 h-3.5" /> Tandai Semua
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex border-b border-white/10 p-1.5 gap-1 bg-black/20 text-xs">
            <button
              onClick={() => setFilter('all')}
              className={`flex-1 py-1.5 rounded-lg font-medium transition ${
                filter === 'all'
                  ? 'bg-indigo-600/80 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Semua ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`flex-1 py-1.5 rounded-lg font-medium transition ${
                filter === 'unread'
                  ? 'bg-indigo-600/80 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Belum Dibaca ({unreadCount})
            </button>
          </div>

          {/* Notification List */}
          <div className="overflow-y-auto flex-1 divide-y divide-white/5">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-xs flex flex-col items-center gap-2">
                <Bell className="w-8 h-8 opacity-20" />
                <span>Tidak ada notifikasi {filter === 'unread' ? 'baru' : ''}</span>
              </div>
            ) : (
              filtered.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleMarkRead(n.id, n.link)}
                  className={`p-3.5 hover:bg-white/5 cursor-pointer transition flex items-start gap-3 ${
                    !n.is_read ? 'bg-indigo-500/5' : ''
                  }`}
                >
                  <div className="p-2 rounded-xl bg-white/5 border border-white/10 flex-shrink-0 mt-0.5">
                    {getIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <p className={`text-xs font-semibold truncate ${!n.is_read ? 'text-white' : 'text-gray-300'}`}>
                        {n.title}
                      </p>
                      {!n.is_read && (
                        <span className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-gray-400 line-clamp-2 leading-relaxed">
                      {n.message}
                    </p>
                    <span className="text-[10px] text-gray-500 mt-1 block">
                      {formatLastSeen(n.created_at)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
