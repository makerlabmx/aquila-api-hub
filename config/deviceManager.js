// config/deviceManager.js

module.exports = {

	// check online devices every 'refreshInterval' milliseconds
	autoCheckAlive: true,
	refreshInterval: 10000,
	activeRefreshInterval: 1000,
	// Max number of retries after a device is marked as inactive:
	maxRetriesInactive: 0,
	//Advanced options, modify only if you know what you are doing:
	timeout: 100,
	longTimeout: 1000,
	debug: false

};
