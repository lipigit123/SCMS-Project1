const { ethers } = require("hardhat");
const fs = require('fs');

async function main() {
  console.log("Funding wallets for manufacturer enrollment...");
  
  // Get the provider and signers
  const provider = ethers.provider;
  const accounts = await ethers.getSigners();
  const deployer = accounts[0];
  
  console.log("Using deployer account:", deployer.address);
  const deployerBalance = await deployer.getBalance();
  console.log(`Deployer balance: ${ethers.utils.formatEther(deployerBalance)} ETH`);

  // Create 100 manufacturer wallets
  const manufacturerWallets = [];
  for (let i = 0; i < 100; i++) {
    const wallet = ethers.Wallet.createRandom();
    manufacturerWallets.push(wallet);
  }

  // Fund each wallet with 0.1 ETH
  console.log("Funding manufacturer wallets...");
  for (let i = 0; i < manufacturerWallets.length; i++) {
    try {
      const tx = await deployer.sendTransaction({
        to: manufacturerWallets[i].address,
        value: ethers.utils.parseEther("0.1"),
        gasLimit: 21000 // Standard gas limit for simple ETH transfers
      });
      
      await tx.wait();
      console.log(`Funded wallet ${i + 1}: ${manufacturerWallets[i].address}`);
      
      // Add a small delay between transactions
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`Error funding wallet ${i + 1}:`, error.message);
    }
  }

  // Save wallets to a file
  const walletData = manufacturerWallets.map(wallet => ({
    address: wallet.address,
    privateKey: wallet.privateKey
  }));

  fs.writeFileSync('manufacturer-wallets.json', JSON.stringify(walletData, null, 2));
  console.log("Saved wallet data to manufacturer-wallets.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });