const { ethers } = require("hardhat");
const fs = require('fs');

async function main() {
  console.log("Starting bulk customer enrollment with contract...");

  try {
    // Read contract addresses from file
    const addresses = JSON.parse(fs.readFileSync('deployed-addresses.json', 'utf8'));
    const customerManagerAddress = addresses.customerManager;
    console.log("Using CustomerManager at:", customerManagerAddress);

    // Load the funded wallets
    const walletData = JSON.parse(fs.readFileSync('customer-wallets.json', 'utf8'));
    const customerWallets = walletData.map(data =>
      new ethers.Wallet(data.privateKey, ethers.provider)
    );

    const customerManager = await ethers.getContractAt("customerManager", customerManagerAddress);
    
    // Check if admin address is set correctly
    const adminAddress = await customerManager.adminAddress();
    console.log("Admin address in CustomerManager:", adminAddress);
    
    // Check if admin contract exists
    const adminCode = await ethers.provider.getCode(adminAddress);
    if (adminCode === '0x') {
      console.error("Admin contract does not exist at:", adminAddress);
      return;
    }

    console.log("Enrolling 100 customers...");

    for (let i = 0; i < customerWallets.length; i++) {
      try {
        const wallet = customerWallets[i];
        const customerManagerWithSigner = customerManager.connect(wallet);

        // Generate a phone number that fits in uint64
        const phoneNumberValue = Math.floor(1000000000 + Math.random() * 9000000000);

        console.log(`Attempting to enroll customer ${i+1}: ${wallet.address}`);
        
        const tx = await customerManagerWithSigner.enrollCustomer(
          `Customer${i + 1}`,
          phoneNumberValue,
          `Address${i + 1}, City${Math.floor(i / 10) + 1}`,
          { gasLimit: 1000000 } // Increased gas limit
        );

        const receipt = await tx.wait();
        console.log(`✓ Enrolled customer ${i + 1}: ${wallet.address} (Tx: ${receipt.transactionHash})`);

        // Add a small delay between enrollments
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.error(`✗ Failed to enroll customer ${i + 1}:`, error.message);
        
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