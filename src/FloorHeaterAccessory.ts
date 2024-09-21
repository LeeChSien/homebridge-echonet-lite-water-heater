import type { PlatformAccessory, Service, PlatformConfig } from 'homebridge'

import type { EchonetLitePlatform } from './EchonetLitePlatform.js'
import { sendSet, sendGet, subscribe } from './EchonetLiteService.js'
import { PLATFORM_NAME, FLOOR_HEATER_1_FIXED_ID } from './settings.js'
import { Power } from './types.js'

const POWER_STATE_EPC = 0x80
const POWER_STATE_ON = 0x30
const POWER_STATE_OFF = 0x31
const LEVEL_EPC = 0xe1

export class FloorHeaterAccessory {
  public accessory!: PlatformAccessory
  private service!: Service
  private state = {
    power: Power.OFF as Power,
    level: 1 as number,
  }
  // some mutual exclusive issue here, so we need to set this flag.
  private isInitialized = false

  constructor(
    private readonly platform: EchonetLitePlatform,
    private readonly ECHONET_LITE_DEVICE_ID: string,
    private readonly configs: PlatformConfig,
  ) {
    // don nothing.
  }

  async init() {
    const name = `${this.configs.name} Floor Heater 1`
    const uuid = this.platform.api.hap.uuid.generate(FLOOR_HEATER_1_FIXED_ID)

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

    subscribe(this.configs.ip, this.ECHONET_LITE_DEVICE_ID, (els) => {
      const { DETAILs } = els
      for (const key in DETAILs) {
        const value = DETAILs[key]
        if (!value || value.length === 0) {
          continue
        } else if (
          key === POWER_STATE_EPC.toString(16) &&
          !this.isInitialized
        ) {
          this.state.power =
            value === POWER_STATE_ON.toString(16) ? Power.ON : Power.OFF
          this.isInitialized = true
        } else if (key === LEVEL_EPC.toString(16)) {
          this.state.level = parseInt(value, 16) - 30
        }
      }
    })

    sendGet(this.configs.ip, this.ECHONET_LITE_DEVICE_ID, POWER_STATE_EPC)
    sendGet(this.configs.ip, this.ECHONET_LITE_DEVICE_ID, LEVEL_EPC)

    this.accessory
      .getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(
        this.platform.Characteristic.SerialNumber,
        FLOOR_HEATER_1_FIXED_ID,
      )

    this.service =
      this.accessory.getService(this.platform.Service.HeaterCooler) ||
      this.accessory.addService(this.platform.Service.HeaterCooler)

    this.service.setCharacteristic(this.platform.Characteristic.Name, name)

    this.service
      .getCharacteristic(this.platform.Characteristic.Active)
      .onSet(async (value) => {
        this.state.power = value ? Power.ON : Power.OFF
        sendSet(
          this.configs.ip,
          this.ECHONET_LITE_DEVICE_ID,
          POWER_STATE_EPC,
          value ? POWER_STATE_ON : POWER_STATE_OFF,
        )
      })
      .onGet(() => this.state.power === Power.ON)

    this.service
      .getCharacteristic(this.platform.Characteristic.CurrentHeaterCoolerState)
      .setProps({
        validValues: [
          this.platform.Characteristic.CurrentHeaterCoolerState.INACTIVE,
          this.platform.Characteristic.CurrentHeaterCoolerState.HEATING,
        ],
      })
      .onGet(() =>
        this.state.power === Power.ON
          ? this.platform.Characteristic.CurrentHeaterCoolerState.HEATING
          : this.platform.Characteristic.CurrentHeaterCoolerState.INACTIVE,
      )

    this.service
      .getCharacteristic(this.platform.Characteristic.TargetHeaterCoolerState)
      .setProps({
        validValues: [
          this.platform.Characteristic.TargetHeaterCoolerState.HEAT,
        ],
      })
      .onSet(async () => {
        // do nothing
      })
      .onGet(() => this.platform.Characteristic.TargetHeaterCoolerState.HEAT)

    this.service
      .getCharacteristic(this.platform.Characteristic.CurrentTemperature)
      .onGet(() => 20) // TODO: attach real temperature later

    this.service
      .getCharacteristic(this.platform.Characteristic.TargetTemperature)
      .setProps({
        minValue: 20,
        maxValue: 28,
        minStep: 1,
      })
      .onSet(async (value) => {
        const newLevel = (value as number) - 19
        if (this.state.level !== newLevel) {
          this.state.level = newLevel
          sendSet(
            this.configs.ip,
            this.ECHONET_LITE_DEVICE_ID,
            0xe1,
            eval(`0x${30 + newLevel}}`),
          )
        }
      })
      .onGet(() => this.state.level + 19)
  }
}
