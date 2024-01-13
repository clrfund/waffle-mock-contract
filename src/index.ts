import {
  BaseContract,
  Contract,
  ContractFactory,
  Signer,
  Interface,
  Fragment,
  FunctionFragment,
  JsonFragment,
  JsonRpcProvider,
  AbiCoder,
} from 'ethers'

import DoppelgangerContract from './Doppelganger.json'
import { HardhatEthersProvider } from '@nomicfoundation/hardhat-ethers/internal/hardhat-ethers-provider'

type ABI = string | Array<Fragment | JsonFragment | string>

interface StubInterface {
  returns(...args: any): StubInterface
  reverts(): StubInterface
  revertsWithReason(reason: string): StubInterface
  withArgs(...args: any[]): StubInterface
}

export interface MockContract extends BaseContract {
  mock: {
    [key: string]: StubInterface
  }
  call(contract: Contract, functionName: string, ...params: any[]): Promise<any>
  staticcall(
    contract: Contract,
    functionName: string,
    ...params: any[]
  ): Promise<any>
}

class Stub implements StubInterface {
  callData: string
  stubCalls: Array<() => Promise<any>> = []
  revertSet = false
  argsSet = false

  constructor(
    private mockContract: Contract,
    private encoder: AbiCoder,
    private func: FunctionFragment
  ) {
    this.callData = func.selector
  }

  private err(reason: string): never {
    this.stubCalls = []
    this.revertSet = false
    this.argsSet = false
    throw new Error(reason)
  }

  returns(...args: any) {
    if (this.revertSet) this.err('Revert must be the last call')
    if (!this.func.outputs)
      this.err('Cannot mock return values from a void function')
    const encoded = this.encoder.encode(this.func.outputs, args)

    // if there no calls then this is the first call and we need to use mockReturns to override the queue
    if (this.stubCalls.length === 0) {
      this.stubCalls.push(async () => {
        await this.mockContract.__waffle__mockReturns(this.callData, encoded)
      })
    } else {
      this.stubCalls.push(async () => {
        await this.mockContract.__waffle__queueReturn(this.callData, encoded)
      })
    }
    return this
  }

  reverts() {
    if (this.revertSet) this.err('Revert must be the last call')

    // if there no calls then this is the first call and we need to use mockReturns to override the queue
    if (this.stubCalls.length === 0) {
      this.stubCalls.push(async () => {
        await this.mockContract.__waffle__mockReverts(
          this.callData,
          'Mock revert'
        )
      })
    } else {
      this.stubCalls.push(async () => {
        await this.mockContract.__waffle__queueRevert(
          this.callData,
          'Mock revert'
        )
      })
    }
    this.revertSet = true
    return this
  }

  revertsWithReason(reason: string) {
    if (this.revertSet) this.err('Revert must be the last call')

    // if there no calls then this is the first call and we need to use mockReturns to override the queue
    if (this.stubCalls.length === 0) {
      this.stubCalls.push(async () => {
        await this.mockContract.__waffle__mockReverts(this.callData, reason)
      })
    } else {
      this.stubCalls.push(async () => {
        await this.mockContract.__waffle__queueRevert(this.callData, reason)
      })
    }
    this.revertSet = true
    return this
  }

  withArgs(...params: any[]) {
    if (this.argsSet) this.err('withArgs can be called only once')
    this.callData = this.mockContract.interface.encodeFunctionData(
      this.func,
      params
    )
    this.argsSet = true
    return this
  }

  async then(resolve: () => void, reject: (e: any) => void) {
    for (let i = 0; i < this.stubCalls.length; i++) {
      try {
        await this.stubCalls[i]()
      } catch (e) {
        this.stubCalls = []
        this.argsSet = false
        this.revertSet = false
        reject(e)
        return
      }
    }

    this.stubCalls = []
    this.argsSet = false
    this.revertSet = false
    resolve()
  }
}

type DeployOptions = {
  address: string
  override?: boolean
}

async function deploy(signer: Signer, options?: DeployOptions) {
  if (options) {
    const { address, override } = options
    const provider = signer.provider
    if (
      !(provider instanceof JsonRpcProvider) &&
      !(provider instanceof HardhatEthersProvider)
    ) {
      throw new Error(
        'Can only deploy mock contract using' +
          ' JsonRpcProvider or HardhatEthersProvider'
      )
    }
    if (!override && (await provider.getCode(address)) !== '0x') {
      throw new Error(
        `${address} already contains a contract. ` +
          'If you want to override it, set the override parameter.'
      )
    }
    if (
      (provider as any)._hardhatNetwork ||
      provider instanceof HardhatEthersProvider
    ) {
      if (
        await provider.send('hardhat_setCode', [
          address,
          DoppelgangerContract.deployedBytecode,
        ])
      ) {
        return new Contract(address, DoppelgangerContract.abi, signer)
      } else throw new Error(`Couldn't deploy at ${address}`)
    } else {
    }
  }
  const factory = new ContractFactory(
    DoppelgangerContract.abi,
    DoppelgangerContract.bytecode,
    signer
  )
  return factory.deploy()
}

function createMock<T extends Contract>(
  abi: ABI,
  mockContractInstance: Contract
): MockContract {
  const { fragments } = new Interface(abi)
  const encoder = new AbiCoder()

  const functions = fragments
    .filter((fr) => Fragment.isFunction(fr))
    .map((fr) => fr as FunctionFragment)

  const mockedAbi = Object.values(functions).reduce((acc, func) => {
    const stubbed = new Stub(mockContractInstance, encoder, func)
    return {
      ...acc,
      [func.name]: stubbed,
      [func.format()]: stubbed,
    }
  }, {} as Partial<MockContract>)

  ;(mockedAbi as any).receive = {
    returns: () => {
      throw new Error('Receive function return is not implemented.')
    },
    withArgs: () => {
      throw new Error('Receive function return is not implemented.')
    },
    reverts: () => mockContractInstance.__waffle__receiveReverts('Mock Revert'),
    revertsWithReason: (reason: string) =>
      mockContractInstance.__waffle__receiveReverts(reason),
  }

  return mockedAbi as MockContract
}

export async function deployMockContract<T extends Contract = Contract>(
  signer: Signer,
  abi: ABI,
  options?: DeployOptions
): Promise<MockContract> {
  const mockContractInstance = (await deploy(signer, options)) as Contract

  const mock = createMock<T>(abi, mockContractInstance)
  const mockContractInstanceAddress = await mockContractInstance.getAddress()
  const contract = new Contract(mockContractInstanceAddress, abi, signer)
  const mockedContract = contract as unknown as MockContract
  mockedContract.mock = mock as any

  const encoder = new AbiCoder()

  mockedContract.staticcall = async (
    contract: Contract,
    functionName: string,
    ...params: any[]
  ) => {
    let func = contract.interface.getFunction(functionName)
    if (!func) {
      throw new Error(`Unknown function ${functionName}`)
    }
    if (!func.outputs) {
      throw new Error('Cannot staticcall function with no outputs')
    }
    const tx = await contract[functionName].populateTransaction(...params)
    const data = tx.data
    let result
    const returnValue = await mockContractInstance.__waffle__staticcall(
      contract.target,
      data
    )
    result = encoder.decode(func.outputs, returnValue)
    if (result.length === 1) {
      result = result[0]
    }
    return result
  }

  mockedContract.call = async (
    contract: Contract,
    functionName: string,
    ...params: any[]
  ) => {
    const tx = await contract[functionName].populateTransaction(...params)
    const data = tx.data
    return mockContractInstance.__waffle__call(contract.target, data)
  }

  return mockedContract
}
