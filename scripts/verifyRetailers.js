const { ethers } = require("hardhat");
const fs = require('fs');

async function main() {
  console.log("Verifying retailer enrollments...");
  // Read contract addresses from file
  const addresses = JSON.parse(fs.readFileSync('deployed-addresses.json', 'utf8'));
  const retailerManagerAddress = addresses.retailerManager;

  // Load the retailer wallets
  const walletData = JSON.parse(fs.readFileSync('retailer-wallets.json', 'utf8'));
  const retailerAddresses = walletData.map(data => data.address);

  const retailerManager = await ethers.getContractAt("retailerManager", retailerManagerAddress);

  console.log("Checking enrollment status for all retailers...");
  let enrolledCount = 0;
  let failedCount = 0;

  for (let i = 0; i < retailerAddresses.length; i++) {
    try {
      const address = retailerAddresses[i];
      // Access the retailers mapping
      const retailer = await retailerManager.retailers(address);
      // Check if regNo is set (non-zero)
      if (retailer.regNo > 0) {
        console.log(`Retailer ${i+1}: Successfully enrolled - ${retailer.name}`);
        enrolledCount++;
      } else {
        console.log(`Retailer ${i+1}: Not enrolled`);
        failedCount++;
      }
    } catch (error) {
      console.error(`Retailer ${i+1}: Error - ${error.message}`);
      failedCount++;
    }
  }

  console.log(`Verification complete!`);
  console.log(`${enrolledCount} retailers successfully enrolled`);
  console.log(`${failedCount} retailers failed enrollment`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });