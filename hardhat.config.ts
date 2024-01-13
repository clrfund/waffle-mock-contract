import { HardhatUserConfig } from 'hardhat/config'
import '@nomicfoundation/hardhat-chai-matchers'
import '@nomicfoundation/hardhat-ethers'

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.10',
  },
}

export default config
