pragma solidity 0.4.24;

// import "./ContraCoin.sol";
// import "openzeppelin-solidity/contracts/crowdsale/validation/CappedCrowdsale.sol";
// import "openzeppelin-solidity/contracts/crowdsale/RefundableCrowdsale.sol";
// import "openzeppelin-solidity/contracts/crowdsale/MintableCrowdsale.sol";

contract ContraCoinCrowdsale {
    uint256 public cap;

    constructor(uint256 _cap) public {
        cap = _cap;
    }
}
