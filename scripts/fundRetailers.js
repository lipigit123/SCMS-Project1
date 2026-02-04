const { ethers } = require("hardhat");
const fs = require('fs');

async function main() {
  console.log("Funding wallets for retailer enrollment...");
  const accounts = await ethers.getSigners();
  const deployer = accounts[0];
  console.log("Using deployer account:", deployer.address);

  // Create 100 retailer wallets
  const retailerWallets = [];
  for (let i = 0; i < 100; i++) {
    retailerWallets.push(ethers.Wallet.createRandom().connect(ethers.provider));
  }

  // Fund each wallet with 0.1 ETH
  console.log("Funding retailer wallets...");
  for (let i = 0; i < retailerWallets.length; i++) {
    const tx = await deployer.sendTransaction({
      to: retailerWallets[i].address,
      value: ethers.utils.parseEther("0.1")
    });
    await tx.wait();
    console.log(`Funded wallet ${i + 1}: ${retailerWallets[i].address}`);
  }

  // Save wallets to a file
  const walletData = retailerWallets.map(wallet => ({
    address: wallet.address,
    privateKey: wallet.privateKey
  }));

  fs.writeFileSync('retailer-wallets.json', JSON.stringify(walletData, null, 2));
  console.log("Saved wallet data to retailer-wallets.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });