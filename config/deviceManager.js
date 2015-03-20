// config/deviceManager.js

module.exports = {

	// check online devices every 'refreshInterval' milliseconds
	autoCheckAlive: true,
	refreshInterval: 30000,
	activeRefreshInterval: 2000,
	// Ping for Refresh known but inactive devices, or only active ones:
	refreshInactive: true,
	// Max number of retries after a device is marked as inactive:
	maxRetriesInactive: 1,
	maxRetriesFetch: 3,
	//Advanced options, modify only if you know what you are doing:
	timeout: 200,
	longTimeout: 1000,
	debug: false

};
