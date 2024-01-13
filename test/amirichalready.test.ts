import { expect } from 'chai'
import { Contract, ContractFactory, parseEther } from 'ethers'
import { deployMockContract, MockContract } from '../src'
import { ethers, artifacts } from 'hardhat'
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers'

const ERC20ABI = [
  'function balanceOf(address account) external view returns (uint256)',
]

describe('Am I Rich Already', () => {
  let contractFactory: ContractFactory
  let sender: HardhatEthersSigner
  let receiver: HardhatEthersSigner
  let mockERC20: MockContract
  let contract: Contract

  beforeEach(async () => {
    ;[sender, receiver] = await ethers.getSigners()
    mockERC20 = await deployMockContract(sender, ERC20ABI)

    const AmIRichAlready = await artifacts.readArtifact('AmIRichAlready')
    contractFactory = new ContractFactory(
      AmIRichAlready.abi,
      AmIRichAlready.bytecode,
      sender
    )
    contract = (await contractFactory.deploy(mockERC20.target)) as Contract
  })

  it('returns false if the wallet has less then 1000000 coins', async () => {
    await mockERC20.mock.balanceOf.returns(parseEther('999999'))
    expect(await contract.check()).to.be.equal(false)
  })

  it('returns true if the wallet has more than 1000000 coins', async () => {
    await mockERC20.mock.balanceOf.returns(parseEther('1000001'))
    expect(await contract.check()).to.equal(true)
  })

  it('reverts if the ERC20 reverts', async () => {
    await mockERC20.mock.balanceOf.reverts()
    await expect(contract.check()).to.be.revertedWith('Mock revert')
  })

  it('returns 1000001 coins for my address and 0 otherwise', async () => {
    await mockERC20.mock.balanceOf.returns('0')
    await mockERC20.mock.balanceOf
      .withArgs(sender.address)
      .returns(parseEther('1000001'))

    expect(await contract.check()).to.equal(true)
    expect(await (contract.connect(receiver) as Contract).check()).to.equal(
      false
    )
  })
})
