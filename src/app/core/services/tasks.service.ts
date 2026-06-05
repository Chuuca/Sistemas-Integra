import { Injectable } from '@angular/core';
import {
  collection, doc, addDoc, updateDoc,
  deleteDoc, query, where, getDoc, getDocs,
  runTransaction, setDoc
} from 'firebase/firestore';
import { collectionData } from 'rxfire/firestore';
import { firebaseDb } from '../../app.config';
import { Observable } from 'rxjs';
import { Task } from '../models/task.model';
import emailjs from '@emailjs/browser';

@Injectable({ providedIn: 'root' })
export class TasksService {

  private readonly EMAILJS_SERVICE_ID = 'service_2hdign8';
  private readonly EMAILJS_TEMPLATE_TAREA = 'template_qjs6sns';
  private readonly EMAILJS_PUBLIC_KEY = 'XEGieclndH5Y3ZVp_';

  // OBTENER TAREAS
  getAllTasks(): Observable<Task[]> {
    const q = query(collection(firebaseDb, 'tasks'));
    return collectionData(q, { idField: 'id' }) as Observable<Task[]>;
  }

  getTasksByUser(uid: string): Observable<Task[]> {
    const q = query(
      collection(firebaseDb, 'tasks'),
      where('asignadoA', 'array-contains', uid)
    );
    return collectionData(q, { idField: 'id' }) as Observable<Task[]>;
  }

  getTasksByUserAndDate(uid: string, fecha: Date): Observable<Task[]> {
    const inicio = new Date(fecha);
    inicio.setHours(0, 0, 0, 0);
    const fin = new Date(fecha);
    fin.setHours(23, 59, 59, 999);
    
    const q = query(
      collection(firebaseDb, 'tasks'),
      where('asignadoA', 'array-contains', uid),
      where('fechaProgramada', '>=', inicio),
      where('fechaProgramada', '<=', fin)
    );
    return collectionData(q, { idField: 'id' }) as Observable<Task[]>;
  }

  async getTask(id: string): Promise<Task | null> {
    const snap = await getDoc(doc(firebaseDb, `tasks/${id}`));
    return snap.exists() ? { id: snap.id, ...snap.data() } as Task : null;
  }

  // LIMPIAR OBJETO (eliminar undefined)
  private cleanObject(obj: any): any {
    const cleaned: any = {};
    for (const key in obj) {
      if (obj[key] !== undefined && obj[key] !== null) {
        cleaned[key] = obj[key];
      }
    }
    return cleaned;
  }

  // CREAR TAREA (CORREGIDO - sin undefined)
  async createTask(taskData: Omit<Task, 'id'>): Promise<string> {
    try {
      const folioId = await this.generateFolioId();
      
      const taskWithDefaults = {
        folioId: folioId,
        cliente: taskData.cliente || '',
        direccion: taskData.direccion || '',
        telefono: taskData.telefono || '',
        descripcion: taskData.descripcion || '',
        prioridad: taskData.prioridad || 1,
        asignadoA: taskData.asignadoA || [],
        asignadoNombre: taskData.asignadoNombre || [],
        estado: taskData.estado || 'pendiente',
        pago: taskData.pago || 'no_pagado',
        monto: taskData.monto || 0,
        montoAbonado: taskData.montoAbonado || 0,
        anticipoRecibido: taskData.anticipoRecibido || 0,
        saldoRestante: taskData.saldoRestante || 0,
        duracionEstimada: taskData.duracionEstimada || 0,
        tiempoTotal: taskData.tiempoTotal || 0,
        horaProgramada: taskData.horaProgramada || '09:00',
        materiales: taskData.materiales || [],
        herramientasEspeciales: taskData.herramientasEspeciales || [],
        equipos: taskData.equipos || [],
        equiposNumeroDeSerie: taskData.equiposNumeroDeSerie || [],
        notas: taskData.notas || '',
        planCobro: taskData.planCobro || 'al_finalizar',
        fechaProgramada: this.normalizeDateForFirestore(taskData.fechaProgramada),
        creadoEn: new Date(),
        creadoPor: taskData.creadoPor || ''
      };
      
      const cleanTask = this.cleanObject(taskWithDefaults);
      const ref = await addDoc(collection(firebaseDb, 'tasks'), cleanTask);
      
      try {
        await this.enviarNotificacionNuevaTarea({
          id: ref.id,
          folioId,
          cliente: taskData.cliente || '',
          asignadoA: taskData.asignadoA || [],
          asignadoNombre: taskData.asignadoNombre || [],
          fechaProgramada: taskData.fechaProgramada || new Date(),
          direccion: taskData.direccion || ''
        });
      } catch (emailError) {
        console.warn('Error enviando notificación (no crítico):', emailError);
      }
      
      return ref.id;
    } catch (error) {
      console.error('Error al crear tarea:', error);
      throw error;
    }
  }

