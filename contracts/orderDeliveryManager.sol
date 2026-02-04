// SPDX-License-Identifier: GPL-3.0 and MIT

// pragma experimental ABIEncoderV2;
pragma solidity ^0.8.19;
// as productManager became too big, it is split into 3 parts- this is 2nd one

/****   Tasks to do -- JULY22, '23

   (i) data type and state variable for stocksOfRetailers; -- EXISTS
  (ii) function findStockOfRetailers
****************************************/


/*****      I N T E R F A C E S           **********/
interface orderDeliveryManager2Admin 
 {
   function deposit () external payable; //returns (string memory);
   /*function set_eoas(address, string memory) external returns (string memory); 
   function get_eoas(address) external view returns (string memory); 
   function goingToPay (address payee) external returns (string memory);
   ****/
   enum eoaCategory {notRegistered, manufacturer, retailer, customer}
   function get_eoas(address) external view returns (eoaCategory); 
   function goingToPay (address payee) external returns (string memory);
 }
 
 interface orderDelivery2PrdEnrollManager
  {
   struct stock         
    {
     uint16  threshold;     //  if below this -- low stock
     uint16 qty;
    }

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
    
     
    function findStockOfManuf (address, string memory, string memory) 
                                 external returns (stock memory); 
    function findBatchNo (string memory, string memory, address manuf)
                                 external returns (uint32);
       // arg1: prdType, arg2: prodSize, arg3: manufacturer's address; retrns batchNo. 
    function computeOrderPrice (string memory productType, string memory prodSize, 
                                address placedWith, uint32 batchNo, uint16 qty) 
                                external returns (uint16);
        // arg1: prdtype, srg2: prdSize, arg3: amnuf's address, arg4: batchNo, arg5: qty;
        //   returns proce of order 
    function getNoOfEnrolledBatches () external returns (uint16);
    function getBatchNoOfEnrolledBatch (uint256)  external returns (uint32);
    function getManufOfEnrolledBatch (uint256) external returns (address); 
  }


