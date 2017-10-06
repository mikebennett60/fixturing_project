/*
 * sensortag2mqtt by Jan-Piet Mens (C) November 2015
 * read SensorTag CC2650 and publish over MQTT
 * Credits to Tom Igoe for example at https://github.com/tigoe/BluetoothLE-Examples
 *
 * Fedora23:	# dnf install npm nodejs
 * 		# npm install sensortag		// https://github.com/sandeepmistry/node-sensortag
 *		# npm install mqtt		// https://github.com/mqttjs/MQTT.js
 *
 * Launch this program with
 *	$ node sensortag2mqtt.js
 * and click the left button on the SensorTag (the small, round one)
 * Every notification change from the SensorTag will result in an
 * MQTT message being published.
 *
 */
var lodash = require('lodash');
var SensorTag	= require('sensortag');
var mqttserver 	= require('mqtt');
var os = require('os');
var mytopic;
var tag;
var mymessage;
var topic	= 'jpmens/cc2650';
var opt = require('node-getopt').create([
  ['l' , ''             , 'Locate fixture'],
  ['m' , ''             , 'Mute fixture.'],
  ['f' , 'fixture=ARG'  , 'option with argument'],
  ['h' , 'help'         , 'display this help'],
])              // create Getopt instance
.bindHelp()     // bind option 'help' to default action
.parseSystem(); // parse command line


var data = {
	ambtemp:	0,
	lux:		0,
	millibars:	0,
	humidity:	0,
	gyroX:		0,
	gyroY:		0,
	gyroZ:		0,
	reed:		false,
	left:		false,
	right:		false,
};


var fixture_list = {
	"header": [
		"Name",
		"ID",
		"Present",
		"Connected",
		"Location"
	//	"Longitude",
	//	"Latitude"
		],
	 "data": [
	 	{
	 	"Name" : "Turbine Fixture 1",
	 	"ID" : "24:71:89:CC:4B:05",
	 	"Present" : "False",
	 	"Connected" : "False",
	 	"Location" : "N/A",
	 	"Longitude" : "N/A",
	 	"Latitude" : "N/A"
	 	},
	    {
	 	"Name" : "Turbine Fixture 2",
	 	"ID" : "24:71:89:CF:F4:07",
	 	"Present" : "False",
	 	"Connected" : "False",
	 	"Location" : "N/A",
	 	"Longitude" : "N/A",
	 	"Latitude" : "N/A"
	 	},
	    {
	 	"Name" : "Turbine Fixture 3",
	 	"ID" : "54:6C:0E:4D:76:86",
	 	"Present" : "False",
	 	"Connected" : "False",
	 	"Location" : "N/A",
	 	"Longitude" : "N/A",
	 	"Latitude" : "N/A"
	 	},
	    {
	 	"Name" : "Turbine Fixture 4",
	 	"ID" : "B0:91:22:F7:43:85",
	 	"Present" : "False",
	 	"Connected" : "False",
	 	"Location" : "N/A",
	 	"Longitude" : "N/A",
	 	"Latitude" : "N/A"
	 	},
	    {
	 	"Name" : "Turbine Fixture 5",
	 	"ID" : "54:6C:0E:53:16:83",
	 	"Present" : "False",
	 	"Connected" : "False",
	 	"Location" : "N/A",
	 	"Longitude" : "N/A",
	 	"Latitude" : "N/A"
	 	},
	    {
	 	"Name" : "Turbine Fixture 6",
	 	"ID" : "54:6C:0E:53:1C:6A",
	 	"Present" : "False",
	 	"Connected" : "False",
	 	"Location" : "N/A",
	 	"Longitude" : "N/A",
	 	"Latitude" : "N/A"
	 	},
	    {
	 	"Name" : "Turbine Fixture 7",
	 	"ID" : "B0:91:22:F6:68:82",
	 	"Present" : "False",
	 	"Connected" : "False",
	 	"Location" : "N/A",
	 	"Longitude" : "N/A",
	 	"Latitude" : "N/A"
	     },
	]
};


var connected = 0;
var connectedTag = '';

function fix(num, dec) {
	var s = num.toFixed(dec);

	return parseFloat(s);
}

var myTags = {};


function restartScanning() {
	publishFixtures();
	SensorTag.stopDiscoverAll(onDiscover);
	
	// Clear the fixture list
	for (var k in fixture_list['data']){
		if (fixture_list['data'].hasOwnProperty(k)) {
			
			// Except for anything that is connected
			if (fixture_list['data'][k]['Connected'] != 'True') {
				fixture_list['data'][k]['Present'] = 'False';
				fixture_list['data'][k]['Location'] = 'N/A';
			} else {
				fixture_list['data'][k]['Present'] = 'True';
				fixture_list['data'][k]['Location'] = os.hostname();
			}
		}
	}
	// Start discovering
	SensorTag.discoverAll(onDiscover);
}
// Record that we have discovered this tag
var onDiscover = function(sensorTag) {
	console.log("discovered:"+sensorTag.id);
	myTags[sensorTag.id] = sensorTag;

	for (var k in fixture_list['data']){
		if (fixture_list['data'].hasOwnProperty(k)) {
			if (fixture_list['data'][k]['ID'].replace(/:/g,'').toLowerCase() ==  sensorTag.id || fixture_list['data'][k]['Connected'] == 'True') {
				fixture_list['data'][k]['Present'] = 'True';
				fixture_list['data'][k]['Location'] = os.hostname();
			} 
		}
	}
}

// 1. Start scanning
// 2. If we find a SensorTag that matches the recorded list of ids then update 
//    the fixture log to state that fixture is present
// 3. Every x seconds restart the scanning process so we can refresh the list
// 4. If there is an MQTT message to connect to the sensor, do so only if it 
//    is present in the list. 

SensorTag.discoverAll(onDiscover);
var myInterval = setInterval (restartScanning,4000);






function publishData() {
	var payload = JSON.stringify(data);
	
	//if (typeof(tag) != undefined && connected == 1) {
	
	////console.log(SensorTag);
	
	//var mqttextras = {'header' : [
		              //'TagID',
		              //'TagType',
					  //'Battery',
					  //'Signal Strength'],
					  //'data' : 
					  //[
					    //{ 'TagID' : tag.id,
						  //'TagType' : tag.type,
						  //'Battery' : "N/A",
						  //'Signal Strength' : tag.rssi}
						//]};
						  
	
	//} else {
		//mqttextras = {'header' : [
		                //'TagID',
		                //'TagType',
					   //'Battery',
					   //'Signal Strength'],
					   //'data' : [
					  //{  'TagID' : "Not Connected",
						  //'TagType' : "N/A",
						  //'Battery' : "N/A",
						//'Signal Strength' : "0" }
						//]};
	
	//}
	//console.log(mqttextras);
	//mqtt.publish('mqttextras',JSON.stringify(mqttextras))
	mqtt.publish(topic, payload);
}

function mod(key, val) {
	if (data[key] != val) {
		//console.log(key + " changed to " + val);
		data[key] = val;
		publishData();
	}
}

function connectAndSetUpMe() {
	console.log('connectAndSetUp');
	data._id = tag.id;		// xxxxxxxxxxxx
	data._tagtype = tag.type;	// cc2650
	tag.connectAndSetUp(enableSensors);

}

function enableSensors() {
		console.log('enableSensors');
		// when sensors are enabled, start notifications
		tag.enableBarometricPressure(n_baro);
		tag.enableGyroscope(n_gyro);
		tag.enableHumidity(n_humid);
		tag.enableLuxometer(n_lux);
		tag.enableIrTemperature(n_irtemp);
		tag.enableAccelerometer(n_accel);
		//tag.enableMagnetometer(n_magnet);
		
		tag.onBatteryLevelChange

		tag.notifySimpleKey(function() {
			tag.on('simpleKeyChange', function(left, right, reed) {
				mod('reed', reed);
				mod('left', left);
				mod('right', right);
				if (left && right) {
					// tag.disconnect();
				}
			});
		});

		tag.readFirmwareRevision(function(err, firmwarerev) {
			if (err) {
				console.log(err);
			} else {
				mqtt.publish(topic + "/firmwarerev", firmwarerev);
			}
		});
}

function n_baro() {
	tag.notifyBarometricPressure(function() {
		tag.on('barometricPressureChange', function(pressure) {
			mod('millibars', fix(pressure, 0));
		});
	});
}

function n_gyro() {
	tag.notifyGyroscope(function() {
		tag.on('gyroscopeChange', function(x,y,z) {
			mod('gyroX', fix(x, 3));
			mod('gyroY', fix(y, 3));
			mod('gyroZ', fix(z, 3));
		});
	});
}

function n_humid() {
	tag.notifyHumidity(function() {
		tag.on('humidityChange', function(ambtemp, humidity) {
			mod('ambtemp', fix(ambtemp, 2));
			mod('humidity', fix(humidity, 2));
		});
	});
}

