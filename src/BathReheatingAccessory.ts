import type { PlatformAccessory, Service, PlatformConfig } from 'homebridge'

import type { EchonetLitePlatform } from './EchonetLitePlatform.js'
import { sendSet, sendGet, subscribe } from './EchonetLiteService.js'
import { PLATFORM_NAME, BATH_REHEATING_FIXED_ID } from './settings.js'
import { Switch } from './types.js'

const ECHONET_LITE_DEVICE_ID = '027201'
const POWER_STATE_EPC = 0xe4
const POWER_STATE_ON = 0x41
const POWER_STATE_OFF = 0x42

export class BathReheatingAccessory {
  public accessory!: PlatformAccessory
  private service!: Service
  private state = {
    switch: Switch.ACTIVE as Switch,
  }

  constructor(
    private readonly platform: EchonetLitePlatform,
    private readonly configs: PlatformConfig,
  ) {
    // do nothing
  }

  async init() {
    const name = `${this.configs.name} Bath Reheating`
    const uuid = this.platform.api.hap.uuid.generate(BATH_REHEATING_FIXED_ID)

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
      this.platform.api.registerPlatformAccessories(name, PLATFORM_NAME, [
        this.accessory,
      ])
    }

    subscribe(this.configs.ip, ECHONET_LITE_DEVICE_ID, (els) => {
      const { DETAILs } = els
      for (const key in DETAILs) {
        const value = DETAILs[key]
        if (!value || value.length === 0) {
          continue
        } else if (key === POWER_STATE_EPC.toString(16)) {
          this.state.switch =
            value === POWER_STATE_EPC.toString(16)
              ? Switch.ACTIVE
              : Switch.INACTIVE

          this.service
            .getCharacteristic(this.platform.Characteristic.Active)
            .updateValue(this.state.switch === Switch.ACTIVE)
          this.service
            .getCharacteristic(this.platform.Characteristic.InUse)
            .updateValue(this.state.switch === Switch.ACTIVE)
        }
      }
    })

    this.accessory
      .getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(
        this.platform.Characteristic.SerialNumber,
        BATH_REHEATING_FIXED_ID,
      )

    this.service =
      this.accessory.getService(this.platform.Service.Faucet) ||
      this.accessory.addService(this.platform.Service.Faucet)

    this.service.setCharacteristic(this.platform.Characteristic.Name, name)

    this.service
      .getCharacteristic(this.platform.Characteristic.Active)
      .onSet(async (value) => {
        this.state.switch = value ? Switch.ACTIVE : Switch.INACTIVE
        sendSet(
          this.configs.ip,
          ECHONET_LITE_DEVICE_ID,
          POWER_STATE_EPC,
          value ? POWER_STATE_ON : POWER_STATE_OFF,
        )
      })
      .onGet(() => this.state.switch === Switch.ACTIVE)

    this.service
      .getCharacteristic(this.platform.Characteristic.StatusFault)
      .onGet(() =>
        this.state.switch === Switch.ACTIVE
          ? this.platform.Characteristic.StatusFault.GENERAL_FAULT
          : this.platform.Characteristic.StatusFault.NO_FAULT,
      )

    sendGet(this.configs.ip, ECHONET_LITE_DEVICE_ID, POWER_STATE_EPC)
  }
}
