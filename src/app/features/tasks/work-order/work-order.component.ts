import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { WorkOrderService } from '../../../core/services/work-order.service';
import { TasksService } from '../../../core/services/tasks.service';
import { AuthService } from '../../../core/services/auth.service';
import { WorkOrder, WorkOrderAlarmaMercadoSJ, WorkOrderType } from '../../../core/models/work-order.model';
import { Task } from '../../../core/models/task.model';
import { User } from '../../../core/models/user.model';
import jsPDF from 'jspdf';
import emailjs from '@emailjs/browser';

@Component({
  selector: 'app-work-order',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './work-order.component.html',
  styleUrl: './work-order.component.scss'
})
export class WorkOrderComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private workOrderService = inject(WorkOrderService);
  private tasksService = inject(TasksService);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  task: Task | null = null;
  currentUser: User | null = null;
  workOrder: WorkOrder | null = null;
  loading = true;
  guardando = false;
  guardado = false;
  generandoPDF = false;
  hojasGuardadas: WorkOrder[] = [];

  tipoSeleccionado: WorkOrderType | null = null;
  tiposSeleccionados: WorkOrderType[] = [];
  modoMultiple = false;

  firmaCanvas: HTMLCanvasElement | null = null;
  firmaDibujando = false;
  firmaDataUrl = '';
  firmasPorTipo: { [key: string]: string } = {};

  credenciales = {
    correoCliente: '',
    sistema: '',
    contrasena: '',
    claveCifrado: '',
    notasAcceso: '',
  };
  enviandoCorreo = false;
  correoEnviado = false;
  errorCorreo = '';

  tipos: { value: WorkOrderType; label: string }[] = [
    { value: 'cctv_instalacion', label: 'CCTV Instalacion' },
    { value: 'cctv_reparacion', label: 'CCTV Reparacion' },
    { value: 'alarma_instalacion', label: 'Alarma Instalacion' },
    { value: 'alarma_mercado_san_juan', label: 'Alarma Mercado San Juan' },
    { value: 'instalacion_general', label: 'Instalacion General' },
    { value: 'pos_sr_instalacion', label: 'POS SR Instalacion/Servicio' },
    { value: 'pos_sistema_instalacion', label: 'POS Sistema Instalacion' },
    { value: 'pos_servicio', label: 'POS Servicio' },
    { value: 'pos_mantenimiento', label: 'POS Mantenimiento' },
    { value: 'sistema_otros', label: 'Sistema Otros' },
    { value: 'servicio_mantenimiento', label: 'Servicio y/o Mantenimiento' },
    { value: 'garantia_reparacion', label: 'Garantia y Reparaciones' },
    { value: 'audio', label: 'Audio' },
    { value: 'video', label: 'Video' },
    { value: 'telefonia', label: 'Telefonia' },
    { value: 'soft_restaurant_instalacion', label: 'Soft Restaurant Instalacion' },
    { value: 'soft_restaurant_servicio', label: 'Soft Restaurant Servicio/Reparacion' },
    { value: 'servicio_reparacion_general', label: 'Servicio/Reparacion General' },
    { value: 'lab_diagnostico', label: 'HDT Diagnostico de Laboratorio' },
    { value: 'recibo_equipo', label: 'Checklist Recibo de Equipo' },
    { value: 'pos_perifericos_instalacion', label: 'POS y Perifericos Instalacion' },
    { value: 'canalizacion_conduit', label: 'Canalizacion Conduit Instalacion' },
    { value: 'cctv_servicio', label: 'CCTV Servicio Mantenimiento Reparacion' },
  ];

  cctv = {
    limpiezaAreas: false, trayectosFijados: false, zonaGrabadorOrganizada: false,
    materialesAdicionales: '', firmaTecnico: '', firmaSupervisor: '',
    numeroCamaras: 0, tiempoGrabacion: '', capacidadAlmacenamiento: '',
    grabacionVerificada: false, hikConnectOperativo: false, fechaHoraVerificada: false,
    numeroSerie: '', internetBajada: '', internetSubida: '', recomendaciones: '',
    demostracionRealizada: false, canalizacionProfesional: false, areaLimpia: false,
    vistaCorrectaCamaras: false, explicacionBasica: false, sabeContactarSoporte: false,
    personalProfesional: false, capacitacionRealizada: false, sabesolicitarSoporte: false,
    entiendeLimitesGarantia: false, recomendoContrasenas: false, calificacion: 0,
    nps: '', solicitaSeguimiento: false, comentarios: '', nombreFirmaCliente: '',
  };

  alarma = {
    limpiezaAreas: false, trayectosFijados: false, gabineteOrganizado: false,
    cableadoIdentificado: false, alimentacionVerificada: false, comunicacionVerificada: false,
    pruebasDisparo: false, cantidadPIR: 0, cantidadContactos: 0, cantidadHumo: 0,
    cantidadPanico: 0, cantidadSirenas: 0, cantidadTeclados: 0, cantidadControles: 0,
    materialesAdicionales: '', firmaTecnico: '', firmaSupervisor: '', modeloPanel: '',
    numeroSerie: '', sensoresVerificados: false, zonasValidadas: false, sirenaVerificada: false,
    hikConnectOperativo: false, alertaHumoVerificada: false, notificacionesVerificadas: false,
    fechaHoraVerificada: false, usuariosConfigurados: false, armadoDesarmadoVerificado: false,
    bateriaVerificada: false, internetVerificado: false, internetBajada: '', internetSubida: '',
    senalInalambrica: '', ubicacionPanel: '', recomendaciones: '', demostracionRealizada: false,
    canalizacionProfesional: false, areaLimpia: false, sensoresVerificadosCliente: false,
    explicacionBasica: false, sabeContactarSoporte: false, personalProfesional: false,
    capacitacionRealizada: false, sabeArmarDesarmar: false, sabeResponderAlarma: false,
    sabesolicitarSoporte: false, entiendeLimitesGarantia: false, recomendoContrasenas: false,
    calificacion: 0, nps: '', solicitaSeguimiento: false, comentarios: '', nombreFirmaCliente: '',
  };

  alarmaMarket: WorkOrderAlarmaMercadoSJ = {
    tuberiaAlarmaIngreso: false, tuberiaIngresoPanaderia: false, tuberiaPanelSirenaTecladoSensor: false,
    tuberiaIngresoSensorJalon: false, tuberiaIncendioServicio: false, tuberiaElectricaInternet: false,
    cableadoTotal: false, cajasRegistroInstaladas: false, sinCableadoExpuesto: false, tapasRegistros: false,
    panelFijadoMuro: false, panelInstalado: false, gabineteInterconectado: false, expansorInstalado: false,
    multicontactoInstalado: false, bateriaConectada: false, relevadorInstalado: false,
    ordenConexionesInternas: false, tuberiaConduitFirme: false, sinCableadoExpuestoPanel: false,
    tapasRegistrosPanel: false, ethernetActivo: false, panelHikConnect: false,
    nombreSucursalTeclado: false, fechaHoraConfig: false, retardoEntradaServicio: false,
    retardoSalidaServicio: false, botonesPanico247: false, sensorHumoPanaderia247: false,
    z1CortinaPuertaServicio: false, z3CortinaPrincipal: false, z5SensorHumoPanaderia: false,
    pir1: false, pir2: false, pir3: false, pir4: false,
    pir5: false, pir6: false, pir7: false, pir8: false,
    panicoCaja1: false, panicoCaja2: false, panicoCaja3: false,
    sensorHumoPanaderiaPrueba: false, palancaServicioSirenas: false, palancaIngresoSirenas: false,
    sensoresAutonomosProbados: false, sirenaInteriorActiva: false, sirenaExteriorActiva: false,
    estroboExterior: false, relevadorActivando: false, armadoCorrecto: false, desarmadoCorrecto: false,
    retardoEntradaFuncionando: false, nombreSucursalVisible: false, fechaHoraCorrectas: false,
    internetValidado: false, panelEnLinea: false, appProbada: false, recepcionEventos: false,
    armadoDesarmadoRemoto: false, fotoPanelAbierto: false, fotoPanelCerrado: false,
    fotoSensoresCortina: false, fotoSirenaExterior: false, fotoTeclado: false, fotoIngresoGeneral: false,
    instalacionValidadaIngeniero: false, pruebasFuncionalesOK: false, sistemaEntregadoOperativo: false,
    firmaTecnico: '', nombreValidacionIngenieria: '', firmaValidacionIngenieria: '',
    demostracionRealizada: false, canalizacionProfesional: false, appEnCliente: false,
    explicacionBasica: false, sabeContactarSoporte: false, personalProfesional: false,
    capacitacionRealizada: false, sabesolicitarSoporte: false, entiendeLimitesGarantia: false,
    recomendoContrasenas: false, calificacion: 0, nps: '', solicitaSeguimiento: false,
    comentarios: '', nombreFirmaCliente: '',
  };

  general = {
    tipoServicio: [] as string[], sistemaAtendido: [] as string[], materialesUtilizados: '',
    reporteCliente: '', diagnosticoTecnico: '', actividadesRealizadas: [] as string[],
    detallesCliente: '', internetBajada: '', internetSubida: '', firmaTecnico: '',
    demostracionRealizada: false, canalizacionProfesional: false, areaLimpia: false,
    explicacionBasica: false, sabeContactarSoporte: false, personalProfesional: false,
    capacitacionRealizada: false, sabesolicitarSoporte: false, entiendeLimitesGarantia: false,
    calificacion: 0, nps: '', solicitaSeguimiento: false, comentarios: '', nombreFirmaCliente: '',
  };

  softInstalacion = {
    equipoImplementado: '', cableModemCaja: false, cableImpresorasCaja: false,
    cableComanderosCaja: false, cableAPWifi: false, montajeCajaPeinado: false,
    peinadoCableCpu: false, peinadoCableEquipos: false, licenciaActiva: false,
    baseDatosInicializada: false, menuCapturado: false, softwareSoporte: false,
    driversImpresoras: false, monitoresTouchAlineados: false, ipFija: false,
    correosConfigurados: false, ingresoRemoto: false, internetNavega: false,
    tabletsConfiguradas: false, fotoCajaInstalada: false, fotoTablets: false,
    fotoZonaCaja: false, fotoComanderos: false, instalacionValidadaIngeniero: false,
    pruebasImpresionOK: false, sistemaListoEntrega: false, capacitacionBrindada: false,
    nombreTecnico: '', firmaTecnico: '', nombreIngenieria: '', firmaIngenieria: '',
    demostracionRealizada: false, canalizacionProfesional: false, correoPruebaRecibido: false,
    capacitacionCompleta: false, personalProfesional: false, listoParaUsar: false,
    sabesolicitarSoporte: false, garantia30Dias: false, entiendeLimitesGarantia: false,
    contrasenaAdministradora: false, calificacion: 0, nps: '', solicitaSeguimiento: false,
    comentarios: '', nombreFirmaCliente: '',
  };

  softServicio = {
    detalleEncontrado: '', pruebaImpresionAreas: false, equiposEnlazados: false,
    fechaHoraCorrecta: false, fotoDetalleResuelto: false, detalleResuelto: false,
    descripcionProblemaResolucion: '', sistemaListoEntrega: false, nombreColaborador: '',
    firmaColaborador: '', calificacion: 0, solicitaSeguimiento: false,
    comentarios: '', nombreFirmaCliente: '',
  };

  reparacionGeneral = {
    detalleEncontrado: '', fotoDetalleResuelto: false, detalleResuelto: false,
    descripcionProblemaResolucion: '', solucionListaEntrega: false, nombreColaborador: '',
    firmaColaborador: '', calificacion: 0, solicitaSeguimiento: false,
    comentarios: '', nombreFirmaCliente: '',
  };

  labDiagnostico = {
    ingeniero: '', cliente: '', marcaModelo: '', numeroSerie: '',
    tipoGarantia: false, tipoReparacion: false, tipoRevision: false,
    sinDanosVisibles: false, golpesDetectados: false, humedadDetectada: false,
    sulfatacionDetectada: false, componentesFaltantes: false,
    sellosGarantiaDanados: false, manipulacionPreviaDetectada: false,
    otroEstadoFisico: '', observacionesEstado: '',
    enciendeCorrectamente: false, noEnciende: false,
    fuentePoderFuncional: false, fuentePoderDefectuosa: false,
    comunicacionCorrecta: false, comunicacionIntermitente: false,
    sinComunicacion: false, comunicacionNoAplica: false,
    operaCorrectamente: false, fallaEnTodo: false, fallaIntermitente: false,
    errorConfiguracion: false, firmwareDesactualizado: false,
    firmwareCorrupto: false, danoFisicoInterno: false,
    danoPorDescargaElectrica: false, danoPorHumedad: false, noSeDetectoFalla: false,
    descripcionFalla: '',
    fotografiasInternas: false, fotografiasComponentesDanados: false,
    videoFuncionamiento: false, evidenciaWhatsapp: false,
    accionReconfiguracion: false, accionActualizacionFirmware: false,
    accionReparacionInterna: false, accionReemplazoComponente: false,
    accionReemplazoTotal: false, accionEnvioGarantia: false,
    accionSinReparacion: false, accionNoReparable: false,
    noRequiereRefacciones: false, siRequiereRefacciones: false,
    descripcionRefacciones: '', costoEstimado: 0, costoManoObra: 0,
    resultadoReparado: false, resultadoPendienteGarantia: false,
    resultadoPendienteRefacciones: false, resultadoEnviarProveedor: false,
    resultadoGarantiaCobertura: false, resultadoGarantiaRechazada: false,
    resultadoListoEntrega: false, resultadoNoReparable: false,
    horasInvertidas: 0, dictamenTecnico: '', firmaTecnico: '',
    correoEnvioCotizacion: '',
  };

  reciboEquipo = {
    colaborador: '', cliente: '', telefono: '', direccionEnvio: '',
    correoElectronico: '', marcaModelo: '', sn: '', contraseniaCliente: '', direccionIP: '',
    prioridadBaja: false, prioridadMedia: false, prioridadAlta: false, prioridadCritica: false,
    tiempoEstimado: '', descripcionFalla: '',
    tipoGarantia: false, tipoReparacion: false, tipoRevision: false, tipoDevolucion: false,
    cajaOriginal: false, cablesConexion: false, baseMontaje: false,
    bateria: false, fuentePoder: false, otroAccesorio: '',
    estadoEnciende: false, estadoNoEnciende: false, estadoNoPosibleProbar: false,
    huelaQuemado: false, estaGolpeado: false, estaQuebrado: false,
    pantallaRota: false, estaRaspado: false, faltanTornillos: false,
    indiciosHumedad: false, etiquetasDanadas: false, otroEstado: '',
    nombreFirmaCliente: '',
  };

  posInstalacion = {
    limpiezaAreas: false, revisionConexiones: false, cableadoOrganizado: false,
    alimentacionVerificada: false, comunicacionVerificada: false,
    internetVerificado: false, pruebasVenta: false, perifericosVerificados: false,
    cantidadTerminalesPOS: 0, cantidadCajas: 0, cantidadPantallasCliente: 0,
    cantidadImpresoras: 0, cantidadBasculas: 0, cantidadEtiquetadoras: 0,
    cantidadChecadores: 0, cantidadKioskos: 0, cantidadTabletas: 0,
    materialesAdicionales: '',
    usuarioAdmin: '', contrasenaAdmin: '', contrasenaWindows: '',
    datosLicencia: '', otrasCredenciales: '', firmaSupervisor: '',
    sistemaOperativoVerificado: false, accesoUsuariosVerificado: false,
    officeRemotoVerificado: false, sistemaFuncionaNormal: false,
    perifericosFuncionan: false, impresionTicketsVerificada: false,
    cajonDineroVerificado: false, basculaVerificada: false,
    etiquetasVerificadas: false, checadorVerificado: false,
    sincronizacionNube: false, respaldoAutomatico: false,
    reportesAutomaticos: false, terminalesMoviles: false,
    fechaHoraVerificada: false,
    internetBajada: '', internetSubida: '', correosReportes: '', recomendaciones: '',
    capAltaProductos: false, capInventario: false, capVentaCobro: false,
    capCortesCaja: false, capImpresionTickets: false, capBascula: false,
    capEtiquetadora: false, capReportes: false, capUsuariosPermisos: false,
    demostracionRealizada: false, pruebasVentaCliente: false,
    canalizacionProfesional: false, accesoSistema: false,
    capacitacionRecibida: false, personalProfesional: false,
    sabesolicitarSoporte: false, entiendeLimitesGarantia: false,
    entiendeDanosExternos: false,
    calificacion: 0, nps: '', solicitaSeguimiento: false, comentarios: '', nombreFirmaCliente: '',
  };

  canalizacion = {
    limpiezaAreas: false, retiroResiduos: false, tuberiaFirme: false,
    tuberiaCorrctamenteFijada: false, alineacionEstetica: false,
    metrosTuberia: 0, cantidadRegistros: 0, cantidadCurvas: 0,
    cantidadCajasCondulet: 0, cantidadAbrazaderas: 0, cantidadLicuatite: 0,
    materialesAdicionales: '', detalleTrabajoRealizado: '', firmaTecnico: '',
  };

  cctvServicio = {
    limpiezaAreas: false, revisionConexiones: false, grabadorLimpio: false,
    cableadoIdentificado: false, alimentacionVerificada: false,
    comunicacionVerificada: false, pruebasVisualizacion: false,
    estadoSistemaDocumentado: false,
    camarasConVideo: 0, camarasMantenimiento: 0, camarasReemplazadas: 0, camarasSinVideo: 0,
    capacidadAlmacenamiento: '', materialesAdicionales: '', refaccionesUtilizadas: '',
    nSerieGrabador: '', contrasenaGrabador: '', contrasenaHikConnect: '',
    correoAsociado: '', otrosDatosCredenciales: '', firmaSupervisor: '',
    detalleCliente: '', trabajosRealizados: '',
    camarasVisualizando: false, grabacionConfigurada: false,
    grabacionesVerificadas: false, reproduccionVerificada: false,
    fechaHoraVerificada: false, discoVerificado: false,
    videoMonitorCliente: false, accesoRemotoVerificado: false,
    notificacionesVerificadas: false, microfonoLuzBlanca: false,
    analiticosVerificados: false, upsVerificado: false, switchesPoEVerificados: false,
    diagnosticoConfiguracion: false, diagnosticoFuentePoder: false,
    diagnosticoCamara: false, diagnosticoCableado: false,
    diagnosticoConectores: false, diagnosticoDiscoDuro: false,
    diagnosticoRed: false, diagnosticoInternet: false,
    diagnosticoElectrico: false, diagnosticoSinFalla: false, diagnosticoOtro: '',
    internetBajada: '', internetSubida: '',
    tiempoGrabacion: '', ubicacionGrabador: '', recomendaciones: '',
    accionSustitucionCamaras: false, accionSustitucionDisco: false,
    accionSustitucionUPS: false, accionSustitucionFuente: false,
    accionMejoraAlmacenamiento: false, accionMantenimiento: false,
    accionPolizaServicio: false, accionOtra: '',
    demostracionRealizada: false, visualizacionGrabaciones: false,
    explicacionFallas: false, canalizacionProfesional: false,
    accesoHikConnect: false, explicacionCondiciones: false,
    personalProfesional: false, sabesolicitarSoporte: false,
    entiendeEquiposExistentes: false, entiendeLimitesGarantia: false,
    calificacion: 0, nps: '', solicitaSeguimiento: false, comentarios: '', nombreFirmaCliente: '',
  };

  enviandoCotizacion = false;
  enviandoReciboCliente = false;
  enviandoReciboIngenieria = false;

  tiposServicio = ['Diagnostico', 'Correctivo', 'Preventivo', 'Garantia', 'Capacitacion', 'Reconfiguracion', 'Otro'];
  sistemasAtendidos = ['CCTV', 'Alarma', 'Redes/WiFi', 'Soft Restaurant', 'Control de acceso', 'Audio', 'Telefonia IP', 'Otro'];
  actividadesOpciones = ['Reinicio de sistema', 'Reconfiguracion', 'Limpieza de equipo', 'Cambio de configuracion', 'Actualizacion firmware', 'Correccion de cableado', 'Sustitucion de equipo', 'Capacitacion', 'Pruebas funcionales', 'Otro'];

  ngOnInit() {
    const tareaId = this.route.snapshot.paramMap.get('id');

    this.authService.getCurrentUserData().then(u => {
      this.currentUser = u;
      this.cdr.detectChanges();
    });

    if (tareaId) {
      this.tasksService.getTask(tareaId).then(async t => {
        if (t) {
          this.task = {
            ...t,
            fechaProgramada: (t.fechaProgramada as any)?.toDate?.() ?? t.fechaProgramada,
          };
          this.reciboEquipo.cliente = t.cliente || '';
          this.labDiagnostico.cliente = t.cliente || '';

          const hojas = await this.workOrderService.getByTarea(tareaId);
          if (hojas.length > 0) {
            this.hojasGuardadas = hojas;
            for (const h of hojas) {
              const firma = (h as any).firmaCliente || '';
              if (firma) this.firmasPorTipo[h.tipo] = firma;
            }
            const ultima = hojas[0];
            this.tipoSeleccionado = ultima.tipo;
            this.cargarDatosDeHoja(ultima.tipo);
          }
        }
        this.loading = false;
        this.cdr.detectChanges();
      });
    } else {
      this.loading = false;
    }
  }

  seleccionarTipo(tipo: string) {
    this.tipoSeleccionado = tipo as WorkOrderType;
    this.cdr.detectChanges();
  }

  copiarFolio() {
    navigator.clipboard.writeText(this.task?.folioId || '').then(() => {
      alert('Folio copiado');
    });
  }

  abrirWhatsapp() {
    const msg = `Folio: ${this.task?.folioId || ''} | Cliente: ${this.task?.cliente || ''}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  }

  async enviarCotizacion() {
    if (!this.labDiagnostico.correoEnvioCotizacion) {
      alert('Escribe el correo de destino');
      return;
    }
    this.enviandoCotizacion = true;
    try {
      await emailjs.send('service_2hdign8', 'template_fwiao48', {
        nombre_cliente: this.labDiagnostico.cliente,
        sistema: `Diagnostico ${this.labDiagnostico.marcaModelo}`,
        contrasena: '-',
        clave_cifrado: '-',
        notas_acceso: `Costo estimado: $${this.labDiagnostico.costoEstimado} | MO: $${this.labDiagnostico.costoManoObra} | ${this.labDiagnostico.dictamenTecnico}`,
        to_email: 'sistemasintegra.ventas@gmail.com',
      }, 'XEGieclndH5Y3ZVp_');
      alert('Cotizacion enviada a ventas');
    } catch (e) { console.error(e); alert('Error al enviar'); }
    this.enviandoCotizacion = false;
    this.cdr.detectChanges();
  }

  async enviarReciboCliente() {
    if (!this.reciboEquipo.correoElectronico) {
      alert('El correo del cliente es obligatorio');
      return;
    }
    this.enviandoReciboCliente = true;
    try {
      await emailjs.send('service_2hdign8', 'template_fwiao48', {
        nombre_cliente: this.reciboEquipo.cliente,
        sistema: `Recibo de equipo: ${this.reciboEquipo.marcaModelo}`,
        contrasena: '-',
        clave_cifrado: '-',
        notas_acceso: `Falla reportada: ${this.reciboEquipo.descripcionFalla}`,
        to_email: this.reciboEquipo.correoElectronico,
      }, 'XEGieclndH5Y3ZVp_');
      alert('Copia enviada al cliente');
    } catch (e) { console.error(e); alert('Error al enviar'); }
    this.enviandoReciboCliente = false;
    this.cdr.detectChanges();
  }

  async enviarReciboIngenieria() {
    this.enviandoReciboIngenieria = true;
    try {
      await emailjs.send('service_2hdign8', 'template_fwiao48', {
        nombre_cliente: this.reciboEquipo.cliente,
        sistema: `Recibo de equipo: ${this.reciboEquipo.marcaModelo} SN: ${this.reciboEquipo.sn}`,
        contrasena: this.reciboEquipo.contraseniaCliente || '-',
        clave_cifrado: '-',
        notas_acceso: `Falla: ${this.reciboEquipo.descripcionFalla} | Folio: ${this.task?.folioId}`,
        to_email: 'sistemasintegra.ingenieria@gmail.com',
      }, 'XEGieclndH5Y3ZVp_');
      alert('Copia enviada a ingenieria');
    } catch (e) { console.error(e); alert('Error al enviar'); }
    this.enviandoReciboIngenieria = false;
    this.cdr.detectChanges();
  }

  toggleTipoMultiple(tipo: WorkOrderType) {
    const idx = this.tiposSeleccionados.indexOf(tipo);
    if (idx === -1) this.tiposSeleccionados.push(tipo);
    else this.tiposSeleccionados.splice(idx, 1);
  }

  confirmarTipos() {
    if (this.tiposSeleccionados.length === 1) {
      this.tipoSeleccionado = this.tiposSeleccionados[0];
      this.modoMultiple = false;
    } else if (this.tiposSeleccionados.length > 1) {
      this.tipoSeleccionado = this.tiposSeleccionados[0];
      this.modoMultiple = true;
    }
    this.cargarDatosDeHoja(this.tipoSeleccionado!);
  }

  get tipoIndex(): number {
    return this.tiposSeleccionados.indexOf(this.tipoSeleccionado!);
  }

  get totalTipos(): number {
    return this.tiposSeleccionados.length;
  }

  private canvasTieneContenido(): boolean {
    if (!this.firmaCanvas) return false;
    const ctx = this.firmaCanvas.getContext('2d')!;
    const data = ctx.getImageData(0, 0, this.firmaCanvas.width, this.firmaCanvas.height).data;
    return data.some(v => v !== 0);
  }

  siguienteTipo() {
    const idx = this.tipoIndex;
    if (idx < this.tiposSeleccionados.length - 1) {
      if (this.firmaCanvas && this.tipoSeleccionado && this.canvasTieneContenido()) {
        this.firmasPorTipo[this.tipoSeleccionado] = this.firmaCanvas.toDataURL();
      }
      this.guardar().then(() => {
        const nextTipo = this.tiposSeleccionados[idx + 1];
        this.resetearDatos();
        this.tipoSeleccionado = nextTipo;
        this.cargarDatosDeHoja(nextTipo);
        this.cdr.detectChanges();
      });
    }
  }

  anteriorTipo() {
    const idx = this.tipoIndex;
    if (idx > 0) {
      if (this.firmaCanvas && this.tipoSeleccionado && this.canvasTieneContenido()) {
        this.firmasPorTipo[this.tipoSeleccionado] = this.firmaCanvas.toDataURL();
      }
      this.guardar().then(() => {
        const prevTipo = this.tiposSeleccionados[idx - 1];
        this.resetearDatos();
        this.tipoSeleccionado = prevTipo;
        this.cargarDatosDeHoja(prevTipo);
        this.cdr.detectChanges();
      });
    }
  }

  private resetearDatos() {
    this.cctv = {
      limpiezaAreas: false, trayectosFijados: false, zonaGrabadorOrganizada: false,
      materialesAdicionales: '', firmaTecnico: '', firmaSupervisor: '',
      numeroCamaras: 0, tiempoGrabacion: '', capacidadAlmacenamiento: '',
      grabacionVerificada: false, hikConnectOperativo: false, fechaHoraVerificada: false,
      numeroSerie: '', internetBajada: '', internetSubida: '', recomendaciones: '',
      demostracionRealizada: false, canalizacionProfesional: false, areaLimpia: false,
      vistaCorrectaCamaras: false, explicacionBasica: false, sabeContactarSoporte: false,
      personalProfesional: false, capacitacionRealizada: false, sabesolicitarSoporte: false,
      entiendeLimitesGarantia: false, recomendoContrasenas: false, calificacion: 0,
      nps: '', solicitaSeguimiento: false, comentarios: '', nombreFirmaCliente: '',
    };
    this.alarma = {
      limpiezaAreas: false, trayectosFijados: false, gabineteOrganizado: false,
      cableadoIdentificado: false, alimentacionVerificada: false, comunicacionVerificada: false,
      pruebasDisparo: false, cantidadPIR: 0, cantidadContactos: 0, cantidadHumo: 0,
      cantidadPanico: 0, cantidadSirenas: 0, cantidadTeclados: 0, cantidadControles: 0,
      materialesAdicionales: '', firmaTecnico: '', firmaSupervisor: '', modeloPanel: '',
      numeroSerie: '', sensoresVerificados: false, zonasValidadas: false, sirenaVerificada: false,
      hikConnectOperativo: false, alertaHumoVerificada: false, notificacionesVerificadas: false,
      fechaHoraVerificada: false, usuariosConfigurados: false, armadoDesarmadoVerificado: false,
      bateriaVerificada: false, internetVerificado: false, internetBajada: '', internetSubida: '',
      senalInalambrica: '', ubicacionPanel: '', recomendaciones: '', demostracionRealizada: false,
      canalizacionProfesional: false, areaLimpia: false, sensoresVerificadosCliente: false,
      explicacionBasica: false, sabeContactarSoporte: false, personalProfesional: false,
      capacitacionRealizada: false, sabeArmarDesarmar: false, sabeResponderAlarma: false,
      sabesolicitarSoporte: false, entiendeLimitesGarantia: false, recomendoContrasenas: false,
      calificacion: 0, nps: '', solicitaSeguimiento: false, comentarios: '', nombreFirmaCliente: '',
    };
    this.alarmaMarket = {
      tuberiaAlarmaIngreso: false, tuberiaIngresoPanaderia: false, tuberiaPanelSirenaTecladoSensor: false,
      tuberiaIngresoSensorJalon: false, tuberiaIncendioServicio: false, tuberiaElectricaInternet: false,
      cableadoTotal: false, cajasRegistroInstaladas: false, sinCableadoExpuesto: false, tapasRegistros: false,
      panelFijadoMuro: false, panelInstalado: false, gabineteInterconectado: false, expansorInstalado: false,
      multicontactoInstalado: false, bateriaConectada: false, relevadorInstalado: false,
      ordenConexionesInternas: false, tuberiaConduitFirme: false, sinCableadoExpuestoPanel: false,
      tapasRegistrosPanel: false, ethernetActivo: false, panelHikConnect: false,
      nombreSucursalTeclado: false, fechaHoraConfig: false, retardoEntradaServicio: false,
      retardoSalidaServicio: false, botonesPanico247: false, sensorHumoPanaderia247: false,
      z1CortinaPuertaServicio: false, z3CortinaPrincipal: false, z5SensorHumoPanaderia: false,
      pir1: false, pir2: false, pir3: false, pir4: false,
      pir5: false, pir6: false, pir7: false, pir8: false,
      panicoCaja1: false, panicoCaja2: false, panicoCaja3: false,
      sensorHumoPanaderiaPrueba: false, palancaServicioSirenas: false, palancaIngresoSirenas: false,
      sensoresAutonomosProbados: false, sirenaInteriorActiva: false, sirenaExteriorActiva: false,
      estroboExterior: false, relevadorActivando: false, armadoCorrecto: false, desarmadoCorrecto: false,
      retardoEntradaFuncionando: false, nombreSucursalVisible: false, fechaHoraCorrectas: false,
      internetValidado: false, panelEnLinea: false, appProbada: false, recepcionEventos: false,
      armadoDesarmadoRemoto: false, fotoPanelAbierto: false, fotoPanelCerrado: false,
      fotoSensoresCortina: false, fotoSirenaExterior: false, fotoTeclado: false, fotoIngresoGeneral: false,
      instalacionValidadaIngeniero: false, pruebasFuncionalesOK: false, sistemaEntregadoOperativo: false,
      firmaTecnico: '', nombreValidacionIngenieria: '', firmaValidacionIngenieria: '',
      demostracionRealizada: false, canalizacionProfesional: false, appEnCliente: false,
      explicacionBasica: false, sabeContactarSoporte: false, personalProfesional: false,
      capacitacionRealizada: false, sabesolicitarSoporte: false, entiendeLimitesGarantia: false,
      recomendoContrasenas: false, calificacion: 0, nps: '', solicitaSeguimiento: false,
      comentarios: '', nombreFirmaCliente: '',
    };
    this.general = {
      tipoServicio: [], sistemaAtendido: [], materialesUtilizados: '', reporteCliente: '',
      diagnosticoTecnico: '', actividadesRealizadas: [], detallesCliente: '',
      internetBajada: '', internetSubida: '', firmaTecnico: '', demostracionRealizada: false,
      canalizacionProfesional: false, areaLimpia: false, explicacionBasica: false,
      sabeContactarSoporte: false, personalProfesional: false, capacitacionRealizada: false,
      sabesolicitarSoporte: false, entiendeLimitesGarantia: false, calificacion: 0,
      nps: '', solicitaSeguimiento: false, comentarios: '', nombreFirmaCliente: '',
    };
    this.softInstalacion = {
      equipoImplementado: '', cableModemCaja: false, cableImpresorasCaja: false,
      cableComanderosCaja: false, cableAPWifi: false, montajeCajaPeinado: false,
      peinadoCableCpu: false, peinadoCableEquipos: false, licenciaActiva: false,
      baseDatosInicializada: false, menuCapturado: false, softwareSoporte: false,
      driversImpresoras: false, monitoresTouchAlineados: false, ipFija: false,
      correosConfigurados: false, ingresoRemoto: false, internetNavega: false,
      tabletsConfiguradas: false, fotoCajaInstalada: false, fotoTablets: false,
      fotoZonaCaja: false, fotoComanderos: false, instalacionValidadaIngeniero: false,
      pruebasImpresionOK: false, sistemaListoEntrega: false, capacitacionBrindada: false,
      nombreTecnico: '', firmaTecnico: '', nombreIngenieria: '', firmaIngenieria: '',
      demostracionRealizada: false, canalizacionProfesional: false, correoPruebaRecibido: false,
      capacitacionCompleta: false, personalProfesional: false, listoParaUsar: false,
      sabesolicitarSoporte: false, garantia30Dias: false, entiendeLimitesGarantia: false,
      contrasenaAdministradora: false, calificacion: 0, nps: '', solicitaSeguimiento: false,
      comentarios: '', nombreFirmaCliente: '',
    };
    this.softServicio = {
      detalleEncontrado: '', pruebaImpresionAreas: false, equiposEnlazados: false,
      fechaHoraCorrecta: false, fotoDetalleResuelto: false, detalleResuelto: false,
      descripcionProblemaResolucion: '', sistemaListoEntrega: false, nombreColaborador: '',
      firmaColaborador: '', calificacion: 0, solicitaSeguimiento: false,
      comentarios: '', nombreFirmaCliente: '',
    };
    this.reparacionGeneral = {
      detalleEncontrado: '', fotoDetalleResuelto: false, detalleResuelto: false,
      descripcionProblemaResolucion: '', solucionListaEntrega: false, nombreColaborador: '',
      firmaColaborador: '', calificacion: 0, solicitaSeguimiento: false,
      comentarios: '', nombreFirmaCliente: '',
    };
    this.labDiagnostico = {
      ingeniero: '', cliente: '', marcaModelo: '', numeroSerie: '',
      tipoGarantia: false, tipoReparacion: false, tipoRevision: false,
      sinDanosVisibles: false, golpesDetectados: false, humedadDetectada: false,
      sulfatacionDetectada: false, componentesFaltantes: false,
      sellosGarantiaDanados: false, manipulacionPreviaDetectada: false,
      otroEstadoFisico: '', observacionesEstado: '',
      enciendeCorrectamente: false, noEnciende: false,
      fuentePoderFuncional: false, fuentePoderDefectuosa: false,
      comunicacionCorrecta: false, comunicacionIntermitente: false,
      sinComunicacion: false, comunicacionNoAplica: false,
      operaCorrectamente: false, fallaEnTodo: false, fallaIntermitente: false,
      errorConfiguracion: false, firmwareDesactualizado: false,
      firmwareCorrupto: false, danoFisicoInterno: false,
      danoPorDescargaElectrica: false, danoPorHumedad: false, noSeDetectoFalla: false,
      descripcionFalla: '',
      fotografiasInternas: false, fotografiasComponentesDanados: false,
      videoFuncionamiento: false, evidenciaWhatsapp: false,
      accionReconfiguracion: false, accionActualizacionFirmware: false,
      accionReparacionInterna: false, accionReemplazoComponente: false,
      accionReemplazoTotal: false, accionEnvioGarantia: false,
      accionSinReparacion: false, accionNoReparable: false,
      noRequiereRefacciones: false, siRequiereRefacciones: false,
      descripcionRefacciones: '', costoEstimado: 0, costoManoObra: 0,
      resultadoReparado: false, resultadoPendienteGarantia: false,
      resultadoPendienteRefacciones: false, resultadoEnviarProveedor: false,
      resultadoGarantiaCobertura: false, resultadoGarantiaRechazada: false,
      resultadoListoEntrega: false, resultadoNoReparable: false,
      horasInvertidas: 0, dictamenTecnico: '', firmaTecnico: '', correoEnvioCotizacion: '',
    };
    this.reciboEquipo = {
      colaborador: '', cliente: '', telefono: '', direccionEnvio: '',
      correoElectronico: '', marcaModelo: '', sn: '', contraseniaCliente: '', direccionIP: '',
      prioridadBaja: false, prioridadMedia: false, prioridadAlta: false, prioridadCritica: false,
      tiempoEstimado: '', descripcionFalla: '',
      tipoGarantia: false, tipoReparacion: false, tipoRevision: false, tipoDevolucion: false,
      cajaOriginal: false, cablesConexion: false, baseMontaje: false,
      bateria: false, fuentePoder: false, otroAccesorio: '',
      estadoEnciende: false, estadoNoEnciende: false, estadoNoPosibleProbar: false,
      huelaQuemado: false, estaGolpeado: false, estaQuebrado: false,
      pantallaRota: false, estaRaspado: false, faltanTornillos: false,
      indiciosHumedad: false, etiquetasDanadas: false, otroEstado: '',
      nombreFirmaCliente: '',
    };
    this.posInstalacion = {
      limpiezaAreas: false, revisionConexiones: false, cableadoOrganizado: false,
      alimentacionVerificada: false, comunicacionVerificada: false,
      internetVerificado: false, pruebasVenta: false, perifericosVerificados: false,
      cantidadTerminalesPOS: 0, cantidadCajas: 0, cantidadPantallasCliente: 0,
      cantidadImpresoras: 0, cantidadBasculas: 0, cantidadEtiquetadoras: 0,
      cantidadChecadores: 0, cantidadKioskos: 0, cantidadTabletas: 0,
      materialesAdicionales: '',
      usuarioAdmin: '', contrasenaAdmin: '', contrasenaWindows: '',
      datosLicencia: '', otrasCredenciales: '', firmaSupervisor: '',
      sistemaOperativoVerificado: false, accesoUsuariosVerificado: false,
      officeRemotoVerificado: false, sistemaFuncionaNormal: false,
      perifericosFuncionan: false, impresionTicketsVerificada: false,
      cajonDineroVerificado: false, basculaVerificada: false,
      etiquetasVerificadas: false, checadorVerificado: false,
      sincronizacionNube: false, respaldoAutomatico: false,
      reportesAutomaticos: false, terminalesMoviles: false, fechaHoraVerificada: false,
      internetBajada: '', internetSubida: '', correosReportes: '', recomendaciones: '',
      capAltaProductos: false, capInventario: false, capVentaCobro: false,
      capCortesCaja: false, capImpresionTickets: false, capBascula: false,
      capEtiquetadora: false, capReportes: false, capUsuariosPermisos: false,
      demostracionRealizada: false, pruebasVentaCliente: false,
      canalizacionProfesional: false, accesoSistema: false,
      capacitacionRecibida: false, personalProfesional: false,
      sabesolicitarSoporte: false, entiendeLimitesGarantia: false, entiendeDanosExternos: false,
      calificacion: 0, nps: '', solicitaSeguimiento: false, comentarios: '', nombreFirmaCliente: '',
    };
    this.canalizacion = {
      limpiezaAreas: false, retiroResiduos: false, tuberiaFirme: false,
      tuberiaCorrctamenteFijada: false, alineacionEstetica: false,
      metrosTuberia: 0, cantidadRegistros: 0, cantidadCurvas: 0,
      cantidadCajasCondulet: 0, cantidadAbrazaderas: 0, cantidadLicuatite: 0,
      materialesAdicionales: '', detalleTrabajoRealizado: '', firmaTecnico: '',
    };
    this.cctvServicio = {
      limpiezaAreas: false, revisionConexiones: false, grabadorLimpio: false,
      cableadoIdentificado: false, alimentacionVerificada: false,
      comunicacionVerificada: false, pruebasVisualizacion: false,
      estadoSistemaDocumentado: false,
      camarasConVideo: 0, camarasMantenimiento: 0, camarasReemplazadas: 0, camarasSinVideo: 0,
      capacidadAlmacenamiento: '', materialesAdicionales: '', refaccionesUtilizadas: '',
      nSerieGrabador: '', contrasenaGrabador: '', contrasenaHikConnect: '',
      correoAsociado: '', otrosDatosCredenciales: '', firmaSupervisor: '',
      detalleCliente: '', trabajosRealizados: '',
      camarasVisualizando: false, grabacionConfigurada: false,
      grabacionesVerificadas: false, reproduccionVerificada: false,
      fechaHoraVerificada: false, discoVerificado: false,
      videoMonitorCliente: false, accesoRemotoVerificado: false,
      notificacionesVerificadas: false, microfonoLuzBlanca: false,
      analiticosVerificados: false, upsVerificado: false, switchesPoEVerificados: false,
      diagnosticoConfiguracion: false, diagnosticoFuentePoder: false,
      diagnosticoCamara: false, diagnosticoCableado: false,
      diagnosticoConectores: false, diagnosticoDiscoDuro: false,
      diagnosticoRed: false, diagnosticoInternet: false,
      diagnosticoElectrico: false, diagnosticoSinFalla: false, diagnosticoOtro: '',
      internetBajada: '', internetSubida: '',
      tiempoGrabacion: '', ubicacionGrabador: '', recomendaciones: '',
      accionSustitucionCamaras: false, accionSustitucionDisco: false,
      accionSustitucionUPS: false, accionSustitucionFuente: false,
      accionMejoraAlmacenamiento: false, accionMantenimiento: false,
      accionPolizaServicio: false, accionOtra: '',
      demostracionRealizada: false, visualizacionGrabaciones: false,
      explicacionFallas: false, canalizacionProfesional: false,
      accesoHikConnect: false, explicacionCondiciones: false,
      personalProfesional: false, sabesolicitarSoporte: false,
      entiendeEquiposExistentes: false, entiendeLimitesGarantia: false,
      calificacion: 0, nps: '', solicitaSeguimiento: false, comentarios: '', nombreFirmaCliente: '',
    };
    this.firmaCanvas = null;
    this.firmaDataUrl = '';
    // NO limpiar firmasPorTipo
  }

  private cargarDatosDeHoja(tipo: WorkOrderType) {
    const h = this.hojasGuardadas.find(x => x.tipo === tipo);
    if (h) {
      if (h.datosCCTV) this.cctv = { ...this.cctv, ...h.datosCCTV };
      if (h.datosAlarma) this.alarma = { ...this.alarma, ...h.datosAlarma };
      if (h.datosAlarmaMarket) this.alarmaMarket = { ...this.alarmaMarket, ...h.datosAlarmaMarket };
      if (h.datosGeneral) this.general = { ...this.general, ...h.datosGeneral };
      if (h.datosSoftInstalacion) this.softInstalacion = { ...this.softInstalacion, ...h.datosSoftInstalacion };
      if (h.datosSoftServicio) this.softServicio = { ...this.softServicio, ...h.datosSoftServicio };
      if (h.datosReparacionGeneral) this.reparacionGeneral = { ...this.reparacionGeneral, ...h.datosReparacionGeneral };
      if (h.datosLabDiagnostico) this.labDiagnostico = { ...this.labDiagnostico, ...h.datosLabDiagnostico };
      if (h.datosReciboEquipo) this.reciboEquipo = { ...this.reciboEquipo, ...h.datosReciboEquipo };
      if (h.datosPosInstalacion) this.posInstalacion = { ...this.posInstalacion, ...h.datosPosInstalacion };
      if (h.datosCanalizacion) this.canalizacion = { ...this.canalizacion, ...h.datosCanalizacion };
      if (h.datosCctvServicio) this.cctvServicio = { ...this.cctvServicio, ...h.datosCctvServicio };
      if (!this.firmasPorTipo[tipo] && (h as any).firmaCliente) {
        this.firmasPorTipo[tipo] = (h as any).firmaCliente;
      }
    }
    this.firmaDataUrl = this.firmasPorTipo[tipo] || '';
    this.firmaCanvas = null;
    if (this.task?.cliente) {
      if (!this.reciboEquipo.cliente) this.reciboEquipo.cliente = this.task.cliente;
      if (!this.labDiagnostico.cliente) this.labDiagnostico.cliente = this.task.cliente;
    }
  }

  iniciarFirma(canvas: HTMLCanvasElement) {
    if (this.firmaCanvas === canvas) return;
    this.firmaCanvas = canvas;
    const ctx = canvas.getContext('2d')!;
    ctx.strokeStyle = '#1A56DB';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const firmaExistente = this.tipoSeleccionado ? (this.firmasPorTipo[this.tipoSeleccionado] || '') : '';
    if (firmaExistente) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0);
      img.src = firmaExistente;
    }

    canvas.addEventListener('mousedown', (e) => {
      this.firmaDibujando = true;
      ctx.beginPath();
      ctx.moveTo(e.offsetX, e.offsetY);
    });
    canvas.addEventListener('mousemove', (e) => {
      if (!this.firmaDibujando) return;
      ctx.lineTo(e.offsetX, e.offsetY);
      ctx.stroke();
    });
    canvas.addEventListener('mouseup', () => {
      this.firmaDibujando = false;
      if (this.tipoSeleccionado) {
        this.firmasPorTipo[this.tipoSeleccionado] = canvas.toDataURL();
        this.firmaDataUrl = this.firmasPorTipo[this.tipoSeleccionado];
      }
    });
    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.firmaDibujando = true;
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0];
      ctx.beginPath();
      ctx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top);
    }, { passive: false });
    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (!this.firmaDibujando) return;
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0];
      ctx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top);
      ctx.stroke();
    }, { passive: false });
    canvas.addEventListener('touchend', () => {
      this.firmaDibujando = false;
      if (this.tipoSeleccionado) {
        this.firmasPorTipo[this.tipoSeleccionado] = canvas.toDataURL();
        this.firmaDataUrl = this.firmasPorTipo[this.tipoSeleccionado];
      }
    });
  }

  limpiarFirma() {
    if (!this.firmaCanvas) return;
    const ctx = this.firmaCanvas.getContext('2d')!;
    ctx.clearRect(0, 0, this.firmaCanvas.width, this.firmaCanvas.height);
    this.firmaDataUrl = '';
    if (this.tipoSeleccionado) delete this.firmasPorTipo[this.tipoSeleccionado];
  }

  dibujarFirmaEnCanvas() {
    if (!this.firmaCanvas || !this.firmaDataUrl) return;
    const img = new Image();
    img.onload = () => {
      const ctx = this.firmaCanvas!.getContext('2d')!;
      ctx.clearRect(0, 0, this.firmaCanvas!.width, this.firmaCanvas!.height);
      ctx.drawImage(img, 0, 0);
    };
    img.src = this.firmaDataUrl;
  }

  cargarHoja(hoja: WorkOrder) {
    this.resetearDatos();
    this.tipoSeleccionado = hoja.tipo;
    this.cargarDatosDeHoja(hoja.tipo);
    this.cdr.detectChanges();
  }

  toggleActividad(act: string) {
    const idx = this.general.actividadesRealizadas.indexOf(act);
    if (idx === -1) this.general.actividadesRealizadas.push(act);
    else this.general.actividadesRealizadas.splice(idx, 1);
  }

  toggleTipoServicio(tipo: string) {
    const idx = this.general.tipoServicio.indexOf(tipo);
    if (idx === -1) this.general.tipoServicio.push(tipo);
    else this.general.tipoServicio.splice(idx, 1);
  }

  toggleSistema(sistema: string) {
    const idx = this.general.sistemaAtendido.indexOf(sistema);
    if (idx === -1) this.general.sistemaAtendido.push(sistema);
    else this.general.sistemaAtendido.splice(idx, 1);
  }

  async guardar() {
    if (!this.task?.id || !this.tipoSeleccionado || !this.currentUser) return;

    let campoFaltante = '';
    if (this.tipoSeleccionado === 'cctv_instalacion' || this.tipoSeleccionado === 'cctv_reparacion') {
      if (!this.cctv.numeroCamaras) campoFaltante = 'Numero de camaras';
    } else if (this.tipoSeleccionado === 'alarma_instalacion') {
      if (!this.alarma.modeloPanel) campoFaltante = 'Modelo de panel';
    } else if (this.tipoSeleccionado === 'soft_restaurant_instalacion') {
      if (!this.softInstalacion.equipoImplementado) campoFaltante = 'Equipo implementado';
    } else if (this.tipoSeleccionado === 'soft_restaurant_servicio') {
      if (!this.softServicio.detalleEncontrado) campoFaltante = 'Detalle encontrado';
    } else if (this.tipoSeleccionado === 'servicio_reparacion_general') {
      if (!this.reparacionGeneral.detalleEncontrado) campoFaltante = 'Detalle encontrado';
    } else if (this.tipoSeleccionado === 'lab_diagnostico') {
      if (!this.labDiagnostico.marcaModelo) campoFaltante = 'Marca y modelo';
    } else if (this.tipoSeleccionado === 'recibo_equipo') {
      if (!this.reciboEquipo.cliente) campoFaltante = 'Cliente';
      else if (!this.reciboEquipo.marcaModelo) campoFaltante = 'Marca y modelo';
    } else if (this.tipoSeleccionado === 'canalizacion_conduit') {
      if (!this.canalizacion.detalleTrabajoRealizado) campoFaltante = 'Detalle del trabajo realizado';
    } else if (this.tipoSeleccionado === 'cctv_servicio') {
      if (!this.cctvServicio.detalleCliente) campoFaltante = 'Detalle reportado por cliente';
    }

    if (campoFaltante) {
      alert(`Campo obligatorio: "${campoFaltante}"`);
      return;
    }

    this.guardando = true;

    try {
      const docId = `${this.task.id}_${this.tipoSeleccionado}`;
      const firmaActual = this.firmasPorTipo[this.tipoSeleccionado] || this.firmaDataUrl || '';

      const data: any = {
        id: docId,
        tareaId: this.task.id,
        folioTarea: this.task.folioId,
        tipo: this.tipoSeleccionado,
        tecnicoId: this.currentUser.uid,
        tecnicoNombre: this.currentUser.nombre,
        cliente: this.task.cliente,
        fecha: new Date().toLocaleDateString('en-CA'),
        creadoEn: new Date(),
        completado: true,
        firmaCliente: firmaActual,
      };

      if (this.tipoSeleccionado === 'cctv_instalacion' || this.tipoSeleccionado === 'cctv_reparacion') {
        data.datosCCTV = { ...this.cctv };
      } else if (this.tipoSeleccionado === 'alarma_instalacion') {
        data.datosAlarma = { ...this.alarma };
      } else if (this.tipoSeleccionado === 'alarma_mercado_san_juan') {
        data.datosAlarmaMarket = { ...this.alarmaMarket };
      } else if (this.tipoSeleccionado === 'soft_restaurant_instalacion') {
        data.datosSoftInstalacion = { ...this.softInstalacion };
      } else if (this.tipoSeleccionado === 'soft_restaurant_servicio') {
        data.datosSoftServicio = { ...this.softServicio };
      } else if (this.tipoSeleccionado === 'servicio_reparacion_general') {
        data.datosReparacionGeneral = { ...this.reparacionGeneral };
      } else if (this.tipoSeleccionado === 'lab_diagnostico') {
        data.datosLabDiagnostico = { ...this.labDiagnostico };
      } else if (this.tipoSeleccionado === 'recibo_equipo') {
        data.datosReciboEquipo = { ...this.reciboEquipo };
      } else if (this.tipoSeleccionado === 'pos_perifericos_instalacion') {
        data.datosPosInstalacion = { ...this.posInstalacion };
      } else if (this.tipoSeleccionado === 'canalizacion_conduit') {
        data.datosCanalizacion = { ...this.canalizacion };
      } else if (this.tipoSeleccionado === 'cctv_servicio') {
        data.datosCctvServicio = { ...this.cctvServicio };
      } else {
        data.datosGeneral = { ...this.general };
      }

      await this.workOrderService.save(docId, data);
      this.hojasGuardadas = await this.workOrderService.getByTarea(this.task.id);
      if (firmaActual) this.firmasPorTipo[this.tipoSeleccionado] = firmaActual;
      this.guardado = true;
      setTimeout(() => { this.guardado = false; this.cdr.detectChanges(); }, 2000);
    } catch (e) {
      console.error('Error guardando hoja:', e);
    }

    this.guardando = false;
    this.cdr.detectChanges();
  }

  async enviarCredenciales() {
    if (!this.credenciales.correoCliente || !this.credenciales.sistema) {
      this.errorCorreo = 'El correo del cliente y el servicio instalado son obligatorios.';
      return;
    }
    this.enviandoCorreo = true;
    this.errorCorreo = '';
    this.cdr.detectChanges();
    try {
      await emailjs.send(
        'service_2hdign8',
        'template_fwiao48',
        {
          nombre_cliente: this.task?.cliente || '',
          sistema: this.credenciales.sistema,
          contrasena: this.credenciales.contrasena,
          clave_cifrado: this.credenciales.claveCifrado,
          notas_acceso: this.credenciales.notasAcceso,
          to_email: this.credenciales.correoCliente,
        },
        'XEGieclndH5Y3ZVp_'
      );
      this.correoEnviado = true;
      setTimeout(() => { this.correoEnviado = false; this.cdr.detectChanges(); }, 3000);
    } catch (e) {
      console.error('Error enviando correo:', e);
      this.errorCorreo = 'Error al enviar. Verifica la conexion e intenta de nuevo.';
    } finally {
      this.enviandoCorreo = false;
      this.cdr.detectChanges();
    }
  }

  async generarPDF() {
    if (!this.task || !this.tipoSeleccionado) return;
    this.generandoPDF = true;

    // Capturar firma del canvas activo
    if (this.firmaCanvas && this.tipoSeleccionado) {
      const ctx = this.firmaCanvas.getContext('2d')!;
      const data = ctx.getImageData(0, 0, this.firmaCanvas.width, this.firmaCanvas.height).data;
      if (data.some(v => v !== 0)) {
        this.firmasPorTipo[this.tipoSeleccionado] = this.firmaCanvas.toDataURL();
      }
    }

    // Cargar logo via fetch
    let logoBase64 = '';
    try {
      const response = await fetch('https://firebasestorage.googleapis.com/v0/b/sistemasintegra.firebasestorage.app/o/logo%20bien%20hecho-modified.png?alt=media&token=ce014cfa-5c0c-4533-ad07-dc6e3d0519bc');
      const blob = await response.blob();
      logoBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.warn('No se pudo cargar el logo:', e);
    }

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    const contentWidth = pageWidth - margin * 2;
    let y = 15;
    let primeraHoja = true;

    const checkPage = () => {
      if (y > 270) { doc.addPage(); y = 15; }
    };

    const addText = (text: string, size = 10, bold = false) => {
      checkPage();
      doc.setFontSize(size);
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.setTextColor(0, 0, 0);
      const lines = doc.splitTextToSize(text, contentWidth);
      doc.text(lines, margin, y);
      y += lines.length * (size * 0.4) + 2;
    };

    const addTitle = (text: string) => {
      checkPage();
      doc.setFillColor(30, 58, 110);
      doc.rect(margin, y - 5, contentWidth, 8, 'F');
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text(text, margin + 2, y);
      y += 6;
      doc.setTextColor(0, 0, 0);
    };

    const addCheck = (checked: boolean, text: string) => {
      checkPage();
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      const mark = checked ? '[X]' : '[ ]';
      const lines = doc.splitTextToSize(`${mark} ${text}`, contentWidth - 8);
      doc.text(lines, margin + 4, y);
      y += lines.length * 4 + 1;
    };

    const addField = (label: string, value: string) => {
      checkPage();
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(80, 80, 80);
      doc.text(`${label}:`, margin + 2, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      const val = value || '-';
      const lines = doc.splitTextToSize(val, contentWidth - 42);
      doc.text(lines, margin + 40, y);
      y += Math.max(lines.length * 4, 5) + 1;
    };

    const addSpacer = () => { y += 3; };

    const addBanner = (tipoLabel: string) => {
      doc.setFillColor(30, 58, 110);
      doc.rect(0, 0, pageWidth, 30, 'F');

      if (logoBase64) {
        try {
          doc.addImage(logoBase64, 'PNG', margin, 3, 24, 24);
        } catch (e) { console.warn('Error insertando logo:', e); }
      }

      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('Sistemas Integra', margin + 28, 13);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(200, 220, 255);
      doc.text('Tecnologia  |  Seguridad  |  Control', margin + 28, 20);

      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.3);
      doc.line(pageWidth - 60, 5, pageWidth - 60, 25);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('Hoja de trabajo:', pageWidth - 58, 11);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      const tipoLabelCorto = tipoLabel.length > 22 ? tipoLabel.substring(0, 22) + '...' : tipoLabel;
      doc.text(tipoLabelCorto, pageWidth - 58, 17);

      const folioCorto = this.task!.folioId.slice(-8).toUpperCase();
      doc.setFontSize(7);
      doc.setTextColor(200, 220, 255);
      doc.text(`Folio: ${folioCorto}`, pageWidth - 58, 23);

      y = 38;
    };

    const addDatosGenerales = () => {
      addField('Folio', this.task!.folioId);
      addField('Cliente', this.task!.cliente);
      addField('Direccion', this.task!.direccion || '');
      addField('Fecha', this.fechaTarea);
      addField('Tecnico', this.currentUser?.nombre || '');
      addSpacer();
    };

    const addFirma = (tipo: WorkOrderType, hojaData: WorkOrder | undefined) => {
      const firma = this.firmasPorTipo[tipo] || (hojaData as any)?.firmaCliente || '';
      if (!firma) return;
      if (y + 45 > 270) { doc.addPage(); y = 15; }
      addSpacer();
      addTitle('FIRMA DEL CLIENTE');
      if (y + 35 > 270) { doc.addPage(); y = 15; }
      try {
        doc.addImage(firma, 'PNG', margin, y, 80, 30);
        y += 35;
      } catch (e) {
        console.warn('No se pudo agregar la firma:', e);
      }
    };

    const tiposAGenerar = this.hojasGuardadas.length > 0
      ? this.hojasGuardadas.map(h => h.tipo)
      : [this.tipoSeleccionado!];

    for (const tipo of tiposAGenerar) {
      if (!primeraHoja) { doc.addPage(); y = 15; }

      const tipoLabel = this.tipos.find(t => t.value === tipo)?.label || tipo;
      addBanner(tipoLabel);
      addDatosGenerales();

      const hojaData = this.hojasGuardadas.find(h => h.tipo === tipo);

      if (tipo === 'cctv_instalacion' || tipo === 'cctv_reparacion') {
        const d = hojaData?.datosCCTV || this.cctv;
        addTitle('BLOQUE DE VALIDACION GENERAL');
        addField('Camaras instaladas', String(d.numeroCamaras));
        addField('Tiempo de grabacion', d.tiempoGrabacion);
        addField('Capacidad almacenamiento', d.capacidadAlmacenamiento);
        addCheck(d.grabacionVerificada, 'Se verifico grabacion correcta en todas las camaras instaladas');
        addCheck(d.hikConnectOperativo, 'Sistema vinculado y operativo en la plataforma Hik-Connect');
        addCheck(d.fechaHoraVerificada, 'Fecha y hora del grabador verificadas correctamente');
        addField('Numero de Serie', d.numeroSerie);
        addField('Internet Bajada', `${d.internetBajada} Mbps`);
        addField('Internet Subida', `${d.internetSubida} Mbps`);
        addField('Recomendaciones', d.recomendaciones);
        addSpacer();
        addTitle('BLOQUE ENTREGA AL CLIENTE');
        addText('Validacion tecnica', 9, true);
        addCheck(d.demostracionRealizada, 'Me mostraron la operacion general y realizaron pruebas funcionales frente a mi');
        addCheck(d.canalizacionProfesional, 'La canalizacion, cableado, montaje y limpieza me parecieron ordenados y profesionales');
        addCheck(d.areaLimpia, 'El area de trabajo fue entregada limpia y funcional');
        addCheck(d.vistaCorrectaCamaras, 'La vista de lo que capturan las camaras me parece correcta');
        addText('Experiencia del cliente', 9, true);
        addCheck(d.explicacionBasica, 'Recibi explicacion basica del funcionamiento del sistema');
        addCheck(d.sabeContactarSoporte, 'Se como contactar al area de soporte tecnico');
        addCheck(d.personalProfesional, 'El personal se presento de manera profesional y resolvio mis dudas');
        addCheck(d.capacitacionRealizada, 'Entiendo las funciones principales y se me capacito para utilizarlo');
        addText('Responsabilidad y garantia', 9, true);
        addCheck(d.sabesolicitarSoporte, 'Se como solicitar soporte tecnico en caso de requerir asistencia futura');
        addCheck(d.entiendeLimitesGarantia, 'Entiendo que danos por descargas electricas o manipulacion indebida no aplican como garantia');
        addCheck(d.recomendoContrasenas, 'Se me recomendo actualizar mis contrasenas para mejorar privacidad y seguridad');
        addSpacer();
        addField('Calificacion sobre nuestro servicio', `${d.calificacion}/10`);
        addField('Calificacion para referenciado', d.nps);

      } else if (tipo === 'alarma_instalacion') {
        const d = hojaData?.datosAlarma || this.alarma;
        addTitle('BLOQUE DE VALIDACION GENERAL');
        addField('Modelo de panel', d.modeloPanel);
        addField('Numero de serie', d.numeroSerie);
        addField('Sensores PIR', String(d.cantidadPIR));
        addField('Contactos magneticos', String(d.cantidadContactos));
        addField('Sensores de humo', String(d.cantidadHumo));
        addField('Botones de panico', String(d.cantidadPanico));
        addField('Sirenas', String(d.cantidadSirenas));
        addField('Teclados', String(d.cantidadTeclados));
        addSpacer();
        addText('Validaciones tecnicas', 9, true);
        addCheck(d.sensoresVerificados, 'Se verifico funcionamiento correcto de todos los sensores instalados');
        addCheck(d.zonasValidadas, 'Se valido activacion y restauracion de zonas correctamente');
        addCheck(d.sirenaVerificada, 'Se verifico funcionamiento correcto de sirena interior y/o exterior');
        addCheck(d.hikConnectOperativo, 'Sistema vinculado y operativo en Hik-Connect');
        addCheck(d.alertaHumoVerificada, 'Se verifico alerta de sensor de humo');
        addCheck(d.notificacionesVerificadas, 'Se verifico recepcion de notificaciones y alertas');
        addCheck(d.fechaHoraVerificada, 'Fecha y hora del panel verificadas correctamente');
        addCheck(d.usuariosConfigurados, 'Usuarios, contrasenas y permisos basicos configurados');
        addCheck(d.armadoDesarmadoVerificado, 'Se valido correcto armado y desarmado del sistema');
        addCheck(d.bateriaVerificada, 'Se verifico funcionamiento correcto de bateria de respaldo');
        addCheck(d.internetVerificado, 'Se verifico conexion estable a internet');
        addField('Internet Bajada', `${d.internetBajada} Mbps`);
        addField('Internet Subida', `${d.internetSubida} Mbps`);
        addField('Recomendaciones', d.recomendaciones);
        addSpacer();
        addTitle('BLOQUE ENTREGA AL CLIENTE');
        addCheck(d.demostracionRealizada, 'Me mostraron la operacion general y realizaron pruebas funcionales frente a mi');
        addCheck(d.canalizacionProfesional, 'La canalizacion, cableado, montaje y limpieza me parecieron ordenados y profesionales');
        addCheck(d.areaLimpia, 'El area de trabajo fue entregada limpia y funcional');
        addCheck(d.sensoresVerificadosCliente, 'Verifique junto al tecnico el funcionamiento de sensores, sirenas y controles');
        addCheck(d.explicacionBasica, 'Recibi explicacion basica sobre el funcionamiento del sistema');
        addCheck(d.sabeContactarSoporte, 'Se como contactar al area de soporte tecnico');
        addCheck(d.personalProfesional, 'El personal se presento de manera profesional');
        addCheck(d.capacitacionRealizada, 'Entiendo las funciones principales y fui capacitado para utilizarlo correctamente');
        addCheck(d.sabeArmarDesarmar, 'Se como armar y desarmar correctamente el sistema');
        addCheck(d.sabeResponderAlarma, 'Entiendo como responder ante una alarma o notificacion');
        addCheck(d.sabesolicitarSoporte, 'Se como solicitar soporte tecnico en caso de requerir asistencia futura');
        addCheck(d.entiendeLimitesGarantia, 'Entiendo que danos por descargas electricas o manipulacion indebida no aplican como garantia');
        addCheck(d.recomendoContrasenas, 'Se me recomendo actualizar mis contrasenas y resguardar mis accesos');
        addSpacer();
        addField('Calificacion sobre nuestro servicio', `${d.calificacion}/10`);
        addField('Calificacion para referenciado', d.nps);

      } else if (tipo === 'alarma_mercado_san_juan') {
        const d = hojaData?.datosAlarmaMarket || this.alarmaMarket;
        addTitle('CONFIGURACION ESTANDAR');
        addCheck(d.ethernetActivo, 'Conexion Ethernet activa y funcional');
        addCheck(d.panelHikConnect, 'Panel enlazado correctamente a Hik-Connect');
        addCheck(d.nombreSucursalTeclado, 'Nombre de sucursal configurado en teclado');
        addCheck(d.fechaHoraConfig, 'Fecha y hora configuradas correctamente');
        addCheck(d.retardoEntradaServicio, 'Retardo de entrada en puerta de servicio (30 segundos)');
        addCheck(d.retardoSalidaServicio, 'Retardo de salida en puerta de servicio (60 segundos)');
        addCheck(d.botonesPanico247, 'Botones de panico configurados 24/7 en modo silencioso');
        addCheck(d.sensorHumoPanaderia247, 'Sensor de humo panaderia configurado 24/7');
        addSpacer();
        addTitle('VALIDACION APP Y CONECTIVIDAD');
        addCheck(d.internetValidado, 'Conexion a internet validada');
        addCheck(d.panelEnLinea, 'Panel en linea en Hik-Connect');
        addCheck(d.appProbada, 'App probada correctamente');
        addCheck(d.recepcionEventos, 'Recepcion de eventos validada');
        addCheck(d.armadoDesarmadoRemoto, 'Armado y desarmado remoto funcional');
        addSpacer();
        addTitle('LIBERACION INTERNA');
        addCheck(d.instalacionValidadaIngeniero, 'Instalacion validada correctamente por ingeniero');
        addCheck(d.pruebasFuncionalesOK, 'Todas las pruebas funcionales realizadas satisfactoriamente');
        addCheck(d.sistemaEntregadoOperativo, 'Sistema entregado completamente operativo');
        addField('Tecnico responsable', d.firmaTecnico);
        addField('Validacion ingenieria', d.nombreValidacionIngenieria);
        addSpacer();
        addTitle('ENTREGA AL CLIENTE');
        addCheck(d.demostracionRealizada, 'Me mostraron la operacion general y vi todo operando correctamente');
        addCheck(d.canalizacionProfesional, 'La canalizacion, cableado y montaje me parecieron ordenados y profesionales');
        addCheck(d.appEnCliente, 'Ya tengo la alarma en mi App y puedo hacer uso de ella');
        addCheck(d.explicacionBasica, 'Recibi la explicacion del funcionamiento del sistema');
        addCheck(d.sabeContactarSoporte, 'Se como contactar al area de soporte tecnico');
        addCheck(d.personalProfesional, 'El personal se presento de manera profesional y resolvio mis dudas');
        addCheck(d.capacitacionRealizada, 'Entiendo las funciones principales y se me capacito para utilizarlo');
        addCheck(d.sabesolicitarSoporte, 'Se como solicitar soporte tecnico en caso de requerir asistencia futura');
        addCheck(d.entiendeLimitesGarantia, 'Entiendo que danos por descargas electricas o manipulacion indebida pueden violar la garantia');
        addCheck(d.recomendoContrasenas, 'Se me recomendo actualizar mis contrasenas y es mi responsabilidad resguardarlas');
        addSpacer();
        addField('Calificacion sobre nuestro servicio', `${d.calificacion}/10`);
        addField('Calificacion para referenciado', d.nps);

      } else if (tipo === 'soft_restaurant_instalacion') {
        const d = hojaData?.datosSoftInstalacion || this.softInstalacion;
        addTitle('EQUIPO IMPLEMENTADO');
        addField('Descripcion', d.equipoImplementado);
        addSpacer();
        addTitle('INFRAESTRUCTURA');
        addCheck(d.cableModemCaja, 'Tirado de cable desde modem hasta caja');
        addCheck(d.cableImpresorasCaja, 'Tirado de cables desde impresoras hacia caja');
        addCheck(d.cableComanderosCaja, 'Tirado de cables desde comanderos hacia caja');
        addCheck(d.cableAPWifi, 'Tirado de cable desde AP WiFi hacia caja');
        addCheck(d.montajeCajaPeinado, 'Montaje de caja principal y peinado de cables');
        addSpacer();
        addTitle('CONFIGURACION Y MONTAJE');
        addCheck(d.peinadoCableCpu, 'Peinado de cables estetico en zona caja CPU');
        addCheck(d.peinadoCableEquipos, 'Peinado de cables desde equipos superiores hacia CPU');
        addCheck(d.licenciaActiva, 'Licencia activa con datos reales del negocio');
        addCheck(d.baseDatosInicializada, 'Base de datos inicializada, pruebas y ventas borradas');
        addCheck(d.menuCapturado, 'Menu capturado en sistema con ajustes del cliente');
        addCheck(d.softwareSoporte, 'Comprobacion de software para soporte remoto');
        addCheck(d.driversImpresoras, 'Comprobacion de drivers e impresion exitosa');
        addCheck(d.monitoresTouchAlineados, 'Monitores touch con alineacion perfecta');
        addCheck(d.ipFija, 'IP fija configurada');
        addSpacer();
        addTitle('CONECTIVIDAD');
        addCheck(d.correosConfigurados, 'Configuracion y prueba de correos con corte diario');
        addCheck(d.ingresoRemoto, 'Configuracion para ingreso remoto desatendido');
        addCheck(d.internetNavega, 'Internet navega correctamente a +10 Mbps');
        addCheck(d.tabletsConfiguradas, 'Tablets con recepcion aceptada');
        addSpacer();
        addTitle('COMPROBACION FINAL');
        addCheck(d.instalacionValidadaIngeniero, 'Instalacion y configuracion validada correctamente por ingeniero');
        addCheck(d.pruebasImpresionOK, 'Todas las pruebas de impresion realizadas satisfactoriamente');
        addCheck(d.sistemaListoEntrega, 'Sistema listo para entrega, opera con normalidad');
        addCheck(d.capacitacionBrindada, 'Se brindo capacitacion en Ventas / Alta de productos / Reportes / Cortes / Permisos');
        addField('Tecnico responsable', d.nombreTecnico);
        addField('Validacion ingenieria', d.nombreIngenieria);
        addSpacer();
        addTitle('ENTREGA AL CLIENTE');
        addCheck(d.demostracionRealizada, 'Me mostraron la operacion general, impresiones, tablets y equipos enlazados funcionando con normalidad');
        addCheck(d.canalizacionProfesional, 'La canalizacion, cableado, montaje y limpieza me parecieron ordenados y profesionales');
        addCheck(d.correoPruebaRecibido, 'Ya tengo las pruebas de correo para recibir el corte del turno');
        addCheck(d.capacitacionCompleta, 'Recibi la capacitacion del funcionamiento del sistema');
        addCheck(d.personalProfesional, 'El personal se presento de manera profesional y resolvio mis dudas');
        addCheck(d.listoParaUsar, 'Entiendo las funciones principales y estoy listo para comenzar a utilizarlo');
        addCheck(d.sabesolicitarSoporte, 'Se como solicitar soporte tecnico en caso de requerir asistencia futura');
        addCheck(d.garantia30Dias, 'Entiendo que la garantia es de 30 dias FULL y 12 meses para equipos electronicos');
        addCheck(d.entiendeLimitesGarantia, 'Entiendo que danos por descargas electricas, agua o intervencion de terceros pueden violar la garantia');
        addCheck(d.contrasenaAdministradora, 'Se me informo que la contrasena administradora tiene el poder de hacer todo en el sistema');
        addSpacer();
        addField('Calificacion sobre nuestro servicio', `${d.calificacion}/10`);
        addField('Calificacion para referenciado', d.nps);

      } else if (tipo === 'lab_diagnostico') {
        const d = hojaData?.datosLabDiagnostico || this.labDiagnostico;
        addTitle('DATOS GENERALES');
        addField('Ingeniero', d.ingeniero);
        addField('Cliente', d.cliente);
        addField('Marca y Modelo', d.marcaModelo);
        addField('Numero de Serie', d.numeroSerie);
        addField('Tipo de servicio',
          [d.tipoGarantia && 'Garantia', d.tipoReparacion && 'Reparacion', d.tipoRevision && 'Revision']
          .filter(Boolean).join(', '));
        addSpacer();
        addTitle('VALIDACION INICIAL');
        addCheck(d.sinDanosVisibles, 'Sin danos visibles');
        addCheck(d.golpesDetectados, 'Golpes detectados');
        addCheck(d.humedadDetectada, 'Humedad detectada');
        addCheck(d.sulfatacionDetectada, 'Sulfatacion detectada');
        addCheck(d.componentesFaltantes, 'Componentes faltantes');
        addCheck(d.sellosGarantiaDanados, 'Sellos de garantia danados');
        addCheck(d.manipulacionPreviaDetectada, 'Manipulacion previa detectada');
        addField('Observaciones', d.observacionesEstado);
        addSpacer();
        addTitle('PRUEBAS REALIZADAS');
        addText('Energia', 9, true);
        addCheck(d.enciendeCorrectamente, 'Enciende correctamente');
        addCheck(d.noEnciende, 'No enciende');
        addCheck(d.fuentePoderFuncional, 'Fuente de poder funcional');
        addCheck(d.fuentePoderDefectuosa, 'Fuente de poder defectuosa');
        addText('Comunicacion', 9, true);
        addCheck(d.comunicacionCorrecta, 'Comunicacion correcta');
        addCheck(d.comunicacionIntermitente, 'Comunicacion intermitente');
        addCheck(d.sinComunicacion, 'Sin comunicacion');
        addText('Operacion', 9, true);
        addCheck(d.operaCorrectamente, 'Opera correctamente');
        addCheck(d.fallaEnTodo, 'Falla en todo momento');
        addCheck(d.fallaIntermitente, 'Falla intermitente');
        addCheck(d.errorConfiguracion, 'Error de configuracion');
        addCheck(d.danoFisicoInterno, 'Dano fisico interno');
        addCheck(d.danoPorDescargaElectrica, 'Dano por descarga electrica');
        addCheck(d.danoPorHumedad, 'Dano por humedad');
        addCheck(d.noSeDetectoFalla, 'No se detecto falla');
        addSpacer();
        addTitle('DIAGNOSTICO TECNICO');
        addField('Descripcion de la falla', d.descripcionFalla);
        addSpacer();
        addTitle('ACCION RECOMENDADA');
        addCheck(d.accionReconfiguracion, 'Reconfiguracion');
        addCheck(d.accionActualizacionFirmware, 'Actualizacion de firmware');
        addCheck(d.accionReparacionInterna, 'Reparacion interna');
        addCheck(d.accionReemplazoComponente, 'Reemplazo de componente');
        addCheck(d.accionReemplazoTotal, 'Reemplazo total del equipo');
        addCheck(d.accionEnvioGarantia, 'Envio a garantia fabricante');
        addCheck(d.accionNoReparable, 'No reparable');
        addSpacer();
        addTitle('REFACCIONES Y COSTOS');
        addCheck(d.noRequiereRefacciones, 'No requiere refacciones');
        addCheck(d.siRequiereRefacciones, 'Si requiere refacciones');
        addField('Descripcion', d.descripcionRefacciones);
        addField('Costo estimado', `$${d.costoEstimado}`);
        addField('Costo mano de obra', `$${d.costoManoObra}`);
        addSpacer();
        addTitle('RESULTADO FINAL');
        addCheck(d.resultadoReparado, 'Reparado y probado');
        addCheck(d.resultadoPendienteGarantia, 'Pendiente de validacion de garantia');
        addCheck(d.resultadoPendienteRefacciones, 'Pendiente de refacciones');
        addCheck(d.resultadoListoEntrega, 'Equipo listo para entrega');
        addCheck(d.resultadoNoReparable, 'Equipo no reparable');
        addField('Horas invertidas', String(d.horasInvertidas));
        addField('Dictamen tecnico', d.dictamenTecnico);
        addField('Tecnico responsable', d.firmaTecnico);

      } else if (tipo === 'recibo_equipo') {
        const d = hojaData?.datosReciboEquipo || this.reciboEquipo;
        addTitle('DATOS GENERALES');
        addField('Colaborador', d.colaborador);
        addField('Cliente', d.cliente);
        addField('Telefono', d.telefono);
        addField('Correo electronico', d.correoElectronico);
        addField('Marca y Modelo', d.marcaModelo);
        addField('SN', d.sn);
        addField('Contrasenia cliente', d.contraseniaCliente);
        addField('Direccion IP', d.direccionIP);
        addField('Prioridad',
          [d.prioridadBaja && 'Baja', d.prioridadMedia && 'Media',
           d.prioridadAlta && 'Alta', d.prioridadCritica && 'Critica']
          .filter(Boolean).join(', '));
        addField('Tiempo estimado', d.tiempoEstimado);
        addSpacer();
        addTitle('DETALLES DE RECIBO');
        addField('Descripcion de la falla', d.descripcionFalla);
        addField('Tipo',
          [d.tipoGarantia && 'Garantia', d.tipoReparacion && 'Reparacion',
           d.tipoRevision && 'Revision', d.tipoDevolucion && 'Devolucion']
          .filter(Boolean).join(', '));
        addSpacer();
        addTitle('ACCESORIOS RECIBIDOS');
        addCheck(d.cajaOriginal, 'Caja original');
        addCheck(d.cablesConexion, 'Cables de conexion');
        addCheck(d.baseMontaje, 'Base de montaje');
        addCheck(d.bateria, 'Bateria');
        addCheck(d.fuentePoder, 'Fuente de poder');
        addSpacer();
        addTitle('ESTADO AL RECIBIR');
        addCheck(d.estadoEnciende, 'Enciende');
        addCheck(d.estadoNoEnciende, 'No enciende');
        addCheck(d.estadoNoPosibleProbar, 'No fue posible probar');
        addSpacer();
        addTitle('ESTADO VISIBLE DEL EQUIPO');
        addCheck(d.huelaQuemado, 'Huele a quemado');
        addCheck(d.estaGolpeado, 'Esta golpeado');
        addCheck(d.estaQuebrado, 'Esta quebrado');
        addCheck(d.pantallaRota, 'Pantalla rota');
        addCheck(d.faltanTornillos, 'Le faltan tornillos');
        addCheck(d.indiciosHumedad, 'Tiene indicios de humedad');
        addCheck(d.etiquetasDanadas, 'Etiquetas de garantia danadas');
        addField('Nombre de quien recibe', d.nombreFirmaCliente);

      } else if (tipo === 'pos_perifericos_instalacion') {
        const d = hojaData?.datosPosInstalacion || this.posInstalacion;
        addTitle('VALIDACION DE SERVICIO INTERNO');
        addCheck(d.limpiezaAreas, 'Limpieza de areas en donde se trabajo');
        addCheck(d.revisionConexiones, 'Revision y correccion de conexiones');
        addCheck(d.cableadoOrganizado, 'Todo el cableado quedo organizado y asegurado');
        addCheck(d.alimentacionVerificada, 'Se verifico alimentacion regulada de todos los equipos');
        addCheck(d.comunicacionVerificada, 'Se verifico comunicacion entre todos los dispositivos');
        addCheck(d.internetVerificado, 'Se verifico acceso a internet y red local');
        addCheck(d.pruebasVenta, 'Se realizaron pruebas completas de venta, cobro e impresion');
        addCheck(d.perifericosVerificados, 'Se verifico correcta operacion de todos los perifericos');
        addSpacer();
        addTitle('EQUIPOS INSTALADOS');
        addField('Terminales POS', String(d.cantidadTerminalesPOS));
        addField('Cajas', String(d.cantidadCajas));
        addField('Pantallas cliente', String(d.cantidadPantallasCliente));
        addField('Impresoras', String(d.cantidadImpresoras));
        addField('Basculas', String(d.cantidadBasculas));
        addField('Tabletas', String(d.cantidadTabletas));
        addField('Materiales adicionales', d.materialesAdicionales);
        addSpacer();
        addTitle('CREDENCIALES DE ACCESO');
        addField('Usuario Admin', d.usuarioAdmin);
        addField('Contrasena Admin', d.contrasenaAdmin);
        addField('Contrasena Windows', d.contrasenaWindows);
        addField('Datos de licencia', d.datosLicencia);
        addField('Otras credenciales', d.otrasCredenciales);
        addField('Validacion supervisor', d.firmaSupervisor);
        addSpacer();
        addTitle('VALIDACIONES TECNICAS');
        addCheck(d.sistemaOperativoVerificado, 'Se verifico inicio correcto del sistema operativo');
        addCheck(d.accesoUsuariosVerificado, 'Se verifico acceso de usuarios al sistema');
        addCheck(d.sistemaFuncionaNormal, 'Se verifico que el sistema funcionara con normalidad');
        addCheck(d.perifericosFuncionan, 'Se verifico funcionamiento de perifericos');
        addCheck(d.impresionTicketsVerificada, 'Se verifico impresion de tickets correctamente');
        addCheck(d.cajonDineroVerificado, 'Se verifico apertura automatica del cajon de dinero');
        addCheck(d.fechaHoraVerificada, 'Fecha y hora verificadas correctamente');
        addField('Internet Bajada', `${d.internetBajada} Mbps`);
        addField('Internet Subida', `${d.internetSubida} Mbps`);
        addField('Correos para reportes', d.correosReportes);
        addField('Recomendaciones', d.recomendaciones);
        addSpacer();
        addTitle('CAPACITACION REALIZADA');
        addCheck(d.capAltaProductos, 'Alta de productos / servicios / socios');
        addCheck(d.capVentaCobro, 'Venta y cobro, devoluciones');
        addCheck(d.capCortesCaja, 'Cortes de caja');
        addCheck(d.capImpresionTickets, 'Impresion de tickets');
        addCheck(d.capReportes, 'Consulta de reportes');
        addCheck(d.capUsuariosPermisos, 'Alta de usuarios y gestion de permisos');
        addSpacer();
        addTitle('ENTREGA AL CLIENTE');
        addCheck(d.demostracionRealizada, 'Me mostraron el funcionamiento completo del sistema instalado');
        addCheck(d.pruebasVentaCliente, 'Realizaron pruebas de venta, cobro e impresion frente a mi');
        addCheck(d.canalizacionProfesional, 'El cableado, montaje y limpieza me parecieron ordenados y profesionales');
        addCheck(d.accesoSistema, 'Tengo acceso al sistema y puedo utilizarlo correctamente');
        addCheck(d.capacitacionRecibida, 'Recibi capacitacion basica de operacion');
        addCheck(d.personalProfesional, 'El personal se presento de manera profesional');
        addCheck(d.sabesolicitarSoporte, 'Se como solicitar soporte tecnico en caso de requerir asistencia futura');
        addCheck(d.entiendeLimitesGarantia, 'Entiendo que danos externos pueden afectar la garantia del sistema');
        addSpacer();
        addField('Calificacion sobre nuestro servicio', `${d.calificacion}/10`);
        addField('Calificacion para referenciado', d.nps);

      } else if (tipo === 'canalizacion_conduit') {
        const d = hojaData?.datosCanalizacion || this.canalizacion;
        addTitle('VALIDACION DE SERVICIO INTERNO');
        addCheck(d.limpiezaAreas, 'Limpieza de areas en donde se trabajo');
        addCheck(d.retiroResiduos, 'Se retiraron residuos de tuberia');
        addCheck(d.tuberiaFirme, 'Se verifico que no se sienta la tuberia suelta');
        addCheck(d.tuberiaCorrctamenteFijada, 'Todos los tramos de tuberia quedaron correctamente fijados');
        addCheck(d.alineacionEstetica, 'Se verifico alineacion y estetica general de la instalacion');
        addSpacer();
        addTitle('MATERIALES INSTALADOS');
        addField('Metros de tuberia conduit', String(d.metrosTuberia));
        addField('Registros tipo L,T,paso', String(d.cantidadRegistros));
        addField('Curvas instaladas', String(d.cantidadCurvas));
        addField('Cajas condulet/registro', String(d.cantidadCajasCondulet));
        addField('Abrazaderas/soportes', String(d.cantidadAbrazaderas));
        addField('Licuatite', String(d.cantidadLicuatite));
        addField('Materiales adicionales', d.materialesAdicionales);
        addSpacer();
        addTitle('DETALLE DEL TRABAJO REALIZADO');
        addField('Descripcion', d.detalleTrabajoRealizado);
        addField('Tecnico responsable', d.firmaTecnico);

      } else if (tipo === 'cctv_servicio') {
        const d = hojaData?.datosCctvServicio || this.cctvServicio;
        addTitle('VALIDACION DE SERVICIO INTERNO');
        addCheck(d.limpiezaAreas, 'Limpieza de areas en donde se trabajo');
        addCheck(d.revisionConexiones, 'Se revisaron y corrigieron conexiones problematicas');
        addCheck(d.grabadorLimpio, 'El grabador quedo limpio, organizado y correctamente cerrado');
        addCheck(d.cableadoIdentificado, 'El cableado quedo correctamente identificado y peinado');
        addCheck(d.alimentacionVerificada, 'Se verifico alimentacion electrica del grabador');
        addCheck(d.comunicacionVerificada, 'Se verifico comunicacion correcta entre camaras y grabador');
        addCheck(d.pruebasVisualizacion, 'Se realizaron pruebas de visualizacion y grabacion');
        addSpacer();
        addTitle('EQUIPOS');
        addField('Camaras con video', String(d.camarasConVideo));
        addField('Camaras con mantenimiento', String(d.camarasMantenimiento));
        addField('Camaras reemplazadas', String(d.camarasReemplazadas));
        addField('Camaras sin video', String(d.camarasSinVideo));
        addField('Capacidad almacenamiento', d.capacidadAlmacenamiento);
        addField('Materiales adicionales', d.materialesAdicionales);
        addField('Refacciones utilizadas', d.refaccionesUtilizadas);
        addSpacer();
        addTitle('CREDENCIALES');
        addField('N° Serie Grabador', d.nSerieGrabador);
        addField('Contrasena Grabador', d.contrasenaGrabador);
        addField('Contrasena Hik-Connect', d.contrasenaHikConnect);
        addField('Correo/Telefono asociado', d.correoAsociado);
        addField('Validacion supervisor', d.firmaSupervisor);
        addSpacer();
        addTitle('DETALLE DEL SERVICIO');
        addField('Detalle reportado por cliente', d.detalleCliente);
        addField('Trabajos realizados', d.trabajosRealizados);
        addSpacer();
        addTitle('VALIDACIONES TECNICAS');
        addCheck(d.camarasVisualizando, 'Se verifico visualizacion de todas las camaras funcionando');
        addCheck(d.grabacionConfigurada, 'Se verifico configuracion de grabacion correctamente');
        addCheck(d.grabacionesVerificadas, 'Se verificaron grabaciones en camaras operativas');
        addCheck(d.reproduccionVerificada, 'Se verifico reproduccion de grabaciones');
        addCheck(d.fechaHoraVerificada, 'Se verifico fecha y hora del sistema');
        addCheck(d.discoVerificado, 'Se verifico funcionamiento correcto del disco duro');
        addCheck(d.videoMonitorCliente, 'Se verifico video en monitor de cliente');
        addCheck(d.accesoRemotoVerificado, 'Se verifico acceso remoto mediante Hik-Connect');
        addSpacer();
        addTitle('DIAGNOSTICO REALIZADO');
        addCheck(d.diagnosticoConfiguracion, 'Configuracion incorrecta');
        addCheck(d.diagnosticoFuentePoder, 'Dano en fuente de poder');
        addCheck(d.diagnosticoCamara, 'Dano en camara');
        addCheck(d.diagnosticoCableado, 'Dano en cableado');
        addCheck(d.diagnosticoDiscoDuro, 'Dano en disco duro');
        addCheck(d.diagnosticoRed, 'Problema de red');
        addCheck(d.diagnosticoInternet, 'Problema de internet');
        addCheck(d.diagnosticoSinFalla, 'No se detecto falla');
        addField('Internet Bajada', `${d.internetBajada} Mbps`);
        addField('Internet Subida', `${d.internetSubida} Mbps`);
        addField('Tiempo estimado grabacion', d.tiempoGrabacion);
        addField('Ubicacion grabador', d.ubicacionGrabador);
        addField('Recomendaciones', d.recomendaciones);
        addSpacer();
        addTitle('ENTREGA AL CLIENTE');
        addCheck(d.demostracionRealizada, 'Me mostraron el funcionamiento del sistema despues del servicio');
        addCheck(d.visualizacionGrabaciones, 'Me mostraron visualizacion en vivo y grabaciones almacenadas');
        addCheck(d.explicacionFallas, 'Me explicaron las fallas encontradas y acciones correctivas');
        addCheck(d.canalizacionProfesional, 'La canalizacion, cableado y limpieza me parecieron profesionales');
        addCheck(d.accesoHikConnect, 'Tengo acceso al sistema mediante Hik-Connect y/o monitor local');
        addCheck(d.personalProfesional, 'El personal se presento de manera profesional');
        addCheck(d.sabesolicitarSoporte, 'Se como solicitar soporte tecnico en caso de requerir asistencia futura');
        addCheck(d.entiendeLimitesGarantia, 'Entiendo que danos externos pueden afectar el funcionamiento del sistema');
        addSpacer();
        addField('Calificacion sobre nuestro servicio', `${d.calificacion}/10`);
        addField('Calificacion para referenciado', d.nps);

      } else if (tipo === 'soft_restaurant_servicio') {
        const d = hojaData?.datosSoftServicio || this.softServicio;
        addTitle('DETALLE DEL SERVICIO');
        addField('Detalle encontrado', d.detalleEncontrado);
        addSpacer();
        addTitle('MINIMOS REVISABLES');
        addCheck(d.pruebaImpresionAreas, 'Prueba de impresion en todas las areas');
        addCheck(d.equiposEnlazados, 'Equipos existentes enlazados y tablets funcionando');
        addCheck(d.fechaHoraCorrecta, 'Fecha y hora correcta');
        addSpacer();
        addTitle('COMPROBACION FINAL');
        addCheck(d.detalleResuelto, 'El detalle reportado fue resuelto en su totalidad');
        addField('Descripcion del problema y resolucion', d.descripcionProblemaResolucion);
        addCheck(d.sistemaListoEntrega, 'Sistema listo para entrega, opera con normalidad');
        addField('Colaborador responsable', d.nombreColaborador);
        addSpacer();
        addField('Calificacion sobre nuestro servicio', `${d.calificacion}/10`);
        addField('Nombre de quien recibe', d.nombreFirmaCliente);

      } else if (tipo === 'servicio_reparacion_general') {
        const d = hojaData?.datosReparacionGeneral || this.reparacionGeneral;
        addTitle('DETALLE DEL SERVICIO');
        addField('Detalle encontrado', d.detalleEncontrado);
        addSpacer();
        addTitle('COMPROBACION FINAL');
        addCheck(d.fotoDetalleResuelto, 'Foto de detalle resuelto tomada');
        addCheck(d.detalleResuelto, 'El detalle reportado fue resuelto en su totalidad');
        addField('Descripcion del problema y resolucion', d.descripcionProblemaResolucion);
        addCheck(d.solucionListaEntrega, 'Solucion lista para entrega, opera con normalidad');
        addField('Colaborador responsable', d.nombreColaborador);
        addSpacer();
        addField('Calificacion sobre nuestro servicio', `${d.calificacion}/10`);
        addField('Nombre de quien recibe', d.nombreFirmaCliente);

      } else {
        const d = hojaData?.datosGeneral || this.general;
        addTitle('BLOQUE DE VALIDACION GENERAL');
        addField('Tipo de servicio', d.tipoServicio.join(', '));
        addField('Sistema atendido', d.sistemaAtendido.join(', '));
        addField('Actividades realizadas', d.actividadesRealizadas.join(', '));
        addField('Reporte del cliente', d.reporteCliente);
        addField('Diagnostico tecnico', d.diagnosticoTecnico);
        addField('Detalles para el cliente', d.detallesCliente);
        addField('Internet Bajada', `${d.internetBajada} Mbps`);
        addField('Internet Subida', `${d.internetSubida} Mbps`);
        addField('Materiales utilizados', d.materialesUtilizados);
        addSpacer();
        addTitle('BLOQUE ENTREGA AL CLIENTE');
        addCheck(d.demostracionRealizada, 'Me fue demostrada la operacion general y se realizaron pruebas funcionales frente a mi');
        addCheck(d.canalizacionProfesional, 'La canalizacion, cableado y montaje me parecieron ordenados y profesionales');
        addCheck(d.areaLimpia, 'El area de trabajo fue entregada limpia y funcional');
        addCheck(d.explicacionBasica, 'Recibi explicacion basica del funcionamiento del sistema');
        addCheck(d.sabeContactarSoporte, 'Se como contactar al area de soporte tecnico');
        addCheck(d.personalProfesional, 'El personal se presento de manera profesional');
        addCheck(d.capacitacionRealizada, 'Recibi capacitacion basica para la operacion diaria del sistema');
        addCheck(d.sabesolicitarSoporte, 'Se como solicitar soporte tecnico en caso de requerir asistencia futura');
        addCheck(d.entiendeLimitesGarantia, 'Entiendo que danos por descargas electricas o manipulacion indebida no aplican como garantia');
        addSpacer();
        addField('Calificacion sobre nuestro servicio', `${d.calificacion}/10`);
        addField('Calificacion para referenciado', d.nps);
      }

      // Firma al final de cada hoja
      addFirma(tipo, hojaData);
      primeraHoja = false;
    }

    // Footer en todas las paginas
    const totalPages = (doc.internal as any).getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFillColor(30, 58, 110);
      doc.rect(0, 287, pageWidth, 10, 'F');
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(255, 255, 255);
      doc.text('Gracias por permitirnos ser su socio tecnologico', margin, 293);
      doc.text(`Pagina ${i} de ${totalPages}`, pageWidth - margin, 293, { align: 'right' });
    }

    const fileName = `HojaTrabajo_${this.task.folioId}.pdf`;
    doc.save(fileName);
    this.generandoPDF = false;
    this.cdr.detectChanges();
  }

  get fechaTarea(): string {
    if (!this.task?.fechaProgramada) return new Date().toLocaleDateString('es-MX');
    return new Date(this.task.fechaProgramada).toLocaleDateString('es-MX');
  }

  async guardarYSalir() {
    await this.guardar();
    this.goBack();
  }

  goBack() { history.back(); }
}