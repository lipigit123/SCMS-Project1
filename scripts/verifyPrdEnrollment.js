const { ethers } = require("hardhat");
const fs = require('fs');

async function main() {
  console.log("Verifying product enrollments...");
  
  try {
    // Read contract addresses from file
    const addresses = JSON.parse(fs.readFileSync('deployed-addresses.json', 'utf8'));
    const prdEnrollerAddress = addresses.prdEnroller;
    
    const prdEnroller = await ethers.getContractAt("prdEnroller", prdEnrollerAddress);
    
    // Get the number of enrolled batches
    const noOfBatches = await prdEnroller.getNoOfEnrolledBatches();
    console.log(`Number of enrolled batches: ${noOfBatches}`);
    
    // Object to track products per manufacturer
    const manufacturerProducts = {};
    let totalBatches = 0;
    
    // Verify each batch
    for (let i = 0; i < noOfBatches; i++) {
      try {
        const batchNo = await prdEnroller.getBatchNoOfEnrolledBatch(i);
        const manufacturer = await prdEnroller.getManufOfEnrolledBatch(i);
        const prdType = await prdEnroller.getPrdType(batchNo);
        const size = await prdEnroller.getPrdSize(batchNo);
        const price = await prdEnroller.GetPrdPrice(batchNo);
        
        console.log(`Batch ${batchNo}: ${prdType} ${size} by ${manufacturer}, Price: ${price}`);
        
        // Update manufacturer batch count
        if (!manufacturerProducts[manufacturer]) {
          manufacturerProducts[manufacturer] = { batches: 0, products: 0 };
        }
        manufacturerProducts[manufacturer].batches += 1;
        totalBatches += 1;
        
        // Try to get the number of products in the batch using different methods
        let batchMembersCount = 0;
        let couldGetCount = false;
        
        // Method 1: Try getBatchMembersLength if it exists
        try {
          batchMembersCount = await prdEnroller.getBatchMembersLength(batchNo);
          couldGetCount = true;
          console.log(`  Products in batch: ${batchMembersCount}`);
        } catch (e) {
          console.log("  getBatchMembersLength function not available");
        }
        
        // Method 2: Try to access batch members directly if first method failed
        if (!couldGetCount) {
          try {
            // Try to access the first product to see if batchMembers mapping is accessible
            const firstProduct = await prdEnroller.batchMembers(batchNo, 0);
            batchMembersCount = 1; // At least one product exists
            
            // Try to find more products by incrementing index until we get an error
            let j = 1;
            while (true) {
              try {
                await prdEnroller.batchMembers(batchNo, j);
                batchMembersCount++;
                j++;
              } catch (e) {
                break;
              }
            }
            couldGetCount = true;
            console.log(`  Products in batch: ${batchMembersCount}`);
          } catch (e) {
            console.log("  Could not access batch members - products may not be enrolled");
          }
        }
        
        // Update manufacturer product count if we were able to get it
        if (couldGetCount) {
          manufacturerProducts[manufacturer].products += batchMembersCount;
        }
        
      } catch (error) {
        console.error(`Error verifying batch ${i}:`, error.message);
      }
    }
    
    // Print manufacturer summary
    console.log("\n=== Manufacturer Summary ===");
    for (const [manufacturer, data] of Object.entries(manufacturerProducts)) {
      console.log(`Manufacturer ${manufacturer}: ${data.batches} batches, ${data.products} products`);
    }
    console.log(`\nTotal batches: ${totalBatches}`);
    
    console.log("\nVerification completed!");
  } catch (error) {
    console.error("Error in verification process:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });