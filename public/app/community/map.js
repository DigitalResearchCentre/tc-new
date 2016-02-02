function ImageMapType (options){
  options = options || {};
  this.tileSize = options.tileSize || new google.maps.Size(256, 256);
  this.maxZoom = options.maxZoom || 4;
  this.minZoom = options.minZoom || 2;
  this.name = options.name || 'Image';
  this.src= options.src || 'image/';
};

ImageMapType.prototype.getTile = function (coord, zoom, ownerDocument){
  var div = ownerDocument.createElement('DIV');
  div.style.width = this.tileSize.width + 'px';
  div.style.height = this.tileSize.height + 'px';
  div.style.color = 'red';
  var imgSrc = this.getTileUrl(coord, zoom);
  if (imgSrc !== ''){
    div.style.background = 'url('+imgSrc+')';
    div.style.backgroundRepeat = 'no-repeat';
  }
  return div; 
};
ImageMapType.prototype.getTileUrl = function (coord, zoom) {
  var limit=Math.pow(2, zoom);
  if (coord.x < 0 || coord.y < 0 || coord.x >= limit || coord.y >= limit){
    return '';
  }
  var x=coord.x;
  var y=coord.y;
  return this.src+zoom+'/'+x+'/'+y+'/';
}



function ImageMap(div, src, options){
  options = options || {};
  options.mapTypeId = 'DRCImageMapType';
  options.center = options.center || new google.maps.LatLng(0, 0);
  options.zoom = options.zoom || 2;
  options.maxZoom = options.maxZoom || 5;
  options.minZoom = options.minZoom || 2;
  options.name = options.name || 'Image';
  options.src = options.src || src;
  if (options.src[options.src.length-1] != '/'){
    options.src += '/';
  }
  options.streetViewControl = false;
  options.mapTypeControlOptions = options.mapTypeControlOptions || {
    mapTypeIds: [],
    style: null
  };

  var imageMap = this;
  this.getMaxZoom(options.src, function(maxZoom){
    options.maxZoom = maxZoom;
    var map = new google.maps.Map(div, options);
    var imageType = new ImageMapType(options);

    map.mapTypes.set(options.mapTypeId, imageType);
   
    map.overlayView = new google.maps.OverlayView();
    map.overlayView.draw = function (){};
    map.overlayView.setMap(map);
    google.maps.event.addListener(map, 'projection_changed', function(e){
      var projection = this.getProjection();
      var latLng = projection.fromPointToLatLng(new google.maps.Point(64, 64));
      this.setCenter(latLng);
    });
    imageMap.map = map;
  });
}

ImageMap.prototype.getMaxZoom = function(src, callback, zoom) {
  $.get(src, function(json){
    callback(json.max_zoom);
  });
}


module.exports = ImageMap;
