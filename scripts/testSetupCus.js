// testSetup.js
const { ethers } = require("hardhat");
const fs = require('fs');

async function main() {
  console.log("Testing contract setup...");

  try {
    // Read contract addresses from file
    const addresses = JSON.parse(fs.readFileSync('deployed-addresses.json', 'utf8'));
    const customerManagerAddress = addresses.customerManager;
    const adminAddress = addresses.admin;

    console.log("CustomerManager address:", customerManagerAddress);
    console.log("Admin address:", adminAddress);

    // Check if contracts exist
    const customerManagerCode = await ethers.provider.getCode(customerManagerAddress);
    const adminCode = await ethers.provider.getCode(adminAddress);

    console.log("CustomerManager code length:", customerManagerCode.length);
    console.log("Admin code length:", adminCode.length);

    if (customerManagerCode === '0x' || adminCode === '0x') {
      console.error("One or both contracts do not exist");
      return;
    }

    // Get CustomerManager contract
    const customerManager = await ethers.getContractAt("customerManager", customerManagerAddress);
    
    // Verify admin address is set correctly
    const storedAdminAddress = await customerManager.adminAddress();
    console.log("Stored admin address in CustomerManager:", storedAdminAddress);
    
    if (storedAdminAddress.toLowerCase() !== adminAddress.toLowerCase()) {
      console.error("Admin address mismatch!");
      return;
    }

    console.log("✓ Setup looks correct");
  } catch (error) {
    console.error("Error testing setup:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });