import { Injectable } from '@angular/core';
import { collection, query, where } from 'firebase/firestore';
import { collectionData } from 'rxfire/firestore';
import { firebaseDb } from '../../app.config';
import { Observable } from 'rxjs';
import { User } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class UsersService {

  getAllUsers(): Observable<User[]> {
    return collectionData(
      collection(firebaseDb, 'users'),
      { idField: 'uid' }
    ) as Observable<User[]>;
  }

  getTechnicians(): Observable<User[]> {
    return collectionData(
      query(collection(firebaseDb, 'users'), where('rol', '==', 'user')),
      { idField: 'uid' }
    ) as Observable<User[]>;
  }
}