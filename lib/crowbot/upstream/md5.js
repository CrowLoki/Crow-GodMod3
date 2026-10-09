// Dependency-free MD5 (RFC 1321) over bytes, returning lowercase hex.
// The recovered catalogue signature is an MD5 of a timestamp-and-marker
// string; the Workers runtime and Node do not share an MD5 in WebCrypto,
// so the digest is computed here and unit-tested against Node's own.

const S = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
  5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
  4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
  6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
];

const K = new Uint32Array(64);
for (let index = 0; index < 64; index += 1) {
  K[index] = Math.floor(Math.abs(Math.sin(index + 1)) * 2 ** 32) >>> 0;
}

function rotateLeft(value, shift) {
  return ((value << shift) | (value >>> (32 - shift))) >>> 0;
}

function hex32LittleEndian(value) {
  let text = "";
  for (let byte = 0; byte < 4; byte += 1) {
    text += ((value >>> (byte * 8)) & 0xff).toString(16).padStart(2, "0");
  }
  return text;
}

export function md5Hex(input) {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(input);
  const length = bytes.length;
  const paddedLength = Math.ceil((length + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLength);
  padded.set(bytes);
  padded[length] = 0x80;
  const view = new DataView(padded.buffer);
  const bitLength = length * 8;
  view.setUint32(paddedLength - 8, bitLength >>> 0, true);
  view.setUint32(paddedLength - 4, Math.floor(bitLength / 2 ** 32) >>> 0, true);

  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;
  const words = new Uint32Array(16);

  for (let offset = 0; offset < paddedLength; offset += 64) {
    for (let index = 0; index < 16; index += 1) {
      words[index] = view.getUint32(offset + index * 4, true);
    }
    let a = a0;
    let b = b0;
    let c = c0;
    let d = d0;
    for (let index = 0; index < 64; index += 1) {
      let mix;
      let source;
      if (index < 16) {
        mix = (b & c) | (~b & d);
        source = index;
      } else if (index < 32) {
        mix = (d & b) | (~d & c);
        source = (5 * index + 1) % 16;
      } else if (index < 48) {
        mix = b ^ c ^ d;
        source = (3 * index + 5) % 16;
      } else {
        mix = c ^ (b | ~d);
        source = (7 * index) % 16;
      }
      const sum = (mix + a + K[index] + words[source]) >>> 0;
      a = d;
      d = c;
      c = b;
      b = (b + rotateLeft(sum, S[index])) >>> 0;
    }
    a0 = (a0 + a) >>> 0;
    b0 = (b0 + b) >>> 0;
    c0 = (c0 + c) >>> 0;
    d0 = (d0 + d) >>> 0;
  }
  return hex32LittleEndian(a0) + hex32LittleEndian(b0) + hex32LittleEndian(c0) + hex32LittleEndian(d0);
}
