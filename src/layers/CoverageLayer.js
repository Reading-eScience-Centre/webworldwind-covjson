var CJ360 = window.CJ360 || {};

// this function is taken from leaflet-coverage/src/layers/Grid.js#_getDomainBbox
CJ360.getGridBbox = function(axes) {
  function extent (x, xBounds) {
    var xend = x.length - 1
    var xmin, xmax
    if (xBounds) {
      xmin = xBounds.get(0)[0]
      xmax = xBounds.get(xend)[1]
    } else {
      xmin = x[0]
      xmax = x[xend]
    }
    var xDescending = xmin > xmax
    if (xDescending) {
      var tmp = xmin
      xmin = xmax
      xmax = tmp
    }
    // we derive the size of the first/last grid cell if no bounds exist
    if (!xBounds && x.length > 1) {
      if (xDescending) {
        xmin -= (x[xend - 1] - x[xend]) / 2
        xmax += (x[0] - x[1]) / 2
      } else {
        xmin -= (x[1] - x[0]) / 2
        xmax += (x[xend] - x[xend - 1]) / 2
      }
    }
    return [xmin, xmax]
  }

  var xAxis = axes.get('x')
  var yAxis = axes.get('y')
  var xextent = extent(xAxis.values, xAxis.bounds)
  var yextent = extent(yAxis.values, yAxis.bounds)

  return [xextent[0], yextent[0], xextent[1], yextent[1]]
}

/**
 * @param {Array} categories
 * Checks to see if the categories have a
 * prefered colour associated with them.
 */
CJ360.colourDefaultPresent = function (categories) {
  return categories[0].preferredColor !== undefined
};

/**
 * @param {Array} categories
 * creates a new palette with each of the
 * categories prefered colours and converts then to RGB format.
 */
CJ360.loadDefaultPalette = function (categories) {
  var newPalette = new Array(categories.length);

  for (var i = 0; i < categories.length; i++) {
    newPalette[i] = categories[i].preferredColor.substr(1);
  };

  return CJ360.hexToRgb(newPalette);
};

/**
 * @param {Array} categories
 * Categories don't have prefered colour so we use a
 * predefined palette.
 */
CJ360.loadNewPalette = function (categories) {

  var numberOfCategories = categories.length;

  if (numberOfCategories < 12) {
    return hexToRgb(palette('tol', numberOfCategories));
  } else {
    return hexToRgb(palette('tol-rainbow', numberOfCategories));
  }
};

/**
 * @param {Coverage} cov
 * @param {Array} options
 * Constructor for CovJSONLayer. Initialises the palette for the categories
 * based on whether they are continous or categorical. And if they are categorical, it will
 * create the palette based on its prefered colour. If it doesn't have prefered colur
 * a default palette will be picked.
 * Creates the grid bounding box and adds everything to the canvas.
 */
CJ360.CovJSONGridLayer = function (cov, options) {
  this.options = options
  var self = this
  this.cov = cov
  this.paramKey = options.paramKey

};

CJ360.CovJSONGridLayer.prototype = Object.create(CJ360.TiledCanvasLayer.prototype);

CJ360.mixin(CJ360.EventMixin, CJ360.CovJSONGridLayer);

CJ360.CovJSONGridLayer.prototype.load = function () {
  var self = this

  var constraints = {}

  if(this.options.time) {
    constraints.t = this.options.time
  }

  //casting string to int since depth should be number not string
  if(this.options.depth) {
    constraints.z = +this.options.depth
  }

  this.cov.subsetByValue(constraints).then(function(subsetCov) {
    Promise.all([subsetCov.loadDomain(), subsetCov.loadRange(self.paramKey)]).then(function (res) {

      self.domain = res[0]
      self.range = res[1]

      self.paletteExtent = self.options.paletteExtent || CovUtils.minMaxOfRange(self.range)
      var param = self.cov.parameters.get(self.paramKey)
      var allCategories = param.observedProperty.categories
      //undefined means that the grid data is continous
      //and needs a range of similar colours, otherwise for
      //discrete values palette must have unique colours i.e no shades of the same colour
      if (!allCategories) {
        self.palette = CJ360.hexToRgb(palette('tol-dv', 1000))
      } else {
        if(CJ360.colourDefaultPresent(allCategories)) {
          self.palette = CJ360.loadDefaultPalette(allCategories)
        } else {
          self.palette = CJ360.loadNewPalette(allCategories)
        }
      }
      var bbox = CJ360.getGridBbox(self.domain.axes)
      self._bbox = bbox

      CJ360.TiledCanvasLayer.call(self, new WorldWind.Sector(bbox[1], bbox[3], bbox[0], bbox[2]), 256, 256)

      self.fire('load')
    })
  })

  return this;
};

