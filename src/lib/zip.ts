type ZipFile = {
  name: string;
  data: Uint8Array;
};

const crcTable = new Uint32Array(256);

for (let index = 0; index < 256; index += 1) {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  crcTable[index] = value >>> 0;
}

function crc32(data: Uint8Array) {
  let value = 0xffffffff;
  for (let index = 0; index < data.length; index += 1) {
    const byte = data[index];
    value = crcTable[(value ^ byte) & 0xff] ^ (value >>> 8);
  }
  return (value ^ 0xffffffff) >>> 0;
}

function uint16(value: number) {
  const bytes = new Uint8Array(2);
  new DataView(bytes.buffer).setUint16(0, value, true);
  return bytes;
}

function uint32(value: number) {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value, true);
  return bytes;
}

function concat(parts: Uint8Array[]) {
  const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(totalLength);
  let offset = 0;

  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index];
    output.set(part, offset);
    offset += part.length;
  }

  return output;
}

function safeZipName(name: string, fallback: string) {
  const cleaned = name.replace(/[\\/:*?"<>|]/g, "-").trim();
  return cleaned || fallback;
}

export function createZip(files: ZipFile[]) {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  files.forEach((file, index) => {
    const nameBytes = encoder.encode(safeZipName(file.name, `photo-${index + 1}`));
    const checksum = crc32(file.data);

    const localHeader = concat([
      uint32(0x04034b50),
      uint16(20),
      uint16(0),
      uint16(0),
      uint16(0),
      uint16(0),
      uint32(checksum),
      uint32(file.data.length),
      uint32(file.data.length),
      uint16(nameBytes.length),
      uint16(0),
      nameBytes
    ]);

    localParts.push(localHeader, file.data);

    centralParts.push(
      concat([
        uint32(0x02014b50),
        uint16(20),
        uint16(20),
        uint16(0),
        uint16(0),
        uint16(0),
        uint16(0),
        uint32(checksum),
        uint32(file.data.length),
        uint32(file.data.length),
        uint16(nameBytes.length),
        uint16(0),
        uint16(0),
        uint16(0),
        uint16(0),
        uint32(0),
        uint32(offset),
        nameBytes
      ])
    );

    offset += localHeader.length + file.data.length;
  });

  const centralDirectory = concat(centralParts);
  const endRecord = concat([
    uint32(0x06054b50),
    uint16(0),
    uint16(0),
    uint16(files.length),
    uint16(files.length),
    uint32(centralDirectory.length),
    uint32(offset),
    uint16(0)
  ]);

  return concat([...localParts, centralDirectory, endRecord]);
}
