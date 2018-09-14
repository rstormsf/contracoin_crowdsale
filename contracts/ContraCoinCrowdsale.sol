pragma solidity 0.4.24;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/PausableToken.sol";
import "openzeppelin-solidity/contracts/token/ERC20/MintableToken.sol";
import "openzeppelin-solidity/contracts/token/ERC20/TokenTimelock.sol";
import "openzeppelin-solidity/contracts/crowdsale/Crowdsale.sol";
import "openzeppelin-solidity/contracts/crowdsale/distribution/RefundableCrowdsale.sol";
import "openzeppelin-solidity/contracts/crowdsale/emission/MintedCrowdsale.sol";
import "openzeppelin-solidity/contracts/crowdsale/validation/TimedCrowdsale.sol";
import "openzeppelin-solidity/contracts/crowdsale/validation/CappedCrowdsale.sol";
import "openzeppelin-solidity/contracts/crowdsale/validation/WhitelistedCrowdsale.sol";

contract ContraCoinCrowdsale is Crowdsale, TimedCrowdsale, CappedCrowdsale, MintedCrowdsale, WhitelistedCrowdsale, RefundableCrowdsale {

  // Track investor contributions
  uint256 public investorMinCap = 2000000000000000; // 0.002 ether
  uint256 public investorHardCap = 50000000000000000000; // 50 ether
  mapping(address => uint256) public contributions;

  // Crowdsale Stages
  enum CrowdsaleStage { PreICO, ICO }
  // Default to presale stage
  CrowdsaleStage public stage = CrowdsaleStage.PreICO;

  // Token Distribution
  uint256 public tokenSalePercentage  = 70;
  uint256 public foundersPercentage   = 20;
  uint256 public partnersPercentage   = 10;

  // Token reserve funds
  address public foundersFund;
  address public partnersFund;

  // Token time lock
  uint256 public releaseTime;
  address public foundersTimelock;
  address public partnersTimelock;

  constructor(
    uint    _rate,
    address _wallet,
    ERC20   _token,
    uint256 _openingTime,
    uint256 _closingTime,
    uint256 _cap,
    uint256 _goal,
    address _foundersFund,
    address _partnersFund,
    uint256 _releaseTime
  )
    Crowdsale(_rate, _wallet, _token)
    TimedCrowdsale(_openingTime, _closingTime)
    CappedCrowdsale(_cap)
    RefundableCrowdsale(_goal)
    public
  {
    require(_goal <= _cap);
    foundersFund   = _foundersFund;
    partnersFund   = _partnersFund;
    releaseTime    = _releaseTime;
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
  }

  /**
  * @dev Allows admin to update the crowdsale rate
  * @param _rate Crowdsale stage
  */
  function setRate(uint _rate) public onlyOwner {
    rate = _rate;
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

      foundersTimelock   = new TokenTimelock(token, foundersFund, releaseTime);
      partnersTimelock   = new TokenTimelock(token, partnersFund, releaseTime);

      // Mint tokens for funds
      _mintableToken.mint(foundersTimelock,   _finalTotalSupply.mul(foundersPercentage).div(100));
      _mintableToken.mint(partnersTimelock,   _finalTotalSupply.mul(partnersPercentage).div(100));

      // Unpause the token
      PausableToken _pausableToken = PausableToken(token);
      _pausableToken.unpause();
      _pausableToken.transferOwnership(wallet);
    }

    super.finalization();
  }
}
