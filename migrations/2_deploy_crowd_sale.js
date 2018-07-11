var ContraCoin = artifacts.require("./ContraCoin.sol");

module.exports = async function(deployer, network, accounts) {
  await deployer.deploy(ContraCoin, "ContraCoin", "CTC", 18);
  const deployedToken = await ContraCoin.deployed();
  console.log("ContraCoin Address: ", deployedToken.address)
};
