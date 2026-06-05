import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TasksService } from '../../../core/services/tasks.service';
import { AuthService } from '../../../core/services/auth.service';
import { Task, getPriorityText, getPriorityClass, isTaskOverdue } from '../../../core/models/task.model';
import { User } from '../../../core/models/user.model';

@Component({
  selector: 'app-upcoming-services',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './upcoming-services.component.html',
  styleUrl: './upcoming-services.component.scss'
})
export class UpcomingServicesComponent implements OnInit {
  private tasksService = inject(TasksService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  tasks: Task[] = [];
  currentUser: User | null = null;
  isAdmin = false;
  today = new Date();

  ngOnInit() {
    this.authService.getCurrentUserData().then(u => {
      this.currentUser = u;
      this.isAdmin = u?.rol === 'admin';

      const obs = this.isAdmin
        ? this.tasksService.getAllTasks()
        : this.tasksService.getTasksByUser(u!.uid);

      obs.subscribe(t => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        this.tasks = t
          .map(task => ({
            ...task,
            materiales: task.materiales || [],
            equiposNumeroDeSerie: task.equiposNumeroDeSerie || [],
            fechaProgramada: this.normalizeDate(task.fechaProgramada),
            creadoEn: this.normalizeDate(task.creadoEn),
          }))
          .filter(task => {
            if (task.estado === 'completada') return false;
            const fecha = this.normalizeDate(task.fechaProgramada);
            fecha.setHours(0, 0, 0, 0);
            return fecha >= tomorrow;
          })
          .sort((a, b) =>
            this.normalizeDate(a.fechaProgramada).getTime() - this.normalizeDate(b.fechaProgramada).getTime()
          );

        this.cdr.detectChanges();
      });
    });
  }

  // Método auxiliar para normalizar fechas (string | Date | Firebase Timestamp)
  private normalizeDate(fecha: any): Date {
    if (!fecha) return new Date();
    if (fecha instanceof Date) return fecha;
    if (typeof fecha === 'string') return new Date(fecha);
    if (fecha.toDate && typeof fecha.toDate === 'function') return fecha.toDate();
    return new Date(fecha);
  }

  // ── Métodos de fechas ──────────────────────────────────────
  getDateLabel(fecha: any): string {
    const d = this.normalizeDate(fecha);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const manana = new Date(hoy);
    manana.setDate(hoy.getDate() + 1);
    
    d.setHours(0, 0, 0, 0);

    if (d.getTime() === hoy.getTime()) return 'Hoy';
    if (d.getTime() === manana.getTime()) return 'Mañana';

    const diff = Math.floor((d.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return 'Vencido';
    return d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  getDateClass(fecha: any): string {
    const d = this.normalizeDate(fecha);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const manana = new Date(hoy);
    manana.setDate(hoy.getDate() + 1);
    
    d.setHours(0, 0, 0, 0);

    if (d.getTime() === hoy.getTime()) return 'hoy';
    if (d.getTime() === manana.getTime()) return 'manana';
    if (d.getTime() < hoy.getTime()) return 'vencido';
    return 'programado';
  }

  // ── Métodos de prioridad usando el modelo ───────────────────
  getPriorityLabel(priority: number): string {
    return getPriorityText(priority as 1|2|3);
  }

  getPriorityClass(priority: number): string {
    return getPriorityClass(priority as 1|2|3);
  }

  // ── Método para verificar si está vencida usando el modelo ──
  isTaskOverdue(task: Task): boolean {
    return isTaskOverdue(task);
  }

  // ── Formato de hora ────────────────────────────────────────
  formatHora(hora: string): string {
    if (!hora) return '';
    const [h, m] = hora.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
  }

  // ── Navegación ─────────────────────────────────────────────
  openTask(id: string) { 
    this.router.navigate(['/tasks', id]); 
  }
  
  goBack() { 
    history.back(); 
  }

  // ── Getters ────────────────────────────────────────────────
  get totalProximos() { 
    return this.tasks.length; 
  }
  
  get vencidos() { 
    return this.tasks.filter(t => this.getDateClass(t.fechaProgramada) === 'vencido').length; 
  }
}