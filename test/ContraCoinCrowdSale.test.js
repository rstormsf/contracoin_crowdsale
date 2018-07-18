import ether from './helpers/ether';

const BigNumber = web3.BigNumber;

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

const ContraCoin = artifacts.require('./ContraCoin');
const ContraCoinCrowdsale = artifacts.require('./ContraCoinCrowdsale');

contract('ContraCoinCrowdsale', accounts => {
  const _rate = 1;
  const _wallet = accounts[0];
  const _hardCap = 100000000000000000000;
  const _minCap = 2000000000000000;

  beforeEach(async function () {
    // Deploy Token
    const _name = "ContraCoin";
    const _symbol = "CTC";
    const _decimals = 18;
    this.token = await ContraCoin.new(_name, _symbol, _decimals);

    // Deploy Crowdsale
    const _token = this.token.address;
    this.crowdsale = await ContraCoinCrowdsale.new(
      _rate,
      _wallet,
      _token,
      _hardCap,
      _minCap
    );

    // Transfer token ownership to crowdsale
    await this.token.transferOwnership(this.crowdsale.address);
  });

  describe('crowdsale', function() {
    it('tracks the token', async function () {
      const token = await this.crowdsale.token();
      token.should.equal(this.token.address);
    });

    it('tracks the rate', async function () {
      const rate = await this.crowdsale.rate();
      rate.should.be.bignumber.equal(_rate);
    });

    it('tracks the wallet', async function () {
      const wallet = await this.crowdsale.wallet();
      wallet.should.equal(_wallet);
    });
  });

  describe('capped crowdsale', function () {
    it('has the correct hard cap value', async function () {
      const cap = await this.crowdsale.cap();
      cap.should.be.bignumber.equal(_hardCap);
    });
  });

  describe('accepting payments', function () {
    it('should accept payments', async function () {
      await this.crowdsale.send(ether(10)).should.be.fulfilled;
  });

  describe('buyTokens()', function () {
    // const investor1 = accounts[1]
    // const investor2 = accounts[2]

    // describe('when the contribution is less than the minimum cap', function () {
    //   it('rejects the transaction', async function () {

    //   });
    // })

    // describe('when the contribution is greater than or equal to the minimum cap', function () {
    //   it('allows the investor to buy tokens', async function () {
    //     const { logs } = web3.eth.sendTransaction({ from: investor2, to: this.crowdsale.address, value: _minCap + 10 })
    //     console.log(logs)
    //   });
    // });
  });
});
