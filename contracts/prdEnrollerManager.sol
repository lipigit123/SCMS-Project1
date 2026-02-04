// SPDX-License-Identifier: GPL-3.0 and MIT

// pragma experimental ABIEncoderV2;
pragma solidity ^0.8.19;

interface prdEnrollManager2Admin 
 {  
   enum eoaCategory {notRegistered, manufacturer, retailer, customer}
   //function deposit () external payable; //returns (string memory);
   //function set_eoas(address, uint8) external returns (string memory); 
   function get_eoas(address) external view returns (eoaCategory); 
   //function goingToPay (address payee) external returns (string memory);
 }

 contract prdEnroller
  { 

    address public adminAddress;
   
   function setadminAddr(address _admin) public payable 
    {
     adminAddress = _admin;
    }   
    /*****.  D A T A    T Y P E S.      ******/ 
       enum eoaCategory {notRegistered, manufacturer, retailer, customer}
       struct  prdBatch 
       { uint32 batchNo; 
         string prdType;
         string   size; 
         string manufacturerName;
         address manufacturer;
         uint16 qty;
         uint16 unitPrice;
         //onePrd[] members;   // feature not yet supported
         string mfDate;
         string expDate;     
         bool   detailsFilled; //  set false while enrolling batch  
                               //  set true while enrolling products in batch           
       }   

       struct stock         
        {
          uint16  threshold;     //  if below this -- low stock
          uint16 qty;
        }

       struct onePrd
       {
        uint96 epc;
        address presentOwner;
        address shippedTo;
        //uint8   status;       // 0 - enrolled; 1 - shipped; 2 - received; 3 - stolen/lost;
        uint8   nTransferred;   // no. of times ownnership transferred 
       } 

    /******     S T A T E    V A R I A B L E S.    ****/
       prdBatch[] public enrolledBatches; 
       mapping (uint32 => prdBatch) public batches;      // the key is batch Number 
       mapping (uint256 => address[]) public manufacturers;  
           // the key equals keccak256 (product type, size)
       uint32 public pendingBatchDetails; // The batch no. of the batch which has most recently 
               // been enrolled but the details of the batch are yet to be enrolled 
       mapping(uint256 => stock) stocksOfManufacturers;                 
        /* the key is hash of (address, spec) where 
           address specifies the address of manufacturer and 
           spec is product type & size
           stocks correspond to products of certain type by a 
           specific manufacturer .. 
           batch number doesn't play any role. 
           stock contains quantity available now and a threshold level 
           below which low stock waring is emitted.addons
        */
        mapping (uint256 => uint32) batchNoOfProductSpecOfManufacturer;
         // key = keccak256 (manufacturer address, product type, product size)
        mapping (uint256 => uint16) unitPrice;      
        // key = keccak256 (manufacturer address, product type, product size, batch number)   
        mapping (uint32 => onePrd[]) public batchMembers ;  //the key is batch number
        mapping (uint96 => uint32) public epcToBatchNo; 
           //key : epc; value: manuf's address; 
        uint256 public p;
        
     /****                 E V E N T S    *****************/
      event controlHere (string); // debug -- else suppress
    // emit controlHere ("in computeOrderPrice");
    event reportValue (uint256); // for reporting any value -- else suppress 
    // emit reportValue (uint256(orderPrice));    




    /******     F NU N C T I O N S     *****/
    /****  uses : 1. enrollProductBatch -- invocable by manufacturers
                  2. enrollProdsInBatch -- invocable by manufacturers
                  3. findStock          -- invocable by orederDeliveryManager 
                                                         (thru' interface)  
    */
    function enrollProductBatch (uint32 batchNo, string memory prdType, string memory size, 
                                 string memory manufacturerName, address manufacturer, uint16 qty,
                                 uint16 pricePerUnit, string memory mfDate, string memory expDate, 
                                 uint8  threshold) public
    /* BETTER to input each field one by one and prepare the structure inside the function -- 
       so following header modifeid:
       function enrollProductBatch (prdBatch memory batch, uint8 threshold) public
    *******/
      { prdBatch memory batch = prdBatch (batchNo, prdType, size, manufacturerName, manufacturer, qty,
                                  pricePerUnit, mfDate, expDate, false);

        /* invocable by only enrolled manufacturers to enroll a batch of products  *****/
        /*
        state variables --- it should update
        1. enrolledBatches  -- type prdBatch[];
        2. noOfBatches     -- type uint16;
        3. pendingBatchDetails --addons
        4. batchMembers     -- mapping  (uint32 batchNo => oneprd[]);
        5. batches          -- mapping (uint32 batchNo => prdBatch);
        6. stockOfManufacturers-- mapping (uint256 => stock) ;
                                  key hash (manufacturer,specPrd)

      */
        /**
        string memory some = prdEnrollManager2Admin(adminAddress).get_eoas(msg.sender);
        require (keccak256(abi.encodePacked(some)) 
                      == keccak256(abi.encodePacked("manufacturer")),
                         "can't enroll Product -- as you are not a Manufacturer" );
        ****/
        require (uint8(prdEnrollManager2Admin(adminAddress).get_eoas (msg.sender)) == uint8(eoaCategory.manufacturer),
                               "can't enroll Product -- as you are not a Manufacturer");
        enrolledBatches.push (batch);
        //pendingBatchDetails = batch.batchNo;
        batches[batch.batchNo] = batch;  
        
        /** Now extract "prdType" field & "size" field of "batch" to create a structure 
            (local) & enter the manufacturer if it does not occur already .   **/
        //bytes32 
        // uint j = uint256(keccak256(abi.encodePacked(batch.prdType,batch.size)));
        bytes memory temp = bytes(string.concat (batch.prdType, batch.size));
        uint j = uint256(keccak256(temp));
        // k = uint256 (j);
          if ( manufacturers[j].length != 0 ) 
            { //  search through to check if msg.sender occurs
              //  if not then enter msg.sender
              uint16 i;
              for ( i = 0; i < manufacturers[j].length; i++)
                  if (manufacturers[j][i] != msg.sender)
                   continue;
              if ( i ==  manufacturers[j].length)
                //  does not occur -- hence enter as new manufacturer of an existing product 
                manufacturers[j].push(msg.sender);
            }
            else // first time (length is 0) -- push anyway
              manufacturers[j].push (msg.sender);
        // noOfBatches++ ;   
        // assign stocks properly
        /*
        uint256 keyOfStock = 
                uint256(keccak256(abi.encodePacked(msg.sender, batch.prdType, batch.size)));
        **/
        bytes32 temp2 = bytes32(uint256(uint160(msg.sender)));
        bytes memory temp3 = bytes.concat (temp2, temp);
        // uint256 keyOfStock = uint256(keccak256(bytes.concat (temp2, temp)));
        uint256 keyOfStock = uint256(keccak256(temp3));
        stocksOfManufacturers[keyOfStock].qty += batch.qty;
        stocksOfManufacturers[keyOfStock].threshold = threshold;    
                      // previous threshold overwritten 
        /* stocks correspond to products of certain type by a 
           specific manufacturer .. 
           batch number doesn't play any role
        */

        /****
        // fill in batchNoOfProductSpecOfManufacturer 
        USE keyOfStock itself as keyOfBatchNo -- they comprise the same field! 
        AVOID abi.encodePacked for Oyente

        uint256 keyOfBatchNumbers = 
            uint256(keccak256(abi.encodePacked
                                (batch.prdType, batch.size, msg.sender)));
        batchNoOfProductSpecOfManufacturer[keyOfBatchNumbers] = batch.batchNo; 
        ****/
        uint256 keyOfBatchNumbers = keyOfStock;
        batchNoOfProductSpecOfManufacturer[keyOfBatchNumbers] = batch.batchNo; 

        /* initialize the mapping (uint256 => uint16) unitPrice; 
         abi.encodePacked to be avoided for Oyente
         upto (msg.sender, batch.PrdType, batch.size) already in temp3 as bytes;
         so only batch.bathcNo has to be converted to bytes, concatenated after tepm3
         and the keccaked and finally to unit256.
        uint256 keyOfUnitPrice =  
            uint256(keccak256(abi.encodePacked
                             (msg.sender, batch.prdType, batch.size, batch.batchNo)));
        unitPrice [keyOfUnitPrice] = batch.unitPrice; // needed in computeOrderPrice
        ****/
        bytes32 temp4 = bytes32(uint256(batch.batchNo));
        uint256 keyOfUnitPrice = (uint256 (keccak256 (bytes.concat (temp3, temp4))));
        unitPrice [keyOfUnitPrice] = batch.unitPrice; // needed in computeOrderPrice

        /*** DONE JUST PRIOR TO the previous segment -- TO BE TESTED
             fill in batchNoOfProductSpecOfManufacturer

        uint256 keyOfBatchNumbers = 
            uint256(keccak256(abi.encodePacked
                                (batch.prdType, batch.size, msg.sender)));
        batchNoOfProductSpecOfManufacturer[keyOfBatchNumbers] = batch.batchNo; 
        ****/   
      } // end of enrollProductl


    function enrollProdsInBatch (uint32 batchNo, uint96[] memory epcs ) public
      {
        /*
          string memory some = adminWithPrdManager(adminAddress).get_eoas(msg.sender);
          require (keccak256(abi.encodePacked(some)) 
                      == keccak256(abi.encodePacked("manufacturer")),
                         "can't enroll Product -- as you are not a Manufacturer" ); 
         // check from pendingBatchDetails , whether the pensing batch's manufacturer
         // is same as msg.sender
                   
        */          
          // require (pendingBatchDetails == batchNo, "Mismatched Pending Batch Number") ; 
          // emit controlHere ( "in enrollPrdsInBatch, manufacturer's address");
          // emit reportAddress (batches[batchNo].manufacturer);
          // emit reportAddress (msg.sender);
          require(batches[batchNo].manufacturer == msg.sender, 
                           "you are not a manufacturer of this product");

          require (!batches[batchNo].detailsFilled, "No details Pending");               
          //batchMembers[batchNo].push(members);  
          onePrd memory transient;
          transient.presentOwner = msg.sender;
          transient.shippedTo = address(0);
         // transient.status = 0;
          transient.nTransferred = 0;
          for (uint16 i = 0; i < epcs.length; i++)  
            {
              transient.epc = epcs[i];
              batchMembers[batchNo].push(transient);
              epcToBatchNo[epcs[i]] = batchNo;
            }
              // to be done element by element  
           // enrolledPrdInBatches.push (members);
          batches[batchNo].detailsFilled = true;
    } // end of function enrollProdsInBatch


    function findStockOfManuf ( address manuf, string memory prdType, string memory  size) 
                             public view returns (stock memory)
     { /* invoked by (i) prdEnroller (i.e. self) during prdEnrollmt. by a manuf. 
                         for initializing / increasing stocks of manufs;
                    (ii) orderDeliveryManager for
                         (a) consulting during ordering by a retailer;
                         (b) reducing when a manuf ships an order
       ****/
        /*** get rid of abi.encodePacked for Oyente
         uint256 keyOfStock = 
                uint256(keccak256(abi.encodePacked(manuf, prdType, size)));
         ******/
         bytes32 temp = bytes32 (uint256 (uint160 (manuf)));
         bytes memory temp1 = bytes (string.concat (prdType, size));
         temp1 = bytes.concat (temp, temp1);
         uint256 keyOfStock = uint256(keccak256(temp1));
        /* emit controlHere (" in findStock -- ");
         emit reportValue (uint256(stocksOfManufacturers[keyOfStock].threshold));  
         emit reportValue (uint256(stocksOfManufacturers[keyOfStock].qty));  */
         return stocksOfManufacturers[keyOfStock];  
     }

    function findBatchNo (string memory prodType, string memory prodSize, address manuf)
                                   public view returns (uint32)
     { // interface fn. -- needed by orderDeliveryManager
      // find batch no. from batchNoOfProductSpecOfManufacturer
      //  key = keccak256 (manufacturer address, product type, product size)
      /****** get rid of abi.encodePacked for OYENTE
      uint256 keyOfBatchNumbers = 
            uint256(keccak256(abi.encodePacked (manuf, prodType, prodSize)));
      ******/
      bytes32 temp = bytes32 (uint256 (uint160 (manuf)));
         bytes memory temp1 = bytes (string.concat (prodType, prodSize));
         temp1 = bytes.concat (temp, temp1);
         uint256 keyOfBatchNumbers = uint256(keccak256(temp1));
      uint32 batchNo = batchNoOfProductSpecOfManufacturer[keyOfBatchNumbers];

      return batchNo;
     }
     
    function computeOrderPrice (string memory productType, string memory prodSize, 
                                address placedWith, uint32 batchNo, uint16 qty) 
                                public view returns (uint16)
     { // interface fn. -- needed by orderDeliveryManager     
        // key =      mapping (uint256 => uint16) unitPrice;      
        // key = keccak256 (product type, product size, manufacturer address, batch number)
       //emit controlHere ("in computeOrderPrice with batch number and quantity:");
       //emit reportValue (uint256(batchNo));
       //emit reportValue (uint256(qty));addons

       /**** Get rid of abi.encodePacked for Oyente
       uint256 key = uint256(keccak256(abi.encodePacked(
                                    placedWith, productType, prodSize, batchNo)));
       ******/
       bytes32 temp = bytes32 (uint256 (uint160(placedWith)));
       bytes memory temp1 = bytes.concat(temp, bytes(string.concat (productType, prodSize)));
       temp1 = bytes.concat (temp1, bytes32 (uint256 (batchNo)));
       uint256 key = uint256 (keccak256 (temp1));
       return  qty * unitPrice[key];
     }   // end of computeOrderPrice 


      function whoMake(string memory prodType, string memory size) public 
                      returns (address[] memory )
    {  // invoked by customer. Returns the addresses of ALL the manufacturer 
       // who make the product as specified by its type and size.
         /*** get rid of abi.encodePacked for OYente
         p = uint256 (keccak256(abi.encodePacked(prodType,size)));  
         *****/
         bytes memory temp = bytes(string.concat (prodType, size)); 
         p = uint256 (keccak256 (temp));      
         return manufacturers[p];
         // return only the oldest manufacturer
         //return manufacturers[j][0];
    }

     /*
     function getEnrolledBatches () public view returns (prdBatch[] memory)
      {
        return enrolledBatches;
      } 
     */
     function getBatchMembers(uint32 batchNo) public view returns (onePrd[] memory) {
    return batchMembers[batchNo];
    }
    function getNoOfEnrolledBatches () public view returns (uint16)
     {
       return uint16 (enrolledBatches.length);
     }

    function getBatchNoOfEnrolledBatch (uint256 k)  public view returns (uint32)
     {
        return enrolledBatches[k].batchNo;
     }

    function getManufOfEnrolledBatch (uint256 k) public view returns (address)
     {
       return enrolledBatches[k].manufacturer;
     }
    

    
    function getBatchNoOfEPC (uint96 epc) public view returns (uint32)
       {
          return epcToBatchNo[epc];

       }
    function getManuf (uint32 batchNo) public view returns (address)
       {
          return batches[batchNo].manufacturer;
       }
    
    function getPrdType  (uint32 batchNo) public view returns (string memory)
       {
          return batches[batchNo].prdType;
       }

    function getPrdSize   (uint32 batchNo) public view returns (string memory)
       {
          return batches[batchNo].size;
       } 

    function GetPrdPrice   (uint32 batchNo) public view returns (uint16)
       {
          return batches[batchNo].unitPrice;
       } 
    
    function getMfDate   (uint32 batchNo) public view returns (string memory)
       {
          return batches[batchNo].mfDate;
       } 

    function getExpDate   (uint32 batchNo) public view returns (string memory)
       {
          return batches[batchNo].expDate;
       }    
  



  }      //end of prdEnroller

	

