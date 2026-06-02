import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  email = '';
  password = '';
  showPassword = false;
  loading = false;
  error = '';

  async onLogin() {
    if (!this.email || !this.password) {
      this.error = 'Por favor completa todos los campos.';
      return;
    }
    this.loading = true;
    this.error = '';
    try {
      await this.auth.login(this.email, this.password);
    } catch (e: any) {
      this.error = this.getErrorMsg(e.code);
    } finally {
      this.loading = false;
    }
  }

  getErrorMsg(code: string): string {
    const msgs: Record<string, string> = {
      'auth/user-not-found':  'No existe una cuenta con ese correo.',
      'auth/wrong-password':  'Contraseña incorrecta.',
      'auth/invalid-email':   'Correo electrónico inválido.',
      'auth/too-many-requests': 'Demasiados intentos. Intenta más tarde.',
      'auth/invalid-credential': 'Credenciales incorrectas.'
    };
    return msgs[code] ?? 'Error al iniciar sesión.';
  }
}