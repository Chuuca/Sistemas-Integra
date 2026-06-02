import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { UsersService } from '../../../core/services/users.service';
import { User } from '../../../core/models/user.model';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss'
})
export class UsersComponent implements OnInit {
  private authService = inject(AuthService);
  private usersService = inject(UsersService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  users: User[] = [];
  currentUser: User | null = null;
  showModal = false;
  loading = false;
  error = '';
  success = '';

  form = {
    nombre: '',
    email: '',
    password: '',
    rol: 'user' as 'admin' | 'user'
  };

  ngOnInit() {
    this.authService.getCurrentUserData().then(u => {
      this.currentUser = u;
      this.cdr.detectChanges();
    });

    this.usersService.getAllUsers().subscribe(u => {
      this.users = u;
      this.cdr.detectChanges();
    });
  }

  openModal() {
    this.form = { nombre: '', email: '', password: '', rol: 'user' };
    this.error = '';
    this.success = '';
    this.showModal = true;
  }

  closeModal() { this.showModal = false; }

  async createUser() {
    if (!this.form.nombre || !this.form.email || !this.form.password) {
      this.error = 'Completa todos los campos.';
      return;
    }
    if (this.form.password.length < 6) {
      this.error = 'La contraseña debe tener al menos 6 caracteres.';
      return;
    }
    this.loading = true;
    this.error = '';
    try {
      await this.authService.register(
        this.form.email,
        this.form.password,
        this.form.nombre,
        this.form.rol
      );
      this.success = `Usuario ${this.form.nombre} creado correctamente.`;
      this.form = { nombre: '', email: '', password: '', rol: 'user' };
      setTimeout(() => this.closeModal(), 1500);
    } catch (e: any) {
      this.error = e.code === 'auth/email-already-in-use'
        ? 'Ya existe un usuario con ese correo.'
        : 'Error al crear el usuario.';
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  getRolClass(rol: string) {
    return rol === 'admin' ? 'badge-admin' : 'badge-user';
  }

  goBack() { this.router.navigate(['/admin']); }
  logout() { this.authService.logout(); }
}