# @clrfund/waffle-mock-contract

Library for mocking smart contract dependencies during unit testing.

This library was cloned from [@ethereum-waffle/waffle-mock-contract](https://github.com/TrueFiEng/Waffle/tree/master/waffle-mock-contract) and modified to use ethers v6 and hardhat environment. This library will not be actively updated, it is only used in the Clr.fund project unit testing. As soon as the Waffle team release an updated version with ethers v6 support, this library will be archived.

## Installation
```
yarn add --dev @clrfund/waffle-mock-contract
npm install --save-dev @clrfund/waffle-mock-contract
```

## Usage

Create an instance of a mock contract providing the ABI/interface of the smart contract you want to mock:

```js
const {deployMockContract} = require('@clrfund/waffle-mock-contract');

...

const mockContract = await deployMockContract(wallet, contractAbi);
```

Mock contract can now be passed into other contracts by using the `target` attribute.

```js
   const anotherContract = await otherContract.doSomethingInteresting(mockContract.target);
```

Return values for mocked functions can be set using:

```js
await mockContract.mock.<nameOfMethod>.returns(<value>)
```
