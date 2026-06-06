import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TasksService } from '../../../core/services/tasks.service';
import { AuthService } from '../../../core/services/auth.service';
import { AttendanceService } from '../../../core/services/attendance.service';
import { Task, createEmptyTask, isTaskOverdue, getPriorityText, getPriorityClass, getTaskStatusText, getTaskStatusClass, getPaymentStatusText, calculateSaldoRestante } from '../../../core/models/task.model';
import { User } from '../../../core/models/user.model';
import { Attendance } from '../../../core/models/attendance.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-user-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-dashboard.component.html',
  styleUrl: './user-dashboard.component.scss'
})
export class UserDashboardComponent implements OnInit, OnDestroy {
  private tasksService = inject(TasksService);
  private authService = inject(AuthService);
  private attendanceService = inject(AttendanceService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private sub?: Subscription;

  tasks: Task[] = [];
  currentUser: User | null = null;
  today = new Date();
  activeTab: 'pendientes' | 'completadas' | 'vencidas' = 'pendientes';
  searchQuery = '';
  showRevisionModal = false;

  // ── Asistencia ─────────────────────────────────────────────
  attendance: Attendance | null = null;
  checkingIn = false;
  checkingOut = false;

  // ── Reporte de salida ──────────────────────────────────────
  showReporteModal = false;

  // ── Pedido de materiales ───────────────────────────────────
  showPedidoModal = false;
  pedidoTexto = '';
  enviandoPedido = false;

  // ── Ciclo de vida ──────────────────────────────────────────
  ngOnInit() {
    this.authService.getCurrentUserData().then(u => {
      this.currentUser = u;
      this.loadAttendance();
      this.cdr.detectChanges();
      if (u?.uid) {
        this.sub = this.tasksService.getTasksByUser(u.uid).subscribe(t => {
          const mapped = t.map(task => ({
            ...task,
            materiales: task.materiales || [],
            equiposNumeroDeSerie: task.equiposNumeroDeSerie || [],
            asignadoA: Array.isArray(task.asignadoA) ? task.asignadoA : [task.asignadoA],
            fechaProgramada: this.normalizeDate(task.fechaProgramada),
            creadoEn: this.normalizeDate(task.creadoEn),
            completadoEn: this.normalizeDate(task.completadoEn),
          }));

          this.tasks = mapped.filter(task => {
            if (task.estado === 'completada') {
              const completadaEn = this.normalizeDate(task.completadoEn);
              if (!completadaEn) return false;
              const unMesAtras = new Date();
              unMesAtras.setMonth(unMesAtras.getMonth() - 1);
              return completadaEn >= unMesAtras;
            }
            return true;
          });

          this.cdr.detectChanges();
        });
      }
    });
  }

  ngOnDestroy() { this.sub?.unsubscribe(); }

  // ── Método auxiliar para normalizar fechas ─────────────────
  private normalizeDate(fecha: any): Date {
    if (!fecha) return new Date();
    if (fecha instanceof Date) return fecha;
    if (typeof fecha === 'string') return new Date(fecha);
    if (fecha.toDate && typeof fecha.toDate === 'function') return fecha.toDate();
    return new Date(fecha);
  }

  // ── Métodos del modelo para usar en el template ────────────
  getPriorityText(priority: number): string {
    return getPriorityText(priority as 1|2|3);
  }

  getPriorityClass(priority: number): string {
    return getPriorityClass(priority as 1|2|3);
  }

  getTaskStatusText(status: string): string {
    return getTaskStatusText(status as any);
  }

  getTaskStatusClass(status: string): string {
    return getTaskStatusClass(status as any);
  }

  getPaymentStatusText(payment: string): string {
    return getPaymentStatusText(payment as any);
  }

  isTaskOverdue(task: Task): boolean {
    return isTaskOverdue(task);
  }

  calculateSaldoRestante(task: Task): number {
    return calculateSaldoRestante(task);
  }

  // ── Asistencia ─────────────────────────────────────────────
  async loadAttendance() {
    if (!this.currentUser?.uid) return;
    this.attendance = await this.attendanceService.getToday(this.currentUser.uid);
    this.cdr.detectChanges();
  }

  async checkIn() {
    if (!this.currentUser?.uid || this.checkingIn) return;
    this.checkingIn = true;
    try {
      await this.attendanceService.checkIn(this.currentUser.uid, this.currentUser.nombre);
      this.attendance = {
        uid: this.currentUser.uid,
        nombre: this.currentUser.nombre,
        fecha: new Date().toLocaleDateString('en-CA'),
        entrada: new Date(),
        estado: 'disponible'
      };
    } catch (e) {
      console.error('Error checkIn:', e);
    }
    this.checkingIn = false;
    this.cdr.detectChanges();
  }

  async checkOut() {
    if (!this.currentUser?.uid || this.checkingOut) return;
    this.checkingOut = true;
    try {
      await this.attendanceService.checkOut(this.currentUser.uid);
      if (this.attendance) {
        this.attendance = { ...this.attendance, salida: new Date(), estado: 'offline' };
      }
      this.showReporteModal = true;
    } catch (e) {
      console.error('Error checkOut:', e);
    }
    this.checkingOut = false;
    this.cdr.detectChanges();
  }

  abrirWhatsApp() {
    window.open('https://wa.me/523957884751', '_blank');
  }

  get estadoLabel(): string {
    const labels: Record<string, string> = {
      'offline': 'Offline',
      'disponible': 'Disponible',
      'en_sitio': 'En sitio',
      'traslado': 'En traslado'
    };
    return labels[this.attendance?.estado || 'offline'] ?? 'Offline';
  }

  formatTime(date: any): string {
    if (!date) return '--:--';
    const d = this.normalizeDate(date);
    return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  }

  // ── Pedido de materiales (CORREGIDO usando createEmptyTask) ──
  async enviarPedido() {
    if (!this.pedidoTexto.trim() || this.enviandoPedido) return;
    this.enviandoPedido = true;
    try {
      // Usar createEmptyTask para crear la tarea con valores por defecto
      const taskData = createEmptyTask({
        folioId: 'PEDIDO-' + Date.now(),
        cliente: 'Pedido de Materiales',
        direccion: '',
        telefono: '',
        descripcion: this.pedidoTexto,
        prioridad: 1,
        asignadoA: this.currentUser?.uid ? [this.currentUser.uid] : [],
        asignadoNombre: this.currentUser?.nombre ? [this.currentUser.nombre] : [],
        estado: 'pendiente',
        pago: 'no_pagado',
        monto: 0,
        fechaProgramada: new Date(),
        horaProgramada: '09:00',
        duracionEstimada: 0,
        materiales: [],
        notas: this.pedidoTexto,
        herramientasEspeciales: [],
        equipos: [],
        creadoPor: this.currentUser?.uid || '',
        equiposNumeroDeSerie: [],
        tiempoTotal: 0
      });

      await this.tasksService.createTask(taskData);
      this.pedidoTexto = '';
      this.showPedidoModal = false;
      alert('Pedido enviado correctamente');
    } catch (e) {
      console.error('Error al enviar pedido:', e);
      alert('Error al enviar el pedido');
    }
    this.enviandoPedido = false;
    this.cdr.detectChanges();
  }

  // ── Getters de tareas ──────────────────────────────────────
  get pendingTasks(): Task[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return this.tasks.filter(t => {
      if (t.estado === 'completada') return false;
      const fecha = this.normalizeDate(t.fechaProgramada);
      fecha.setHours(0, 0, 0, 0);
      return fecha >= today && fecha < tomorrow;
    });
  }

  get overdueTasks(): Task[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.tasks.filter(t => {
      if (t.estado === 'completada') return false;
      const fecha = this.normalizeDate(t.fechaProgramada);
      fecha.setHours(0, 0, 0, 0);
      return fecha < today;
    });
  }

  get completedTasks(): Task[] {
    return this.tasks.filter(t => t.estado === 'completada');
  }

  get priorityTask(): Task | null {
    return this.pendingTasks.sort((a, b) => b.prioridad - a.prioridad)[0] ?? null;
  }

  get tareasConMateriales() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return this.tasks.filter(t => {
      if (t.estado === 'completada') return false;
      const fecha = this.normalizeDate(t.fechaProgramada);
      fecha.setHours(0, 0, 0, 0);
      return fecha >= today && fecha < tomorrow;
    }).filter(t =>
      (t.materiales?.length > 0) ||
      (t.herramientasEspeciales?.length ?? 0) > 0 ||
      (t.equipos?.length ?? 0) > 0
    );
  }

