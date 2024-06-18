function padTo64(hexString) {
  return hexString.toUpperCase().padStart(64, "0");
}

module.exports = padTo64;
