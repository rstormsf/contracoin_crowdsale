var tokenContract = artifacts.require("./ContraCoin.sol");
var crowdsaleContract = artifacts.require("./ContraCoinCrowdsale.sol");

module.exports = async function(deployer, network, accounts) {
  const _name = 'ContraCoin';
  const _symbol = 'CTC';
  const _decimals = 18;

  await deployer.deploy(tokenContract, _name, _symbol, _decimals);
  const deployedToken = await tokenContract.deployed();

  const _cap = web3.toWei(100, 'ether');

  await deployer.deploy(crowdsaleContract, _cap);
  const deployedCrowdsale = await crowdsaleContract.deployed();

  return true;
};
