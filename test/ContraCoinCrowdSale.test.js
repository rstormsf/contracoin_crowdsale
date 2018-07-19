import ether from './helpers/ether';
import EVMRevert from './helpers/EVMRevert';
import { increaseTimeTo, duration } from './helpers/increaseTime';
import latestTime from './helpers/latestTime';

const BigNumber = web3.BigNumber;

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

const ContraCoin = artifacts.require('./ContraCoin');
const ContraCoinCrowdsale = artifacts.require('./ContraCoinCrowdsale');

contract('ContraCoinCrowdsale', ([_, wallet, investor1, investor2, purchaser]) => {

  beforeEach(async function () {
    // Deploy Token
    this.name = "ContraCoin";
    this.symbol = "CTC";
    this.decimals = 18;

    this.token = await ContraCoin.new(
      this.name,
      this.symbol,
      this.decimals
    );

    // Deploy Crowdsale
    this.rate = 500;
    this.wallet = wallet;
    this.openingTime = latestTime() + duration.weeks(1);
    this.closingTime = this.openingTime + duration.weeks(1);
    this.hardCap = ether(100);
    this.investorMinCap = ether(0.002);
    this.investorHardCap = ether(50);

    this.crowdsale = await ContraCoinCrowdsale.new(
      this.rate,
      this.wallet,
      this.token.address,
      this.openingTime,
      this.closingTime,
      this.hardCap,
      this.investorMinCap,
      this.investorHardCap
    );

    // Pause Token
    await this.token.pause();

    // Transfer token ownership to crowdsale
    await this.token.transferOwnership(this.crowdsale.address);

    // Advance time to crowdsale start
    await increaseTimeTo(this.openingTime + 1);
  });

  describe('crowdsale', function() {
    it('tracks the token', async function () {
      const token = await this.crowdsale.token();
      token.should.equal(this.token.address);
    });

    it('tracks the rate', async function () {
      const rate = await this.crowdsale.rate();
      rate.should.be.bignumber.equal(this.rate);
    });

    it('tracks the wallet', async function () {
      const wallet = await this.crowdsale.wallet();
      wallet.should.equal(this.wallet);
    });
  });

  describe('timed crowdsale', function () {
    it('is open', async function () {
      const isClosed = await this.crowdsale.hasClosed();
      isClosed.should.be.false;
    });
  });

  describe('capped crowdsale', function () {
    it('has the correct hard cap value', async function () {
      const cap = await this.crowdsale.cap();
      cap.should.be.bignumber.equal(this.hardCap);
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
        // Value less than min investor cap
        // Investor 2 hasn't contributed yet
        const value = this.investorMinCap - 1;
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
        const value1 = ether(2);
        await this.crowdsale.buyTokens(investor1, { value: value1, from: investor1 });
        // Second contribution sends total contributions over investor hard cap
        const value2 = ether(49);
        await this.crowdsale.buyTokens(investor1, { value: value2, from: investor1 }).should.be.rejectedWith(EVMRevert);
      });
    });

    describe('when the contribution is within the valid range', function () {
      const value = ether(2);
      it('succeeds & updates the contribution amount', async function () {
        await this.crowdsale.buyTokens(investor2, { value: value, from: investor2 }).should.be.fulfilled;
        const contribution = await this.crowdsale.getUserContribution(investor2);
        contribution.should.be.bignumber.equal(value);
      });
    });
  });

  describe('crowd sale stages', function () {
    const preIcoStage = 0;
    const icoStage = 1;
    const icoRate = 250;

    it('it starts in PreICO', async function () {
      const stage = await this.crowdsale.stage();
      stage.should.be.bignumber.equal(preIcoStage);
    });

    it('starts at the opening (deployed) rate', async function () {
      const rate = await this.crowdsale.rate();
      rate.should.be.bignumber.equal(this.rate);
    });

    it('allows admin to update the stage & rate', async function () {
      await this.crowdsale.setCrowdsaleStage(icoStage, { from: _ });
      const stage = await this.crowdsale.stage();
      stage.should.be.bignumber.equal(icoStage);
      const rate = await this.crowdsale.rate();
      rate.should.be.bignumber.equal(icoRate);
    });

    it('prevents non-admin from updating the stage', async function () {
      await this.crowdsale.setCrowdsaleStage(icoStage, { from: investor1 }).should.be.rejectedWith(EVMRevert);
    });
  });

  describe('token transfers', function () {
    it('reverts when trying to transfer from when paused', async function () {
      // Buy some tokens first
      await this.crowdsale.buyTokens(investor1, { value: ether(1), from: investor1 });
      // Attempt to transfer tokens during crowdsale
      await this.token.transfer(investor2, 1, { from: investor1 }).should.be.rejectedWith(EVMRevert);
    });

    // It enables token transfers after sale is over
  });

  // End Sale
  // Can Transfer Tokens
  // Can Claim Refunds
});
