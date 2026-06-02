import { Injectable } from '@angular/core';
import { collection, doc, setDoc, getDoc, query, where, getDocs } from 'firebase/firestore';
import { firebaseDb } from '../../app.config';
import { WorkOrder } from '../models/work-order.model';

@Injectable({ providedIn: 'root' })
export class WorkOrderService {

  async save(id: string, data: Partial<WorkOrder>): Promise<void> {
    const ref = doc(firebaseDb, 'work_orders', id);
    await setDoc(ref, { ...data, actualizadoEn: new Date() }, { merge: true });
  }

  async get(id: string): Promise<WorkOrder | null> {
    const snap = await getDoc(doc(firebaseDb, 'work_orders', id));
    return snap.exists() ? { id: snap.id, ...snap.data() } as WorkOrder : null;
  }

  async getByTarea(tareaId: string): Promise<WorkOrder[]> {
    const q = query(collection(firebaseDb, 'work_orders'), where('tareaId', '==', tareaId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as WorkOrder));
  }

  async update(id: string, data: Partial<WorkOrder>): Promise<void> {
    await this.save(id, data);
  }
}