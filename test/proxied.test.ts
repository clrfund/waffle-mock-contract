import { artifacts, ethers } from 'hardhat'
import { expect } from 'chai'
import { Wallet } from 'ethers'

import { deployMockContract } from '../src'

describe('Mock Contract - Integration (called by other contract)', () => {
  const deploy = async () => {
    const [wallet] = await ethers.getSigners()
    const Counter = await artifacts.readArtifact('Counter')
    const mockCounter = await deployMockContract(wallet, Counter.abi)
    const capContract = await ethers.deployContract(
      'Proxy',
      [mockCounter.target],
      wallet
    )

    return { mockCounter, capContract }
  }

  it('mocking returned values', async () => {
    const { capContract, mockCounter } = await deploy()

    await mockCounter.mock.read.returns(5)
    expect(await capContract.readCapped()).to.equal(5)

    await mockCounter.mock.read.returns(12)
    expect(await capContract.readCapped()).to.equal(10)
  })

  it('mocking revert', async () => {
    const { capContract, mockCounter } = await deploy()

    await mockCounter.mock.read.reverts()
    await expect(capContract.readCapped()).to.be.revertedWith('Mock revert')
  })

  it('mocking with call arguments', async () => {
    const { capContract, mockCounter } = await deploy()
    await mockCounter.mock.add.withArgs(1).returns(1)
    await mockCounter.mock.add.withArgs(2).returns(2)

    expect(await capContract.addCapped(1)).to.equal(1)
    expect(await capContract.addCapped(2)).to.equal(2)
  })

  it('Mocking a contract for an already initialized proxy', async () => {
    const address = Wallet.createRandom().address
    const proxy = await ethers.deployContract('Proxy', [address])
    const Counter = await artifacts.readArtifact('Counter')
    const [wallet] = await ethers.getSigners()
    const mockContract = await deployMockContract(wallet, Counter.abi, {
      address,
    })
    await mockContract.mock.read.returns(1)
    expect(await proxy.readCapped()).to.eq(1)
  })

  // TODO:
  it.skip('calledOnContract with mock contract', async () => {
    const { capContract, mockCounter } = await deploy()

    await mockCounter.mock.read.returns(1)
    await capContract.readCapped()
    //expect('read').to.be.calledOnContract(mockCounter)
  })

  it.skip('calledOnContractWith with mock contract', async () => {
    const { capContract, mockCounter } = await deploy()

    await mockCounter.mock.add.returns(1)
    await capContract.addCapped(1)
    //expect('add').to.be.calledOnContractWith(mockCounter, [1])
  })
})
