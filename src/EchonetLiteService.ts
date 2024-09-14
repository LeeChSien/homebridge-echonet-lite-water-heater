// @ts-expect-error we don't have type definition for echonet-lite
import echonetLite from 'echonet-lite'

interface RInfo {
  address: string
  family: string
  port: number
  size: number
}

interface ELS {
  EHD: string
  TID: string
  SEOJ: string
  DEOJ: string
  EDATA: string
  ESV: string
  OPC: string
  DETAIL: string
  DETAILs: Record<string, string>
}

type Callback = (els: ELS) => void

const ID = [0x05, 0xff, 0x01]
const ID_STRING = ID.map((e) => e.toString(16).padStart(2, '0')).join('')

const subscriptions = [] as Array<{
  ip: string
  targetId: string
  callback: Callback
}>

echonetLite.initialize([ID_STRING], (rinfo: RInfo, els: ELS, err?: string) => {
  if (err) {
    console.dir(err)
  } else {
    subscriptions.forEach((sub) => {
      if (sub.ip === rinfo.address && sub.targetId === els.SEOJ) {
        sub.callback(els)
      }
    })
  }
})

export function subscribe(ip: string, targetId: string, callback: Callback) {
  subscriptions.push({ ip, targetId, callback })
}

export function sendGet(ip: string, targetId: string, attr: number) {
  echonetLite.sendOPC1(
    ip,
    ID,
    [
      eval(`0x${targetId[0]}${targetId[1]}`),
      eval(`0x${targetId[2]}${targetId[3]}`),
      eval(`0x${targetId[4]}${targetId[5]}`),
    ],
    echonetLite.GET,
    attr,
  )
}

export function sendSet(
  ip: string,
  targetId: string,
  attr: number,
  value: number,
) {
  echonetLite.sendOPC1(
    ip,
    ID,
    [
      eval(`0x${targetId[0]}${targetId[1]}`),
      eval(`0x${targetId[2]}${targetId[3]}`),
      eval(`0x${targetId[4]}${targetId[5]}`),
    ],
    echonetLite.SETC,
    attr,
    value,
  )
}
