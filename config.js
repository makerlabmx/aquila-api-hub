/*
 *	App configuration parameters
 */

var config = {};

// Bridge connection parameters:
//config.PORT = "/dev/tty.usbmodem2642";
config.BAUDRATE = 57600;
config.PORT = null;	// null = auto

// check online devices every n seconds
config.autoCheckAlive = true;

module.exports = config;
