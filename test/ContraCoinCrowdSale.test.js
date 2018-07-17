const BigNumber = web3.BigNumber;

require('chai')
  .use(require('chai-bignumber')(BigNumber))
  .should();

const ContraCoinCrowdsale = artifacts.require('./ContraCoinCrowdsale');

contract('ContraCoinCrowdsale', accounts => {
  const _cap = 100000000000000000000;

  beforeEach(async function () {
    this.crowdsale = await ContraCoinCrowdsale.new(_cap);
  });

  describe('capped crowdsale', function () {
    it('has the correct hard cap value', async function () {
      const cap = await this.crowdsale.cap();
      cap.should.be.bignumber.equal(_cap);
    });
  });
});
