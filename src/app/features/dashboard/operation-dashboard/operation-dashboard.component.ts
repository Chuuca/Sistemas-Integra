import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AttendanceService } from '../../../core/services/attendance.service';
import { TasksService } from '../../../core/services/tasks.service';
import { UsersService } from '../../../core/services/users.service';
import { Attendance } from '../../../core/models/attendance.model';
import { Task } from '../../../core/models/task.model';
import { User } from '../../../core/models/user.model';

@Component({
  selector: 'app-operation-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './operation-dashboard.component.html',
  styleUrl: './operation-dashboard.component.scss'
})
export class OperationDashboardComponent implements OnInit, OnDestroy {
  private attendanceService = inject(AttendanceService);
  private tasksService = inject(TasksService);
  private usersService = inject(UsersService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  attendance: Attendance[] = [];
  tasks: Task[] = [];
  users: User[] = [];

  private attendanceSub?: Subscription;
  private tasksSub?: Subscription;
  private usersSub?: Subscription;

  private timerInterval?: any;

  ngOnInit() {
    this.timerInterval = setInterval(() => this.cdr.detectChanges(), 30000);
    this.attendanceSub = this.attendanceService.getTodayAll().subscribe(a => {
      this.attendance = a.map(att => ({
        ...att,
        entrada: (att.entrada as any)?.toDate?.() ?? att.entrada,
        salida: (att.salida as any)?.toDate?.() ?? att.salida,
      }));
      this.cdr.detectChanges();
    });

    this.tasksSub = this.tasksService.getAllTasks().subscribe(t => {
      this.tasks = t.map(task => ({
        ...task,
        fechaProgramada: (task.fechaProgramada as any)?.toDate?.() ?? task.fechaProgramada,
      }));
      this.cdr.detectChanges();
    });

    this.usersSub = this.usersService.getTechnicians().subscribe(u => {
      this.users = u;
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.attendanceSub?.unsubscribe();
    this.tasksSub?.unsubscribe();
    this.usersSub?.unsubscribe();
  }

  // ── Getters ────────────────────────────────────────────────
  get today(): Date { return new Date(); }

  get tareasHoy(): Task[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return this.tasks.filter(t => {
      const fecha = new Date(t.fechaProgramada);
      fecha.setHours(0, 0, 0, 0);
      return fecha >= today && fecha < tomorrow;
    });
  }

  get tareasCompletadasHoy(): Task[] {
    return this.tareasHoy.filter(t => t.estado === 'completada');
  }

  get tareasPendientesHoy(): Task[] {
    return this.tareasHoy.filter(t => t.estado !== 'completada');
  }

  get tecnicosActivos(): number {
    return this.attendance.filter(a => a.entrada && !a.salida).length;
  }

  // ── Por técnico ────────────────────────────────────────────
  getAttendance(uid: string): Attendance | null {
    return this.attendance.find(a => a.uid === uid) || null;
  }

  getEstadoTecnico(uid: string): string {
    const att = this.getAttendance(uid);
    if (!att || !att.entrada) return 'offline';
    if (att.salida) return 'offline';
    return att.estado || 'disponible';
  }

  getEstadoLabel(uid: string): string {
    const estado = this.getEstadoTecnico(uid);
    const labels: Record<string, string> = {
      'offline': 'Offline',
      'disponible': 'Disponible',
      'en_sitio': 'En sitio',
      'traslado': 'En traslado'
    };
    return labels[estado] ?? 'Offline';
  }

  getEstadoClass(uid: string): string {
    return this.getEstadoTecnico(uid);
  }

  getTareasHoyUser(uid: string): Task[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return this.tasks.filter(t => {
      const fecha = new Date(t.fechaProgramada);
      fecha.setHours(0, 0, 0, 0);
      const esHoy = fecha >= today && fecha < tomorrow;
      const esAsignado = Array.isArray(t.asignadoA)
        ? t.asignadoA.includes(uid)
        : t.asignadoA === uid;
      return esHoy && esAsignado;
    });
  }

  getTareaActiva(uid: string): Task | null {
    return this.getTareasHoyUser(uid).find(t => t.estado === 'en_progreso') || null;
  }

  // ── Formato ────────────────────────────────────────────────
  formatTime(date: any): string {
    if (!date) return '--:--';
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  }

  formatMinutos(mins: number): string {
    if (!mins || mins === 0) return '0m';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  getElapsedTime(uid: string): string {
    const att = this.getAttendance(uid);
    if (!att?.entrada) return '--';
    const entrada = att.entrada instanceof Date ? att.entrada : new Date(att.entrada as any);
    const salida = att.salida ? (att.salida instanceof Date ? att.salida : new Date(att.salida as any)) : new Date();
    const mins = Math.floor((salida.getTime() - entrada.getTime()) / 60000);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}:${String(m).padStart(2,'0')}` : `${m}m`;
  }

  getClienteActivo(uid: string): string {
    return this.getTareaActiva(uid)?.cliente || '—';
  }

  goBack() { this.router.navigate(['/admin']); }
}