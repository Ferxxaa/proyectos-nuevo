import { ProgramaMes } from './programa-sso.service';
import {
  registrosDe, RegistroDia, redondear, textoEntidad, CONSUMOS_MA,
  hhRegistroMin, formatoHM, minutosAHoras, textoCategoriaHH
} from './programa-registro';

/**
 * Exporta el programa del mes a Excel (.xlsx real) con colores, sin librerías externas.
 * Hojas: Programa · Registro HH · Adjuntos.
 */

export interface DatosExcelPrograma {
  tipo: string;            // 'SSO' | 'MA'
  subproyecto: string;
  mesNombre: string;
  anio: number;
  mes: number;
  programa: ProgramaMes;
  dias: any[];             // DiaInfo[] del componente
  grupos: any[];           // GrupoVista[] del componente (ya calculado)
  textoEstado: string;
  etiquetaFrecuencia: (a: any) => string;
  totalProg: number;
  totalCtrl: number;
  pctTotal: number;
}

// =====================================================================
// Estilos
// =====================================================================

interface DefEstilo {
  fill?: string; color?: string; bold?: boolean; size?: number; underline?: boolean;
  align?: string; wrap?: boolean; pct?: boolean; borde?: boolean;
}

const ESTILOS: { [nombre: string]: DefEstilo } = {
  normal: {},
  titulo: { size: 15, bold: true, color: '24404F' },
  meta: { color: '59636E' },
  metaB: { color: '24404F', bold: true },
  head: { fill: '075F91', color: 'FFFFFF', bold: true, align: 'center', wrap: true, borde: true },
  headRojo: { fill: 'D07070', color: 'FFFFFF', bold: true, align: 'center', borde: true },
  grupo: { fill: 'DCEAF8', color: '064F78', bold: true, borde: true },
  grupoNum: { fill: 'DCEAF8', color: '064F78', bold: true, align: 'center', borde: true },
  grupoPct: { fill: 'DCEAF8', color: '064F78', bold: true, align: 'center', borde: true, pct: true },
  seccion: { fill: 'F5F8FB', color: '2D5D8F', bold: true, borde: true },
  seccionNum: { fill: 'F5F8FB', color: '2D5D8F', bold: true, align: 'center', borde: true },
  seccionPct: { fill: 'F5F8FB', color: '2D5D8F', bold: true, align: 'center', borde: true, pct: true },
  act: { borde: true },
  centro: { borde: true, align: 'center' },
  pct: { borde: true, align: 'center', pct: true },
  vacio: { borde: true },
  rojo: { fill: 'F6D4D4', borde: true },
  prog: { fill: 'CFE0F5', color: '2D5D8F', bold: true, align: 'center', borde: true },
  nec: { fill: 'DCEFD3', color: '3C7031', bold: true, align: 'center', borde: true },
  hecho: { fill: '3B7FC4', color: 'FFFFFF', bold: true, align: 'center', borde: true },
  parcial: { fill: 'F3CD6B', color: '6B4E07', bold: true, align: 'center', borde: true },
  medio: { fill: 'F0975A', color: 'FFFFFF', bold: true, align: 'center', borde: true },
  nohecho: { fill: 'E2706B', color: 'FFFFFF', bold: true, align: 'center', borde: true },
  total: { fill: '24404F', color: 'FFFFFF', bold: true, borde: true },
  totalNum: { fill: '24404F', color: 'FFFFFF', bold: true, align: 'center', borde: true },
  totalPct: { fill: '24404F', color: 'FFFFFF', bold: true, align: 'center', borde: true, pct: true },
  link: { color: '075F91', underline: true, borde: true },
  textoWrap: { borde: true, wrap: true },
  pctOk: { fill: 'DFF2E1', color: '2D6E36', bold: true, align: 'center', borde: true, pct: true },
  pctMedio: { fill: 'FCF1D3', color: '8A6514', bold: true, align: 'center', borde: true, pct: true },
  pctBajo: { fill: 'FAE3E2', color: 'A33A3A', bold: true, align: 'center', borde: true, pct: true },
  pctPend: { fill: 'FFF3C4', color: '8A6514', bold: true, align: 'center', borde: true, pct: true },
  headSSO: { fill: '075F91', color: 'FFFFFF', bold: true, align: 'center', borde: true },
  headMA: { fill: '3F9A52', color: 'FFFFFF', bold: true, align: 'center', borde: true },
  pieSSO: { fill: '075F91', color: 'FFFFFF', bold: true, align: 'center', borde: true, pct: true },
  pieMA: { fill: '3F9A52', color: 'FFFFFF', bold: true, align: 'center', borde: true, pct: true },
  aviso: { fill: 'FFF3C4', color: '8A6514', bold: true }
};

const NOMBRES_ESTILO = Object.keys(ESTILOS);  // 'normal' queda en el índice 0

