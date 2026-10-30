// Detectores de bugs visuales que corren dentro de la página (page.evaluate). La función tiene que
// ser autocontenida: Playwright la serializa y la manda al navegador, sin los imports de este archivo.
//
// - `error`: algo que se ve roto (texto cortado, encimado o fuera de la pantalla, un control bajo
//   la isla o el indicador de inicio, la barra inferior tapando contenido, una fuente que no cargó).
//   Hace fallar la prueba.
// - `aviso`: algo que no cumple una pauta (contraste WCAG AA, objetivo táctil de 44 × 44) pero que
//   puede venir del diseño. Va al reporte para revisarlo con Claude Design, sin hacer fallar la prueba.

export interface Problema {
  nivel: 'error' | 'aviso';
  tipo: string;
  detalle: string;
}

export interface OpcionesRevision {
  /** Alto de la barra de estado o la isla (env(safe-area-inset-top) del perfil). */
  seguroArriba: number;
  /** Franja del indicador de inicio que ningún control puede tocar (0 en el SE). */
  zonaIndicador: number;
  tactilMinimo: number;
}

export function revisarPantalla(o: OpcionesRevision): Problema[] {
  const problemas: Problema[] = [];
  const agregar = (nivel: Problema['nivel'], tipo: string, detalle: string) => {
    if (!problemas.some((p) => p.tipo === tipo && p.detalle === detalle)) problemas.push({ nivel, tipo, detalle });
  };
  const ancho = window.innerWidth;
  const alto = window.innerHeight;

  // Con una hoja inferior abierta, el resto queda bajo el scrim: solo se revisa la hoja, y aparte se
  // comprueba que nada quede por encima de ella.
  const hojaAbierta = document.querySelector('[role="dialog"]');
  const visible = (el: Element): boolean => {
    if (el.closest('[hidden], [inert], [aria-hidden="true"]')) return false;
    if (hojaAbierta && !hojaAbierta.contains(el)) return false;
    const estilo = getComputedStyle(el);
    if (estilo.visibility === 'hidden' || estilo.display === 'none' || Number(estilo.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const nombre = (el: Element): string => {
    const texto = (el.getAttribute('aria-label') ?? el.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 50);
    const clase = typeof el.className === 'string' && el.className ? `.${el.className.split(' ')[0]}` : '';
    return `${el.tagName.toLowerCase()}${clase} "${texto}"`;
  };
  const rectsDeTexto = (el: Element): DOMRect[] => {
    const rects: DOMRect[] = [];
    for (const nodo of el.childNodes) {
      if (nodo.nodeType !== Node.TEXT_NODE || !nodo.textContent?.trim()) continue;
      const rango = document.createRange();
      rango.selectNodeContents(nodo);
      for (const r of rango.getClientRects()) if (r.width > 0 && r.height > 0) rects.push(r);
    }
    return rects;
  };
  /**
   * El rectángulo de un texto se queda con el alto del cuerpo de la letra (1 em, centrado): el de
   * `getClientRects` incluye el ascendente y el descendente de la fuente, que con un interlineado
   * de 1 (los títulos del diseño) pisa la línea de arriba sin que se toquen las letras.
   */
  const cuerpoDeLetra = (r: DOMRect, tamano: number): DOMRect => {
    const sobra = Math.max(0, (r.height - tamano) / 2);
    return new DOMRect(r.x, r.y + sobra, r.width, r.height - 2 * sobra);
  };
  const cruzan = (a: DOMRect, b: DOMRect, margen = 1) =>
    Math.min(a.right, b.right) - Math.max(a.left, b.left) > margen && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > margen;

  // 1. Desborde horizontal de la página o de la pantalla visible.
  if (document.documentElement.scrollWidth > ancho + 1) {
    agregar('error', 'desborde horizontal', `la página mide ${document.documentElement.scrollWidth} px de ancho en una pantalla de ${ancho}`);
  }
  for (const main of document.querySelectorAll('main.pantalla')) {
    if (visible(main) && main.scrollWidth > main.clientWidth + 1) {
      agregar('error', 'desborde horizontal', `${nombre(main)}: ${main.scrollWidth} px de contenido en ${main.clientWidth}`);
    }
  }

  // 2. Textos: fuera de la pantalla, cortados por un contenedor, truncados, encimados, contraste,
  //    letra muy chica y fuentes que no cargaron.
  const conTexto = [...document.querySelectorAll('body *')].filter(
    (el) => !['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(el.tagName) && visible(el) && rectsDeTexto(el).length > 0,
  );

  const color = (valor: string): [number, number, number, number] => {
    const m = valor.match(/rgba?\(([^)]+)\)/);
    if (!m) return [0, 0, 0, 0];
    const [r = 0, g = 0, b = 0, a = 1] = m[1]!.split(/[,\s/]+/).filter(Boolean).map(Number);
    return [r, g, b, a];
  };
  const mezclar = (arriba: number[], abajo: number[]) => {
    const a = arriba[3]!;
    return [0, 1, 2].map((i) => arriba[i]! * a + abajo[i]! * (1 - a)).concat(1);
  };
  const fondoDe = (el: Element): number[] | null => {
    const capas: number[][] = [];
    for (let actual: Element | null = el; actual; actual = actual.parentElement) {
      const estilo = getComputedStyle(actual);
      if (estilo.backgroundImage !== 'none') return null;
      const c = color(estilo.backgroundColor);
      if (c[3]! > 0) capas.push(c);
      if (c[3] === 1) break;
    }
    let fondo = [255, 255, 255, 1];
    for (const capa of capas.reverse()) fondo = mezclar(capa, fondo);
    return fondo;
  };
  const luminancia = ([r, g, b]: number[]) => {
    const canal = (v: number) => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * canal(r!) + 0.7152 * canal(g!) + 0.0722 * canal(b!);
  };

  const caras = [...document.fonts];
  const textos: { el: Element; rects: DOMRect[]; letras: DOMRect[] }[] = [];
  for (const el of conTexto) {
    const rects = rectsDeTexto(el);
    const estilo = getComputedStyle(el);
    const letras = rects.map((r) => cuerpoDeLetra(r, parseFloat(estilo.fontSize)));
    textos.push({ el, rects, letras });

    for (const r of rects) {
      if (r.left < -0.5 || r.right > ancho + 0.5) agregar('error', 'texto fuera de la pantalla', `${nombre(el)} va de x=${Math.round(r.left)} a ${Math.round(r.right)}`);
    }
    // Contenedores que recortan (overflow hidden o clip; los que hacen scroll no cuentan).
    for (let padre: Element | null = el; padre && padre !== document.body; padre = padre.parentElement) {
      const e = getComputedStyle(padre);
      const caja = padre.getBoundingClientRect();
      const recortaX = e.overflowX === 'hidden' || e.overflowX === 'clip';
      const recortaY = e.overflowY === 'hidden' || e.overflowY === 'clip';
      if (!recortaX && !recortaY) continue;
      for (const r of letras) {
        const fueraX = recortaX && (r.left < caja.left - 1 || r.right > caja.right + 1);
        const fueraY = recortaY && (r.top < caja.top - 1 || r.bottom > caja.bottom + 1);
        if (fueraX || fueraY) agregar('error', 'texto cortado', `${nombre(el)} se sale de ${nombre(padre)}`);
      }
    }
    if ((estilo.overflowX === 'hidden' || estilo.textOverflow === 'ellipsis') && el.scrollWidth > el.clientWidth + 1) {
      agregar('error', 'texto truncado', `${nombre(el)}: ${el.scrollWidth} px de texto en ${el.clientWidth}`);
    }

    const tamano = parseFloat(estilo.fontSize);
    if (tamano < 10) agregar('error', 'letra muy chica', `${nombre(el)} usa ${tamano} px`);

    if (!el.closest(':disabled')) {
      const fondo = fondoDe(el);
      if (fondo) {
        const frente = mezclar(color(estilo.color), fondo);
        const [claro, oscuro] = [luminancia(frente), luminancia(fondo)].sort((a, b) => b - a);
        const contraste = (claro! + 0.05) / (oscuro! + 0.05);
        const grande = tamano >= 24 || (tamano >= 18.66 && Number(estilo.fontWeight) >= 700);
        const minimo = grande ? 3 : 4.5;
        if (contraste < minimo) {
          agregar('aviso', 'contraste bajo', `${nombre(el)}: ${contraste.toFixed(2)}:1 (mínimo ${minimo}:1, ${estilo.color} sobre rgb(${fondo.slice(0, 3).map(Math.round).join(', ')}))`);
        }
      }
    }

    // La primera familia de la lista tiene que estar cargada en el peso y el estilo pedidos; si no,
    // Safari usa otra fuente o engorda la que hay.
    const familia = estilo.fontFamily.split(',')[0]!.trim().replace(/^["']|["']$/g, '');
    if (!/^(system-ui|-apple-system|ui-[a-z]+|serif|sans-serif|monospace|Menlo|SFMono-Regular|Georgia)$/.test(familia)) {
      const peso = Number(estilo.fontWeight);
      const italica = estilo.fontStyle !== 'normal';
      const delaFamilia = caras.filter((c) => c.family.replace(/^["']|["']$/g, '') === familia);
      const cubre = (c: FontFace) => {
        const [min, max = min] = c.weight.split(' ').map(Number);
        return peso >= min! && peso <= max! && (c.style !== 'normal') === italica;
      };
      if (delaFamilia.length === 0) agregar('error', 'fuente sin definir', `${nombre(el)} pide "${familia}"`);
      else if (!delaFamilia.some((c) => cubre(c) && c.status === 'loaded')) {
        agregar('error', 'fuente sin cargar', `${nombre(el)} pide "${familia}" ${peso}${italica ? ' cursiva' : ''}; hay: ${delaFamilia.map((c) => `${c.weight} ${c.style} ${c.status}`).join(', ')}`);
      }
    }
  }
  for (let i = 0; i < textos.length; i++) {
    for (let j = i + 1; j < textos.length; j++) {
      const a = textos[i]!;
      const b = textos[j]!;
      if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
      if (a.letras.some((ra) => b.letras.some((rb) => cruzan(ra, rb, 1)))) {
        agregar('error', 'textos encimados', `${nombre(a.el)} y ${nombre(b.el)}`);
      }
    }
  }

  // 3. Controles: fuera de la pantalla, bajo la isla o el indicador de inicio, encimados, sin
  //    nombre o con un objetivo táctil chico.
  const controles = [...document.querySelectorAll('button, a[href], input:not([type="hidden"]), select, textarea, [role="button"]')].filter(visible);
  const hayHoja = hojaAbierta !== null;
  for (const el of controles) {
    const r = el.getBoundingClientRect();
    if (r.left < -0.5 || r.right > ancho + 0.5) agregar('error', 'control fuera de la pantalla', `${nombre(el)} va de x=${Math.round(r.left)} a ${Math.round(r.right)}`);
    // Lo que se ve encima del centro del control tiene que ser el control (o algo suyo). La barra
    // inferior flotante puede tapar lo que sigue más abajo con scroll (eso lo revisa el punto 7).
    const [cx, cy] = [r.left + r.width / 2, r.top + r.height / 2];
    const encima = cx >= 0 && cx < ancho && cy >= 0 && cy < alto ? document.elementFromPoint(cx, cy) : null;
    if (encima && !el.contains(encima) && !encima.contains(el) && !encima.closest('.barra-inferior')) {
      agregar('error', 'control tapado', `${nombre(el)} queda debajo de ${nombre(encima)}`);
    }
    if (r.top < o.seguroArriba - 0.5 && r.bottom > 0) agregar('error', 'control bajo la isla o la barra de estado', `${nombre(el)} empieza en y=${Math.round(r.top)} (zona segura: ${o.seguroArriba} px)`);
    // Si la pantalla todavía puede bajar, el control sube con el scroll: cuenta dónde queda al final.
    const contenedor = el.closest('main.pantalla');
    const resto = contenedor ? Math.max(0, contenedor.scrollHeight - contenedor.clientHeight - contenedor.scrollTop) : 0;
    const fondoAlFinal = getComputedStyle(el).position === 'fixed' ? r.bottom : r.bottom - resto;
    if (o.zonaIndicador > 0 && fondoAlFinal > alto - o.zonaIndicador + 0.5 && r.top - resto < alto) {
      agregar('error', 'control sobre el indicador de inicio', `${nombre(el)} termina en y=${Math.round(fondoAlFinal)} de ${alto} con la pantalla bajada hasta el final`);
    }
    if (!(el.getAttribute('aria-label') ?? el.textContent ?? '').trim()) agregar('error', 'control sin nombre', nombre(el));
    if (r.width < o.tactilMinimo - 0.5 || r.height < o.tactilMinimo - 0.5) {
      agregar('aviso', 'objetivo táctil chico', `${nombre(el)}: ${Math.round(r.width)} × ${Math.round(r.height)} px (mínimo ${o.tactilMinimo})`);
    }
  }
  for (let i = 0; i < controles.length; i++) {
    for (let j = i + 1; j < controles.length; j++) {
      const a = controles[i]!;
      const b = controles[j]!;
      if (a.contains(b) || b.contains(a)) continue;
      if (cruzan(a.getBoundingClientRect(), b.getBoundingClientRect())) agregar('error', 'controles encimados', `${nombre(a)} y ${nombre(b)}`);
    }
  }

  // 4. Textos bajo la isla o la barra de estado, con la pantalla arriba del todo.
  for (const { el, letras } of textos) {
    if (letras.some((r) => r.top < o.seguroArriba - 0.5 && r.bottom > 0)) {
      agregar('error', 'texto bajo la isla o la barra de estado', `${nombre(el)} empieza en y=${Math.round(Math.min(...letras.map((r) => r.top)))} (zona segura: ${o.seguroArriba} px)`);
    }
  }

  // 5. La hoja inferior entera dentro de la pantalla y bajo la zona segura.
  for (const hoja of document.querySelectorAll('[role="dialog"]')) {
    const r = hoja.getBoundingClientRect();
    if (r.top < o.seguroArriba || r.bottom > alto + 0.5 || r.left < 0 || r.right > ancho) {
      agregar('error', 'hoja fuera de lugar', `${nombre(hoja)} ocupa y=${Math.round(r.top)}..${Math.round(r.bottom)}, x=${Math.round(r.left)}..${Math.round(r.right)}`);
    }
  }

  // 6. Imágenes rotas.
  for (const img of document.querySelectorAll('img')) {
    if (visible(img) && img.complete && img.naturalWidth === 0) agregar('error', 'imagen rota', img.currentSrc || img.src);
  }

  // 7. La barra inferior no tapa contenido: con la pantalla bajada hasta el final, lo último
  //    queda por encima de la barra.
  const barra = document.querySelector('.barra-inferior');
  const pantalla = document.querySelector('main.pantalla:not([hidden])');
  if (barra && pantalla && visible(barra) && !hayHoja) {
    const arriba = pantalla.scrollTop;
    pantalla.scrollTop = pantalla.scrollHeight;
    const tope = barra.getBoundingClientRect().top;
    for (const el of pantalla.querySelectorAll('*')) {
      if (!visible(el) || el.children.length > 0) continue;
      const r = el.getBoundingClientRect();
      if (r.bottom > tope + 0.5) agregar('error', 'la barra inferior tapa contenido', `${nombre(el)} termina en y=${Math.round(r.bottom)}; la barra empieza en ${Math.round(tope)}`);
    }
    pantalla.scrollTop = arriba;
  }

  return problemas;
}
