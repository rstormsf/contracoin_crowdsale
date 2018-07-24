pragma solidity 0.4.24;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/PausableToken.sol";
import "openzeppelin-solidity/contracts/token/ERC20/MintableToken.sol";
import "openzeppelin-solidity/contracts/crowdsale/Crowdsale.sol";
import "openzeppelin-solidity/contracts/crowdsale/distribution/RefundableCrowdsale.sol";
import "openzeppelin-solidity/contracts/crowdsale/emission/MintedCrowdsale.sol";
import "openzeppelin-solidity/contracts/crowdsale/validation/TimedCrowdsale.sol";
import "openzeppelin-solidity/contracts/crowdsale/validation/CappedCrowdsale.sol";
import "openzeppelin-solidity/contracts/crowdsale/validation/WhitelistedCrowdsale.sol";

contract ContraCoinCrowdsale is Crowdsale, TimedCrowdsale, CappedCrowdsale, MintedCrowdsale, WhitelistedCrowdsale, RefundableCrowdsale {

  // Track investor contributions
  uint256 public investorMinCap;
  uint256 public investorHardCap;
  mapping(address => uint256) public contributions;

  // Crowdsale Stages
  enum CrowdsaleStage { PreICO, ICO }
  // Default to presale stage
  CrowdsaleStage public stage = CrowdsaleStage.PreICO;

  // Token Distribution
  address public foundersFund;
  address public foundationFund;
  address public partnersFund;
  uint256 public tokenSalePercentage  = 70;
  uint256 public foundersPercentage   = 10;
  uint256 public foundationPercentage = 10;
  uint256 public partnersPercentage   = 10;

  constructor(
    uint    _rate,
    address _wallet,
    ERC20   _token,
    uint256 _openingTime,
    uint256 _closingTime,
    uint256 _hardCap,
    uint256 _investorMinCap,
    uint256 _investorHardCap,
    uint256 _goal,
    address _foundersFund,
    address _foundationFund,
    address _partnersFund
  )
    Crowdsale(_rate, _wallet, _token)
    TimedCrowdsale(_openingTime, _closingTime)
    CappedCrowdsale(_hardCap)
    RefundableCrowdsale(_goal)
    public
  {
    // require(_goal <= _hardCap);
    investorMinCap  = _investorMinCap;
    investorHardCap = _investorHardCap;
    foundersFund = _foundersFund;
    foundationFund = _foundationFund;
    partnersFund = _partnersFund;
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
    require(_newContribution >= investorMinCap && _newContribution <= investorHardCap);
    contributions[_beneficiary] = _newContribution;
  }

  /**
  * @dev Returns the amount contributed so far by a sepecific user.
  * @param _beneficiary Address of contributor
  * @return User contribution so far
  */
  function getUserContribution(address _beneficiary)
    public view returns (uint256)
  {
    return contributions[_beneficiary];
  }

  /**
  * @dev Allows admin to update the crowdsale stage and rate
  * @param _stage Crowdsale stage
  */
  function setCrowdsaleStage(uint _stage) public onlyOwner {
    if (uint(CrowdsaleStage.PreICO) == _stage) {
      stage = CrowdsaleStage.PreICO;
    } else if (uint(CrowdsaleStage.ICO) == _stage) {
      stage = CrowdsaleStage.ICO;
    }

    if (stage == CrowdsaleStage.PreICO) {
      rate = 500;
    } else if (stage == CrowdsaleStage.ICO) {
      rate = 250;
    }
  }

  /**
   * @dev forwards funds to the wallet during the PreICO stage, then the refund vault during ICO stage
   */
  function _forwardFunds() internal {
    if (stage == CrowdsaleStage.PreICO) {
      wallet.transfer(msg.value);
    } else if (stage == CrowdsaleStage.ICO) {
      super._forwardFunds();
    }
  }

  /**
   * @dev enables token transfers, called when owner calls finalize()
   */
  function finalization() internal {
    if (goalReached()) {
      // Track amount of tokens minted in the crowdsale
      MintableToken _mintableToken = MintableToken(token);
      uint256 _alreadyMinted = _mintableToken.totalSupply();

      // Calculate the final total supply from the amount of tokens minted in the crowdsale
      // Use the public sale percentage to evaluate this figure
      uint256 _finalTotalSupply = _alreadyMinted.div(tokenSalePercentage).mul(100);

      // Mint tokens for funds
      _mintableToken.mint(foundersFund,   _finalTotalSupply.div(foundersPercentage));
      _mintableToken.mint(foundationFund, _finalTotalSupply.div(foundationPercentage));
      _mintableToken.mint(partnersFund,   _finalTotalSupply.div(partnersPercentage));

      _mintableToken.finishMinting();
      PausableToken(token).unpause();
    }

    super.finalization();
  }
}
