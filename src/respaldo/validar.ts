// Validación de manifest.json y datos.json antes de tocar nada (FR-004, contracts/respaldo.md),
// escrita a mano para no sumar una librería. Revisa tipos, enums, IDs repetidos, invariantes del
// modelo de datos y referencias, con las mismas reglas que la verificación de integridad
// (datos/referencias.ts). Los registros válidos se devuelven tal cual, sin reconstruirlos, para
// que la ida y vuelta sea exacta. Los bytes y el CRC-32 de cada imagen los revisa importar.ts,
// que es quien lee el ZIP.

import { revisarReferencias } from '../datos/referencias';
import {
  CATEGORIAS,
  ESQUEMA_ACTUAL,
  FORMATOS_IMAGEN,
  ID_AJUSTES,
  ID_MEDIDAS,
  TIPOS_IMAGEN,
  ZONAS,
  esSiluetaIncluida,
  type Ajustes,
  type Apariencia,
  type Calendario,
  type EstadoTaller,
  type Imagen,
  type Maniqui,
  type Medidas,
  type Origen,
  type Outfit,
  type Prenda,
  type Silueta,
  type UsosDia,
} from '../datos/tipos';
import type { MotivoRespaldo } from './errores';
import { APP_RESPALDO, FORMATO_RESPALDO, type ImagenManifest, type Manifest } from './formato';

export type Resultado<T> = { ok: true; datos: T } | { ok: false; motivo: MotivoRespaldo; detalle: string };

/** Registros listos para escribir, en forma de tablas (como los ve una migración). */
export interface DatosValidados {
  prendas: Prenda[];
  /** Sin `blob`: los bytes salen del ZIP. */
  imagenes: Omit<Imagen, 'blob'>[];
  siluetas: Silueta[];
  maniquies: Maniqui[];
  outfits: Outfit[];
  calendario: Calendario[];
  usosDia: UsosDia[];
  /** Cero o un registro. */
  medidas: Medidas[];
  /** Cero o un registro. */
  ajustes: Ajustes[];
}

const ORIGENES = ['comprada', 'hecha'] as const satisfies readonly Origen[];
const ESTADOS_TALLER = ['planeada', 'en_proceso', 'terminada'] as const satisfies readonly EstadoTaller[];
const APARIENCIAS = ['sistema', 'claro', 'oscuro'] as const satisfies readonly Apariencia[];

class Invalido extends Error {}

function falla(ruta: string, que: string): never {
  throw new Invalido(`${ruta}: ${que}`);
}

type Obj = Record<string, unknown>;

function objeto(v: unknown, ruta: string): Obj {
  if (v === null || typeof v !== 'object' || Array.isArray(v)) falla(ruta, 'no es un objeto');
  return v as Obj;
}

function texto(v: unknown, ruta: string, vacio = true): string {
  if (typeof v !== 'string' || (!vacio && v.length === 0)) falla(ruta, 'no es un texto');
  return v;
}

const id = (v: unknown, ruta: string) => texto(v, ruta, false);

function numero(v: unknown, ruta: string, reglas: { entero?: boolean; min?: number; mayorQue?: number } = {}): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) falla(ruta, 'no es un número');
  if (reglas.entero && !Number.isInteger(v)) falla(ruta, 'no es entero');
  if (reglas.min !== undefined && v < reglas.min) falla(ruta, `es menor que ${reglas.min}`);
  if (reglas.mayorQue !== undefined && v <= reglas.mayorQue) falla(ruta, `no es mayor que ${reglas.mayorQue}`);
  return v;
}

function booleano(v: unknown, ruta: string): boolean {
  if (typeof v !== 'boolean') falla(ruta, 'no es verdadero o falso');
  return v;
}

function uno<T>(v: unknown, opciones: readonly T[], ruta: string): T {
  if (!opciones.includes(v as T)) falla(ruta, `"${String(v)}" no es un valor permitido`);
  return v as T;
}

function lista(v: unknown, ruta: string): unknown[] {
  if (!Array.isArray(v)) falla(ruta, 'no es una lista');
  return v;
}

function textos(v: unknown, ruta: string): string[] {
  return lista(v, ruta).map((x, i) => texto(x, `${ruta}[${i}]`));
}

function opcional(v: unknown, revisar: (v: unknown) => unknown): void {
  if (v !== undefined) revisar(v);
}

function fecha(v: unknown, ruta: string): string {
  const s = texto(v, ruta);
  const [a, m, d] = s.split('-').map(Number);
  const valida = /^\d{4}-\d{2}-\d{2}$/.test(s) && new Date(a!, m! - 1, d!).getDate() === d;
  if (!valida) falla(ruta, `"${s}" no es una fecha AAAA-MM-DD`);
  return s;
}

function rect(v: unknown, ruta: string): void {
  const r = objeto(v, ruta);
  for (const campo of ['x', 'y', 'ancho', 'alto']) numero(r[campo], `${ruta}.${campo}`);
}

function sinRepetidos(claves: readonly string[], ruta: string): void {
  const vistas = new Set<string>();
  for (const clave of claves) {
    if (vistas.has(clave)) falla(ruta, `"${clave}" está repetido`);
    vistas.add(clave);
  }
}

// ---------------------------------------------------------------------------------------------
// manifest.json
// ---------------------------------------------------------------------------------------------

function imagenManifest(v: unknown, ruta: string): ImagenManifest {
  const o = objeto(v, ruta);
  id(o.id, `${ruta}.id`);
  texto(o.ruta, `${ruta}.ruta`, false);
  uno(o.tipo, TIPOS_IMAGEN, `${ruta}.tipo`);
  uno(o.mime, FORMATOS_IMAGEN, `${ruta}.mime`);
  numero(o.bytes, `${ruta}.bytes`, { entero: true, min: 0 });
  if (typeof o.crc32 !== 'string' || !/^[0-9a-f]{8}$/.test(o.crc32)) falla(`${ruta}.crc32`, 'no es un CRC-32');
  numero(o.ancho, `${ruta}.ancho`, { entero: true, mayorQue: 0 });
  numero(o.alto, `${ruta}.alto`, { entero: true, mayorQue: 0 });
  numero(o.creada, `${ruta}.creada`);
  return o as unknown as ImagenManifest;
}

/**
 * Primero lo que dice si el archivo es de Percha y de qué versión, para que un respaldo de una
 * versión más nueva (que puede traer campos nuevos) no se informe como dañado.
 */
export function validarManifest(valor: unknown, esquemaMaximo: number = ESQUEMA_ACTUAL): Resultado<Manifest> {
  if (valor === null || typeof valor !== 'object' || (valor as Obj).app !== APP_RESPALDO) {
    return { ok: false, motivo: 'no_es_percha', detalle: 'manifest.app no es "percha"' };
  }
  const m = valor as Obj;
  try {
    const formato = numero(m.formato, 'manifest.formato', { entero: true, min: 1 });
    const esquema = numero(m.esquema, 'manifest.esquema', { entero: true, min: 1 });
    if (formato > FORMATO_RESPALDO) {
      return { ok: false, motivo: 'version_nueva', detalle: `formato ${formato} > ${FORMATO_RESPALDO}` };
    }
    if (esquema > esquemaMaximo) {
      return { ok: false, motivo: 'version_nueva', detalle: `esquema ${esquema} > ${esquemaMaximo}` };
    }
    if (Number.isNaN(Date.parse(texto(m.creado, 'manifest.creado')))) falla('manifest.creado', 'no es una fecha');
    texto(m.versionApp, 'manifest.versionApp');
    const conteos = objeto(m.conteos, 'manifest.conteos');
    for (const tabla of ['prendas', 'imagenes', 'siluetas', 'maniquies', 'outfits', 'calendario', 'usosDia']) {
      numero(conteos[tabla], `manifest.conteos.${tabla}`, { entero: true, min: 0 });
    }
    const imagenes = lista(m.imagenes, 'manifest.imagenes').map((x, i) => imagenManifest(x, `manifest.imagenes[${i}]`));
    sinRepetidos(imagenes.map((i) => i.id), 'manifest.imagenes.id');
    sinRepetidos(imagenes.map((i) => i.ruta), 'manifest.imagenes.ruta');
    if (conteos.imagenes !== imagenes.length) falla('manifest.conteos.imagenes', 'no coincide con la lista');
    return { ok: true, datos: m as unknown as Manifest };
  } catch (error) {
    if (error instanceof Invalido) return { ok: false, motivo: 'danado', detalle: error.message };
    throw error;
  }
}

// ---------------------------------------------------------------------------------------------
// datos.json, ya migrado al esquema actual
// ---------------------------------------------------------------------------------------------

function prenda(v: unknown, ruta: string): Prenda {
  const p = objeto(v, ruta);
  id(p.id, `${ruta}.id`);
  opcional(p.nombre, (x) => texto(x, `${ruta}.nombre`));
  uno(p.categoria, CATEGORIAS, `${ruta}.categoria`);
  const color = objeto(p.color, `${ruta}.color`);
  if (typeof color.hex !== 'string' || !/^#[0-9a-f]{6}$/i.test(color.hex)) falla(`${ruta}.color.hex`, 'no es un color #rrggbb');
  opcional(color.nombre, (x) => texto(x, `${ruta}.color.nombre`));
  textos(p.temporadas, `${ruta}.temporadas`);
  textos(p.ocasiones, `${ruta}.ocasiones`);
  textos(p.etiquetas, `${ruta}.etiquetas`);
  const origen = uno(p.origen, ORIGENES, `${ruta}.origen`);

  if (p.costura !== undefined) {
    const c = objeto(p.costura, `${ruta}.costura`);
    for (const campo of ['tela', 'composicion', 'molde', 'notas']) opcional(c[campo], (x) => texto(x, `${ruta}.costura.${campo}`));
    lista(c.fotosProcesoIds, `${ruta}.costura.fotosProcesoIds`).forEach((x, i) => id(x, `${ruta}.costura.fotosProcesoIds[${i}]`));
  } else if (origen === 'hecha') {
    falla(`${ruta}.costura`, 'falta en una prenda hecha por ella');
  }

  const estado = p.estadoTaller === undefined ? undefined : uno(p.estadoTaller, ESTADOS_TALLER, `${ruta}.estadoTaller`);
  const enCloset = uno(p.enCloset, [0, 1], `${ruta}.enCloset`);
  if (enCloset !== (estado === undefined || estado === 'terminada' ? 1 : 0)) falla(`${ruta}.enCloset`, 'no coincide con estadoTaller');

  if (p.planeada !== undefined) {
    const pl = objeto(p.planeada, `${ruta}.planeada`);
    id(pl.telaFotoId, `${ruta}.planeada.telaFotoId`);
    id(pl.siluetaId, `${ruta}.planeada.siluetaId`);
    const e = objeto(pl.estampado, `${ruta}.planeada.estampado`);
    for (const campo of ['escala', 'offsetX', 'offsetY']) numero(e[campo], `${ruta}.planeada.estampado.${campo}`);
    booleano(pl.sombreado, `${ruta}.planeada.sombreado`);
  } else if (estado !== undefined) {
    falla(`${ruta}.planeada`, 'falta en una prenda del Taller');
  }

  const imagen = objeto(p.imagen, `${ruta}.imagen`);
  id(imagen.recorteId, `${ruta}.imagen.recorteId`);
  id(imagen.miniaturaId, `${ruta}.imagen.miniaturaId`);
  opcional(imagen.originalId, (x) => id(x, `${ruta}.imagen.originalId`));
  opcional(imagen.anclaje, (x) => {
    const a = objeto(x, `${ruta}.imagen.anclaje`);
    for (const campo of ['cx', 'cy', 'alto']) numero(a[campo], `${ruta}.imagen.anclaje.${campo}`);
  });
  lista(p.historialImagenes, `${ruta}.historialImagenes`).forEach((x, i) => {
    const h = objeto(x, `${ruta}.historialImagenes[${i}]`);
    uno(h.tipo, ['silueta', 'foto'], `${ruta}.historialImagenes[${i}].tipo`);
    id(h.recorteId, `${ruta}.historialImagenes[${i}].recorteId`);
    id(h.miniaturaId, `${ruta}.historialImagenes[${i}].miniaturaId`);
    numero(h.fecha, `${ruta}.historialImagenes[${i}].fecha`);
  });
  numero(p.usos, `${ruta}.usos`, { entero: true, min: 0 });
  opcional(p.ultimoUso, (x) => fecha(x, `${ruta}.ultimoUso`));
  numero(p.creada, `${ruta}.creada`);
  numero(p.actualizada, `${ruta}.actualizada`);
  return p as unknown as Prenda;
}

function imagen(v: unknown, ruta: string): Omit<Imagen, 'blob'> {
  const o = objeto(v, ruta);
  id(o.id, `${ruta}.id`);
  uno(o.tipo, TIPOS_IMAGEN, `${ruta}.tipo`);
  numero(o.ancho, `${ruta}.ancho`, { entero: true, mayorQue: 0 });
  numero(o.alto, `${ruta}.alto`, { entero: true, mayorQue: 0 });
  numero(o.bytes, `${ruta}.bytes`, { entero: true, min: 0 });
  numero(o.creada, `${ruta}.creada`);
  return o as unknown as Omit<Imagen, 'blob'>;
}

function silueta(v: unknown, ruta: string): Silueta {
  const s = objeto(v, ruta);
  // Las incluidas viven en el código: un respaldo de Percha nunca las trae.
  if (esSiluetaIncluida(id(s.id, `${ruta}.id`))) falla(`${ruta}.id`, 'es una silueta incluida');
  texto(s.nombre, `${ruta}.nombre`);
  uno(s.origen, ['importada'], `${ruta}.origen`);
  uno(s.categoria, CATEGORIAS, `${ruta}.categoria`);
  texto(s.d, `${ruta}.d`, false);
  rect(s.caja, `${ruta}.caja`);
  numero(s.creada, `${ruta}.creada`);
  return s as unknown as Silueta;
}

function maniqui(v: unknown, ruta: string): Maniqui {
  const m = objeto(v, ruta);
  id(m.id, `${ruta}.id`);
  texto(m.nombre, `${ruta}.nombre`);
  id(m.imagenId, `${ruta}.imagenId`);
  id(m.miniaturaId, `${ruta}.miniaturaId`);
  rect(m.cuerpo, `${ruta}.cuerpo`);
  uno(m.principal, [0, 1], `${ruta}.principal`);
  numero(m.creado, `${ruta}.creado`);
  return m as unknown as Maniqui;
}

function outfit(v: unknown, ruta: string): Outfit {
  const o = objeto(v, ruta);
  id(o.id, `${ruta}.id`);
  opcional(o.nombre, (x) => texto(x, `${ruta}.nombre`));
  textos(o.etiquetas, `${ruta}.etiquetas`);
  if (o.maniquiId !== null) id(o.maniquiId, `${ruta}.maniquiId`);
  const zonas: string[] = [];
  const prendas = lista(o.capas, `${ruta}.capas`).map((x, i) => {
    const c = objeto(x, `${ruta}.capas[${i}]`);
    const zona = uno(c.zona, ZONAS, `${ruta}.capas[${i}].zona`);
    if (zona !== 'accesorios') zonas.push(zona);
    const t = objeto(c.t, `${ruta}.capas[${i}].t`);
    for (const campo of ['cx', 'cy', 'alto', 'rotacion']) numero(t[campo], `${ruta}.capas[${i}].t.${campo}`);
    return id(c.prendaId, `${ruta}.capas[${i}].prendaId`);
  });
  sinRepetidos(zonas, `${ruta}.capas.zona`);
  const prendaIds = textos(o.prendaIds, `${ruta}.prendaIds`);
  if (prendaIds.join('\n') !== prendas.join('\n')) falla(`${ruta}.prendaIds`, 'no coincide con las capas');
  opcional(o.miniaturaId, (x) => id(x, `${ruta}.miniaturaId`));
  numero(o.creado, `${ruta}.creado`);
  numero(o.actualizado, `${ruta}.actualizado`);
  return o as unknown as Outfit;
}

function diaCalendario(v: unknown, ruta: string): Calendario {
  const c = objeto(v, ruta);
  fecha(c.fecha, `${ruta}.fecha`);
  id(c.outfitId, `${ruta}.outfitId`);
  return c as unknown as Calendario;
}

function usosDia(v: unknown, ruta: string): UsosDia {
  const u = objeto(v, ruta);
  fecha(u.fecha, `${ruta}.fecha`);
  opcional(u.outfitId, (x) => id(x, `${ruta}.outfitId`));
  textos(u.prendaIds, `${ruta}.prendaIds`);
  return u as unknown as UsosDia;
}

function medidas(v: unknown, ruta: string): Medidas {
  const m = objeto(v, ruta);
  uno(m.id, [ID_MEDIDAS], `${ruta}.id`);
  const campos = lista(m.campos, `${ruta}.campos`).map((x, i) => {
    const c = objeto(x, `${ruta}.campos[${i}]`);
    texto(c.nombre, `${ruta}.campos[${i}].nombre`);
    if (c.valorCm !== null) numero(c.valorCm, `${ruta}.campos[${i}].valorCm`, { mayorQue: 0 });
    booleano(c.personalizada, `${ruta}.campos[${i}].personalizada`);
    numero(c.orden, `${ruta}.campos[${i}].orden`, { entero: true });
    return id(c.id, `${ruta}.campos[${i}].id`);
  });
  sinRepetidos(campos, `${ruta}.campos.id`);
  opcional(m.actualizado, (x) => fecha(x, `${ruta}.actualizado`));
  return m as unknown as Medidas;
}

function ajustes(v: unknown, ruta: string): Ajustes {
  const a = objeto(v, ruta);
  uno(a.id, [ID_AJUSTES], `${ruta}.id`);
  uno(a.apariencia, APARIENCIAS, `${ruta}.apariencia`);
  opcional(a.ultimoRespaldo, (x) => numero(x, `${ruta}.ultimoRespaldo`));
  opcional(a.dedicatoria, (x) => {
    const d = objeto(x, `${ruta}.dedicatoria`);
    opcional(d.nombre, (y) => texto(y, `${ruta}.dedicatoria.nombre`));
    opcional(d.texto, (y) => texto(y, `${ruta}.dedicatoria.texto`));
  });
  uno(a.onboarding, ['pendiente', 'completo'], `${ruta}.onboarding`);
  numero(a.chipArmadorVisto, `${ruta}.chipArmadorVisto`, { entero: true, min: 0 });
  opcional(a.ultimaCategoria, (x) => uno(x, CATEGORIAS, `${ruta}.ultimaCategoria`));
  return a as unknown as Ajustes;
}

function tabla<T>(registros: Obj, nombre: string, revisar: (v: unknown, ruta: string) => T, maximo = Infinity): T[] {
  const filas = lista(registros[nombre], nombre);
  if (filas.length > maximo) falla(nombre, `tiene más de ${maximo} registro`);
  return filas.map((fila, i) => revisar(fila, `${nombre}[${i}]`));
}

/**
 * Valida los registros de datos.json ya migrados al esquema actual, con `imagenes` armada a partir
 * del manifest (sin blobs). `medidas` y `ajustes` llegan como tablas de cero o un registro.
 */
export function validarDatos(registros: unknown): Resultado<DatosValidados> {
  try {
    const r = objeto(registros, 'datos');
    const datos: DatosValidados = {
      prendas: tabla(r, 'prendas', prenda),
      imagenes: tabla(r, 'imagenes', imagen),
      siluetas: tabla(r, 'siluetas', silueta),
      maniquies: tabla(r, 'maniquies', maniqui),
      outfits: tabla(r, 'outfits', outfit),
      calendario: tabla(r, 'calendario', diaCalendario),
      usosDia: tabla(r, 'usosDia', usosDia),
      medidas: tabla(r, 'medidas', medidas, 1),
      ajustes: tabla(r, 'ajustes', ajustes, 1),
    };

    sinRepetidos(datos.prendas.map((p) => p.id), 'prendas.id');
    sinRepetidos(datos.imagenes.map((i) => i.id), 'imagenes.id');
    sinRepetidos(datos.siluetas.map((s) => s.id), 'siluetas.id');
    sinRepetidos(datos.maniquies.map((m) => m.id), 'maniquies.id');
    sinRepetidos(datos.outfits.map((o) => o.id), 'outfits.id');
    sinRepetidos(datos.calendario.map((c) => c.fecha), 'calendario.fecha');
    sinRepetidos(datos.usosDia.map((u) => u.fecha), 'usosDia.fecha');

    // FR-021: si hay maniquíes, exactamente uno es el principal.
    const principales = datos.maniquies.filter((m) => m.principal === 1).length;
    if (datos.maniquies.length > 0 && principales !== 1) falla('maniquies.principal', `hay ${principales} principales`);

    const { rotas } = revisarReferencias({
      prendas: datos.prendas,
      maniquies: datos.maniquies,
      outfits: datos.outfits,
      calendario: datos.calendario,
      idsImagenes: new Set(datos.imagenes.map((i) => i.id)),
      idsSiluetas: new Set(datos.siluetas.map((s) => s.id)),
    });
    const [rota] = rotas;
    if (rota) falla(`${rota.tabla}[${rota.id}].${rota.campo}`, `"${rota.ref}" no existe`);

    return { ok: true, datos };
  } catch (error) {
    if (error instanceof Invalido) return { ok: false, motivo: 'danado', detalle: error.message };
    throw error;
  }
}
