import { Component, Input, OnInit } from '@angular/core';
import { firestoreDB } from '../../firebase-init';
import { sUsuariosPerfiles } from '../../services/sUsuariosPerfiles.service';
import { INDICADORES_HH, getHhIndice } from './estadisticas-hh.component';

const COLECCION = 'estadisticasHH';

interface RegistroHh {
  idSubProyecto: any;
  nombreSubProyecto: string;
  anio: number;
  meses: any;
}

interface FilaSubproyectoHh {
  clave: string;
  nombre: string;
  hh: number;
  horasExtra: number;
  hhIndice: number;
  capacitaciones: number;
  incidentes: number;
  accidentesBaja: number;
  diasPerdidos: number;
}

@Component({
  selector: 'app-consolidado-hh',
  templateUrl: './consolidado-hh.component.html',
  styleUrls: ['./consolidado-hh.component.css']
})
export class ConsolidadoHhComponent implements OnInit {

  /** Dentro del Consolidado SSO, MA y HH: sin menú ni título propios. */
  @Input() embebido: boolean = false;

  readonly meses = [
    { numero: 1, nombre: 'Ene' }, { numero: 2, nombre: 'Feb' }, { numero: 3, nombre: 'Mar' },
    { numero: 4, nombre: 'Abr' }, { numero: 5, nombre: 'May' }, { numero: 6, nombre: 'Jun' },
    { numero: 7, nombre: 'Jul' }, { numero: 8, nombre: 'Ago' }, { numero: 9, nombre: 'Sep' },
    { numero: 10, nombre: 'Oct' }, { numero: 11, nombre: 'Nov' }, { numero: 12, nombre: 'Dic' }
  ];

  anios: number[] = [];
  anio: number = new Date().getFullYear();
  cargando: boolean = true;
  errorCarga: boolean = false;
  sinPermiso: boolean = false;
  totales: any = this.totalesVacios();
  graficoMensualHh: any[] = [];
  graficoMensualCapacitaciones: any[] = [];
  principalesSubproyectos: FilaSubproyectoHh[] = [];
  tablaSubproyectos: FilaSubproyectoHh[] = [];

  private registros: RegistroHh[] = [];
  private idUsuario: number = null;

  constructor(private _sUsuariosPerfiles: sUsuariosPerfiles) {}

  ngOnInit() {
    try {
      const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
      this.idUsuario = usuario.idUsuario ? Number(usuario.idUsuario) : null;
    } catch (error) {
      this.idUsuario = null;
    }

    if (!this.idUsuario || isNaN(this.idUsuario)) {
      this.sinPermiso = true;
      this.cargando = false;
      return;
    }

    this._sUsuariosPerfiles.getUsuariosPerfilesbyidUsuario(this.idUsuario).subscribe(
      (perfiles: any) => {
        const esCliente = Array.isArray(perfiles) && perfiles.some((perfil: any) =>
          perfil.idPerfil == 5 || perfil.idPerfil === 'Clientes'
        );
        if (esCliente) {
          this.sinPermiso = true;
          this.cargando = false;
          return;
        }
        this.cargar();
      },
      (error: any) => {
        console.error('Error al verificar acceso al consolidado HH:', error);
        this.errorCarga = true;
        this.cargando = false;
      }
    );
  }

  cargar() {
    this.cargando = true;
    this.errorCarga = false;
    firestoreDB.collection(COLECCION).get()
      .then((snapshot: any) => {
        const registros: RegistroHh[] = [];
        snapshot.forEach((doc: any) => {
          const data = doc.data();
          const anio = Number(data.anio);
          if (!isNaN(anio) && data.meses && typeof data.meses === 'object') {
            registros.push({
              idSubProyecto: data.idSubProyecto,
              nombreSubProyecto: data.nombreSubProyecto || '',
              anio: anio,
              meses: data.meses
            });
          }
        });
        this.registros = registros;
        this.prepararAnios();
        this.recalcular();
        this.cargando = false;
      })
      .catch((error: any) => {
        console.error('Error al cargar el consolidado HH:', error);
        this.errorCarga = true;
        this.cargando = false;
      });
  }

  private prepararAnios() {
    this.anios = this.registros.map(registro => registro.anio)
      .filter((anio, indice, lista) => lista.indexOf(anio) === indice)
      .sort((a, b) => b - a);
    if (this.anios.length && this.anios.indexOf(this.anio) === -1) {
      this.anio = this.anios[0];
    }
  }

