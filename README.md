# LoRa_IPE

## version 
v1.0.0

## Introduction
- The LoRa IPE provides interworking between oneM2M system and LoRa networks. 
- The web tutorial is available at the oneM2M youtube channel: https://youtu.be/-s5bSvzJcXo

## Installation
- Open the LoRa_IPE source home directory
- Install the dependent libraries as below
```
 npm install
 
```
## Configuration
- Modify the configuration file "conf.js" per your setting
```
 
var conf = {};
var cse = {};
var ae = {};
var lora = {};

//cse config
cse.host = "203.253.128.161";
cse.port = "7579";
cse.name = "Mobius";
cse.id = "/Mobius2";
cse.mqttport = "1883";

//ae config
ae.name = "keti_tracker";
ae.id = "S" + ae.name;
ae.parent = "/" + cse.name;
ae.appid = "lora"

//lora config
lora.host = "203.253.128.164";
lora.mqttport = "1883";

conf.cse = cse;
conf.ae = ae;
conf.lora = lora;

module.exports = conf;
 
```
## Running
- Run the 'app.js' file as below
```
node app.js
```
