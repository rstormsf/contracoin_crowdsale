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
const RefundVault = artifacts.require('./RefundVault');
const TokenTimelock = artifacts.require('./TokenTimelock');

contract('ContraCoinCrowdsale', ([_, wallet, investor1, investor2, foundersFund, foundationFund, partnersFund]) => {

  before(async function() {
    // Transfer extra ether to investor1's account for testing
    await web3.eth.sendTransaction({ from: _, to: investor1, value: ether(25) })
  });

  beforeEach(async function () {
    // Token configuration
    this.name = "ContraCoin";
    this.symbol = "CTC";
    this.decimals = 18;

    // Deploy Token
    this.token = await ContraCoin.new(
      this.name,
      this.symbol,
      this.decimals
    );

    // Crowdsale configuration
    this.rate = 500;
    this.wallet = wallet;
    this.openingTime = latestTime() + duration.weeks(1);
    this.closingTime = this.openingTime + duration.weeks(1);
    this.hardCap = ether(100);
    this.goal = ether(50);
    this.foundersFund = foundersFund;
    this.foundationFund = foundationFund;
    this.partnersFund = partnersFund;
    this.releaseTime = this.closingTime + duration.years(1);

    // Investor caps
    this.investorMinCap = ether(0.002);
    this.investorHardCap = ether(50);

    // ICO Stages
    this.preIcoStage = 0;
    this.icoStage = 1;
    this.preIcoRate = this.rate;
    this.icoRate = 250;

    // Token Distribution
    this.tokenSalePercentage  = 70;
    this.foundersPercentage   = 10;
    this.foundationPercentage = 10;
    this.partnersPercentage   = 10;

    // Deploy Crowdsale
    this.crowdsale = await ContraCoinCrowdsale.new(
      this.rate,
      this.wallet,
      this.token.address,
      this.openingTime,
      this.closingTime,
      this.hardCap,
      this.goal,
      this.foundersFund,
      this.foundationFund,
      this.partnersFund,
      this.releaseTime
    );

    // Pause Token
    await this.token.pause();

    // Transfer token ownership to crowdsale
    await this.token.transferOwnership(this.crowdsale.address);

    // Whitelist Investors
    await this.crowdsale.addManyToWhitelist([investor1, investor2]);

    // Track refund vault
    this.vaultAddress = await this.crowdsale.vault();
    this.vault = RefundVault.at(this.vaultAddress);

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

  describe('minted crowdsale', function () {
    it('mints tokens after purchase', async function () {
      const originalTotalSupply = await this.token.totalSupply();
      await this.crowdsale.sendTransaction({ value: ether(1), from: investor1 });
      const newTotalSupply = await this.token.totalSupply();
      assert.isTrue(newTotalSupply > originalTotalSupply);
    });
  });

  describe('whitelisted crowdsale', function () {
    it('rejects contributions from non-whitelisted accounts', async function () {
      const notWhitelisted = _;
      await this.crowdsale.buyTokens(notWhitelisted, { value: ether(1), from: notWhitelisted }).should.be.rejectedWith(EVMRevert);
    });
  });

  describe('accepting payments', function () {
    it('should accept payments', async function () {
      const value = ether(1);
      const purchaser = investor2;
      await this.crowdsale.sendTransaction({ value: value, from: investor1 }).should.be.fulfilled;
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

  describe('purchase rate', function () {
    it('buys the correct number of tokens', async function () {
      // Purchase tokens
      const value = ether(1);
      await this.crowdsale.sendTransaction({ value: value, from: investor1 });

      // TODO: Refactor me with a helper...
      let balance = await this.token.balanceOf(investor1);
      balance = balance.toString();
      balance = balance / (10 ** this.decimals);

      let expectedBalance = this.preIcoRate * value;
      expectedBalance = expectedBalance.toString();
      expectedBalance = expectedBalance / (10 ** this.decimals);

      assert.equal(balance.toString(), expectedBalance.toString());
    });
  });

  describe('crowd sale stages', function () {

    it('it starts in PreICO', async function () {
      const stage = await this.crowdsale.stage();
      stage.should.be.bignumber.equal(this.preIcoStage);
    });

    it('starts at the opening (deployed) rate', async function () {
      const rate = await this.crowdsale.rate();
      rate.should.be.bignumber.equal(this.rate);
    });

    it('allows admin to update the stage & rate', async function () {
      await this.crowdsale.setCrowdsaleStage(this.icoStage, { from: _ });
      const stage = await this.crowdsale.stage();
      stage.should.be.bignumber.equal(this.icoStage);
      const rate = await this.crowdsale.rate();
      rate.should.be.bignumber.equal(this.icoRate);
    });

    it('prevents non-admin from updating the stage', async function () {
      await this.crowdsale.setCrowdsaleStage(this.icoStage, { from: investor1 }).should.be.rejectedWith(EVMRevert);
    });
  });

  describe('token transfers', function () {
    it('reverts when trying to transfer from when paused', async function () {
      // Buy some tokens first
      await this.crowdsale.buyTokens(investor1, { value: ether(1), from: investor1 });
      // Attempt to transfer tokens during crowdsale
      await this.token.transfer(investor2, 1, { from: investor1 }).should.be.rejectedWith(EVMRevert);
    });
    // It enables token transfers after sale is over - see finalization
  });

  describe('refundable crowdsale', function() {
    beforeEach(async function () {
      await this.crowdsale.buyTokens(investor1, { value: ether(1), from: investor1 });
    });

    describe('during crowdsale', function() {
      it('prevents investor from claiming refund', async function () {
        await this.vault.refund(investor1, { from: investor1 }).should.be.rejectedWith(EVMRevert);
      });
    });

    describe('when the corwdsale stage is PreICO', function() {
      beforeEach(async function () {
        // Crowdsale stage is already PreICO by default
        await this.crowdsale.buyTokens(investor1, { value: ether(1), from: investor1 });
      });

      it('forwards funds to the wallet', async function () {
        const balance = await web3.eth.getBalance(this.wallet);
        expect(balance.toNumber()).to.be.above(ether(100));
      });
    });

    describe('when the crowdsale stage is ICO', function() {
      beforeEach(async function () {
        await this.crowdsale.setCrowdsaleStage(this.icoStage, { from: _ });
        await this.crowdsale.buyTokens(investor1, { value: ether(1), from: investor1 });
      });

      it('forwards funds to the refund vault', async function () {
        const balance = await web3.eth.getBalance(this.vaultAddress);
        expect(balance.toNumber()).to.be.above(0);
      });
    });
  });

  describe('finalizing the crowdsale', function() {

    describe('when the goal is not reached', function() {
      beforeEach(async function () {
        // Do not meet the toal
        await this.crowdsale.buyTokens(investor2, { value: ether(1), from: investor2 });
        // Fastforward past end time
        await increaseTimeTo(this.closingTime + 1);
        // Finalize the crowdsale
        await this.crowdsale.finalize({ from: _ });
      });

      it('does not unpause the token', async function () {
        const paused = await this.token.paused();
        paused.should.be.true;
      });

      it('allows the investor to claim refund', async function () {
        await this.vault.refund(investor2, { from: investor2 }).should.be.fulfilled;
      });

      it('does not mint tokens for additional funds', async function () {
        const foundersBalance = await this.token.balanceOf(foundersFund);
        foundersBalance.should.be.bignumber.eq(0);
        const foundationBalance = await this.token.balanceOf(foundationFund);
        foundationBalance.should.be.bignumber.eq(0);
        const partnersBalance = await this.token.balanceOf(partnersFund);
        partnersBalance.should.be.bignumber.eq(0);
      });
    });

    describe('when the goal is reached', function() {
      beforeEach(async function () {
        // track current wallet balance
        this.walletBalance = await web3.eth.getBalance(wallet);

        // Meet the goal
        await this.crowdsale.buyTokens(investor1, { value: ether(26), from: investor1 });
        await this.crowdsale.buyTokens(investor2, { value: ether(26), from: investor2 });
        // Fastforward past end time
        await increaseTimeTo(this.closingTime + 1);
        // Finalize the crowdsale
        await this.crowdsale.finalize({ from: _ });
      });

      // FIXME: I run out of Ether if I break this up into multiple examples...
      it('handles goal reached', async function () {
        // Tracks goal reached
        const goalReached = await this.crowdsale.goalReached();
        goalReached.should.be.true;

        // Transfers funds to the wallet
        let newWalletBalance = await web3.eth.getBalance(this.wallet);
        // newWalletBalance = web3.fromWei(newWalletBalance);
        // newWalletBalance = new BigNumber(newWalletBalance);
        // newWalletBalance = newWalletBalance.toNumber();

        // let expectedWalletBalance = (this.walletBalance + ether(52))
        // expectedWalletBalance = web3.fromWei(expectedWalletBalance);
        // expectedWalletBalance = new BigNumber(expectedWalletBalance);
        // expectedWalletBalance = expectedWalletBalance.toNumber();

        // console.log('wallet balance', this.walletBalance);
        // console.log('new wallet balance', newWalletBalance);
        // console.log('expected wallet balance', expectedWalletBalance);

        expect(newWalletBalance).to.be.greaterThan(ether(150));

        // Unpauses the token
        const paused = await this.token.paused();
        paused.should.be.false;

        // Prevents investor from claiming refund
        await this.vault.refund(investor1, { from: investor1 }).should.be.rejectedWith(EVMRevert);

        // Enables token transfers
        await this.token.transfer(investor2, 1, { from: investor2 }).should.be.fulfilled;

        // Mints tokens for additional funds
        // Mints funds to timelock contracts
        // TODO: Refactor me with a helper...
        let totalSupply = await this.token.totalSupply();
        totalSupply = totalSupply.toString();

        // Founders
        const foundersTimelockAddress = await this.crowdsale.foundersTimelock();
        let foundersTimelockBalance = await this.token.balanceOf(foundersTimelockAddress);
        foundersTimelockBalance = foundersTimelockBalance.toString();
        foundersTimelockBalance = foundersTimelockBalance / (10 ** this.decimals);

        let foundersAmount = totalSupply / this.foundersPercentage;
        foundersAmount = foundersAmount.toString();
        foundersAmount = foundersAmount / (10 ** this.decimals);

        assert.equal(foundersTimelockBalance.toString(), foundersAmount.toString());

        // Foundation
        const foundationTimelockAddress = await this.crowdsale.foundationTimelock();
        let foundationTimelockBalance = await this.token.balanceOf(foundationTimelockAddress);
        foundationTimelockBalance = foundationTimelockBalance.toString();
        foundationTimelockBalance = foundationTimelockBalance / (10 ** this.decimals);

        let foundationAmount = totalSupply / this.foundationPercentage;
        foundationAmount = foundationAmount.toString();
        foundationAmount = foundationAmount / (10 ** this.decimals);

        assert.equal(foundationTimelockBalance.toString(), foundationAmount.toString());

        // Partners
        const partnersTimelockAddress = await this.crowdsale.partnersTimelock();
        let partnersTimelockBalance = await this.token.balanceOf(partnersTimelockAddress);
        partnersTimelockBalance = partnersTimelockBalance.toString();
        partnersTimelockBalance = partnersTimelockBalance / (10 ** this.decimals);

        let partnersAmount = totalSupply / this.partnersPercentage;
        partnersAmount = partnersAmount.toString();
        partnersAmount = partnersAmount / (10 ** this.decimals);

        assert.equal(partnersTimelockBalance.toString(), partnersAmount.toString());

        // Finishes minting token
        const mintingFinished = await this.token.mintingFinished();
        mintingFinished.should.be.true;

        // Can't withdraw from timelocks
        const foundersTimelock = await TokenTimelock.at(foundersTimelockAddress);
        await foundersTimelock.release().should.be.rejectedWith(EVMRevert);

        const foundationTimelock = await TokenTimelock.at(foundationTimelockAddress);
        await foundationTimelock.release().should.be.rejectedWith(EVMRevert);

        const partnersTimelock = await TokenTimelock.at(partnersTimelockAddress);
        await partnersTimelock.release().should.be.rejectedWith(EVMRevert);

        // Can withdraw from timelocks
        await increaseTimeTo(this.releaseTime + 1);

        await foundersTimelock.release().should.be.fulfilled;
        await foundationTimelock.release().should.be.fulfilled;
        await partnersTimelock.release().should.be.fulfilled;

        // Funds have token balances now

        // Founders
        let foundersBalance = await this.token.balanceOf(this.foundersFund);
        foundersBalance = foundersBalance.toString();
        foundersBalance = foundersBalance / (10 ** this.decimals);

        assert.equal(foundersBalance.toString(), foundersAmount.toString());

        // Foundation
        let foundationBalance = await this.token.balanceOf(this.foundationFund);
        foundationBalance = foundationBalance.toString();
        foundationBalance = foundationBalance / (10 ** this.decimals);

        assert.equal(foundationBalance.toString(), foundationAmount.toString());

        // Partners
        let partnersBalance = await this.token.balanceOf(this.partnersFund);
        partnersBalance = partnersBalance.toString();
        partnersBalance = partnersBalance / (10 ** this.decimals);

        assert.equal(partnersBalance.toString(), partnersAmount.toString());
      });

    });
  });

  describe('token distribution', function() {
    it('tracks token distribution correctly', async function () {
      const tokenSalePercentage = await this.crowdsale.tokenSalePercentage();
      tokenSalePercentage.should.be.bignumber.eq(this.tokenSalePercentage, 'has correct tokenSalePercentage');
      const foundersPercentage = await this.crowdsale.foundersPercentage();
      foundersPercentage.should.be.bignumber.eq(this.foundersPercentage, 'has correct foundersPercentage');
      const foundationPercentage = await this.crowdsale.foundationPercentage();
      foundationPercentage.should.be.bignumber.eq(this.foundationPercentage, 'has correct foundationPercentage');
      const partnersPercentage = await this.crowdsale.partnersPercentage();
      partnersPercentage.should.be.bignumber.eq(this.partnersPercentage, 'has correct partnersPercentage');
    });

    it('is a valid percentage breakdown', function () {
      const total = this.tokenSalePercentage + this.foundersPercentage + this.foundationPercentage + this.partnersPercentage;
      total.should.eq(100);
    });
  });
});
