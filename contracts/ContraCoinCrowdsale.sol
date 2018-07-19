pragma solidity 0.4.24;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/crowdsale/Crowdsale.sol";
import "openzeppelin-solidity/contracts/crowdsale/validation/CappedCrowdsale.sol";
import "openzeppelin-solidity/contracts/crowdsale/emission/MintedCrowdsale.sol";
// import "openzeppelin-solidity/contracts/crowdsale/RefundableCrowdsale.sol";

contract ContraCoinCrowdsale is Crowdsale, CappedCrowdsale, MintedCrowdsale {

    // Track investor contributions
    uint256 public investorMinCap;
    uint256 public investorHardCap;
    mapping(address => uint256) public contributions;

    constructor(
        uint    _rate,
        address _wallet,
        ERC20   _token,
        uint256 _hardCap,
        uint256 _investorMinCap,
        uint256 _investorHardCap
    )
        Crowdsale(_rate, _wallet, _token)
        CappedCrowdsale(_hardCap)
        public
    {
        investorMinCap  = _investorMinCap;
        investorHardCap = _investorHardCap;
    }

    /**
    * @dev Extend parent behavior requiring purchase to respect investor min/max funding cap.
    * @param _beneficiary Token purchaser
    * @param _weiAmount Amount of wei contributed
    */
    function _preValidatePurchase(
        address _beneficiary,
        uint256 _weiAmount
    )
        internal
    {
        super._preValidatePurchase(_beneficiary, _weiAmount);
        // TODO: Is this gas efficient?
        uint256 _existingContribution = contributions[_beneficiary];
        uint256 _newContribution = _existingContribution.add(_weiAmount);
        // require(_newContribution >= investorMinCap && _newContribution <= investorHardCap);
        require(_newContribution >= investorMinCap);
        require(_newContribution <= investorHardCap);
        contributions[_beneficiary] = _newContribution;

        // require(investorMinCap <= contributions[_beneficiary].add(_weiAmount) <= investorHardCap);
    }
}