function indiceEstilo(nombre: string): number {
  const i = NOMBRES_ESTILO.indexOf(nombre);
  return i < 0 ? 0 : i;
}

function stylesXml(): string {
  const fuentes: string[] = [];
  const rellenos: string[] = [
    '<fill><patternFill patternType="none"/></fill>',
    '<fill><patternFill patternType="gray125"/></fill>'
  ];
  const bordes: string[] = [
    '<border><left/><right/><top/><bottom/><diagonal/></border>',
    '<border>' + ['left', 'right', 'top', 'bottom'].map(l =>
      '<' + l + ' style="thin"><color rgb="FFD5DCE3"/></' + l + '>').join('') + '<diagonal/></border>'
  ];
  const xfs: string[] = [];

  NOMBRES_ESTILO.forEach(nombre => {
    const e = ESTILOS[nombre];
    const fuente = '<font>' + (e.bold ? '<b/>' : '') + (e.underline ? '<u/>' : '') +
      '<sz val="' + (e.size || 10) + '"/><color rgb="FF' + (e.color || '2F363D') + '"/><name val="Calibri"/><family val="2"/></font>';
    let idFuente = fuentes.indexOf(fuente);
    if (idFuente < 0) { fuentes.push(fuente); idFuente = fuentes.length - 1; }

    let idRelleno = 0;
    if (e.fill) {
      const relleno = '<fill><patternFill patternType="solid"><fgColor rgb="FF' + e.fill + '"/><bgColor indexed="64"/></patternFill></fill>';
      idRelleno = rellenos.indexOf(relleno);
      if (idRelleno < 0) { rellenos.push(relleno); idRelleno = rellenos.length - 1; }
    }

    xfs.push('<xf numFmtId="' + (e.pct ? 9 : 0) + '" fontId="' + idFuente + '" fillId="' + idRelleno +
      '" borderId="' + (e.borde ? 1 : 0) + '" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">' +
      '<alignment horizontal="' + (e.align || 'left') + '" vertical="center"' + (e.wrap ? ' wrapText="1"' : '') + '/></xf>');
  });

  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<fonts count="' + fuentes.length + '">' + fuentes.join('') + '</fonts>' +
    '<fills count="' + rellenos.length + '">' + rellenos.join('') + '</fills>' +
    '<borders count="' + bordes.length + '">' + bordes.join('') + '</borders>' +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    '<cellXfs count="' + xfs.length + '">' + xfs.join('') + '</cellXfs>' +
    '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
    '</styleSheet>';
}

// =====================================================================
// Hojas
// =====================================================================

function esc(v: any): string {
  return String(v === null || v === undefined ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
}

function letraColumna(n: number): string {
  let s = '';
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function ref(fila: number, col: number): string {
  return letraColumna(col) + fila;
}

interface Celda { col: number; v: any; s: string; }
interface OpcCelda { merge?: number; down?: number; link?: string; }

class Hoja {
  private filas: { alto: number; celdas: Celda[] }[] = [];
  private cubiertas: { [ref: string]: { fila: number; col: number; s: string } } = {};
  private merges: string[] = [];
  links: { ref: string; url: string }[] = [];

  constructor(public nombre: string, private anchos: number[], private freeze?: { filas: number; cols: number }) {}

  /** Agrega una fila y devuelve su número (1, 2, 3...). */
  fila(alto?: number): number {
    this.filas.push({ alto: alto || 0, celdas: [] });
    return this.filas.length;
  }

  set(fila: number, col: number, v: any, s: string, o: OpcCelda = {}) {
    this.filas[fila - 1].celdas.push({ col: col, v: v, s: s });
    const ancho = o.merge || 0;
    const alto = o.down || 0;
    if (ancho || alto) {
      this.merges.push(ref(fila, col) + ':' + ref(fila + alto, col + ancho));
      for (let f = fila; f <= fila + alto; f++) {
        for (let c = col; c <= col + ancho; c++) {
          if (f !== fila || c !== col) { this.cubiertas[ref(f, c)] = { fila: f, col: c, s: s }; }
        }
      }
    }
    if (o.link) { this.links.push({ ref: ref(fila, col), url: o.link }); }
  }

  xml(): string {
    // celdas cubiertas por combinaciones: se escriben vacías con el mismo estilo (bordes y color parejos)
    const porFila: { [f: number]: Celda[] } = {};
    this.filas.forEach((f, i) => porFila[i + 1] = f.celdas.slice());
    Object.keys(this.cubiertas).forEach(k => {
      const c = this.cubiertas[k];
      if (!porFila[c.fila]) { porFila[c.fila] = []; }
      if (!porFila[c.fila].some(x => x.col === c.col)) { porFila[c.fila].push({ col: c.col, v: null, s: c.s }); }
    });

    let filasXml = '';
    const total = Math.max(this.filas.length, ...Object.keys(porFila).map(Number));
    for (let f = 1; f <= total; f++) {
      const celdas = (porFila[f] || []).sort((a, b) => a.col - b.col);
      const alto = this.filas[f - 1] ? this.filas[f - 1].alto : 0;
      filasXml += '<row r="' + f + '"' + (alto ? ' ht="' + alto + '" customHeight="1"' : '') + '>';
      celdas.forEach(c => {
        const r = ref(f, c.col);
        const s = ' s="' + indiceEstilo(c.s) + '"';
        if (c.v === null || c.v === undefined || c.v === '') {
          filasXml += '<c r="' + r + '"' + s + '/>';
        } else if (typeof c.v === 'number' && isFinite(c.v)) {
          filasXml += '<c r="' + r + '"' + s + '><v>' + c.v + '</v></c>';
        } else {
          filasXml += '<c r="' + r + '"' + s + ' t="inlineStr"><is><t xml:space="preserve">' + esc(c.v) + '</t></is></c>';
        }
      });
      filasXml += '</row>';
    }

    let vista = '<sheetView workbookViewId="0"/>';
    if (this.freeze && (this.freeze.filas || this.freeze.cols)) {
      const fz = this.freeze;
      const panel = fz.filas && fz.cols ? 'bottomRight' : (fz.filas ? 'bottomLeft' : 'topRight');
      vista = '<sheetView workbookViewId="0"><pane' +
        (fz.cols ? ' xSplit="' + fz.cols + '"' : '') + (fz.filas ? ' ySplit="' + fz.filas + '"' : '') +
        ' topLeftCell="' + ref(fz.filas + 1, fz.cols + 1) + '" activePane="' + panel + '" state="frozen"/>' +
        '<selection pane="' + panel + '"/></sheetView>';
    }

    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
      'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      '<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>' +
      '<sheetViews>' + vista + '</sheetViews>' +
      '<sheetFormatPr defaultRowHeight="15"/>' +
      '<cols>' + this.anchos.map((w, i) =>
        '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + w + '" customWidth="1"/>').join('') + '</cols>' +
      '<sheetData>' + filasXml + '</sheetData>' +
      (this.merges.length ? '<mergeCells count="' + this.merges.length + '">' +
        this.merges.map(m => '<mergeCell ref="' + m + '"/>').join('') + '</mergeCells>' : '') +
      (this.links.length ? '<hyperlinks>' + this.links.map((l, i) =>
        '<hyperlink ref="' + l.ref + '" r:id="rId' + (i + 1) + '"/>').join('') + '</hyperlinks>' : '') +
      '<pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/>' +
      '<pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0"/>' +
      '</worksheet>';
  }

  relsXml(): string {
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      this.links.map((l, i) => '<Relationship Id="rId' + (i + 1) + '" ' +
        'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" ' +
        'Target="' + esc(l.url) + '" TargetMode="External"/>').join('') +
      '</Relationships>';
  }
}

// =====================================================================
// Contenido
// =====================================================================

function pad(n: number): string { return (n < 10 ? '0' : '') + n; }

function textoCumplimiento(c: number): string {
  if (c === 100) { return 'Realizado (100%)'; }
  if (c === 75) { return 'Parcial (75%)'; }
  if (c === 50) { return 'Parcial (50%)'; }
  if (c === 0) { return 'No hecho (0%)'; }
  return 'Sin marcar';
}

function estiloCumplimiento(c: number): string {
  if (c === null || c === undefined) { return 'centro'; }   // sin cumplimiento marcado
  if (c === 100) { return 'hecho'; }
  if (c === 75) { return 'parcial'; }
  if (c === 50) { return 'medio'; }
  return 'nohecho';
}

function textoConsumo(r: any): string {
  if (r.consumo === null || r.consumo === undefined || !r.consumoCampo) { return ''; }
  const def = CONSUMOS_MA.filter(c => c.campo === r.consumoCampo)[0];
  return String(r.consumo).replace('.', ',') + (def ? ' ' + def.unidad : '');
}

function fechaISO(iso: string): string {
  if (!iso) { return ''; }
  const d = new Date(iso);
  if (isNaN(d.getTime())) { return ''; }
  return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
}

function hojaPrograma(d: DatosExcelPrograma): Hoja {
  const p: any = d.programa;
  const n = d.dias.length;
  const nc = n + 5;

  // ancho de Actividad según el nombre más largo (sin cortar el texto)
  let largo = 30;
  d.grupos.forEach(g => g.filas.forEach((x: any) => { largo = Math.max(largo, String(x.act.nombre || '').length); }));
  const anchos = [Math.min(largo + 3, 80), 16];
  d.dias.forEach(() => anchos.push(4.3));
  anchos.push(7, 7, 9);
  const h = new Hoja(('Programa ' + d.tipo).substr(0, 31), anchos, { filas: 7, cols: 2 });

  let f = h.fila(24); h.set(f, 1, 'PROGRAMA DE ACTIVIDADES ' + d.tipo, 'titulo', { merge: nc - 1 });
  f = h.fila(); h.set(f, 1, 'Subproyecto: ' + (d.subproyecto || '—'), 'metaB', { merge: nc - 1 });
  f = h.fila(); h.set(f, 1, 'Mes: ' + d.mesNombre + ' ' + d.anio + '   ·   Código: ' + (p.codigo || '') +
    '   ·   Versión: ' + (p.version || ''), 'meta', { merge: nc - 1 });
  let estado = 'Estado: ' + d.textoEstado;
  if (p.programadoPor) { estado += '   ·   Programado por: ' + p.programadoPor + ' ' + fechaISO(p.fechaProgramado); }
  if (p.estado === 'validado' && p.validadoPor) { estado += '   ·   Validado por: ' + p.validadoPor + ' ' + fechaISO(p.fechaValidado); }
  f = h.fila(); h.set(f, 1, estado, 'meta', { merge: nc - 1 });
  h.fila();

  // encabezado en 2 filas: letra del día y número
  const f1 = h.fila(18);
  const f2 = h.fila(18);
  h.set(f1, 1, 'Actividad', 'head', { down: 1 });
  h.set(f1, 2, 'Frecuencia', 'head', { down: 1 });
  d.dias.forEach((di, i) => {
    h.set(f1, 3 + i, di.letra, di.rojo ? 'headRojo' : 'head');
    h.set(f2, 3 + i, di.dia, di.rojo ? 'headRojo' : 'head');
  });
  h.set(f1, n + 3, 'Prog.', 'head', { down: 1 });
  h.set(f1, n + 4, 'Real.', 'head', { down: 1 });
  h.set(f1, n + 5, '% Cumpl.', 'head', { down: 1 });

  d.grupos.forEach(g => {
    let prog = 0;
    let real = 0;
    g.filas.forEach((x: any) => { prog += x.total; real += x.ctrl; });
    f = h.fila(18);
    h.set(f, 1, g.nombre + '  (' + g.filas.length + (g.filas.length === 1 ? ' actividad)' : ' actividades)'), 'grupo', { merge: n + 1 });
    h.set(f, n + 3, prog, 'grupoNum');
    h.set(f, n + 4, redondear(real), 'grupoNum');
    if (g.pct === null) { h.set(f, n + 5, '-', 'grupoNum'); } else { h.set(f, n + 5, g.pct / 100, 'grupoPct'); }

    const secciones: any[] = g.secciones && g.secciones.length ? g.secciones : [{ nombre: '', filas: g.filas, pct: null }];
    secciones.forEach((sec: any) => {
     if (sec.nombre) {
      let sProg = 0;
      let sReal = 0;
      sec.filas.forEach((x: any) => { sProg += x.total; sReal += x.ctrl; });
      f = h.fila(17);
      h.set(f, 1, '   ● ' + sec.nombre, 'seccion', { merge: n + 1 });
      h.set(f, n + 3, sProg, 'seccionNum');
      h.set(f, n + 4, redondear(sReal), 'seccionNum');
      if (sec.pct === null) { h.set(f, n + 5, '-', 'seccionNum'); } else { h.set(f, n + 5, sec.pct / 100, 'seccionPct'); }
     }
     sec.filas.forEach((x: any) => {
      f = h.fila(17);
      h.set(f, 1, x.act.nombre, 'act');
      h.set(f, 2, d.etiquetaFrecuencia(x.act), 'centro');
      x.celdas.forEach((c: any, i: number) => {
        const col = 3 + i;
        if (c.clase === 'c-rojo') { h.set(f, col, '', 'rojo'); return; }
        if (c.clase !== 'c-azul' && c.clase !== 'c-verde') { h.set(f, col, '', 'vacio'); return; }
        if (c.cump === 100) { h.set(f, col, 'X', 'hecho'); return; }
        if (c.cump === 75) { h.set(f, col, '75%', 'parcial'); return; }
        if (c.cump === 50) { h.set(f, col, '50%', 'medio'); return; }
        if (c.cump === 0) { h.set(f, col, '0%', 'nohecho'); return; }
        if (c.clase === 'c-verde') { h.set(f, col, 'N', 'nec'); } else { h.set(f, col, 'P', 'prog'); }
      });
      h.set(f, n + 3, x.total, 'centro');
      h.set(f, n + 4, redondear(x.ctrl), 'centro');
      if (x.pct === null) { h.set(f, n + 5, '-', 'centro'); } else { h.set(f, n + 5, x.pct / 100, 'pct'); }
     });
    });
  });

  f = h.fila(20);
  h.set(f, 1, 'TOTAL DEL MES', 'total', { merge: n + 1 });
  h.set(f, n + 3, d.totalProg, 'totalNum');
  h.set(f, n + 4, redondear(d.totalCtrl), 'totalNum');
  if (d.totalProg) { h.set(f, n + 5, d.pctTotal / 100, 'totalPct'); } else { h.set(f, n + 5, '-', 'totalNum'); }

  // leyenda
  h.fila();
  const leyenda: string[][] = [
    ['P', 'prog', 'Programado'],
    ['N', 'nec', 'Según necesidad / por actividad'],
    ['X', 'hecho', 'Realizado (100%)'],
    ['75%', 'parcial', 'Parcial (75%)'],
    ['50%', 'medio', 'Parcial (50%)'],
    ['0%', 'nohecho', 'No hecho (0%)'],
    ['', 'rojo', 'Fin de semana o feriado']
  ];
  leyenda.forEach(l => {
    f = h.fila();
    h.set(f, 1, l[0], l[1]);
    h.set(f, 2, l[2], 'meta', { merge: 6 });
  });
  return h;
}

interface FilaRegistro { grupo: string; actividad: string; dia: number; reg: RegistroDia; }

function registrosOrdenados(p: ProgramaMes): FilaRegistro[] {
  const res: FilaRegistro[] = [];
  (p.grupos || []).forEach(g => {
    (p.actividades || []).filter(a => a.grupo === g).forEach(a => {
      const regs = registrosDe(a);
      Object.keys(regs).map(Number).sort((x, y) => x - y).forEach(dia => {
        if (regs[String(dia)]) { res.push({ grupo: g, actividad: a.nombre, dia: dia, reg: regs[String(dia)] }); }
      });
    });
  });
  return res;
}

function hojaRegistro(d: DatosExcelPrograma, lista: FilaRegistro[]): Hoja {
  // Ítem, Actividad, Fecha, Cumplimiento, Categoría HH, Trabajadores, Duración individual, Total minutos,
  // HH netas, HH (decimal), Entidad, Consumo, Observación, Registrado por, Adjuntos
  const anchos = [26, 44, 11, 17, 17, 12, 15, 12, 15, 11, 14, 14, 40, 18, 36];
  const nc = anchos.length;
  const h = new Hoja('Registro HH', anchos, { filas: 4, cols: 0 });

  let f = h.fila(24);
  h.set(f, 1, 'REGISTRO DE HH CAPACITACIÓN Y CUMPLIMIENTO · ' + d.tipo + ' · ' + d.mesNombre + ' ' + d.anio, 'titulo', { merge: nc - 1 });
  f = h.fila(); h.set(f, 1, 'Subproyecto: ' + (d.subproyecto || '—'), 'metaB', { merge: nc - 1 });
  h.fila();

  const titulos = ['Ítem', 'Actividad', 'Fecha', 'Cumplimiento', 'Categoría HH', 'Trabajadores', 'Duración individual',
    'Total minutos', 'HH netas', 'HH (decimal)', 'Entidad (específicas)', 'Consumo (MA)', 'Observación', 'Registrado por', 'Adjuntos'];
  f = h.fila(30);
  titulos.forEach((t, i) => h.set(f, i + 1, t, 'head'));

  let minOp = 0;
  let minEsp = 0;

  lista.forEach(x => {
    const r: any = x.reg;
    const hh = hhRegistroMin(r);
    minOp += hh.minOperacional;
    minEsp += hh.minEspecificas;
    const adj = r.adjuntos || [];
    f = h.fila();
    let col = 1;
    h.set(f, col++, x.grupo, 'textoWrap');
    h.set(f, col++, x.actividad, 'textoWrap');
    h.set(f, col++, pad(x.dia) + '/' + pad(d.mes) + '/' + d.anio, 'centro');
    h.set(f, col++, textoCumplimiento(r.cumplimiento), estiloCumplimiento(r.cumplimiento));
    if (hh.minTotal) {
      const cat = hh.categoria ? textoCategoriaHH(hh.categoria) : 'Operacionales + Específicas';
      h.set(f, col++, cat + (hh.antiguo ? ' (registro anterior)' : ''), 'centro');
      h.set(f, col++, hh.antiguo ? '' : hh.trabajadores, 'centro');
      h.set(f, col++, hh.antiguo ? '' : formatoHM(hh.duracionMin), 'centro');
      h.set(f, col++, hh.minTotal, 'centro');
      h.set(f, col++, formatoHM(hh.minTotal), 'centro');
      h.set(f, col++, redondear(minutosAHoras(hh.minTotal)), 'centro');
    } else {
      for (let i = 0; i < 6; i++) { h.set(f, col++, '', 'centro'); }
    }
    h.set(f, col++, hh.minEspecificas > 0 ? textoEntidad(r.entidadEspecifica) : '', 'centro');
    h.set(f, col++, textoConsumo(r), 'centro');
    h.set(f, col++, r.observacion || '', 'textoWrap');
    h.set(f, col++, r.registradoPor || '', 'centro');
    if (adj.length === 1 && adj[0].url) {
      h.set(f, col++, adj[0].nombre, 'link', { link: adj[0].url });
    } else {
      h.set(f, col++, adj.map((a: any) => a.nombre).join('; '), 'textoWrap');
    }
  });

  if (!lista.length) {
    f = h.fila();
    h.set(f, 1, 'Todavía no hay días registrados este mes.', 'meta', { merge: nc - 1 });
  }

  // Resumen HH Capacitación (todo se suma en minutos)
  const minTotal = minOp + minEsp;
  h.fila();
  f = h.fila(20);
  h.set(f, 1, 'HH CAPACITACIÓN', 'total', { merge: 6 });
  h.set(f, 8, 'Total minutos', 'head');
  h.set(f, 9, 'HH netas', 'head');
  h.set(f, 10, 'HH (decimal)', 'head');
  const filasResumen: [string, number, string, string, string][] = [
    ['HH Operacionales', minOp, 'act', 'centro', 'centro'],
    ['HH Específicas', minEsp, 'act', 'centro', 'centro'],
    ['Total HH Capacitación', minTotal, 'total', 'totalNum', 'totalNum']
  ];
  filasResumen.forEach(x => {
    f = h.fila(18);
    h.set(f, 1, x[0], x[2], { merge: 6 });
    h.set(f, 8, x[1], x[3]);
    h.set(f, 9, formatoHM(x[1]), x[4]);
    h.set(f, 10, redondear(minutosAHoras(x[1])), x[4]);
  });
  return h;
}

function hojaAdjuntos(d: DatosExcelPrograma, lista: FilaRegistro[]): Hoja {
  const h = new Hoja('Adjuntos', [26, 44, 11, 50, 12]);
  let f = h.fila(24);
  h.set(f, 1, 'ARCHIVOS ADJUNTOS · ' + d.tipo + ' · ' + d.mesNombre + ' ' + d.anio, 'titulo', { merge: 4 });
  h.fila();
  f = h.fila(20);
  ['Ítem', 'Actividad', 'Fecha', 'Archivo', 'Tamaño (KB)'].forEach((t, i) => h.set(f, i + 1, t, 'head'));
  lista.forEach(x => {
    (x.reg.adjuntos || []).forEach(a => {
      f = h.fila();
      h.set(f, 1, x.grupo, 'textoWrap');
      h.set(f, 2, x.actividad, 'textoWrap');
      h.set(f, 3, pad(x.dia) + '/' + pad(d.mes) + '/' + d.anio, 'centro');
      if (a.url) { h.set(f, 4, a.nombre, 'link', { link: a.url }); } else { h.set(f, 4, a.nombre, 'textoWrap'); }
      h.set(f, 5, Math.round((a.tamano || 0) / 1024), 'centro');
    });
  });
  return h;
}

// =====================================================================
// ZIP (sin compresión) para armar el .xlsx
// =====================================================================

function utf8(s: string): Uint8Array {
  const bytes: number[] = [];
  for (let i = 0; i < s.length; i++) {
    let c = s.charCodeAt(i);
    // pares sustitutos (emojis, etc.)
    if (c >= 0xD800 && c <= 0xDBFF && i + 1 < s.length) {
      const c2 = s.charCodeAt(i + 1);
      if (c2 >= 0xDC00 && c2 <= 0xDFFF) {
        c = 0x10000 + ((c - 0xD800) << 10) + (c2 - 0xDC00);
        i++;
      }
    }
    if (c < 0x80) {
      bytes.push(c);
    } else if (c < 0x800) {
      bytes.push(0xC0 | (c >> 6), 0x80 | (c & 0x3F));
    } else if (c < 0x10000) {
      bytes.push(0xE0 | (c >> 12), 0x80 | ((c >> 6) & 0x3F), 0x80 | (c & 0x3F));
    } else {
      bytes.push(0xF0 | (c >> 18), 0x80 | ((c >> 12) & 0x3F), 0x80 | ((c >> 6) & 0x3F), 0x80 | (c & 0x3F));
    }
  }
  return new Uint8Array(bytes);
}

let TABLA_CRC: number[] = null;

function crc32(datos: Uint8Array): number {
  if (!TABLA_CRC) {
    TABLA_CRC = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) { c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; }
      TABLA_CRC[n] = c >>> 0;
    }
  }
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < datos.length; i++) { crc = TABLA_CRC[(crc ^ datos[i]) & 0xFF] ^ (crc >>> 8); }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function armarZip(archivos: { nombre: string; texto: string }[]): Uint8Array {
  const ahora = new Date();
  const hora = (ahora.getHours() << 11) | (ahora.getMinutes() << 5) | Math.floor(ahora.getSeconds() / 2);
  const fecha = ((ahora.getFullYear() - 1980) << 9) | ((ahora.getMonth() + 1) << 5) | ahora.getDate();

  const partes: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;

  archivos.forEach(a => {
    const nombre = utf8(a.nombre);
    const datos = utf8(a.texto);
    const crc = crc32(datos);

    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0, true);
    local.setUint16(8, 0, true);           // sin compresión
    local.setUint16(10, hora, true);
    local.setUint16(12, fecha, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, datos.length, true);
    local.setUint32(22, datos.length, true);
    local.setUint16(26, nombre.length, true);
    local.setUint16(28, 0, true);
    partes.push(new Uint8Array(local.buffer), nombre, datos);

    const cen = new DataView(new ArrayBuffer(46));
    cen.setUint32(0, 0x02014b50, true);
    cen.setUint16(4, 20, true);
    cen.setUint16(6, 20, true);
    cen.setUint16(8, 0, true);
    cen.setUint16(10, 0, true);
    cen.setUint16(12, hora, true);
    cen.setUint16(14, fecha, true);
    cen.setUint32(16, crc, true);
    cen.setUint32(20, datos.length, true);
    cen.setUint32(24, datos.length, true);
    cen.setUint16(28, nombre.length, true);
    cen.setUint16(30, 0, true);
    cen.setUint16(32, 0, true);
    cen.setUint16(34, 0, true);
    cen.setUint16(36, 0, true);
    cen.setUint32(38, 0, true);
    cen.setUint32(42, offset, true);
    central.push(new Uint8Array(cen.buffer), nombre);

    offset += 30 + nombre.length + datos.length;
  });

  let tamCentral = 0;
  central.forEach(c => tamCentral += c.length);

  const fin = new DataView(new ArrayBuffer(22));
  fin.setUint32(0, 0x06054b50, true);
  fin.setUint16(4, 0, true);
  fin.setUint16(6, 0, true);
  fin.setUint16(8, archivos.length, true);
  fin.setUint16(10, archivos.length, true);
  fin.setUint32(12, tamCentral, true);
  fin.setUint32(16, offset, true);
  fin.setUint16(20, 0, true);

  const todo = partes.concat(central, [new Uint8Array(fin.buffer)]);
  let total = 0;
  todo.forEach(p => total += p.length);
  const salida = new Uint8Array(total);
  let pos = 0;
  todo.forEach(p => { salida.set(p, pos); pos += p.length; });
  return salida;
}

function armarXlsx(hojas: Hoja[]): Uint8Array {
  const archivos: { nombre: string; texto: string }[] = [];

  archivos.push({
    nombre: '[Content_Types].xml',
    texto: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
      hojas.map((h, i) => '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ' +
        'ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>').join('') +
      '</Types>'
  });

  archivos.push({
    nombre: '_rels/.rels',
    texto: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
      '</Relationships>'
  });

  archivos.push({
    nombre: 'xl/workbook.xml',
    texto: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
      'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      '<bookViews><workbookView/></bookViews><sheets>' +
      hojas.map((h, i) => '<sheet name="' + esc(h.nombre.replace(/[\\\/\?\*\[\]:]/g, ' ').substr(0, 31)) +
        '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>').join('') +
      '</sheets></workbook>'
  });

  archivos.push({
    nombre: 'xl/_rels/workbook.xml.rels',
    texto: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      hojas.map((h, i) => '<Relationship Id="rId' + (i + 1) + '" ' +
        'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" ' +
        'Target="worksheets/sheet' + (i + 1) + '.xml"/>').join('') +
      '<Relationship Id="rId' + (hojas.length + 1) + '" ' +
      'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
      '</Relationships>'
  });

  archivos.push({ nombre: 'xl/styles.xml', texto: stylesXml() });

  hojas.forEach((h, i) => {
    archivos.push({ nombre: 'xl/worksheets/sheet' + (i + 1) + '.xml', texto: h.xml() });
    if (h.links.length) {
      archivos.push({ nombre: 'xl/worksheets/_rels/sheet' + (i + 1) + '.xml.rels', texto: h.relsXml() });
    }
  });

  return armarZip(archivos);
}

