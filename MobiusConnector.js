/**
 * Created by demo on 2017/2/6.
 */
var request = require('sync-request');
var uuid = require('uuid/v1');
var http = require('http');

exports.mobius = function () {

    var server_ip = '';
    var server_port = 7579;
    var ae_id = '';

    this.set_mobius_info = function (ip, port, aeid) {
        server_ip = ip;
        server_port = parseInt(port, 10);

        if (aeid == undefined) {
            ae_id = 'S';
        } else if (aeid.length == 0) {
            ae_id = 'S';
        } else {
            ae_id = aeid;
        }
    };

    this.retrieve_cse_async = function (path, callback) {
        var options = {
            hostname: server_ip,
            port: server_port,
            path: path,
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'X-M2M-RI': uuid(),
                'X-M2M-Origin': 'S'
            }
        };

        var req = http.request(options, function (resp) {
            console.log('retrieve cse: GET -> ' + path);
            var serverData = '';
            resp.on('data', function (chunk) {
                serverData += chunk;
            });
            resp.on('end', function () {
                var data = {'code': resp.statusCode, 'body': serverData};
                callback(data);
                console.log('retrieve cse: ' + resp.statusCode + ' <- ' + serverData);
            });
        });

        req.end();
    };

    this.retrieve_cse = function (path) {

        var data = null;

        try {
            var url = 'http://' + server_ip + ':' + server_port + path;

            console.log('retrieve cse: GET -> ' + url);

            var resp = request('GET', url, {
                'headers': {
                    'Accept': 'application/json',
                    'X-M2M-RI': uuid(),
                    'X-M2M-Origin': 'S'
                }
            });

            var status_code = resp.statusCode;
            var str = '';
            try {
                str = String(resp.getBody());
            } catch (err) {
                str = String(err.body);
                //console.error(err);
            }
            var data = {'code': status_code, 'body': str};

            console.log('retrieve cse: ' + status_code + ' <- ' + str);
        } catch (exp) {
            console.error(exp);
        }

        return data;
    };

    this.retrieve_ae_async = function (path, callback) {

        console.log('retrieve ae: GET -> ' + path);

        var options = {
            hostname: server_ip,
            port: server_port,
            path: path,
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'X-M2M-RI': uuid(),
                'X-M2M-Origin': ae_id
            }
        };

        var req = http.request(options, function (resp) {
            var serverData = '';
            resp.on('data', function (chunk) {
                serverData += chunk;
            });
            resp.on('end', function () {
                var data = {'code': resp.statusCode, 'body': serverData};
                callback(data);
                console.log('retrieve ae: ' + resp.statusCode + ' <- ' + serverData);
            });
        });

        req.end();
    };

    this.retrieve_ae = function (path) {

        var url = 'http://' + server_ip + ':' + server_port + path;

        console.log('retrieve ae: GET -> ' + url);

        var resp = request('GET', url, {
            'headers': {
                'Accept': 'application/json',
                'X-M2M-RI': uuid(),
                'X-M2M-Origin': ae_id
            }
        });

        var status_code = resp.statusCode;
        var str = '';
        try {
            str = String(resp.getBody());
        } catch (err) {
            str = String(err.body);
            //console.error(err);
        }
        var data = {'code': status_code, 'body': str};

        console.log('retrieve ae: ' + status_code + ' <- ' + str);

        return data;
    };

    this.create_ae = function (path, ae) {

        var url = 'http://' + server_ip + ':' + server_port + path;

        console.log('create ae: POST -> ' + url);

        var resp = request('POST', url, {
            'headers': {
                'Accept': 'application/json',
                'X-M2M-RI': uuid(),
                'X-M2M-Origin': ae_id,
                'Content-Type': 'application/json;ty=2;'
            },
            'body': JSON.stringify(ae)
        });

        var status_code = resp.statusCode;
        var str = '';
        try {
            str = String(resp.getBody());
        } catch (err) {
            str = String(err.body);
            //console.error(err);
        }
        var data = {'code': status_code, 'body': str};

        console.log('create ae: ' + status_code + ' <- ' + str);

        return data;
    };

    this.create_ae_async = function (path, ae, callback) {
        console.log('retrieve ae: POST -> ' + path);

        var req_body = JSON.stringify(ae);

        var options = {
            hostname: server_ip,
            port: server_port,
            path: path,
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'X-M2M-RI': uuid(),
                'X-M2M-Origin': ae_id,
                'Content-Type': 'application/json;ty=2;',
                'Content-Length': Buffer.byteLength(req_body)
            }
        };

        var req = http.request(options, function (resp) {
            var serverData = '';
            resp.on('data', function (chunk) {
                serverData += chunk;
            });
            resp.on('end', function () {
                var data = {'code': resp.statusCode, 'body': serverData};
                callback(data);
                console.log('create ae: ' + resp.statusCode + ' <- ' + serverData);
            });
        });

        req.write(JSON.stringify(ae));
        req.end();
    };

    this.retrieve_cnt = function (path) {

        var url = 'http://' + server_ip + ':' + server_port + path;

        console.log('retrieve cnt: GET -> ' + url);

        var resp = request('GET', url, {
            'headers': {
                'Accept': 'application/json',
                'X-M2M-RI': uuid(),
                'X-M2M-Origin': ae_id
            }
        });

        var status_code = resp.statusCode;
        var str = '';
        try {
            str = String(resp.getBody());
        } catch (err) {
            str = String(err.body);
            //console.error(err);
        }
        var data = {'code': status_code, 'body': str};

        console.log('retrieve cnt: ' + status_code + ' <- ' + str);

        return data;
    };

    this.retrieve_cnt_async = function (path, callback) {
        console.log('retrieve cnt: GET -> ' + path);

        var options = {
            hostname: server_ip,
            port: server_port,
            path: path,
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'X-M2M-RI': uuid(),
                'X-M2M-Origin': ae_id
            }
        };

        var req = http.request(options, function (resp) {
            var serverData = '';
            resp.on('data', function (chunk) {
                serverData += chunk;
            });
            resp.on('end', function () {
                var data = {'code': resp.statusCode, 'body': serverData};
                callback(data);
                console.log('retrieve ae: ' + resp.statusCode + ' <- ' + serverData);
            });
        });

        req.end();
    };

    this.create_cnt = function (path, cnt) {

        var url = 'http://' + server_ip + ':' + server_port + path;

        console.log('create cnt: POST -> ' + url);

        var resp = request('POST', url, {
            'headers': {
                'Accept': 'application/json',
                'X-M2M-RI': uuid(),
                'X-M2M-Origin': ae_id,
                'Content-Type': 'application/json;ty=3;'
            },
            'body': JSON.stringify(cnt)
        });

        var status_code = resp.statusCode;
        var str = '';
        try {
            str = String(resp.getBody());
        } catch (err) {
            str = String(err.body);
            //console.error(err);
        }
        var data = {'code': status_code, 'body': str};

        console.log('create cnt: ' + status_code + ' <- ' + str);

        return data;
    };

    this.create_cnt_async = function (path, cnt, callback) {
        console.log('create cnt: POST -> ' + path);

        var req_body = JSON.stringify(cnt);

        var options = {
            hostname: server_ip,
            port: server_port,
            path: path,
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'X-M2M-RI': uuid(),
                'X-M2M-Origin': ae_id,
                'Content-Type': 'application/json;ty=3;',
                'Content-Length': Buffer.byteLength(req_body)
            }
        };

        var req = http.request(options, function (resp) {
            var serverData = '';
            resp.on('data', function (chunk) {
                serverData += chunk;
            });
            resp.on('end', function () {
                var data = {'code': resp.statusCode, 'body': serverData};
                callback(data);
                console.log('create cnt: ' + resp.statusCode + ' <- ' + serverData);
            });
        });

        req.write(JSON.stringify(cnt));
        req.end();
    };

    this.retrieve_sub = function (path) {

        var url = 'http://' + server_ip + ':' + server_port + path;

        console.log('retrieve sub: GET -> ' + url);

        var resp = request('GET', url, {
            'headers': {
                'Accept': 'application/json',
                'X-M2M-RI': uuid(),
                'X-M2M-Origin': ae_id
            }
        });

        var status_code = resp.statusCode;
        var str = '';
        try {
            str = String(resp.getBody());
        } catch (err) {
            str = String(err.body);
            //console.error(err);
        }
        var data = {'code': status_code, 'body': str};

        console.log('retrieve sub: ' + status_code + ' <- ' + str);

        return data;
    };

    this.retrieve_sub_async = function (path, callback) {
        console.log('retrieve sub: GET -> ' + path);

        var options = {
            hostname: server_ip,
            port: server_port,
            path: path,
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'X-M2M-RI': uuid(),
                'X-M2M-Origin': ae_id
            }
        };

        var req = http.request(options, function (resp) {
            var serverData = '';
            resp.on('data', function (chunk) {
                serverData += chunk;
            });
            resp.on('end', function () {
                var data = {'code': resp.statusCode, 'body': serverData};
                callback(data);
                console.log('retrieve sub: ' + resp.statusCode + ' <- ' + serverData);
            });
        });

        req.end();
    };

    this.create_sub = function (path, sub) {

        var url = 'http://' + server_ip + ':' + server_port + path;

        console.log('create sub: POST -> ' + url);

        var resp = request('POST', url, {
            'headers': {
                'Accept': 'application/json',
                'X-M2M-RI': uuid(),
                'X-M2M-Origin': ae_id,
                'Content-Type': 'application/json;ty=23;'
            },
            'body': JSON.stringify(sub)
        });

        var status_code = resp.statusCode;
        var str = '';
        try {
            str = String(resp.getBody());
        } catch (err) {
            str = String(err.body);
            //console.error(err);
        }
        var data = {'code': status_code, 'body': str};

        console.log('create sub: ' + status_code + ' <- ' + str);

        return data;
    };

    this.create_sub_async = function (path, sub, callback) {
        console.log('create sub: POST -> ' + path);

        var req_body = JSON.stringify(sub);

        var options = {
            hostname: server_ip,
            port: server_port,
            path: path,
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'X-M2M-RI': uuid(),
                'X-M2M-Origin': ae_id,
                'Content-Type': 'application/json;ty=23;',
                'Content-Length': Buffer.byteLength(req_body)
            }
        };

        var req = http.request(options, function (resp) {
            var serverData = '';
            resp.on('data', function (chunk) {
                serverData += chunk;
            });
            resp.on('end', function () {
                var data = {'code': resp.statusCode, 'body': serverData};
                callback(data);
                console.log('create sub: ' + resp.statusCode + ' <- ' + serverData);
            });
        });

        req.write(JSON.stringify(sub));
        req.end();
    };


    this.create_cin = function (path, cin) {

        var url = 'http://' + server_ip + ':' + server_port + path;

        console.log('create cin: POST -> ' + url);

        var resp = request('POST', url, {
            'headers': {
                'Accept': 'application/json',
                'X-M2M-RI': uuid(),
                'X-M2M-Origin': ae_id,
                'Content-Type': 'application/json;ty=4;'
            },
            'body': JSON.stringify(cin)
        });

        var status_code = resp.statusCode;
        var str = '';
        try {
            str = String(resp.getBody());
        } catch (err) {
            str = String(err.body);
            //console.error(err);
        }
        var data = {'code': status_code, 'body': str};

        console.log('create cin: ' + status_code + ' <- ' + str);

        return data;
    };

    this.create_cin_async = function (path, cin, callback) {
        console.log('create cin: POST -> ' + path);

        var req_body = JSON.stringify(cin);

        var options = {
            hostname: server_ip,
            port: server_port,
            path: path,
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'X-M2M-RI': uuid(),
                'X-M2M-Origin': ae_id,
                'Content-Type': 'application/json;ty=4;',
                'Content-Length': Buffer.byteLength(req_body)
            }
        };

        var req = http.request(options, function (resp) {
            var serverData = '';
            resp.on('data', function (chunk) {
                serverData += chunk;
            });
            resp.on('end', function () {
                var data = {'code': resp.statusCode, 'body': serverData};
                callback(data);
                console.log('create cin: ' + resp.statusCode + ' <- ' + serverData);
            });
        });

        req.write(JSON.stringify(cin));
        req.end();
    };

    this.create_cin_no_body = function (path, cin) {

        var url = 'http://' + server_ip + ':' + server_port + path + '?rcn=0';

        console.log('create sub: POST -> ' + url);

        var resp = request('POST', url, {
            'headers': {
                'Accept': 'application/json',
                'X-M2M-RI': uuid(),
                'X-M2M-Origin': ae_id,
                'Content-Type': 'application/json;ty=4;'
            },
            'body': JSON.stringify(cin)
        });

        var status_code = resp.statusCode;
        var str = '';
        try {
            str = String(resp.getBody());
        } catch (err) {
            str = String(err.body);
            //console.error(err);
        }
        var data = {'code': status_code, 'body': str};

        console.log('create sub: ' + status_code + ' <- ' + str);

        return data;
    };

    this.create_cin_no_body_async = function (path, cin, callback) {
        console.log('create cin: POST -> ' + path);

        var req_body = JSON.stringify(cin);

        var options = {
            hostname: server_ip,
            port: server_port,
            path: path + '?rcn=0',
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'X-M2M-RI': uuid(),
                'X-M2M-Origin': ae_id,
                'Content-Type': 'application/json;ty=4;',
                'Content-Length': Buffer.byteLength(req_body)
            }
        };

        var req = http.request(options, function (resp) {
            var serverData = '';
            resp.on('data', function (chunk) {
                serverData += chunk;
            });
            resp.on('end', function () {
                var data = {'code': resp.statusCode, 'body': serverData};
                callback(data);
                console.log('create cin: ' + resp.statusCode + ' <- ' + serverData);
            });
        });

        req.write(JSON.stringify(cin));
        req.end();
    };

    this.retrieve_latest_cin = function (path) {
        var url = 'http://' + server_ip + ':' + server_port + path + '/latest';

        console.log('retrieve cin: GET -> ' + url);

        var resp = request('GET', url, {
            'headers': {
                'Accept': 'application/json',
                'X-M2M-RI': uuid(),
                'X-M2M-Origin': ae_id
            }
        });

        var status_code = resp.statusCode;
        var str = '';
        try {
            str = String(resp.getBody());
        } catch (err) {
            str = String(err.body);
            //console.error(err);
        }
        var data = {'code': status_code, 'body': str};

        console.log('retrieve sub: ' + status_code + ' <- ' + str);

        return data;
    };

    this.retrieve_latest_cin_async = function (path, callback) {
        console.log('retrieve cin: GET -> ' + path + '/latest');

        var options = {
            hostname: server_ip,
            port: server_port,
            path: path + '/latest',
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'X-M2M-RI': uuid(),
                'X-M2M-Origin': ae_id
            }
        };

        var req = http.request(options, function (resp) {
            var serverData = '';
            resp.on('data', function (chunk) {
                serverData += chunk;
            });
            resp.on('end', function () {
                var data = {'code': resp.statusCode, 'body': serverData};
                callback(data);
                console.log('retrieve cin: ' + resp.statusCode + ' <- ' + serverData);
            });
        });

        req.end();
    };

    this.delete_res = function (path) {

        var url = 'http://' + server_ip + ':' + server_port + path;

        console.log('delete resc: DELETE -> ' + url);

        var resp = request('DELETE', url, {
            'headers': {
                'Accept': 'application/json',
                'X-M2M-RI': uuid(),
                'X-M2M-Origin': ae_id
            }
        });

        var status_code = resp.statusCode;
        var str = '';
        try {
            str = String(resp.getBody());
        } catch (err) {
            str = String(err.body);
            //console.error(err);
        }
        var data = {'code': status_code, 'body': str};

        console.log('delete resc: ' + status_code + ' <- ' + str);

        return data;
    };

    this.delete_res_async = function (path, callback) {
        console.log('delete resource: delete -> ' + path);

        var options = {
            hostname: server_ip,
            port: server_port,
            path: path,
            timeout: 5000,
            method: 'DELETE',
            headers: {
                'Accept': 'application/json',
                'X-M2M-RI': uuid(),
                'X-M2M-Origin': ae_id
            }
        };

        var req = http.request(options, function (resp) {
            var serverData = '';
            resp.on('data', function (chunk) {
                serverData += chunk;
            });
            resp.on('end', function () {
                var data = {'code': resp.statusCode, 'body': serverData};
                callback(data);
                console.log('delete resource: ' + resp.statusCode + ' <- ' + serverData);
            });
        });

        req.end();
    };
};