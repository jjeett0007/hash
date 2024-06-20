const { Worker } = require("worker_threads");
const path = require("path");
const os = require("os");

const numCPUs = os.cpus().length;

function generateHexRange(range, searchAddress) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      path.resolve(__dirname, "hexGeneratorWorker.js"),
      {
        workerData: { range, searchAddress },
      }
    );

    worker.on("message", (result) => {
      if (result.found) {
        // console.log("Found address:", result.data);
        resolve(result.data);
        worker.terminate();
      } else if (result.progress !== undefined) {
        console.log(`Progress: ${result.progress.toFixed(2)}%`);
      }
    });

    worker.on("error", (error) => {
      reject(error);
    });

    worker.on("exit", (code) => {
      console.log(code);
      if (code !== 0) {
        reject(new Error(`Worker stopped with exit code ${code}`));
      } else {
        resolve({ message: "Address not found" });
      }
    });
  });
}


(async () => {
  const range = "1:10000";
  const searchAddress = "1QCbW9HWnwQWiQqVo5exhAnmfqKRrCRsvW";
  try {
    const result = await generateHexRange(range, searchAddress);
    console.log(result);
  } catch (error) {
    console.error("Error during hex range generation:", error);
  }
})();
