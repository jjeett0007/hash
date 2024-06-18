const bs58check = require("bs58check");
const { parentPort } = require("worker_threads");
const crypto = require("crypto");
const secp256k1 = require("secp256k1");
const padTo64 = require("./padto64");

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

function processBatch(batchStart, batchEnd, searchAddress) {
  let results = [];

  for (let i = BigInt(batchStart); i <= BigInt(batchEnd); i++) {
    let hexString = padTo64(i.toString(16));
    let privateKeyBuffer = Buffer.from(hexString, "hex");

    let wifBufferUncompressed = Buffer.concat([
      Buffer.from([0x80]),
      privateKeyBuffer,
    ]);
    let base58CheckUncompressed = bs58check.encode(wifBufferUncompressed);

    let wifBufferCompressed = Buffer.concat([
      Buffer.from([0x80]),
      privateKeyBuffer,
      Buffer.from([0x01]),
    ]);
    let base58CheckCompressed = bs58check.encode(wifBufferCompressed);

    let publicKeyUncompressed = secp256k1.publicKeyCreate(
      privateKeyBuffer,
      false
    );
    let publicKeyCompressed = secp256k1.publicKeyCreate(privateKeyBuffer, true);

    let uncompressedAddress = toBitcoinAddress(publicKeyUncompressed, false);
    let compressedAddress = toBitcoinAddress(publicKeyCompressed, true);

    results.push({
      hex: hexString,
      base58CheckUncompressed: base58CheckUncompressed,
      base58CheckCompressed: base58CheckCompressed,
      uncompressedAddress: uncompressedAddress,
      compressedAddress: compressedAddress,
    });

    if (
      uncompressedAddress === searchAddress ||
      compressedAddress === searchAddress
    ) {
      return {
        result: [
          {
            hex: hexString,
            base58CheckUncompressed: base58CheckUncompressed,
            base58CheckCompressed: base58CheckCompressed,
            uncompressedAddress: uncompressedAddress,
            compressedAddress: compressedAddress,
          },
        ],
      };
    }
  }

  return { result: results };
}

parentPort.on("message", (message) => {
  const { batchStart, batchEnd, searchAddress } = message;
  console.log(
    `Worker received message: batchStart=${batchStart}, batchEnd=${batchEnd}, searchAddress=${searchAddress}`
  );

  try {
    const result = processBatch(batchStart, batchEnd, searchAddress);
    parentPort.postMessage(result);
  } catch (error) {
    parentPort.postMessage({ error: error.message });
  }
});
