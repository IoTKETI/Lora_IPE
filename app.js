var events = require('events');
var mqtt = require('mqtt');
var util = require('util');
var fs = require('fs');
var jsonpath = require('jsonpath');
const express = require('express');
const app = express();
var sensor_ids = [];
var mobius = require('./MobiusConnector').mobius;

const SENSOR_LIST_FILE = 'sensor_list.txt';
global.conf = require('./conf.js');
var event = new events.EventEmitter();
var keti_mobius = new mobius();
keti_mobius.set_mobius_info(conf.cse.host, conf.cse.port);

function payload_decode(message){
    opcode = message.substring(8,10);
    device_type = message.substring(10,12);
    parking_data = message.substring(12,14);
    battery = message.substring(14,16);
    device_err = message.substring(16,18);
    rssi = message.substring(18,20);
    snr = message.substring(20,22);
    radar_info = message.substring(22,24);
    check_cycle = message.substring(24,26);

    var packet_json = {};
    //---------------opcode------------------
    if (opcode == '04'){
        packet_json['opcode'] = 'event';
    }
    else if (opcode == '02'){
        packet_json['opcode'] = 'periodic';
    }

    //------------device info---------------
//    sub_json['device_type'] = device_type;
    if (device_type == '10'){
        packet_json['device_type'] = 'Radar';
    }
    else if (device_type == '20'){
        packet_json['device_type'] = 'Magnetic';
    }

    //------------parking data---------------
    if (parking_data == '30'){
        packet_json['parking'] = 'free';
    }
    else if (parking_data == '31'){
        packet_json['parking'] = 'occupied';
    }

    //--------------battery----------------
    packet_json['battery'] = parseInt(battery, 16);

    //--------------device error----------------
    if (device_err == '30'){
        packet_json['device_err'] = 'normal';
    }
    else if (device_err == '31'){
        packet_json['device_err'] = 'sensor_error';
    }
    else if (device_err == '32'){
        packet_json['device_err'] = 'battery_error';
    }
    else if (device_err == '33'){
        packet_json['device_err'] = 'reset';
    }
    else if (device_err == '34'){
        packet_json['device_err'] = 'radar_error';
    }

    //---------------rssi-----------------
    packet_json['rssi'] = parseInt(rssi, 16);

    //---------------snr----------------
    packet_json['snr'] = parseInt(snr, 16);;

    //------------radarinfo---------------
    if (radar_info === '00'){
        packet_json['radar_info'] = 'parking_event';
    }
    else if (radar_info == '01'){
        packet_json['radar_info'] = 'device_init';
    }
    else if (radar_info == '02'){
        packet_json['radar_info'] = 'reboot_reset';
    }
    else if (radar_info == '03'){
        packet_json['radar_info'] = 'system_reset';
    }
    else if (radar_info == '04'){
        packet_json['radar_info'] = 'report';
    }
    else if (radar_info == '05'){
        packet_json['radar_info'] = 'radar_error';
    }
    else if (radar_info == '06'){
        packet_json['radar_info'] = 'radar_repair';
    }

    //------------checkcycle---------------
    if (check_cycle == '00'){
        packet_json['check_cycle'] = 15;
    }
    else if (check_cycle == '01'){
        packet_json['check_cycle'] = 30;
    }
    else if (check_cycle == '02'){
        packet_json['check_cycle'] = 60;
    }
    else if (check_cycle == '03'){
        packet_json['check_cycle'] = 120;
    }
    else if (check_cycle == '04'){
        packet_json['check_cycle'] = 180;
    }
    else if (check_cycle == '05'){
        packet_json['check_cycle'] = 240;
    }
    else if (check_cycle == '06'){
        packet_json['check_cycle'] = 300;
    }
    else if (check_cycle == '07'){
        packet_json['check_cycle'] = 600;
    }

    //-------------json print-------------
    console.log(packet_json);
    return packet_json
}

function ls_downlink(devID,cinObj){//downlink
    console.log(devID + ' Configuration');

    var payload_message = {}
    var ls_txtopic = util.format('application/2/device/%s/tx', devID);

    var downlink_message = new Buffer.from(cinObj[0], 'hex');
    var encode_message = downlink_message.toString('base64');
    // console.log(hex_payload)
    payload_message.confirmed = true;
    payload_message.fPort = 2;
    payload_message.data = encode_message;
    // payload_message.timing = "IMMEDIATELY";
    console.log(payload_message)
    ls_mqtt_client.publish(ls_txtopic, JSON.stringify(payload_message));
}

function read_sensor_id_list(){
    var str = String(fs.readFileSync(SENSOR_LIST_FILE));
    sensor_ids = str.split('\r\n');
}

