import { Injectable } from '@angular/core';
import {
  collection, doc, addDoc, updateDoc,
  deleteDoc, query, where, orderBy, getDoc, getDocs
} from 'firebase/firestore';
import { collectionData } from 'rxfire/firestore';
import { firebaseDb } from '../../app.config';
import { Observable } from 'rxjs';
import { Task } from '../models/task.model';
import { collectionData as rxCollectionData } from 'rxfire/firestore';

@Injectable({ providedIn: 'root' })
export class TasksService {

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

 async createTask(task: Omit<Task, 'id'>): Promise<string> {
  const folioId = this.generateFolioId();
  const ref = await addDoc(collection(firebaseDb, 'tasks'), { ...task, folioId });
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

private generateFolioId(): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `FOL-${timestamp}-${random}`;
}
}