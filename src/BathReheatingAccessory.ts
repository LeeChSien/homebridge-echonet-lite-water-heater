import type { PlatformAccessory, Service, PlatformConfig } from 'homebridge'

import type { EchonetLitePlatform } from './EchonetLitePlatform.js'
import { sendSet, sendGet, subscribe } from './EchonetLiteService.js'
import { PLATFORM_NAME } from './settings.js'

enum Switch {
  Active = 'Active',
  Inactive = 'Inactive',
}

const FIXED_ID = 'fixed:echonet-lite:bath-reheating'
const ECHONET_LITE_ID = '027201'

export class BathReheatingAccessory {
  public accessory!: PlatformAccessory
  private service!: Service
  private state = {
    switch: Switch.Active as Switch,
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
        `${this.configs.name} Bath Auto`,
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
        } else if (key === 'e4') {
          this.state.switch = value === '41' ? Switch.Active : Switch.Inactive
        }
      }
    })

    sendGet(this.configs.ip, ECHONET_LITE_ID, 0xe3)
    sendGet(this.configs.ip, ECHONET_LITE_ID, 0xe4)

    this.accessory
      .getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.SerialNumber, FIXED_ID)

    this.service =
      this.accessory.getService(this.platform.Service.Faucet) ||
      this.accessory.addService(this.platform.Service.Faucet)

    this.service.setCharacteristic(
      this.platform.Characteristic.Name,
      `${this.configs.name} Bath Auto`,
    )

    this.service
      .getCharacteristic(this.platform.Characteristic.Active)
      .onSet(async (value) => {
        this.state.switch = value ? Switch.Active : Switch.Inactive
        sendSet(this.configs.ip, ECHONET_LITE_ID, 0xe4, value ? 0x41 : 0x42)
      })
      .onGet(() => this.state.switch === Switch.Active)

    this.service
      .getCharacteristic(this.platform.Characteristic.InUse)
      .onGet(() => this.state.switch === Switch.Active)
  }
}
