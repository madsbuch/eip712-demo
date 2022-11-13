// SPDX-License-Identifier: MIT.

pragma solidity ^0.8.4;

contract Gasless {
    bytes32 public DOMAIN_SEPARATOR;
    bytes32 public SOME_FUNC_TYPEHASH;

    mapping(address => uint256) public nonces;

    event FunctionCalled(
        address indexed sender,
        address[] receivers,
        uint256 amount
    );

    constructor() {
        uint256 chainId;
        assembly {
            chainId := chainid()
        }
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256(
                    "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
                ),
                keccak256(bytes("Gasless")),
                keccak256(bytes("1")),
                chainId,
                address(this)
            )
        );
        SOME_FUNC_TYPEHASH = keccak256(
            "SomeFunc(address sender,address[] receivers,uint256 amount,uint256 deadline,uint256 nonce)"
        );
    }

    function someFunc(address[] memory receivers, uint256 amount) external {
        _someFunc(msg.sender, receivers, amount);
    }

    function someFuncGasless(
        address sender,
        address[] memory receivers,
        uint256 amount,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        // Check deadline
        require(deadline >= block.timestamp, "EIP712: Expired");

        // Signature + nonce check
        bytes32 digest = keccak256(
            abi.encodePacked(
                "\x19\x01",
                DOMAIN_SEPARATOR,
                keccak256(
                    abi.encode(
                        SOME_FUNC_TYPEHASH,
                        sender,
                        keccak256(abi.encodePacked(receivers)),
                        amount,
                        deadline,
                        nonces[sender]++
                    )
                )
            )
        );

        address recoveredAddress = ecrecover(digest, v, r, s);

        require(
            recoveredAddress != address(0) && recoveredAddress == sender,
            "EIP712: Invalid signature"
        );

        _someFunc(sender, receivers, amount);
    }

    function _someFunc(
        address sender,
        address[] memory receivers,
        uint256 amount
    ) private {
        emit FunctionCalled(sender, receivers, amount);
    }
}
