// api/controllers/task.js

var mongoose = require("mongoose");
var Device = mongoose.model("Device");
var Task = mongoose.model("Task");
var schedule = require("node-schedule");
var taskManager = require("./taskManager.js");
var validator = require("validator");

var queryFields = "";

// GET - List all tasks
exports.findAllTasks = function(req, res)
{
	Task.find(req.query, queryFields, function(err, tasks)
	{
		if(err) return res.status(500).send(err.message);

		res.status(200).jsonp(tasks);
	});

};

// POST - Add new task
exports.addTask = function(req, res)
{
	var self = this;

	var newTask = new Task(
	{
		device: 		req.body.device,
		action: 		req.body.action,
		param: 			req.body.param,
		dateRule: 		req.body.dateRule,
		recurrenceRule: req.body.recurrenceRule
	});

	newTask.recurrenceRule.second = 0;

	// Validation
	if(typeof newTask.device !== 'string') return res.status(500).send("Bad device Id, should be a string");
	if(!validator.isInt(newTask.action)) return res.status(500).send("Bad action, should be a number");
	if(newTask.param && !validator.isInt(newTask.param)) return res.status(500).send("Bad param, should be a number or null");
	if(newTask.dateRule && !(newTask.dateRule instanceof Date)) res.status(500).send("Bad dateRule, should be a Date or null");
	// Check this
	//if(newTask.recurrenceRule && !(newTask.recurrenceRule instanceof schedule.RecurrenceRule)) res.status(500).send("Bad recurrenceRule, should be a RecurrenceRule or null");


	newTask.save(function(err)
	{
		if(err) return res.status(500).send(err.message);
		// reload tasks
		taskManager.reload();
		// Send all tasks
		exports.findAllTasks(req, res);
	});
};


// GET - retrieve a task
exports.findById = function(req, res)
{
	Task.findById(req.params.id, queryFields, function(err, task)
		{
			if(err) return res.status(500).send(err.message);

			res.status(200).jsonp(task);
		});
};

// PUT - Modify existing task
exports.updateTask = function(req, res)
{
	var self = this;

	var newTask = new Task(
	{
		device: 		req.body.device,
		action: 		req.body.action,
		param: 			req.body.param,
		dateRule: 		req.body.dateRule,
		recurrenceRule: req.body.recurrenceRule
	});

	newTask.recurrenceRule.second = 0;


	// Validation
	if(typeof newTask.device !== 'string') return res.status(500).send("Bad device Id, should be a string");
	if(!validator.isInt(newTask.action)) return res.status(500).send("Bad action, should be a number");
	if(newTask.param && !validator.isInt(newTask.param)) return res.status(500).send("Bad param, should be a number or null");
	if(newTask.dateRule && !(newTask.dateRule instanceof Date)) res.status(500).send("Bad dateRule, should be a Date or null");
	// Check this
	//if(newTask.recurrenceRule && !(newTask.recurrenceRule instanceof schedule.RecurrenceRule)) res.status(500).send("Bad recurrenceRule, should be a RecurrenceRule or null");

	Task.findById(req.params.id, queryFields, function(err, task)
		{
			if(err) return res.status(500).send(err.message);

			task.device = newTask.device;
			task.action = newTask.action;
			task.param = newTask.param;
			task.dateRule = newTask.dateRule;
			task.recurrenceRule = newTask.recurrenceRule;

			task.save(function(err)
				{
					if(err) return res.status(500).send(err.message);
					res.status(200).jsonp(task);
				});

		});
};

// DELETE - remove task
exports.deleteTask = function(req, res)
{
	Task.findByIdAndRemove(req.params.id, function(err)
		{
			if(err) return res.status(500).send(err.message);
			// reload tasks
			taskManager.reload();
			// Send all tasks
			exports.findAllTasks(req, res);
		});
};