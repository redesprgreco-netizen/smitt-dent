// components/odontograma/odontograma-data.ts
// Datos y helpers compartidos entre la vista 2D y la vista 3D del odontograma.
import type { EstadoPieza, SuperficieDental } from '@/types'

// ── Numeración FDI: cuadrantes ──────────────────────────────
export const ADULTO_SUP_DER = [18,17,16,15,14,13,12,11]
export const ADULTO_SUP_IZQ = [21,22,23,24,25,26,27,28]
export const ADULTO_INF_IZQ = [38,37,36,35,34,33,32,31]
export const ADULTO_INF_DER = [41,42,43,44,45,46,47,48]
export const PIEZAS_ADULTO = [...ADULTO_SUP_DER, ...ADULTO_SUP_IZQ, ...ADULTO_INF_IZQ, ...ADULTO_INF_DER]

export const INFANTIL_SUP_DER = [55,54,53,52,51]
export const INFANTIL_SUP_IZQ = [61,62,63,64,65]
export const INFANTIL_INF_IZQ = [75,74,73,72,71]
export const INFANTIL_INF_DER = [81,82,83,84,85]
export const PIEZAS_INFANTIL = [...INFANTIL_SUP_DER, ...INFANTIL_SUP_IZQ, ...INFANTIL_INF_IZQ, ...INFANTIL_INF_DER]

// Numeración alterna (Universal 1-32 para adulto, letras A-T para infantil)
export const FDI_A_ALTERNA: Record<number, string> = {
  18:'1',17:'2',16:'3',15:'4',14:'5',13:'6',12:'7',11:'8',21:'9',22:'10',23:'11',24:'12',25:'13',26:'14',27:'15',28:'16',
  38:'17',37:'18',36:'19',35:'20',34:'21',33:'22',32:'23',31:'24',41:'25',42:'26',43:'27',44:'28',45:'29',46:'30',47:'31',48:'32',
  55:'A',54:'B',53:'C',52:'D',51:'E',61:'F',62:'G',63:'H',64:'I',65:'J',
  75:'K',74:'L',73:'M',72:'N',71:'O',81:'P',82:'Q',83:'R',84:'S',85:'T',
}

// ── Estados clínicos de la pieza completa ───────────────────
export const ESTADO_COLOR: Record<EstadoPieza, { bg: string; border: string; fg: string }> = {
  sin_tratamiento: { bg: '#ffffff', border: '#dce5f0', fg: '#6b7fa3' },
  tratado:         { bg: '#e8f8ee', border: '#1a9e5c', fg: '#1a9e5c' },
  pendiente:       { bg: '#fff4e0', border: '#c87d00', fg: '#c87d00' },
  extraccion:      { bg: '#fdeee8', border: '#d85a30', fg: '#d85a30' },
  caries:          { bg: '#fde9ea', border: '#d8303f', fg: '#d8303f' },
  obturado:        { bg: '#e8f1fb', border: '#2272d4', fg: '#2272d4' },
  corona:          { bg: '#f4ecff', border: '#7a3fd8', fg: '#7a3fd8' },
  endodoncia:      { bg: '#fbe8f0', border: '#b8286b', fg: '#b8286b' },
  ausente:         { bg: '#eef1f5', border: '#8a97ad', fg: '#5b6b85' },
  implante:        { bg: '#e0f7f6', border: '#00918a', fg: '#00918a' },
  sellante:        { bg: '#eefaf0', border: '#3aa66d', fg: '#3aa66d' },
}

export const ESTADO_LABEL: Record<EstadoPieza, string> = {
  sin_tratamiento: 'Sano',
  tratado: 'Tratado',
  pendiente: 'Pendiente',
  extraccion: 'Extracción indicada',
  caries: 'Caries',
  obturado: 'Obturado / Resina',
  corona: 'Corona',
  endodoncia: 'Endodoncia',
  ausente: 'Ausente',
  implante: 'Implante',
  sellante: 'Sellante',
}

export const ESTADO_ICON: Record<EstadoPieza, string | null> = {
  sin_tratamiento: null,
  tratado: 'ti-check',
  pendiente: 'ti-clock',
  extraccion: 'ti-x',
  caries: 'ti-alert-triangle',
  obturado: 'ti-circle-filled',
  corona: 'ti-crown',
  endodoncia: 'ti-git-commit',
  ausente: 'ti-minus',
  implante: 'ti-plug-connected',
  sellante: 'ti-shield-check',
}

// Orden en que se muestran los chips del panel de edición
export const ESTADOS_ORDEN: EstadoPieza[] = [
  'sin_tratamiento', 'caries', 'obturado', 'tratado', 'pendiente',
  'corona', 'endodoncia', 'sellante', 'implante', 'extraccion', 'ausente',
]

// ── Superficies dentales (5 caras) ──────────────────────────
export const SUPERFICIES: { key: SuperficieDental; label: string; corta: string }[] = [
  { key: 'vestibular', label: 'Vestibular', corta: 'V' },
  { key: 'mesial',     label: 'Mesial',     corta: 'M' },
  { key: 'oclusal',    label: 'Oclusal / Incisal', corta: 'O' },
  { key: 'distal',     label: 'Distal',     corta: 'D' },
  { key: 'palatino',   label: 'Palatino / Lingual', corta: 'P' },
]

export const SUPERFICIE_COLOR: Record<string, { bg: string; border: string; hex: string }> = {
  sano:     { bg: '#ffffff', border: '#dce5f0', hex: '#ffffff' },
  caries:   { bg: '#fde9ea', border: '#d8303f', hex: '#d8303f' },
  obturado: { bg: '#e8f1fb', border: '#2272d4', hex: '#2272d4' },
}

export type Clase = 'incisivo' | 'canino' | 'premolar' | 'molar'

export function claseDiente(num: number): Clase {
  const ultimo = num % 10
  const esInfantil = num >= 51
  if (esInfantil) {
    if (ultimo <= 2) return 'incisivo'
    if (ultimo === 3) return 'canino'
    return 'molar'
  }
  if (ultimo <= 2) return 'incisivo'
  if (ultimo === 3) return 'canino'
  if (ultimo <= 5) return 'premolar'
  return 'molar'
}

export const CLASE_LABEL: Record<Clase, string> = {
  incisivo: 'Incisivo', canino: 'Canino', premolar: 'Premolar', molar: 'Molar',
}

export interface PiezaData {
  numeroPieza: number
  estado: EstadoPieza
  superficies?: Partial<Record<SuperficieDental, 'sano' | 'caries' | 'obturado'>> | null
  notas: string | null
  updater?: { id: number; nombre: string; apellido: string }
  updatedAt?: string
}
