// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title TruePaidStamp
/// @notice A public notice board. Anyone can pin one line saying what TruePaid
/// found for a payment: this transaction, to this seller, got this verdict.
/// No owner, no upgrade, no fees, nothing can be edited or deleted by anyone
/// except the same stamper re-stamping their own line.
///
/// Verdict codes: 1 PAID, 2 NOT_PAID, 3 FAKE_TOKEN, 4 PARTIAL, 5 OVERPAID.
///
/// Anyone can stamp, so read the `stamper` too. A stamp only says what that
/// address claimed, it does not prove the claim. The checker page recomputes
/// the verdict from the chain every time.
contract TruePaidStamp {
    struct Stamp {
        uint8 verdict;
        uint64 time;
    }

    event Stamped(bytes32 indexed txHash, address indexed seller, address indexed stamper, uint8 verdict);

    // txHash => seller => stamper => stamp
    mapping(bytes32 => mapping(address => mapping(address => Stamp))) public stamps;

    function stamp(bytes32 txHash, address seller, uint8 verdict) external {
        require(verdict >= 1 && verdict <= 5, "bad verdict");
        stamps[txHash][seller][msg.sender] = Stamp(verdict, uint64(block.timestamp));
        emit Stamped(txHash, seller, msg.sender, verdict);
    }
}
