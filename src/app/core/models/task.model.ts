
// TIPOS Y ENUMS
export type TaskStatus = 'pendiente' | 'en_progreso' | 'completada' | 'vencida';
export type PaymentStatus = 'pagado' | 'no_pagado' | 'abono';
export type TaskPriority = 1 | 2 | 3;
export type PlanCobro = 'al_finalizar' | 'anticipo' | 'contado' | 'no_cobrar';
// INTERFAZ PRINCIPAL TASK
export interface Task {
  id?: string;
  folioId: string;
  // DATOS DEL CLIENTE 
  cliente: string;
  direccion: string;
  telefono: string;
  descripcion: string;
  // ASIGNACIÓN Y PRIORIDAD 
  prioridad: TaskPriority;
  asignadoA: string[];
  asignadoNombre: string[];
  estado: TaskStatus;
  //  PAGO 
  pago: PaymentStatus;
  monto: number;
  montoAbonado?: number;
  anticipoRecibido?: number;
  saldoRestante?: number;
  planCobro?: PlanCobro;
  //  PROGRAMACIÓN 
  fechaProgramada: Date | string;
  horaProgramada: string;
  duracionEstimada: number;
  tiempoTotal: number;
  
  // RECURSOS Y MATERIALES 
  materiales: string[];
  herramientasEspeciales: string[];
  equipos: string[];
  equiposNumeroDeSerie: string[];
  
  // INFORMACIÓN ADICIONAL 
  notas: string;
  
  // TIEMPOS Y SEGUIMIENTO 
  creadoPor: string;
  creadoEn: Date;
  completadoEn?: Date;
  tiempoInicio?: Date | null;
  ultimaActualizacionCrono?: Date;
}


// FUNCIÓN PARA CREAR TAREA VACÍA (VALORES POR DEFECTO)
export function createEmptyTask(overrides?: Partial<Task>): Omit<Task, 'id'> {
  const now = new Date();
  
  return {
    // Identificación
    folioId: overrides?.folioId || `TASK-${Date.now()}`,
    
    // Datos del cliente
    cliente: overrides?.cliente || '',
    direccion: overrides?.direccion || '',
    telefono: overrides?.telefono || '',
    descripcion: overrides?.descripcion || '',
    
    // Asignación y prioridad
    prioridad: overrides?.prioridad || 1,
    asignadoA: overrides?.asignadoA || [],
    asignadoNombre: overrides?.asignadoNombre || [],
    estado: overrides?.estado || 'pendiente',
    
    // Pagos
    pago: overrides?.pago || 'no_pagado',
    monto: overrides?.monto || 0,
    montoAbonado: overrides?.montoAbonado || 0,
    anticipoRecibido: overrides?.anticipoRecibido || 0,
    saldoRestante: overrides?.saldoRestante || 0,
    planCobro: overrides?.planCobro || 'al_finalizar',
    
    // Programación
    fechaProgramada: overrides?.fechaProgramada || now,
    horaProgramada: overrides?.horaProgramada || '09:00',
    duracionEstimada: overrides?.duracionEstimada || 0,
    tiempoTotal: overrides?.tiempoTotal || 0,
    
    // Recursos y materiales
    materiales: overrides?.materiales || [],
    herramientasEspeciales: overrides?.herramientasEspeciales || [],
    equipos: overrides?.equipos || [],
    equiposNumeroDeSerie: overrides?.equiposNumeroDeSerie || [],
    
    // Información adicional
    notas: overrides?.notas || '',
    
    // Tiempos y seguimiento
    creadoPor: overrides?.creadoPor || '',
    creadoEn: overrides?.creadoEn || now,
    completadoEn: overrides?.completadoEn || undefined,
    tiempoInicio: overrides?.tiempoInicio !== undefined ? overrides.tiempoInicio : null,
    ultimaActualizacionCrono: overrides?.ultimaActualizacionCrono || undefined
  };
}


// FUNCIÓN PARA CREAR TAREA CON DATOS MÍNIMOS


export function createMinimalTask(
  cliente: string,
  creadoPor: string,
  asignadoA: string[] = [],
  asignadoNombre: string[] = []
): Omit<Task, 'id'> {
  return createEmptyTask({
    cliente,
    creadoPor,
    asignadoA,
    asignadoNombre
  });
}


// FUNCIONES DE UTILIDAD PARA TASKS


// Verificar si una tarea está vencida
export function isTaskOverdue(task: Task): boolean {
  const fechaProgramada = task.fechaProgramada instanceof Date 
    ? task.fechaProgramada 
    : new Date(task.fechaProgramada);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return task.estado !== 'completada' && fechaProgramada < hoy;
}

// Calcular el saldo restante de una tarea
export function calculateSaldoRestante(task: Task): number {
  const abonado = (task.montoAbonado || 0) + (task.anticipoRecibido || 0);
  return task.monto - abonado;
}

// Obtener el estado de pago como string legible
export function getPaymentStatusText(paymentStatus: PaymentStatus): string {
  const statusMap = {
    'pagado': 'Pagado',
    'no_pagado': 'No pagado',
    'abono': 'Con abono'
  };
  return statusMap[paymentStatus];
}

// Obtener el texto de prioridad
export function getPriorityText(priority: TaskPriority): string {
  const priorityMap = {
    1: 'Baja',
    2: 'Media',
    3: 'Alta'
  };
  return priorityMap[priority];
}

// Obtener la clase CSS para prioridad
export function getPriorityClass(priority: TaskPriority): string {
  const classMap = {
    1: 'baja',
    2: 'media',
    3: 'alta'
  };
  return classMap[priority];
}

// Obtener el texto del estado de la tarea
export function getTaskStatusText(status: TaskStatus): string {
  const statusMap = {
    'pendiente': 'Pendiente',
    'en_progreso': 'En progreso',
    'completada': 'Completada',
    'vencida': 'Vencida'
  };
  return statusMap[status];
}

// Obtener la clase CSS para el estado
export function getTaskStatusClass(status: TaskStatus): string {
  const classMap = {
    'pendiente': 'status-pendiente',
    'en_progreso': 'status-progreso',
    'completada': 'status-completada',
    'vencida': 'status-vencida'
  };
  return classMap[status];
}


// CONSTANTES PARA FORMULARIOS


export const PRIORITY_OPTIONS = [
  { value: 1, label: 'Baja' },
  { value: 2, label: 'Media' },
  { value: 3, label: 'Alta' }
];

export const STATUS_OPTIONS = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'en_progreso', label: 'En progreso' },
  { value: 'completada', label: 'Completada' }
];

export const PAYMENT_OPTIONS = [
  { value: 'no_pagado', label: 'No pagado' },
  { value: 'abono', label: 'Abono' },
  { value: 'pagado', label: 'Pagado' }
];

export const PLAN_COBRO_OPTIONS = [
  { value: 'al_finalizar', label: 'Al finalizar' },
  { value: 'anticipo', label: 'Anticipo' },
  { value: 'contado', label: 'Contado' },
  { value: 'no_cobrar', label: 'No cobrar' }
];