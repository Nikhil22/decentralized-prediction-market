pragma solidity ^0.4.10;

contract Owned {
   address public owner;
   event LogNewOwner (address sender,address oldOwner, address newOwner);

   function Owned () {
       owner = msg.sender;
   }

   function changeOwner (address newOwner)
       isOwner
       newOwnerNotZero(newOwner)
       returns(bool success)
   {
       LogNewOwner (msg.sender, owner, newOwner);
       owner = newOwner;
       return true;
   }

   modifier isOwner {
     require(msg.sender == owner);
     _;
   }

   modifier newOwnerNotZero(address newOwner) {
     require(newOwner != 0);
     _;
   }

}
