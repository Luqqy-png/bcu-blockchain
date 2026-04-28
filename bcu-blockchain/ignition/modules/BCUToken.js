const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("BCUTokenModule", (m) => {
  const bcuToken = m.contract("BCUToken");
  return { bcuToken };
});
