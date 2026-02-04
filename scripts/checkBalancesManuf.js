const { ethers } = require("hardhat");
const fs = require('fs');

async function main() {
  console.log("Checking manufacturer wallet balances...");
  
  // Load the manufacturer wallets
  const walletData = JSON.parse(fs.readFileSync('manufacturer-wallets.json', 'utf8'));
  
  for (let i = 0; i < walletData.length; i++) {
    const balance = await ethers.provider.getBalance(walletData[i].address);
    console.log(`Wallet ${i+1}: ${walletData[i].address} - ${ethers.utils.formatEther(balance)} ETH`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });