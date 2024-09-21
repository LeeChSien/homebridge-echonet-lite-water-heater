# homebridge-echonet-lite-waterheater

We implemented this plugin with echonet-lite protocol. To support remote control for water heater facility Osaka Gas 238-R418 ([ref](https://echonet.jp/introduce/lz-000315/)), will attach 4 items:

1. Bath Auto: お風呂自動
2. Bath Reheating: 追い焚き
3. Floor Heater 1: 床暖房1
4. Floor Heater 2: 床暖房2

## Usage

```js
"platforms": [
  {
    "platform": "EchonetLiteWaterHeater",
    "name": "Osaka Gas",
    "ip": "192.168.11.50"
  }
]
```
