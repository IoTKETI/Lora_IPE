var events = require('events');
var mqtt = require('mqtt');
var util = require('util');
var fs = require('fs');
var jsonpath = require('jsonpath');
var ttn = require('ttn');
const express = require('express');
const app = express();
var cl = require('./ConfigLoader');
var mobius = require('./MobiusConnector').mobius;

const SENSOR_LIST_FILE = 'sensor_list.txt';

var event = new events.EventEmitter();
var config = cl.get_resource_config();

const appID = "keti_parkingsensor"
const accessKey = "ttn-account-v2.J4wsIERlzUk1eqQGrlsxVP_i-aMPSJsCvN9SeybeO64"

var keti_mobius = new mobius();
keti_mobius.set_mobius_info(config.cse.cbhost, config.cse.cbport);

var client_;
var sensor_ids = [];
lora_client = ttn.data(appID,accessKey);

function status_Check(){
    app.get('/status', (req, res) => {
        res.end('');
       });
    app.get('/errlog', (req, res) => {
        if(fs.existsSync(err_log)){
          var log = fs.readFileSync(err_log);
          res.send(log);
        //   fs.unlinkSync(err_log);
        }
        else{
          res.send('NOT ERROR!!!');
        }
    }); 
    app.listen(8369, () => {
    console.log('status Checker Start!');
    });
}

function get_Start() {
    ttn.data(appID, accessKey).then(function(client) {
        client_ = client;
        get_Lora_sensing_vlaue();
    })
    .catch(function (error) {
        console.error("Error", error.stack)
        process.exit(1)
    })
}

function read_sensor_id_list(){
    var str = String(fs.readFileSync(SENSOR_LIST_FILE));
    sensor_ids = str.split('\r\n');
}

function get_Lora_sensing_vlaue(){
    client_.on("uplink", function (devID, payload) {
      console.log("Received uplink from ", devID)
      var dev_eui = payload.hardware_serial;
      console.log(typeof(payload));
      console.log(dev_eui);
      console.log(payload["payload_raw"]);
      if(payload["payload_raw"] == null){
        console.log("Null Playload");
      }
      else{
        var enc = new Buffer(payload["payload_raw"]).toString('hex');
        var cin_parent_path = '/' + config["cse"].cbname + '/' + config["ae"]["appname"] + '/' + dev_eui + '/' + "up";

        console.log(enc);  
        var cin_obj = {
            'm2m:cin': {
            'con': enc
            }
        };
      
      var resp = keti_mobius.create_cin(cin_parent_path, cin_obj);
      console.log(resp);
    }
    })
}

function init_mqtt_client() {

    mqtt_client = mqtt.connect('mqtt://' + config.cse.cbhost + ':' + config.cse.mqttport);

    mqtt_client.on('connect', on_mqtt_connect);
    mqtt_client.on('message', on_mqtt_message_recv);
    console.log("init_mqtt_client!!!");
}

function on_mqtt_connect() {
    var noti_topic = util.format('/oneM2M/req/+/%s/#', config.ae.aeid);
    mqtt_client.unsubscribe(noti_topic);
    mqtt_client.subscribe(noti_topic);
    console.log('[mqtt_connect] noti_topic : ' + noti_topic);
}

function on_mqtt_message_recv(topic, message) {

    console.log('receive message from topic: <- ' + topic);
    console.log('receive message: ' + message.toString());

    var topic_arr = topic.split("/");

    if (topic_arr[1] == 'oneM2M' && topic_arr[2] == 'req' && topic_arr[4] == config.ae.aeid) {
        var jsonObj = JSON.parse(JSON.stringify(message.toString()));
        //var jsonObj = JSON.parse(message.toString());

        mqtt_noti_action(jsonObj, function (path_arr, cinObj, rqi, sur) {
            if (cinObj) {
                var rsp_topic = '/oneM2M/resp/' + topic_arr[3] + '/' + topic_arr[4] + '/' + topic_arr[5];

                event.emit('upload', sur, cinObj);

                response_mqtt(rsp_topic, '2000', '', config.ae.aeid, rqi, '');
            }
        });
    }
    else {
        console.log('topic is not supported');
    }
}

function init_resource(){
    var parent_path = '/' + config["cse"].cbname;  
    var ae_obj = {
      'm2m:ae':{
        'api': config["ae"]["aeid"],
        'rr': true,
        'rn': config["ae"]["appname"]
      }
    };
    console.log(JSON.stringify(ae_obj));
    console.log("AE_Complete!!");
    var ae_resp = keti_mobius.create_ae(parent_path, ae_obj);
    console.log(ae_resp);
    if(ae_resp.code == 201 || ae_resp.code == 409){
        var cnt_parent_path = '/' + config["cse"].cbname + '/' + config["ae"]["appname"];  
        for (var i = 0; i < sensor_ids.length; i++) {
            var cnt_sensor_obj = {
                'm2m:cnt':{
                'rn' : sensor_ids[i]
                }
            };
            console.log(cnt_sensor_obj);
            var cnt_resp = keti_mobius.create_cnt(cnt_parent_path, cnt_sensor_obj);
            if (cnt_resp.code == 201 || cnt_resp.code == 409){
                var cnt2_parent_path = '/' + config["cse"].cbname + '/' + config["ae"]["appname"] +'/'+ sensor_ids[i];  
                var cnt_upobj = {
                    'm2m:cnt':{
                    'rn' : "up"
                    }
                };
                var cnt_downobj = {
                    'm2m:cnt':{
                    'rn' : "down"
                    }
                };
                var cnt_resp2 = keti_mobius.create_cnt(cnt2_parent_path, cnt_upobj);
                if(cnt_resp2.code == 201 || cnt_resp2.code == 409){
                   var cnt_resp3 = keti_mobius.create_cnt(cnt2_parent_path, cnt_downobj);
                }
                if(cnt_resp3.code == 201 || cnt_resp3.code == 409 ){
                    console.log("CNT_Complete!!");
                }
            }
            else{
                
            }
        }
        var sub_ae_parent_path = '/' + config["cse"].cbname + '/' + config["ae"]["appname"];
        var nuarr = {nu:['mqtt://' + config["cse"].cbhost  +'/'+ config["ae"]["aeid"] + '?ct=json']};
        var sub_obj = {
            'm2m:sub':
            {
                'rn' : "sub_container_check",
                'enc': {'net': [4]},
                'nu' : nuarr.nu,
                'nct': 2
            }
        };
        var sub_ae_path = sub_ae_parent_path+'/'+'sub_container_check';
        var resp_sub = keti_mobius.retrieve_sub(sub_ae_path);
        if (resp_sub.code == 200) {
            resp_sub = keti_mobius.delete_res(sub_ae_path);

            if (resp_sub.code == 200) {
                resp_sub = keti_mobius.create_sub(sub_ae_parent_path, sub_obj);
                
            }
        } 
        else if (resp_sub.code == 404) {
            keti_mobius.create_sub(sub_ae_parent_path, sub_obj);
        }
        else{

        }
        for (var i = 0; i < sensor_ids.length; i++) {
            var sub_parent_path = '/' + config["cse"].cbname + '/' + config["ae"]["appname"] + '/'+ sensor_ids[i] +'/'+"down";
            var nuarr = {nu:['mqtt://' + config["cse"].cbhost  +'/'+ config["ae"]["aeid"] + '?ct=json']};
            var sub_obj = {
                'm2m:sub':
                    {
                        'rn' : "sub_lora_sensor",
                        'enc': {'net': [3]},
                        'nu' : nuarr.nu,
                        'nct': 2
                    }
            };
            var sub_path = sub_parent_path +'/'+"sub_lora_sensor";
            var resp_sub = keti_mobius.retrieve_sub(sub_path);

            if (resp_sub.code == 200) {
                resp_sub = keti_mobius.delete_res(sub_path);

                if (resp_sub.code == 200) {
                    resp_sub = keti_mobius.create_sub(sub_parent_path, sub_obj);
                    
                }
            } 
            else if (resp_sub.code == 404) {
                keti_mobius.create_sub(sub_parent_path, sub_obj);
            }
            else{

            }
            if(resp_sub.code == 201 || resp_sub.code == 409){
               console.log("SUB_Complete!!");   
            //    init_mqtt_client();
            //    get_Start();
            //    get_Lora_sensing_vlaue();
            }
        }
        init_mqtt_client();
        get_Start();
    }
}

