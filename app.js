var events = require('events');
var mqtt = require('mqtt');
var util = require('util');
var fs = require('fs');
var jsonpath = require('jsonpath');
var sensor_ids = [];
var mobius = require('./MobiusConnector').mobius;

const SENSOR_LIST_FILE = 'sensor_list.txt';
global.conf = require('./conf.js');
var event = new events.EventEmitter();
var keti_mobius = new mobius();
keti_mobius.set_mobius_info(conf.cse.host, conf.cse.port);

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
    sensor_ids = str.split(',');
    for (i = 0; i < sensor_ids.length; i++){
       sensor_ids[i] = JSON.parse(sensor_ids[i]);
       sensor_ids[i] = sensor_ids[i]["id"];
    }
    console.log(sensor_ids);
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
        var ls_rxtopic = util.format('application/6/device/%s/rx', sensor_ids[i].toLowerCase());
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
        var cin_path = conf.ae.parent + '/' +conf.ae.name + '/' + dev_eui + '/' + 'up';
        var cin_obj = {
            'm2m:cin':{
                'con': decode_message
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
            ls_downlink(devID,cinObj);//sensingserver or
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