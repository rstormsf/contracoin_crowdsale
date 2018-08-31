require('babel-register');
require('babel-polyfill');

var tokenContract = artifacts.require("./ContraCoin.sol");
var crowdsaleContract = artifacts.require("./ContraCoinCrowdsale.sol");

const ether = (n) => new web3.BigNumber(web3.toWei(n, 'ether'));

const duration = {
  seconds: function (val) { return val; },
  minutes: function (val) { return val * this.seconds(60); },
  hours: function (val) { return val * this.minutes(60); },
  days: function (val) { return val * this.hours(24); },
  weeks: function (val) { return val * this.days(7); },
  years: function (val) { return val * this.days(365); },
};

module.exports = async function(deployer, network, accounts) {
  const _name     = 'ContraCoin';
  const _symbol   = 'CTC';
  const _decimals = 18;

  await deployer.deploy(tokenContract, _name, _symbol, _decimals);
  const deployedToken = await tokenContract.deployed();

  // const latestBlock = await web3.eth.getBlock('latest');
  // const latestTime = latestBlock.timestamp;
  const latestTime = (new Date).getTime();

  console.log('latestTime', latestTime);

  const _rate           = 500;
  const _wallet         = accounts[0]; // TODO: Replace me
  const _token          = deployedToken.address;
  const _openingTime    = latestTime + duration.minutes(30);
  const _closingTime    = _openingTime + duration.weeks(1);
  const _cap            = ether(100);
  const _goal           = ether(50);
  const _foundersFund   = accounts[0]; // TODO: Replace me
  const _foundationFund = accounts[0]; // TODO: Replace me
  const _partnersFund   = accounts[0]; // TODO: Replace me
  const _releaseTime    = _closingTime + duration.days(1);

  await deployer.deploy(
    crowdsaleContract,
    _rate,
    _wallet,
    _token,
    _openingTime,
    _closingTime,
    _cap,
    _goal,
    _foundersFund,
    _foundationFund,
    _partnersFund,
    _releaseTime
  );

  const deployedCrowdsale = await crowdsaleContract.deployed();

  // pause token
  await deployedToken.pause();

  // Transfer token ownership to crowdsale
  await deployedToken.transferOwnership(deployedCrowdsale.address);

  return true;
};