function init_mqtt_client() {
    var mobius_connectOptions = {
        host: conf.cse.host,
        port: conf.cse.mqttport,
        protocol: "mqtt",
        keepalive: 10,
        protocolId: "MQTT",
        protocolVersion: 4,
        clean: true,
        reconnectPeriod: 2000,
        connectTimeout: 2000,
        rejectUnauthorized: false
    };
    var ls_connectOptions = {
        host: conf.lora.host,
        port: conf.lora.mqttport,
        protocol: "mqtt",
        keepalive: 10,
        protocolId: "MQTT",
        protocolVersion: 4,
        clean: true,
        reconnectPeriod: 2000,
        connectTimeout: 2000,
        rejectUnauthorized: false
    };
    mqtt_client = mqtt.connect(mobius_connectOptions);
    mqtt_client.on('connect', on_mqtt_connect);
    mqtt_client.on('message', on_mqtt_message_recv);
    ls_mqtt_client = mqtt.connect(ls_connectOptions);
    ls_mqtt_client.on('connect', ls_on_mqtt_connect);
    ls_mqtt_client.on('message', ls_on_mqtt_message_recv);
    console.log("init_mqtt_client!!!");
}

function on_mqtt_connect() { //mobius mqtt connet
    var noti_topic = util.format('/oneM2M/req/+/%s/#', conf.ae.id);
    mqtt_client.unsubscribe(noti_topic);
    mqtt_client.subscribe(noti_topic);
    console.log('[mqtt_connect] noti_topic : ' + noti_topic);
}

function ls_on_mqtt_connect() { //lora_app_server mqtt connet
    for (var i = 0; i < sensor_ids.length; i++){
        var ls_rxtopic = util.format('application/2/device/%s/rx', sensor_ids[i].toLowerCase());
        ls_mqtt_client.unsubscribe(ls_rxtopic);
        ls_mqtt_client.subscribe(ls_rxtopic);
        console.log('[ls_mqtt_connect] ls_noti_topic : ' + ls_rxtopic);
    }
}

