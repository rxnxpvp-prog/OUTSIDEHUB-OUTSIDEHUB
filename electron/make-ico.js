// Converte icon.png para icon.ico (formato ICO válido com header correto)
const fs = require("fs");
const path = require("path");

const pngPath = path.join(__dirname, "icons", "icon.png");
const icoPath = path.join(__dirname, "icons", "icon.ico");

if (!fs.existsSync(pngPath)) {
  console.error("icon.png não encontrado");
  process.exit(1);
}

const png = fs.readFileSync(pngPath);
const pngSize = png.length;

// ICO header: 6 bytes
// ICONDIRENTRY: 16 bytes
// Total header: 22 bytes
const header = Buffer.alloc(22);

// ICONDIR
header.writeUInt16LE(0, 0);   // reserved
header.writeUInt16LE(1, 2);   // type = 1 (ICO)
header.writeUInt16LE(1, 4);   // count = 1 image

// ICONDIRENTRY
header.writeUInt8(0, 6);      // width (0 = 256)
header.writeUInt8(0, 7);      // height (0 = 256)
header.writeUInt8(0, 8);      // color count
header.writeUInt8(0, 9);      // reserved
header.writeUInt16LE(1, 10);  // planes
header.writeUInt16LE(32, 12); // bit count
header.writeUInt32LE(pngSize, 14); // size of image data
header.writeUInt32LE(22, 18); // offset of image data

const ico = Buffer.concat([header, png]);
fs.writeFileSync(icoPath, ico);
console.log("icon.ico criado com sucesso:", icoPath);