CJ360.CovJSONGridLayer.prototype.drawCanvasTile = function (canvas, tile) {
  var ctx = canvas.getContext('2d')
  var tileWidth = tile.tileWidth
  var tileHeight = tile.tileHeight

  var imgData = ctx.getImageData(0, 0, tileWidth, tileHeight)
  var rgba = xndarray(imgData.data, { shape: [tileHeight, tileWidth, 4] })

  // data coordinates
  var lats = this.domain.axes.get('y').values
  var lons = this.domain.axes.get('x').values

  // extended data bounding box
  var lonMin = this._bbox[0]
  var lonMax = this._bbox[2]
  var latMin = this._bbox[1]
  var latMax = this._bbox[3]

  // tile coordinates
  var sector = tile.sector
  var tileLatMin = sector.minLatitude
  var tileLonMin = sector.minLongitude
  var tileLatMax = sector.maxLatitude
  var tileLonMax = sector.maxLongitude
  var tileLatStep = (tileLatMax - tileLatMin) / tileHeight
  var tileLonStep = (tileLonMax - tileLonMin) / tileWidth

  // used for longitude wrapping
  var lonRange = [lonMin, lonMin + 360]

  for (var tileX = 0; tileX < tileWidth; tileX++) {
    for (var tileY = 0; tileY < tileHeight; tileY++) {
      var lat = (tileHeight - 1 - tileY) * tileLatStep + tileLatMin
      var lon = tileX * tileLonStep + tileLonMin

      // we first check whether the tile pixel is outside the bounding box
      // in that case we skip it as we do not want to extrapolate
      if (lat < latMin || lat > latMax) {
        continue
      }

      lon = CJ360.wrapNum(lon, lonRange, true)
      if (lon < lonMin || lon > lonMax) {
        continue
      }

      // read the value of the corresponding grid cell
      var iLat = CovUtils.indexOfNearest(lats, lat)
      var iLon = CovUtils.indexOfNearest(lons, lon)
      var val = this.range.get({y: iLat, x: iLon})

      // find the right color in the palette
      var color
      var alpha
      if(val) {
        var colorIdx = CJ360.scale(val, this.palette, this.paletteExtent);
        color = this.palette[colorIdx]
        alpha = 255
      } else {
        // We have a null value, so make the pixel transparent
        color = [0,0,0]
        alpha = 0
      }

      // and draw it
      rgba.set(tileY, tileX, 0, color[0])
      rgba.set(tileY, tileX, 1, color[1])
      rgba.set(tileY, tileX, 2, color[2])
      rgba.set(tileY, tileX, 3, alpha)
    }
  }

  ctx.putImageData(imgData, 0, 0)
};

// from https://github.com/Leaflet/Leaflet/blob/master/src/core/Util.js
CJ360.wrapNum = function (x, range, includeMax) {
  var max = range[1];
  var min = range[0];
  var d = max - min;
  return x === max && includeMax ? x : ((x - min) % d + d) % d + min;
};

/**
 * @param {Array} colors
 * array of hex colours without '#'.
 */
CJ360.hexToRgb = function (colors) {
  return colors.map(function(color) {
    var c = parseInt(color, 16);
    return [c >> 16, (c >> 8) & 255, c & 255];
  });
};

CJ360.scale = function (val, palette, extent) {
  // scale val to [0,paletteSize-1] using the palette extent
  // (IDL bytscl formula: http://www.exelisvis.com/docs/BYTSCL.html)
  var scaled = Math.trunc((palette.length - 1 + 0.9999) * (val - extent[0]) / (extent[1] - extent[0]));
  return scaled;
};

CJ360.CovJSONVectorLayer = function (cov, options, type) {
  this.options = options
  this.cov = cov
  this.paramKey = options.paramKey
  this.type = type
  this.load()
};

CJ360.CovJSONVectorLayer.prototype = Object.create(WorldWind.RenderableLayer.prototype);

CJ360.mixin(CJ360.EventMixin, CJ360.CovJSONVectorLayer);

CJ360.CovJSONVectorLayer.prototype.load = function() {

  var self = this

  switch (this.type) {
    case "Point": break;
    case "Trajectory": break;
  }
};

CJ360.COVJSON_NS = 'http://covjson.org/def/domainTypes#';
CJ360.CovJSONVectorDomainTypes = [
  'VerticalProfile','PointSeries','Point','MultiPointSeries','MultiPoint',
  'PolygonSeries','Polygon','MultiPolygonSeries','MultiPolygon','Trajectory',
  'Section'
].map(function (name) { return CJ360.COVJSON_NS + name });

CJ360.CovJSONLayer = function (cov, options) {
  if (cov.domainType === CJ360.COVJSON_NS + 'Grid') {
    return new CJ360.CovJSONGridLayer(cov, options)
  } else if (CJ360.CovJSONVectorDomainTypes.indexOf(cov.domainType) !== -1) {
    var index = CJ360.CovJSONVectorDomainTypes.indexOf(cov.domainType)
    var endIndex = CJ360.CovJSONVectorDomainTypes[index].indexOf("#")
    var type = CJ360.CovJSONVectorDomainTypes[index].substr(endIndex+1)
    return new CJ360.CovJSONVectorLayer(cov, options, type)
  } else {
    throw new Error('Unsupported CovJSON domain type: ' + cov.domainType)
  }
};
