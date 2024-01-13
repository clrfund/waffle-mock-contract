import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers'
import { expect } from 'chai'
import { ethers, artifacts } from 'hardhat'
import type { Artifact } from 'hardhat/types'
import { deployMockContract } from '../src'
import { Contract } from 'ethers'

describe('Mock contract chaining behaviour', () => {
  let wallet: HardhatEthersSigner
  let Counter: Artifact

  before(async () => {
    ;[wallet] = await ethers.getSigners()
    Counter = await artifacts.readArtifact('Counter')
  })

  it('chaining return values', async () => {
    const mockCounter = await deployMockContract(wallet, Counter.abi)
    await mockCounter.mock.increment.returns(1).returns(2).returns(3)

    const mockCounteContract = mockCounter as unknown as Contract
    expect(await mockCounteContract.increment.staticCall()).to.eq(1)
    await mockCounteContract.increment()
    expect(await mockCounteContract.increment.staticCall()).to.eq(2)
    await mockCounteContract.increment()
    expect(await mockCounteContract.increment.staticCall()).to.eq(3)
  })

  it('chaining reverts', async () => {
    const mockCounter = await deployMockContract(wallet, Counter.abi)

    await mockCounter.mock.increment.returns(1).returns(2).reverts()

    const mockCounteContract = mockCounter as unknown as Contract
    expect(await mockCounteContract.increment.staticCall()).to.eq(1)
    await mockCounteContract.increment()
    expect(await mockCounteContract.increment.staticCall()).to.eq(2)
    await mockCounteContract.increment()
    await expect(mockCounteContract.increment()).to.be.reverted
  })

  it('chaining reverts with reason', async () => {
    const mockCounter = await deployMockContract(wallet, Counter.abi)

    await mockCounter.mock.increment
      .returns(1)
      .returns(2)
      .revertsWithReason('reason')

    const mockCounteContract = mockCounter as unknown as Contract
    expect(await mockCounteContract.increment.staticCall()).to.eq(1)
    await mockCounteContract.increment()
    expect(await mockCounteContract.increment.staticCall()).to.eq(2)
    await mockCounteContract.increment()
    await expect(mockCounteContract.increment()).to.be.revertedWith('reason')
  })

  it('the last return value is used for all subsequent calls', async () => {
    const mockCounter = await deployMockContract(wallet, Counter.abi)

    await mockCounter.mock.increment.returns(1).returns(2)

    const mockCounteContract = mockCounter as unknown as Contract
    expect(await mockCounteContract.increment.staticCall()).to.eq(1)
    await mockCounteContract.increment()
    expect(await mockCounteContract.increment.staticCall()).to.eq(2)
    await mockCounteContract.increment()
    expect(await mockCounteContract.increment.staticCall()).to.eq(2)
  })

  it('revert has to be the last call', async () => {
    const mockCounter = await deployMockContract(wallet, Counter.abi)

    expect(() => {
      return mockCounter.mock.increment.reverts().returns(1)
    }).to.throw('Revert must be the last call')

    expect(() => {
      return mockCounter.mock.increment.returns(1).reverts()
    }).to.not.throw()
  })

  it('withArgs can be called only once', async () => {
    const mockCounter = await deployMockContract(wallet, Counter.abi)

    expect(() => {
      return mockCounter.mock.increaseBy.returns(1).withArgs(1).withArgs(2)
    }).to.throw('withArgs can be called only once')
  })

  it('return chaining with withArgs', async () => {
    const mockCounter = await deployMockContract(wallet, Counter.abi)

    await mockCounter.mock.increaseBy.withArgs(1).returns(1).returns(2)
    await mockCounter.mock.increaseBy.withArgs(2).returns(3).returns(4)

    const mockCounterContract = mockCounter as unknown as Contract
    expect(await mockCounterContract.increaseBy.staticCall(1)).to.eq(1)
    await mockCounterContract.increaseBy(1)
    expect(await mockCounterContract.increaseBy.staticCall(1)).to.eq(2)
    await mockCounterContract.increaseBy(1)
    expect(await mockCounterContract.increaseBy.staticCall(1)).to.eq(2)

    expect(await mockCounterContract.increaseBy.staticCall(2)).to.eq(3)
    await mockCounterContract.increaseBy(2)
    expect(await mockCounterContract.increaseBy.staticCall(2)).to.eq(4)
    await mockCounterContract.increaseBy(2)
    expect(await mockCounterContract.increaseBy.staticCall(2)).to.eq(4)
  })

  it('double call in one transaction', async () => {
    const mockCounter = await deployMockContract(wallet, Counter.abi)
    const mockCounterAddress = await mockCounter.getAddress()
    const proxy = await ethers.deployContract(
      'Proxy',
      [mockCounterAddress],
      wallet
    )

    await mockCounter.mock.increment.returns(1).returns(2)

    expect(await proxy.incrementTwice.staticCall()).to.eq(1 + 2)

    await mockCounter.mock.increaseBy.returns(3).returns(4)

    expect(await proxy.increaseByTwice.staticCall(1)).to.eq(3 + 4)
  })

  it('queue overwrite', async () => {
    const mockCounter = await deployMockContract(wallet, Counter.abi)

    await mockCounter.mock.increment.returns(1).returns(2)
    await mockCounter.mock.increment.returns(3).returns(4)

    const mockCounterContract = mockCounter as unknown as Contract
    expect(await mockCounterContract.increment.staticCall()).to.eq(3)
    await mockCounterContract.increment()
    expect(await mockCounterContract.increment.staticCall()).to.eq(4)
    await mockCounterContract.increment()
    expect(await mockCounterContract.increment.staticCall()).to.eq(4)
  })
})
