// api/controllers/taskManager.js

var mongoose = require("mongoose");
var Task = mongoose.model("Task");
var Device = mongoose.model("Device");
var schedule = require("node-schedule");
var deviceManager = require("./deviceManager");

var TaskManager = function()
{
	var self = this;
	// Running tasks list
	self.tasks = [];
	// Load tasks from database
	self.init();

};

TaskManager.prototype.init = function()
{
	var self = this;
	// Get from database
	Task.find(function(err, tasks)
	{
		if(err) return console.log(err);

		for(var i = 0; i < tasks.length; i++)
		{
			// Closure for async issues
			(function(clsn)
			{
				var task = tasks[clsn];
				// Get device details (Getting shortAddress, as it could have changed)
				Device.findById(task.device, function(err, device)
				{
					if(err) return console.log(err);
					if(!device) return console.log("Not scheduling task:", task, "because device is not known.");
					// Check if has dateRule or Recurrence rule (cannot be both)
					if(task.dateRule instanceof Date)
					{
						// If date is in the past, dont schedule, otherwise it will be called immediately
						if(task.dateRule < new Date()) return;
						var j = schedule.scheduleJob(task.dateRule, function()
						{
							if(!device) return; // if we deleted this device but the schedule persisted
							console.log(Date(), "--- Doing task", device.shortAddress, task.dateRule);
							if(deviceManager.ready) deviceManager.requestAction(device.shortAddress, task.action, task.param);
						});
						self.tasks.push(j);
					}
					else if(task.recurrenceRule /*instanceof schedule.RecurrenceRule*/)
					{
						var j = schedule.scheduleJob(task.recurrenceRule, function()
						{
							if(!device) return; // if we deleted this device but the schedule persisted
							console.log(Date(), "--- Doing task", device.shortAddress, task.recurrenceRule);
							if(deviceManager.ready) deviceManager.requestAction(device.shortAddress, task.action, task.param);
						});
						self.tasks.push(j);
					}

				});
			})(i);
		}
	});
};

TaskManager.prototype.reload = function()
{
	var self = this;
	// Cancel all running jobs
	for(var i = 0; i < self.tasks.length; i++)
	{
		(function(clsn)
		{
			schedule.cancelJob(self.tasks[clsn]);
		})(i);
	}
	//Reset tasks and reinit all jobs from database
	self.tasks = [];
	self.init();
};

var taskManager = new TaskManager();
module.exports = taskManager;
