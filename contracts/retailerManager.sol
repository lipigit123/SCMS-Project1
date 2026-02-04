// SPDX-License-Identifier: GPL-3.0 and MIT

pragma experimental ABIEncoderV2;
pragma solidity ^0.8.19;

interface adminRetailer 
 {
   enum eoaCategory {notRegistered, manufacturer, retailer, customer}
   function deposit () external payable; //returns (string memory);
   function set_eoas(address, uint8) external returns (string memory); // 2nd arg is uint8(eoaCategory)
   function get_eoas(address) external view returns (eoaCategory); 
   function goingToPay (address payee) external returns (string memory);
 }

/*** 
 R E T A I L E R  M A N A G E R
 The adminstrator which helps to enroll the retailer in the blockchain; 
 Specifically it checks the genuineness of the retailer using their registration 
 numbers against their names and valid duration of registration. 
 ****/ 

contract retailerManager
  
 {
   address public adminAddress;
    function setadminAddr(address _admin) public payable 
     {
      adminAddress = _admin;
     }

   /******    Data Types    *****/
   enum eoaCategory {notRegistered, manufacturer, retailer, customer}
   struct retailer
    {
      string name;
      uint8 regNo; 
      string companyAddress;
      address[] manufacturers;
      string[] productTypes; // the products (with the corresponding manufacturers);
      uint8 validDuration; // validity duration of registration number
      string enrollTime; // time of enrolling 
      //mapping (bytes32 => inventory) stock; // key obtained from keccac256 of a structure
    }
    
    //**** State variable(s)   ****/
    mapping ( address => retailer) public retailers;
    mapping (string => address) addrsRetailers; 



  function addRetailer (string memory name, uint8 regNo, string memory companyAddress, 
                                uint8 duration ) public payable returns (string memory) 
  { 
     require (checkGenuineness (name, regNo, duration), 
                         "Register as a manufacturer with GoI");
        if (msg.value < 1000) return "regn. attempt -- needs 1000 wei.";
        adminRetailer(adminAddress).goingToPay (msg.sender);
        adminRetailer(adminAddress).deposit {value:msg.value}();
        /* 
        string memory some = adminRetailer(adminAddress).get_eoas(msg.sender);
        require (keccak256(abi.encodePacked(some)) != keccak256(abi.encodePacked("retailer") ),
                  "no need -- you are already registered as a retailer" );
        require (keccak256(abi.encodePacked(some)) != keccak256(abi.encodePacked("manufacturer")),
                  "You are a Manufacturer-- No need to be a retailer; Rather be a Customer");
        */
        require (uint8(adminRetailer(adminAddress).get_eoas (msg.sender)) != uint8(eoaCategory.retailer),
                               "you are already registered as a retailer");
        retailers[msg.sender].name = name; 
        retailers[msg.sender].regNo = regNo;
        retailers[msg.sender].companyAddress = companyAddress;
        //retailers[msg.sender].companyPrefix = uint32 (890); 
        retailers[msg.sender].validDuration = duration;
        adminRetailer(adminAddress).set_eoas(msg.sender, uint8(eoaCategory.retailer)); 
        addrsRetailers[name] = msg.sender; // Account address stored
       return ("You are successfully regd. as a Retailer -- welcome."); /****/
    //else return ("registration attempt rejected -- not a licensed Retailer.");   
  } // end of enrollRetailer

/***require (manufacturers[msg.sender].regNo != regNo, "you're a manufacturer, can't be a retailer too!");
   require (retailers[msg.sender].regNo != regNo, "there's already a retailer, maybe yourself, under this registration no.");
   retailers[msg.sender].regNo = regNo;
   retailers[msg.sender].name = name;
   retailers[msg.sender].companyAddress = myAddress;**/
   

  

  function checkGenuineness (string memory companyName, uint8 regNo, uint8 duration) 
                                                     internal returns (bool)
   { //code for checking registration number against company name and valid duration is 
     // skipped -- hence 
     return true; 
   } 
}  