const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("Starting randomized bulk order placement...");

  // Read contract addresses from file
  const addresses = JSON.parse(fs.readFileSync('deployed-addresses.json', 'utf8'));
  
  // Load retailer and manufacturer wallets
  const retailerWallets = JSON.parse(fs.readFileSync('retailer-wallets.json', 'utf8'));
  const manufacturerWallets = JSON.parse(fs.readFileSync('manufacturer-wallets.json', 'utf8'));
  
  // Get contract instances
  const orderDelivery = await ethers.getContractAt("orderDelivery", addresses.orderDelivery);
  const prdEnroller = await ethers.getContractAt("prdEnroller", addresses.prdEnroller);
  const admin = await ethers.getContractAt("admin", addresses.admin);

  console.log("Contracts loaded successfully");

  // Randomize number of orders between 80-90
  const orderCount = Math.floor(Math.random() * 11) + 80;
  console.log(`Placing ${orderCount} randomized orders...`);

  // Track orders for reporting
  const orderStats = {
    total: orderCount,
    successful: 0,
    lowStock: 0,
    failed: 0,
    received: 0
  };

  // Place randomized orders
  for (let i = 0; i < orderCount; i++) {
    try {
      // Randomly select retailer and manufacturer
      const retailerIndex = Math.floor(Math.random() * retailerWallets.length);
      const manufacturerIndex = Math.floor(Math.random() * manufacturerWallets.length);
      
      const retailerWallet = new ethers.Wallet(retailerWallets[retailerIndex].privateKey, ethers.provider);
      const manufacturerWallet = new ethers.Wallet(manufacturerWallets[manufacturerIndex].privateKey, ethers.provider);
      
      const retailerAddress = retailerWallet.address;
      const manufacturerAddress = manufacturerWallet.address;
      
      console.log(`\nPlacing order ${i+1}/${orderCount}: Retailer ${retailerIndex+1} -> Manufacturer ${manufacturerIndex+1}`);
      
      // Connect to contracts with retailer wallet
      const orderDeliveryWithRetailer = orderDelivery.connect(retailerWallet);
      
      // Randomize product details
      const productType = `ProductType${Math.floor(Math.random() * 5) + 1}`;
      const productSize = `Size${Math.floor(Math.random() * 3) + 1}`;
      const orderQty = Math.floor(Math.random() * 20) + 5; // 5-24 units per order
      
      // Get batch details for this manufacturer and product
      let batchNo;
      try {
        batchNo = await prdEnroller.findBatchNo(productType, productSize, manufacturerAddress);
      } catch (error) {
        console.log(`No batch found for manufacturer ${manufacturerIndex+1}, creating one...`);
        
        // Create a batch for this manufacturer if it doesn't exist
        const prdEnrollerWithManufacturer = prdEnroller.connect(manufacturerWallet);
        const newBatchNo = 1000 + i; // Unique batch number
        
        await prdEnrollerWithManufacturer.enrollProductBatch(
          newBatchNo,
          productType,
          productSize,
          `Manufacturer${manufacturerIndex+1}`,
          manufacturerAddress,
          50, // Moderate quantity to allow for low stock scenarios
          50 + (Math.floor(Math.random() * 20)), // Varying price
          "2023-01-01",
          "2025-01-01",
          10, // Low threshold to trigger low stock events
          { gasLimit: 1000000 }
        );
        
        batchNo = newBatchNo;
        console.log(`Created batch ${batchNo} for manufacturer ${manufacturerIndex+1}`);
      }
      
      // Check manufacturer stock before placing order
      const stockBefore = await prdEnroller.findStockOfManuf(manufacturerAddress, productType, productSize);
      console.log(`Manufacturer stock before order: ${stockBefore.qty} (Threshold: ${stockBefore.threshold})`);
      
      // Check if stock is below threshold
      if (stockBefore.qty < stockBefore.threshold) {
        console.log(`⚠️  LOW STOCK ALERT: Manufacturer ${manufacturerIndex+1} has only ${stockBefore.qty} ${productType} ${productSize} in stock (below threshold of ${stockBefore.threshold})`);
        orderStats.lowStock++;
        
        // Emit low stock event (simulated)
        const lowStockEvent = {
          manufacturer: manufacturerAddress,
          productType: productType,
          productSize: productSize,
          currentStock: stockBefore.qty,
          threshold: stockBefore.threshold
        };
        console.log("📉 LOW STOCK EVENT:", lowStockEvent);
        
        // Skip this order due to low stock
        continue;
      }
      
      // Calculate order price
      const orderPrice = await prdEnroller.computeOrderPrice(
        productType,
        productSize,
        manufacturerAddress,
        batchNo,
        orderQty
      );
      
      console.log(`Order price: ${orderPrice} wei for ${orderQty} units`);
      
      // Check if manufacturer has enough stock
      if (stockBefore.qty < orderQty) {
        console.log(`Insufficient stock: ${stockBefore.qty} available, ${orderQty} requested`);
        continue;
      }
      
      // Place the order
      const tx = await orderDeliveryWithRetailer.orderProduct(
        productType,
        productSize,
        orderQty,
        manufacturerAddress,
        { value: orderPrice, gasLimit: 500000 }
      );
      
      const receipt = await tx.wait();
      console.log(`✓ Order ${i+1} placed successfully. Tx: ${receipt.transactionHash}`);
      
      // Find the order number from events
      const orderCreatedEvent = receipt.events.find(e => e.event === "createdOrder");
      const orderNo = orderCreatedEvent.args[1];
      
      console.log(`Order number: ${orderNo}`);
      
      // Randomize whether to complete the order (ship and receive)
      const shouldCompleteOrder = Math.random() > 0.2; // 80% chance to complete
      
      if (shouldCompleteOrder) {
        // Mark order as shipped by manufacturer
        const orderDeliveryWithManufacturer = orderDelivery.connect(manufacturerWallet);
        
        const shipTx = await orderDeliveryWithManufacturer.orderShipped(
          orderNo,
          retailerAddress,
          manufacturerAddress,
          { gasLimit: 300000 }
        );
        
        await shipTx.wait();
        console.log(`✓ Order ${i+1} marked as shipped`);
        
        // Retailer marks order as received
        const receiveTx = await orderDeliveryWithRetailer.retailerRecivedOrder(
          orderNo,
          { gasLimit: 300000 }
        );
        
        await receiveTx.wait();
        console.log(`✓ Order ${i+1} marked as received`);
        orderStats.received++;
        
        // Emit retailer received event (simulated)
        const receivedEvent = {
          orderNo: orderNo,
          retailer: retailerAddress,
          manufacturer: manufacturerAddress,
          productType: productType,
          productSize: productSize,
          quantity: orderQty
        };
        console.log("📦 RETAILER RECEIVED EVENT:", receivedEvent);
        
        // Verify retailer stock was updated
        const retailerStock = await orderDelivery.findStockOfRetailer(
          retailerAddress,
          manufacturerAddress
        );
        
        console.log(`Retailer stock after order: ${retailerStock.qty.toString()} units`);
      } else {
        console.log(`Order ${i+1} was placed but not completed (simulating pending order)`);
      }
      
      orderStats.successful++;
      
      // Add a small delay between orders
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.error(`✗ Failed to process order ${i+1}:`, error.message);
      orderStats.failed++;
      
      // Try to decode revert reason if available
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
  console.log("\n" + "=".repeat(50));
  console.log("ORDER PLACEMENT SUMMARY");
  console.log("=".repeat(50));
  console.log(`Total orders attempted: ${orderStats.total}`);
  console.log(`Successful orders: ${orderStats.successful}`);
  console.log(`Orders failed due to low stock: ${orderStats.lowStock}`);
  console.log(`Failed orders: ${orderStats.failed}`);
  console.log(`Orders received by retailers: ${orderStats.received}`);
  console.log("=".repeat(50));
  
  console.log("Bulk order placement completed!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });