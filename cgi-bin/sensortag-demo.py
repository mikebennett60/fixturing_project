#!/usr/bin/python
#import demandimport; demandimport.enable()
import os
import re
import time
from bluetooth.ble import DiscoveryService
import bluepy.sensortag as sensortag
#import pygatt
from optparse import OptionParser
import paho.mqtt.client as mqtt
import json



# The location is the name of the pi
location = "N/A"

send_url = 'http://freegeoip.net/json'
lat = ''
lon = ''
location = ''

myTag = ''

## Create an instance of the sensortag
##class SensorTag:
#
#	# This creates an adapter
##	def __init__(self):
##		self.adapter = pygatt.GATTToolBackend()
##		self.adapter.start()
##		self.connected = False
#		
#	# Connect to the device, if not already connected
##	def connect(self,name,address):
##		if (not self.connected):
##			self.name = name
##			self.address = address
##			self.device = self.adapter.connect(self.address)
#			# Create an instance of the IOservice
##			self.connected = True
##			self._ioservice = IOService()
#	
#	# Disconnect from the device
##	def	disconnect(self):
##		if (self.connected):
##			self.adapter.disconnect(self.address)
##		self.connected = False
			    


#class IOService:
#	dataHandle = 0x51
#	controlHandle = 0x53
#	
#	redLEDControl = 1
#	greenLEDControl = 2
#	buzzerControl = 4
#	SOSModeOn = 16
#	SOSModeOff = 32
#	
#	localMode = 0
#	remoteMode = 1
#	
#	def __init__(self):
#		self.state = 0
#	
#	# Put into manual control mode, turning off all outputs
#	def	manual(self, dev):
#		# Reset the data first or it goes mental
#		dev.char_write_handle(IOService.dataHandle,bytearray([0x0]))
#		# Put it in manual mode
#		dev.char_write_handle(IOService.controlHandle,bytearray([0x1]))
#		self.state = 0
#		
#	# Put back into auto control mode
#	def	auto(self, dev):
#		dev.char_write_handle(IOService.controlHandle,bytearray([IOService.localMode]))
#
#	def	switchOn(self,flags, dev):
#		self.state = (flags & 0x7) | self.state;
#		dev.char_write_handle(IOService.dataHandle,bytearray([self.state]))
#
#	def	switchOff(self,flags, dev):
#		self.state = (~flags & 0x7) & self.state;
#		dev.char_write_handle(IOService.dataHandle,bytearray([self.state]))
#		
#	def	getState(self):
#		return self.state
		

fixture_list = {
	"header": [
		"Name",
		"ID",
		"Present",
		"Connected",
		"Location",
		"Longitude",
		"Latitude"
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
	 	"ID" : "B0:91:22:F6:68:82",
	 	"Present" : "False",
	 	"Connected" : "False",
	 	"Location" : "N/A",
	 	"Longitude" : "N/A",
	 	"Latitude" : "N/A"
	 	},
	    {
	 	"Name" : "Turbine Fixture 3",
	 	"ID" : "24:71:89:CC:4D:02",
	 	"Present" : "False",
	 	"Connected" : "False",
	 	"Location" : "N/A",
	 	"Longitude" : "N/A",
	 	"Latitude" : "N/A"
	 	},
	    {
	 	"Name" : "Turbine Fixture 4",
	 	"ID" : "B0:91:22:F7:30:81",
	 	"Present" : "False",
	 	"Connected" : "False",
	 	"Location" : "N/A",
	 	"Longitude" : "N/A",
	 	"Latitude" : "N/A"
	 	},
	    {
	 	"Name" : "Turbine Fixture 5",
	 	"ID" : "N/A",
	 	"Present" : "False",
	 	"Connected" : "False",
	 	"Location" : "N/A",
	 	"Longitude" : "N/A",
	 	"Latitude" : "N/A"
	 	},
	    {
	 	"Name" : "Turbine Fixture 6",
	 	"ID" : "N/A",
	 	"Present" : "False",
	 	"Connected" : "False",
	 	"Location" : "N/A",
	 	"Longitude" : "N/A",
	 	"Latitude" : "N/A"
	 	},
	    {
	 	"Name" : "Turbine Fixture 7",
	 	"ID" : "N/A",
	 	"Present" : "False",
	 	"Connected" : "False",
	 	"Location" : "N/A",
	 	"Longitude" : "N/A",
	 	"Latitude" : "N/A"
	     },
	]
}


