var CJ360 = window.CJ360 || {};

CJ360.UIManager = function (wwd, cov, dom, param, legName) {
  this._wwd = wwd;
  this._cov = cov;
  this._dom = dom;
  this._fullTime = "";
  this._param = param;
  this._legendName = legName;
  var self = this;

  var timeAxis = dom.axes.get("t");
  var zaxis = dom.axes.get("z");

  if(!timeAxis && !zaxis) {

    this._wwd.removeLayer(this._layer);
    layer = this.createLayer({time: "", depth: ""});
    layer.on('load', function (vectorLayer) {
      vectorLayer ? self._wwd.addLayer(vectorLayer) : self._wwd.addLayer(layer);
    }).load();

    this._layer = layer;

  } else if(timeAxis && !zaxis) {
    this._wwd.removeLayer(this._layer);
    this._layer = this.runTimeSelector(timeAxis);
  } else if(!timeAxis && zaxis) {
    this._wwd.removeLayer(this._layer);
    this._layer = this.runDepthSelector(zaxis);
  } else {
     this._wwd.removeLayer(this._layer);
     this.runSelectors(timeAxis, zaxis);
  }

};

/**
 * Runs the time UI, firstly creates the layer based
 * on the initialised values in the boxes and then uses the event handler to
 * change the layer based on specfic time frame
 * @param {Object} timeAxis
 */
CJ360.UIManager.prototype.runTimeSelector = function (timeAxis) {
  var self = this;

  var values = timeAxis.values;

  timeSelector = new CJ360.TimeSelector(values, {dateId: "dateStamps", timeId: "timeStamps"});

  var dateStamps = document.querySelector(".dateStamps");
  var timeStamps = document.querySelector(".timeStamps");

  var date = dateStamps.options[dateStamps.selectedIndex].value;
  var time = timeStamps.options[timeStamps.selectedIndex].value;

  var timeString;
  if(time == "undefined") {
     timeString = date;
  } else {
    timeString = date + "T" + time;
  }

  var layer = this.createLayer({time: timeString})
  .on('load', function () {
    self._wwd.addLayer(layer);
  }).load();

  this._fullTime = date + "T" + time;

  timeSelector.on("change", function (time) {

    self._wwd.removeLayer(layer);
    layer = self.createLayer({time: time.value})
    .on('load', function () {
      self._wwd.addLayer(layer);
    }).load();
    this._fullTime = time;
  });
  return layer;
};

/**
 * Runs the depth UI, firstly creates the layer based
 * on the initialised values in the boxes and then uses the event handler to
 * change the layer based on specfic depth
 * @param {Object} zaxis
 */
CJ360.UIManager.prototype.runDepthSelector = function(zaxis) {
  var self = this;

  if(!zaxis) {
    layer = this.createLayer()
      .on('load', function () {
        self._wwd.addLayer(layer)
      }).load();
      return layer;
  }else {

    var values = zaxis.values;

    depthSelector = new CJ360.DepthSelector(values, {zaxisID: "zaxis"});

    var depthStamps = document.querySelector(".zaxis");

    var currDepth = depthStamps.options[depthStamps.selectedIndex].value;

    var layer = this.createLayer({depth: currDepth})
    .on('load', function () {
      self._wwd.addLayer(layer)
    }).load();
    this._depth = currDepth;

    depthSelector.on("change", function (depth) {
      self._wwd.removeLayer(layer);
      layer = self.createLayer({depth: depth.value})
      .on('load', function () {
        self._wwd.addLayer(layer);
      }).load();
      this._depth = depth;
    });
    return layer;
  }
};

CJ360.UIManager.prototype.runSelectors = function(timeAxis, zaxis) {

  var self = this;

  var values = timeAxis.values;

  timeSelector = new CJ360.TimeSelector(values, {dateId: "dateStamps", timeId: "timeStamps"});

  var dateStamps = document.querySelector(".dateStamps");
  var timeStamps = document.querySelector(".timeStamps");

  var date = dateStamps.options[dateStamps.selectedIndex].value;
  var time = timeStamps.options[timeStamps.selectedIndex].value;

  var values = zaxis.values;

  depthSelector = new CJ360.DepthSelector(values, {zaxisID: "zaxis"});

  var depthStamps = document.querySelector(".zaxis");

  var currDepth = depthStamps.options[depthStamps.selectedIndex].value;

  var layer = this.createLayer({time: date + "T" + time, depth: currDepth})
  .on('load', function () {
    self._wwd.addLayer(layer)
  }).load();

  this._depth = currDepth;
  this._fullTime = date + "T" + time;

  timeSelector.on("change", function(time) {

    self._wwd.addLayer(layer);

    depthSelector.on("change", function(depth) {

      layer = self.createLayer({time: time.value, depth: depth.value})
      .on('load', function () {
        self._wwd.addLayer(layer);
      }).load();
      this._depth = depth;
    });
    this._fullTime = time;
  });

  return layer;
};

/**
 * Creates a new layer with specific attributes
 * and creates a legend for it
 * @param {Object} options
 */
CJ360.UIManager.prototype.createLayer = function(options) {
  var cov = this._cov;
  var self = this;

  var layer = CJ360.CovJSONLayer(cov, {
    paramKey: this._param,
    time: options.time,
    depth: options.depth
  }).on('load', function () {
    this._legend = CJ360.createLegend(cov, layer, self._param, self._legendName);
  });
  return layer;
};

CJ360.UIManager.prototype.getLayer = function() {
  return this._layer;
};

CJ360.mixin(CJ360.EventMixin, CJ360.UIManager);
