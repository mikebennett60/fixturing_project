var mqttserver 	= require('mqtt');
var opt = require('node-getopt').create([
  ['l' , ''             , 'Locate fixture'],
  ['m' , ''             , 'Mute fixture.'],
  ['f' , 'fixture=ARG'  , 'option with argument'],
  ['h' , 'help'         , 'display this help'],
])              // create Getopt instance
.bindHelp()     // bind option 'help' to default action
.parseSystem(); // parse command line

fixtureName = opt['options']['fixture'];
locateFixtureAction = opt['options']['l'];
muteFixtureAction = opt['options']['m'];
	
var optSet = 0;
	
	
if (typeof(fixtureName) != "undefined") {
	mytopic="selectTag";
	mymessage=fixtureName;
	optSet++;
}
if (locateFixtureAction) {
	mytopic="controlTag";
	mymessage='locate';
	optSet++;
}
if (muteFixtureAction) {
	mytopic="controlTag";
	mymessage='mute';
	optSet++;
}
	
var mqtt = mqttserver.connect(process.env.BROKERURL || 'mqtt://localhost:1883')	

console.log('Content-Type:text/plain');	
	
// If we are acting as a client, just publish the control messages and exit	
if (optSet > 0) 
	var mqtt = mqttserver.connect(process.env.BROKERURL || 'mqtt://localhost:1883')

	
mqtt.on('connect', function (connack) {
	console.log('connected');
	if (optSet > 0) {
		mqtt.publish(mytopic, mymessage);
		console.log(mytopic+":"+mymessage);
	}
	mqtt.end();
})
	
mqtt.on('close', function () {
	console.log('disconnected');
	process.exit(0);
})
