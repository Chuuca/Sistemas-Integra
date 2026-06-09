export type WorkOrderType =
  | 'cctv_instalacion'
  | 'cctv_reparacion'
  | 'alarma_instalacion'
  | 'alarma_mercado_san_juan'
  | 'instalacion_general'
  | 'pos_sr_instalacion'
  | 'pos_sistema_instalacion'
  | 'pos_servicio'
  | 'pos_mantenimiento'
  | 'sistema_otros'
  | 'servicio_mantenimiento'
  | 'garantia_reparacion'
  | 'audio'
  | 'video'
  | 'telefonia'
  | 'soft_restaurant_instalacion'
  | 'soft_restaurant_servicio'
  | 'servicio_reparacion_general'
  | 'lab_diagnostico'
  | 'recibo_equipo'
  | 'pos_perifericos_instalacion'
  | 'canalizacion_conduit'
  | 'cctv_servicio';

export interface WorkOrderCCTV {
  limpiezaAreas: boolean;
  trayectosFijados: boolean;
  zonaGrabadorOrganizada: boolean;
  materialesAdicionales: string;
  firmaTecnico: string;
  firmaSupervisor: string;
  numeroCamaras: number;
  tiempoGrabacion: string;
  capacidadAlmacenamiento: string;
  grabacionVerificada: boolean;
  hikConnectOperativo: boolean;
  fechaHoraVerificada: boolean;
  numeroSerie: string;
  internetBajada: string;
  internetSubida: string;
  recomendaciones: string;
  demostracionRealizada: boolean;
  canalizacionProfesional: boolean;
  areaLimpia: boolean;
  vistaCorrectaCamaras: boolean;
  explicacionBasica: boolean;
  sabeContactarSoporte: boolean;
  personalProfesional: boolean;
  capacitacionRealizada: boolean;
  sabesolicitarSoporte: boolean;
  entiendeLimitesGarantia: boolean;
  recomendoContrasenas: boolean;
  calificacion: number;
  nps: string;
  solicitaSeguimiento: boolean;
  comentarios: string;
  nombreFirmaCliente: string;
}

export interface WorkOrderAlarma {
  limpiezaAreas: boolean;
  trayectosFijados: boolean;
  gabineteOrganizado: boolean;
  cableadoIdentificado: boolean;
  alimentacionVerificada: boolean;
  comunicacionVerificada: boolean;
  pruebasDisparo: boolean;
  cantidadPIR: number;
  cantidadContactos: number;
  cantidadHumo: number;
  cantidadPanico: number;
  cantidadSirenas: number;
  cantidadTeclados: number;
  cantidadControles: number;
  materialesAdicionales: string;
  firmaTecnico: string;
  firmaSupervisor: string;
  modeloPanel: string;
  numeroSerie: string;
  sensoresVerificados: boolean;
  zonasValidadas: boolean;
  sirenaVerificada: boolean;
  hikConnectOperativo: boolean;
  alertaHumoVerificada: boolean;
  notificacionesVerificadas: boolean;
  fechaHoraVerificada: boolean;
  usuariosConfigurados: boolean;
  armadoDesarmadoVerificado: boolean;
  bateriaVerificada: boolean;
  internetVerificado: boolean;
  internetBajada: string;
  internetSubida: string;
  senalInalambrica: string;
  ubicacionPanel: string;
  recomendaciones: string;
  demostracionRealizada: boolean;
  canalizacionProfesional: boolean;
  areaLimpia: boolean;
  sensoresVerificadosCliente: boolean;
  explicacionBasica: boolean;
  sabeContactarSoporte: boolean;
  personalProfesional: boolean;
  capacitacionRealizada: boolean;
  sabeArmarDesarmar: boolean;
  sabeResponderAlarma: boolean;
  sabesolicitarSoporte: boolean;
  entiendeLimitesGarantia: boolean;
  recomendoContrasenas: boolean;
  calificacion: number;
  nps: string;
  solicitaSeguimiento: boolean;
  comentarios: string;
  nombreFirmaCliente: string;
}

export interface WorkOrderAlarmaMercadoSJ {
  // TUBERÍA Y CABLEADOS
  tuberiaAlarmaIngreso: boolean;
  tuberiaIngresoPanaderia: boolean;
  tuberiaPanelSirenaTecladoSensor: boolean;
  tuberiaIngresoSensorJalon: boolean;
  tuberiaIncendioServicio: boolean;
  tuberiaElectricaInternet: boolean;
  cableadoTotal: boolean;
  cajasRegistroInstaladas: boolean;
  sinCableadoExpuesto: boolean;
  tapasRegistros: boolean;
  // PANEL Y GABINETE
  panelFijadoMuro: boolean;
  panelInstalado: boolean;
  gabineteInterconectado: boolean;
  expansorInstalado: boolean;
  multicontactoInstalado: boolean;
  bateriaConectada: boolean;
  relevadorInstalado: boolean;
  ordenConexionesInternas: boolean;
  tuberiaConduitFirme: boolean;
  sinCableadoExpuestoPanel: boolean;
  tapasRegistrosPanel: boolean;
  // CONFIGURACIÓN ESTÁNDAR
  ethernetActivo: boolean;
  panelHikConnect: boolean;
  nombreSucursalTeclado: boolean;
  fechaHoraConfig: boolean;
  retardoEntradaServicio: boolean;
  retardoSalidaServicio: boolean;
  botonesPanico247: boolean;
  sensorHumoPanaderia247: boolean;
  // ZONAS CABLEADAS
  z1CortinaPuertaServicio: boolean;
  z3CortinaPrincipal: boolean;
  z5SensorHumoPanaderia: boolean;
  // SENSORES PIR
  pir1: boolean;
  pir2: boolean;
  pir3: boolean;
  pir4: boolean;
  pir5: boolean;
  pir6: boolean;
  pir7: boolean;
  pir8: boolean;
  // BOTONES DE PÁNICO
  panicoCaja1: boolean;
  panicoCaja2: boolean;
  panicoCaja3: boolean;
  // INCENDIO
  sensorHumoPanaderiaPrueba: boolean;
  palancaServicioSirenas: boolean;
  palancaIngresoSirenas: boolean;
  // SENSORES AUTÓNOMOS
  sensoresAutonomosProbados: boolean;
  // SIRENAS Y RELEVADOR
  sirenaInteriorActiva: boolean;
  sirenaExteriorActiva: boolean;
  estroboExterior: boolean;
  relevadorActivando: boolean;
  // TECLADO Y OPERACIÓN
  armadoCorrecto: boolean;
  desarmadoCorrecto: boolean;
  retardoEntradaFuncionando: boolean;
  nombreSucursalVisible: boolean;
  fechaHoraCorrectas: boolean;
  // APP Y CONECTIVIDAD
  internetValidado: boolean;
  panelEnLinea: boolean;
  appProbada: boolean;
  recepcionEventos: boolean;
  armadoDesarmadoRemoto: boolean;
  // FOTOS
  fotoPanelAbierto: boolean;
  fotoPanelCerrado: boolean;
  fotoSensoresCortina: boolean;
  fotoSirenaExterior: boolean;
  fotoTeclado: boolean;
  fotoIngresoGeneral: boolean;
  // LIBERACIÓN INTERNA
  instalacionValidadaIngeniero: boolean;
  pruebasFuncionalesOK: boolean;
  sistemaEntregadoOperativo: boolean;
  // FIRMAS
  firmaTecnico: string;
  nombreValidacionIngenieria: string;
  firmaValidacionIngenieria: string;
  // ENTREGA AL CLIENTE
  demostracionRealizada: boolean;
  canalizacionProfesional: boolean;
  appEnCliente: boolean;
  explicacionBasica: boolean;
  sabeContactarSoporte: boolean;
  personalProfesional: boolean;
  capacitacionRealizada: boolean;
  sabesolicitarSoporte: boolean;
  entiendeLimitesGarantia: boolean;
  recomendoContrasenas: boolean;
  calificacion: number;
  nps: string;
  solicitaSeguimiento: boolean;
  comentarios: string;
  nombreFirmaCliente: string;
}
export interface WorkOrderSoftRestaurantInstalacion {
  equipoImplementado: string;
  // INFRAESTRUCTURA
  cableModemCaja: boolean;
  cableImpresorasCaja: boolean;
  cableComanderosCaja: boolean;
  cableAPWifi: boolean;
  montajeCajaPeinado: boolean;
  // CONFIGURACION
  peinadoCableCpu: boolean;
  peinadoCableEquipos: boolean;
  licenciaActiva: boolean;
  baseDatosInicializada: boolean;
  menuCapturado: boolean;
  softwareSoporte: boolean;
  driversImpresoras: boolean;
  monitoresTouchAlineados: boolean;
  ipFija: boolean;
  // CONECTIVIDAD
  correosConfigurados: boolean;
  ingresoRemoto: boolean;
  internetNavega: boolean;
  tabletsConfiguradas: boolean;
  // FOTOS
  fotoCajaInstalada: boolean;
  fotoTablets: boolean;
  fotoZonaCaja: boolean;
  fotoComanderos: boolean;
  // COMPROBACION FINAL
  instalacionValidadaIngeniero: boolean;
  pruebasImpresionOK: boolean;
  sistemaListoEntrega: boolean;
  capacitacionBrindada: boolean;
  // FIRMAS INTERNAS
  nombreTecnico: string;
  firmaTecnico: string;
  nombreIngenieria: string;
  firmaIngenieria: string;
  // ENTREGA AL CLIENTE
  demostracionRealizada: boolean;
  canalizacionProfesional: boolean;
  correoPruebaRecibido: boolean;
  capacitacionCompleta: boolean;
  personalProfesional: boolean;
  listoParaUsar: boolean;
  sabesolicitarSoporte: boolean;
  garantia30Dias: boolean;
  entiendeLimitesGarantia: boolean;
  contrasenaAdministradora: boolean;
  calificacion: number;
  nps: string;
  solicitaSeguimiento: boolean;
  comentarios: string;
  nombreFirmaCliente: string;
}

export interface WorkOrderSoftRestaurantServicio {
  detalleEncontrado: string;
  // MINIMOS REVISABLES
  pruebaImpresionAreas: boolean;
  equiposEnlazados: boolean;
  fechaHoraCorrecta: boolean;
  // FOTOS
  fotoDetalleResuelto: boolean;
  // COMPROBACION FINAL
  detalleResuelto: boolean;
  descripcionProblemaResolucion: string;
  sistemaListoEntrega: boolean;
  // FIRMA
  nombreColaborador: string;
  firmaColaborador: string;
  calificacion: number;
  solicitaSeguimiento: boolean;
  comentarios: string;
  nombreFirmaCliente: string;
}

export interface WorkOrderServicioReparacionGeneral {
  detalleEncontrado: string;
  // FOTOS
  fotoDetalleResuelto: boolean;
  // COMPROBACION FINAL
  detalleResuelto: boolean;
  descripcionProblemaResolucion: string;
  solucionListaEntrega: boolean;
  // FIRMA
  nombreColaborador: string;
  firmaColaborador: string;
  calificacion: number;
  solicitaSeguimiento: boolean;
  comentarios: string;
  nombreFirmaCliente: string;
}

export interface WorkOrderGeneral {
  tipoServicio: string[];
  sistemaAtendido: string[];
  materialesUtilizados: string;
  reporteCliente: string;
  diagnosticoTecnico: string;
  actividadesRealizadas: string[];
  detallesCliente: string;
  internetBajada: string;
  internetSubida: string;
  firmaTecnico: string;
  demostracionRealizada: boolean;
  canalizacionProfesional: boolean;
  areaLimpia: boolean;
  explicacionBasica: boolean;
  sabeContactarSoporte: boolean;
  personalProfesional: boolean;
  capacitacionRealizada: boolean;
  sabesolicitarSoporte: boolean;
  entiendeLimitesGarantia: boolean;
  calificacion: number;
  nps: string;
  solicitaSeguimiento: boolean;
  comentarios: string;
  nombreFirmaCliente: string;
}
export interface WorkOrderLabDiagnostico {
  ingeniero: string;
  cliente: string;
  marcaModelo: string;
  numeroSerie: string;
  tipoGarantia: boolean; tipoReparacion: boolean; tipoRevision: boolean;
  sinDanosVisibles: boolean; golpesDetectados: boolean; humedadDetectada: boolean;
  sulfatacionDetectada: boolean; componentesFaltantes: boolean;
  sellosGarantiaDanados: boolean; manipulacionPreviaDetectada: boolean;
  otroEstadoFisico: string; observacionesEstado: string;
  enciendeCorrectamente: boolean; noEnciende: boolean;
  fuentePoderFuncional: boolean; fuentePoderDefectuosa: boolean;
  comunicacionCorrecta: boolean; comunicacionIntermitente: boolean;
  sinComunicacion: boolean; comunicacionNoAplica: boolean;
  operaCorrectamente: boolean; fallaEnTodo: boolean; fallaIntermitente: boolean;
  errorConfiguracion: boolean; firmwareDesactualizado: boolean;
  firmwareCorrupto: boolean; danoFisicoInterno: boolean;
  danoPorDescargaElectrica: boolean; danoPorHumedad: boolean;
  noSeDetectoFalla: boolean;
  descripcionFalla: string;
  fotografiasInternas: boolean; fotografiasComponentesDanados: boolean;
  videoFuncionamiento: boolean; evidenciaWhatsapp: boolean;
  accionReconfiguracion: boolean; accionActualizacionFirmware: boolean;
  accionReparacionInterna: boolean; accionReemplazoComponente: boolean;
  accionReemplazoTotal: boolean; accionEnvioGarantia: boolean;
  accionSinReparacion: boolean; accionNoReparable: boolean;
  noRequiereRefacciones: boolean; siRequiereRefacciones: boolean;
  descripcionRefacciones: string; costoEstimado: number; costoManoObra: number;
  resultadoReparado: boolean; resultadoPendienteGarantia: boolean;
  resultadoPendienteRefacciones: boolean; resultadoEnviarProveedor: boolean;
  resultadoGarantiaCobertura: boolean; resultadoGarantiaRechazada: boolean;
  resultadoListoEntrega: boolean; resultadoNoReparable: boolean;
  horasInvertidas: number; dictamenTecnico: string; firmaTecnico: string;
  correoEnvioCotizacion: string;
}

export interface WorkOrderReciboEquipo {
  colaborador: string; cliente: string; telefono: string;
  direccionEnvio: string; correoElectronico: string;
  marcaModelo: string; sn: string; contraseniaCliente: string; direccionIP: string;
  prioridadBaja: boolean; prioridadMedia: boolean;
  prioridadAlta: boolean; prioridadCritica: boolean;
  tiempoEstimado: string; descripcionFalla: string;
  tipoGarantia: boolean; tipoReparacion: boolean;
  tipoRevision: boolean; tipoDevolucion: boolean;
  cajaOriginal: boolean; cablesConexion: boolean; baseMontaje: boolean;
  bateria: boolean; fuentePoder: boolean; otroAccesorio: string;
  estadoEnciende: boolean; estadoNoEnciende: boolean; estadoNoPosibleProbar: boolean;
  huelaQuemado: boolean; estaGolpeado: boolean; estaQuebrado: boolean;
  pantallaRota: boolean; estaRaspado: boolean; faltanTornillos: boolean;
  indiciosHumedad: boolean; etiquetasDanadas: boolean; otroEstado: string;
  nombreFirmaCliente: string;
}

export interface WorkOrderPosPerifericosInstalacion {
  limpiezaAreas: boolean; revisionConexiones: boolean; cableadoOrganizado: boolean;
  alimentacionVerificada: boolean; comunicacionVerificada: boolean;
  internetVerificado: boolean; pruebasVenta: boolean; perifericosVerificados: boolean;
  cantidadTerminalesPOS: number; cantidadCajas: number; cantidadPantallasCliente: number;
  cantidadImpresoras: number; cantidadBasculas: number; cantidadEtiquetadoras: number;
  cantidadChecadores: number; cantidadKioskos: number; cantidadTabletas: number;
  materialesAdicionales: string;
  usuarioAdmin: string; contrasenaAdmin: string; contrasenaWindows: string;
  datosLicencia: string; otrasCredenciales: string; firmaSupervisor: string;
  sistemaOperativoVerificado: boolean; accesoUsuariosVerificado: boolean;
  officeRemotoVerificado: boolean; sistemaFuncionaNormal: boolean;
  perifericosFuncionan: boolean; impresionTicketsVerificada: boolean;
  cajonDineroVerificado: boolean; basculaVerificada: boolean;
  etiquetasVerificadas: boolean; checadorVerificado: boolean;
  sincronizacionNube: boolean; respaldoAutomatico: boolean;
  reportesAutomaticos: boolean; terminalesMoviles: boolean;
  fechaHoraVerificada: boolean;
  internetBajada: string; internetSubida: string; correosReportes: string;
  recomendaciones: string;
  capAltaProductos: boolean; capInventario: boolean; capVentaCobro: boolean;
  capCortesCaja: boolean; capImpresionTickets: boolean; capBascula: boolean;
  capEtiquetadora: boolean; capReportes: boolean; capUsuariosPermisos: boolean;
  demostracionRealizada: boolean; pruebasVentaCliente: boolean;
  canalizacionProfesional: boolean; accesoSistema: boolean;
  capacitacionRecibida: boolean; personalProfesional: boolean;
  sabesolicitarSoporte: boolean; entiendeLimitesGarantia: boolean;
  entiendeDanosExternos: boolean;
  calificacion: number; nps: string; solicitaSeguimiento: boolean;
  comentarios: string; nombreFirmaCliente: string;
}

