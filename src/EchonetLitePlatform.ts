import type {
  API,
  Characteristic,
  DynamicPlatformPlugin,
  Logging,
  PlatformAccessory,
  PlatformConfig,
  Service,
} from 'homebridge'

import { WaterHeaterAccessory } from './WaterHeaterAccessory.js'
import { FloorHeaterAccessory } from './FlooerHeaterAccessory.js'

export class EchonetLitePlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service
  public readonly Characteristic: typeof Characteristic

  public readonly accessories: PlatformAccessory[] = []

  constructor(
    public readonly log: Logging,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.Service = api.hap.Service
    this.Characteristic = api.hap.Characteristic

    this.log.debug('Finished initializing platform:', this.config.name)

    this.api.on('didFinishLaunching', () => {
      log.debug('Executed didFinishLaunching callback')
      this.discoverDevices()
    })
  }

  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName)
    this.accessories.push(accessory)
  }

  async discoverDevices() {
    const waterHeaterAccessory = new WaterHeaterAccessory(this, this.config)
    try {
      await waterHeaterAccessory.init()
    } catch (e) {
      this.log.error('Cannot init water heater')
    }

    const flooerHeaterAccessory = new FloorHeaterAccessory(this, this.config)
    try {
      await flooerHeaterAccessory.init()
    } catch (e) {
      this.log.error('Cannot init water heater')
    }
  }
}
