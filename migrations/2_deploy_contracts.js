const FakeHegicToken = artifacts.require('FakeHegicToken');
const FakeRHegicToken = artifacts.require('FakeRHegicToken');
const IOUTokenRedemption = artifacts.require('IOUTokenRedemption');
const FakeHegicStakingPool = artifacts.require('FakeHegicStakingPool');

module.exports = function (deployer) {
  deployer.deploy(FakeHegicToken);
  deployer.deploy(FakeRHegicToken);
  // deployer.deploy(IOUTokenRedemption);
  deployer.deploy(FakeHegicStakingPool);
}
