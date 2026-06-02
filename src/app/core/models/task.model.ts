export type TaskStatus = 'pendiente' | 'en_progreso' | 'completada' | 'vencida';
export type PaymentStatus = 'pagado' | 'no_pagado' | 'abono';
export type TaskPriority = 1 | 2 | 3;
export type PlanCobro = 'al_finalizar' | 'no_cobrar';

export interface Task {
  id?: string;
  folioId: string;
  cliente: string;
  direccion: string;
  telefono: string;
  descripcion: string;
  prioridad: TaskPriority;
  asignadoA: string[];
  asignadoNombre?: string[];
  estado: TaskStatus;
  pago: PaymentStatus;
  monto: number;
  montoAbonado?: number;
  anticipoRecibido?: number;
  saldoRestante?: number;
  planCobro?: PlanCobro;
  fechaProgramada: Date;
  horaProgramada?: string;
  duracionEstimada?: number;
  materiales: string[];
  herramientasEspeciales?: string[];
  equipos?: string[];
  equiposNumeroDeSerie: string[];
  tiempoTotal: number;
  notas?: string;
  firmaUrl?: string;
  creadoPor: string;
  creadoEn: Date;
  completadoEn?: Date;
}