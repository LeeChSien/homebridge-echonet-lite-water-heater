import type { PlatformAccessory, Service, PlatformConfig } from 'homebridge'

import type { EchonetLitePlatform } from './EchonetLitePlatform.js'
import { sendSet, sendGet, subscribe } from './EchonetLiteService.js'
import { PLATFORM_NAME } from './settings.js'

enum Power {
  ON = 'ON',
  OFF = 'OFF',
}

const FIXED_ID = 'fixed:echonet-lite:water-heater'
const ECHONET_LITE_ID = '027201'

export class WaterHeaterAccessory {
  public accessory!: PlatformAccessory

  private autoService!: Service
  private autoState = {
    power: Power.OFF as Power,
  }

  private reheatingService!: Service
  private reheatingState = {
    power: Power.OFF as Power,
  }

  constructor(
    private readonly platform: EchonetLitePlatform,
    private readonly configs: PlatformConfig,
  ) {
    // don nothing.
  }

  async init() {
    const uuid = this.platform.api.hap.uuid.generate(FIXED_ID)
    const existingAccessory = this.platform.accessories.find(
      (accessory) => accessory.UUID === uuid,
    )

    if (existingAccessory) {
      this.accessory = existingAccessory
    } else {
      this.accessory = new this.platform.api.platformAccessory(
        this.configs.name as string,
        uuid,
      )
      this.accessory.context.device = this.configs
      this.platform.api.registerPlatformAccessories(
        `${this.configs.name} Bath`,
        PLATFORM_NAME,
        [this.accessory],
      )
    }

    subscribe(this.configs.ip, ECHONET_LITE_ID, (els) => {
      const { DETAILs } = els
      for (const key in DETAILs) {
        const value = DETAILs[key]
        if (!value || value.length === 0) {
          continue
        } else if (key === 'e3') {
          this.autoState.power = value === '41' ? Power.ON : Power.OFF
        } else if (key === 'e4') {
          this.reheatingState.power = value === '41' ? Power.ON : Power.OFF
        }
      }
    })

    sendGet(this.configs.ip, ECHONET_LITE_ID, 0xe3)
    sendGet(this.configs.ip, ECHONET_LITE_ID, 0xe4)

    this.accessory
      .getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.SerialNumber, FIXED_ID)

    this.autoService =
      this.accessory.getService(this.platform.Service.Faucet) ||
      this.accessory.addService(this.platform.Service.Faucet)

    this.autoService.setCharacteristic(
      this.platform.Characteristic.Name,
      `${this.configs.name} Bath Auto`,
    )

    this.autoService
      .getCharacteristic(this.platform.Characteristic.On)
      .onSet(async (value) => {
        this.autoState.power = value ? Power.ON : Power.OFF
        sendSet(this.configs.ip, ECHONET_LITE_ID, 0xe3, value ? 0x41 : 0x42)
      })
      .onGet(() => this.autoState.power === Power.ON)

    this.reheatingService =
      this.accessory.getService(this.platform.Service.Faucet) ||
      this.accessory.addService(this.platform.Service.Faucet)

    this.reheatingService.setCharacteristic(
      this.platform.Characteristic.Name,
      `${this.configs.name} Bath Reheating`,
    )

    this.reheatingService
      .getCharacteristic(this.platform.Characteristic.On)
      .onSet(async (value) => {
        this.reheatingState.power = value ? Power.ON : Power.OFF
        sendSet(this.configs.ip, ECHONET_LITE_ID, 0xe4, value ? 0x41 : 0x42)
      })
      .onGet(() => this.reheatingState.power === Power.ON)
  }
}