  recalcular() {
    const registrosAnio = this.registros.filter(registro => registro.anio === Number(this.anio));
    const porSubproyecto: { [clave: string]: FilaSubproyectoHh } = {};
    const porMesHh: number[] = this.meses.map(() => 0);
    const porMesCapacitaciones: number[] = this.meses.map(() => 0);

    registrosAnio.forEach(registro => {
      const clave = registro.idSubProyecto === null || registro.idSubProyecto === undefined
        ? registro.nombreSubProyecto || 'sin-id'
        : String(registro.idSubProyecto);
      if (!porSubproyecto[clave]) {
        porSubproyecto[clave] = {
          clave: clave,
          nombre: registro.nombreSubProyecto || 'Subproyecto ' + clave,
          hh: 0,
          horasExtra: 0,
          hhIndice: 0,
          capacitaciones: 0,
          incidentes: 0,
          accidentesBaja: 0,
          diasPerdidos: 0
        };
      }

      this.meses.forEach((mes, indice) => {
        const datosMes = registro.meses[mes.numero] || registro.meses[String(mes.numero)] || {};
        const hh = this.numero(datosMes.hh);
        const capacitaciones = INDICADORES_HH.filter(indicador => indicador.capacitacion)
          .reduce((suma, indicador) => suma + this.numero(datosMes[indicador.campo]), 0);
        const incidentes = this.numero(datosMes.incidentes);
        const accidentesBaja = this.numero(datosMes.accidentesBaja);
        const diasPerdidos = this.numero(datosMes.diasPerdidos);

        porMesHh[indice] += hh;
        porMesCapacitaciones[indice] += capacitaciones;

        const fila = porSubproyecto[clave];
        fila.hh += hh;
        fila.horasExtra += this.numero(datosMes.horasExtra);
        fila.hhIndice += getHhIndice(datosMes);
        fila.capacitaciones += capacitaciones;
        fila.incidentes += incidentes;
        fila.accidentesBaja += accidentesBaja;
        fila.diasPerdidos += diasPerdidos;
      });
    });

    this.tablaSubproyectos = Object.keys(porSubproyecto).map(clave => porSubproyecto[clave])
      .sort((a, b) => b.hh - a.hh || a.nombre.localeCompare(b.nombre));
    this.principalesSubproyectos = this.tablaSubproyectos.slice(0, 10);
    this.totales = this.tablaSubproyectos.reduce((totales, fila) => {
      totales.hh += fila.hh;
      totales.horasExtra += fila.horasExtra;
      totales.hhIndice += fila.hhIndice;
      totales.capacitaciones += fila.capacitaciones;
      totales.incidentes += fila.incidentes;
      totales.accidentesBaja += fila.accidentesBaja;
      totales.diasPerdidos += fila.diasPerdidos;
      return totales;
    }, this.totalesVacios());
    this.totales.subproyectos = this.tablaSubproyectos.length;
    this.totales.if = this.totales.hhIndice ? this.totales.accidentesBaja * 1000000 / this.totales.hhIndice : null;
    this.totales.is = this.totales.hhIndice ? this.totales.diasPerdidos * 1000 / this.totales.hhIndice : null;
    this.graficoMensualHh = this.prepararBarras(porMesHh);
    this.graficoMensualCapacitaciones = this.prepararBarras(porMesCapacitaciones);
  }

  private prepararBarras(valores: number[]): any[] {
    const maximo = Math.max.apply(null, valores.concat([0]));
    return this.meses.map((mes, indice) => ({
      etiqueta: mes.nombre,
      valor: valores[indice],
      alto: maximo ? valores[indice] * 100 / maximo : 0
    }));
  }

  get anchoMaximoSubproyecto(): number {
    const maximo = this.principalesSubproyectos.reduce((mayor, fila) => Math.max(mayor, fila.hh), 0);
    return maximo;
  }

  anchoBarraSubproyecto(hh: number): number {
    return this.anchoMaximoSubproyecto ? hh * 100 / this.anchoMaximoSubproyecto : 0;
  }

  formatear(valor: number): string {
    if (valor === null || valor === undefined || isNaN(valor)) { return '-'; }
    const partes = String(Math.round(valor * 100) / 100).split('.');
    return partes[0].replace(/\B(?=(\d{3})+$)/g, '.') + (partes[1] ? ',' + partes[1] : '');
  }

  private numero(valor: any): number {
    if (valor === null || valor === undefined || valor === '') { return 0; }
    const numero = Number(valor);
    return isNaN(numero) || !isFinite(numero) ? 0 : numero;
  }

  private totalesVacios(): any {
    return {
      hh: 0,
      horasExtra: 0,
      hhIndice: 0,
      capacitaciones: 0,
      subproyectos: 0,
      incidentes: 0,
      accidentesBaja: 0,
      diasPerdidos: 0,
      if: null,
      is: null
    };
  }
}