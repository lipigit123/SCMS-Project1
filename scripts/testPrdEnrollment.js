const { ethers } = require("hardhat");
const fs = require('fs');

async function main() {
    console.log("Testing product enrollment functionality...");

    // Read contract addresses from file
    const addresses = JSON.parse(fs.readFileSync('deployed-addresses.json', 'utf8'));
    const prdEnrollerAddress = addresses.prdEnroller;
    const adminAddress = addresses.admin;
    const manufacturerManagerAddress = addresses.manufacturerManager;

    // Load manufacturer wallets
    const manufacturerWalletData = JSON.parse(fs.readFileSync('manufacturer-wallets.json', 'utf8'));
    const manufacturerWallets = manufacturerWalletData.slice(0, 50).map(data => 
        new ethers.Wallet(data.privateKey, ethers.provider)
    );

    // Get contracts
    const prdEnroller = await ethers.getContractAt("prdEnroller", prdEnrollerAddress);
    const admin = await ethers.getContractAt("admin", adminAddress);
    const manufacturerManager = await ethers.getContractAt("manufacturerManager", manufacturerManagerAddress);

    console.log("Ensuring manufacturers are enrolled...");
    for (let i = 0; i < manufacturerWallets.length; i++) {
        const wallet = manufacturerWallets[i];
        const category = await admin.get_eoas(wallet.address);
        if (category !== 1) { // 1 corresponds to manufacturer
            console.log(`Enrolling manufacturer ${i+1}...`);
            const manufacturerManagerWithSigner = manufacturerManager.connect(wallet);
            const tx = await manufacturerManagerWithSigner.enrollManufacturer(
                `Manufacturer${i + 1}`,
                i + 1,
                `Address${i + 1}, City${Math.floor(i / 10) + 1}`,
                5,
                { value: 10000, gasLimit: 1000000 }
            );
            await tx.wait();
            console.log(`✓ Enrolled manufacturer ${i+1}`);
        } else {
            console.log(`Manufacturer ${i+1} already enrolled`);
        }
    }

    console.log("Testing enrollProductBatch for 50 batches...");
    for (let i = 0; i < 50; i++) {
        try {
            const wallet = manufacturerWallets[i];
            const prdEnrollerWithSigner = prdEnroller.connect(wallet);
            const batchNo = i + 1;
            const prdType = `ProductType${i % 5 + 1}`;
            const size = `Size${i % 3 + 1}`;
            const manufacturerName = `Manufacturer${i + 1}`;
            const manufacturerAddress = wallet.address;
            const qty = 100 + (i * 10);
            const pricePerUnit = 10 + (i % 5);
            const mfDate = `2023-${(i % 12) + 1}-${(i % 28) + 1}`;
            const expDate = `2024-${(i % 12) + 1}-${(i % 28) + 1}`;
            const threshold = 50;

            const tx = await prdEnrollerWithSigner.enrollProductBatch(
                batchNo,
                prdType,
                size,
                manufacturerName,
                manufacturerAddress,
                qty,
                pricePerUnit,
                mfDate,
                expDate,
                threshold,
                { gasLimit: 1000000 }
            );
            await tx.wait();
            console.log(`✓ Enrolled product batch ${i + 1} from ${manufacturerAddress}`);
            await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
            console.error(`✗ Failed to enroll product batch ${i + 1}:`, error.message);
        }
    }

   console.log("Testing enrollProdsInBatch for 50 batches...");
for (let i = 0; i < 50; i++) {
    try {
        const wallet = manufacturerWallets[i];
        const prdEnrollerWithSigner = prdEnroller.connect(wallet);
        const batchNo = i + 1;
        
        // Reduce the number of products per batch for testing
        const qty = 10; // Reduced from 100 + (i * 10)
        const epcs = [];
        
        console.log(`Enrolling ${qty} products in batch ${batchNo}...`);
        
        // Generate uint96-compatible EPCs
        for (let j = 0; j < qty; j++) {
            // Generate a random number within uint96 range (0 to 2^96 - 1)
            const maxUint96 = BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFF'); // 2^96 - 1
            const randomBigInt = BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)) * 
                                BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));
            const epc = randomBigInt & maxUint96;
            epcs.push(epc.toString());
        }

        const tx = await prdEnrollerWithSigner.enrollProdsInBatch(
            batchNo,
            epcs,
            { gasLimit: 5000000 } // Further increased gas limit
        );
        const receipt = await tx.wait();
        console.log(`✓ Enrolled ${qty} products in batch ${batchNo} (Tx: ${receipt.transactionHash})`);
        await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
        console.error(`✗ Failed to enroll products in batch ${i + 1}:`, error.message);
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
    console.log("Testing additional functions...");
  
    // Test findStockOfManuf
    try {
        const manufacturerAddress = manufacturerWallets[0].address;
        const prdType = "ProductType1";
        const size = "Size1";
        
        const stock = await prdEnroller.findStockOfManuf(manufacturerAddress, prdType, size);
        console.log(`Stock for manufacturer ${manufacturerAddress}: ${stock.qty} units, threshold: ${stock.threshold}`);
    } catch (error) {
        console.error("Error testing findStockOfManuf:", error.message);
    }
    
    // Test computeOrderPrice
    try {
        const manufacturerAddress = manufacturerWallets[0].address;
        const prdType = "ProductType1";
        const size = "Size1";
        const batchNo = 1;
        const qty = 10;
        
        const price = await prdEnroller.computeOrderPrice(prdType, size, manufacturerAddress, batchNo, qty);
        console.log(`Order price for ${qty} units: ${price}`);
    } catch (error) {
        console.error("Error testing computeOrderPrice:", error.message);
    }
    
    // Test whoMake
    try {
        const prdType = "ProductType1";
        const size = "Size1";
        
        const manufacturers = await prdEnroller.whoMake(prdType, size);
        console.log(`Manufacturers making ${prdType} ${size}: ${manufacturers.length} found`);
    } catch (error) {
        console.error("Error testing whoMake:", error.message);
    }

    console.log("Product enrollment testing completed!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });