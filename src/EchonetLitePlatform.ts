import type {
  API,
  Characteristic,
  DynamicPlatformPlugin,
  Logging,
  PlatformAccessory,
  PlatformConfig,
  Service,
} from 'homebridge'

import { BathAutoAccessory } from './BathAutoAccessory.js'
import { BathReheatingAccessory } from './BathReheatingAccessory.js'
import { FloorHeater1Accessory } from './FloorHeater1Accessory.js'
import { FloorHeater2Accessory } from './FloorHeater2Accessory.js'

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
    const bathAutoAccessory = new BathAutoAccessory(this, this.config)
    try {
      await bathAutoAccessory.init()
    } catch (e) {
      this.log.error('Cannot init bath auto')
    }

    const bathReheatingAccessory = new BathReheatingAccessory(this, this.config)
    try {
      await bathReheatingAccessory.init()
    } catch (e) {
      this.log.error('Cannot init bath reheating')
    }

    const floorHeater1Accessory = new FloorHeater1Accessory(this, this.config)
    try {
      await floorHeater1Accessory.init()
    } catch (e) {
      this.log.error('Cannot init floor heater 1')
    }

    const floorHeater2Accessory = new FloorHeater2Accessory(this, this.config)
    try {
      await floorHeater2Accessory.init()
    } catch (e) {
      this.log.error('Cannot init floor heater 2')
    }
  }
}
