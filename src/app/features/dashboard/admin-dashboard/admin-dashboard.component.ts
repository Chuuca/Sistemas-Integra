import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TasksService } from '../../../core/services/tasks.service';
import { UsersService } from '../../../core/services/users.service';
import { AuthService } from '../../../core/services/auth.service';
import { Task, createEmptyTask, getTaskStatusText, getPaymentStatusText, getPriorityText, getPriorityClass, calculateSaldoRestante } from '../../../core/models/task.model';
import { User } from '../../../core/models/user.model';
import { Subscription } from 'rxjs';
import jsPDF from 'jspdf';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss'
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  private tasksService = inject(TasksService);
  private usersService = inject(UsersService);
  private authService = inject(AuthService);
  router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  tasks: Task[] = [];
  users: User[] = [];
  filteredTasks: Task[] = [];
  filterStatus = 'todos';
  searchQuery = '';
  showModal = false;
  editingTask: Task | null = null;
  currentUser: User | null = null;

  private tasksSub?: Subscription;
  private usersSub?: Subscription;

  form = {
    cliente: '', direccion: '', telefono: '', descripcion: '',
    prioridad: 1 as 1|2|3, asignadoA: [] as string[], monto: 0,
    pago: 'no_pagado' as any, fechaProgramada: '',
    horaProgramada: '', materiales: [] as string[],
    notas: '', materialInput: '', duracionEstimada: 0,
    herramientasEspeciales: [] as string[], herramientasInput: '',
    equipos: [] as string[], equiposInput: ''
  };

  // ── Método auxiliar para normalizar fechas ──────────────────────────────
  private normalizeDate(fecha: any): Date {
    if (!fecha) return new Date();
    if (fecha instanceof Date) return fecha;
    if (typeof fecha === 'string') return new Date(fecha);
    if (fecha.toDate && typeof fecha.toDate === 'function') return fecha.toDate();
    return new Date(fecha);
  }

  // ── Métodos del modelo para usar en el template ─────────────────────────
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

  calculateSaldoRestante(task: Task): number {
    return calculateSaldoRestante(task);
  }

  // ── Ciclo de vida ──────────────────────────────────────────
  ngOnInit() {
    this.tasksService.deleteOldCompletedTasks();

    this.tasksSub = this.tasksService.getAllTasks().subscribe(t => {
      this.tasks = t.map(task => ({
        ...task,
        materiales: task.materiales || [],
        equiposNumeroDeSerie: task.equiposNumeroDeSerie || [],
        asignadoA: Array.isArray(task.asignadoA) ? task.asignadoA : [task.asignadoA],
        asignadoNombre: Array.isArray(task.asignadoNombre) ? task.asignadoNombre : [task.asignadoNombre || ''],
        fechaProgramada: this.normalizeDate(task.fechaProgramada),
        creadoEn: this.normalizeDate(task.creadoEn),
      }));
      this.applyFilter();
      this.cdr.detectChanges();
    });

    this.usersSub = this.usersService.getAllUsers().subscribe(u => {
      this.users = u.filter(user => user.nombre && user.email);
      this.cdr.detectChanges();
    });

    this.authService.getCurrentUserData().then(u => {
      this.currentUser = u;
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy() {
    this.tasksSub?.unsubscribe();
    this.usersSub?.unsubscribe();
  }

  // ── Filtros y búsqueda ─────────────────────────────────────
  applyFilter() {
    this.filteredTasks = this.filterStatus === 'todos'
      ? this.tasks
      : this.tasks.filter(t => t.estado === this.filterStatus);
  }

  setFilter(status: string) {
    this.filterStatus = status;
    this.applyFilter();
  }

  get searchResults(): Task[] {
    if (!this.searchQuery.trim()) return [];
    const q = this.searchQuery.toLowerCase();
    return this.tasks.filter(t =>
      t.cliente.toLowerCase().includes(q) ||
      t.folioId?.toLowerCase().includes(q) ||
      t.direccion?.toLowerCase().includes(q) ||
      (Array.isArray(t.asignadoNombre)
        ? t.asignadoNombre.some(n => n.toLowerCase().includes(q))
        : false)
    );
  }

  get displayedTasks(): Task[] {
    return this.searchQuery.trim() ? this.searchResults : this.filteredTasks;
  }

  // ── Resumen de técnicos ────────────────────────────────────
  get technicianSummary() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.users.map(user => {
      const userTasks = this.tasks.filter(t =>
        Array.isArray(t.asignadoA)
          ? t.asignadoA.includes(user.uid)
          : t.asignadoA === user.uid
      );

      const tareasHoy = userTasks.filter(t => {
        const fecha = this.normalizeDate(t.fechaProgramada);
        fecha.setHours(0, 0, 0, 0);
        return fecha >= today && fecha < tomorrow;
      });

      const completadasHoy = tareasHoy.filter(t => t.estado === 'completada');
      const pendientesHoy = tareasHoy.filter(t => t.estado !== 'completada');
      const tiempoEstimado = tareasHoy.reduce((a, t) => a + (t.duracionEstimada || 0), 0);
      const tiempoCompletado = completadasHoy.reduce((a, t) => a + (t.tiempoTotal || 0), 0);
      const tiempoRestante = Math.max(0, tiempoEstimado - tiempoCompletado);
      const progreso = tiempoEstimado > 0
        ? Math.round((tiempoCompletado / tiempoEstimado) * 100)
        : 0;

      return {
        uid: user.uid,
        nombre: user.nombre,
        email: user.email,
        totalHoy: tareasHoy.length,
        completadasHoy: completadasHoy.length,
        pendientesHoy: pendientesHoy.length,
        tiempoEstimado,
        tiempoRestante,
        progreso
      };
    });
  }

  // ── Modal ──────────────────────────────────────────────────
  openModal(task?: Task) {
    this.editingTask = task || null;
    if (task) {
      this.form = {
        cliente: task.cliente,
        direccion: task.direccion,
        telefono: task.telefono,
        descripcion: task.descripcion,
        prioridad: task.prioridad,
        asignadoA: Array.isArray(task.asignadoA) ? [...task.asignadoA] : [task.asignadoA as any],
        monto: task.monto,
        pago: task.pago,
        fechaProgramada: this.normalizeDate(task.fechaProgramada).toLocaleDateString('en-CA'),
        horaProgramada: task.horaProgramada || '',
        materiales: [...(task.materiales || [])],
        notas: task.notas || '',
        materialInput: '',
        duracionEstimada: task.duracionEstimada || 0,
        herramientasEspeciales: [...(task.herramientasEspeciales || [])],
        herramientasInput: '',
        equipos: [...(task.equipos || [])],
        equiposInput: ''
      };
    } else {
      this.form = {
        cliente: '', direccion: '', telefono: '', descripcion: '',
        prioridad: 1, asignadoA: [], monto: 0, pago: 'no_pagado',
        fechaProgramada: '', horaProgramada: '', materiales: [],
        notas: '', materialInput: '', duracionEstimada: 0,
        herramientasEspeciales: [], herramientasInput: '',
        equipos: [], equiposInput: ''
      };
    }
    this.showModal = true;
  }

  closeModal() { this.showModal = false; }

  // ── Materiales ─────────────────────────────────────────────
  addMaterial() {
    if (this.form.materialInput.trim()) {
      this.form.materiales.push(this.form.materialInput.trim());
      this.form.materialInput = '';
    }
  }

  removeMaterial(i: number) { this.form.materiales.splice(i, 1); }
  setPriority(p: 1|2|3) { this.form.prioridad = p; }

  addHerramienta() {
    if (this.form.herramientasInput.trim()) {
      this.form.herramientasEspeciales.push(this.form.herramientasInput.trim());
      this.form.herramientasInput = '';
    }
  }
  removeHerramienta(i: number) { this.form.herramientasEspeciales.splice(i, 1); }

  addEquipoForm() {
    if (this.form.equiposInput.trim()) {
      this.form.equipos.push(this.form.equiposInput.trim());
      this.form.equiposInput = '';
    }
  }
  removeEquipoForm(i: number) { this.form.equipos.splice(i, 1); }

  // ── Técnicos ───────────────────────────────────────────────
  toggleTecnico(uid: string) {
    const idx = this.form.asignadoA.indexOf(uid);
    if (idx === -1) {
      this.form.asignadoA.push(uid);
    } else {
      this.form.asignadoA.splice(idx, 1);
    }
  }

  isTecnicoSelected(uid: string): boolean {
    return this.form.asignadoA.includes(uid);
  }

  getTecnicoNames(uids: string | string[]): string {
    const arr = Array.isArray(uids) ? uids : [uids];
    return arr.map(val => {
      const byUid = this.users.find(u => u.uid === val);
      if (byUid) return byUid.nombre;
      const byNombre = this.users.find(u => u.nombre === val);
      if (byNombre) return byNombre.nombre;
      // Si parece un UID (sin espacios y largo), busca en users o muestra vacío
      if (val && val.length > 20 && !val.includes(' ')) return '';
      return val;
    }).filter(Boolean).join(', ');
  }

  // ── Guardar tarea usando createEmptyTask ──────────────────────────
 async saveTask() {
  try {
    const nombresAsignados = this.form.asignadoA.map(uid =>
      this.users.find(u => u.uid === uid)?.nombre || ''
    );

    const [y, m, d] = this.form.fechaProgramada.split('-').map(Number);
    const fechaLocal = this.form.fechaProgramada ? new Date(y, m - 1, d, 12, 0, 0) : new Date();

    // Crear objeto SOLO con los campos que tienen valor
    const taskData: any = {
      folioId: this.editingTask?.folioId || '',
      cliente: this.form.cliente,
      direccion: this.form.direccion || '',
      telefono: this.form.telefono || '',
      descripcion: this.form.descripcion || '',
      prioridad: this.form.prioridad,
      asignadoA: [...this.form.asignadoA],
      asignadoNombre: nombresAsignados,
      estado: this.editingTask?.estado || 'pendiente',
      pago: this.form.pago,
      monto: this.form.monto || 0,
      fechaProgramada: fechaLocal,
      horaProgramada: this.form.horaProgramada || '09:00',
      duracionEstimada: this.form.duracionEstimada || 0,
      materiales: this.form.materiales || [],
      equiposNumeroDeSerie: this.editingTask?.equiposNumeroDeSerie || [],
      tiempoTotal: this.editingTask?.tiempoTotal || 0,
      notas: this.form.notas || '',
      herramientasEspeciales: this.form.herramientasEspeciales || [],
      equipos: this.form.equipos || [],
      creadoPor: this.currentUser?.uid || '',
      creadoEn: new Date(),
      montoAbonado: 0,
      anticipoRecibido: 0,
      saldoRestante: this.form.monto || 0,
      planCobro: 'al_finalizar'
    };
    
  
    // No incluir completadoEn, tiempoInicio, ultimaActualizacionCrono

    if (this.editingTask?.id) {
      // Para actualización, puedes incluir más campos
      await this.tasksService.updateTask(this.editingTask.id, taskData);
    } else {
      // Para creación, solo campos básicos
      await this.tasksService.createTask(taskData);
    }
    
    this.closeModal();
    
    // Recargar tareas
    this.tasksSub = this.tasksService.getAllTasks().subscribe(t => {
      this.tasks = t.map(task => ({
        ...task,
        fechaProgramada: this.normalizeDate(task.fechaProgramada),
        creadoEn: this.normalizeDate(task.creadoEn),
      }));
      this.applyFilter();
      this.cdr.detectChanges();
    });
  } catch (error) {
    console.error('Error al guardar tarea:', error);
    alert('Error al guardar la tarea: ' + error);
  }
}

  async deleteTask(id: string) {
    if (confirm('¿Eliminar esta tarea?')) {
      await this.tasksService.deleteTask(id);
    }
  }

  // ── Navegación ─────────────────────────────────────────────
  openTask(id: string) { this.router.navigate(['/tasks', id]); }
  logout() { this.authService.logout(); }

  // ── Getters de métricas ────────────────────────────────────
  get totalTasks() { return this.tasks.length; }
  get completadas() { return this.tasks.filter(t => t.estado === 'completada').length; }
  get enProgreso() { return this.tasks.filter(t => t.estado === 'en_progreso').length; }
  get pendientes() { return this.tasks.filter(t => t.estado === 'pendiente').length; }

  // ── Formato ────────────────────────────────────────────────
  formatMinutos(mins: number): string {
    if (mins === 0) return '0m';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  getStatusLabel(estado: string): string {
    return this.getTaskStatusText(estado);
  }

  getPaymentLabel(pago: string): string {
    return this.getPaymentStatusText(pago);
  }
  
  generandoReporte = false;

  // ── Cargar logo para PDF ───────────────────────────────────
  private async cargarLogoBase64(): Promise<string> {
    try {
      const response = await fetch('https://firebasestorage.googleapis.com/v0/b/sistemasintegra.firebasestorage.app/o/logo%20bien%20hecho-modified.png?alt=media&token=ce014cfa-5c0c-4533-ad07-dc6e3d0519bc');
      const blob = await response.blob();
      return await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.warn('No se pudo cargar el logo:', e);
      return '';
    }
  }

  async generarReportePDF() {
    if (this.generandoReporte) return;
    this.generandoReporte = true;

    const logoBase64 = await this.cargarLogoBase64();

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    const contentWidth = pageWidth - margin * 2;
    let y = 15;

    const checkPage = () => {
      if (y > 270) { doc.addPage(); y = 15; }
    };

    const addTitle = (text: string) => {
      checkPage();
      doc.setFillColor(30, 58, 110);
      doc.rect(margin, y - 5, contentWidth, 8, 'F');
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text(text, margin + 2, y);
      y += 7;
      doc.setTextColor(0, 0, 0);
    };

    const addSubtitle = (text: string) => {
      checkPage();
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 58, 110);
      doc.text(text, margin, y);
      y += 5;
      doc.setTextColor(0, 0, 0);
    };

    const addRow = (label: string, value: string, indent = 0) => {
      checkPage();
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(80, 80, 80);
      doc.text(`${label}:`, margin + indent, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      const lines = doc.splitTextToSize(value || '-', contentWidth - 45);
      doc.text(lines, margin + 40 + indent, y);
      y += Math.max(lines.length * 4, 5) + 1;
    };

    const addLine = () => {
      checkPage();
      doc.setDrawColor(220, 220, 220);
      doc.line(margin, y, pageWidth - margin, y);
      y += 3;
    };

    const addSpacer = () => { y += 3; };

    // BANNER CON LOGO
    doc.setFillColor(30, 58, 110);
    doc.rect(0, 0, pageWidth, 28, 'F');

    if (logoBase64) {
      try {
        doc.addImage(logoBase64, 'PNG', margin, 2, 24, 24);
      } catch (e) { console.warn('Error insertando logo:', e); }
    }

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('Sistemas Integra', margin + 28, 12);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Tecnologia  Seguridad  Control', margin + 28, 18);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Reporte del Dia', pageWidth - margin, 12, { align: 'right' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }), pageWidth - margin, 19, { align: 'right' });

    y = 35;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const tareasHoy = this.tasks.filter(t => {
      const f = this.normalizeDate(t.fechaProgramada);
      f.setHours(0, 0, 0, 0);
      return f >= today && f < tomorrow && !t.cliente?.includes('Pedido');
    });

    const completadasHoy = tareasHoy.filter(t => t.estado === 'completada');
    const enProgresoHoy = tareasHoy.filter(t => t.estado === 'en_progreso');
    const pendientesHoy = tareasHoy.filter(t => t.estado === 'pendiente');
    const pedidosPendientes = this.tasks.filter(t => t.cliente?.includes('Pedido'));

    const montoTotalHoy = tareasHoy.reduce((a, t) => a + (t.monto || 0), 0);
    const montoCobradoHoy = tareasHoy
      .filter(t => t.pago === 'pagado')
      .reduce((a, t) => a + (t.monto || 0), 0);
    const montoPendienteHoy = tareasHoy
      .filter(t => t.pago !== 'pagado')
      .reduce((a, t) => a + (t.monto || 0), 0);
    const montoAbonosHoy = tareasHoy
      .filter(t => t.pago === 'abono')
      .reduce((a, t) => a + (t.montoAbonado || 0), 0);
    const tiempoTotalHoy = completadasHoy.reduce((a, t) => a + (t.tiempoTotal || 0), 0);

    addTitle('RESUMEN GENERAL DEL DIA');
    addSpacer();

    const col1x = margin + 2;
    const col2x = pageWidth / 2 + 5;

    const addMetric = (label: string, value: string, x: number, yPos: number, color: number[] = [0,0,0]) => {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(80, 80, 80);
      doc.text(`${label}`, x, yPos);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(color[0], color[1], color[2]);
      doc.text(value, x, yPos + 6);
      doc.setTextColor(0, 0, 0);
    };

    addMetric('Tareas programadas hoy', String(tareasHoy.length), col1x, y, [30, 58, 110]);
    addMetric('Completadas', String(completadasHoy.length), col2x, y, [16, 185, 129]);
    y += 14;
    addMetric('En progreso', String(enProgresoHoy.length), col1x, y, [245, 158, 11]);
    addMetric('Pendientes', String(pendientesHoy.length), col2x, y, [239, 68, 68]);
    y += 14;
    addMetric('Tiempo trabajado', this.formatMinutos(tiempoTotalHoy), col1x, y, [30, 58, 110]);
    addMetric('Pedidos pendientes', String(pedidosPendientes.length), col2x, y, [107, 114, 128]);
    y += 16;
    addLine();

    addTitle('COBRANZA DEL DIA');
    addSpacer();
    addMetric('Monto total programado', `$${montoTotalHoy.toLocaleString('es-MX')}`, col1x, y, [30, 58, 110]);
    addMetric('Cobrado', `$${montoCobradoHoy.toLocaleString('es-MX')}`, col2x, y, [16, 185, 129]);
    y += 14;
    addMetric('Abonos recibidos', `$${montoAbonosHoy.toLocaleString('es-MX')}`, col1x, y, [245, 158, 11]);
    addMetric('Por cobrar', `$${montoPendienteHoy.toLocaleString('es-MX')}`, col2x, y, [239, 68, 68]);
    y += 16;
    addLine();

    addTitle('RESUMEN POR TECNICO');
    addSpacer();

    for (const tec of this.technicianSummary) {
      if (tec.totalHoy === 0) continue;
      checkPage();

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 58, 110);
      doc.text(tec.nombre, margin + 2, y);
      y += 5;

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text(`Tareas hoy: ${tec.totalHoy}  |  Completadas: ${tec.completadasHoy}  |  Pendientes: ${tec.pendientesHoy}  |  Progreso: ${tec.progreso}%`, margin + 4, y);
      y += 4;
      doc.text(`Tiempo estimado: ${this.formatMinutos(tec.tiempoEstimado)}  |  Tiempo restante: ${this.formatMinutos(tec.tiempoRestante)}`, margin + 4, y);
      y += 6;

      const barWidth = contentWidth - 4;
      doc.setFillColor(229, 231, 235);
      doc.rect(margin + 2, y, barWidth, 3, 'F');
      if (tec.progreso > 0) {
        doc.setFillColor(16, 185, 129);
        doc.rect(margin + 2, y, barWidth * (tec.progreso / 100), 3, 'F');
      }
      y += 7;
      addLine();
    }

    addTitle('DETALLE DE TAREAS DEL DIA');
    addSpacer();

    if (tareasHoy.length === 0) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(120, 120, 120);
      doc.text('Sin tareas programadas para hoy.', margin + 2, y);
      y += 6;
    } else {
      doc.setFillColor(243, 244, 246);
      doc.rect(margin, y - 3, contentWidth, 7, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 58, 110);
      doc.text('Cliente', margin + 2, y + 1);
      doc.text('Tecnico', margin + 65, y + 1);
      doc.text('Estado', margin + 110, y + 1);
      doc.text('Pago', margin + 140, y + 1);
      doc.text('Monto', margin + 160, y + 1);
      y += 7;

      for (const t of tareasHoy) {
        checkPage();
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);

        const clienteStr = doc.splitTextToSize(t.cliente || '-', 60);
        const tecStr = doc.splitTextToSize(
          Array.isArray(t.asignadoNombre) ? t.asignadoNombre.join(', ') : (t.asignadoNombre as unknown as string || '-'),
          42
        );
        const estadoStr = this.getTaskStatusText(t.estado);
        const pagoStr = this.getPaymentStatusText(t.pago);
        const montoStr = `$${(t.monto || 0).toLocaleString('es-MX')}`;

        const rowH = Math.max(clienteStr.length, tecStr.length) * 4 + 2;

        if (t.estado === 'completada') {
          doc.setFillColor(240, 253, 244);
          doc.rect(margin, y - 2, contentWidth, rowH, 'F');
        } else if (t.estado === 'en_progreso') {
          doc.setFillColor(255, 251, 235);
          doc.rect(margin, y - 2, contentWidth, rowH, 'F');
        }

        doc.text(clienteStr, margin + 2, y);
        doc.text(tecStr, margin + 65, y);
        doc.text(estadoStr, margin + 110, y);
        doc.text(pagoStr, margin + 140, y);
        doc.text(montoStr, margin + 160, y);
        y += rowH;

        doc.setDrawColor(229, 231, 235);
        doc.line(margin, y - 1, pageWidth - margin, y - 1);
      }
    }

    addSpacer();

    if (pedidosPendientes.length > 0) {
      addTitle('PEDIDOS DE MATERIALES PENDIENTES');
      addSpacer();

      for (const p of pedidosPendientes) {
        checkPage();
        const solicitante = Array.isArray(p.asignadoNombre)
          ? p.asignadoNombre.join(', ')
          : (p.asignadoNombre as unknown as string || '-');
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(p.folioId || '-', margin + 2, y);
        doc.setFont('helvetica', 'normal');
        doc.text(`Solicitante: ${solicitante}`, margin + 30, y);
        doc.text(`Monto: $${(p.monto || 0).toLocaleString('es-MX')}`, margin + 130, y);
        y += 5;
        const desc = doc.splitTextToSize(p.descripcion || '-', contentWidth - 4);
        doc.setFontSize(8);
        doc.setTextColor(80, 80, 80);
        doc.text(desc, margin + 4, y);
        y += desc.length * 4 + 3;
        addLine();
      }
    }

    const totalPages = (doc.internal as any).getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFillColor(30, 58, 110);
      doc.rect(0, 287, pageWidth, 10, 'F');
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(255, 255, 255);
      doc.text('Sistemas Integra - El Motor Tecnologico de tu Empresa', margin, 293);
      doc.text(`Pagina ${i} de ${totalPages}  |  Generado: ${new Date().toLocaleString('es-MX')}`, pageWidth - margin, 293, { align: 'right' });
    }

    try {
      doc.save(`Reporte_${new Date().toLocaleDateString('en-CA')}.pdf`);
    } finally {
      this.generandoReporte = false;
      this.cdr.detectChanges();
    }
  }

  // ── separacion por tareas y pedidos ────────────────────────────────────────────────
  get pedidos(): Task[] {
    return this.displayedTasks.filter(t => t.cliente?.includes('Pedido'));
  }

  get tareasNormales(): Task[] {
    return this.displayedTasks.filter(t => !t.cliente?.includes('Pedido'));
  }

  get tareasNormalesPorTecnico(): { uid: string; nombre: string; tareas: Task[] }[] {
    const normales = this.tareasNormales;
    const map = new Map<string, { uid: string; nombre: string; tareas: Task[] }>();

    // Inicializar un grupo por cada usuario registrado
    for (const user of this.users) {
      if (user.nombre && user.email) {
        map.set(user.uid, { uid: user.uid, nombre: user.nombre, tareas: [] });
      }
    }

    // Asignar tareas a sus grupos
    for (const task of normales) {
      const uids: string[] = Array.isArray(task.asignadoA) ? task.asignadoA : [task.asignadoA as any];
      const nombres: string[] = Array.isArray(task.asignadoNombre) ? task.asignadoNombre : [task.asignadoNombre as any];

      if (uids.length === 0 || !uids[0]) {
        if (!map.has('sin_asignar')) {
          map.set('sin_asignar', { uid: 'sin_asignar', nombre: 'Sin asignar', tareas: [] });
        }
        map.get('sin_asignar')!.tareas.push(task);
      } else {
        for (let i = 0; i < uids.length; i++) {
          const uid = uids[i];
          const rawNombre = nombres[i] || uid;
          const nombre = (rawNombre.length > 20 && !rawNombre.includes(' '))
            ? (this.users.find(u => u.uid === rawNombre)?.nombre || this.users.find(u => u.uid === uid)?.nombre || rawNombre)
            : rawNombre;
          if (!map.has(uid)) {
            map.set(uid, { uid, nombre, tareas: [] });
          }
          map.get(uid)!.tareas.push(task);
        }
      }
    }

    // Sin asignar al final
    const sinAsignar = map.get('sin_asignar');
    if (sinAsignar) {
      map.delete('sin_asignar');
      map.set('sin_asignar', sinAsignar);
    }

    return Array.from(map.values());
  }

  stars(n: number) { return Array(n).fill(0); }
  emptyStars(n: number) { return Array(3 - n).fill(0); }
}