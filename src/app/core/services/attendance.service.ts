import { Injectable } from '@angular/core';
import { collection, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { collectionData } from 'rxfire/firestore';
import { Observable } from 'rxjs';
import { firebaseDb } from '../../app.config';
import { Attendance } from '../models/attendance.model';

@Injectable({ providedIn: 'root' })
export class AttendanceService {

  private getTodayStr(): string {
    return new Date().toLocaleDateString('en-CA');
  }

  private getDocId(uid: string): string {
    return `${uid}_${this.getTodayStr()}`;
  }

async getToday(uid: string): Promise<Attendance | null> {
  const docId = this.getDocId(uid);
  const snap = await getDoc(doc(firebaseDb, 'attendance', docId));
  if (!snap.exists()) return null;
  const data = snap.data() as any;
  return {
    ...data,
    entrada: data.entrada?.toDate?.() ?? data.entrada,
    salida: data.salida?.toDate?.() ?? data.salida,
  } as Attendance;
}

async checkIn(uid: string, nombre: string): Promise<void> {
  const docId = this.getDocId(uid);
  const docRef = doc(firebaseDb, 'attendance', docId);
  await setDoc(docRef, {
    uid,
    nombre,
    fecha: this.getTodayStr(),
    entrada: new Date(),
    estado: 'disponible'
  });
}
  async checkOut(uid: string): Promise<void> {
    const docId = this.getDocId(uid);
    await updateDoc(doc(firebaseDb, 'attendance', docId), {
      salida: new Date(),
      estado: 'offline'
    });
  }

  async updateEstado(uid: string, estado: Attendance['estado'], tareaActivaId?: string, tareaActivaCliente?: string): Promise<void> {
    const docId = this.getDocId(uid);
    const data: any = { estado };
    if (tareaActivaId) data.tareaActivaId = tareaActivaId;
    if (tareaActivaCliente) data.tareaActivaCliente = tareaActivaCliente;
    if (estado === 'traslado') {
      data.tareaActivaId = '';
      data.tareaActivaCliente = '';
    }
    await updateDoc(doc(firebaseDb, 'attendance', docId), data);
  }

  getTodayAll(): Observable<Attendance[]> {
    const today = new Date().toLocaleDateString('en-CA');
    const q = query(
      collection(firebaseDb, 'attendance'),
      where('fecha', '==', today)
    );
    return collectionData(q, { idField: 'id' }) as Observable<Attendance[]>;
  }
}