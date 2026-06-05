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
  private readonly EMAILJS_TEMPLATE_TAREA = 'template_qjs6sns';  // ✅ Actualizado
  private readonly EMAILJS_PUBLIC_KEY = 'XEGieclndH5Y3ZVp_';

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

  async createTask(task: Omit<Task, 'id' | 'folioId'>): Promise<string> {
    const folioId = await this.generateFolioId();
    const taskWithFolio = { ...task, folioId };
    const ref = await addDoc(collection(firebaseDb, 'tasks'), taskWithFolio);
    
    // Enviar notificaciones por email a los técnicos asignados
    await this.enviarNotificacionNuevaTarea({
      id: ref.id,
      folioId,
      cliente: task.cliente,
      asignadoA: task.asignadoA,
      asignadoNombre: task.asignadoNombre,
      fechaProgramada: task.fechaProgramada,
      direccion: task.direccion
    });
    
    return ref.id;
  }

  async updateTask(id: string, data: Partial<Task>): Promise<void> {
    await updateDoc(doc(firebaseDb, `tasks/${id}`), data as any);
  }

  async deleteTask(id: string): Promise<void> {
    await deleteDoc(doc(firebaseDb, `tasks/${id}`));
  }

  async getTask(id: string): Promise<Task | null> {
    const snap = await getDoc(doc(firebaseDb, `tasks/${id}`));
    return snap.exists() ? { id: snap.id, ...snap.data() } as Task : null;
  }

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

  // ──────────────────────────────────────────────────────────────
  // Folio secuencial
  // ──────────────────────────────────────────────────────────────

  private async generateFolioId(): Promise<string> {
    const counterRef = doc(firebaseDb, 'counters', 'folio');
    const num = await runTransaction(firebaseDb, async (tx) => {
      const snap = await tx.get(counterRef);
      const current = snap.exists() ? (snap.data()['value'] as number) : 2799;
      const next = current + 1;
      tx.set(counterRef, { value: next });
      return next;
    });
    return `SI${num}`;
  }

  async getUltimoFolio(): Promise<string> {
    const counterRef = doc(firebaseDb, 'counters', 'folio');
    const snap = await getDoc(counterRef);
    const current = snap.exists() ? (snap.data()['value'] as number) : 2799;
    return `SI${current}`;
  }

  async reiniciarContadorFolio(nuevoValor: number = 2800): Promise<void> {
    const counterRef = doc(firebaseDb, 'counters', 'folio');
    await setDoc(counterRef, { value: nuevoValor - 1 });
  }

  // ──────────────────────────────────────────────────────────────
  // Notificaciones por Email
  // ──────────────────────────────────────────────────────────────

  private async enviarNotificacionNuevaTarea(data: {
    id: string;
    folioId: string;
    cliente: string;
    asignadoA: string[];
    asignadoNombre: string[];
    fechaProgramada: Date | string;
    direccion: string;
  }): Promise<void> {
    // Obtener emails de los técnicos asignados
    const users = await this.getUsers();
    const emails = users
      .filter(u => data.asignadoA.includes(u.uid) && u.email)
      .map(u => u.email);

    if (emails.length === 0) return;

    const fechaFormateada = data.fechaProgramada 
      ? new Date(data.fechaProgramada).toLocaleDateString('es-MX')
      : 'Fecha no especificada';

    // Enviar a cada técnico
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
  }

  async enviarNotificacionEstadoTarea(taskId: string, nuevoEstado: string): Promise<void> {
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
  }

  // ──────────────────────────────────────────────────────────────
  // Cronómetro persistente
  // ──────────────────────────────────────────────────────────────

  async marcarInicioTarea(taskId: string): Promise<void> {
    await updateDoc(doc(firebaseDb, `tasks/${taskId}`), {
      tiempoInicio: new Date(),
      estado: 'en_progreso',
      ultimaActualizacionCrono: new Date()
    });
  }

  async marcarPausaTarea(taskId: string): Promise<void> {
    const taskRef = doc(firebaseDb, `tasks/${taskId}`);
    const snap = await getDoc(taskRef);
    const data = snap.data();
    
    if (data?.['tiempoInicio']) {
      const inicio = data['tiempoInicio'].toDate();
      const transcurrido = (new Date().getTime() - inicio.getTime()) / 1000;
      const tiempoActual = (data?.['tiempoTotal'] || 0) + transcurrido;
      
      await updateDoc(taskRef, {
        tiempoTotal: tiempoActual,
        tiempoInicio: null,
        estado: 'pendiente'
      });
    }
  }

  async finalizarTarea(taskId: string): Promise<void> {
    const taskRef = doc(firebaseDb, `tasks/${taskId}`);
    const snap = await getDoc(taskRef);
    const data = snap.data();
    
    let tiempoFinal = data?.['tiempoTotal'] || 0;
    
    if (data?.['tiempoInicio']) {
      const inicio = data['tiempoInicio'].toDate();
      tiempoFinal += (new Date().getTime() - inicio.getTime()) / 1000;
    }
    
    await updateDoc(taskRef, {
      tiempoTotal: tiempoFinal,
      tiempoInicio: null,
      estado: 'completada',
      completadoEn: new Date()
    });
  }

  async getTiempoActual(taskId: string): Promise<number> {
    const snap = await getDoc(doc(firebaseDb, `tasks/${taskId}`));
    const data = snap.data();
    let total = data?.['tiempoTotal'] || 0;
    
    if (data?.['tiempoInicio']) {
      const inicio = data['tiempoInicio'].toDate();
      total += (new Date().getTime() - inicio.getTime()) / 1000;
    }
    return total;
  }
}