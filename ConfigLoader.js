
var fs = require('fs');

const TAS_CONF_FILE = __dirname + '/conf.json';

exports.get_resource_config = function () {

    console.log('load resource config file!');

    var data = fs.readFileSync(TAS_CONF_FILE);
    var str = String(data);
    var obj = JSON.parse(str);

    return obj;
};

exports.set_resource_config = function (config_obj) {

    console.log('save resource config file!');

    fs.writeFileSync(TAS_CONF_FILE, JSON.stringify(config_obj, null, 4));
};