contract orderDelivery
 {  
     address public adminAddress;
   
   function setadminAddr(address _admin) public payable 
    {
     adminAddress = _admin;
    } 

    address public prdEnrollManagerAddress;
   
   function setPrdEnrollManagerAddr(address _prdEnrollManager) public payable 
    {
     prdEnrollManagerAddress = _prdEnrollManager;
    } 
    /****        D A T A      T Y P E S  ***/
    enum eoaCategory {notRegistered, manufacturer, retailer, customer}
    struct stock         
        {
          uint16  threshold;     //  if below this -- low stock
          uint16 qty;
        }
    enum stateOfIncompleteOrder {askedToBeShipped, beingShipped, received}
    struct incompleteOrder
     { 
      // an order comprises  (manufacturer address, product type, size, batch no. and qty)
      uint256 orderNo; // keccak256 (manufacturerAddress, productType, productSize, batchNo)
         // this contract assigns an order no. to each order placed with itself
         // either from retailer or from customer;
      uint32 inBatch; // index of the array "enrolledBatches"
      stateOfIncompleteOrder state;
      address by; // order placed by
      address to; // order placed to
      uint16  qty;
       /****
        EoA placing the order gives msg.value = orderPrice (i.e., pays the entire order cost).
        however, only half of this is released immediately (through admin) and 
        the remaining half kept reserved (locked) against the supplier 
        -- only to be released (through admin) after the EoA RECEIVES the order;
        however, if the order is not received within certain period, the requester 
        can cancel the order, whereupon the order value and this remaining half 
        will be penalised (through admin) and piad to the requester (payer);
        also, five times of the order value will be penalised if fake product is found.
        NOT YET DONE -- to identify the enhancements
        ****/ 
      uint256 lockedBalancePayee; 
      uint256 bookedBalancePayer; // Is it needed?
     } 
     
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

    /****        S T A T E     V A R I A B L E S    ***/
    mapping (uint256 => incompleteOrder) public pendingOrders; 
       // key orderNo

    mapping(address => mapping (uint256 => stock)) public stocksOfRetailers;  
        /*  key = retailers address to a mapping of 
            keccak256 of (manufacturer's address, product type & size);
            (unfortunately, while setting the value, only manufacturer's address
            has been used in retailerReceivedOrder function)
            *************************************************
            value -- (threshold, qty) where qty gives the present stock 
            of the retailer, and threshold gives the level below which 
            a low stock warning to be emitted to the retailer.
            entry created when retailer receives an order; 
            entry checked when customer places order
    
     /****                 E V E N T S    *****************/

     event controlHere (string); // debug -- else suppress
    // emit controlHere ("in computeOrderPrice");
    event reportValue (uint256); // for reporting any value -- else suppress 
    // emit reportValue (uint256(orderPrice));    
     event reportAddress (address);
    //emit reportAddress (msg.sender);
     event reportBytes32 (bytes32);
    // emit reportBytes32 (ordNo)
    event reportString (string);
    // emit reportString (invoker);
    event reportEOAtype (eoaCategory);
    event reportStateOfOrder (stateOfIncompleteOrder);
    event loStock (address manuf, string  productType, 
                           string prodSize, int16 remaining);
    event noStock1 (string, address, string, uint16, string, string, string, 
                     string, string, address);
     // emit noStock1 ("Hey retailer", address msg.sender, "! you wanted", qty, 
     //                        "numbers of product type", productType,
     //                               "and size", prodSize,  "from manufacturer", placedWith);
    event noStock2 (string, uint16, string, int16);
    // emit noStock2 ("however, only", available, "is available; hence, shortfall is", shortFall)   
    event plsShip (string, address manufac, string, address retailr, string  productType, 
                           string  prodSize, uint16 qty);
    event  reportInadequateAdvancePaid (string, address retailer, 
                                         string, uint256, string, uint16);
    //emit reportInadequateAdvancePaid 
    //               ("Hey retailer", msg.sender, "the advance amt. of", msg.value, 
    //                     "is less than the reqd. amt. of", orderPrice);
    event forgotToEnroll (string);
    // emit forgotToEnroll 
    //          ("strange that an order's batch No. is not found among enrolled Batches!");
    event createdOrder (string, uint256);
    // emit createdOrder ("created order number", thisOne.orderNo);
    event notifyReceiptByRetailer( string, address, string, address, string, string);
    /* emit notifyReceiptByRetailer 
             ("Hey Manufacturer with address:", address /*manufAddrs ,
              "the retailer with address", msg.sender, "has received the shipment",
              "your payment is released -- check your balance.");*/
    event retailersStockReport (string, address, string, uint16);
    /* emit retailersStockReport ("after receipt the stock of retailer with address ",
                                  msg.sender, "is ",
               stocksOfRetailers[msg.sender][uint256(uint160(manufacturerAddrs))].qty);  */
     

     event thisOrderShipped (string, uint256, string, address, string, address);
    /*emit thisOrderShipped ("Please note that oder Number", orderNo, 
                                 "is shipped to the  retailer", retailr, 
                                 "from the manufacturer",manufac ); */     
    
      event thisOrderReceived (string, uint256, string, address );
     /*  emit thisOrderReceived ("Please note that Order Number", orderNo, 
                         "is received by ", msg.sender);  */                                           
     
    /****           F U N C T I O N S         ***/
    /* conceived: 1. orderProduct -- would be used by both retailers and customers
                       uses: a) creatAnOrder
                             b) computeOrderPrice
                             c) shipOrder -- 
                  2. orderShipped -- invocable by manufacturers / retailers
                  3. orderReceived -- invocable by retailers / customers
    ***/

   function orderProduct (string memory productType, string memory prodSize, 
                uint16 qty, address placedWith) public payable
      {  
        /*  (may change it to orderProduct to be used by both retailers and customers).
              retailer places order with orderDeliveryManager; 
              prdEnrollerManager maintains stock of  PRODUCTS OF CERTAIN SPEC 
              (product type & size) produced by manufacturer -- so stock is amapping 
              from keccak256 (address, type, size) to stock (i.e. (threshold, qty)).
        */
        /**** DEBUG events   ****/
        emit controlHere ("on entry to order product -- requester & requested :");
        emit reportAddress (msg.sender);
        emit reportAddress (placedWith);
        uint8 invoker = uint8 (orderDeliveryManager2Admin (adminAddress).get_eoas(msg.sender));
        uint8 meantFor = uint8 (orderDeliveryManager2Admin (adminAddress).get_eoas(placedWith));         
        emit controlHere ("after obtaining requester's EoA type through interface");
        emit reportEOAtype (eoaCategory (invoker));
        emit controlHere ("and type of requested is");
        emit reportEOAtype (eoaCategory(meantFor));
        /************    *******/
        /*** Get rid of abi.encodePacked     
        bool cond1 = (keccak256 (abi.encodePacked (invoker)) 
                             == keccak256(abi.encodePacked("retailer")))                   
                && (keccak256(abi.encodePacked(meantFor)) 
                             == keccak256(abi.encodePacked("manufacturer")))
               || (keccak256 (abi.encodePacked (invoker)) 
                             == keccak256(abi.encodePacked("Customer")))                   
                && (keccak256(abi.encodePacked(meantFor)) 
                             == keccak256(abi.encodePacked("retailer")));
        ******/
        bool cond1 = (   (invoker == uint8 (eoaCategory.retailer) 
                      && meantFor == uint8 (eoaCategory.manufacturer))
                      || (invoker == uint8 (eoaCategory.customer)
                      && meantFor == uint8 (eoaCategory.retailer)));                     
          require (cond1, 
          "either a non-retailer is placing order or it is being placed with a non-manufacturer");
    

        /** following (up to "emit") for debug 
        //specProduct memory thisSpec = specProduct (productType, prodSize);
        // uint256 keyOfStock = uint256(keccak256(abi.encodePacked(placedWith, thisSpec)));
        uint256 keyOfStock =
                   uint256(keccak256(abi.encodePacked(placedWith, productType, prodSize)));
        //emit controlHere ("before Checking the stock");
        //emit reportValue (keyOfStock);
        ***/

        // does manufacturer have the required quantity in stock?  
        // NEEDS TO BE MODIFIED TO ENCOMPASS customer's ordering of product
        // by checking either manuf's stock or retailer's stock

       stock memory thisOne2 = 
                  stock (orderDelivery2PrdEnrollManager(prdEnrollManagerAddress).
                            findStockOfManuf (placedWith, productType, prodSize).threshold,
                         orderDelivery2PrdEnrollManager(prdEnrollManagerAddress).
                                    findStockOfManuf (placedWith, productType, prodSize).qty); 
        uint16 available = thisOne2.qty;                            
        emit controlHere ("before placing check the stock");
        emit reportValue (qty);
         // keyOfStock is independent of batches and hence, stock is across batches. 
        int16 shortFall = int16 (qty) - int16 (available);  

        if (shortFall > 0) 
          { 
              emit noStock1 ("Hey requester", msg.sender, "! you wanted", qty, 
                            "numbers of product type", productType,
                                "and size", prodSize,  "from ", placedWith);
             emit noStock2 ("however, available is only", available, 
                                "so shortfall is", shortFall);
          }
         else
          { 
           /* check payment etc.
              msg.value == price of order; 
              compute price from 
              unit price (product type, product size, manufacturer, batch number)

           */
           // find batch no. from batchNoOfProductSpecOfManufacturer from 
           // prdEnrollerManager
          
           //uint32 batchNo = batchNoOfProductSpecOfManufacturer[keyOfBatchNumbers];
           uint32 batchNo = orderDelivery2PrdEnrollManager(prdEnrollManagerAddress).
                               findBatchNo (productType, prodSize, placedWith);
           emit controlHere ("before calling computeOrderPrice with batchNo as:");
           emit reportValue (uint256(batchNo));
           uint16 orderPrice =  orderDelivery2PrdEnrollManager(prdEnrollManagerAddress).
                                     computeOrderPrice (productType, prodSize, 
                                                     placedWith, batchNo, qty);     
           // compare msg.value with orderPrice;
           emit controlHere ("back from computeOrderPrice with orderPrice computed as :");
           emit reportValue (uint256(orderPrice)); 
           if (msg.value < orderPrice)
             emit reportInadequateAdvancePaid 
                   ("Hey requester", msg.sender,"the advance amt. of", msg.value, 
                         "is less than the reqd. amt. of", orderPrice);       
            else 
              { 
                // creat an order and put it in the array 
               incompleteOrder memory thisOne =
                         createAnOrder (placedWith, msg.sender, productType, 
                                                         prodSize, qty, batchNo);                                          
               emit createdOrder ("back in caller -- created order number", thisOne.orderNo);
               emit controlHere (
                "before putting in pendingOrders, inBatch and lockedBalancePayee of thisOne:");
               emit reportValue (uint256(thisOne.inBatch));
               emit reportValue (uint256(thisOne.lockedBalancePayee));
               pendingOrders[thisOne.orderNo] = thisOne;  // *** not working !!
               emit controlHere (
              "after putting in pendingOrders, inBatch and lockedBalancePayee of pendingOrder entry:");       
              emit reportValue (uint256(pendingOrders[thisOne.orderNo].inBatch));
              emit reportValue (uint256(pendingOrders[thisOne.orderNo].lockedBalancePayee));
              emit controlHere ("in else of if-msg.value < orderPrice -- asking to ship");
               askToShip (placedWith, msg.sender, productType, prodSize, qty);   
               //  update the stock; if below threshold, emit loStock event;
               thisOne2.qty -=  qty;  
               //  uint256 thrshld -- a field in prdBatch
               if ( thisOne2.qty < thisOne2.threshold) // changed this code
                 emit loStock (placedWith, productType, prodSize, shortFall);
              }
          }

     }   // end of orderProduct

  /*
    function  createAnOrder (address placedWith, address requester, 
                             string memory productType, string memory prodSize, 
                             uint16 qty, uint16 batchNo) 
                             internal returns (incompleteOrder memory);
     {
      // invoked by ordersProduct; initiates this contract's state variable "pendingOrders" 
      //      
      "before putting in pendingOrders, inBatch and lockedBalancePayee of thisOne:");
               emit reportValue (uint256(thisOne.inBatch));
               emit reportValue (uint256(thisOne.lockedBalancePayee));
               pendingOrders[thisOne.orderNo] = thisOne;  
               emit controlHere (
            "after putting in pendingOrders, inBatch and lockedBalancePayee of pendingOrder entry:");       
               emit reportValue (uint256(pendingOrders[thisOne.orderNo].inBatch));
               emit reportValue (uint256(pendingOrders[thisOne.orderNo].lockedBalancePayee)); 
     }
  */
    
    function createAnOrder (address to, address by, string memory productType, 
                           string memory prodSize, uint16 qty, uint32 batchNo
                           )  internal returns (incompleteOrder memory )
     {
      /* creates an order 
       struct incompleteOrders
       { 
        // an order comprises  (manufacturer address, product type, size, batch no. and qty)
        uint256 orderNo; // keccak256 (manufacturerAddress, productType, productSize, batchNo)
         // product manager assigns an order no. to each order placed with itself
         // either from retailer or from customer;
        uint32 inBatch; // index of the array "enrolledBatches"
        stateOfIncompleteOrders state;
        address by; // order placed by
        address to; // order placed to
        uint16 lockedBalancePayee;
        uint16 lockedBalancePayer;
       }*/
       // create a local structure;
       // insert in the mapping "incompleteOrders" -- thye state field may remain blank yet
       // returns orderNo or -1
       incompleteOrder memory localOrder;
       /******   Get rid of abi.encodePacked    
       bytes32 ordNo = keccak256(abi.encodePacked
                                          (to, productType, prodSize, batchNo));
       ******/
       bytes memory temp1 = bytes (string.concat (productType, prodSize));
       bytes32 temp = bytes32 (uint256(uint160(to)));
       bytes32 temp2 = bytes32(uint256 (batchNo));
       bytes memory temp3 = bytes.concat (temp, temp1, temp2);
       bytes32 ordNo = keccak256(temp3);
       emit controlHere("in createOrder -- order No as bytes32");
       emit reportBytes32 (ordNo);
       localOrder.orderNo = uint256(ordNo);
       /* localOrder.orderNo = uint256(keccak256(abi.encodePacked
                                          (to, productType, prodSize, batchNo)));
       */
       emit createdOrder ("in createOrder -- created order number", localOrder.orderNo);
       // search in "enrolledBatches" (in "prdEnrollerManager") to identify the batch 
       //  to which this lot of products belong;
       // the search key is the pair (batchNo, manufacturer Address)
      // So interfacing with "prdEnrollerManager" needs a fn. to get 
      //   (i) the length of array "enrolledBatches" and 
      //  (ii) each entry (i.e. k th entry ) of "enrolledBatches"
      uint16 noOfEnrolledBatches 
                  = orderDelivery2PrdEnrollManager(prdEnrollManagerAddress).
                                getNoOfEnrolledBatches ();
      uint16 k;
       for (k = 0; k < noOfEnrolledBatches; k++)
          if (orderDelivery2PrdEnrollManager(prdEnrollManagerAddress).
                                getBatchNoOfEnrolledBatch(k) == batchNo 
               && 
              orderDelivery2PrdEnrollManager(prdEnrollManagerAddress).
                                     getManufOfEnrolledBatch (k) == to) break;
       if (k == noOfEnrolledBatches)
        { emit forgotToEnroll 
              ("strange that an order's batch No. is not found among enrolled Batches!");
          require (false, "no point in pursuing it");
        }
        else
       localOrder.inBatch = k;
       localOrder.state = stateOfIncompleteOrder.askedToBeShipped; 
       localOrder.qty = qty;
       localOrder.by = by;
       localOrder.to = to;
       // EoA placing the order gives msg.value = orderPrice (i.e., pays the entire order cost).
       // however, only half of this is released immediately and the remaining
       // half kept reserved(locked) against the supplier 
       // -- only to be released after the EoA RECEIVES the order; 
       // at present entire amt. is locked
       localOrder.lockedBalancePayee += msg.value;
       return localOrder;
     }                     

   
   function askToShip (address manufac, address retailr,string memory productType, 
                           string memory prodSize, uint16 qty ) public returns (string memory)
     {
       // emit an event having the above parameters 
       // also switch the state of each product from "enrolled" to "been asked to ship".
        
        emit plsShip ("Hey manufacturer, please ship", manufac, "to the retailer", 
                            retailr, productType, prodSize, qty );

        return ("aarKichhuKoriNi");

       
     }   

     
     function orderShipped (uint256 orderNo, address retailerAddrs, address manufac ) 
                                 public returns (string memory)
      {
         emit controlHere ("Address of manufacturer");
         emit reportAddress (manufac);
         emit controlHere ("Address of retailer");
         emit reportAddress (retailerAddrs);
         emit thisOrderShipped ("Please note that Order Number", orderNo, 
                                 "is shipped to the  retailer", retailerAddrs, 
                                 "from the manufacturer",manufac );

         pendingOrders[orderNo].state = stateOfIncompleteOrder.beingShipped;                        
        return ("Order is shipped");
      }        


    /*
    function orderReceived (uint256 orderNo )  
                              public returns (string memory)
      { 
        // invoked by retailer/customer
         emit thisOrderReceived ("Please note that Order Number", orderNo, 
                         "is received by ", msg.sender);
         pendingOrders[orderNo].state = stateOfIncompleteOrder.received;                 
         return ("Order is received");

      }    
    */
     function retailerRecivedOrder (uint256 orderNo) public returns (string memory) 
   {
     //invoked by -- a retailer
     // find the manufacturer's address (addrsManuf) from "orderNo";
      // get it from interface --  prdBatch[] memory enrolledBatches;
      incompleteOrder memory thisPendingOrder = pendingOrders[orderNo];
      uint32 itsIndexInEnrolledBatch = thisPendingOrder.inBatch;
      address manufacturerAddrs = 
               orderDelivery2PrdEnrollManager(prdEnrollManagerAddress).
                                  getManufOfEnrolledBatch (itsIndexInEnrolledBatch);
     // address manufacturerAddrs = orderDelivery2PrdEnrollManage0x4B20993Bc481177ec7E8f571ceCaE8A9e22C02dbr(prdEnrollManagerAddress).
                             //  getEnrolledBatches (productType, prodSize, placedWith);
      emit controlHere ("Address of manufacturer");
      emit reportAddress (manufacturerAddrs);

     //       and the retailer's address (addrsRetailer) from"orderNo";
     address retailerAddrs = pendingOrders[orderNo].by;
     
     emit controlHere ("Address of retailer");
     emit reportAddress (retailerAddrs);
     emit controlHere ("Address of msg.sender");
     emit reportAddress (msg.sender);

     // compare with msg.sender for cross check
     require (retailerAddrs == msg.sender, 
               "who are you; order was placed by someone else!");

    // unlock the payment to the manufacturer;
        
     orderDeliveryManager2Admin(adminAddress).goingToPay (manufacturerAddrs);
     orderDeliveryManager2Admin(adminAddress).deposit 
                       {value:pendingOrders[orderNo].lockedBalancePayee}(); 

     // notify (emit) suitable message to the manufacturer;
     emit notifyReceiptByRetailer 
             ("Hey Manufacturer with address:", manufacturerAddrs,
              "the retailer with address", msg.sender, "has received the shipment",
              "your payment is released -- check your balance.");
     
     // update retailer's stock of this product;

     pendingOrders[orderNo].state = stateOfIncompleteOrder.received;
     stocksOfRetailers[msg.sender][uint256(uint160(manufacturerAddrs))].qty += 
                                           pendingOrders[orderNo].qty;
     stocksOfRetailers[msg.sender][uint256(uint160(manufacturerAddrs))].threshold 
                                                         = pendingOrders[orderNo].qty/10;
     emit retailersStockReport ("after received the stock of retailer with address ",
                                  msg.sender, "is ",
               stocksOfRetailers[msg.sender][uint256(uint160(manufacturerAddrs))].qty);
    
     // remove this orderNo from pending orders. 

     //delete pendingOrders[orderNo];  //  after 1 year

     //update each product's present ownter and its status
     return ("Order is received");

   } // end of retailerReceivesOrder 

   function findStockOfRetailer (address retailer, address manuf)
                               public view returns (stock memory)
    { 
     uint256 k = uint256 (uint160(manuf)); 
     return (stocksOfRetailers[retailer][k]);
    }
     
 }    // end of orderDelevery
