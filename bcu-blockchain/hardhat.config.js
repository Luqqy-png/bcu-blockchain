require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: "0.8.20",
  networks: {
    sepolia: {
      url: "https://eth-sepolia.g.alchemy.com/v2/EMP4LNMn8glCOK3Xp5R3V",
      accounts: ["0x55fafe97b007ce8dd9565452298bfa6f3a7924defd33cc0ccba57bda91acfb51"]
    }
  }
};