const BigNumber = web3.BigNumber;

require('chai')
  .use(require('chai-bignumber')(BigNumber))
  .should();

const ContraCoin = artifacts.require('ContraCoin');

contract('ContraCoin', function ([owner, anotherAccount]) {
  const _name = "ContraCoin";
  const _symbol = "CTC";
  const _decimals = 18;

  beforeEach(async function () {
    this.token = await ContraCoin.new(_name, _symbol, _decimals);
  });

  describe('token attributes', function () {
    it('has the correct name', async function () {
      const name = await this.token.name();
      name.should.equal(_name);
    });

    it('has the correct symbol', async function () {
      const symbol = await this.token.symbol();
      symbol.should.equal(_symbol);
    });

    it('has the correct decimals', async function () {
      const decimals = await this.token.decimals();
      decimals.should.be.bignumber.equal(_decimals);
    });
  });
});