  // ACTUALIZAR Y ELIMINAR
  async updateTask(id: string, data: Partial<Task>): Promise<void> {
    try {
      const updateData: any = { ...data };
      
      if (updateData.fechaProgramada) {
        updateData.fechaProgramada = this.normalizeDateForFirestore(updateData.fechaProgramada);
      }
      if (updateData.creadoEn) {
        updateData.creadoEn = this.normalizeDateForFirestore(updateData.creadoEn);
      }
      if (updateData.completadoEn) {
        updateData.completadoEn = this.normalizeDateForFirestore(updateData.completadoEn);
      }
      
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });
      
      await updateDoc(doc(firebaseDb, `tasks/${id}`), updateData);
    } catch (error) {
      console.error('Error al actualizar tarea:', error);
      throw error;
    }
  }

  async deleteTask(id: string): Promise<void> {
    try {
      await deleteDoc(doc(firebaseDb, `tasks/${id}`));
    } catch (error) {
      console.error('Error al eliminar tarea:', error);
      throw error;
    }
  }

  // UTILIDADES DE FECHAS
  private normalizeDateForFirestore(date: any): Date {
    if (!date) return new Date();
    if (date instanceof Date) return date;
    if (typeof date === 'string') return new Date(date);
    if (date.toDate && typeof date.toDate === 'function') return date.toDate();
    return new Date(date);
  }

  // ELIMINAR TAREAS VIEJAS
  async deleteOldCompletedTasks(): Promise<void> {
    const unMesAtras = new Date();
    unMesAtras.setMonth(unMesAtras.getMonth() - 1);

    const snap = await getDocs(
      query(
        collection(firebaseDb, 'tasks'),
        where('estado', '==', 'completada')
      )
    );

    const batch: Promise<void>[] = [];
    snap.forEach(docSnap => {
      const data = docSnap.data();
      const completadoEn = data['completadoEn']?.toDate?.();
      if (completadoEn && completadoEn < unMesAtras) {
        batch.push(deleteDoc(doc(firebaseDb, `tasks/${docSnap.id}`)));
      }
    });

    await Promise.all(batch);
  }

  // OBTENER USUARIOS
  async getUsers(): Promise<{ uid: string; nombre: string; email: string; rol: string }[]> {
    const snap = await getDocs(collection(firebaseDb, 'users'));
    const users: { uid: string; nombre: string; email: string; rol: string }[] = [];
    snap.forEach(d => {
      const data = d.data();
      users.push({
        uid: d.id,
        nombre: data['nombre'] ?? '',
        email: data['email'] ?? '',
        rol: data['rol'] ?? '',
      });
    });
    return users;
  }

  // FOLIO SECUENCIAL
private async generateFolioId(): Promise<string> {
  const counterRef = doc(firebaseDb, 'counters', 'folio');
  
  try {
    const result = await runTransaction(firebaseDb, async (transaction) => {
      const snapshot = await transaction.get(counterRef);
      
      let currentValue = 1;
      
      if (snapshot.exists()) {
        currentValue = snapshot.data()?.['value'] || 1;
      } else {
        transaction.set(counterRef, { value: currentValue });
      }
      
      const nextValue = currentValue + 1;
      transaction.update(counterRef, { value: nextValue });
      
      return nextValue;
    });
    
    const padded = result.toString().padStart(3, '0'); // 001, 002, 003
    return `S${padded}`; // S001, S002
  } catch (error) {
    console.error('Error generando folio:', error);
    return `S${Date.now().toString().slice(-3)}`;
  }
}

  async getUltimoFolio(): Promise<string> {
    try {
      const counterRef = doc(firebaseDb, 'counters', 'folio');
      const snap = await getDoc(counterRef);
      const current = snap.exists() ? (snap.data()['value'] as number) : 2800;
      return `SI${current}`;
    } catch (error) {
      console.error('Error obteniendo último folio:', error);
      return `SI${Date.now()}`;
    }
  }

  async reiniciarContadorFolio(nuevoValor: number = 2800): Promise<void> {
    try {
      const counterRef = doc(firebaseDb, 'counters', 'folio');
      await setDoc(counterRef, { value: nuevoValor - 1 });
    } catch (error) {
      console.error('Error reiniciando contador:', error);
      throw error;
    }
  }

  // NOTIFICACIONES POR EMAIL
  private async enviarNotificacionNuevaTarea(data: {
    id: string;
    folioId: string;
    cliente: string;
    asignadoA: string[];
    asignadoNombre: string[];
    fechaProgramada: Date | string;
    direccion: string;
  }): Promise<void> {
    try {
      const users = await this.getUsers();
      const emails = users
        .filter(u => data.asignadoA.includes(u.uid) && u.email)
        .map(u => u.email);

      if (emails.length === 0) return;

      const fechaFormateada = data.fechaProgramada 
        ? new Date(data.fechaProgramada).toLocaleDateString('es-MX')
        : 'Fecha no especificada';

      for (const email of emails) {
        try {
          await emailjs.send(
            this.EMAILJS_SERVICE_ID,
            this.EMAILJS_TEMPLATE_TAREA,
            {
              to_email: email,
              folio: data.folioId,
              cliente: data.cliente,
              fecha: fechaFormateada,
              direccion: data.direccion,
              link: `https://tuapp.com/tasks/${data.id}`,
              tipo: 'nueva_tarea'
            },
            this.EMAILJS_PUBLIC_KEY
          );
          console.log(`Notificación enviada a ${email}`);
        } catch (e) {
          console.error(`Error enviando notificación a ${email}:`, e);
        }
      }
    } catch (error) {
      console.error('Error en enviarNotificacionNuevaTarea:', error);
    }
  }

  async enviarNotificacionEstadoTarea(taskId: string, nuevoEstado: string): Promise<void> {
    try {
      const task = await this.getTask(taskId);
      if (!task) return;

      const users = await this.getUsers();
      const emails = users
        .filter(u => task.asignadoA.includes(u.uid) && u.email)
        .map(u => u.email);

      const estadoTexto = nuevoEstado === 'completada' ? 'COMPLETADA' 
                        : nuevoEstado === 'en_progreso' ? 'EN PROGRESO' 
                        : 'PENDIENTE';

      for (const email of emails) {
        try {
          await emailjs.send(
            this.EMAILJS_SERVICE_ID,
            this.EMAILJS_TEMPLATE_TAREA,
            {
              to_email: email,
              folio: task.folioId,
              cliente: task.cliente,
              estado: estadoTexto,
              tipo: 'cambio_estado'
            },
            this.EMAILJS_PUBLIC_KEY
          );
        } catch (e) {
          console.error(`Error enviando notificación de estado a ${email}:`, e);
        }
      }
    } catch (error) {
      console.error('Error en enviarNotificacionEstadoTarea:', error);
    }
  }

  // CRONÓMETRO PERSISTENTE
