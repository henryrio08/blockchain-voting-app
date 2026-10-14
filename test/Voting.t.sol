// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Voting} from "../src/Voting.sol";
contract VotingTest is Test {
    Voting private voting;
    address private alice = makeAddr("alice");
    address private bob = makeAddr("bob");
}