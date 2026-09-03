'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Camera, Image as ImageIcon, RotateCw, X, Check, AlertCircle, Loader2 } from 'lucide-react'
import { validateImageFile, compressImageFile } from '@/lib/geo'

interface CameraCaptureModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (file: File) => void
  title?: string
  loading?: boolean
}

export default function CameraCaptureModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Ambil Foto Absensi',
  loading = false,
}: CameraCaptureModalProps) {
  const [mode, setMode] = useState<'camera' | 'gallery'>('camera')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [galleryError, setGalleryError] = useState<string | null>(null)
  const [processingImage, setProcessingImage] = useState(false)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user')
  const [streamActive, setStreamActive] = useState(false)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Start camera stream
  const startCamera = async () => {
    stopCamera()
    setCameraError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
        setStreamActive(true)
      }
    } catch (err: any) {
      console.error('Camera access error:', err)
      setCameraError(
        'Tidak dapat mengakses kamera. Pastikan izin kamera telah diberikan di browser, atau gunakan opsi upload dari galeri.'
      )
      setStreamActive(false)
    }
  }

  // Stop camera stream
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach((track) => track.stop())
      videoRef.current.srcObject = null
      setStreamActive(false)
    }
  }

  useEffect(() => {
    if (isOpen && mode === 'camera' && !previewUrl) {
      startCamera()
    } else {
      stopCamera()
    }
    return () => {
      stopCamera()
    }
  }, [isOpen, mode, facingMode, previewUrl])

  // Capture photo from video stream
  const handleCapture = () => {
    setCameraError(null)
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current

    const width = video.videoWidth || 640
    const height = video.videoHeight || 480
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.drawImage(video, 0, 0, width, height)

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setCameraError('Gagal mengambil foto dari kamera. Silakan coba lagi.')
          return
        }
        const file = new File([blob], `absensi-${Date.now()}.jpg`, { type: 'image/jpeg' })
        setSelectedFile(file)
        setPreviewUrl(URL.createObjectURL(blob))
        stopCamera()
      },
      'image/jpeg',
      0.85
    )
  }

  // Handle gallery file selection with client-side compression
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setGalleryError(null)
    const file = e.target.files?.[0]
    if (!file) return

    const validation = validateImageFile(file)
    if (!validation.valid) {
      setGalleryError(validation.error || 'Format berkas tidak valid.')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    setProcessingImage(true)
    try {
      const compressed = await compressImageFile(file)
      setSelectedFile(compressed)
      setPreviewUrl(URL.createObjectURL(compressed))
    } catch (err: any) {
      console.error('Failed to compress image:', err)
      setGalleryError('Gagal memproses gambar. Silakan gunakan foto lain.')
    } finally {
      setProcessingImage(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Retake photo
  const handleRetake = () => {
    setPreviewUrl(null)
    setSelectedFile(null)
    setGalleryError(null)
    setCameraError(null)
    if (mode === 'camera') {
      startCamera()
    }
  }

  // Confirm photo selection — parent controls modal close after submit done
  const handleConfirm = () => {
    if (selectedFile && !loading) {
      onConfirm(selectedFile)
    }
  }

  const handleClose = () => {
    if (loading) return // Prevent closing while submitting
    stopCamera()
    setPreviewUrl(null)
    setSelectedFile(null)
    setGalleryError(null)
    setCameraError(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay">
      <div className="glass-card w-full max-w-lg overflow-hidden border border-indigo-500/20 shadow-2xl relative flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="font-semibold text-lg text-white flex items-center gap-2">
            <Camera className="w-5 h-5 text-indigo-400" />
            {title}
          </h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        {!previewUrl && (
          <div className="flex border-b border-white/10 p-2 gap-2 bg-black/20">
            <button
              onClick={() => {
                setMode('camera')
                setCameraError(null)
              }}
              className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition ${
                mode === 'camera'
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Camera className="w-4 h-4" />
              Kamera Perangkat
            </button>
            <button
              onClick={() => {
                setMode('gallery')
                stopCamera()
              }}
              className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition ${
                mode === 'gallery'
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <ImageIcon className="w-4 h-4" />
              Pilih dari Galeri
            </button>
          </div>
        )}

        {/* Content Area */}
        <div className="p-4 flex-1 flex flex-col items-center justify-center overflow-y-auto">
          {previewUrl ? (
            /* Preview Captured / Uploaded Image */
            <div className="w-full flex flex-col items-center">
              <div className="relative w-full max-w-sm rounded-2xl overflow-hidden border-2 border-indigo-500/50 shadow-xl bg-black">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full h-auto max-h-[380px] object-cover"
                />
                <div className="absolute top-2 right-2 bg-emerald-500/90 text-white text-xs px-2.5 py-1 rounded-full flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Siap Dikirim
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-3 text-center">
                Pastikan wajah terlihat jelas dan pencahayaan memadai sebelum konfirmasi.
              </p>
            </div>
          ) : mode === 'camera' ? (
            /* Camera Live View */
            <div className="w-full flex flex-col items-center">
              {cameraError ? (
                <div className="p-6 text-center text-red-300 bg-red-500/10 border border-red-500/20 rounded-2xl w-full">
                  <p className="text-sm mb-4">{cameraError}</p>
                  <button
                    onClick={() => setMode('gallery')}
                    className="btn-primary text-xs py-2 px-4"
                  >
                    Buka Galeri Sebagai Gantinya
                  </button>
                </div>
              ) : (
                <div className="relative w-full max-w-sm rounded-2xl overflow-hidden border border-white/10 bg-black aspect-[3/4] flex items-center justify-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <canvas ref={canvasRef} className="hidden" />

                  {/* Camera overlay switch */}
                  <button
                    onClick={() =>
                      setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'))
                    }
                    title="Putar Kamera"
                    className="absolute top-3 right-3 bg-black/60 hover:bg-black/80 text-white p-2.5 rounded-full backdrop-blur-md border border-white/20 transition"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Gallery File Input */
            <div className="w-full max-w-sm flex flex-col items-center gap-3">
              {galleryError && (
                <div className="w-full p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-start gap-2 text-xs text-rose-300 animate-fade-in">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{galleryError}</span>
                </div>
              )}

              <div className="w-full p-6 border-2 border-dashed border-white/20 rounded-2xl flex flex-col items-center justify-center gap-4 bg-white/5 hover:border-indigo-500/50 transition">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/jpg"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                  {processingImage ? (
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                  ) : (
                    <ImageIcon className="w-8 h-8" />
                  )}
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-white">
                    {processingImage ? 'Sedang Memproses Foto...' : 'Upload Foto Bukti'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {processingImage
                      ? 'Mengompres foto agar pengiriman cepat & hemat data'
                      : 'Mendukung format JPG, PNG, WEBP dari galeri perangkat'}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={processingImage}
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-primary text-xs py-2 px-5 disabled:opacity-50"
                >
                  {processingImage ? 'Memproses...' : 'Pilih Berkas Foto'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 border-t border-white/10 flex items-center justify-between gap-3 bg-black/40">
          {previewUrl ? (
            <>
              <button
                onClick={handleRetake}
                disabled={loading}
                className="btn-outline text-xs flex-1 py-3 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Foto Ulang
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="btn-primary text-xs flex-1 py-3 justify-center disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    Mengirim...
                  </span>
                ) : 'Gunakan Foto Ini'}
              </button>
            </>
          ) : mode === 'camera' && streamActive ? (
            <button
              onClick={handleCapture}
              className="w-full btn-primary py-3 justify-center text-sm font-bold flex items-center gap-2"
            >
              <Camera className="w-5 h-5" /> Ambil Foto Sekarang
            </button>
          ) : (
            <button
              onClick={handleClose}
              className="w-full btn-outline py-2.5 text-xs text-center"
            >
              Batal
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
