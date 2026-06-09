export interface Attendance {
  id?: string;
  uid: string;
  nombre: string;
  fecha: string; // yyyy-MM-dd
  entrada?: Date;
  salida?: Date;
  estado: 'offline' | 'en_sitio' | 'traslado' | 'disponible';
  tareaActivaId?: string;
  tareaActivaCliente?: string;
  tiempoEnSitio?: number; // minutos
}