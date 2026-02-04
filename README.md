<<<<<<< HEAD
# Sample Hardhat Project

This project demonstrates a basic Hardhat use case. It comes with a sample contract, a test for that contract, and a Hardhat Ignition module that deploys that contract.

Try running some of the following tasks:

```shell
npx hardhat help
npx hardhat test
REPORT_GAS=true npx hardhat test
npx hardhat node
npx hardhat ignition deploy ./ignition/modules/Lock.js
```
=======
# SCMS-Project1

<<<<<<< HEAD
  npm init -y
  npm install --save-dev hardhat@^2.22.1
  npx hardhat init
  # Choose "empty configure file"

 1. Install Additional Dependencies
 npm install --save-dev --legacy-peer-deps `
  @nomiclabs/hardhat-waffle@^2.0.0 `
  @nomiclabs/hardhat-ethers@^2.0.0 `
  ethereum-waffle@^3.0.0 `
  ethers@5.8.0 `
 chai@^4.3.0 `
  hardhat-gas-reporter@^1.0.0 `
  solidity-coverage@^0.8.0 `
  dotenv@^16.0.0 `
  mocha@^10.0.0


  Set up the hardhat.config.js file
  require("@nomiclabs/hardhat-waffle");
  require("hardhat-gas-reporter");

  //to the top of hardhat.config.js file.  Rest of the code 
 //i.e., the inner block of hardhat.config.js file is uploaded in github



2.	Create and Compile Smart Contract
    # Place your contract_name.sol //smart contract file// in contracts //folder name// 

//Organization of files:

your-project/
├── contracts/
│   └── manufacturerManager.sol
├── scripts/
│   ├── fundManufacturers.js
│   └── randEnrollManuf.js
├── hardhat.config.js
├── package.json
└── .env (optional)

  npx hardhat node (Terminal 1, keep running)

  npx hardhat compile   (Terminal 2)

  npx hardhat run scripts/deploy.js --network localhost (Terminal 2) 
>>>>>>> 19cee2143322f42080a2f703f1be09775106c5f9
=======
>>>>>>> 5539741f3238f6b0754239a18547fef852e577ca