function response_mqtt (rsp_topic, rsc, to, fr, rqi, inpcs) {

    var rsp_message = {};
    rsp_message['m2m:rsp'] = {};
    rsp_message['m2m:rsp'].rsc = rsc;
    rsp_message['m2m:rsp'].to = to;
    rsp_message['m2m:rsp'].fr = fr;
    rsp_message['m2m:rsp'].rqi = rqi;
    rsp_message['m2m:rsp'].pc = inpcs;

    mqtt_client.publish(rsp_topic, JSON.stringify(rsp_message));

    console.log('noti publish -> ' + JSON.stringify(rsp_message));

};

function Lora_noti(devID,cinObj){
    var payload_raw=[cinObj];

    console.log("DevID :" + devID + "," + "Data :" + payload_raw);

    client_.send("devID",payload_raw);
}

function mqtt_noti_action(jsonObj, callback) {
    if (jsonObj != null) {
        // var rqi =  JSON.stringify(jsonpath.query(JSON.parse(jsonObj), '$..rqi'))
        // rqi=rqi.replace("\"", "").replace("]", "").replace("[", "").replace("\"", "")
        // var sgnObj =  JSON.stringify(jsonpath.query(JSON.parse(jsonObj), '$..sgn'))
        var net =  JSON.stringify(jsonpath.query(JSON.parse(jsonObj), '$..net'));
        net=net.replace("\"", "").replace("]", "").replace("[", "").replace("\"", "");
        var path_arr= JSON.stringify(jsonpath.query(JSON.parse(jsonObj),'$..sur'));
        var cinObj= jsonpath.query(JSON.parse(jsonObj),'$..con');
        var sur = path_arr.split('/');

        console.log(typeof(net));
        if(net=='3'){
            var devID = sur[2].toLowerCase();
            Lora_noti(devID,cinObj);
        }
        else if (net=='4'){
            var cnt_parent_path = '/' + config["cse"].cbname + '/' + config["ae"]["appname"];
            var rn =  JSON.stringify(jsonpath.query(JSON.parse(jsonObj), '$..rn'));
            rn=rn.replace("\"", "").replace("]", "").replace("[", "").replace("\"", "");
            console.log(rn);
            var recnt_sensor_obj = {
                'm2m:cnt':{
                'rn' : rn
                }
            };
            console.log(recnt_sensor_obj);
            var cnt_resp = keti_mobius.create_cnt(cnt_parent_path, recnt_sensor_obj);
            if (cnt_resp.code == 201 || cnt_resp.code == 409){
                var cnt2_parent_path = '/' + config["cse"].cbname + '/' + config["ae"]["appname"] +'/'+ rn;  
                var cnt_upobj = {
                    'm2m:cnt':{
                    'rn' : "up"
                    }
                };
                var cnt_downobj = {
                    'm2m:cnt':{
                    'rn' : "down"
                    }
                };
                var cnt_resp2 = keti_mobius.create_cnt(cnt2_parent_path, cnt_upobj);
                if(cnt_resp2.code == 201 || cnt_resp2.code == 409){
                   var cnt_resp3 = keti_mobius.create_cnt(cnt2_parent_path, cnt_downobj);
                }
                if(cnt_resp3.code == 201 || cnt_resp3.code == 409 ){
                    console.log("Container Recreate!");
                    var sub_parent_path = '/' + config["cse"].cbname + '/' + config["ae"]["appname"] + '/'+ rn +'/'+"down";
                    var nuarr = {nu:['mqtt://' + config["cse"].cbhost  +'/'+ config["ae"]["aeid"] + '?ct=json']};
                    var sub_obj = {
                        'm2m:sub':
                            {
                                'rn' : "sub_lora_sensor",
                                'enc': {'net': [3]},
                                'nu' : nuarr.nu,
                                'nct': 2
                            }
            };
            var sub_path = sub_parent_path +'/'+"sub_lora_sensor";
            var resp_sub = keti_mobius.retrieve_sub(sub_path);

            if (resp_sub.code == 200) {
                // resp_sub = keti_mobius.delete_res(sub_path);

                if (resp_sub.code == 200) {
                    resp_sub = keti_mobius.create_sub(sub_parent_path, sub_obj);
                    
                }
            } 
            else if (resp_sub.code == 404) {
                keti_mobius.create_sub(sub_parent_path, sub_obj);
            }
            else{

            }
                }
            }
            else{
                
            }

        }
    }
    else {
        console.log('[mqtt_noti_action] message is not noti');
    }
};

try{
    read_sensor_id_list();
    init_resource();
    status_Check();
}
catch(error) {
    console.error(error);
}
