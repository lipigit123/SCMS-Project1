const { ethers } = require("hardhat");
const fs = require('fs');

async function main() {
  console.log("Verifying manufacturer enrollments...");
  // Read contract addresses from file
  const addresses = JSON.parse(fs.readFileSync('deployed-addresses.json', 'utf8'));
  const manufacturerManagerAddress = addresses.manufacturerManager;

  // Load the manufacturer wallets
  const walletData = JSON.parse(fs.readFileSync('manufacturer-wallets.json', 'utf8'));
  const manufacturerAddresses = walletData.map(data => data.address);

  const manufacturerManager = await ethers.getContractAt("manufacturerManager", manufacturerManagerAddress);

  console.log("Checking enrollment status for all manufacturers...");
  let enrolledCount = 0;
  let failedCount = 0;

  for (let i = 0; i < manufacturerAddresses.length; i++) {
    try {
      const address = manufacturerAddresses[i];
      // Access the manufacturers mapping
      const manufacturer = await manufacturerManager.manufacturers(address);
      // Check if regNo is set (non-zero)
      if (manufacturer.regNo > 0) {
        console.log(`Manufacturer ${i+1}: Successfully enrolled - ${manufacturer.name}`);
        enrolledCount++;
      } else {
        console.log(`Manufacturer ${i+1}: Not enrolled`);
        failedCount++;
      }
    } catch (error) {
      console.error(`Manufacturer ${i+1}: Error - ${error.message}`);
      failedCount++;
    }
  }

  console.log(`Verification complete!`);
  console.log(`${enrolledCount} manufacturers successfully enrolled`);
  console.log(`${failedCount} manufacturers failed enrollment`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });