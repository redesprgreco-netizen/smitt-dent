// types/index.ts — Smitt-Dent global types

// ─── Enums ────────────────────────────────────────────────
export type Rol = 'admin' | 'doctora' | 'visitante'
export type EstadoUsuario = 'pendiente' | 'activo' | 'inactivo'
export type EstadoCita = 'pendiente' | 'confirmada' | 'cancelada' | 'completada'
export type EstadoExpediente = 'activo' | 'inactivo'
export type EstadoPieza = 'sin_tratamiento' | 'tratado' | 'pendiente' | 'extraccion'
export type EstadoTratamiento = 'pendiente' | 'en_curso' | 'realizado'
export type MetodoPago = 'efectivo' | 'transferencia' | 'tarjeta'
export type EstadoPago = 'activo' | 'anulado'
export type TipoMovimiento = 'entrada' | 'salida'

// ─── Modelos ──────────────────────────────────────────────
export interface Usuario {
  id: number
  nombre: string
  apellido: string
  correo: string
  rol: Rol
  colorAgenda: string | null
  estado: EstadoUsuario
  aprobadoPor: number | null
  createdAt: string
  updatedAt: string
}

export interface Cita {
  id: number
  nombrePaciente: string
  apellidoPaciente: string
  asunto: string
  fecha: string          // ISO date YYYY-MM-DD
  hora: string           // HH:mm
  notas: string | null
  doctoraId: number
  expedienteId: number | null
  estado: EstadoCita
  createdBy: number
  createdAt: string
  updatedAt: string
  // Joined
  doctora?: Pick<Usuario, 'id' | 'nombre' | 'apellido' | 'colorAgenda'>
}

export interface Expediente {
  id: number
  folio: string
  nombre: string
  apellido: string
  fechaNacimiento: string | null
  telefono: string | null
  correo: string | null
  alergias: string | null
  motivoInicial: string | null
  doctoraId: number
  estado: EstadoExpediente
  createdBy: number
  createdAt: string
  updatedAt: string
  // Joined
  doctora?: Pick<Usuario, 'id' | 'nombre' | 'apellido'>
}

export interface HistorialClinico {
  id: number
  expedienteId: number
  titulo: string
  descripcion: string
  esCorreccion: boolean
  notaOriginalId: number | null
  createdBy: number
  createdAt: string
  // Joined
  autor?: Pick<Usuario, 'id' | 'nombre' | 'apellido' | 'rol'>
  correcciones?: HistorialClinico[]
}

export interface OdontogramaPieza {
  id: number
  expedienteId: number
  numeroPieza: number
  estado: EstadoPieza
  notas: string | null
  updatedBy: number
  updatedAt: string
}

export interface OdontogramaHistorial {
  id: number
  expedienteId: number
  numeroPieza: number
  estadoAnterior: EstadoPieza
  estadoNuevo: EstadoPieza
  changedBy: number
  changedAt: string
  changer?: Pick<Usuario, 'id' | 'nombre' | 'apellido'>
}

export interface PlanTratamiento {
  id: number
  expedienteId: number
  concepto: string
  piezas: string | null
  cantidad: number
  precioUnitario: number
  subtotal: number
  descuentoPct: number
  estado: EstadoTratamiento
  createdBy: number
  createdAt: string
  updatedAt: string
}

export interface Pago {
  id: number
  folioRecibo: string
  expedienteId: number
  monto: number
  metodoPago: MetodoPago
  concepto: string | null
  estado: EstadoPago
  motivoAnulacion: string | null
  anuladoPor: number | null
  anuladoAt: string | null
  createdBy: number
  createdAt: string
  // Joined
  expediente?: Pick<Expediente, 'id' | 'folio' | 'nombre' | 'apellido'>
  creador?: Pick<Usuario, 'id' | 'nombre' | 'apellido'>
}

export interface InventarioArticulo {
  id: number
  nombre: string
  categoria: string | null
  unidadMedida: string
  stockActual: number
  stockMinimo: number
  activo: boolean
  createdAt: string
  updatedAt: string
}

export interface InventarioMovimiento {
  id: number
  articuloId: number
  tipo: TipoMovimiento
  cantidad: number
  notas: string | null
  createdBy: number
  createdAt: string
  articulo?: Pick<InventarioArticulo, 'id' | 'nombre' | 'unidadMedida'>
}

export interface BitacoraEntry {
  id: number
  usuarioId: number | null
  accion: string
  tablaAfectada: string
  registroId: number | null
  valorAnterior: Record<string, unknown> | null
  valorNuevo: Record<string, unknown> | null
  ipAddress: string | null
  createdAt: string
  usuario?: Pick<Usuario, 'id' | 'nombre' | 'apellido' | 'rol'>
}

// ─── JWT Payload ──────────────────────────────────────────
export interface JWTPayload {
  sub: number          // usuario.id
  correo: string
  rol: Rol
  nombre: string
  apellido: string
  colorAgenda: string | null
  iat: number
  exp: number
}

// ─── API Responses ────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  ok: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  ok: boolean
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// ─── Vista: saldo expediente ──────────────────────────────
export interface SaldoExpediente {
  expedienteId: number
  folio: string
  paciente: string
  totalPresupuesto: number
  totalPagado: number
  saldoPendiente: number
}
