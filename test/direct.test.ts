import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers'
import { expect } from 'chai'
import { Contract, Wallet } from 'ethers'
import { ethers, artifacts } from 'hardhat'
import { Artifact } from 'hardhat/types'
import { deployMockContract } from '../src'

describe('Mock Contract - Integration (called directly)', () => {
  let wallet: HardhatEthersSigner
  let Counter: Artifact
  let Doppelganger: Artifact

  before(async () => {
    ;[wallet] = await ethers.getSigners()
    Counter = await artifacts.readArtifact('Counter')
    Doppelganger = await artifacts.readArtifact('Doppelganger')
  })

  it('throws readable error if mock was not set up for a method', async () => {
    const mockCounter = (await deployMockContract(
      wallet,
      Counter.abi
    )) as unknown as Contract

    await expect(mockCounter.read()).to.be.revertedWith(
      'Mock on the method is not initialized'
    )
  })

  it('mocking returned values', async () => {
    const mockCounter = await deployMockContract(wallet, Counter.abi)
    await mockCounter.mock.read.returns(45291)

    expect(await (mockCounter as unknown as Contract).read()).to.equal(45291)
  })

  it('mocking revert', async () => {
    const mockCounter = await deployMockContract(wallet, Counter.abi)
    await mockCounter.mock.read.reverts()

    await expect(
      (mockCounter as unknown as Contract).read()
    ).to.be.revertedWith('Mock revert')
  })

  it('mock with call arguments', async () => {
    const mockCounter = await deployMockContract(wallet, Counter.abi)
    await mockCounter.mock.add.returns(1)
    await mockCounter.mock.add.withArgs(1).returns(2)
    await mockCounter.mock.add.withArgs(2).reverts()

    const mockCounterCountract = mockCounter as unknown as Contract
    expect(await mockCounterCountract.add(0)).to.equal(1)
    expect(await mockCounterCountract.add(1)).to.equal(2)
    await expect(mockCounterCountract.add(2)).to.be.revertedWith('Mock revert')
    expect(await mockCounterCountract.add(3)).to.equal(1)
  })

  it('should be able to call to another contract', async () => {
    const counter = await ethers.deployContract('Counter', wallet)
    const mockCounter = await deployMockContract(wallet, Counter.abi)

    expect(await mockCounter.staticcall(counter, 'read()')).to.equal('0')
    expect(await mockCounter.staticcall(counter, 'read')).to.equal('0')
  })

  it('should be able to call another contract with a parameter', async () => {
    const counter = await ethers.deployContract('Counter', wallet)
    const mockCounter = await deployMockContract(wallet, Counter.abi)

    expect(await mockCounter.staticcall(counter, 'add', 1)).to.equal('1')
  })

  it('should be able to call another contract with many parameters', async () => {
    const counter = await ethers.deployContract('Counter', wallet)
    const mockCounter = await deployMockContract(wallet, Counter.abi)

    expect(await mockCounter.staticcall(counter, 'addThree', 1, 2, 3)).to.equal(
      '6'
    )
  })

  it('should be able to execute another contract', async () => {
    const counter = await ethers.deployContract('Counter', wallet)
    const mockCounter = await deployMockContract(wallet, Counter.abi)

    await mockCounter.call(counter, 'increment()')
    expect(await counter.read()).to.equal('1')

    await mockCounter.call(counter, 'increment')
    expect(await counter.read()).to.equal('2')
  })

  it('should be able to execute another contract with a parameter', async () => {
    const counter = await ethers.deployContract('Counter', wallet)
    const mockCounter = await deployMockContract(wallet, Counter.abi)

    await mockCounter.call(counter, 'increaseBy', 2)
    expect(await counter.read()).to.equal('2')
  })

  it('should be able to execute another contract with many parameters', async () => {
    const counter = await ethers.deployContract('Counter', wallet)
    const mockCounter = await deployMockContract(wallet, Counter.abi)

    await mockCounter.call(counter, 'increaseByThreeValues', 1, 2, 3)
    expect(await counter.read()).to.equal('6')
  })

  it('can be deployed under specified address', async () => {
    const address = Wallet.createRandom().address
    const mockCounter = await deployMockContract(wallet, Counter.abi, {
      address,
    })
    const mockCounterAddress = await mockCounter.getAddress()
    expect(mockCounterAddress).to.eq(address)
    expect(await ethers.provider.getCode(address)).to.eq(
      Doppelganger.deployedBytecode
    )
  })

  it("can't be deployed twice under the same address", async () => {
    const address = Wallet.createRandom().address
    await deployMockContract(wallet, Counter.abi, { address })
    await expect(
      deployMockContract(wallet, Counter.abi, { address })
    ).to.be.eventually.rejectedWith(
      Error,
      `${address} already contains a contract`
    )
  })

  it('can be overidden', async () => {
    const counter = await ethers.deployContract('Counter')
    expect(await ethers.provider.getCode(counter.target)).to.eq(
      Counter.deployedBytecode
    )
    const counterAddress = await counter.getAddress()
    await deployMockContract(wallet, Counter.abi, {
      address: counterAddress,
      override: true,
    })
    expect(await ethers.provider.getCode(counterAddress)).to.eq(
      Doppelganger.deployedBytecode
    )
  })
})
