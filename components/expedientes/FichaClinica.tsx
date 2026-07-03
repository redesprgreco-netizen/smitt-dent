'use client'
import { useState, useEffect, useCallback } from 'react'
import type { Expediente, AntecedentesPatologicos, ConsentimientoInformado, Sexo, EstadoSaludGeneral } from '@/types'

interface Props {
  expediente: Expediente & { antecedentes?: AntecedentesPatologicos | null; consentimiento?: ConsentimientoInformado | null }
  onUpdated: () => void
}

type SubTab = 'identificacion' | 'antecedentes' | 'consentimiento'

// ── Pequeño toggle Sí / No ──────────────────────────────
function SiNo({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)',
      background: value ? '#fff4e0' : '#fff',
    }}>
      <span style={{ fontSize: 13, color: 'var(--text-main)' }}>{label}</span>
      <div style={{ display: 'flex', gap: 6 }}>
        <button type="button" onClick={() => onChange(true)}
          className="btn btn-sm" style={{
            background: value ? '#c87d00' : '#fff', color: value ? '#fff' : 'var(--text-muted)',
            border: `1px solid ${value ? '#c87d00' : 'var(--border)'}`, minWidth: 44,
          }}>Sí</button>
        <button type="button" onClick={() => onChange(false)}
          className="btn btn-sm" style={{
            background: !value ? 'var(--blue-accent)' : '#fff', color: !value ? '#fff' : 'var(--text-muted)',
            border: `1px solid ${!value ? 'var(--blue-accent)' : 'var(--border)'}`, minWidth: 44,
          }}>No</button>
      </div>
    </div>
  )
}

const ENFERMEDADES_PERSONALES: { key: keyof AntecedentesPatologicos; label: string }[] = [
  { key: 'feReumatica', label: 'Fiebre Reumática o enfermedad cardiaca reumática' },
  { key: 'enfCardiovascular', label: 'Enfermedades cardiovasculares' },
  { key: 'mareosDesmayos', label: 'Mareos, desmayos o ataques' },
  { key: 'diabetesPersonal', label: 'Diabetes' },
  { key: 'hepatitis', label: 'Hepatitis' },
  { key: 'vihSida', label: 'VIH positivo / SIDA' },
  { key: 'artritisReumatismo', label: 'Artritis o reumatismo' },
  { key: 'gastritisUlceras', label: 'Gastritis o úlceras gástricas' },
  { key: 'problemasRenales', label: 'Problemas renales' },
  { key: 'anemia', label: 'Anemia' },
  { key: 'presionArterial', label: 'Presión arterial baja o alta' },
  { key: 'sangradoAnormal', label: 'Sangrado anormal con extracciones dentales o cortaduras' },
  { key: 'moretonesFacil', label: 'Se le hacen moretones con facilidad' },
  { key: 'transfusiones', label: 'Ha requerido transfusiones sanguíneas' },
  { key: 'asma', label: 'Asma' },
]

const ANTECEDENTES_FAMILIARES: { key: keyof AntecedentesPatologicos; label: string }[] = [
  { key: 'diabetesFamiliar', label: 'Diabetes' },
  { key: 'enfCorazonFamiliar', label: 'Enfermedad del corazón' },
  { key: 'hipertensionFamiliar', label: 'Hipertensión' },
  { key: 'cancerFamiliar', label: 'Cáncer' },
]

const DEFAULT_ANTECEDENTES: Partial<AntecedentesPatologicos> = {
  estadoSalud: null,
  feReumatica: false, enfCardiovascular: false, mareosDesmayos: false, diabetesPersonal: false,
  hepatitis: false, vihSida: false, artritisReumatismo: false, gastritisUlceras: false,
  problemasRenales: false, anemia: false, presionArterial: false, sangradoAnormal: false,
  moretonesFacil: false, transfusiones: false, asma: false,
  diabetesFamiliar: false, enfCorazonFamiliar: false, hipertensionFamiliar: false, cancerFamiliar: false,
  tratamientoActual: false, tratamientoActualDetalle: '',
  alergicoAnestesico: false, alergicoDetalle: '',
  faltaAire: false, bocaSeca: false, embarazada: false, mesesGestacion: null,
  tabaquismo: false, cigarrosDia: null, tabaquismoAnios: null,
  drogas: false, drogasCuales: '', drogasAnios: null,
  alergiasGenerales: false, alergiasCuales: '', alergiasAnios: null,
  alcoholismo: false, alcoholCantSemana: '', alcoholAnios: null,
}

export default function FichaClinica({ expediente, onUpdated }: Props) {
  const [sub, setSub] = useState<SubTab>('identificacion')

  // ── Identificación ──
  const [idForm, setIdForm] = useState({
    sexo: (expediente.sexo ?? '') as Sexo | '',
    ocupacion: expediente.ocupacion ?? '',
    domicilio: expediente.domicilio ?? '',
    ciudad: expediente.ciudad ?? '',
    codigoPostal: expediente.codigoPostal ?? '',
    contactoEmergenciaNombre: expediente.contactoEmergenciaNombre ?? '',
    contactoEmergenciaTelefono: expediente.contactoEmergenciaTelefono ?? '',
    llenadoPorNombre: expediente.llenadoPorNombre ?? '',
    llenadoPorParentesco: expediente.llenadoPorParentesco ?? '',
  })
  const [savingId, setSavingId] = useState(false)
  const [idMsg, setIdMsg] = useState('')

  async function guardarIdentificacion(e: React.FormEvent) {
    e.preventDefault()
    setSavingId(true); setIdMsg('')
    try {
      const res = await fetch(`/api/expedientes/${expediente.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...idForm, sexo: idForm.sexo || null }),
      })
      if (res.ok) { setIdMsg('Guardado'); onUpdated() } else setIdMsg('Error al guardar')
    } finally { setSavingId(false); setTimeout(() => setIdMsg(''), 2500) }
  }

  // ── Antecedentes patológicos ──
  const [ant, setAnt] = useState<Partial<AntecedentesPatologicos>>({
    ...DEFAULT_ANTECEDENTES, ...(expediente.antecedentes ?? {}),
  })
  const [savingAnt, setSavingAnt] = useState(false)
  const [antMsg, setAntMsg] = useState('')

  const loadAntecedentes = useCallback(async () => {
    const res = await fetch(`/api/expedientes/${expediente.id}/antecedentes`)
    const data = await res.json()
    if (data.ok && data.data) setAnt({ ...DEFAULT_ANTECEDENTES, ...data.data })
  }, [expediente.id])

  useEffect(() => { loadAntecedentes() }, [loadAntecedentes])

  function setBool(key: keyof AntecedentesPatologicos, value: boolean) {
    setAnt(a => ({ ...a, [key]: value }))
  }

  async function guardarAntecedentes(e: React.FormEvent) {
    e.preventDefault()
    setSavingAnt(true); setAntMsg('')
    try {
      const res = await fetch(`/api/expedientes/${expediente.id}/antecedentes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ant),
      })
      if (res.ok) { setAntMsg('Guardado'); onUpdated() } else setAntMsg('Error al guardar')
    } finally { setSavingAnt(false); setTimeout(() => setAntMsg(''), 2500) }
  }

  // ── Consentimiento informado ──
  const [cons, setCons] = useState({
    nombreDentista: expediente.consentimiento?.nombreDentista ?? '',
    nombreRepresentanteLegal: expediente.consentimiento?.nombreRepresentanteLegal ?? '',
    parentesco: expediente.consentimiento?.parentesco ?? '',
    firmaNombre: expediente.consentimiento?.firmaNombre ?? '',
    aceptado: expediente.consentimiento?.aceptado ?? false,
  })
  const [savingCons, setSavingCons] = useState(false)
  const [consMsg, setConsMsg] = useState('')

  async function guardarConsentimiento(aceptar: boolean) {
    setSavingCons(true); setConsMsg('')
    try {
      const res = await fetch(`/api/expedientes/${expediente.id}/consentimiento`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...cons, aceptado: aceptar }),
      })
      const data = await res.json()
      if (res.ok) { setCons(c => ({ ...c, aceptado: aceptar })); setConsMsg(aceptar ? 'Consentimiento firmado' : 'Guardado'); onUpdated() }
      else setConsMsg(data.error ?? 'Error al guardar')
    } finally { setSavingCons(false); setTimeout(() => setConsMsg(''), 3000) }
  }

  const fmtFecha = (iso: string | null) => iso ? new Date(iso).toLocaleDateString('es-MX', { dateStyle: 'medium' }) : '—'

  return (
    <div>
      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {([
          { key: 'identificacion', label: 'I. Ficha de identificación', icon: 'ti-id' },
          { key: 'antecedentes', label: 'II. Antecedentes patológicos', icon: 'ti-clipboard-heart' },
          { key: 'consentimiento', label: 'Consentimiento informado', icon: 'ti-file-signature' },
        ] as { key: SubTab; label: string; icon: string }[]).map(t => (
          <button key={t.key} type="button" onClick={() => setSub(t.key)}
            className="btn btn-sm"
            style={{
              background: sub === t.key ? 'var(--blue-light)' : '#fff',
              border: `1px solid ${sub === t.key ? 'var(--blue-accent)' : 'var(--border)'}`,
              color: sub === t.key ? 'var(--blue-accent)' : 'var(--text-main)',
            }}>
            <i className={`ti ${t.icon}`} style={{ marginRight: 6 }} />{t.label}
          </button>
        ))}
      </div>

      {/* ── I. Ficha de identificación ── */}
      {sub === 'identificacion' && (
        <form onSubmit={guardarIdentificacion} className="card" style={{ padding: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Datos adicionales de identificación</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label className="form-label">Sexo</label>
              <select className="form-select" value={idForm.sexo}
                onChange={e => setIdForm(f => ({ ...f, sexo: e.target.value as Sexo | '' }))}>
                <option value="">— Seleccionar —</option>
                <option value="masculino">Masculino</option>
                <option value="femenino">Femenino</option>
                <option value="otro">Otro</option>
              </select>
            </div>
            <div>
              <label className="form-label">Ocupación</label>
              <input className="form-input" value={idForm.ocupacion}
                onChange={e => setIdForm(f => ({ ...f, ocupacion: e.target.value }))} placeholder="Maestra, comerciante..." />
            </div>
            <div>
              <label className="form-label">Código Postal</label>
              <input className="form-input" value={idForm.codigoPostal}
                onChange={e => setIdForm(f => ({ ...f, codigoPostal: e.target.value }))} placeholder="62000" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label className="form-label">Domicilio</label>
              <input className="form-input" value={idForm.domicilio}
                onChange={e => setIdForm(f => ({ ...f, domicilio: e.target.value }))} placeholder="Calle, número, colonia" />
            </div>
            <div>
              <label className="form-label">Ciudad</label>
              <input className="form-input" value={idForm.ciudad}
                onChange={e => setIdForm(f => ({ ...f, ciudad: e.target.value }))} placeholder="Cuernavaca" />
            </div>
          </div>

          <p style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-muted)', margin: '18px 0 10px' }}>
            Persona en caso de emergencia
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label className="form-label">Nombre</label>
              <input className="form-input" value={idForm.contactoEmergenciaNombre}
                onChange={e => setIdForm(f => ({ ...f, contactoEmergenciaNombre: e.target.value }))} />
            </div>
            <div>
              <label className="form-label">Teléfono</label>
              <input className="form-input" value={idForm.contactoEmergenciaTelefono}
                onChange={e => setIdForm(f => ({ ...f, contactoEmergenciaTelefono: e.target.value }))} />
            </div>
          </div>

          <p style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-muted)', margin: '18px 0 10px' }}>
            Si usted está llenando este expediente para otra persona
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label className="form-label">¿Cuál es su nombre?</label>
              <input className="form-input" value={idForm.llenadoPorNombre}
                onChange={e => setIdForm(f => ({ ...f, llenadoPorNombre: e.target.value }))} />
            </div>
            <div>
              <label className="form-label">Parentesco con el paciente</label>
              <input className="form-input" value={idForm.llenadoPorParentesco}
                onChange={e => setIdForm(f => ({ ...f, llenadoPorParentesco: e.target.value }))} />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button type="submit" className="btn btn-primary btn-sm" disabled={savingId}>
              <i className="ti ti-device-floppy" /> {savingId ? 'Guardando...' : 'Guardar identificación'}
            </button>
            {idMsg && <span style={{ fontSize: 12.5, color: idMsg === 'Guardado' ? '#1a9e5c' : '#c0392b' }}>{idMsg}</span>}
          </div>
        </form>
      )}

      {/* ── II. Antecedentes patológicos personales ── */}
      {sub === 'antecedentes' && (
        <form onSubmit={guardarAntecedentes}>
          <div className="card" style={{ padding: 20, marginBottom: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>1. ¿Cómo considera su estado de salud?</p>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['bueno', 'regular', 'malo'] as EstadoSaludGeneral[]).map(opt => (
                <button key={opt} type="button" onClick={() => setAnt(a => ({ ...a, estadoSalud: opt }))}
                  className="btn btn-sm" style={{
                    textTransform: 'capitalize',
                    background: ant.estadoSalud === opt ? 'var(--blue-light)' : '#fff',
                    border: `1px solid ${ant.estadoSalud === opt ? 'var(--blue-accent)' : 'var(--border)'}`,
                    color: ant.estadoSalud === opt ? 'var(--blue-accent)' : 'var(--text-main)',
                  }}>{opt}</button>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: 20, marginBottom: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>2. ¿Padece o ha padecido alguna de las siguientes enfermedades?</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {ENFERMEDADES_PERSONALES.map(({ key, label }) => (
                <SiNo key={key} label={label} value={Boolean(ant[key])} onChange={v => setBool(key, v)} />
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: 20, marginBottom: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>3. ¿Algún miembro de su familia padece o padeció?</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {ANTECEDENTES_FAMILIARES.map(({ key, label }) => (
                <SiNo key={key} label={label} value={Boolean(ant[key])} onChange={v => setBool(key, v)} />
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: 20, marginBottom: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>4. ¿Recibe tratamiento médico actualmente?</p>
            <SiNo label="Recibe tratamiento médico actualmente" value={Boolean(ant.tratamientoActual)}
              onChange={v => setBool('tratamientoActual', v)} />
            {ant.tratamientoActual && (
              <input className="form-input" style={{ marginTop: 10 }} placeholder="¿Cuál tratamiento?"
                value={ant.tratamientoActualDetalle ?? ''}
                onChange={e => setAnt(a => ({ ...a, tratamientoActualDetalle: e.target.value }))} />
            )}
          </div>

          <div className="card" style={{ padding: 20, marginBottom: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
              5. ¿Es alérgico a algún tipo de anestésico, medicamentos como penicilina, látex u otros?
            </p>
            <SiNo label="Alergia a anestésicos / medicamentos / látex" value={Boolean(ant.alergicoAnestesico)}
              onChange={v => setBool('alergicoAnestesico', v)} />
            {ant.alergicoAnestesico && (
              <input className="form-input" style={{ marginTop: 10 }} placeholder="¿A cuáles?"
                value={ant.alergicoDetalle ?? ''}
                onChange={e => setAnt(a => ({ ...a, alergicoDetalle: e.target.value }))} />
            )}
          </div>

          <div className="card" style={{ padding: 20, marginBottom: 16, display: 'grid', gap: 10 }}>
            <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>6–8. Otras preguntas de salud</p>
            <SiNo label="6. ¿Siente que le falta el aire con ejercicio moderado?" value={Boolean(ant.faltaAire)}
              onChange={v => setBool('faltaAire', v)} />
            <SiNo label="7. ¿Siente su boca seca la mayor parte del tiempo?" value={Boolean(ant.bocaSeca)}
              onChange={v => setBool('bocaSeca', v)} />
            <SiNo label="8. ¿Está usted embarazada?" value={Boolean(ant.embarazada)}
              onChange={v => setBool('embarazada', v)} />
            {ant.embarazada && (
              <input className="form-input" type="number" min="0" max="9" placeholder="Meses de gestación"
                value={ant.mesesGestacion ?? ''}
                onChange={e => setAnt(a => ({ ...a, mesesGestacion: e.target.value ? parseInt(e.target.value) : null }))} />
            )}
          </div>

          <div className="card" style={{ padding: 20, marginBottom: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>9. Tabaquismo</p>
            <SiNo label="¿Fuma actualmente o ha fumado?" value={Boolean(ant.tabaquismo)}
              onChange={v => setBool('tabaquismo', v)} />
            {ant.tabaquismo && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
                <input className="form-input" type="number" min="0" placeholder="Cigarros al día"
                  value={ant.cigarrosDia ?? ''}
                  onChange={e => setAnt(a => ({ ...a, cigarrosDia: e.target.value ? parseInt(e.target.value) : null }))} />
                <input className="form-input" type="number" min="0" placeholder="Años de consumo o exposición"
                  value={ant.tabaquismoAnios ?? ''}
                  onChange={e => setAnt(a => ({ ...a, tabaquismoAnios: e.target.value ? parseInt(e.target.value) : null }))} />
              </div>
            )}
          </div>

          <div className="card" style={{ padding: 20, marginBottom: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>10. Drogas</p>
            <SiNo label="¿Consume o ha consumido drogas?" value={Boolean(ant.drogas)}
              onChange={v => setBool('drogas', v)} />
            {ant.drogas && (
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10, marginTop: 10 }}>
                <input className="form-input" placeholder="¿Cuáles?"
                  value={ant.drogasCuales ?? ''}
                  onChange={e => setAnt(a => ({ ...a, drogasCuales: e.target.value }))} />
                <input className="form-input" type="number" min="0" placeholder="Años de consumo"
                  value={ant.drogasAnios ?? ''}
                  onChange={e => setAnt(a => ({ ...a, drogasAnios: e.target.value ? parseInt(e.target.value) : null }))} />
              </div>
            )}
          </div>

          <div className="card" style={{ padding: 20, marginBottom: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>11. Alergias</p>
            <SiNo label="¿Tiene alguna alergia?" value={Boolean(ant.alergiasGenerales)}
              onChange={v => setBool('alergiasGenerales', v)} />
            {ant.alergiasGenerales && (
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10, marginTop: 10 }}>
                <input className="form-input" placeholder="¿Cuáles?"
                  value={ant.alergiasCuales ?? ''}
                  onChange={e => setAnt(a => ({ ...a, alergiasCuales: e.target.value }))} />
                <input className="form-input" type="number" min="0" placeholder="Años de consumo o exposición"
                  value={ant.alergiasAnios ?? ''}
                  onChange={e => setAnt(a => ({ ...a, alergiasAnios: e.target.value ? parseInt(e.target.value) : null }))} />
              </div>
            )}
          </div>

          <div className="card" style={{ padding: 20, marginBottom: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>12. Alcoholismo</p>
            <SiNo label="¿Consume bebidas alcohólicas?" value={Boolean(ant.alcoholismo)}
              onChange={v => setBool('alcoholismo', v)} />
            {ant.alcoholismo && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
                <input className="form-input" placeholder="Cantidad de consumo por semana"
                  value={ant.alcoholCantSemana ?? ''}
                  onChange={e => setAnt(a => ({ ...a, alcoholCantSemana: e.target.value }))} />
                <input className="form-input" type="number" min="0" placeholder="Años de consumo"
                  value={ant.alcoholAnios ?? ''}
                  onChange={e => setAnt(a => ({ ...a, alcoholAnios: e.target.value ? parseInt(e.target.value) : null }))} />
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 30 }}>
            <button type="submit" className="btn btn-primary btn-sm" disabled={savingAnt}>
              <i className="ti ti-device-floppy" /> {savingAnt ? 'Guardando...' : 'Guardar antecedentes'}
            </button>
            {antMsg && <span style={{ fontSize: 12.5, color: antMsg === 'Guardado' ? '#1a9e5c' : '#c0392b' }}>{antMsg}</span>}
          </div>
        </form>
      )}

      {/* ── Consentimiento informado ── */}
      {sub === 'consentimiento' && (
        <div className="card" style={{ padding: 24 }}>
          {expediente.consentimiento?.aceptado ? (
            <div style={{ background: '#e8f8ee', border: '1px solid #bfe8cf', borderRadius: 10, padding: '14px 18px', marginBottom: 20 }}>
              <p style={{ fontSize: 13.5, color: '#1a9e5c', fontWeight: 600 }}>
                <i className="ti ti-circle-check" style={{ marginRight: 6 }} />
                Consentimiento firmado el {fmtFecha(expediente.consentimiento.fechaFirma)}
              </p>
            </div>
          ) : (
            <div style={{ background: '#fff4e0', border: '1px solid #f0dcae', borderRadius: 10, padding: '14px 18px', marginBottom: 20 }}>
              <p style={{ fontSize: 13.5, color: '#c87d00', fontWeight: 600 }}>
                <i className="ti ti-alert-circle" style={{ marginRight: 6 }} />
                Este expediente aún no cuenta con consentimiento informado firmado
              </p>
            </div>
          )}

          <p style={{ fontSize: 13.5, lineHeight: 1.7, color: 'var(--text-main)', marginBottom: 16 }}>
            A través del presente, el paciente (o su representante legal) declara, en pleno uso de sus facultades
            mentales, libre y espontáneamente, que autoriza al Cirujano Dentista a realizar el diagnóstico y los
            tratamientos odontológicos, médicos y quirúrgicos que se consideren necesarios, incluyendo el uso de
            anestesia local, estudios radiográficos y demás pruebas diagnósticas, comprendiendo los riesgos,
            alcances y limitaciones de la Odontología conforme a lo especificado en el documento físico/entregable
            de esta clínica.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label className="form-label">Dr./a. que atiende</label>
              <input className="form-input" value={cons.nombreDentista}
                onChange={e => setCons(c => ({ ...c, nombreDentista: e.target.value }))} placeholder="Nombre del dentista" />
            </div>
            <div>
              <label className="form-label">Nombre del representante legal (si aplica)</label>
              <input className="form-input" value={cons.nombreRepresentanteLegal}
                onChange={e => setCons(c => ({ ...c, nombreRepresentanteLegal: e.target.value }))} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            <div>
              <label className="form-label">Parentesco</label>
              <input className="form-input" value={cons.parentesco}
                onChange={e => setCons(c => ({ ...c, parentesco: e.target.value }))} placeholder="Madre, tutor, propio paciente..." />
            </div>
            <div>
              <label className="form-label">Nombre y firma (texto) del paciente/tutor</label>
              <input className="form-input" value={cons.firmaNombre}
                onChange={e => setCons(c => ({ ...c, firmaNombre: e.target.value }))} placeholder="Nombre completo" />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button type="button" className="btn btn-primary btn-sm" disabled={savingCons}
              onClick={() => guardarConsentimiento(true)}>
              <i className="ti ti-signature" /> {savingCons ? 'Guardando...' : 'Firmar / aceptar consentimiento'}
            </button>
            <button type="button" className="btn btn-secondary btn-sm" disabled={savingCons}
              onClick={() => guardarConsentimiento(false)}>
              Guardar sin firmar
            </button>
            {consMsg && <span style={{ fontSize: 12.5, color: consMsg.includes('Error') ? '#c0392b' : '#1a9e5c' }}>{consMsg}</span>}
          </div>
        </div>
      )}
    </div>
  )
}
