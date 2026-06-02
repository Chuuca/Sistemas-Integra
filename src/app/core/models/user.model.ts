export interface User {
  uid: string;
  nombre: string;
  email: string;
  rol: 'admin' | 'user';
  avatar?: string;
  createdAt: Date;
}