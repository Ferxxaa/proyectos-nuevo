import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { firestoreDB } from '../../firebase-init';
import { sUsuariosPerfiles } from '../../services/sUsuariosPerfiles.service';
import { ACCIDENTES_HISTORICOS, AccidenteHistorico } from './accidentes-historicos';

declare var Swal: any;

/**
 * Seguimiento de accidentes por subproyecto.
 * Firestore: un documento por accidente en 'accidentesSSO', con idSubProyecto para los consolidados.
 */
const COLECCION = 'accidentesSSO';
const PRIMER_ANIO_SISTEMA = 2026; // Hasta 2025 manda el registro histórico

const MEDIDAS_MENOR = 'Charlas de 5 minutos, uso de EPP, señalización. Reinducción, cumplimiento programa prevención de riesgos, control de los riesgos.';
const MEDIDAS_INTERMEDIO = 'Charlas de 5 minutos, reinducción, aplicación de procedimientos de trabajo seguro, uso de EPP, inspección de equipos y herramientas, capacitación con el autocuidado, capacitación a línea de mando sobre riesgos asociados, revisar protocolos y procedimientos de ejecución.';
const MEDIDAS_GRAVE = 'Charlas de 5 minutos, evaluación del riesgo antes de iniciar la faena, aplicación de procedimientos de trabajo seguro, supervisión directa, uso de EPP, aplicación de protocolos de seguridad, inspección de equipos y herramientas, capacitación del personal, revisión matriz de riesgos.';

export interface AccidenteSSO {
  id?: string;
  fecha: string;
  tipo: string;
  grado: number;
  diasPerdidos: number;
  descripcion: string;
  medidasControl: string;
  estado: string;
}

@Component({
  selector: 'app-estadisticas-sso',
  templateUrl: './estadisticas-sso.component.html',
  styleUrls: ['./estadisticas-sso.component.css']
})
export class EstadisticasSsoComponent implements OnInit {

  @Input() idSubProyecto: any = null;
  @Input() idProyecto: any = null;
  @Input() nombreSubProyecto: string = '';
  @Input() soloLectura: boolean = false;
  consolidadoHistorico: boolean = false;

  readonly tipos = [
    { nombre: 'Incidente menor', clase: 'tipo-incidente' },
    { nombre: 'Acc. de Trabajo SDP', clase: 'tipo-trabajo-sdp' },
    { nombre: 'Acc. de Trabajo CDP', clase: 'tipo-trabajo-cdp' },
    { nombre: 'Acc. de Trayecto SDP', clase: 'tipo-trayecto-sdp' },
    { nombre: 'Acc. de Trayecto CDP', clase: 'tipo-trayecto-cdp' },
    { nombre: 'Enfermedad Común', clase: 'tipo-enf-comun' },
    { nombre: 'Enfermedad Prof.', clase: 'tipo-enf-prof' }
  ];

  readonly grados = [
    { numero: 1, clasificacion: 'Grado Menor', medidas: MEDIDAS_MENOR },
    { numero: 2, clasificacion: 'Grado Menor', medidas: MEDIDAS_MENOR },
    { numero: 3, clasificacion: 'Grado Intermedio', medidas: MEDIDAS_INTERMEDIO },
    { numero: 4, clasificacion: 'Grado Intermedio', medidas: MEDIDAS_INTERMEDIO },
    { numero: 5, clasificacion: 'Grave', medidas: MEDIDAS_GRAVE },
    { numero: 6, clasificacion: 'Grave', medidas: MEDIDAS_GRAVE }
  ];

  readonly hoy: string = this.getFechaHoy();

  accidentes: AccidenteSSO[] = [];
  cargando: boolean = true;
  errorCarga: boolean = false;
  guardando: boolean = false;
  formularioAbierto: boolean = false;
  editandoId: string | null = null;
  errorFormulario: string = '';
  formulario: AccidenteSSO = this.getFormularioVacio();

  sinPermisoConsolidado: boolean = false;
  historicoAnio: string = 'todos';
  historicoBusqueda: string = '';
  historicoAnios: string[] = [];
  historicoFilas: AccidenteHistorico[] = [];
  historicoResumen: any = { total: 0, diasPerdidos: 0, graves: 0, conDias: 0 };
  historicoEstadisticas: any = this.calcularEstadisticas([], []);
  errorHistoricoSistema: boolean = false;

