const { Worker } = require("worker_threads");
const path = require("path");

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
        resolve(result.data);
        worker.terminate();
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
  const range = "10000:1ffff";
  const searchAddress = "1E6NuFjCi27W5zoXg8TRdcSRq84zJeBW3k";
  try {
    const result = await generateHexRange(range, searchAddress);
    console.log(result);
  } catch (error) {
    console.error("Error during hex range generation:", error);
  }
})();
