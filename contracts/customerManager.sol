// customerManager.sol
// SPDX-License-Identifier: GPL-3.0 and MIT

pragma experimental ABIEncoderV2;
pragma solidity ^0.8.19;

interface adminCustomer {
   enum eoaCategory {notRegistered, manufacturer, retailer, customer}
   function set_eoas(address, uint8) external returns (string memory);
   function get_eoas(address) external view returns (uint8);
}

contract customerManager {
   address public adminAddress;
   
   function setadminAddr(address _admin) public {
     adminAddress = _admin;
   }

   struct customerStruct {
      string name;
      uint64 phNo;
      string shipAddress;
      string enrollTime;
      bool isEnrolled;
   }

   mapping(address => customerStruct) public customers;
   mapping(string => address) public addrsCustomers;
   
   event CustomerEnrolled(address indexed customer, string name);
   
   function enrollCustomer(string memory name, uint64 phNo, string memory shipAddress)
                          public returns (string memory) {
      // Check if already registered as customer (category 3)
      require(adminCustomer(adminAddress).get_eoas(msg.sender) != 3,
                             "you are already registered as a customer");
     
      customers[msg.sender] = customerStruct(name, phNo, shipAddress, "now", true);
      adminCustomer(adminAddress).set_eoas(msg.sender, 3);
      addrsCustomers[name] = msg.sender;
      emit CustomerEnrolled(msg.sender, name);
      return "You are successfully regd. as a customer -- welcome.";
   }
}