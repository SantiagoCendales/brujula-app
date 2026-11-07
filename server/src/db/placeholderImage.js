import { crc32, deflateSync } from 'node:zlib';

// Builds a PNG in memory (a vertical gradient of one color) so the demo data has photos
// without shipping real images or adding an image library.

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(typeAndData));
  return Buffer.concat([length, typeAndData, checksum]);
}

export function placeholderPng([red, green, blue], { width = 800, height = 600 } = {}) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // color type: RGB

  const rowLength = 1 + width * 3; // each row starts with filter byte 0
  const pixels = Buffer.alloc(rowLength * height);
  for (let y = 0; y < height; y++) {
    const shade = 0.75 + 0.25 * (y / height);
    for (let x = 0; x < width; x++) {
      const offset = y * rowLength + 1 + x * 3;
      pixels[offset] = Math.round(red * shade);
      pixels[offset + 1] = Math.round(green * shade);
      pixels[offset + 2] = Math.round(blue * shade);
    }
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(pixels)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
