import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { firebaseAuth, firebaseDb } from '../../app.config';
import { User } from '../models/user.model';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private currentUserSubject = new BehaviorSubject<FirebaseUser | null>(null);
  currentUser$ = this.currentUserSubject.asObservable();

  constructor(private router: Router) {
    onAuthStateChanged(firebaseAuth, user => {
      this.currentUserSubject.next(user);
    });
  }

  async login(email: string, password: string): Promise<void> {
    const credential = await signInWithEmailAndPassword(firebaseAuth, email, password);
    const rol = await this.getUserRol(credential.user.uid);
    if (rol === 'admin') {
      this.router.navigate(['/admin']);
    } else {
      this.router.navigate(['/dashboard']);
    }
  }

  async register(email: string, password: string, nombre: string, rol: 'admin' | 'user' = 'user'): Promise<void> {
    const credential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
    const newUser: User = {
      uid: credential.user.uid,
      nombre,
      email,
      rol,
      createdAt: new Date()
    };
    await setDoc(doc(firebaseDb, `users/${credential.user.uid}`), newUser);
  }

async logout(): Promise<void> {
  await signOut(firebaseAuth);
  this.router.navigate(['/login']);
}

  async getUserRol(uid: string): Promise<string> {
    const snap = await getDoc(doc(firebaseDb, `users/${uid}`));
    return snap.data()?.['rol'] ?? 'user';
  }

 async getCurrentUserData(): Promise<User | null> {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (u) => {
      unsubscribe();
      if (!u) { resolve(null); return; }
      const snap = await getDoc(doc(firebaseDb, `users/${u.uid}`));
      resolve(snap.exists() ? snap.data() as User : null);
    });
  });
}
}