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
  prioridad: 1 | 2 | 3;
  asignadoA: string[];
  asignadoNombre: string[];
  estado: 'pendiente' | 'en_progreso' | 'completada';
  pago: 'pagado' | 'no_pagado' | 'abono';
  monto: number;
  montoAbonado?: number;
  fechaProgramada: Date | string;
  horaProgramada: string;
  duracionEstimada: number;
  materiales: string[];
  equiposNumeroDeSerie: string[];
  tiempoTotal: number;
  notas: string;
  herramientasEspeciales: string[];
  equipos: string[];
  creadoPor: string;
  creadoEn: Date;
  completadoEn?: Date;
  
  // Nuevas propiedades para cobranza
  anticipoRecibido?: number;
  saldoRestante?: number;
  planCobro?: 'al_finalizar' | 'anticipo' | 'contado';
  
  // Nuevas propiedades para cronómetro persistente
  tiempoInicio?: Date | null;        // Fecha/hora de inicio de la tarea (si está en progreso)
  ultimaActualizacionCrono?: Date;   // Última vez que se actualizó el cronómetro
}