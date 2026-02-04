const { ethers } = require("hardhat");
const fs = require('fs');

async function main() {
  console.log("Deploying all contracts...");

  // Deploy Admin contract first
  const AdminFactory = await ethers.getContractFactory("admin");
  const admin = await AdminFactory.deploy();
  await admin.deployed();
  console.log("Admin deployed to:", admin.address);

  // Deploy CustomerManager
  const CustomerManagerFactory = await ethers.getContractFactory("customerManager");
  const customerManager = await CustomerManagerFactory.deploy();
  await customerManager.deployed();
  console.log("CustomerManager deployed to:", customerManager.address);

  // Set the admin address in CustomerManager
  const txCustomer = await customerManager.setadminAddr(admin.address);
  await txCustomer.wait();
  console.log("Admin address set in CustomerManager");

  // Deploy ManufacturerManager
  const ManufacturerManagerFactory = await ethers.getContractFactory("manufacturerManager");
  const manufacturerManager = await ManufacturerManagerFactory.deploy();
  await manufacturerManager.deployed();
  console.log("ManufacturerManager deployed to:", manufacturerManager.address);

  // Set the admin address in ManufacturerManager
  const txManufacturer = await manufacturerManager.setadminAddr(admin.address);
  await txManufacturer.wait();
  console.log("Admin address set in ManufacturerManager");

  // Deploy RetailerManager
  const RetailerManagerFactory = await ethers.getContractFactory("retailerManager");
  const retailerManager = await RetailerManagerFactory.deploy();
  await retailerManager.deployed();
  console.log("RetailerManager deployed to:", retailerManager.address);

  // Set the admin address in RetailerManager
  const txRetailer = await retailerManager.setadminAddr(admin.address);
  await txRetailer.wait();
  console.log("Admin address set in RetailerManager");

  // Deploy prdEnroller
  const PrdEnrollerFactory = await ethers.getContractFactory("prdEnroller");
  const prdEnroller = await PrdEnrollerFactory.deploy();
  await prdEnroller.deployed();
  console.log("prdEnroller deployed to:", prdEnroller.address);

  // Set the admin address in prdEnroller
  const txPrdEnroller = await prdEnroller.setadminAddr(admin.address);
  await txPrdEnroller.wait();
  console.log("Admin address set in prdEnroller");

  // Deploy orderDelivery
  const OrderDeliveryFactory = await ethers.getContractFactory("orderDelivery");
  const orderDelivery = await OrderDeliveryFactory.deploy();
  await orderDelivery.deployed();
  console.log("orderDelivery deployed to:", orderDelivery.address);

  // Set the admin address in orderDelivery
  const txOrderDelivery = await orderDelivery.setadminAddr(admin.address);
  await txOrderDelivery.wait();
  console.log("Admin address set in orderDelivery");

  // Set the prdEnroller address in orderDelivery
  const txSetPrdEnroller = await orderDelivery.setPrdEnrollManagerAddr(prdEnroller.address);
  await txSetPrdEnroller.wait();
  console.log("prdEnroller address set in orderDelivery");

  // Save all addresses to a file for other scripts to use
  const addresses = {
    admin: admin.address,
    customerManager: customerManager.address,
    manufacturerManager: manufacturerManager.address,
    retailerManager: retailerManager.address,
    prdEnroller: prdEnroller.address,
    orderDelivery: orderDelivery.address
  };

  fs.writeFileSync('deployed-addresses.json', JSON.stringify(addresses, null, 2));
  console.log("All contract addresses saved to deployed-addresses.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });