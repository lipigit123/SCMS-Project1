const { ethers } = require("hardhat");

async function main() {
  const accounts = await ethers.getSigners();
  const deployer = accounts[0];
  const balance = await deployer.getBalance();
  console.log(`Deployer address: ${deployer.address}`);
  console.log(`Deployer balance: ${ethers.utils.formatEther(balance)} ETH`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });