const { Worker } = require("worker_threads");
const path = require("path");
const os = require("os");
const numCPUs = os.cpus().length;
const batchSize = 100000n; // Define an appropriate batch size for each worker
const padTo64 = require("./padto64");

function createWorker(batchStart, batchEnd, searchAddress) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(path.join(__dirname, "./worker.js"));
    worker.postMessage({
      batchStart: batchStart.toString(),
      batchEnd: batchEnd.toString(),
      searchAddress,
    });

    worker.on("message", (message) => {
      if (message.error) {
        reject(message.error);
      } else {
        resolve(message.result);
      }
    });

    worker.on("error", (error) => {
      reject(error);
    });

    worker.on("exit", (code) => {
      if (code !== 0) {
        reject(new Error(`Worker stopped with exit code ${code}`));
      }
    });
  });
}

async function generateHexRange(range, searchAddress) {
  const [startHex, endHex] = range.split(":").map((hex) => padTo64(hex));
  const start = BigInt("0x" + startHex);
  const end = BigInt("0x" + endHex);

  if (start < 0n || end < 0n || start > end) {
    return "Invalid range";
  }

  const totalRange = end - start + 1n;
  const workerCount = numCPUs;
  const workerBatchSize = totalRange / BigInt(workerCount);

  let promises = [];
  for (let i = 0n; i < BigInt(workerCount); i++) {
    const workerStart = start + i * workerBatchSize;
    const workerEnd =
      i === BigInt(workerCount - 1) ? end : workerStart + workerBatchSize - 1n;
    promises.push(createWorker(workerStart, workerEnd, searchAddress));
  }

  try {
    const results = await Promise.all(promises);
    // console.log(results);

    // for (const obj of results) {
    //   if (Array.isArray(obj.result)) {
    //     // Handle the case where result is an array
    //     if (
    //       obj.result.some(
    //         (r) =>
    //           r.uncompressedAddress === searchAddress ||
    //           r.compressedAddress === searchAddress
    //       )
    //     ) {
    //       return obj.result.find(
    //         (r) =>
    //           r.uncompressedAddress === searchAddress ||
    //           r.compressedAddress === searchAddress
    //       );
    //     }
    //   } else if (obj.result && typeof obj.result === "object") {
    //     // Handle the case where result is a single object
    //     if (
    //       obj.result.uncompressedAddress === searchAddress ||
    //       obj.result.compressedAddress === searchAddress
    //     ) {
    //       return obj.result;
    //     }
    //   } else {
    //     console.error("Unexpected obj.result structure:", obj.result);
    //   }
    // }

    // return { message: "Address not found" };

    for (const resultArray of results) {
      if (Array.isArray(resultArray)) {
        for (const obj of resultArray) {
          if (
            obj.uncompressedAddress === searchAddress ||
            obj.compressedAddress === searchAddress
          ) {
            return obj;
          }
        }
      } else {
        console.error("Unexpected obj.result structure:", resultArray);
      }
    }

    return { message: "Address not found" };
  } catch (error) {
    console.error("Error during hex range generation:", error);
    throw error;
  }
}

(async () => {
  const range = "20000000000000000:3ffffffffffffffff";
  const searchAddress = "13zb1hQbWVsc2S7ZTZnP2G4undNNpdh5so";
  const result = await generateHexRange(range, searchAddress);
  console.log(result);
})();