  // ── Getters con búsqueda ───────────────────────────────────
  get allFilteredTasks(): Task[] {
    if (!this.searchQuery.trim()) return [];
    const q = this.searchQuery.toLowerCase();
    return this.tasks.filter(t =>
      t.cliente.toLowerCase().includes(q) ||
      t.folioId?.toLowerCase().includes(q) ||
      t.direccion?.toLowerCase().includes(q)
    );
  }

  get filteredPendingTasks(): Task[] {
    if (!this.searchQuery.trim()) return this.pendingTasks;
    const q = this.searchQuery.toLowerCase();
    return this.pendingTasks.filter(t =>
      t.cliente.toLowerCase().includes(q) ||
      t.folioId?.toLowerCase().includes(q) ||
      t.direccion?.toLowerCase().includes(q)
    );
  }

  get filteredOverdueTasks(): Task[] {
    if (!this.searchQuery.trim()) return this.overdueTasks;
    const q = this.searchQuery.toLowerCase();
    return this.overdueTasks.filter(t =>
      t.cliente.toLowerCase().includes(q) ||
      t.folioId?.toLowerCase().includes(q)
    );
  }

  get filteredCompletedTasks(): Task[] {
    if (!this.searchQuery.trim()) return this.completedTasks;
    const q = this.searchQuery.toLowerCase();
    return this.completedTasks.filter(t =>
      t.cliente.toLowerCase().includes(q) ||
      t.folioId?.toLowerCase().includes(q)
    );
  }

  // ── Getters de tiempo ──────────────────────────────────────
  get tareasHoy(): Task[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return this.tasks.filter(t => {
      const fecha = this.normalizeDate(t.fechaProgramada);
      fecha.setHours(0, 0, 0, 0);
      return fecha >= today && fecha < tomorrow;
    });
  }

  get tiempoEstimadoHoy(): number {
    return this.tareasHoy.reduce((a, t) => a + (t.duracionEstimada || 0), 0);
  }

  get tiempoCompletadoHoy(): number {
    return this.tareasHoy
      .filter(t => t.estado === 'completada')
      .reduce((a, t) => a + (t.tiempoTotal || 0), 0);
  }

  get tiempoRestanteHoy(): number {
    const restante = this.tiempoEstimadoHoy - this.tiempoCompletadoHoy;
    return restante > 0 ? restante : 0;
  }

  get progresoHoy(): number {
    if (this.tiempoEstimadoHoy === 0) return 0;
    return Math.min(100, Math.round((this.tiempoCompletadoHoy / this.tiempoEstimadoHoy) * 100));
  }

  get completadasHoy(): number {
    return this.tareasHoy.filter(t => t.estado === 'completada').length;
  }

  get pendientesHoy(): number {
    return this.tareasHoy.filter(t => t.estado !== 'completada').length;
  }

  // ── Getters de métricas ────────────────────────────────────
  get totalAsignadas() { return this.tasks.length; }
  get completadas() { return this.tasks.filter(t => t.estado === 'completada').length; }
  get tiempoTotal() {
    const mins = this.tasks.reduce((a, t) => a + (t.tiempoTotal || 0), 0);
    return mins > 0 ? `${Math.floor(mins/60)}h ${mins%60}m` : '0m';
  }

  // ── Formato ────────────────────────────────────────────────
  formatMinutos(mins: number): string {
    if (mins === 0) return '0m';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  formatHora(hora: string): string {
    if (!hora) return '';
    const [h, m] = hora.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${String(h12).padStart(2,'0')}:${String(m).padStart(2,'0')} ${ampm}`;
  }

  getStatusLabel(estado: string): string {
    return this.getTaskStatusText(estado);
  }

  getPaymentLabel(pago: string): string {
    return this.getPaymentStatusText(pago);
  }

  getPaymentClass(pago: string) {
    return pago === 'pagado' ? 'pagado' : pago === 'abono' ? 'abono' : 'no-pagado';
  }

  getTiempoStatus(task: Task): { label: string; clase: string } | null {
    if (!task.duracionEstimada || !task.tiempoTotal) return null;
    const diff = task.tiempoTotal - task.duracionEstimada;
    if (diff > 0) return { label: `+${diff}min sobre el tiempo`, clase: 'time-over' };
    if (diff < 0) return { label: `${Math.abs(diff)}min ahorrados`, clase: 'time-under' };
    return { label: 'Justo a tiempo', clase: 'time-exact' };
  }

  async enviarReporteEmail() {
    if (!this.currentUser?.email) return;
    try {
      const emailjs = (await import('@emailjs/browser')).default;
      const completadas = this.completedTasks.length;
      const tiempo = this.tiempoTotal;
      await emailjs.send('service_2hdign8', 'template_fwiao48', {
        nombre_cliente: this.currentUser.nombre,
        sistema: `Reporte del día — ${new Date().toLocaleDateString('es-MX')}`,
        contrasena: '-',
        clave_cifrado: '-',
        notas_acceso: `Tareas completadas: ${completadas} | Tiempo total: ${tiempo}`,
        to_email: this.currentUser.email,
      }, 'XEGieclndH5Y3ZVp_');
    } catch (e) {
      console.error('Error enviando reporte:', e);
    }
  }

  // ── Navegación ─────────────────────────────────────────────
  openTask(id: string) { this.router.navigate(['/tasks', id]); }
  goToSchedule() { this.router.navigate(['/schedule']); }
  goToReports() { this.router.navigate(['/reports']); }
  logout() { this.authService.logout(); }

  stars(n: number) { return Array(n).fill(0); }
  emptyStars(n: number) { return Array(3 - n).fill(0); }
}