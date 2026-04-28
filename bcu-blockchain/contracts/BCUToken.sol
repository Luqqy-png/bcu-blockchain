// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract BCUToken is ERC20, Ownable {

    mapping(address => mapping(uint256 => bool)) public hasCheckedIn;

    constructor() ERC20("BCU Token", "BCU") Ownable(msg.sender) {

    }

    function recordAttendance(address student, uint256 sessionId) public onlyOwner {
        require(!hasCheckedIn[student][sessionId], "Already checked in for this session");
        hasCheckedIn[student][sessionId] = true;
        _mint(student, 10 * 10 ** decimals());
    }

    function rewardAcademicPerformance(address student, uint256 grade) public onlyOwner {
        require(grade >= 1 && grade <= 100, "Grade must be between 1 and 100");
        uint256 tokenAmount = grade * 10;
        _mint(student, tokenAmount * 10 ** decimals());
    }

    function getStudentBalance(address student) public view returns (uint256) {
        return balanceOf(student) / 10 ** decimals();
    }

}
