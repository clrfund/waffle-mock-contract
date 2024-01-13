import { expect } from 'chai'
import { Contract } from 'ethers'
import { deployMockContract, MockContract } from '../src'
import { artifacts, ethers } from 'hardhat'
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers'

describe('Ether Forwarded', () => {
  let sender: HardhatEthersSigner
  let mockERC20: MockContract
  let contract: Contract

  beforeEach(async () => {
    ;[sender] = await ethers.getSigners()
    const IERC20 = await artifacts.readArtifact(
      'contracts/test/EtherForward.sol:IERC20'
    )
    mockERC20 = await deployMockContract(sender, IERC20.abi)

    contract = await ethers.deployContract(
      'EtherForward',
      [mockERC20.target],
      sender
    )
  })

  it('Can forward ether through call', async () => {
    expect(await ethers.provider.getBalance(mockERC20.target)).to.be.equal(0)
    await contract.forwardByCall({ value: 7 })
    expect(await ethers.provider.getBalance(mockERC20.target)).to.be.equal(7)
  })

  it('Can forward ether through send', async () => {
    expect(await ethers.provider.getBalance(mockERC20.target)).to.be.equal(0)
    await contract.forwardBySend({ value: 7 })
    expect(await ethers.provider.getBalance(mockERC20.target)).to.be.equal(7)
  })

  it('Can forward ether through transfer', async () => {
    expect(await ethers.provider.getBalance(mockERC20.target)).to.be.equal(0)
    await contract.forwardByTransfer({ value: 7 })
    expect(await ethers.provider.getBalance(mockERC20.target)).to.be.equal(7)
  })

  it('Can mock a revert on a receive function', async () => {
    expect(await ethers.provider.getBalance(mockERC20.target)).to.be.equal(0)

    await mockERC20.mock.receive.revertsWithReason(
      'Receive function rejected ether.'
    )

    await expect(contract.forwardByCall({ value: 7 })).to.be.revertedWith(
      'Receive function rejected ether.'
    )

    await expect(contract.forwardBySend({ value: 7 })).to.be.revertedWith(
      'forwardBySend failed'
    )

    await expect(contract.forwardByTransfer({ value: 7 })).to.be.reverted

    expect(await ethers.provider.getBalance(mockERC20.target)).to.be.equal(0)
  })
})
