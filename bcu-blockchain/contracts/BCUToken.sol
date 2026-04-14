// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract BCUToken is ERC20, Ownable {

    // keeps track of whether a student has checked in for a session
    mapping(address => mapping(uint256 => bool)) public hasCheckedIn;

    constructor() ERC20("BCU Token", "BCU") Ownable(msg.sender) {

    }

    // called by the owner when a student scans the QR code
    function recordAttendance(address student, uint256 sessionId) public onlyOwner {
        // check the student hasn't already checked in for this session
        require(!hasCheckedIn[student][sessionId], "Already checked in for this session");

        // mark them as checked in so they can't do it again
        hasCheckedIn[student][sessionId] = true;

        // give the student 10 BCU tokens for attending
        _mint(student, 10 * 10 ** decimals());
    }

    // called by the owner to reward a student based on their module grade
    // grade is a percentage between 0 and 100
    // 100% = 1000 tokens, 50% = 500 tokens, 72% = 720 tokens etc.
    function rewardAcademicPerformance(address student, uint256 grade) public onlyOwner {
        // grade must be between 1 and 100 — no point rewarding 0%
        require(grade >= 1 && grade <= 100, "Grade must be between 1 and 100");

        // calculate tokens — 10 tokens per percentage point, max 1000 at 100%
        uint256 tokenAmount = grade * 10;

        // mint the calculated tokens directly to the student wallet
        _mint(student, tokenAmount * 10 ** decimals());
    }

    // returns how many BCU tokens a student currently holds
    function getStudentBalance(address student) public view returns (uint256) {
        // balanceOf comes from ERC20 — no need to write it ourselves
        return balanceOf(student) / 10 ** decimals();
    }

}