export interface WorkOrderCanalizacionConduit {
  limpiezaAreas: boolean; retiroResiduos: boolean; tuberiaFirme: boolean;
  tuberiaCorrctamenteFijada: boolean; alineacionEstetica: boolean;
  metrosTuberia: number; cantidadRegistros: number; cantidadCurvas: number;
  cantidadCajasCondulet: number; cantidadAbrazaderas: number; cantidadLicuatite: number;
  materialesAdicionales: string; detalleTrabajoRealizado: string; firmaTecnico: string;
}

export interface WorkOrderCctvServicio {
  limpiezaAreas: boolean; revisionConexiones: boolean; grabadorLimpio: boolean;
  cableadoIdentificado: boolean; alimentacionVerificada: boolean;
  comunicacionVerificada: boolean; pruebasVisualizacion: boolean;
  estadoSistemaDocumentado: boolean;
  camarasConVideo: number; camarasMantenimiento: number;
  camarasReemplazadas: number; camarasSinVideo: number;
  capacidadAlmacenamiento: string; materialesAdicionales: string;
  refaccionesUtilizadas: string;
  nSerieGrabador: string; contrasenaGrabador: string; contrasenaHikConnect: string;
  correoAsociado: string; otrosDatosCredenciales: string; firmaSupervisor: string;
  detalleCliente: string; trabajosRealizados: string;
  camarasVisualizando: boolean; grabacionConfigurada: boolean;
  grabacionesVerificadas: boolean; reproduccionVerificada: boolean;
  fechaHoraVerificada: boolean; discoVerificado: boolean;
  videoMonitorCliente: boolean; accesoRemotoVerificado: boolean;
  notificacionesVerificadas: boolean; microfonoLuzBlanca: boolean;
  analiticosVerificados: boolean; upsVerificado: boolean; switchesPoEVerificados: boolean;
  diagnosticoConfiguracion: boolean; diagnosticoFuentePoder: boolean;
  diagnosticoCamara: boolean; diagnosticoCableado: boolean;
  diagnosticoConectores: boolean; diagnosticoDiscoDuro: boolean;
  diagnosticoRed: boolean; diagnosticoInternet: boolean;
  diagnosticoElectrico: boolean; diagnosticoSinFalla: boolean; diagnosticoOtro: string;
  internetBajada: string; internetSubida: string;
  tiempoGrabacion: string; ubicacionGrabador: string; recomendaciones: string;
  accionSustitucionCamaras: boolean; accionSustitucionDisco: boolean;
  accionSustitucionUPS: boolean; accionSustitucionFuente: boolean;
  accionMejoraAlmacenamiento: boolean; accionMantenimiento: boolean;
  accionPolizaServicio: boolean; accionOtra: string;
  demostracionRealizada: boolean; visualizacionGrabaciones: boolean;
  explicacionFallas: boolean; canalizacionProfesional: boolean;
  accesoHikConnect: boolean; explicacionCondiciones: boolean;
  personalProfesional: boolean; sabesolicitarSoporte: boolean;
  entiendeEquiposExistentes: boolean; entiendeLimitesGarantia: boolean;
  calificacion: number; nps: string; solicitaSeguimiento: boolean;
  comentarios: string; nombreFirmaCliente: string;
}
export interface WorkOrder {
  id?: string;
  tareaId: string; folioTarea: string; tipo: WorkOrderType;
  tecnicoId: string; tecnicoNombre: string; cliente: string;
  fecha: string; creadoEn: Date; actualizadoEn: Date; completado: boolean;
  firmaCliente?: string;
  datosCCTV?: WorkOrderCCTV;
  datosAlarma?: WorkOrderAlarma;
  datosAlarmaMarket?: WorkOrderAlarmaMercadoSJ;
  datosGeneral?: WorkOrderGeneral;
  datosSoftInstalacion?: WorkOrderSoftRestaurantInstalacion;
  datosSoftServicio?: WorkOrderSoftRestaurantServicio;
  datosReparacionGeneral?: WorkOrderServicioReparacionGeneral;
  datosLabDiagnostico?: WorkOrderLabDiagnostico;
  datosReciboEquipo?: WorkOrderReciboEquipo;
  datosPosInstalacion?: WorkOrderPosPerifericosInstalacion;
  datosCanalizacion?: WorkOrderCanalizacionConduit;
  datosCctvServicio?: WorkOrderCctvServicio;
}