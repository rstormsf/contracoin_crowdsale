pragma solidity 0.4.24;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/crowdsale/Crowdsale.sol";
import "openzeppelin-solidity/contracts/crowdsale/validation/CappedCrowdsale.sol";
import "openzeppelin-solidity/contracts/crowdsale/emission/MintedCrowdsale.sol";
// import "openzeppelin-solidity/contracts/crowdsale/RefundableCrowdsale.sol";

contract ContraCoinCrowdsale is Crowdsale, CappedCrowdsale, MintedCrowdsale {

    constructor(
        uint    _rate,
        address _wallet,
        ERC20   _token,
        uint256 _hardCap,
        uint256 _minCap
    )
        Crowdsale(_rate, _wallet, _token)
        CappedCrowdsale(_hardCap)
        public
    {

    }
}
