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
        assertEq(voting.totalVotes(), 0);
        assertTrue(voting.isOpen());

        (string memory name, uint256 count) = voting.getCandidate(0);
        assertEq(name, "Ada");
        assertEq(count, 0);
    }

    function testVoteIncrementsOnlySelectedCandidateAndTotal() public {
        vm.prank(alice);
        voting.vote(1);

        assertTrue(voting.hasVoted(alice));
        (, uint256 adaVotes) = voting.getCandidate(0);
        (, uint256 graceVotes) = voting.getCandidate(1);
        (, uint256 linusVotes) = voting.getCandidate(2);
        assertEq(adaVotes, 0);
        assertEq(graceVotes, 1);
        assertEq(linusVotes, 0);
        assertEq(voting.totalVotes(), 1);
    }

    function testEachAddressCanVoteOnlyOnce() public {
        vm.prank(alice);
        voting.vote(0);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Voting.AlreadyVoted.selector, alice));
        voting.vote(2);

        assertEq(voting.totalVotes(), 1);
    }

    function testDifferentAddressesCanVote() public {
        vm.prank(alice);
        voting.vote(0);
        vm.prank(bob);
        voting.vote(0);

        (, uint256 count) = voting.getCandidate(0);
        assertEq(count, 2);
        assertEq(voting.totalVotes(), 2);
    }

    function testCannotVoteForUnknownCandidate() public {
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(Voting.InvalidCandidate.selector, uint256(3))
        );
        voting.vote(3);

        assertFalse(voting.hasVoted(alice));
        assertEq(voting.totalVotes(), 0);
    }

    function testCannotVoteAfterDeadline() public {
        vm.warp(voting.deadline());
        vm.prank(alice);
        vm.expectRevert(Voting.ElectionClosed.selector);
        voting.vote(0);

        assertEq(voting.totalVotes(), 0);
    }

    function testFinalizeOnlyAfterDeadline() public {
        vm.expectRevert(Voting.ElectionStillOpen.selector);
        voting.finalize();

        vm.warp(voting.deadline());
        Voting.Candidate[] memory finalResults = voting.finalize();
        assertEq(finalResults.length, 3);
    }

    function testConstructorRejectsEmptyTitle() public {
        string[] memory names = new string[](1);
        names[0] = "Candidate";
        vm.expectRevert(Voting.EmptyTitle.selector);
        new Voting("", names, block.timestamp + 1 days);
    }

    function testConstructorRejectsNoCandidates() public {
        string[] memory names = new string[](0);
        vm.expectRevert(Voting.NoCandidates.selector);
        new Voting("Election", names, block.timestamp + 1 days);
    }

    function testConstructorRejectsExpiredDeadline() public {
        string[] memory names = new string[](1);
        names[0] = "Candidate";
        vm.expectRevert(Voting.InvalidDeadline.selector);
        new Voting("Election", names, block.timestamp);
    }

    function testConstructorRejectsEmptyCandidateName() public {
        string[] memory names = new string[](2);
        names[0] = "Candidate";
        names[1] = "";
        vm.expectRevert(
            abi.encodeWithSelector(Voting.EmptyCandidateName.selector, uint256(1))
        );
        new Voting("Election", names, block.timestamp + 1 days);
    }

    function testConstructorRejectsMoreThanOneHundredCandidates() public {
        string[] memory names = new string[](101);
        for (uint256 i; i < names.length; ++i) {
            names[i] = "Candidate";
        }

        vm.expectRevert(Voting.TooManyCandidates.selector);
        new Voting("Election", names, block.timestamp + 1 days);
    }

    function testResultsIncludeVotesAfterDeadline() public {
        vm.prank(alice);
        voting.vote(2);

        vm.warp(voting.deadline());
        Voting.Candidate[] memory finalResults = voting.finalize();

        assertEq(finalResults[2].name, "Linus");
        assertEq(finalResults[2].voteCount, 1);
        assertEq(voting.totalVotes(), 1);
    }
}
