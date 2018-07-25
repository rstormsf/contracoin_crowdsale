#!/usr/bin/env bash

rm -rf flats/*
./node_modules/.bin/truffle-flattener contracts/ContraCoin.sol > flats/ContraCoin_flat.sol

./node_modules/.bin/truffle-flattener contracts/ContraCoinCrowdsale.sol > flats/ContraCoinCrowdsale_flat.sol
