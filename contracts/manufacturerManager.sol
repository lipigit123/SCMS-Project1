// SPDX-License-Identifier: GPL-3.0 and MIT

pragma experimental ABIEncoderV2;
pragma solidity ^0.8.19;
//pragma solidity ^0.4.19;

interface adminManufacturer 
 {
   enum eoaCategory {notRegistered, manufacturer, retailer, customer}
   function deposit () external payable; //returns (string memory);
   function set_eoas(address, uint8) external returns (string memory); // 2nd arg. is uint8(eoaCategory)
   function get_eoas(address) external view returns (eoaCategory); 
   function goingToPay (address payee) external returns (string memory);
 }



/*** 
 M A N U F A C T U R E R. M A N A G E R
 The adminstrator which helps to enroll the manufacturers in the blockchain; 
 Specifically it checks the genuineness of the manufacturers using their registration 
 numbers against their names and valid duration of registration. 
 ****/ 
contract manufacturerManager
 {
   address public adminAddress;
   function setadminAddr(address _admin) public payable 
    {
     adminAddress = _admin;
    }
 
  /*** Data Types ***/
   enum eoaCategory {notRegistered, manufacturer, retailer, customer}
   struct manufacturerStruct
    { string name;
      uint8 regNo;
      string companyAddress;
      uint32 companyPrefix;
      uint8 validDuration; // validity duration of registration number
      string enrollTime; // time of enrolling 
      // mapping (uint => inventory) stock; // the key will be keccak256 (specProduct fileds)
    }

   /***** state variables ****/
    mapping ( address => manufacturerStruct ) public manufacturers;
    mapping (string => address) addrsManufacturers; 
   // needed as customer only specifies "name"

   /***. functions. ****/
   function enrollManufacturer (string memory name, uint8 regNo, string memory companyAddress, 
                                uint8 duration ) public payable returns (string memory) 
    { 
      require (checkGenuineness (name, regNo, duration), 
                         "Register as a manufacturer with GoI");
        if (msg.value < 10000) return "regn. attempt -- needs 10000 wei.";
        adminManufacturer(adminAddress).goingToPay (msg.sender);
        adminManufacturer(adminAddress).deposit {value:msg.value}(); 
        /*
        string memory some = adminManufacturer(adminAddress).get_eoas(msg.sender);
        require (keccak256(abi.encodePacked(some)) != keccak256(abi.encodePacked("manufacturer")),
                  "no need -- you are already registered as a manufacturer" );
        */
        
        require (uint8(adminManufacturer(adminAddress).get_eoas (msg.sender)) != uint8(eoaCategory.manufacturer),
                               "you are already registered as a manufacturer");
        manufacturers[msg.sender].name = name; 
        manufacturers[msg.sender].regNo = regNo;
        manufacturers[msg.sender].companyAddress = companyAddress;
        manufacturers[msg.sender].companyPrefix = uint32 (890);
        // considering for now, only Indian companies
       /* GS1 specifies standard company prefix range of / unique integers for different 
          countries available from site. We can make this function more realistic by 
          referring to GS1 standard.
       **/
       manufacturers[msg.sender].validDuration = duration;
       adminManufacturer(adminAddress).set_eoas(msg.sender, uint8(eoaCategory.manufacturer)); 
       //manufacturers[msg.sender].enrollTime = "16.30"; // HOW TO GET THE timstamp 
       // this EOA a manufacturer -- possibly, we need a set_eoas (address) function in
       // admin, in the Interfaces of manufacturerManager, retailerManager and 
       // customerManagercontracts. Also we should then have the complementary function
       // get_eoas (address) in admin.
       addrsManufacturers[name] = msg.sender; // Account address stored
       return ("You are successfully regd. as a manufacturer -- welcome.");
    
   }// end of enrollManufacturer

 function checkGenuineness (string memory companyName, uint8 regNo, uint8 duration) 
                                                     internal returns (bool)
   { //code for checking registration number against company name and valid duration is 
     // skipped -- hence 
     return true; 
   } 
 


  /***** 
    function getManufacturer (string memory prodType) public view returns (address[])
     { // should return addresses of all the registered manufacturers of products of type 
          "prodType"
 
     }
  ****/
 
 } /**** end of manufacturer manager ****/
