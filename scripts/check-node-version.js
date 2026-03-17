const major = Number(process.versions.node.split(".")[0]);
const min = 18;
const maxExclusive = 23;

if (Number.isNaN(major) || major < min || major >= maxExclusive) {
  console.error("");
  console.error("Unsupported Node.js version for this project.");
  console.error(`Detected: v${process.versions.node}`);
  console.error("Required: >=18 and <23 (Node 20 LTS recommended).");
  console.error("");
  console.error("Fix:");
  console.error("1. Switch to Node 20 LTS (e.g., nvm use 20.17.0).");
  console.error("2. Reinstall deps if needed: npm install");
  console.error("3. Start again: npm start");
  process.exit(1);
}

console.log(`Node version OK: v${process.versions.node}`);
