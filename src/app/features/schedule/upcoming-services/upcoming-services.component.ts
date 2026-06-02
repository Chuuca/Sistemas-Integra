import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TasksService } from '../../../core/services/tasks.service';
import { AuthService } from '../../../core/services/auth.service';
import { Task } from '../../../core/models/task.model';
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
            fechaProgramada: (task.fechaProgramada as any)?.toDate?.() ?? task.fechaProgramada,
            creadoEn: (task.creadoEn as any)?.toDate?.() ?? task.creadoEn,
          }))
         .filter(task => {
  if (task.estado === 'completada') return false;
  const fecha = new Date(task.fechaProgramada);
  fecha.setHours(0, 0, 0, 0);
  return fecha >= tomorrow;
})
          .sort((a, b) =>
            new Date(a.fechaProgramada).getTime() - new Date(b.fechaProgramada).getTime()
          );

        this.cdr.detectChanges();
      });
    });
  }

  getDateLabel(fecha: Date): string {
    const d = new Date(fecha);
    const hoy = new Date();
    const manana = new Date();
    manana.setDate(hoy.getDate() + 1);

    if (d.toDateString() === hoy.toDateString()) return 'Hoy';
    if (d.toDateString() === manana.toDateString()) return 'Mañana';

    const diff = Math.floor((d.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return 'Vencido';
    return d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  getDateClass(fecha: Date): string {
    const d = new Date(fecha);
    const hoy = new Date();
    const manana = new Date();
    manana.setDate(hoy.getDate() + 1);

    if (d.toDateString() === hoy.toDateString()) return 'hoy';
    if (d.toDateString() === manana.toDateString()) return 'manana';
    if (d < hoy) return 'vencido';
    return 'programado';
  }

  getPriorityLabel(p: number): string {
    return p === 3 ? 'Alta' : p === 2 ? 'Media' : 'Baja';
  }

  getPriorityClass(p: number): string {
    return p === 3 ? 'alta' : p === 2 ? 'media' : 'baja';
  }

  formatHora(hora: string): string {
    if (!hora) return '';
    const [h, m] = hora.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${String(h12).padStart(2,'0')}:${String(m).padStart(2,'0')} ${ampm}`;
  }

  openTask(id: string) { this.router.navigate(['/tasks', id]); }
  goBack() { history.back(); }

  get totalProximos() { return this.tasks.length; }
  get vencidos() { return this.tasks.filter(t => this.getDateClass(t.fechaProgramada) === 'vencido').length; }
}