import ether from './helpers/ether';
import EVMRevert from './helpers/EVMRevert';

const BigNumber = web3.BigNumber;

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

const ContraCoin = artifacts.require('./ContraCoin');
const ContraCoinCrowdsale = artifacts.require('./ContraCoinCrowdsale');

contract('ContraCoinCrowdsale', ([_, wallet, investor1, investor2, purchaser]) => {
  const _rate = 1;
  const _wallet = wallet;
  const _hardCap = ether(100);
  const _investorMinCap = ether(0.002);
  const _investorHardCap = ether(50);

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
      _investorMinCap,
      _investorHardCap
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
      const value = ether(10);
      await this.crowdsale.send(value).should.be.fulfilled;
      await this.crowdsale.buyTokens(investor1, { value: value, from: purchaser }).should.be.fulfilled;
    });
  });

  describe('buyTokens()', function () {
    describe('when the contribution is less than the minimum cap', function () {
      it('rejects the transaction', async function () {
        // Value less than min investor cap;
        // Investor 2 hasn't contributed yet
        const value = _investorMinCap - 1;
        await this.crowdsale.buyTokens(investor2, { value: value, from: investor2 }).should.be.rejectedWith(EVMRevert);
      });

      describe('when the investor has already met the minimum cap', function() {
        it('allows the investor to contribute below the minimum cap', async function() {
          // First contribution is in valid range
          const value1 = ether(1);
          await this.crowdsale.buyTokens(investor1, { value: value1, from: investor1 });
          // Second contribution is less than min investor cap
          const value2 = 1; // wei
          await this.crowdsale.buyTokens(investor1, { value: value2, from: investor1 }).should.be.fulfilled;
        });
      });
    });

    describe('when the individual contribution is greater than the investor hard cap', function () {
      it('rejects the transaction', async function () {
        // Value greater than investor hard cap
        const value = ether(51);
        await this.crowdsale.buyTokens(investor2, { value: value, from: investor2 }).should.be.rejectedWith(EVMRevert);
      });
    });

    describe('when the total contributions exceed the investor hard cap', function () {
      it('rejects the transaction', async function () {
        // First contribution is in valid range
        const value1 = ether(1);
        await this.crowdsale.buyTokens(investor1, { value: value1, from: investor1 });
        // Second contribution sends total contributions over investor hard cap
        const value2 = ether(50);
        await this.crowdsale.buyTokens(investor1, { value: value2, from: investor1 }).should.be.rejectedWith(EVMRevert);
      });
    });
  });
});
