import { Component, inject, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
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
  private ngZone = inject(NgZone);

  users: User[] = [];
  currentUser: User | null = null;
  showModal = false;
  showEditModal = false;
  editingUser: User | null = null;
  loading = false;
  error = '';
  success = '';

  form = {
    nombre: '',
    email: '',
    password: '',
    rol: 'user' as 'admin' | 'user'
  };

  editForm = {
    nombre: '',
    email: '',
    rol: 'user' as 'admin' | 'user'
  };

  ngOnInit() {
    this.authService.getCurrentUserData().then(u => {
      this.currentUser = u;
      this.cdr.detectChanges();
    });

    this.usersService.getAllUsers().subscribe(u => {
      this.ngZone.run(() => {
        this.users = u;
        this.cdr.detectChanges();
      });
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

  openEditModal(user: User) {
    this.editingUser = user;
    this.editForm = {
      nombre: user.nombre || '',
      email:  user.email  || '',
      rol:    user.rol    || 'user'
    };
    this.error = '';
    this.success = '';
    this.showEditModal = true;
  }

  closeEditModal() {
    this.showEditModal = false;
    this.editingUser = null;
  }

  async saveEdit() {
    if (!this.editingUser) return;
    if (!this.editForm.nombre.trim()) {
      this.error = 'El nombre es obligatorio.';
      return;
    }
    this.loading = true;
    this.error = '';
    try {
      await this.usersService.updateUser(this.editingUser.uid, {
        nombre: this.editForm.nombre.trim(),
        email:  this.editForm.email.trim(),
        rol:    this.editForm.rol
      });
      this.success = 'Usuario actualizado correctamente.';
      setTimeout(() => this.closeEditModal(), 1200);
    } catch (e) {
      this.error = 'Error al guardar los cambios.';
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  async toggleSuspend(user: User) {
    const accion = user.suspendido ? 'reactivar' : 'suspender';
    if (!confirm(`¿Seguro que quieres ${accion} a ${user.nombre || user.email}?`)) return;
    try {
      await this.usersService.suspendUser(user.uid, !user.suspendido);
    } catch (e) {
      alert('Error al cambiar el estado del usuario.');
    }
  }

  async confirmDelete(user: User) {
    if (!confirm(`⚠️ ¿Eliminar permanentemente a ${user.nombre || user.email}? Esta acción no se puede deshacer.`)) return;
    try {
      await this.usersService.deleteUser(user.uid);
    } catch (e) {
      alert('Error al eliminar el usuario.');
    }
  }

  getRolClass(rol: string) {
    return rol === 'admin' ? 'badge-admin' : 'badge-user';
  }

  goBack() { this.router.navigate(['/admin']); }
  logout() { this.authService.logout(); }
}