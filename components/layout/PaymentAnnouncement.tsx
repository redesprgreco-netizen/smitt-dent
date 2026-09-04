'use client'

import { useEffect, useState } from 'react'

const WHATSAPP_URL = 'https://wa.me/527775417367?text=Hola%20GRESANOVA%2C%20quiero%20m%C3%A1s%20informaci%C3%B3n%20sobre%20mi%20pago.'

export default function PaymentAnnouncement() {
  const [visible, setVisible] = useState(true)
  const [detailsOpen, setDetailsOpen] = useState(false)

  useEffect(() => {
    setVisible(sessionStorage.getItem('gresanova-payment-announcement-hidden') !== 'true')
  }, [])

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setDetailsOpen(false)
    }

    if (detailsOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [detailsOpen])

  function dismiss() {
    sessionStorage.setItem('gresanova-payment-announcement-hidden', 'true')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <>
      <aside className="payment-announcement" aria-label="Aviso de pago">
        <div className="payment-announcement-icon" aria-hidden="true">
          <i className="ti ti-speakerphone" />
        </div>
        <div className="payment-announcement-copy">
          <strong>Tu pago ya viene</strong>
          <span>La fecha de pago es el día 5 de este mes. Ponte en contacto con tu proveedor.</span>
        </div>
        <div className="payment-announcement-actions">
          <button className="payment-announcement-info" onClick={() => setDetailsOpen(true)}>
            <i className="ti ti-info-circle" aria-hidden="true" />
            Más información
          </button>
          <a className="payment-announcement-whatsapp" href={WHATSAPP_URL} target="_blank" rel="noreferrer">
            <i className="ti ti-brand-whatsapp" aria-hidden="true" />
            WhatsApp
          </a>
          <button className="payment-announcement-close" onClick={dismiss} aria-label="Cerrar aviso" title="Cerrar aviso">
            <i className="ti ti-x" aria-hidden="true" />
          </button>
        </div>
      </aside>

      {detailsOpen && (
        <div className="modal-overlay" role="presentation" onMouseDown={() => setDetailsOpen(false)}>
          <section
            className="modal-box payment-details-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-details-title"
            onMouseDown={event => event.stopPropagation()}
          >
            <div className="modal-title">
              <span id="payment-details-title"><i className="ti ti-building-bank" aria-hidden="true" /> Datos de pago</span>
              <button className="payment-details-close" onClick={() => setDetailsOpen(false)} aria-label="Cerrar información">
                <i className="ti ti-x" aria-hidden="true" />
              </button>
            </div>
            <p className="payment-details-intro">Para confirmar tu pago del día 5, utiliza los siguientes datos:</p>
            <dl className="payment-details-list">
              <div><dt>Banco</dt><dd>Santander</dd></div>
              <div><dt>Número de cuenta</dt><dd className="payment-account">5579 1004 5635 2044</dd></div>
              <div><dt>Propietario</dt><dd>Greco Lagunas</dd></div>
              <div><dt>Concepto</dt><dd>GRESANOVA</dd></div>
            </dl>
            <div className="payment-details-actions">
              <a className="btn btn-primary" href={WHATSAPP_URL} target="_blank" rel="noreferrer">
                <i className="ti ti-brand-whatsapp" aria-hidden="true" /> Contactar por WhatsApp
              </a>
              <button className="btn btn-secondary" onClick={() => setDetailsOpen(false)}>Cerrar</button>
            </div>
          </section>
        </div>
      )}
    </>
  )
}