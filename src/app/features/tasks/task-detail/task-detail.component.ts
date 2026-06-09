import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TasksService } from '../../../core/services/tasks.service';
import { AuthService } from '../../../core/services/auth.service';
import { AttendanceService } from '../../../core/services/attendance.service';
import { WorkOrderService } from '../../../core/services/work-order.service';
import { UsersService } from '../../../core/services/users.service';
import { firstValueFrom } from 'rxjs';
import { Task, getTaskStatusText, getPaymentStatusText, getPriorityText, getPriorityClass, calculateSaldoRestante } from '../../../core/models/task.model';
import { WorkOrder } from '../../../core/models/work-order.model';
import { User } from '../../../core/models/user.model';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { firebaseStorage } from '../../../app.config';

@Component({
  selector: 'app-task-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './task-detail.component.html',
  styleUrl: './task-detail.component.scss'
})
export class TaskDetailComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  router = inject(Router);
  private tasksService = inject(TasksService);
  private authService = inject(AuthService);
  private attendanceService = inject(AttendanceService);
  private workOrderService = inject(WorkOrderService);
  private usersService = inject(UsersService);
  private cdr = inject(ChangeDetectorRef);

  task: Task | null = null;
  currentUser: User | null = null;
  isAdmin = false;
  loading = true;
  hojasGuardadas: WorkOrder[] = [];

  evidenciaFotos: string[] = [];
  evidenciaFotosPDF: string[] = [];
  subiendoFotos = false;
  lightboxUrl: string | null = null;
  lightboxIndex = 0;

  // Fotos de descripción técnica e ingeniería
  descripcionFotos: string[] = [];
  subiendoFotosDesc = false;
  descripcionIngenieriaFotos: string[] = [];
  subiendoFotosDescIng = false;
  // Puntos clave del servicio
  editandoPuntosClave = false;
  puntosClaveEdit = '';
  puntosClavesFotos: string[] = [];
  subiendoFotosPK = false;
  // Lightbox compartido para fotos de descripción
  descLightboxUrl: string | null = null;
  descLightboxIndex = 0;
  descLightboxFotos: string[] = [];

  readonly tipoLabels: Record<string, string> = {
    cctv_instalacion: 'CCTV Instalacion',
    cctv_reparacion: 'CCTV Reparacion',
    alarma_instalacion: 'Alarma Instalacion',
    alarma_mercado_san_juan: 'Alarma Mercado San Juan',
    instalacion_general: 'Instalacion General',
    pos_sr_instalacion: 'POS SR Instalacion/Servicio',
    pos_sistema_instalacion: 'POS Sistema Instalacion',
    pos_servicio: 'POS Servicio',
    pos_mantenimiento: 'POS Mantenimiento',
    sistema_otros: 'Sistema Otros',
    servicio_mantenimiento: 'Servicio y/o Mantenimiento',
    garantia_reparacion: 'Garantia y Reparaciones',
    audio: 'Audio',
    video: 'Video',
    telefonia: 'Telefonia',
    soft_restaurant_instalacion: 'Soft Restaurant Instalacion',
    soft_restaurant_servicio: 'Soft Restaurant Servicio/Reparacion',
    servicio_reparacion_general: 'Servicio/Reparacion General',
    lab_diagnostico: 'HDT Diagnostico de Laboratorio',
    recibo_equipo: 'Checklist Recibo de Equipo',
    pos_perifericos_instalacion: 'POS y Perifericos Instalacion',
    canalizacion_conduit: 'Canalizacion Conduit Instalacion',
    cctv_servicio: 'CCTV Servicio Mantenimiento Reparacion',
  };

  timerInterval: any;
  timerRunning = false;
  timerSeconds = 0;
  timerDisplay = '00:00:00';

  estadoTecnico: 'disponible' | 'en_sitio' | 'traslado' = 'disponible';
  guardandoEstado = false;

  newEquipo = '';
  newHerramienta = '';
  newEquipoItem = '';
  editandoDescripcion = false;
  descripcionEdit = '';
  editandoDescIngenieria = false;
  descIngenieriaEdit = '';
  editandoCliente = false;
  clienteEdit = '';
  editandoPrioridad = false;
  editandoFecha = false;
  fechaEdit = '';
  editandoHora = false;
  horaEdit = '';
  editandoTecnico = false;
  montoAbonado = 0;
  montoPedidoGuardado = false;

  tecnicosDisponibles: { uid: string; nombre: string; rol: string }[] = [];
  tecnicosSeleccionados: string[] = [];
  guardandoTecnicos = false;
  tecnicosGuardados = false;
  mostrarAsignacion = false;

  tiempoActual: number = 0;
  cronometroInterval: any;
  tareaEnProgreso: boolean = false;
  actualizandoCronometro: boolean = false;

  get montoPendiente(): number {
    if (!this.task) return 0;
    return calculateSaldoRestante(this.task);
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

      if (this.isAdmin) {
        firstValueFrom(this.usersService.getAllUsers()).then(users => {
          this.tecnicosDisponibles = users.filter(u => !u.suspendido);
          this.cdr.detectChanges();
        });
      }
    });

    if (id) {
      this.tasksService.getTask(id).then(t => {
        if (t) {
          this.task = {
            ...t,
            materiales: t.materiales || [],
            herramientasEspeciales: t.herramientasEspeciales || [],
            equipos: t.equipos || [],
            equiposNumeroDeSerie: t.equiposNumeroDeSerie || [],
            anticipoRecibido: t.anticipoRecibido || 0,
            saldoRestante: t.saldoRestante || 0,
            planCobro: t.planCobro || 'al_finalizar',
            fechaProgramada: this.normalizeDate(t.fechaProgramada),
            creadoEn: this.normalizeDate(t.creadoEn),
            completadoEn: this.normalizeDate(t.completadoEn),
          };
          this.evidenciaFotos    = t.evidenciaFotos    || [];
          this.evidenciaFotosPDF = t.evidenciaFotosPDF || [];
          this.descripcionFotos          = t.descripcionFotos          || [];
          this.descripcionIngenieriaFotos = t.descripcionIngenieriaFotos || [];
          this.puntosClavesFotos         = t.puntosClavesFotos         || [];
          this.montoAbonado = this.task.montoAbonado || 0;
          this.timerSeconds = (this.task.tiempoTotal || 0) * 60;
          this.tareaEnProgreso = this.task.estado === 'en_progreso';
          
          this.updateDisplay();
          this.tecnicosSeleccionados = [...(this.task.asignadoA || [])];

          if (this.task.estado === 'en_progreso') {
            this.estadoTecnico = 'en_sitio';
          }
        }
        // Cargar hojas de trabajo guardadas para esta tarea
        this.workOrderService.getByTarea(id).then(hojas => {
          this.hojasGuardadas = hojas;
          this.cdr.detectChanges();
        }).catch(() => {});
        this.loading = false;
        this.cdr.detectChanges();
      }).catch(() => {
        this.loading = false;
        this.cdr.detectChanges();
      });
    } else {
      this.loading = false;
    }

    this.iniciarActualizacionCronometro();
  }

  ngOnDestroy() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.cronometroInterval) clearInterval(this.cronometroInterval);
  }

  private normalizeDate(fecha: any): Date {
    if (!fecha) return new Date();
    if (fecha instanceof Date) return fecha;
    if (typeof fecha === 'string') return new Date(fecha);
    if (fecha.toDate && typeof fecha.toDate === 'function') return fecha.toDate();
    if (fecha.seconds) return new Date(fecha.seconds * 1000);
    return new Date(fecha);
  }

  getFechaAsDate(fecha: any): Date | null {
    if (!fecha) return null;
    if (fecha instanceof Date) return fecha;
    if (typeof fecha === 'string') return new Date(fecha);
    if (fecha.toDate && typeof fecha.toDate === 'function') return fecha.toDate();
    if (fecha.seconds) return new Date(fecha.seconds * 1000);
    return null;
  }

  getTaskStatusText(status: string): string {
    return getTaskStatusText(status as any);
  }

  getPaymentStatusText(payment: string): string {
    return getPaymentStatusText(payment as any);
  }

  getPriorityText(priority: number): string {
    return getPriorityText(priority as 1|2|3);
  }

  getPriorityClass(priority: number): string {
    return getPriorityClass(priority as 1|2|3);
  }

  iniciarActualizacionCronometro() {
    this.cronometroInterval = setInterval(async () => {
      if (this.task?.id && !this.actualizandoCronometro) {
        this.actualizandoCronometro = true;
        try {
          const tiempo = await this.tasksService.getTiempoActual(this.task.id);
          this.tiempoActual = tiempo;
          this.tareaEnProgreso = this.task.estado === 'en_progreso';
          this.cdr.detectChanges();
        } catch (e) {
          console.error('Error obteniendo tiempo:', e);
        }
        this.actualizandoCronometro = false;
      }
    }, 1000);
  }

  async toggleCronometroPersistente() {
    if (!this.task?.id) {
      console.error('No hay tarea seleccionada');
      return;
    }
    
    if (!this.currentUser) {
      alert('Debes estar autenticado para usar el cronómetro');
      return;
    }
    
    if (this.tareaEnProgreso) {
      console.log('Pausando tarea...');
      try {
        await this.tasksService.marcarPausaTarea(this.task.id);
        this.task.estado = 'pendiente';
        await this.updateStatus('pendiente');
        await this.setEstadoTecnico('disponible');
        console.log('Tarea pausada correctamente');
      } catch (error) {
        console.error('Error al pausar tarea:', error);
        alert('Error al pausar la tarea');
      }
    } else {
      console.log('Iniciando tarea...');
      try {
        await this.tasksService.marcarInicioTarea(this.task.id);
        this.task.estado = 'en_progreso';
        await this.updateStatus('en_progreso');
        await this.setEstadoTecnico('en_sitio');
        console.log('Tarea iniciada correctamente');
      } catch (error) {
        console.error('Error al iniciar tarea:', error);
        alert('Error al iniciar la tarea');
      }
    }
    
    const tareaActualizada = await this.tasksService.getTask(this.task.id);
    if (tareaActualizada) {
      this.task = tareaActualizada;
    }
    this.tareaEnProgreso = this.task.estado === 'en_progreso';
    this.cdr.detectChanges();
  }

  formatTiempoPersistente(segundos: number): string {
    const horas = Math.floor(segundos / 3600);
    const minutos = Math.floor((segundos % 3600) / 60);
    const segs = Math.floor(segundos % 60);
    return `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}:${segs.toString().padStart(2, '0')}`;
  }

  toggleTecnico(uid: string) {
    const idx = this.tecnicosSeleccionados.indexOf(uid);
    if (idx === -1) this.tecnicosSeleccionados.push(uid);
    else this.tecnicosSeleccionados.splice(idx, 1);
  }

  esTecnicoSeleccionado(uid: string): boolean {
    return this.tecnicosSeleccionados.includes(uid);
  }

  async guardarAsignacion() {
    if (!this.task?.id || this.tecnicosSeleccionados.length === 0) return;
    this.guardandoTecnicos = true;

    const nombres = this.tecnicosSeleccionados
      .map(uid => this.tecnicosDisponibles.find(t => t.uid === uid)?.nombre ?? '')
      .filter(Boolean);

    try {
      await this.tasksService.updateTask(this.task.id, {
        asignadoA: this.tecnicosSeleccionados,
        asignadoNombre: nombres,
      });
      this.task.asignadoA = this.tecnicosSeleccionados;
      this.task.asignadoNombre = nombres;
      this.tecnicosGuardados = true;
      this.mostrarAsignacion = false;
      setTimeout(() => { this.tecnicosGuardados = false; this.cdr.detectChanges(); }, 2500);
    } catch (e) {
      console.error('Error asignando técnicos:', e);
    }

    this.guardandoTecnicos = false;
    this.cdr.detectChanges();
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
      const data: any = { estado };
      if (estado === 'completada' && !this.task.completadoEn) {
        data.completadoEn = new Date();
        if (!this.task.tiempoTotal) data.tiempoTotal = Math.floor(this.timerSeconds / 60);
      }
      await this.tasksService.updateTask(this.task.id, data);
      this.task.estado = estado;
      if (data.completadoEn) this.task.completadoEn = data.completadoEn;
      this.cdr.detectChanges();
    }
  }

  // Cambia el estado desde el selector de pills, manejando el cronómetro correctamente
  async changeTaskStatus(nuevoEstado: 'pendiente' | 'en_progreso' | 'completada') {
    if (!this.task?.id) return;
    const estadoActual = this.task.estado;
    if (estadoActual === nuevoEstado) return;

    try {
      // Si el cronómetro estaba corriendo (tiempoInicio activo), guardar antes de cambiar
      if (estadoActual === 'en_progreso' && nuevoEstado !== 'en_progreso') {
        await this.tasksService.marcarPausaTarea(this.task.id);
        this.tareaEnProgreso = false;
      }

      // Si volvemos a "en_progreso", reiniciar el cronómetro (acumula sobre tiempoTotal existente)
      if (nuevoEstado === 'en_progreso') {
        await this.tasksService.marcarInicioTarea(this.task.id);
        this.tareaEnProgreso = true;
        await this.setEstadoTecnico('en_sitio');
      } else {
        // Guardar estado final en Firestore
        const extra: any = { estado: nuevoEstado };
        if (nuevoEstado === 'completada') extra.completadoEn = new Date();
        await this.tasksService.updateTask(this.task.id, extra);
        await this.setEstadoTecnico('disponible');
      }

      // Refrescar la tarea desde Firestore
      const tareaActualizada = await this.tasksService.getTask(this.task.id);
      if (tareaActualizada) this.task = tareaActualizada;
      this.tareaEnProgreso = this.task.estado === 'en_progreso';
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error al cambiar estado:', error);
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
    const saldo = calculateSaldoRestante(this.task);
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

  startEditCliente() {
    this.clienteEdit = this.task?.cliente || '';
    this.editandoCliente = true;
  }

  cancelEditCliente() {
    this.editandoCliente = false;
    this.clienteEdit = '';
  }

  async saveCliente() {
    if (!this.task?.id || !this.clienteEdit.trim()) return;
    await this.tasksService.updateTask(this.task.id, { cliente: this.clienteEdit.trim() });
    this.task.cliente = this.clienteEdit.trim();
    this.editandoCliente = false;
  }

  startEditFecha() {
    if (!this.isAdmin) return;
    // Convert stored date to YYYY-MM-DD for date input
    const d = this.getFechaAsDate(this.task?.fechaProgramada);
    if (d) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      this.fechaEdit = `${y}-${m}-${day}`;
    } else {
      this.fechaEdit = '';
    }
    this.editandoFecha = true;
  }

  cancelEditFecha() {
    this.editandoFecha = false;
    this.fechaEdit = '';
  }

  async saveEditFecha() {
    if (!this.task?.id || !this.fechaEdit) return;
    // Parse as LOCAL midnight to avoid UTC off-by-one-day issue
    const [y, m, d] = this.fechaEdit.split('-').map(Number);
    const localDate = new Date(y, m - 1, d, 12, 0, 0); // noon local = safe zone
    await this.tasksService.updateTask(this.task.id, { fechaProgramada: localDate });
    this.task.fechaProgramada = localDate;
    this.editandoFecha = false;
    this.cdr.detectChanges();
  }

  startEditHora() {
    if (!this.isAdmin) return;
    this.horaEdit = this.task?.horaProgramada || '';
    this.editandoHora = true;
  }

  cancelEditHora() {
    this.editandoHora = false;
    this.horaEdit = '';
  }

  async saveEditHora() {
    if (!this.task?.id) return;
    await this.tasksService.updateTask(this.task.id, { horaProgramada: this.horaEdit });
    this.task.horaProgramada = this.horaEdit;
    this.editandoHora = false;
    this.cdr.detectChanges();
  }

  startEditTecnico() {
    if (!this.isAdmin) return;
    this.tecnicosSeleccionados = [...(this.task?.asignadoA || [])];
    this.editandoTecnico = true;
  }

  cancelEditTecnico() {
    this.editandoTecnico = false;
    this.tecnicosSeleccionados = [...(this.task?.asignadoA || [])];
  }

  async saveEditTecnico() {
    await this.guardarAsignacion();
    this.editandoTecnico = false;
  }

  async savePrioridad(nueva: 1 | 2 | 3) {
    if (!this.task?.id) return;
    await this.tasksService.updateTask(this.task.id, { prioridad: nueva });
    this.task.prioridad = nueva;
    this.editandoPrioridad = false;
    this.cdr.detectChanges();
  }

  startEditDescIngenieria() {
    this.descIngenieriaEdit = this.task?.descripcionIngenieria || '';
    this.editandoDescIngenieria = true;
  }

  cancelEditDescIngenieria() {
    this.editandoDescIngenieria = false;
    this.descIngenieriaEdit = '';
  }

  async saveDescIngenieria() {
    if (!this.task?.id) return;
    await this.tasksService.updateTask(this.task.id, { descripcionIngenieria: this.descIngenieriaEdit });
    this.task.descripcionIngenieria = this.descIngenieriaEdit;
    this.editandoDescIngenieria = false;
  }

  startEditDescripcion() {
    this.descripcionEdit = this.task?.descripcion || '';
    this.editandoDescripcion = true;
  }

  cancelEditDescripcion() {
    this.editandoDescripcion = false;
    this.descripcionEdit = '';
  }

  async saveDescripcion() {
    if (!this.task?.id) return;
    await this.tasksService.updateTask(this.task.id, { descripcion: this.descripcionEdit });
    this.task.descripcion = this.descripcionEdit;
    this.editandoDescripcion = false;
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

  async completarTarea() {
    if (!this.task?.id) return;
    try {
      await this.tasksService.marcarPausaTarea(this.task.id);
      const mins = Math.round(this.tiempoActual / 60);
      await this.tasksService.updateTask(this.task.id, {
        estado: 'completada',
        completadoEn: new Date(),
        tiempoTotal: mins
      });
      await this.setEstadoTecnico('disponible');
      this.router.navigate([this.isAdmin ? '/admin' : '/dashboard']);
    } catch (error) {
      console.error('Error al completar tarea:', error);
      alert('Error al completar la tarea');
    }
  }

  goBack() { history.back(); }

  goHome() {
    this.router.navigate([this.isAdmin ? '/admin' : '/dashboard']);
  }
  stars(n: number) { return Array(n).fill(0); }
  emptyStars(n: number) { return Array(3 - n).fill(0); }

  getStatusLabel(estado: string): string {
    return this.getTaskStatusText(estado);
  }

  getPaymentClass(pago: string) {
    return pago === 'pagado' ? 'pagado' : pago === 'abono' ? 'abono' : 'no-pagado';
  }

  getPaymentLabel(pago: string): string {
    return this.getPaymentStatusText(pago);
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

  openNewWorkOrder() {
    this.router.navigate(['/tasks', this.task!.id, 'work-order'], { queryParams: { nuevo: 'true' } });
  }

  // ── Evidencia fotográfica ─────────────────────────────────────────
  private async comprimirImagen(file: File): Promise<Blob> {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        const maxPx = 1280;
        const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width  = Math.round(img.width  * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(b => resolve(b!), 'image/jpeg', 0.70);
      };
      img.src = URL.createObjectURL(file);
    });
  }

  private comprimirParaPDF(objectUrl: string): Promise<string> {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        const maxPx = 500;
        const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width  = Math.round(img.width  * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.50));
      };
      img.onerror = () => resolve('');
      img.src = objectUrl;
    });
  }

  async onFotosSelectedTD(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || !this.task?.id) return;
    const files = Array.from(input.files).slice(0, 30 - this.evidenciaFotos.length);
    if (!files.length) return;
    this.subiendoFotos = true;
    this.cdr.detectChanges();
    try {
      for (const file of files) {
        const objectUrl = URL.createObjectURL(file);
        const b64PDF = await this.comprimirParaPDF(objectUrl);
        const blob = await this.comprimirImagen(file);
        URL.revokeObjectURL(objectUrl);

        const nombre = `${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
        const storageRef = ref(firebaseStorage, `evidencia/${this.task!.id}/${nombre}`);
        await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
        const url = await getDownloadURL(storageRef);

        this.evidenciaFotos    = [...this.evidenciaFotos, url];
        this.evidenciaFotosPDF = [...this.evidenciaFotosPDF, b64PDF];
        this.cdr.detectChanges();
      }
      await this.tasksService.updateTask(this.task!.id, {
        evidenciaFotos:    this.evidenciaFotos,
        evidenciaFotosPDF: this.evidenciaFotosPDF,
      });
    } catch (e) {
      console.error('Error subiendo fotos:', e);
    }
    this.subiendoFotos = false;
    input.value = '';
    this.cdr.detectChanges();
  }

  async eliminarFotoTD(url: string) {
    if (!this.task?.id) return;
    if (!confirm('¿Eliminar esta foto?')) return;
    const idx = this.evidenciaFotos.indexOf(url);
    try {
      const storageRef = ref(firebaseStorage, url);
      await deleteObject(storageRef).catch(() => {});
    } catch {}
    this.evidenciaFotos = this.evidenciaFotos.filter(u => u !== url);
    if (idx >= 0) this.evidenciaFotosPDF = this.evidenciaFotosPDF.filter((_, i) => i !== idx);
    await this.tasksService.updateTask(this.task!.id, {
      evidenciaFotos:    this.evidenciaFotos,
      evidenciaFotosPDF: this.evidenciaFotosPDF,
    });
    this.cdr.detectChanges();
  }

  abrirLightboxTD(index: number) {
    this.lightboxIndex = index;
    this.lightboxUrl = this.evidenciaFotos[index];
  }

  cerrarLightboxTD() {
    this.lightboxUrl = null;
  }

  navLightboxTD(dir: 1 | -1) {
    const next = this.lightboxIndex + dir;
    if (next < 0 || next >= this.evidenciaFotos.length) return;
    this.lightboxIndex = next;
    this.lightboxUrl = this.evidenciaFotos[next];
  }

  // ── Fotos de descripción técnica ──────────────────────────────
  async onFotosDescSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || !this.task?.id) return;
    const files = Array.from(input.files).slice(0, 20 - this.descripcionFotos.length);
    if (!files.length) return;
    this.subiendoFotosDesc = true;
    this.cdr.detectChanges();
    try {
      for (const file of files) {
        const blob = await this.comprimirImagen(file);
        const nombre = `desc_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
        const storageRef = ref(firebaseStorage, `descripciones/${this.task!.id}/${nombre}`);
        await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
        const url = await getDownloadURL(storageRef);
        this.descripcionFotos = [...this.descripcionFotos, url];
        this.cdr.detectChanges();
      }
      await this.tasksService.updateTask(this.task!.id, { descripcionFotos: this.descripcionFotos });
    } catch (e) { console.error('Error subiendo fotos descripción:', e); }
    this.subiendoFotosDesc = false;
    input.value = '';
    this.cdr.detectChanges();
  }

  async eliminarFotoDesc(url: string) {
    if (!this.task?.id || !confirm('¿Eliminar esta foto?')) return;
    try { await deleteObject(ref(firebaseStorage, url)).catch(() => {}); } catch {}
    this.descripcionFotos = this.descripcionFotos.filter(u => u !== url);
    await this.tasksService.updateTask(this.task!.id, { descripcionFotos: this.descripcionFotos });
    this.cdr.detectChanges();
  }

  // ── Fotos de descripción ingeniería ───────────────────────────
  async onFotosDescIngSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || !this.task?.id) return;
    const files = Array.from(input.files).slice(0, 20 - this.descripcionIngenieriaFotos.length);
    if (!files.length) return;
    this.subiendoFotosDescIng = true;
    this.cdr.detectChanges();
    try {
      for (const file of files) {
        const blob = await this.comprimirImagen(file);
        const nombre = `descing_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
        const storageRef = ref(firebaseStorage, `descripciones/${this.task!.id}/${nombre}`);
        await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
        const url = await getDownloadURL(storageRef);
        this.descripcionIngenieriaFotos = [...this.descripcionIngenieriaFotos, url];
        this.cdr.detectChanges();
      }
      await this.tasksService.updateTask(this.task!.id, { descripcionIngenieriaFotos: this.descripcionIngenieriaFotos });
    } catch (e) { console.error('Error subiendo fotos ingeniería:', e); }
    this.subiendoFotosDescIng = false;
    input.value = '';
    this.cdr.detectChanges();
  }

  async eliminarFotoDescIng(url: string) {
    if (!this.task?.id || !confirm('¿Eliminar esta foto?')) return;
    try { await deleteObject(ref(firebaseStorage, url)).catch(() => {}); } catch {}
    this.descripcionIngenieriaFotos = this.descripcionIngenieriaFotos.filter(u => u !== url);
    await this.tasksService.updateTask(this.task!.id, { descripcionIngenieriaFotos: this.descripcionIngenieriaFotos });
    this.cdr.detectChanges();
  }

  // ── Puntos clave del servicio ─────────────────────────────────
  startEditPuntosClave() {
    this.puntosClaveEdit = this.task?.puntosClave || '';
    this.editandoPuntosClave = true;
  }
  cancelEditPuntosClave() { this.editandoPuntosClave = false; }
  async saveEditPuntosClave() {
    if (!this.task?.id) return;
    await this.tasksService.updateTask(this.task.id, { puntosClave: this.puntosClaveEdit });
    this.task.puntosClave = this.puntosClaveEdit;
    this.editandoPuntosClave = false;
    this.cdr.detectChanges();
  }

  async onFotosPKSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || !this.task?.id) return;
    const files = Array.from(input.files).slice(0, 20 - this.puntosClavesFotos.length);
    if (!files.length) return;
    this.subiendoFotosPK = true;
    this.cdr.detectChanges();
    try {
      for (const file of files) {
        const blob = await this.comprimirImagen(file);
        const nombre = `pk_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
        const storageRef = ref(firebaseStorage, `descripciones/${this.task!.id}/${nombre}`);
        await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
        const url = await getDownloadURL(storageRef);
        this.puntosClavesFotos = [...this.puntosClavesFotos, url];
        this.cdr.detectChanges();
      }
      await this.tasksService.updateTask(this.task!.id, { puntosClavesFotos: this.puntosClavesFotos });
    } catch (e) { console.error('Error subiendo fotos puntos clave:', e); }
    this.subiendoFotosPK = false;
    input.value = '';
    this.cdr.detectChanges();
  }

  async eliminarFotoPK(url: string) {
    if (!this.task?.id || !confirm('¿Eliminar esta foto?')) return;
    try { await deleteObject(ref(firebaseStorage, url)).catch(() => {}); } catch {}
    this.puntosClavesFotos = this.puntosClavesFotos.filter(u => u !== url);
    await this.tasksService.updateTask(this.task!.id, { puntosClavesFotos: this.puntosClavesFotos });
    this.cdr.detectChanges();
  }

  // ── Lightbox compartido para fotos de descripción ─────────────
  abrirDescLightbox(fotos: string[], index: number) {
    this.descLightboxFotos = fotos;
    this.descLightboxIndex = index;
    this.descLightboxUrl = fotos[index];
  }

  cerrarDescLightbox() { this.descLightboxUrl = null; }

  navDescLightbox(dir: 1 | -1) {
    const next = this.descLightboxIndex + dir;
    if (next < 0 || next >= this.descLightboxFotos.length) return;
    this.descLightboxIndex = next;
    this.descLightboxUrl = this.descLightboxFotos[next];
  }
}