const { ethers } = require("hardhat");
const fs = require('fs');

async function main() {
  console.log("Verifying deployed contracts...");
  
  const addresses = JSON.parse(fs.readFileSync('deployed-addresses.json', 'utf8'));
  
  for (const [contractName, address] of Object.entries(addresses)) {
    try {
      const code = await ethers.provider.getCode(address);
      console.log(`${contractName} (${address}):`);
      console.log(`  - Code exists: ${code !== '0x' && code !== '0x0'}`);
      console.log(`  - Code length: ${code.length} bytes`);
      
      if (code !== '0x' && code !== '0x0') {
        // Try to get the contract instance
        try {
          const contract = await ethers.getContractAt(contractName, address);
          console.log(`  - Contract instance created successfully`);
          
          // Try to call a simple view function
          if (contractName === 'manufacturerManager') {
            const adminAddr = await contract.adminAddress();
            console.log(`  - Admin address: ${adminAddr}`);
          }
        } catch (e) {
          console.log(`  - Error creating contract instance: ${e.message}`);
        }
      }
    } catch (error) {
      console.log(`${contractName}: Error - ${error.message}`);
    }
    console.log('---');
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });