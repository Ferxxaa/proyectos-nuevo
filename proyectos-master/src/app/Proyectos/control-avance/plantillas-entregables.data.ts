export interface PlantillaDocumento {
  codigo: string;
  descripcion: string;
  tema: string;
  tipoSugerido: string; // '' | 'ET' | 'MC' | 'P' | 'R'
}

export interface GrupoPlantillas {
  grupo: string;
  items: PlantillaDocumento[];
  /** Si es true, "Disciplina completa" crea un subtítulo por cada "tema" distinto (ej: 1.1, 1.2, 1.3), en vez de un solo título plano. */
  agruparPorSeccion?: boolean;
}

/**
 * Catálogo de láminas/documentos prefabricados
 * Se usa como base para el modal de Plantillas del control de avance: el usuario elige una
 * disciplina completa o documentos sueltos, y luego los edita libremente como cualquier fila.
 */
export const PLANTILLAS_ENTREGABLES: GrupoPlantillas[] = [
  {
    grupo: 'TOPOGRAFIA',
    items: [
      { codigo: '', descripcion: 'LEVANTAMIENTO TOPOGRÁIFCO', tema: 'PLANO GENERAL', tipoSugerido: 'P' },
    ]
  },
  {
    grupo: 'REGULARIZACION ',
    agruparPorSeccion: true,
    items: [
      { codigo: '', descripcion: 'RECOPILACION ANTECEDENTES', tema: 'GESTIONES PREVIAS', tipoSugerido: 'O' },
      { codigo: '', descripcion: 'DESARCHIVO DOM', tema: 'GESTIONES PREVIAS', tipoSugerido: 'R' },
      { codigo: '', descripcion: 'LEVANTAMIENTO', tema: 'GESTIONES PREVIAS', tipoSugerido: 'L' },
      { codigo: '', descripcion: 'CERTIFICADO INFORMES PREVIOS', tema: 'GESTIONES PREVIAS', tipoSugerido: 'R' },
      { codigo: '', descripcion: 'CERTIFICADO DE FACTIBILIDAD SAN.', tema: 'GESTIONES PREVIAS', tipoSugerido: 'R' },
      { codigo: '', descripcion: 'PROYECTO ARQUITECTURA VERSION MUNICIPAL', tema: 'DESARROLLO EXPEDIENTE MUNICIPAL', tipoSugerido: 'P' },
      { codigo: '', descripcion: 'CONFECCION EXPEDIENTE MUNICIPAL P.E.', tema: 'DESARROLLO EXPEDIENTE MUNICIPAL', tipoSugerido: 'O' },
      { codigo: '', descripcion: 'GESTION DE FIRMAS BANCO ESTADO', tema: 'DESARROLLO EXPEDIENTE MUNICIPAL', tipoSugerido: 'O' },
      { codigo: '', descripcion: 'INGRESO DOM DIGITAL P.E.', tema: 'DESARROLLO EXPEDIENTE MUNICIPAL', tipoSugerido: 'R' },
      { codigo: '', descripcion: 'COORDINACION REVISOR DOM OBSERVACIONES', tema: 'GESTION DOM PERMISO DE EDIFICACION', tipoSugerido: 'R' },
      { codigo: '', descripcion: 'APROBACION PERMISO EDIFICACION', tema: 'GESTION DOM PERMISO DE EDIFICACION', tipoSugerido: 'R' },
    ]
  },
  {
    grupo: 'MECANICA DE SUELOS',
    items: [
      { codigo: '', descripcion: 'INFORME MECANICA DE SUELOS PLC', tema: 'DOCUMENTOS', tipoSugerido: 'MC' },
      { codigo: '', descripcion: 'ESTATIGRAFIA', tema: 'ANEXO 01', tipoSugerido: '' },
      { codigo: '', descripcion: 'ENSAYOS DE LABORATORIO', tema: 'ANEXO 02', tipoSugerido: '' },
      { codigo: '', descripcion: 'ENSAYO PORCHET', tema: 'ANEXO 03', tipoSugerido: '' },
    ]
  },
  {
    grupo: 'PROYECTO ARQUITECTURA',
    items: [
      { codigo: '', descripcion: 'PLANTA EMPLAZAMIENTO - CUADROS NORMATIVOS Y SUPERFICIES', tema: 'PLANOS GENERALES', tipoSugerido: 'P' },
      { codigo: '', descripcion: 'PLANTA ARQUITECTURA LAYOUT', tema: 'PLANOS GENERALES', tipoSugerido: 'P' },
      { codigo: '', descripcion: 'ELEVACIONES', tema: 'PLANOS GENERALES', tipoSugerido: 'P' },
      { codigo: '', descripcion: 'CORTES', tema: 'PLANOS GENERALES', tipoSugerido: 'P' },
      { codigo: '', descripcion: 'PLANTA ACCESIBILIDAD UNIVERSAL', tema: 'PLANOS GENERALES', tipoSugerido: 'P' },
      { codigo: '', descripcion: 'PLANTA DE OBRAS CIVILES TABIQUES, PUERTAS Y VENTANAS', tema: 'PLANOS GENERALES', tipoSugerido: 'P' },
      { codigo: '', descripcion: 'PLANTA DE PAVIMENTOS Y TERMINACIONES', tema: 'PLANOS GENERALES', tipoSugerido: 'P' },
      { codigo: '', descripcion: 'PLANTA DE CIELOS E ILUMINACIÓN', tema: 'PLANOS GENERALES', tipoSugerido: 'P' },
      { codigo: '', descripcion: 'PLANTA DE CUBIERTA Y DETALLES', tema: 'PLANOS DETALLES', tipoSugerido: 'P' },
      { codigo: '', descripcion: 'PLANTA DETALLES BAÑOS Y KITCHENETTE', tema: 'PLANOS DETALLES', tipoSugerido: 'P' },
      { codigo: '', descripcion: 'DETALLES MUEBLES', tema: 'PLANOS DETALLES', tipoSugerido: 'P' },
      { codigo: '', descripcion: 'ESPECIFICACIONES TECNICAS', tema: 'DOCUMENTOS', tipoSugerido: 'ET' },
      { codigo: '', descripcion: 'ITEMIZADO', tema: 'DOCUMENTOS', tipoSugerido: '' },
    ]
  },
  {
    grupo: 'PROYECTO CALCULO ESTRUCTURAL',
    items: [
      { codigo: '', descripcion: 'PLANTA FUNDACIONES, ESTRUCTURAM, DETALLES SECCIONES', tema: 'PLANOS GENERALES', tipoSugerido: 'P' },
      { codigo: '', descripcion: 'PLANO ELEVACIONES E2', tema: 'PLANOS GENERALES', tipoSugerido: 'P' },
      { codigo: '', descripcion: 'PLANO ELEVACIONES E3', tema: 'PLANOS GENERALES', tipoSugerido: 'P' },
      { codigo: '', descripcion: 'MEMORIA DE CALCULO', tema: 'DOCUMENTOS', tipoSugerido: 'MC' },
    ]
  },
  {
    grupo: 'PROYECTO ELECTRICO',
    items: [
      { codigo: '', descripcion: 'PLANTA ACOMETIDA', tema: 'PLANOS GENERALES', tipoSugerido: 'P' },
      { codigo: '', descripcion: 'PLANTA ALUMBRADO CIELOS', tema: 'PLANOS GENERALES', tipoSugerido: 'P' },
      { codigo: '', descripcion: 'PLANTA ALUMBRADO CANALIZACIÓN', tema: 'PLANOS GENERALES', tipoSugerido: 'P' },
      { codigo: '', descripcion: 'PLANTA ENCHUFES', tema: 'PLANOS GENERALES', tipoSugerido: 'P' },
      { codigo: '', descripcion: 'PLANTA CLIMATIZACIÓN EQUIPOS', tema: 'PLANOS GENERALES', tipoSugerido: 'P' },
      { codigo: '', descripcion: 'CUADRO DE CARGAS', tema: 'PLANOS GENERALES', tipoSugerido: '' },
      { codigo: '', descripcion: 'DIAGRAMA UNILINEAL', tema: 'PLANOS GENERALES', tipoSugerido: 'P' },
      { codigo: '', descripcion: 'PLANTA PANELES FOTOVOLTAICOS', tema: 'PLANOS GENERALES', tipoSugerido: 'P' },
      { codigo: '', descripcion: 'DIAGRAMA UNILINEAL PANELES FOTOVOLTAICOS', tema: 'PLANOS GENERALES', tipoSugerido: 'P' },
      { codigo: '', descripcion: 'DIAGRAMA CONSTRUCTIVO SISTEMA FOTOVOLTAICO', tema: 'PLANOS GENERALES', tipoSugerido: 'P' },
      { codigo: '', descripcion: 'PLANTA CORRIENTES DEBILES DATOS', tema: 'PLANOS GENERALES', tipoSugerido: 'P' },
      { codigo: '', descripcion: 'PLANTA CORRIENTES DEBILES RED CONTRA INCENDIOS', tema: 'PLANOS GENERALES', tipoSugerido: 'P' },
      { codigo: '', descripcion: 'PLANTA CORRIENTES DEBILES ALARMAS', tema: 'PLANOS GENERALES', tipoSugerido: 'P' },
      { codigo: '', descripcion: 'ESPECIFICACIONES TECNICAS', tema: 'DOCUMENTOS', tipoSugerido: 'ET' },
      { codigo: '', descripcion: 'ITEMIZADO', tema: 'DOCUMENTOS', tipoSugerido: '' },
      { codigo: '', descripcion: 'MEMORIA ILUMINACIÓN', tema: 'DOCUMENTOS', tipoSugerido: 'MC' },
    ]
  },
  {
    grupo: 'PROYECTO SANITARIO',
    items: [
      { codigo: '', descripcion: 'PLANTA ALCANTARILLADO', tema: 'PLANOS GENERALES', tipoSugerido: 'P' },
      { codigo: '', descripcion: 'PLANTA AGUA POTABLE', tema: 'PLANOS GENERALES', tipoSugerido: 'P' },
      { codigo: '', descripcion: 'PLANTA AGUAS LLUVIAS', tema: 'PLANOS GENERALES', tipoSugerido: 'P' },
      { codigo: '', descripcion: 'ESPECIFICACIONES TECNICAS', tema: 'DOCUMENTOS', tipoSugerido: 'ET' },
      { codigo: '', descripcion: 'ITEMIZADO', tema: 'DOCUMENTOS', tipoSugerido: '' },
    ]
  },
  {
    grupo: 'PROYECTO CLIMATIZACIÓN',
    items: [
      { codigo: '', descripcion: 'PLANTA CIELO CLIMATIZACION', tema: 'PLANOS GENERALES', tipoSugerido: 'P' },
      { codigo: '', descripcion: 'DETALLES CONSTRUCTIVOS CLIMATIZACIÓN', tema: 'PLANOS GENERALES', tipoSugerido: 'P' },
      { codigo: '', descripcion: 'ESPECIFICACIONES TECNICAS', tema: 'DOCUMENTOS', tipoSugerido: 'ET' },
      { codigo: '', descripcion: 'ITEMIZADO', tema: 'DOCUMENTOS', tipoSugerido: '' },
    ]
  },
];