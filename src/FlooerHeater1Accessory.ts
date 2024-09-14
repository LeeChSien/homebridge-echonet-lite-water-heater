import type { PlatformAccessory, Service, PlatformConfig } from 'homebridge'

import type { EchonetLitePlatform } from './EchonetLitePlatform.js'
import { sendSet, sendGet, subscribe } from './EchonetLiteService.js'
import { PLATFORM_NAME } from './settings.js'

enum Power {
  ON = 'ON',
  OFF = 'OFF',
}

const FIXED_ID = 'fixed:echonet-lite:floor-heater-1'
const ECHONET_LITE_ID = '027b01'

export class FloorHeater1Accessory {
  public accessory!: PlatformAccessory
  private service!: Service
  private state = {
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
        `${this.configs.name} Floor Heater 1`,
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
        } else if (key === '80') {
          this.state.power = value === '30' ? Power.ON : Power.OFF
        }
      }
    })

    sendGet(this.configs.ip, ECHONET_LITE_ID, 0x80)

    this.accessory
      .getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.SerialNumber, FIXED_ID)

    this.service =
      this.accessory.getService(this.platform.Service.Switch) ||
      this.accessory.addService(this.platform.Service.Switch)

    this.service.setCharacteristic(
      this.platform.Characteristic.Name,
      `${this.configs.name} Floor Heater 1`,
    )

    this.service
      .getCharacteristic(this.platform.Characteristic.On)
      .onSet(async (value) => {
        this.state.power = value ? Power.ON : Power.OFF
        sendSet(this.configs.ip, ECHONET_LITE_ID, 0x80, value ? 0x30 : 0x31)
      })
      .onGet(() => this.state.power === Power.ON)
  }
}
