// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Voting
/// @notice Educational on-chain voting for a single, public, non-private election.
/// @dev Not suitable for real elections: no identity, eligibility, privacy, or Sybil resistance.
contract Voting {
    error NotOwner();
    error ElectionClosed();
    error ElectionStillOpen();
    error AlreadyVoted(address voter);
    error InvalidCandidate(uint256 candidateId);
    error InvalidDeadline();
    error EmptyTitle();
    error NoCandidates();
    error TooManyCandidates();

    struct Candidate {
        string name;
        uint256 voteCount;
    }
}