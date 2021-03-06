var CJ360 = window.CJ360 || {};

/**
 * Creates a Time and date drop down for the time values given.
 * And eventListener selects the values and fires the change to the EventMixin
 * of this class.
 * @param {Array} values
 * @param {Object} options
 */
CJ360.TimeSelector = function (values, options) {
	this._dateId = options.dateId;
	this._timeId = options.timeId;
	this._dateToTimeMap = {}
	var self = this;

  this._initTags();

 	var dateStamps = document.querySelector("." + this._dateId);
 	var timeStamps = document.querySelector("." + this._timeId);

	//Initialises the date drop down UI
	// create date-> time map
	for(var i = 0; i < values.length; i++){
		var time = undefined;
		var date = values[i];
		if(date.includes("T")) {
			var endIndex = values[i].indexOf("T");
		    date = values[i].substr(0,endIndex);
		    time = values[i].substr(endIndex+1);
		}
		if(date in this._dateToTimeMap) {
			this._dateToTimeMap[date].push(time);
		} else {
			this._dateToTimeMap[date] = [time];
		}
	}

	// construct date and time select elements
	//...
	this._fillDateOptions(Object.keys(this._dateToTimeMap));
	this._fillTimeOptions(this._dateToTimeMap);

	var date
	var time

	dateStamps.addEventListener("change" , function() {

		self._fillTimeOptions(self._dateToTimeMap);

	  date = this.value;
	  time = timeStamps.options[timeStamps.selectedIndex].value;

		self.fire("change", {value: date + "T" + time});

		timeStamps.addEventListener("change", function() {
			self.fire("change", {value: date + "T" + time});
		});

	});
};

/**
 * Given an array of dates it populates the date dropdown.
 * @param {Array} dateArr
 */
CJ360.TimeSelector.prototype._fillDateOptions = function(dateArr) {

	var dateStamps = document.querySelector("." + this._dateId);

	for(var i = 0; i < dateArr.length; i++) {
		var option = document.createElement("option");
		option.setAttribute("id", dateArr[i]);
		option.appendChild(document.createTextNode(dateArr[i]));
		dateStamps.appendChild(option);
	}
};

/**
 * Populates the time dropdown for a given date, using the map.
 * The maps keys are the dates and each date may have one or more values
 * associated with it.
 * @param {Map} map
 */
CJ360.TimeSelector.prototype._fillTimeOptions = function (map) {

	var dateStamps = document.querySelector("." + this._dateId);
	var currDateVal = dateStamps.options[dateStamps.selectedIndex].value;
	var timeStamps = document.querySelector("." + this._timeId);

	timeStamps.options.length = 0;

	var times = map[currDateVal];

	for(var i = 0; i < times.length; i++) {
		var option = document.createElement("option");
		option.setAttribute("value", times[i]);
		option.appendChild(document.createTextNode(times[i]));
		timeStamps.appendChild(option);
	}
};

CJ360.TimeSelector.prototype._initTags = function () {

  CJ360.createAndAddtoContainer("timeUI", "time", "div");
  var time = document.querySelector(".time")
	if(time.childNodes.length < 1) {
		time.appendChild(document.createTextNode("Time"));
	}
  CJ360.createAndAddtoContainer("timeUI", "dateStamps", "select");
  CJ360.createAndAddtoContainer("timeUI", "timeStamps", "select");


};

CJ360.mixin(CJ360.EventMixin, CJ360.TimeSelector);
