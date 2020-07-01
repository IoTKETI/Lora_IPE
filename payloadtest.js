var message_parse='AQID'

var new_message = new Buffer.from(message_parse, 'base64');
var decode_message = new_message.toString('hex');
// var packet_decode = payload_decode(decode_message);
console.log(decode_message)

var new_message = new Buffer.from(decode_message, 'hex');
var decode_message = new_message.toString('base64');
console.log(decode_message)
// console.log(new_message2)