function n_lux() {
	tag.notifyLuxometer(function() {
		tag.on('luxometerChange', function(lux) {
			mod('lux', lux);
		});
	});
}

function n_irtemp() {
	tag.notifyIrTemperature(function() {
		tag.on('irTemperatureChange', function(objtemp, ambtemp) {
			mod('objtemp', fix(objtemp, 2));
		});
	});
}

function n_accel() {
	tag.notifyAccelerometer(function() {
		tag.on('accelerometerChange', function(x, y, z, k) {
			mod('accX', fix(x, 2));
			mod('accY', fix(y, 2));
			mod('accZ', fix(z, 2));
			mod('knock', k);
		});
	});
}

function n_magnet() {
	tag.notifyMagnetometer(function() {
		tag.on('magnetometerChange', function(x, y, z) {
			mod('magX', fix(x, 2));
			mod('magY', fix(y, 2));
			mod('magZ', fix(z, 2));
			mod('magAll', [x, y, z]);
		});
	});
}

function publishFixtures() {
	mqtt.publish("fixture_list", payload=JSON.stringify(fixture_list),qos=0)
	//console.log(JSON.stringify(fixture_list));
}

	
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
	
	mqtt = mqttserver.connect(process.env.BROKERURL || 'mqtt://localhost:1883')
	
	// If we are acting as a client, just publish the control messages and exit	
	if (optSet > 0) {
		mqtt.publish(mytopic, mymessage);
		mqtt.end();
	} else {
	
		// Now that we've defined all the functions, wait for control commands
		mqtt.subscribe('selectTag');
		mqtt.subscribe('controlTag');
	
	}	
	
	mqtt.on('connect', function (connack) {
		console.log('connected');
	})
	
	mqtt.on('close', function () {
		console.log('disconnected');
		process.exit(0);
	})
	
	
	
	mqtt.on('message', function (topic, message) {
		// message is Buffer
		console.log(topic.toString()+":"+message.toString());
		
		if (topic=='selectTag') {
				connectedTag=message.toString().replace(/:/g,'').toLowerCase();
				
	
				// Disconnect from any existing tag
				if (typeof(tag) != 'undefined') {
				
					if (tag._peripheral.state == 'connected') {
						console.log("Disconnect command");
						tag.disconnect();
					}
				}
				// Connect to new tag (may be the same one!)
				
				tag = myTags[connectedTag];		
				
				if (typeof(tag) != 'undefined') {
					
					tag._peripheral.once('disconnect', function() {
						connected = 0;
						console.log('disconnected!');
						for (var k in fixture_list['data']){
							if (fixture_list['data'].hasOwnProperty(k)) {
								if (fixture_list['data'][k]['ID'].replace(/:/g,'').toLowerCase() ==  tag.id) {
									fixture_list['data'][k]['Connected'] = 'False';
								} 
							}
						}
						
						
					});
					
					tag._peripheral.once('connect', function() {
						connected = 1;
						
						for (var k in fixture_list['data']){
							if (fixture_list['data'].hasOwnProperty(k)) {
								if (fixture_list['data'][k]['ID'].replace(/:/g,'').toLowerCase() ==  tag.id) {
									fixture_list['data'][k]['Connected'] = 'True';
									data._name = fixture_list['data'][k]['Name']; 
								} else {
									fixture_list['data'][k]['Connected'] = 'False';
								}
							}
						}
						
						console.log('connected!');
					});
					// If you scan at the same time, seems to cause trouble
					SensorTag.stopDiscoverAll(onDiscover);
					// Connect new sensortag
					data._id = tag.id;
					data._type = tag.type;
					
					//console.log(tag);
					
					tag.connectAndSetUp(enableSensors);		
				}
			
			
		} else if (topic=='controlTag') {
			if (connected == 1) {
				if (message=='locate') {
					tag.writeIoData(0x0);
					tag.writeIoConfig(0x1);
					tag.writeIoData(0x10);
				} else if (message=='mute') {
					tag.writeIoConfig(0x1);
					tag.writeIoData(0x20);
					tag.writeIoConfig(0x0);			
				} else if (message=='disconnect') {
					if (typeof(tag) != 'undefined') {
					   if (tag._peripheral.state == 'connected') {
						  console.log("Disconnect command");
						  tag.disconnect();
					}
				}		
				}
			}
		} 
	})

	
//});
