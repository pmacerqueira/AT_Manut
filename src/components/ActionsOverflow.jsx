import { useRef, useEffect, useCallback } from 'react'
import { MoreHorizontal } from 'lucide-react'
import './ActionsOverflow.css'

/**
 * ActionsOverflow — dropdown de acções secundárias (botão "...").
 * Usa position: fixed para escapar containers com overflow: auto/hidden.
 * Fecha ao clicar fora, ao fazer scroll, ou ao redimensionar a janela.
 *
 * @param {{ id: string, items: Array<{icon?, label, onClick?, disabled?, danger?}>, openId: string|null, setOpenId: function }} props
 */
export default function ActionsOverflow({ id, items, openId, setOpenId }) {
  const menuRef = useRef(null)
  const btnRef = useRef(null)
  const isOpen = openId === id

  const close = useCallback(() => setOpenId(null), [setOpenId])

  useEffect(() => {
    if (!isOpen) return
    const handleClose = () => close()
    window.addEventListener('scroll', handleClose, true)
    window.addEventListener('resize', handleClose)
    return () => {
      window.removeEventListener('scroll', handleClose, true)
      window.removeEventListener('resize', handleClose)
    }
  }, [isOpen, close])

  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e) => {
      if (menuRef.current?.contains(e.target)) return
      if (btnRef.current?.contains(e.target)) return
      close()
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, close])

  useEffect(() => {
    if (!isOpen || !menuRef.current || !btnRef.current) return
    const menu = menuRef.current
    const btnRect = btnRef.current.getBoundingClientRect()
    const menuH = menu.offsetHeight
    const menuW = menu.offsetWidth
    const viewH = window.innerHeight
    const viewW = window.innerWidth

    let top = btnRect.bottom + 4
    if (viewH - btnRect.bottom - 8 < menuH && btnRect.top > viewH - btnRect.bottom) {
      top = btnRect.top - menuH - 4
    }

    let left = btnRect.right - menuW
    if (left < 8) left = 8
    if (left + menuW > viewW - 8) left = viewW - menuW - 8
    if (top < 8) top = 8

    menu.style.top = `${top}px`
    menu.style.left = `${left}px`
  }, [isOpen])

  if (items.length === 0) return null

  return (
    <div className="actions-overflow">
      <button
        ref={btnRef}
        type="button"
        className="actions-overflow-btn"
        title="Mais acções"
        onClick={() => setOpenId(isOpen ? null : id)}
      >
        <MoreHorizontal size={16} />
      </button>
      {isOpen && (
        <div ref={menuRef} className="actions-overflow-menu">
          {items.map((it, i) => (
            <button
              key={i}
              type="button"
              disabled={it.disabled}
              className={it.danger ? 'danger-item' : ''}
              onClick={() => { setOpenId(null); it.onClick?.() }}
            >
              {it.icon} {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