function on_mqtt_message_recv(topic, message) {
    console.log('receive message from topic: <- ' + topic);
    console.log('receive message: ' + message.toString());
    var topic_arr = topic.split("/");
    if (topic_arr[1] == 'oneM2M' && topic_arr[2] == 'req' && topic_arr[4] == conf.ae.id) {
        var jsonObj = JSON.parse(JSON.stringify(message.toString()));
        mqtt_noti_action(jsonObj, function (path_arr, cinObj, rqi, sur) {
            if (cinObj) {
                var rsp_topic = '/oneM2M/resp/' + topic_arr[3] + '/' + topic_arr[4] + '/' + topic_arr[5];

                event.emit('upload', sur, cinObj);

                response_mqtt(rsp_topic, '2000', '', conf.ae.id, rqi, '');
            }
        });
    }
    else {
        console.log('topic is not supported');
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

}

function ls_on_mqtt_message_recv(topic, message) {

    console.log('receive message from topic: <- ' + topic);
    console.log('receive message: ' + message.toString());
    var message_parse= JSON.parse(message);
    var dev_eui = message_parse['devEUI'];
    message_parse = message_parse['data'];
    if (message_parse != null) {
        console.log("payload_message is " + message_parse);
        var new_message = new Buffer.from(message_parse, 'base64');
        var decode_message = new_message.toString('hex');
        var packet_decode = payload_decode(decode_message);
        var cin_path = conf.ae.parent + '/' +conf.ae.name + '/' + dev_eui + '/' + 'up';
        var cin_obj = {
            'm2m:cin':{
                'con': JSON.stringify(packet_decode)
            }
        }
        var resp = keti_mobius.create_cin(cin_path, cin_obj);
        console.log(resp);

    }
}

function init_resource(){
    read_sensor_id_list();
    var ae_obj = {
      'm2m:ae':{
        'api': conf.ae.id,
        'rr': true,
        'rn': conf.ae.name
      }
    };
    var ae_resp = keti_mobius.create_ae(conf.ae.parent, ae_obj);
    console.log(ae_resp);
    if(ae_resp.code == 201 || ae_resp.code == 409){
        var cnt_parent_path = conf.ae.parent + '/' + conf.ae.name;
        for (var i = 0; i < sensor_ids.length; i++) {
            var cnt_sensor_obj = {
                'm2m:cnt':{
                'rn' : sensor_ids[i].toLowerCase()
                }
            };
            var cnt_resp = keti_mobius.create_cnt(cnt_parent_path, cnt_sensor_obj);
            if (cnt_resp.code == 201 || cnt_resp.code == 409){
                var cnt2_parent_path = cnt_parent_path +'/'+ sensor_ids[i].toLowerCase();
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
                cnt_resp = keti_mobius.create_cnt(cnt2_parent_path, cnt_upobj);
                if(cnt_resp.code == 201 || cnt_resp.code == 409){
                   cnt_resp = keti_mobius.create_cnt(cnt2_parent_path, cnt_downobj);
                    if(cnt_resp.code == 201 || cnt_resp.code == 409 ){
                        console.log(sensor_ids[i] + " CNT_Complete!!");
                    }
                }
            }
        }
        var sub_ae_parent_path = conf.ae.parent + '/' + conf.ae.name;
        var sub_body = {nu:['mqtt://' + conf.cse.host +'/'+ conf.ae.id + '?ct=json']};
        var sub_obj = {
            'm2m:sub':
            {
                'rn' : "sub_container_check",
                'enc': {'net': [4]},
                'nu' : sub_body.nu,
                'nct': 2
            }
        };
        var sub_checker_path = sub_ae_parent_path+'/'+'sub_container_check';
        var resp_sub = keti_mobius.retrieve_sub(sub_checker_path);
        if (resp_sub.code == 200) {
            resp_sub = keti_mobius.delete_res(sub_checker_path);
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
            var sub_downlink = sub_ae_parent_path + '/'+ sensor_ids[i].toLowerCase() +'/'+"down";
            var sub_body = {nu:['mqtt://' + conf.cse.host  +'/'+ conf.ae.id + '?ct=json']};
            var sub_obj = {
                'm2m:sub':
                    {
                        'rn' : "sub_downlink",
                        'enc': {'net': [3]},
                        'nu' : sub_body.nu,
                        'nct': 2
                    }
            };
            var sub_path = sub_downlink +'/'+"sub_downlink";
            var resp_sub = keti_mobius.retrieve_sub(sub_path);

            if (resp_sub.code == 200) {
                resp_sub = keti_mobius.delete_res(sub_path);

                if (resp_sub.code == 200) {
                    resp_sub = keti_mobius.create_sub(sub_downlink, sub_obj);
                    
                }
            } 
            else if (resp_sub.code == 404) {
                keti_mobius.create_sub(sub_downlink, sub_obj);
            }
            else{

            }
            if(resp_sub.code == 201 || resp_sub.code == 409){
               console.log("SUB_Complete!!");
            }
        }
        init_mqtt_client();
        status_Check();
    }
}

function mqtt_noti_action(jsonObj, callback) {
    if (jsonObj != null) {
        var net =  JSON.stringify(jsonpath.query(JSON.parse(jsonObj), '$..net'));
        net=net.replace("\"", "").replace("]", "").replace("[", "").replace("\"", "");
        var path_arr= JSON.stringify(jsonpath.query(JSON.parse(jsonObj),'$..sur'));
        var cinObj= jsonpath.query(JSON.parse(jsonObj),'$..con');
        var sur = path_arr.split('/');

        if(net == '3'){
            var devID = sur[2].toLowerCase();
            if(cinObj[0]=='123'){ls_downlink(devID,cinObj)};
        }
        else if (net == '4'){
            var cnt_parent_path = conf.ae.parent + '/' + conf.ae.name;
            var rn =  JSON.stringify(jsonpath.query(JSON.parse(jsonObj), '$..rn'));
            rn=rn.replace("\"", "").replace("]", "").replace("[", "").replace("\"", "");
            console.log(rn);
            var retry_cnt_sensor_obj = {
                'm2m:cnt':{
                'rn' : rn
                }
            };1
            var cnt_resp = keti_mobius.create_cnt(cnt_parent_path, retry_cnt_sensor_obj);
            if (cnt_resp.code == 201 || cnt_resp.code == 409){
                var cnt2_parent_path = cnt_parent_path +'/'+ rn;
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
                    var sub_parent_path = cnt2_parent_path +'/'+"down";
                    var sub_body = {nu:['mqtt://' + conf.cse.host  +'/'+ conf.ae.id + '?ct=json']};
                    var sub_obj = {
                        'm2m:sub':
                            {
                                'rn' : "sub_lora_sensor",
                                'enc': {'net': [3]},
                                'nu' : sub_body.nu,
                                'nct': 2
                            }
                    };
                    var sub_path = sub_parent_path +'/'+"sub_lora_sensor";
                    var resp_sub = keti_mobius.retrieve_sub(sub_path);

                    if (resp_sub.code == 200) {
                        resp_sub = keti_mobius.create_sub(sub_parent_path, sub_obj);

                    }
                    else if (resp_sub.code == 404) {
                        keti_mobius.create_sub(sub_parent_path, sub_obj);
                    }
                }
            }
        }
    }
    else {
        console.log('[mqtt_noti_action] message is not noti');
    }
}

setTimeout(init_resource,100)

function status_Check(){
    app.get('/status', (req, res) => {
        const healthcheck = {
            uptime: process.uptime(),
            status: "UP",
            timestamp: Date.now()
        };
        res.send(healthcheck);
    });
    // app.get('/errlog', (req, res) => {
    //     if(fs.existsSync(err_log)){
    //         var log = fs.readFileSync(err_log);
    //         res.send(log);
    //         //   fs.unlinkSync(err_log);
    //     }
    //     else{
    //         res.send({status:""});
    //     }
    // });
    app.listen(conf.health.port, () => {
        console.log('Health Checker Start');
    });
}