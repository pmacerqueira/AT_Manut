/**
 * InstallPrompt — Convida o utilizador a adicionar a app ao ecrã inicial / desktop.
 * Mostra uma vez após login; não volta a aparecer se o utilizador dispensar ou instalar.
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { X, Smartphone, Monitor } from 'lucide-react'
import { useToast } from './Toast'
import './InstallPrompt.css'

const STORAGE_KEY_DISMISSED = 'atm_install_dismissed'
const STORAGE_KEY_DONE = 'atm_install_done'

function isStandalone() {
  if (typeof window === 'undefined') return true
  return window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true
    || document.referrer.includes('android-app://')
}

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

function isAndroid() {
  return /Android/.test(navigator.userAgent)
}

export default function InstallPrompt() {
  const { showToast } = useToast()
  const [visible, setVisible] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [platform, setPlatform] = useState(null)
  const hasNativePrompt = useRef(false)

  const dismiss = useCallback((permanent = true) => {
    setVisible(false)
    if (permanent) {
      try {
        localStorage.setItem(STORAGE_KEY_DISMISSED, Date.now().toString())
      } catch {}
    }
  }, [])

  const markInstalled = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY_DONE, '1')
    } catch {}
    setVisible(false)
    showToast('Aplicação adicionada com sucesso.', 'success')
  }, [showToast])

  const handleInstall = useCallback(async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        markInstalled()
      }
      setDeferredPrompt(null)
    } else {
      dismiss(true)
    }
  }, [deferredPrompt, markInstalled, dismiss])

  useEffect(() => {
    if (isStandalone()) return
    try {
      if (localStorage.getItem(STORAGE_KEY_DISMISSED) || localStorage.getItem(STORAGE_KEY_DONE)) return
    } catch { return }

    const handleBeforeInstall = (e) => {
      e.preventDefault()
      hasNativePrompt.current = true
      setDeferredPrompt(e)
      setPlatform('chrome')
      setVisible(true)
    }

    const handleAppInstalled = () => {
      markInstalled()
    }

    if ('onbeforeinstallprompt' in window) {
      window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    }

    window.addEventListener('appinstalled', handleAppInstalled)

    const timer = setTimeout(() => {
      if (!hasNativePrompt.current) {
        if (isIOS()) {
          setPlatform('ios')
          setVisible(true)
        } else if (isAndroid()) {
          setPlatform('android')
          setVisible(true)
        }
        // Desktop sem suporte nativo (Firefox, Safari desktop, etc.) → não mostrar modal
      }
    }, 1500)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
      window.removeEventListener('appinstalled', handleAppInstalled)
      clearTimeout(timer)
    }
  }, [])


  if (!visible) return null

  return (
    <div className="install-prompt-overlay" role="dialog" aria-labelledby="install-prompt-title">
      <div className="install-prompt">
        <button type="button" className="install-prompt-close" onClick={() => dismiss(true)} aria-label="Fechar">
          <X size={20} />
        </button>
        <h3 id="install-prompt-title">Acesso rápido</h3>
        <p className="install-prompt-desc">
          Adicione o Dashboard ao seu dispositivo para abrir directamente, sem procurar no browser.
        </p>

        {platform === 'chrome' && deferredPrompt && (
          <div className="install-prompt-actions">
            <button type="button" className="install-prompt-btn primary" onClick={handleInstall}>
              <Monitor size={18} />
              Adicionar ao computador
            </button>
            <button type="button" className="install-prompt-btn secondary" onClick={() => dismiss(true)}>
              Agora não
            </button>
          </div>
        )}

        {platform === 'ios' && (
          <div className="install-prompt-actions install-prompt-ios">
            <Smartphone size={24} className="install-prompt-icon" />
            <ol>
              <li>Toque no ícone <strong>Partilhar</strong> (quadrado com seta) na barra do Safari</li>
              <li>Deslize e toque em <strong>Adicionar ao Ecrã Inicial</strong></li>
              <li>Toque em <strong>Adicionar</strong></li>
            </ol>
            <button type="button" className="install-prompt-btn primary" onClick={() => dismiss(true)}>
              Entendi
            </button>
          </div>
        )}

        {platform === 'android' && !deferredPrompt && (
          <div className="install-prompt-actions">
            <p className="install-prompt-hint">
              No Chrome, toque no menu (⋮) e escolha "Adicionar ao ecrã inicial" ou "Instalar aplicação".
            </p>
            <button type="button" className="install-prompt-btn primary" onClick={() => dismiss(true)}>
              Entendi
            </button>
          </div>
        )}

        <p className="install-prompt-skip">
          <button type="button" className="install-prompt-link" onClick={() => dismiss(true)}>
            Não mostrar novamente
          </button>
        </p>
      </div>
    </div>
  )
}
