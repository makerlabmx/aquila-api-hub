(function()
{

  var app = angular.module('taskController',[]);

  app.controller('TaskController', [ '$scope', 'socketAquila','Device','Task','Config', function($scope,socketAquila,Device,Task,Config)
  {
  	$scope.tasks = [];
  	$scope.task = {};
  	$scope.devices = [];
    $scope.sysTime = null;

  	$scope.error = false;
  	$scope.modal_title = "";
  	$scope.save_element = false;
  	$scope.edit_element = false;

  	$scope.repeatType = "0";
  	$scope.repeatTypes = ["No", "Each minute", "Each Hour", "Each Day", "Each Week", "Every Month", "Every Year"];

  	$scope.week = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  	$scope.selectedDay = "0";

  	$scope.months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  	$scope.selectedMonth = "0";

  	$scope.init = function()
  	{
  		$scope.loadTasks();
      Config.ip.get({}, function(data, status, headers)
      {
        $scope.sysTime = moment(data.sysTime).format("MMMM Do YYYY, h:mm a");
      }, function(data, status){console.log(data, status);});
  	};

  	$scope.verboseTask = function(task)
  	{
  		var dateRule = null;
  		if(task.dateRule) dateRule = new Date(task.dateRule);
  		if(dateRule instanceof Date)
  		{
  			return moment(dateRule).format("MMMM Do YYYY, h:mm a");
  		}

  		if(task.recurrenceRule)
  		{
  			rule = task.recurrenceRule;
  			if(typeof(rule.month) === 'number')
  			{
  				return "Every year at " + moment(new Date(99, rule.month, rule.date, rule.hour, rule.minute)).format("MMMM Do, h:mm a");
  			}

  			if(typeof(rule.date) === 'number')
  			{
  				return moment(new Date(99, 0, rule.date, rule.hour, rule.minute)).format("[The] Do [of every month at] h:mm a");
  			}

  			if(typeof(rule.dayOfWeek) === 'number')
  			{
  				return "Each " + $scope.week[rule.dayOfWeek] + " at " + moment(new Date(99, 0, 1, rule.hour, rule.minute)).format("h:mm a");
  			}

  			if(typeof(rule.hour) === 'number')
  			{
  				return "Each day at " + moment(new Date(99, 0, 1, rule.hour, rule.minute)).format("h:mm a");
  			}

  			if(typeof(rule.minute) === 'number')
  			{
  				return "Each hour at minute " + rule.minute;
  			}

  			if(typeof(rule.second) === 'number')
  			{
  				return "Each minute";
  			}
  		}
  		return "Unknown";
  	};

  	$scope.newTaskFormatWeek = function()
  	{
  		$scope.task.recurrenceRule.dayOfWeek = parseInt($scope.selectedDay);
  	};

  	$scope.newTaskFormatMonth = function()
  	{
  		$scope.task.recurrenceRule.month = parseInt($scope.selectedMonth);
  	};

  	$scope.taskSelectChange = function()
  	{
  		if($scope.repeatType === "0")
  		{
  			$scope.task.recurrenceRule = null;
  		}
  		else
  		{
  			$scope.task.dateRule = null;
  		}

  		if($scope.repeatType === "1")
  		{
  			$scope.task.recurrenceRule = {
  				year: null,
  				month: null,
  				date: null,
  				dayOfWeek: null,
  				hour: null,
  				minute: null,
  				second: 0
  			};
  		}

  		if($scope.repeatType === "2")
  		{
  			$scope.task.recurrenceRule = {
  				year: null,
  				month: null,
  				date: null,
  				dayOfWeek: null,
  				hour: null,
  				minute: 0,
  				second: 0
  			};
  		}

  		if($scope.repeatType === "3")
  		{
  			$scope.task.recurrenceRule = {
  				year: null,
  				month: null,
  				date: null,
  				dayOfWeek: null,
  				hour: 0,
  				minute: 0,
  				second: 0
  			};
  		}

  		if($scope.repeatType === "4")
  		{
  			$scope.task.recurrenceRule = {
  				year: null,
  				month: null,
  				date: null,
  				dayOfWeek: 0,
  				hour: 0,
  				minute: 0,
  				second: 0
  			};
  		}

  		if($scope.repeatType === "5")
  		{
  			$scope.task.recurrenceRule = {
  				year: null,
  				month: null,
  				date: 1,
  				dayOfWeek: null,
  				hour: 0,
  				minute: 0,
  				second: 0
  			};
  		}

  		if($scope.repeatType === "6")
  		{
  			$scope.task.recurrenceRule = {
  				year: null,
  				month: 0,
  				date: 1,
  				dayOfWeek: null,
  				hour: 0,
  				minute: 0,
  				second: 0
  			};
  		}
  	};

  	$scope.loadTasks = function()
  	{
  		Device.all(function(devices)
  			{
  				$scope.devices = devices;
  				Task.all(function(tasks)
					{
						// Prepare tasks, assign to device the whole known device
						for(var i = 0; i < tasks.length; i++)
						{
							for(var j = 0; j < devices.length; j++)
							{
								if(devices[j]._id === tasks[i].device)
								{
									tasks[i].device = devices[j];
									for(var k = 0; k < tasks[i].device.actions.length; k++)
									{
										if(tasks[i].device.actions[k].n === tasks[i].action)
										{
											tasks[i].action = tasks[i].device.actions[k];
											continue;
										}
									}
									continue;
								}
							}
						}
						$scope.tasks = tasks;
					}, function(err)
					{
						$scope.error = err;
						console.log(err);
					});	
  			},
  			function(err)
  			{
  				$scope.error = err;
				console.log(err);
  			});
  		
  	};

  	$scope.newTask = function()
  	{
  		$scope.error = false;
  		$scope.save_element = true;
  		$scope.edit_element = false;
  		$scope.modal_title = "Add new Task";
  		$scope.task = {};
  		// Update task contents
  		$scope.taskSelectChange();
  		$('#modal-task').modal('show');
  	};

  	$scope.saveTask = function()
  	{	
  		$scope.error = false;
  		console.log($scope.task);
  		// Prepare task
  		var newTask = $scope.task;
  		// Validate
  		if(!newTask.device || !newTask.action) {$scope.error = "You must select a device and an action"; return;}
  		if($scope.repeatType === "0" && !newTask.dateRule) {$scope.error = "You must select a date"; return;}

  		newTask.device = newTask.device._id;
  		newTask.action = newTask.action.n;
  		Task.create(newTask, function(tasks)
  			{
  				$scope.loadTasks();
  				$('#modal-task').modal('hide');
  			},
  			function(err)
  			{
  				$scope.error = err;
  			});
  	};

  	$scope.deleteTask = function(task)
  	{
  		Task.delete({ id: task._id }, function()
  			{
  				$scope.loadTasks();
  			});
  	};

  }]);

})();