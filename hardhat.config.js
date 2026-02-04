require("@nomiclabs/hardhat-waffle");
require("hardhat-gas-reporter");

module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
      accounts: {
        mnemonic: "test test test test test test test test test test test junk",
        count: 100
      },
      //loggingEnabled: false // Add this line to suppress warnings
    }
  },
  gasReporter: {
    enabled: true,
    currency: 'USD',
  }  
};