  private idUsuario: any = null;
  private accidentesSistema: AccidenteHistorico[] = [];

  constructor(
    private route: ActivatedRoute,
    private _sUsuariosPerfiles: sUsuariosPerfiles
  ) {}

  ngOnInit() {
    this.consolidadoHistorico = this.route.snapshot.data['consolidadoSSO'] === true;
    try {
      this.idUsuario = JSON.parse(localStorage.getItem('usuario') || '{}').idUsuario || null;
    } catch (error) {
      this.idUsuario = null;
    }

    if (this.consolidadoHistorico) {
      this.cargarConsolidadoSso();
      return;
    }

    this.cargar();
  }

  cargar() {
    this.cargando = true;
    this.errorCarga = false;

    if (!this.idSubProyecto) {
      this.cargando = false;
      this.errorCarga = true;
      return;
    }

    firestoreDB.collection(COLECCION).where('idSubProyecto', '==', this.idSubProyecto).get()
      .then((snapshot: any) => {
        const accidentes: AccidenteSSO[] = [];
        snapshot.forEach((doc: any) => accidentes.push({ ...doc.data(), id: doc.id }));
        this.accidentes = accidentes;
        this.recalcular();
        this.cargando = false;
      })
      .catch((error: any) => {
        console.error('Error al cargar los accidentes:', error);
        this.cargando = false;
        this.errorCarga = true;
      });
  }

  private recalcular() {
    this.accidentes.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
  }

  private calcularEstadisticas(registros: { anio: string, grado: number }[], anios: string[]) {
    const tablaGrados = [1, 2, 3, 4, 5, 6].map(numero => {
      const cantidades = anios.map(anio => registros.filter(item => item.grado === numero && item.anio === anio).length);
      return {
        numero: numero,
        cantidades: cantidades,
        total: cantidades.reduce((suma, cantidad) => suma + cantidad, 0)
      };
    });

    const maximo = tablaGrados.reduce((mayor, fila) => fila.cantidades.reduce((alto, cantidad) => Math.max(alto, cantidad), mayor), 1);

    return {
      anios: anios,
      tablaGrados: tablaGrados,
      total: registros.length,
      totalesAnio: anios.map((anio, indice) => tablaGrados.reduce((suma, fila) => suma + fila.cantidades[indice], 0)),
      grafico: anios.map((anio, indice) => ({
        anio: anio,
        barras: tablaGrados.map(fila => ({
          numero: fila.numero,
          cantidad: fila.cantidades[indice],
          alto: fila.cantidades[indice] * 100 / maximo
        }))
      }))
    };
  }

  get verHistorico(): boolean {
    return this.consolidadoHistorico;
  }

  cargarConsolidadoSso() {
    this.cargando = true;
    this.errorCarga = false;
    this.sinPermisoConsolidado = false;

    if (!this.idUsuario) {
      this.cargando = false;
      this.sinPermisoConsolidado = true;
      return;
    }

    this._sUsuariosPerfiles.getUsuariosPerfilesbyidUsuario(Number(this.idUsuario)).subscribe(
      (perfiles: any) => {
        const esCliente = Array.isArray(perfiles) && perfiles.some((perfil: any) =>
          perfil.idPerfil == 5 || perfil.idPerfil === 'Clientes'
        );
        if (esCliente) {
          this.sinPermisoConsolidado = true;
          this.cargando = false;
          return;
        }

        this.cargarAccidentesSistema().then(() => {
          this.prepararHistorico();
          this.cargando = false;
        });
      },
      (error: any) => {
        console.error('Error al verificar acceso al consolidado SSO:', error);
        this.errorCarga = true;
        this.cargando = false;
      }
    );
  }

  /** Desde 2026 los datos salen solos de lo registrado en todos los subproyectos. */
  private cargarAccidentesSistema(): Promise<void> {
    return firestoreDB.collection(COLECCION).get()
      .then((snapshot: any) => {
        const registros: AccidenteHistorico[] = [];
        snapshot.forEach((doc: any) => {
          const data = doc.data();
          const anio = Number((data.fecha || '').substring(0, 4));
          if (anio >= PRIMER_ANIO_SISTEMA) {
            registros.push({
              numero: 0,
              fecha: data.fecha,
              anio: anio,
              lugar: '',
              comuna: '',
              obra: data.nombreSubProyecto || '',
              empresa: '',
              tipo: this.getTipoHistorico(data.tipo),
              resolucion: '',
              grado: Number(data.grado),
              diasPerdidos: Number(data.diasPerdidos) || 0,
              descripcion: data.descripcion || '',
              medidas: data.medidasControl || '',
              organismo: ''
            });
          }
        });
        this.accidentesSistema = registros;
        this.errorHistoricoSistema = false;
      })
      .catch((error: any) => {
        console.error('Error al cargar los accidentes del sistema:', error);
        this.errorHistoricoSistema = true;
      });
  }

  private getTipoHistorico(tipo: string): string {
    const texto = tipo || '';
    if (texto.indexOf('Trabajo') !== -1) { return 'Trabajo'; }
    if (texto.indexOf('Trayecto') !== -1) { return 'Trayecto'; }
    if (texto.indexOf('Incidente') !== -1) { return 'Incidente'; }
    if (texto.indexOf('Prof') !== -1) { return 'Enf. Profesional'; }
    return 'Común';
  }

  private get registrosHistorico(): AccidenteHistorico[] {
    return ACCIDENTES_HISTORICOS.concat(this.accidentesSistema);
  }

  private prepararHistorico() {
    const primero = this.registrosHistorico.reduce((menor, item) => Math.min(menor, item.anio), Number(this.hoy.substring(0, 4)));
    const anios: string[] = [];
    for (let anio = primero; anio <= Number(this.hoy.substring(0, 4)); anio++) {
      anios.push(String(anio));
    }

    this.historicoAnios = anios.slice().reverse();
    this.historicoEstadisticas = this.calcularEstadisticas(
      this.registrosHistorico.map(item => ({ anio: String(item.anio), grado: item.grado })),
      anios
    );
    this.recalcularHistorico();
  }

  recalcularHistorico() {
    const busqueda = this.normalizarTexto(this.historicoBusqueda);

    const filas = this.registrosHistorico.filter(item => {
      if (this.historicoAnio !== 'todos' && String(item.anio) !== this.historicoAnio) { return false; }
      if (!busqueda) { return true; }
      return this.normalizarTexto([item.obra, item.lugar, item.comuna, item.empresa, item.descripcion].join(' ')).indexOf(busqueda) !== -1;
    });

    this.historicoFilas = filas.slice().sort((a, b) =>
      b.anio - a.anio || (b.fecha || '').localeCompare(a.fecha || ''));

    this.historicoResumen = {
      total: filas.length,
      diasPerdidos: filas.reduce((suma, item) => suma + (item.diasPerdidos || 0), 0),
      graves: filas.filter(item => item.grado >= 5).length,
      conDias: filas.filter(item => (item.diasPerdidos || 0) > 0).length
    };
  }

