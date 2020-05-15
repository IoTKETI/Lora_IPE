var conf = {};
var cse = {};
var ae = {};
var lora = {};
var health = {};

//cse config
cse.host = "203.253.128.161";
cse.port = "7579";
cse.name = "Mobius";
cse.id = "/Mobius2";
cse.mqttport = "1883";

//ae config
ae.name = "9999991000000057";
ae.id = "S" + ae.name;
ae.parent = "/" + cse.name;
ae.appid = "lora"

//lora config
lora.host = "203.253.128.164";
lora.mqttport = "1883";

//health config
health.port = "8369";

conf.cse = cse;
conf.ae = ae;
conf.lora = lora;
conf.health = health;

module.exports = conf;