const { parentPort, workerData } = require("worker_threads");
const bs58check = require("bs58check");
const secp256k1 = require("secp256k1");
const crypto = require("crypto");

function padTo64(hex) {
  return hex.padStart(64, "0");
}

function hash160(buffer) {
  return crypto
    .createHash("ripemd160")
    .update(crypto.createHash("sha256").update(buffer).digest())
    .digest();
}

function toBitcoinAddress(publicKey, compressed = true) {
  const prefix = Buffer.from([0x00]); // Mainnet prefix for Bitcoin addresses
  const hash = hash160(publicKey);
  const address = Buffer.concat([prefix, hash]);
  return bs58check.encode(address);
}

function generateAndCheckAddress(hex, searchAddress) {
  const privateKeyBuffer = Buffer.from(hex, "hex");

  // Uncompressed WIF and address
  const wifBufferUncompressed = Buffer.concat([
    Buffer.from([0x80]),
    privateKeyBuffer,
  ]);
  const base58CheckUncompressed = bs58check.encode(wifBufferUncompressed);
  const publicKeyUncompressed = secp256k1.publicKeyCreate(
    privateKeyBuffer,
    false
  );
  const uncompressedAddress = toBitcoinAddress(publicKeyUncompressed, false);

  // Compressed WIF and address
  const wifBufferCompressed = Buffer.concat([
    Buffer.from([0x80]),
    privateKeyBuffer,
    Buffer.from([0x01]),
  ]);
  const base58CheckCompressed = bs58check.encode(wifBufferCompressed);
  const publicKeyCompressed = secp256k1.publicKeyCreate(privateKeyBuffer, true);
  const compressedAddress = toBitcoinAddress(publicKeyCompressed, true);

  const result = {
    hex,
    base58CheckUncompressed,
    base58CheckCompressed,
    uncompressedAddress,
    compressedAddress,
  };

  //   console.log(result);

  if (
    uncompressedAddress === searchAddress ||
    compressedAddress === searchAddress
  ) {
    return result;
  }

  return null;
}

function hexRangeToBigInt(range) {
  const [startHex, endHex] = range.split(":");
  return {
    start: BigInt(`0x${startHex}`),
    end: BigInt(`0x${endHex}`),
  };
}

const { range, searchAddress } = workerData;
const { start, end } = hexRangeToBigInt(range);
const total = end - start + 1n;

for (let i = start; i <= end; i++) {
  const hex = padTo64(i.toString(16));
  const result = generateAndCheckAddress(hex, searchAddress);

  if (result) {
    parentPort.postMessage({ found: true, data: result });
    break;
  }

  const progress = ((i - start) * 100n) / total;
  parentPort.postMessage({ progress: Number(progress) });
}

parentPort.postMessage({ found: false });