async marcarInicioTarea(taskId: string): Promise<void> {
  try {
    const taskRef = doc(firebaseDb, `tasks/${taskId}`);
    const snap = await getDoc(taskRef);
    const data = snap.data();
    
    // Verificar si ya está en progreso
    if (data?.['tiempoInicio']) {
      console.log('La tarea ya está en progreso');
      return;
    }
    
    const updateData = {
      tiempoInicio: new Date(),
      estado: 'en_progreso',
      ultimaActualizacionCrono: new Date()
    };
    
    await updateDoc(taskRef, updateData);
    console.log('Tarea iniciada correctamente');
  } catch (error) {
    console.error('Error al marcar inicio de tarea:', error);
    throw error;
  }
}

  async marcarPausaTarea(taskId: string): Promise<void> {
    try {
      const taskRef = doc(firebaseDb, `tasks/${taskId}`);
      const snap = await getDoc(taskRef);
      const data = snap.data();
      
      if (data?.['tiempoInicio']) {
        const inicio = data['tiempoInicio'].toDate();
        const transcurrido = (new Date().getTime() - inicio.getTime()) / 1000;
        const tiempoActual = (data?.['tiempoTotal'] || 0) + transcurrido;
        
        const updateData = {
          tiempoTotal: tiempoActual,
          tiempoInicio: null,
          estado: 'pendiente'
        };
        
        await updateDoc(taskRef, updateData);
      }
    } catch (error) {
      console.error('Error al marcar pausa de tarea:', error);
      throw error;
    }
  }

  async finalizarTarea(taskId: string): Promise<void> {
    try {
      const taskRef = doc(firebaseDb, `tasks/${taskId}`);
      const snap = await getDoc(taskRef);
      const data = snap.data();
      
      let tiempoFinal = data?.['tiempoTotal'] || 0;
      
      if (data?.['tiempoInicio']) {
        const inicio = data['tiempoInicio'].toDate();
        tiempoFinal += (new Date().getTime() - inicio.getTime()) / 1000;
      }
      
      const updateData = {
        tiempoTotal: tiempoFinal,
        tiempoInicio: null,
        estado: 'completada',
        completadoEn: new Date()
      };
      
      await updateDoc(taskRef, updateData);
    } catch (error) {
      console.error('Error al finalizar tarea:', error);
      throw error;
    }
  }

  async getTiempoActual(taskId: string): Promise<number> {
    try {
      const snap = await getDoc(doc(firebaseDb, `tasks/${taskId}`));
      const data = snap.data();
      let total = data?.['tiempoTotal'] || 0;
      
      if (data?.['tiempoInicio']) {
        const inicio = data['tiempoInicio'].toDate();
        total += (new Date().getTime() - inicio.getTime()) / 1000;
      }
      return total;
    } catch (error) {
      console.error('Error al obtener tiempo actual:', error);
      return 0;
    }
  }
}