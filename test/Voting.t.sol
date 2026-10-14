// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Voting} from "../src/Voting.sol";
contract VotingTest is Test {
    Voting private voting;
    address private alice = makeAddr("alice");
    address private bob = makeAddr("bob");

    function setUp() public {
        string[] memory names = new string[](3);
        names[0] = "Ada";
        names[1] = "Grace";
        names[2] = "Linus";
        voting = new Voting("Community Council", names, block.timestamp + 1 days);
    }

     function testInitialState() public view {
        assertEq(voting.title(), "Community Council");
        assertEq(voting.owner(), address(this));
        assertEq(voting.candidateCount(), 3);
        assertTrue(voting.isOpen());

        (string memory name, uint256 count) = voting.getCandidate(0);
        assertEq(name, "Ada");
        assertEq(count, 0);
    }


}