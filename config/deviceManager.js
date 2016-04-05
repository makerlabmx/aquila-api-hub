// config/deviceManager.js

module.exports = {

	// check online devices every 'refreshInterval' milliseconds
	autoCheckAlive: true,
	refreshInterval: 30000,
	activeRefreshInterval: 30000,
	// Ping for Refresh known but inactive devices, or only active ones:
	refreshInactive: false,
	// Max number of retries after a device is marked as inactive:
	maxRetriesInactive: 1,
	maxRetriesFetch: 3,
	//Advanced options, modify only if you know what you are doing:
	timeout: 1000,
	longTimeout: 1000,
	debug: false

};
