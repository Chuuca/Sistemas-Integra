import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { TasksService } from '../../../core/services/tasks.service';
import { User } from '../../../core/models/user.model';
import { Task } from '../../../core/models/task.model';

interface WorksheetTemplate {
  nombre: string;
  tipo: string;
  secciones: {
    titulo: string;
    items: { label: string; checked: boolean; nota: string; }[];
  }[];
}

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.scss'
})
export class ReportsComponent implements OnInit {
  private authService = inject(AuthService);
  private tasksService = inject(TasksService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  currentUser: User | null = null;
  activeTab: 'worksheet' | 'estadisticas' = 'worksheet';
  selectedTemplate = '';
  tasks: Task[] = [];

  templates: WorksheetTemplate[] = [
    {
      nombre: 'Mantenimiento Preventivo',
      tipo: 'preventivo',
      secciones: [
        {
          titulo: 'Revisión General',
          items: [
            { label: 'Inspección visual del equipo', checked: false, nota: '' },
            { label: 'Verificación de conexiones eléctricas', checked: false, nota: '' },
            { label: 'Limpieza de componentes internos', checked: false, nota: '' },
            { label: 'Revisión de cables y arnés', checked: false, nota: '' },
          ]
        },
        {
          titulo: 'Pruebas de Funcionamiento',
          items: [
            { label: 'Prueba de encendido y apagado', checked: false, nota: '' },
            { label: 'Verificación de temperatura de operación', checked: false, nota: '' },
            { label: 'Prueba de sensores', checked: false, nota: '' },
          ]
        }
      ]
    },
    {
      nombre: 'Instalación de Equipo',
      tipo: 'instalacion',
      secciones: [
        {
          titulo: 'Pre-instalación',
          items: [
            { label: 'Verificación de espacio físico', checked: false, nota: '' },
            { label: 'Revisión de alimentación eléctrica', checked: false, nota: '' },
            { label: 'Verificación de materiales completos', checked: false, nota: '' },
          ]
        },
        {
          titulo: 'Instalación',
          items: [
            { label: 'Montaje físico del equipo', checked: false, nota: '' },
            { label: 'Conexiones eléctricas', checked: false, nota: '' },
            { label: 'Configuración inicial', checked: false, nota: '' },
            { label: 'Prueba de funcionamiento', checked: false, nota: '' },
          ]
        }
      ]
    },
    {
      nombre: 'Reparación / Diagnóstico',
      tipo: 'reparacion',
      secciones: [
        {
          titulo: 'Diagnóstico',
          items: [
            { label: 'Descripción de la falla reportada', checked: false, nota: '' },
            { label: 'Inspección visual de daños', checked: false, nota: '' },
            { label: 'Pruebas de diagnóstico', checked: false, nota: '' },
          ]
        },
        {
          titulo: 'Reparación',
          items: [
            { label: 'Componentes reemplazados', checked: false, nota: '' },
            { label: 'Ajustes realizados', checked: false, nota: '' },
            { label: 'Prueba final de funcionamiento', checked: false, nota: '' },
          ]
        }
      ]
    }
  ];

  activeTemplate: WorksheetTemplate | null = null;

  ngOnInit() {
    this.authService.getCurrentUserData().then(u => {
      this.currentUser = u;
      if (u?.uid) {
        const obs = u.rol === 'admin'
          ? this.tasksService.getAllTasks()
          : this.tasksService.getTasksByUser(u.uid);

        obs.subscribe(t => {
          this.tasks = t.map(task => ({
            ...task,
            fechaProgramada: (task.fechaProgramada as any)?.toDate?.() ?? task.fechaProgramada,
            creadoEn: (task.creadoEn as any)?.toDate?.() ?? task.creadoEn,
          }));
          this.cdr.detectChanges();
        });
      }
      this.cdr.detectChanges();
    });
  }

  selectTemplate(nombre: string) {
    const t = this.templates.find(t => t.nombre === nombre);
    if (t) {
      this.activeTemplate = JSON.parse(JSON.stringify(t));
      this.cdr.detectChanges();
    }
  }

  get totalItems() {
    return this.activeTemplate?.secciones.reduce((a, s) => a + s.items.length, 0) ?? 0;
  }

  get checkedItems() {
    return this.activeTemplate?.secciones.reduce((a, s) =>
      a + s.items.filter(i => i.checked).length, 0) ?? 0;
  }

  get progress() {
    return this.totalItems > 0 ? Math.round((this.checkedItems / this.totalItems) * 100) : 0;
  }

  // Estadísticas
  get totalTareas() { return this.tasks.length; }
  get completadas() { return this.tasks.filter(t => t.estado === 'completada').length; }
  get pendientes() { return this.tasks.filter(t => t.estado === 'pendiente').length; }
  get montoCobrado() {
    return this.tasks
      .filter(t => t.pago === 'pagado')
      .reduce((a, t) => a + (t.monto || 0), 0);
  }
  get tiempoTotalMin() {
    return this.tasks.reduce((a, t) => a + (t.tiempoTotal || 0), 0);
  }
  get tiempoFormateado() {
    const h = Math.floor(this.tiempoTotalMin / 60);
    const m = this.tiempoTotalMin % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }
  get porcentajeCompletado() {
    return this.totalTareas > 0
      ? Math.round((this.completadas / this.totalTareas) * 100)
      : 0;
  }
  get tareasCompletadasList() {
    return this.tasks.filter(t => t.estado === 'completada');
  }

  generatePdf() { window.print(); }
  goBack() { history.back(); }
}