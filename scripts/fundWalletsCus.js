const { ethers } = require("hardhat");

async function main() {
  console.log("Funding wallets for customer enrollment...");

  const accounts = await ethers.getSigners();
  const deployer = accounts[0];
  console.log("Using deployer account:", deployer.address);

  // Create 100 customer wallets
  const customerWallets = [];
  for (let i = 0; i < 100; i++) {
    customerWallets.push(ethers.Wallet.createRandom().connect(ethers.provider));
  }

  // Fund each wallet with 0.1 ETH
  console.log("Funding customer wallets...");
  for (let i = 0; i < customerWallets.length; i++) {
    const tx = await deployer.sendTransaction({
      to: customerWallets[i].address,
      value: ethers.utils.parseEther("0.1")
    });
    await tx.wait();
    console.log(`Funded wallet ${i + 1}: ${customerWallets[i].address}`);
  }

  // Save wallets to a file for later use
  const fs = require('fs');
  const walletData = customerWallets.map(wallet => ({
    address: wallet.address,
    privateKey: wallet.privateKey
  }));
  
  fs.writeFileSync('customer-wallets.json', JSON.stringify(walletData, null, 2));
  console.log("Saved wallet data to customer-wallets.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });