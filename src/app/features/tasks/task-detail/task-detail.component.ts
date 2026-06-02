import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TasksService } from '../../../core/services/tasks.service';
import { AuthService } from '../../../core/services/auth.service';
import { AttendanceService } from '../../../core/services/attendance.service';
import { Task } from '../../../core/models/task.model';
import { User } from '../../../core/models/user.model';

@Component({
  selector: 'app-task-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './task-detail.component.html',
  styleUrl: './task-detail.component.scss'
})
export class TaskDetailComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private tasksService = inject(TasksService);
  private authService = inject(AuthService);
  private attendanceService = inject(AttendanceService);
  private cdr = inject(ChangeDetectorRef);

  task: Task | null = null;
  currentUser: User | null = null;
  isAdmin = false;
  loading = true;

  timerInterval: any;
  timerRunning = false;
  timerSeconds = 0;
  timerDisplay = '00:00:00';

  estadoTecnico: 'disponible' | 'en_sitio' | 'traslado' = 'disponible';
  guardandoEstado = false;

  newEquipo = '';
  newHerramienta = '';
  newEquipoItem = '';
  montoAbonado = 0;
  montoPedidoGuardado = false;

  get montoPendiente(): number {
    return (this.task?.monto || 0) - (this.task?.montoAbonado || 0);
  }

  get asignadosNombres(): string {
    if (!this.task?.asignadoNombre) return '';
    if (Array.isArray(this.task.asignadoNombre)) return this.task.asignadoNombre.join(', ');
    return this.task.asignadoNombre as string;
  }

  get esPedido(): boolean {
    return this.task?.cliente?.includes('Pedido') ?? false;
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');

    this.authService.getCurrentUserData().then(u => {
      this.currentUser = u;
      this.isAdmin = u?.rol === 'admin';
      this.cdr.detectChanges();
    });

    if (id) {
      this.tasksService.getTask(id).then(t => {
        if (t) {
          this.task = {
            ...t,
            materiales: t.materiales || [],
            equiposNumeroDeSerie: t.equiposNumeroDeSerie || [],
            herramientasEspeciales: t.herramientasEspeciales || [],
            equipos: t.equipos || [],
            anticipoRecibido: t.anticipoRecibido || 0,
            saldoRestante: t.saldoRestante || 0,
            planCobro: t.planCobro || 'al_finalizar',
            fechaProgramada: (t.fechaProgramada as any)?.toDate?.() ?? t.fechaProgramada,
            creadoEn: (t.creadoEn as any)?.toDate?.() ?? t.creadoEn,
          };
          this.montoAbonado = this.task.montoAbonado || 0;
          this.timerSeconds = (this.task.tiempoTotal || 0) * 60;
          this.updateDisplay();

          if (this.task.estado === 'en_progreso') {
            this.estadoTecnico = 'en_sitio';
          }
        }
        this.loading = false;
        this.cdr.detectChanges();
      }).catch(() => {
        this.loading = false;
        this.cdr.detectChanges();
      });
    } else {
      this.loading = false;
    }
  }

  ngOnDestroy() {
    if (this.timerInterval) clearInterval(this.timerInterval);
  }

  async startTimer() {
    if (this.timerRunning || !this.task?.id || !this.currentUser) return;
    this.timerRunning = true;
    this.estadoTecnico = 'en_sitio';

    if (this.task.estado === 'pendiente') {
      await this.updateStatus('en_progreso');
    }

    await this.setEstadoTecnico('en_sitio');

    this.timerInterval = setInterval(() => {
      this.timerSeconds++;
      this.updateDisplay();
      this.cdr.detectChanges();
    }, 1000);
  }

  async marcarEnTraslado() {
    if (!this.currentUser) return;
    this.estadoTecnico = 'traslado';
    await this.setEstadoTecnico('traslado');
    this.cdr.detectChanges();
  }

  async stopTimer() {
    clearInterval(this.timerInterval);
    this.timerRunning = false;
    this.estadoTecnico = 'disponible';
    const mins = Math.floor(this.timerSeconds / 60);

    if (this.task?.id) {
      await this.tasksService.updateTask(this.task.id, {
        tiempoTotal: mins,
        estado: 'completada',
        completadoEn: new Date()
      });
      this.task.tiempoTotal = mins;
      this.task.estado = 'completada';
    }

    await this.setEstadoTecnico('disponible');
    this.cdr.detectChanges();
  }

  private async setEstadoTecnico(estado: 'disponible' | 'en_sitio' | 'traslado') {
    if (!this.currentUser?.uid) return;
    this.guardandoEstado = true;
    try {
      const tareaId = estado !== 'disponible' ? (this.task?.id ?? '') : '';
      const cliente = estado !== 'disponible' ? (this.task?.cliente ?? '') : '';
      await this.attendanceService.updateEstado(
        this.currentUser.uid,
        estado,
        tareaId,
        cliente
      );
    } catch (e) {
      console.error('Error actualizando estado:', e);
    }
    this.guardandoEstado = false;
    this.cdr.detectChanges();
  }

  updateDisplay() {
    const h = Math.floor(this.timerSeconds / 3600);
    const m = Math.floor((this.timerSeconds % 3600) / 60);
    const s = this.timerSeconds % 60;
    this.timerDisplay = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }

  async updateStatus(estado: any) {
    if (this.task?.id) {
      await this.tasksService.updateTask(this.task.id, { estado });
      this.task.estado = estado;
      this.cdr.detectChanges();
    }
  }

  async updatePayment(pago: any) {
    if (this.task?.id) {
      const data: any = { pago };
      if (pago === 'pagado') {
        data.montoAbonado = this.task.monto;
      } else if (pago === 'no_pagado') {
        data.montoAbonado = 0;
      } else {
        data.montoAbonado = this.montoAbonado;
      }
      await this.tasksService.updateTask(this.task.id, data);
      this.task.pago = pago;
      this.task.montoAbonado = data.montoAbonado;
      this.cdr.detectChanges();
    }
  }

  async updateCobranza() {
    if (!this.task?.id) return;
    const saldo = (this.task.monto || 0) - (this.task.anticipoRecibido || 0);
    await this.tasksService.updateTask(this.task.id, {
      anticipoRecibido: this.task.anticipoRecibido,
      saldoRestante: saldo,
      planCobro: this.task.planCobro
    });
    if (this.task) this.task.saldoRestante = saldo;
    this.cdr.detectChanges();
  }

  async updateMontoPedido() {
    if (!this.task?.id) return;
    const monto = Number(this.task.monto);
    try {
      await this.tasksService.updateTask(this.task.id, { monto });
      this.montoPedidoGuardado = true;
      setTimeout(() => { this.montoPedidoGuardado = false; this.cdr.detectChanges(); }, 2000);
      this.cdr.detectChanges();
    } catch (e) {
      console.error('Error guardando monto:', e);
    }
  }

  async marcarSurtidoYEliminar() {
    if (!this.task?.id) return;
    if (!confirm('Marcar como surtido y eliminar el pedido?')) return;
    try {
      await this.tasksService.deleteTask(this.task.id);
      history.back();
    } catch (e) {
      console.error('Error eliminando pedido:', e);
    }
  }

  async addHerramienta() {
    const v = this.newHerramienta?.trim();
    if (!v || !this.task?.id) return;
    const herramientas = [...(this.task.herramientasEspeciales || []), v];
    await this.tasksService.updateTask(this.task.id, { herramientasEspeciales: herramientas });
    this.task.herramientasEspeciales = herramientas;
    this.newHerramienta = '';
    this.cdr.detectChanges();
  }

  async removeHerramienta(i: number) {
    if (!this.task?.id) return;
    const herramientas = [...(this.task.herramientasEspeciales || [])];
    herramientas.splice(i, 1);
    await this.tasksService.updateTask(this.task.id, { herramientasEspeciales: herramientas });
    this.task.herramientasEspeciales = herramientas;
    this.cdr.detectChanges();
  }

  async addEquipoItem() {
    const v = this.newEquipoItem?.trim();
    if (!v || !this.task?.id) return;
    const equipos = [...(this.task.equipos || []), v];
    await this.tasksService.updateTask(this.task.id, { equipos });
    this.task.equipos = equipos;
    this.newEquipoItem = '';
    this.cdr.detectChanges();
  }

  async removeEquipoItem(i: number) {
    if (!this.task?.id) return;
    const equipos = [...(this.task.equipos || [])];
    equipos.splice(i, 1);
    await this.tasksService.updateTask(this.task.id, { equipos });
    this.task.equipos = equipos;
    this.cdr.detectChanges();
  }

  async addEquipo() {
    if (!this.newEquipo.trim() || !this.task?.id) return;
    const equipos = [...(this.task.equiposNumeroDeSerie || []), this.newEquipo.trim()];
    await this.tasksService.updateTask(this.task.id, { equiposNumeroDeSerie: equipos });
    this.task.equiposNumeroDeSerie = equipos;
    this.newEquipo = '';
    this.cdr.detectChanges();
  }

  async removeEquipo(i: number) {
    if (!this.task?.id) return;
    const equipos = [...this.task.equiposNumeroDeSerie];
    equipos.splice(i, 1);
    await this.tasksService.updateTask(this.task.id, { equiposNumeroDeSerie: equipos });
    this.task.equiposNumeroDeSerie = equipos;
    this.cdr.detectChanges();
  }

  goBack() { history.back(); }
  stars(n: number) { return Array(n).fill(0); }
  emptyStars(n: number) { return Array(3 - n).fill(0); }

  getStatusLabel(estado: string): string {
    const labels: Record<string, string> = {
      'pendiente': 'Pendiente',
      'en_progreso': 'En progreso',
      'completada': 'Completada'
    };
    return labels[estado] ?? estado;
  }

  getPaymentClass(pago: string) {
    return pago === 'pagado' ? 'pagado' : pago === 'abono' ? 'abono' : 'no-pagado';
  }

  getPaymentLabel(pago: string): string {
    const labels: Record<string, string> = {
      'pagado': 'Pagado',
      'no_pagado': 'No pagado',
      'abono': 'Abono'
    };
    return labels[pago] ?? pago;
  }

  formatHora(hora: string): string {
    if (!hora) return '';
    const [h, m] = hora.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${String(h12).padStart(2,'0')}:${String(m).padStart(2,'0')} ${ampm}`;
  }

  openWorkOrder() {
    this.router.navigate(['/tasks', this.task!.id, 'work-order']);
  }
}