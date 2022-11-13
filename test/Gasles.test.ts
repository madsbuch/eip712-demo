import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("Gasless", () => {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  const deploy = async () => {
    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount] = await ethers.getSigners();

    const GaslessContract = await ethers.getContractFactory("Gasless");
    const gaslessContract = await GaslessContract.deploy();

    return { gaslessContract, owner, otherAccount };
  }

  describe("Gasless tests", async () => {
    it("Should accept a direct function call", async () => {
      const { gaslessContract, owner, otherAccount } = await loadFixture(deploy);

      await expect(gaslessContract.connect(owner).someFunc([otherAccount.address], 22))
        .to
        .emit(gaslessContract, "FunctionCalled")
        .withArgs(owner.address, [otherAccount.address], 22);
    });

    it("Should accept a function call using eth_signTypedData_v4", async () => {
      const { gaslessContract, otherAccount } = await loadFixture(deploy);

      const blockHead = await ethers.provider.getBlock(await ethers.provider.getBlockNumber());
      const deadline = blockHead.timestamp + 60 * 60 * 24

      const domain = [
        { name: "name", type: "string" },
        { name: "version", type: "string" },
        { name: "chainId", type: "uint256" },
        { name: "verifyingContract", type: "address" },
      ];
      const someFuncT = [
        { name: "sender", type: "address" },
        { name: "receivers", type: "address[]" },
        { name: "amount", type: "uint256" },
        { name: "deadline", type: "uint256" },
        { name: "nonce", type: "uint256" },
      ];

      const domainData = {
        name: "Gasless",
        version: "1",
        chainId: 31337,
        verifyingContract: gaslessContract.address,
      };

      var message = {
        sender: otherAccount.address,
        receivers: [otherAccount.address],
        amount: 42,
        deadline: deadline,
        nonce: (await gaslessContract.nonces(otherAccount.address)).toNumber()
      };

      const data = JSON.stringify({
        types: {
          EIP712Domain: domain,
          SomeFunc: someFuncT,
        },
        domain: domainData,
        primaryType: "SomeFunc",
        message: message
      }, null, 2);

      const signature = await ethers.provider.send("eth_signTypedData_v4", [message.sender, data])

      // const signature = result.result.substring(2);
      const r = signature.substring(0, 66);
      const s = "0x" + signature.substring(66, 130);
      const v = parseInt(signature.substring(130, 132), 16);

      await expect(gaslessContract.someFuncGasless(message.sender, message.receivers, message.amount, message.deadline, v, r, s))
        .to
        .emit(gaslessContract, "FunctionCalled")
        .withArgs(message.sender, message.receivers, message.amount);
    });

    it("Should accept a validation using _signTypedData", async () => {
      const { gaslessContract, otherAccount } = await loadFixture(deploy);

      const blockHead = await ethers.provider.getBlock(await ethers.provider.getBlockNumber());
      const deadline = blockHead.timestamp + 60 * 60 * 24

      const someFuncT = [
        { name: "sender", type: "address" },
        { name: "receivers", type: "address[]" },
        { name: "amount", type: "uint256" },
        { name: "deadline", type: "uint256" },
        { name: "nonce", type: "uint256" },
      ];

      const domainData = {
        name: "Gasless",
        version: "1",
        chainId: 31337,
        verifyingContract: gaslessContract.address,
      };

      var message = {
        sender: otherAccount.address,
        receivers: [otherAccount.address],
        amount: 42,
        deadline: deadline,
        nonce: (await gaslessContract.nonces(otherAccount.address)).toNumber()
      };

      const data = {
        types: {
          SomeFunc: someFuncT,
        },
        domain: domainData,
        primaryType: "SomeFunc",
        message: message
      };

      const signature = await otherAccount._signTypedData(data.domain, data.types, data.message)

      // const signature = result.result.substring(2);
      const r = signature.substring(0, 66);
      const s = "0x" + signature.substring(66, 130);
      const v = parseInt(signature.substring(130, 132), 16);

      await expect(gaslessContract.someFuncGasless(message.sender, message.receivers, message.amount, message.deadline, v, r, s))
        .to
        .emit(gaslessContract, "FunctionCalled")
        .withArgs(message.sender, message.receivers, message.amount);
    });

    it("Should reject replays", async () => {
      const { gaslessContract, otherAccount } = await loadFixture(deploy);

      const blockHead = await ethers.provider.getBlock(await ethers.provider.getBlockNumber());
      const deadline = blockHead.timestamp + 60 * 60 * 24

      const domain = [
        { name: "name", type: "string" },
        { name: "version", type: "string" },
        { name: "chainId", type: "uint256" },
        { name: "verifyingContract", type: "address" },
      ];
      const someFuncT = [
        { name: "sender", type: "address" },
        { name: "receivers", type: "address[]" },
        { name: "amount", type: "uint256" },
        { name: "deadline", type: "uint256" },
        { name: "nonce", type: "uint256" },
      ];

      const domainData = {
        name: "Gasless",
        version: "1",
        chainId: 31337,
        verifyingContract: gaslessContract.address,
      };

      var message = {
        sender: otherAccount.address,
        receivers: [otherAccount.address],
        amount: 42,
        deadline: deadline,
        nonce: (await gaslessContract.nonces(otherAccount.address)).toNumber()
      };

      const data = JSON.stringify({
        types: {
          EIP712Domain: domain,
          SomeFunc: someFuncT,
        },
        domain: domainData,
        primaryType: "SomeFunc",
        message: message
      }, null, 2);

      const signature = await ethers.provider.send("eth_signTypedData_v4", [message.sender, data])

      // const signature = result.result.substring(2);
      const r = signature.substring(0, 66);
      const s = "0x" + signature.substring(66, 130);
      const v = parseInt(signature.substring(130, 132), 16);

      await expect(gaslessContract.someFuncGasless(message.sender, message.receivers, message.amount, message.deadline, v, r, s))
        .to
        .emit(gaslessContract, "FunctionCalled")
        .withArgs(message.sender, message.receivers, message.amount);
      await expect(gaslessContract.someFuncGasless(message.sender, message.receivers, message.amount, message.deadline, v, r, s))
        .to.be.rejectedWith("EIP712: Invalid signature")
    });

    it("Should accept 2 transactions with correct nonces", async () => {
      const { gaslessContract, otherAccount } = await loadFixture(deploy);

      const blockHead = await ethers.provider.getBlock(await ethers.provider.getBlockNumber());
      const deadline = blockHead.timestamp + 60 * 60 * 24

      const domain = [
        { name: "name", type: "string" },
        { name: "version", type: "string" },
        { name: "chainId", type: "uint256" },
        { name: "verifyingContract", type: "address" },
      ];
      const someFuncT = [
        { name: "sender", type: "address" },
        { name: "receivers", type: "address[]" },
        { name: "amount", type: "uint256" },
        { name: "deadline", type: "uint256" },
        { name: "nonce", type: "uint256" },
      ];

      const domainData = {
        name: "Gasless",
        version: "1",
        chainId: 31337,
        verifyingContract: gaslessContract.address,
      };

      var message1 = {
        sender: otherAccount.address,
        receivers: [otherAccount.address],
        amount: 42,
        deadline: deadline,
        nonce: (await gaslessContract.nonces(otherAccount.address)).toNumber()
      };

      var message2 = {
        sender: otherAccount.address,
        receivers: [otherAccount.address],
        amount: 42,
        deadline: deadline,
        nonce: (await gaslessContract.nonces(otherAccount.address)).toNumber() + 1
      };

      // First transaction
      const data = JSON.stringify({
        types: {
          EIP712Domain: domain,
          SomeFunc: someFuncT,
        },
        domain: domainData,
        primaryType: "SomeFunc",
        message: message1
      }, null, 2);
      const signature = await ethers.provider.send("eth_signTypedData_v4", [message1.sender, data])
      const r = signature.substring(0, 66);
      const s = "0x" + signature.substring(66, 130);
      const v = parseInt(signature.substring(130, 132), 16);
      await expect(gaslessContract.someFuncGasless(message1.sender, message1.receivers, message1.amount, message1.deadline, v, r, s))
        .to
        .emit(gaslessContract, "FunctionCalled")
        .withArgs(message1.sender, message1.receivers, message1.amount);


      // First transaction
      const data2 = JSON.stringify({
        types: {
          EIP712Domain: domain,
          SomeFunc: someFuncT,
        },
        domain: domainData,
        primaryType: "SomeFunc",
        message: message2
      }, null, 2);
      const signature2 = await ethers.provider.send("eth_signTypedData_v4", [message2.sender, data2])
      const r2 = signature2.substring(0, 66);
      const s2 = "0x" + signature2.substring(66, 130);
      const v2 = parseInt(signature2.substring(130, 132), 16);
      await expect(gaslessContract.someFuncGasless(message2.sender, message2.receivers, message2.amount, message2.deadline, v2, r2, s2))
        .to
        .emit(gaslessContract, "FunctionCalled")
        .withArgs(message2.sender, message2.receivers, message2.amount);
    });

    it("Should reject a validation when deadline was", async () => {
      const { gaslessContract, owner, otherAccount } = await loadFixture(deploy);

      const blockHead = await ethers.provider.getBlock(await ethers.provider.getBlockNumber());
      // a second ago
      const deadline = blockHead.timestamp - 1

      const domain = [
        { name: "name", type: "string" },
        { name: "version", type: "string" },
        { name: "chainId", type: "uint256" },
        { name: "verifyingContract", type: "address" },
      ];
      const someFuncT = [
        { name: "sender", type: "address" },
        { name: "receivers", type: "address[]" },
        { name: "amount", type: "uint256" },
        { name: "deadline", type: "uint256" },
        { name: "nonce", type: "uint256" },
      ];

      const domainData = {
        name: "Gasless",
        version: "1",
        chainId: 31337,
        verifyingContract: gaslessContract.address,
      };

      var message = {
        sender: otherAccount.address,
        receivers: [otherAccount.address],
        amount: 42,
        deadline: deadline,
        nonce: (await gaslessContract.nonces(otherAccount.address)).toNumber()
      };

      const data = JSON.stringify({
        types: {
          EIP712Domain: domain,
          SomeFunc: someFuncT,
        },
        domain: domainData,
        primaryType: "SomeFunc",
        message: message
      }, null, 2);

      const signature = await ethers.provider.send("eth_signTypedData_v4", [otherAccount.address, data])

      // const signature = result.result.substring(2);
      const r = signature.substring(0, 66);
      const s = "0x" + signature.substring(66, 130);
      const v = parseInt(signature.substring(130, 132), 16);

      await expect(gaslessContract.someFuncGasless(message.sender, message.receivers, message.amount, message.deadline, v, r, s)).to.be.revertedWith("EIP712: Expired")
    });

    it("Should reject a validation when domain is wrong", async () => {
      const { gaslessContract, owner, otherAccount } = await loadFixture(deploy);

      const blockHead = await ethers.provider.getBlock(await ethers.provider.getBlockNumber());
      const deadline = blockHead.timestamp + 60 * 60 * 24

      const domain = [
        { name: "name", type: "string" },
        { name: "version", type: "string" },
        { name: "chainId", type: "uint256" },
        { name: "verifyingContract", type: "address" },
      ];
      const someFuncT = [
        { name: "sender", type: "address" },
        { name: "receivers", type: "address[]" },
        { name: "amount", type: "uint256" },
        { name: "deadline", type: "uint256" },
        { name: "nonce", type: "uint256" },
      ];

      const domainData = {
        name: "Gasless",
        version: "1",
        chainId: 31337,

        // Wrong address
        verifyingContract: owner.address,
      };

      var message = {
        sender: otherAccount.address,
        receivers: [otherAccount.address],
        amount: 42,
        deadline: deadline,
        nonce: (await gaslessContract.nonces(otherAccount.address)).toNumber()
      };

      const data = JSON.stringify({
        types: {
          EIP712Domain: domain,
          SomeFunc: someFuncT,
        },
        domain: domainData,
        primaryType: "SomeFunc",
        message: message
      }, null, 2);

      const signature = await ethers.provider.send("eth_signTypedData_v4", [otherAccount.address, data])

      // const signature = result.result.substring(2);
      const r = signature.substring(0, 66);
      const s = "0x" + signature.substring(66, 130);
      const v = parseInt(signature.substring(130, 132), 16);

      await expect(gaslessContract.someFuncGasless(message.sender, message.receivers, message.amount, message.deadline, v, r, s)).to.be.revertedWith("EIP712: Invalid signature")
    });

    it("Should reject a validation when not signed by validator", async () => {
      const { gaslessContract, owner, otherAccount } = await loadFixture(deploy);

      const blockHead = await ethers.provider.getBlock(await ethers.provider.getBlockNumber());
      const deadline = blockHead.timestamp + 60 * 60 * 24

      const domain = [
        { name: "name", type: "string" },
        { name: "version", type: "string" },
        { name: "chainId", type: "uint256" },
        { name: "verifyingContract", type: "address" },
      ];
      const someFuncT = [
        { name: "sender", type: "address" },
        { name: "receivers", type: "address[]" },
        { name: "amount", type: "uint256" },
        { name: "deadline", type: "uint256" },
        { name: "nonce", type: "uint256" },
      ];

      const domainData = {
        name: "Gasless",
        version: "1",
        chainId: 31337,
        verifyingContract: gaslessContract.address,
      };

      var message = {
        sender: otherAccount.address,
        receivers: [otherAccount.address],
        amount: 42,
        deadline: deadline,
        nonce: (await gaslessContract.nonces(otherAccount.address)).toNumber()
      };

      const data = JSON.stringify({
        types: {
          EIP712Domain: domain,
          SomeFunc: someFuncT,
        },
        domain: domainData,
        primaryType: "SomeFunc",
        message: message
      }, null, 2);

      // WRONG Signer
      const signature = await ethers.provider.send("eth_signTypedData_v4", [owner.address, data])

      // const signature = result.result.substring(2);
      const r = signature.substring(0, 66);
      const s = "0x" + signature.substring(66, 130);
      const v = parseInt(signature.substring(130, 132), 16);

      await expect(gaslessContract.someFuncGasless(message.sender, message.receivers, message.amount, message.deadline, v, r, s)).to.be.revertedWith("EIP712: Invalid signature")
    });
  })
});

