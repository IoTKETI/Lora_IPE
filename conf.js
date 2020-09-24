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