def scan(devices):	

	# Clear down the list
	for i, entry in enumerate(fixture_list["data"]):
		entry["Present"] = "False"
		entry["Location"] = "Unknown"
		entry["Longitude"] = "Unknown"
		entry["Latitude"] = "Unknown"

	for address, name in devices.items():
		matchObj = re.search( r'CC2650', name, re.M|re.I)
		if matchObj:
			# If the address is in the list, mark as present and update the list
			for i, entry in enumerate(fixture_list["data"]):
				if entry["ID"] == address:
					entry["Present"] = "True"
					entry["Location"] = location
					entry["Longitude"] = str(lon)
					entry["Latitude"] = str(lat)
		            
			

def main():	

	
	parser = OptionParser()
	
	parser.add_option('-s', '--server', action="store_true", dest="server", help="Search for sensortags and start communicating with selected sensortag. Selecting this makes all other options ineffective as the program will continue to run.", default=False)
	
	parser.add_option('-f', '--fixture', action="store", dest="fixture", help="Open connection to selected fixture, closing all other active connections", default=False)
	parser.add_option('-t', '--stream', action="store_true", dest="stream", help="Start streaming data from selected sensortag", default=False)
	parser.add_option('-l', '--locate', action="store_true", dest="locate", help="Locate the selected fixture", default=False)
	parser.add_option('-m', '--mute', action="store_true", dest="mute", help="Mute the selected fixture", default=False)
	
	options, args = parser.parse_args()
    
	if (options.server):
		fixtureServer()
	else:
		if (options.fixture):
			controlTagServer("select", options.fixture)
		if (options.stream):
			controlTagServer("stream",0)
		if (options.mute):
			controlTagServer("mute",0)
		if (options.locate):
			controlTagServer("locate",0)
		
def onConnect(client, userdata, flags, rc):
	if rc==0:
		print("Connected to MQTT broker!")
		client.connected_flag = True
	else:
		client.connected_flag = False
		print("Couldn't initiate connection to MQTT broker:",rc)
		exit(1)
		
def controlTagServer(command, arg1):

	
	myclient = mqtt.Client("sensorTagControlChannel")
	mqtt.Client.connected_flag=False
	myclient.on_connect=onConnect
	
	myclient.connect_async("127.0.0.1")
	myclient.loop_start()
	
	# Wait for connection
	while not myclient.connected_flag:
		pass
	# This is rubbish code
	if (command == "select"):
		myclient.publish("selectTag", arg1,0)
		print "selectTag:"+arg1
	else:
		myclient.publish("controlTag", command,0)
		print "controlTag:"+command
		
	myclient.loop_stop()
	myclient.disconnect()	

def onMessage(client, userdata, message):
	global myTag
	#payload=str(message.payload.decode("utf-8"))
	print("received message ="+message.topic+":"+payload)
	foundTag=False
	
	if (message.topic=="selectTag"):
		for entry in fixture_list["data"]:
			if entry["Name"]==payload:
				address = entry["ID"]
				foundTag=True
				
			
			
			
			#if isinstance(myTag,sensortag.SensorTag):
				#myTag.disconnect()
			#myTag = sensortag.SensorTag(address, sensortag.SENSORTAG_2650)
			#print "connected:"+address
			
	#elif (message.topic=="controlTag"):
		#if (payload=="locate"):
			#if isinstance(myTag,sensortag.SensorTag):
				#myTag.iocontrol.manual()
				#myTag.iocontrol.write(myTag.iocontrol.SOSModeOn)
        	
		#elif (payload=="mute"):
			#if isinstance(myTag,sensortag.SensorTag):
				#myTag.iocontrol.manual()
				#myTag.iocontrol.write(myTag.iocontrol.SOSModeOff)



def fixtureServer():
	import requests
	import socket
	global lat
	global lon
	global location
	r = requests.get(send_url)
	j = json.loads(r.text)
	lat = j['latitude']
	lon = j['longitude']

	location = socket.gethostname()
	print "Location is "+location
	print "Latitude is "+str(lat)
	print "Longitude is "+str(lon)
	
	service = DiscoveryService()

	client = mqtt.Client("sensortagList")
	mqtt.Client.connected_flag=False
	client.on_connect=onConnect
	client.connect("127.0.0.1")
	client.on_message=onMessage
	client.loop_start()
	# Wait for connection
	while not client.connected_flag:
		pass
	# Subscribe to topics that control the tags behaviour
	client.subscribe("selectTag")
	#.subscribe("controlTag")
	
	# While we are connected
	while client.connected_flag:
		devices = service.discover(2)
		# scan for devices
		scan(devices)
		# stream MQTT data
		print fixture_list
		client.publish("fixture_list", payload=json.dumps(fixture_list),qos=2, retain=False)
		time.sleep(1)
	
	client.loop_stop()
	client.disconnect()
	
	
if __name__ == "__main__":
    main()
