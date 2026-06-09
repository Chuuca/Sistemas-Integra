import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent {
  private auth = inject(AuthService);

  nombre = '';
  email = '';
  password = '';
  confirmPassword = '';
  showPassword = false;
  loading = false;
  error = '';
  success = '';

  async onRegister() {
    if (!this.nombre || !this.email || !this.password) {
      this.error = 'Por favor completa todos los campos.';
      return;
    }
    if (this.password !== this.confirmPassword) {
      this.error = 'Las contraseñas no coinciden.';
      return;
    }
    if (this.password.length < 6) {
      this.error = 'La contraseña debe tener al menos 6 caracteres.';
      return;
    }
    this.loading = true;
    this.error = '';
    try {
      await this.auth.register(this.email, this.password, this.nombre, 'user');
      this.success = '¡Cuenta creada! Redirigiendo...';
    } catch (e: any) {
      this.error = e.code === 'auth/email-already-in-use'
        ? 'Ya existe una cuenta con ese correo.'
        : 'Error al crear la cuenta.';
    } finally {
      this.loading = false;
    }
  }
}