  private normalizarTexto(texto: string): string {
    return (texto || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  }

  getClaseTipoHistorico(tipo: string): string {
    switch (tipo) {
      case 'Trabajo': return 'tipo-trabajo-cdp';
      case 'Trayecto': return 'tipo-trayecto-sdp';
      case 'Incidente': return 'tipo-incidente';
      case 'Común': return 'tipo-enf-comun';
      case 'Enf. Profesional': return 'tipo-enf-prof';
      default: return '';
    }
  }

  // Del texto local: toISOString() en la noche de Chile daría el día siguiente
  private getFechaHoy(): string {
    const fecha = new Date();
    const mes = ('0' + (fecha.getMonth() + 1)).slice(-2);
    const dia = ('0' + fecha.getDate()).slice(-2);
    return fecha.getFullYear() + '-' + mes + '-' + dia;
  }

  private getFormularioVacio(): AccidenteSSO {
    return { fecha: '', tipo: '', grado: null, diasPerdidos: 0, descripcion: '', medidasControl: '', estado: 'Abierto' };
  }

  abrirNuevo() {
    this.formulario = this.getFormularioVacio();
    this.editandoId = null;
    this.errorFormulario = '';
    this.formularioAbierto = true;
  }

  editar(item: AccidenteSSO) {
    if (this.soloLectura) { return; }
    this.formulario = { ...item };
    this.editandoId = item.id;
    this.errorFormulario = '';
    this.formularioAbierto = true;
  }

  cerrarFormulario() {
    this.formularioAbierto = false;
    this.editandoId = null;
  }

  /** Propone las medidas del grado, sin pisar lo que ya se escribió. */
  cambiarGrado(numero: number) {
    const medidasAnteriores = this.getMedidasGrado(this.formulario.grado);
    if (!this.formulario.medidasControl || this.formulario.medidasControl === medidasAnteriores) {
      this.formulario.medidasControl = this.getMedidasGrado(numero);
    }
    this.formulario.grado = numero;
  }

  private getMedidasGrado(numero: number): string {
    const grado = this.grados.filter(item => item.numero === Number(numero))[0];
    return grado ? grado.medidas : '';
  }

  private validarFormulario(): string {
    const datos = this.formulario;
    if (!datos.fecha) { return 'Falta la fecha.'; }
    if (datos.fecha > this.hoy) { return 'La fecha no puede ser futura.'; }
    if (!datos.tipo) { return 'Falta el tipo.'; }
    if (!datos.grado) { return 'Falta el grado.'; }
    if (!(Number(datos.diasPerdidos) >= 0)) { return 'Los días perdidos no pueden ser negativos.'; }
    if (!(datos.descripcion || '').trim()) { return 'Falta la descripción.'; }
    return '';
  }

  guardar() {
    if (this.soloLectura || this.guardando) { return; }

    this.errorFormulario = this.validarFormulario();
    if (this.errorFormulario) { return; }

    const datos = this.formulario;
    const payload = {
      idSubProyecto: this.idSubProyecto,
      idProyecto: this.idProyecto === undefined ? null : this.idProyecto,
      nombreSubProyecto: this.nombreSubProyecto || '',
      fecha: datos.fecha,
      anio: Number(datos.fecha.substring(0, 4)),
      tipo: datos.tipo,
      grado: Number(datos.grado),
      diasPerdidos: Math.round(Number(datos.diasPerdidos) || 0),
      descripcion: datos.descripcion.trim(),
      medidasControl: (datos.medidasControl || '').trim(),
      estado: datos.estado,
      idUsuarioActualizacion: this.idUsuario,
      fechaActualizacion: new Date().toISOString()
    };

    const coleccion = firestoreDB.collection(COLECCION);
    const idEditado = this.editandoId;
    const guardado = idEditado
      ? coleccion.doc(idEditado).update(payload).then(() => idEditado)
      : coleccion.add(payload).then((doc: any) => doc.id);

    this.guardando = true;
    guardado
      .then((id: string) => {
        const registro: any = { ...payload, id: id };
        this.accidentes = this.accidentes.filter(item => item.id !== id).concat(registro);
        this.recalcular();
        this.guardando = false;
        this.cerrarFormulario();
      })
      .catch((error: any) => {
        console.error('Error al guardar el accidente:', error);
        this.guardando = false;
        this.errorFormulario = 'No se pudo guardar. Inténtalo de nuevo.';
      });
  }

  eliminar(item: AccidenteSSO) {
    if (this.soloLectura) { return; }

    Swal.fire({
      title: '¿Eliminar este registro?',
      text: 'Se borrará el accidente del ' + this.getFechaTexto(item.fecha) + '. No se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar'
    }).then((resultado: any) => {
      if (!resultado || !(resultado.value || resultado.isConfirmed)) { return; }

      firestoreDB.collection(COLECCION).doc(item.id).delete()
        .then(() => {
          this.accidentes = this.accidentes.filter(accidente => accidente.id !== item.id);
          if (this.editandoId === item.id) { this.cerrarFormulario(); }
          this.recalcular();
        })
        .catch((error: any) => {
          console.error('Error al eliminar el accidente:', error);
          Swal.fire('Error', 'No se pudo eliminar el registro.', 'error');
        });
    });
  }

  getFechaTexto(fecha: string): string {
    const partes = (fecha || '').split('-');
    return partes.length === 3 ? partes[2] + '-' + partes[1] + '-' + partes[0] : '-';
  }

  getClaseTipo(nombre: string): string {
    const tipo = this.tipos.filter(item => item.nombre === nombre)[0];
    return tipo ? tipo.clase : '';
  }

  getClasificacion(numero: number): string {
    const grado = this.grados.filter(item => item.numero === Number(numero))[0];
    return grado ? grado.clasificacion : '-';
  }

  trackAccidente(index: number, item: AccidenteSSO) {
    return item.id;
  }
}