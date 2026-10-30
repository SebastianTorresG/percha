// CRC-32 (IEEE 802.3, el de ZIP) con tabla de 256 entradas (research R-10). Los blobs se leen por
// trozos con `blob.stream()` para no copiar una imagen grande entera a la memoria.

const TABLA = (() => {
  const tabla = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    tabla[n] = c >>> 0;
  }
  return tabla;
})();

/** CRC-32 de `bytes`; con `previo`, continúa el de los bytes anteriores. */
export function crc32(bytes: Uint8Array, previo = 0): number {
  let c = (previo ^ 0xffffffff) >>> 0;
  for (let i = 0; i < bytes.length; i++) c = TABLA[(c ^ bytes[i]!) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export async function crc32DeBlob(blob: Blob): Promise<number> {
  const lector = blob.stream().getReader();
  let crc = 0;
  for (;;) {
    const { done, value } = await lector.read();
    if (done) return crc;
    crc = crc32(value, crc);
  }
}

/** 8 dígitos hexadecimales en minúscula, como en manifest.json. */
export function crcHex(crc: number): string {
  return (crc >>> 0).toString(16).padStart(8, '0');
}
