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

    console.log("Testing randomized product batch enrollment...");
    
    // Create a more realistic distribution of batches and products
    const manufacturersBatchCount = {};
    const manufacturersProductCount = {};
    
    // Initialize counts
    manufacturerWallets.forEach(wallet => {
        manufacturersBatchCount[wallet.address] = 0;
        manufacturersProductCount[wallet.address] = 0;
    });

    let totalBatches = 0;
    let totalProducts = 0;

    // Randomize the number of batches per manufacturer (between 1-10)
    for (let i = 0; i < manufacturerWallets.length; i++) {
        const wallet = manufacturerWallets[i];
        const batchCount = Math.floor(Math.random() * 10) + 1; // 1-10 batches per manufacturer
        
        for (let batchIdx = 0; batchIdx < batchCount; batchIdx++) {
            try {
                totalBatches++;
                const batchNo = totalBatches;
                const prdType = `ProductType${Math.floor(Math.random() * 5) + 1}`;
                const size = `Size${Math.floor(Math.random() * 3) + 1}`;
                const manufacturerName = `Manufacturer${i + 1}`;
                const manufacturerAddress = wallet.address;
                
                // Random quantity between 5-50 products per batch
                const qty = Math.floor(Math.random() * 46) + 5;
                const pricePerUnit = Math.floor(Math.random() * 20) + 5; // 5-25 price range
                const mfDate = `2023-${Math.floor(Math.random() * 12) + 1}-${Math.floor(Math.random() * 28) + 1}`;
                const expDate = `2024-${Math.floor(Math.random() * 12) + 1}-${Math.floor(Math.random() * 28) + 1}`;
                const threshold = Math.floor(qty * 0.2); // 20% of quantity

                const prdEnrollerWithSigner = prdEnroller.connect(wallet);
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
                
                manufacturersBatchCount[wallet.address]++;
                manufacturersProductCount[wallet.address] += qty;
                totalProducts += qty;
                
                console.log(`✓ Manufacturer ${i+1} enrolled batch ${batchNo} with ${qty} ${prdType} ${size}`);
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (error) {
                console.error(`✗ Failed to enroll product batch for manufacturer ${i+1}:`, error.message);
            }
        }
    }

    console.log("\nTesting enrollProdsInBatch for all batches...");
    
    // Now enroll products for each batch
    for (let batchNo = 1; batchNo <= totalBatches; batchNo++) {
        try {
            // Find which manufacturer created this batch
            let manufacturerWallet = null;
            for (const wallet of manufacturerWallets) {
                try {
                    const batchManufacturer = await prdEnroller.getManuf(batchNo);
                    if (batchManufacturer.toLowerCase() === wallet.address.toLowerCase()) {
                        manufacturerWallet = wallet;
                        break;
                    }
                } catch (e) {
                    // Continue searching
                }
            }
            
            if (!manufacturerWallet) {
                console.log(`Could not find manufacturer for batch ${batchNo}, skipping...`);
                continue;
            }
            
            const prdEnrollerWithSigner = prdEnroller.connect(manufacturerWallet);
            
            // Get batch details to know how many products to enroll
            const prdType = await prdEnroller.getPrdType(batchNo);
            const size = await prdEnroller.getPrdSize(batchNo);
            const qty = await prdEnroller.GetPrdPrice(batchNo); // Note: This might not be the right function for quantity
            
            // Generate EPCs
            const epcs = [];
            for (let j = 0; j < qty; j++) {
                const maxUint96 = BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFF');
                const randomBigInt = BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)) * 
                                    BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));
                const epc = randomBigInt & maxUint96;
                epcs.push(epc.toString());
            }

            console.log(`Enrolling ${qty} products in batch ${batchNo} (${prdType} ${size})...`);
            
            const tx = await prdEnrollerWithSigner.enrollProdsInBatch(
                batchNo,
                epcs,
                { gasLimit: 5000000 }
            );
            const receipt = await tx.wait();
            console.log(`✓ Enrolled ${qty} products in batch ${batchNo} (Tx: ${receipt.transactionHash})`);
            await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
            console.error(`✗ Failed to enroll products in batch ${batchNo}:`, error.message);
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

    // Print summary
    console.log("\n=== Enrollment Summary ===");
    console.log(`Total batches: ${totalBatches}`);
    console.log(`Total products: ${totalProducts}`);
    
    console.log("\nManufacturer details:");
    for (let i = 0; i < manufacturerWallets.length; i++) {
        const wallet = manufacturerWallets[i];
        console.log(`Manufacturer ${i+1}: ${manufacturersBatchCount[wallet.address]} batches, ${manufacturersProductCount[wallet.address]} products`);
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