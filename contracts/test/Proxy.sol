// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "./Counter.sol";

contract Proxy {
    Counter private counter;

    constructor (Counter _counter) {
        counter = _counter;
    }

    function incrementTwice() public returns (uint) {
        return counter.increment() + counter.increment();
    }

    function increaseByTwice(uint a) public returns (uint) {
        return counter.increaseBy(a) + counter.increaseBy(a);
    }

    function cap(uint a) public pure returns (uint) {
        if (a > 10) {
            return 10;
        }
        return a;
    }

    function readCapped() public view returns (uint) {
        return cap(counter.read());
    }

    function addCapped(uint a) public view returns (uint) {
        return cap(counter.add(a));
    }
}