// =====================================================================
// Descarga
// =====================================================================

/** Arma el libro (sin descargar). Útil para probar. */
export function generarProgramaXlsx(d: DatosExcelPrograma): Uint8Array {
  const lista = registrosOrdenados(d.programa);
  const hojas = [hojaPrograma(d), hojaRegistro(d, lista)];
  if (lista.some(x => x.reg.adjuntos && x.reg.adjuntos.length > 0)) { hojas.push(hojaAdjuntos(d, lista)); }
  return armarXlsx(hojas);
}

export function exportarProgramaExcel(d: DatosExcelPrograma) {
  const bytes = generarProgramaXlsx(d);

  const nombre = ('Programa_' + d.tipo + '_' + (d.subproyecto || 'subproyecto') + '_' + d.mesNombre + '_' + d.anio)
    .replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, '_') + '.xlsx';
  descargarXlsx(bytes, nombre);
}

function descargarXlsx(bytes: Uint8Array, nombre: string) {
  const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const nav: any = window.navigator;
  if (nav && nav.msSaveOrOpenBlob) { nav.msSaveOrOpenBlob(blob, nombre); return; }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1500);
}


// =====================================================================
// Consolidado anual: cumplimiento SSO / MA por obra y mes
// =====================================================================

export interface DatosExcelAnual {
  anio: any;            // 2026 | 'TODOS'
  meses: string[];      // ENE..DIC
  filas: any[];         // FilaAnual[]
  totalesMes: any[];    // 24 celdas
  totalSSO: number;
  totalMA: number;
}

function estiloPct(pct: number, pendiente?: boolean): string {
  if (pendiente) { return 'pctPend'; }
  if (pct >= 90) { return 'pctOk'; }
  if (pct >= 75) { return 'pctMedio'; }
  return 'pctBajo';
}

export function exportarConsolidadoAnualExcel(d: DatosExcelAnual) {
  const anchos = [5, 38];
  for (let i = 0; i < 24; i++) { anchos.push(7.5); }
  anchos.push(9, 9);
  const nc = anchos.length;
  const h = new Hoja('Cumplimiento ' + d.anio, anchos, { filas: 6, cols: 2 });

  let f = h.fila(26); h.set(f, 1, 'CUMPLIMIENTO DE PROGRAMA SSO-MA · AÑO ' + d.anio, 'titulo', { merge: nc - 1 });
  f = h.fila(); h.set(f, 1, 'Planilla resumen seguimiento, cumplimiento objetivos programa Seguridad, Salud Ocupacional y Medio Ambiente', 'meta', { merge: nc - 1 });
  let pendientes = 0;
  d.filas.forEach(x => x.celdas.forEach((c: any) => { if (c.existe && c.pendiente) { pendientes++; } }));
  f = h.fila();
  if (pendientes) { h.set(f, 1, 'FALTA REVISIÓN DE ' + pendientes + (pendientes === 1 ? ' PROGRAMA' : ' PROGRAMAS') + ' (marcados en amarillo)', 'aviso', { merge: 14 }); }
  h.fila();

  const f1 = h.fila(18);
  const f2 = h.fila(16);
  h.set(f1, 1, 'N°', 'head', { down: 1 });
  h.set(f1, 2, 'OBRAS ' + d.anio, 'head', { down: 1 });
  d.meses.forEach((m, i) => {
    h.set(f1, 3 + i * 2, m, 'head', { merge: 1 });
    h.set(f2, 3 + i * 2, 'SSO', 'headSSO');
    h.set(f2, 4 + i * 2, 'MA', 'headMA');
  });
  h.set(f1, 27, 'TOTAL', 'head', { merge: 1 });
  h.set(f2, 27, 'SSO', 'headSSO');
  h.set(f2, 28, 'MA', 'headMA');

  d.filas.forEach((x, n) => {
    f = h.fila(17);
    h.set(f, 1, n + 1, 'centro');
    h.set(f, 2, x.nombre, 'act');
    x.celdas.forEach((c: any, i: number) => {
      if (!c.existe) { h.set(f, 3 + i, '', 'vacio'); return; }
      if (c.pct === null) { h.set(f, 3 + i, 's/p', 'centro'); return; }
      h.set(f, 3 + i, c.pct / 100, estiloPct(c.pct, c.pendiente));
    });
    if (x.totalSSO === null) { h.set(f, 27, '-', 'centro'); } else { h.set(f, 27, x.totalSSO / 100, estiloPct(x.totalSSO)); }
    if (x.totalMA === null) { h.set(f, 28, '-', 'centro'); } else { h.set(f, 28, x.totalMA / 100, estiloPct(x.totalMA)); }
  });

  f = h.fila(20);
  h.set(f, 1, 'TOTAL POR MES', 'total', { merge: 1 });
  d.totalesMes.forEach((c: any, i: number) => {
    const est = c.tipo === 'MA' ? 'pieMA' : 'pieSSO';
    h.set(f, 3 + i, c.pct === null ? '' : c.pct / 100, est);
  });
  h.set(f, 27, d.totalSSO === null ? '' : d.totalSSO / 100, 'pieSSO');
  h.set(f, 28, d.totalMA === null ? '' : d.totalMA / 100, 'pieMA');

  h.fila();
  f = h.fila(); h.set(f, 1, '% de cada mes = realizadas ÷ programadas (100% / 75% / 50% / 0%). Total de la obra = promedio de sus meses; total por mes = promedio de las obras. s/p = sin días programados.', 'meta', { merge: nc - 1 });

  descargarXlsx(armarXlsx([h]), 'Cumplimiento_programas_SSO_MA_' + d.anio + '.xlsx');
}