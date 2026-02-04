// SPDX-License-Identifier: GPL-3.0
pragma experimental ABIEncoderV2;
pragma solidity ^0.8.19;

contract admin { 
   enum eoaCategory {notRegistered, manufacturer, retailer, customer}
   
   mapping (address => eoaCategory) public eoas;
   mapping (address => uint256) public balances;
   address public toPay;
   bool public toPaySet;
   address payable public deployer; // Make deployer public
   
   event EOARegistered(address indexed eoa, eoaCategory category);
   event DepositMade(address indexed payee, uint256 amount);
   event WithdrawalMade(address indexed payee, uint256 amount);
   
   constructor() {
    deployer = payable(msg.sender);
   }
   
   function goingToPay(address payee) public returns (string memory) {
    toPay = payee;
    toPaySet = true;
    return "Okay - deposit";
   }

   function deposit() external payable {
    require(toPaySet, "First indicate whom to pay");
    balances[toPay] += msg.value;
    toPaySet = false;
    emit DepositMade(toPay, msg.value);
   }

   function set_eoas(address eoa, uint8 eoaType) public returns (string memory) {
    eoas[eoa] = eoaCategory(eoaType);
    emit EOARegistered(eoa, eoaCategory(eoaType));
    return "Done";
   } 

   function get_eoas(address eoa) public view returns (eoaCategory) {
     return eoas[eoa];
   }
   
   function withdraw(uint256 amount) public {
        uint256 available = balances[msg.sender];
        if (eoas[msg.sender] == eoaCategory.manufacturer) 
            require(available >= 10000 + amount, "inadequate balance");
        if (eoas[msg.sender] == eoaCategory.retailer) 
            require(available >= 1000 + amount, "inadequate balance"); 
        if (eoas[msg.sender] == eoaCategory.customer) 
            require(available >= amount, "inadequate balance");                       

        balances[msg.sender] -= amount;
        payable(msg.sender).transfer(amount);
        emit WithdrawalMade(msg.sender, amount);
    }
    
    // Add a receive function to handle plain ETH transfers
    receive() external payable {
        // Do nothing or handle as needed
    }
}
