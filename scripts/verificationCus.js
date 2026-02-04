const { ethers } = require("hardhat");
const fs = require('fs');

async function main() {
  console.log("Verifying customer enrollments...");

  // Read contract addresses from file
  const addresses = JSON.parse(fs.readFileSync('deployed-addresses.json', 'utf8'));
  const customerManagerAddress = addresses.customerManager;

  // Load the customer wallets
  const walletData = JSON.parse(fs.readFileSync('customer-wallets.json', 'utf8'));
  const customerAddresses = walletData.map(data => data.address);

  const customerManager = await ethers.getContractAt("customerManager", customerManagerAddress);

  console.log("Checking enrollment status for all customers...");

  let enrolledCount = 0;
  let failedCount = 0;

  for (let i = 0; i < customerAddresses.length; i++) {
    try {
      const address = customerAddresses[i];
      // Use the correct function signature to access the customers mapping
      const customerInfo = await customerManager.customers(address);
      
      if (customerInfo.isEnrolled) {
        console.log(`Customer ${i+1}: Successfully enrolled - ${customerInfo.name}`);
        enrolledCount++;
      } else {
        console.log(`Customer ${i+1}: Not enrolled`);
        failedCount++;
      }
    } catch (error) {
      console.error(`Customer ${i+1}: Error - ${error.message}`);
      failedCount++;
    }
  }

  console.log(`Verification complete!`);
  console.log(`${enrolledCount} customers successfully enrolled`);
  console.log(`${failedCount} customers failed enrollment`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });