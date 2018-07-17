pragma solidity 0.4.24;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/crowdsale/Crowdsale.sol";
import "openzeppelin-solidity/contracts/crowdsale/validation/CappedCrowdsale.sol";
// import "openzeppelin-solidity/contracts/crowdsale/RefundableCrowdsale.sol";
// import "openzeppelin-solidity/contracts/crowdsale/MintableCrowdsale.sol";

contract ContraCoinCrowdsale is Crowdsale, CappedCrowdsale {

    constructor(
        uint _rate,
        address _wallet,
        ERC20 _token,
        uint256 _cap
    )
        Crowdsale(_rate, _wallet, _token)
        CappedCrowdsale(_cap)
        public
    {

    }
}
