const { ethers } = require("hardhat");
const fs = require('fs');

async function main() {
  console.log("Starting bulk manufacturer enrollment with contract...");
  try {
    // Read contract addresses from file
    const addresses = JSON.parse(fs.readFileSync('deployed-addresses.json', 'utf8'));
    const manufacturerManagerAddress = addresses.manufacturerManager;
    console.log("Using ManufacturerManager at:", manufacturerManagerAddress);

    // Load the funded wallets
    const walletData = JSON.parse(fs.readFileSync('manufacturer-wallets.json', 'utf8'));
    const manufacturerWallets = walletData.map(data =>
      new ethers.Wallet(data.privateKey, ethers.provider)
    );

    const manufacturerManager = await ethers.getContractAt("manufacturerManager", manufacturerManagerAddress);

    // Check if admin address is set correctly
    const adminAddress = await manufacturerManager.adminAddress();
    console.log("Admin address in ManufacturerManager:", adminAddress);

    // Check if admin contract exists
    const adminCode = await ethers.provider.getCode(adminAddress);
    if (adminCode === '0x') {
      console.error("Admin contract does not exist at:", adminAddress);
      return;
    }

    console.log("Enrolling 100 manufacturers...");
    for (let i = 0; i < manufacturerWallets.length; i++) {
      try {
        const wallet = manufacturerWallets[i];
        const manufacturerManagerWithSigner = manufacturerManager.connect(wallet);

        // Generate unique regNo (uint8)
        const regNo = i + 1;
        console.log(`Attempting to enroll manufacturer ${i+1}: ${wallet.address} with regNo ${regNo}`);

        const tx = await manufacturerManagerWithSigner.enrollManufacturer(
          `Manufacturer${i + 1}`,
          regNo,
          `Address${i + 1}, City${Math.floor(i / 10) + 1}`,
          5, // validity duration
          { value: 10000, gasLimit: 1000000 } // Send 10000 wei and increased gas limit
        );

        const receipt = await tx.wait();
        console.log(`✓ Enrolled manufacturer ${i + 1}: ${wallet.address} (Tx: ${receipt.transactionHash})`);

        // Add a small delay between enrollments
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`✗ Failed to enroll manufacturer ${i + 1}:`, error.message);
        // Try to decode revert reason
        if (error.data) {
          try {
            const revertReason = ethers.utils.defaultAbiCoder.decode(["string"], "0x" + error.data.slice(10))[0];
            console.log(`Revert reason: ${revertReason}`);
          } catch (e) {
            console.log("Could not decode revert reason");
          }
        }
      }
    }
    console.log("Bulk enrollment completed!");
  } catch (error) {
    console.error("Error in enrollment process:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });