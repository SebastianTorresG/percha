// Genera public/icono-180.png: un cuadrado liso con el accent claro de tokens.json (#b9776a).
// Es solo para reconocer el spike en la pantalla de inicio del iPhone.

import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const LADO = 180;
const [R, G, B] = [0xb9, 0x77, 0x6a];

const crcTabla = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTabla[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

function bloque(tipo, datos) {
  const largo = Buffer.alloc(4);
  largo.writeUInt32BE(datos.length);
  const cuerpo = Buffer.concat([Buffer.from(tipo, 'ascii'), datos]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(cuerpo));
  return Buffer.concat([largo, cuerpo, crc]);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(LADO, 0);
ihdr.writeUInt32BE(LADO, 4);
ihdr[8] = 8; // bits por canal
ihdr[9] = 2; // RGB

const fila = Buffer.concat([Buffer.from([0]), Buffer.from(Array(LADO).fill([R, G, B]).flat())]);
const pixeles = Buffer.concat(Array(LADO).fill(fila));

writeFileSync(
  'public/icono-180.png',
  Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    bloque('IHDR', ihdr),
    bloque('IDAT', deflateSync(pixeles)),
    bloque('IEND', Buffer.alloc(0)),
  ]),
);
console.log('✓ public/icono-180.png');
