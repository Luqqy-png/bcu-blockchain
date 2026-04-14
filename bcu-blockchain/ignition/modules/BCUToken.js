const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

// this script tells Hardhat how to deploy our BCUToken contract
module.exports = buildModule("BCUTokenModule", (m) => {
  
  // deploy the BCUToken contract - no constructor arguments needed
  const bcuToken = m.contract("BCUToken");

  // return the deployed contract so we can see its address
  return { bcuToken };
});
