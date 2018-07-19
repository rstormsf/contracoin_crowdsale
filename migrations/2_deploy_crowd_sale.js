var tokenContract = artifacts.require("./ContraCoin.sol");
var crowdsaleContract = artifacts.require("./ContraCoinCrowdsale.sol");

module.exports = async function(deployer, network, accounts) {
  const _name     = 'ContraCoin';
  const _symbol   = 'CTC';
  const _decimals = 18;

  await deployer.deploy(tokenContract, _name, _symbol, _decimals);
  const deployedToken = await tokenContract.deployed();

  const _rate   = 1;
  const _wallet = accounts[0];
  const _token  = deployedToken.address;
  const _cap    = web3.toWei(100, 'ether');
  const _investorMinCap  = web3.toWei(0.002, 'ether');
  const _investorHardCap = web3.toWei(50, 'ether');

  await deployer.deploy(
    crowdsaleContract,
    _rate,
    _wallet,
    _token,
    _cap,
    _investorMinCap,
    _investorHardCap
  );

  const deployedCrowdsale = await crowdsaleContract.deployed();

  await deployedToken.transferOwnership(deployedCrowdsale.address);

  return true;
};
