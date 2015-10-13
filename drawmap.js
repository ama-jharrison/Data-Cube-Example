


/*
* Indexof function for ie/chrome support
*/
if (!Array.prototype.indexOf) {
  Array.prototype.indexOf = function(searchElement, fromIndex) {

    var k;

    // 1. Let O be the result of calling ToObject passing
    //    the this value as the argument.
    if (this == null) {
      throw new TypeError('"this" is null or not defined');
    }

    var O = Object(this);

    // 2. Let lenValue be the result of calling the Get
    //    internal method of O with the argument "length".
    // 3. Let len be ToUint32(lenValue).
    var len = O.length >>> 0;

    // 4. If len is 0, return -1.
    if (len === 0) {
      return -1;
    }

    // 5. If argument fromIndex was passed let n be
    //    ToInteger(fromIndex); else let n be 0.
    var n = +fromIndex || 0;

    if (Math.abs(n) === Infinity) {
      n = 0;
    }

    // 6. If n >= len, return -1.
    if (n >= len) {
      return -1;
    }

    // 7. If n >= 0, then Let k be n.
    // 8. Else, n<0, Let k be len - abs(n).
    //    If k is less than 0, then let k be 0.
    k = Math.max(n >= 0 ? n : len - Math.abs(n), 0);

    // 9. Repeat, while k < len
    while (k < len) {
      var kValue;
      // a. Let Pk be ToString(k).
      //   This is implicit for LHS operands of the in operator
      // b. Let kPresent be the result of calling the
      //    HasProperty internal method of O with argument Pk.
      //   This step can be combined with c
      // c. If kPresent is true, then
      //    i.  Let elementK be the result of calling the Get
      //        internal method of O with the argument ToString(k).
      //   ii.  Let same be the result of applying the
      //        Strict Equality Comparison Algorithm to
      //        searchElement and elementK.
      //  iii.  If same is true, return k.
      if (k in O && O[k] === searchElement) {
        return k;
      }
      k++;
    }
    return -1;
  };
}

/*
* Redraw event
*/


/*
* Begin DrawMap
*/
//NOTE: if window.DRAWMAP_DEBUG is set to true, console outputs will be printed.
function DrawMap(domID){
  if(window.DRAWMAP_DEBUG){
    console.log("Creating DrawMap...");
  }
  this.drawmapEventReserved = new CustomEvent('redraw',{'detail':domID});
  this.drawmapMouseMovement = new CustomEvent('mouseMove',{'detail':domID});
  this.drawmapMouseRightClick = new CustomEvent('mouseRight',{'detail':domID});
  this.current_draw = [];
  this.cimg = [];
  this.canvasW = canvas.width;
  this.canvasH = canvas.height;
  this.canvasX = 0;
  this.canvasY = 0;
  this.sx = 0;
  this.sy = 0;

  this.dw = this.canvasW;
  this.dh = this.canvasH;
  this.canvas = document.getElementById(domID);
  this.mouse_position = {x:0,y:0};
  this.last_position = {x:0,y:0};
  this.init_drawmap();

  this.pan(0,0);


}
DrawMap.prototype.setGeoCenter = function(lat,lng){
  this.lat = parseFloat(lat);
  this.lng = parseFloat(lng);
}
DrawMap.prototype.setZoom = function(zoom){
  this.zoom = zoom;
}
DrawMap.prototype.init_drawmap = function() {
  if(window.DRAWMAP_DEBUG){
    console.log("Initializing DrawMap...");
  }

  var that = this;
  this.canvas.oncontextmenu = function(e){
    e.preventDefault();
  }
  this.canvas.addEventListener('mousemove',function(evt){
    that.getMousePositionFromListener(evt);
    document.dispatchEvent(that.drawmapMouseMovement);
  });
  if(window.DRAWMAP_DEBUG){
    console.log("Mouse Movement Listener started on DrawMap...");
    console.log("drawmap.debugMouseMovement(true) to get console logs...");
  }
  this.canvas.addEventListener('mousedown',function(evt){
    that.getMouseClickDownStatusFromListener(evt);
    evt.preventDefault();
    return false;
  },false);
  this.canvas.addEventListener('mouseup',function(evt){
    that.getMouseClickUpStatusFromListener(evt);
    evt.preventDefault();
    return false;
  },false);
  this.canvas.addEventListener('mousewheel', function(evt){

    that.zoomCanvas(-1*evt.deltaY,evt.clientX, evt.clientY);
    evt.preventDefault();
    return false;
  },false);
  this.canvas.addEventListener('DOMMouseScroll', function(evt){

    that.zoomCanvas(-40*evt.detail,evt.clientX,evt.clientY);
    evt.preventDefault();
  },false);

}
DrawMap.prototype.enablePanning = function(enable){
  this.pan_canvas=enable;
  this.draw_canvas=false;
}
DrawMap.prototype.enableDrawing = function(enable){
  this.draw_canvas=enable;
  this.pan_canvas=false;
}
DrawMap.prototype.hideDrawLine = function(enable){
  this.hide_draw_line = enable;
}
DrawMap.prototype.redraw = function(){
  var ctx = this.canvas.getContext('2d');
  ctx.save();

 ctx.setTransform(1,0,0,1,0,0);
 ctx.clearRect(0,0,canvas.width,canvas.height);
  if(!this.reset_panning){
  ctx.restore();
 } else {
   this.reset_panning=false;
 }
  this.refreshBackgroundImage();
  if(this.current_draw.length>1 && !this.hide_draw_line){
    ctx.strokeStyle="#FF0000";
    ctx.beginPath()
    ctx.moveTo(this.current_draw[0].x,this.current_draw[0].y);
    for(var i=1;i<this.current_draw.length;i++){
      //this.drawRectangeLatLng(this.current_draw[i].x,this.current_draw[i].y,this.current_draw[i].x+3,this.current_draw[i].y+3,"#FF0000");
      //ctx.lineTo(this.current_draw[i].x*this.zclicks,this.current_draw[i].y*this.zclicks);
      var coord = this.convertLatLngToXY(this.current_draw[i].lat,this.current_draw[i].lng);
      ctx.lineTo(coord.x,coord.y);
      ctx.stroke();
    }
  }
  ctx.closePath();
  document.dispatchEvent(this.drawmapEventReserved);
}
DrawMap.prototype.zoomCanvas = function(wheel_zoom,clientX,clientY){
  var ctx = this.canvas.getContext('2d');
  this.reset_panning = true;
  if(wheel_zoom < 0){
    //zoom out
    if(window.DRAWMAP_DEBUG){
      console.log("zooming out");
    }
	this.dw = this.dw * 1.2;
	this.dh = this.dh * 1.2;

	if(this.dw > this.canvasW)
	{
		this.dw = this.canvasW;
	}
	if(this.dh > this.canvasH)
	{
		this.dh = this.canvasH;
	}

	if(this.canvasW - this.dw < this.sx)
		this.sx = this.canvasW - this.dw;
	if(this.canvasH - this.dh < this.sy)
		this.sy = this.canvasH - this.dh;
  }
  if(wheel_zoom > 0){
    //zoom in
    if(window.DRAWMAP_DEBUG){
      console.log("zooming in");
    }
	this.dw = this.dw * .8;
	this.dh = this.dh * .8;

	this.sx = clientX - this.dw/5;
	this.sy = clientY - this.dh/5;

	if(this.sx < 0)
		this.sx = 0;
	if(this.sy < 0)
		this.sy = 0;
	if(this.canvasW - this.sx < this.dw)
		this.sx = this.canvasW-this.dw;

	if(this.canvasH - this.sy < this.dh)
		this.sy = this.canvasH-this.dh;
  }
  this.redraw();
}
DrawMap.prototype.setCSSScaleFactor = function(scale){
  this.css_scale = scale;
}
DrawMap.prototype.getMousePositionFromListener = function(evt){

  var rect = this.canvas.getBoundingClientRect();
  if(window.DRAWMAP_DEBUG && window.DRAWMAP_DEBUG_VERBOSE){
    console.log(rect);
    console.log(evt.clientX+", "+evt.clientY);
  }
  offset = $("canvas").offset();

  var coord = {x: evt.clientX-offset.left,
          y:  evt.clientY-offset.top
          };
  //offset

  this.mouse_position = coord;

  if(this.showMouseMovement){
    console.log("mouse position: "+coord.x+", "+coord.y);
    if(this.lat){
      //geocoord = this.convertXYToGeo(evt.clientX,evt.clientY);
      var geocoord = this.convertXYToGeo(coord.x,coord.y);
      var reversegeocoord = this.convertLatLngToXY(geocoord.lat,geocoord.lng);
      console.log("mouse position: lat: "+geocoord.lat+"(y: "+reversegeocoord.y+")  lng: "+geocoord.lng+"(x: "+reversegeocoord.x+")");
    }
  }
  if(this.mouse_down && this.pan_canvas){
    if(this.last_position.x==evt.clientX && this.last_position.y==evt.clientY&&false){
      if(window.DRAWMAP_DEBUG){
        console.log("no need to pan");
      }
    } else{
      if(window.DRAWMAP_DEBUG){
        console.log(this.last_position);
        console.log(evt.clientX+", "+evt.clientY);
      }
      this.pan(evt.clientX,evt.clientY);
    }
  }
  else if(this.mouse_down&&this.draw_canvas){

    this.draw(coord.x,coord.y);
  }
  if(this.mouse_down ==false){
    this.last_position = {x:evt.clientX,y:evt.clientY};

  }

  return coord;
}
/*
* INTERNAL USAGE: HANDLE PANNING
*/
DrawMap.prototype.pan = function(clientX,clientY,ignore){

  var ctx = this.canvas.getContext('2d');
  if(window.DRAWMAP_DEBUG){
    console.log("panning translation: ");
    console.log(clientX-this.last_position.x,clientY-this.last_position.y);
  }
console.log("panning translation: ");
    console.log(this.convertXYToGeo(clientX,clientY));

        delX = this.last_position.x-clientX;
        delY = this.last_position.y-clientY;

	if(delX != 0 && delY != 0){
	        this.sx += delX;
	        this.sy += delY;

        if(this.sx < 0)
          this.sx = 0;
        if(this.sx > (this.canvasW-this.dw))
          this.sx = this.canvasW-this.dw;
        if (this.sy < 0)
          this.sy = 0;
        if (this.sy > (this.canvasH-this.dh))
          this.sy = this.canvasH-this.dh;
	}
	console.log(this.sy,this.sx);
  this.redraw();
  this.last_position = {x:clientX,y:clientY};
}
/*
* INTERNAL USAGE: HANDLE USER DRAWING
*/
DrawMap.prototype.draw = function(x,y){
  if(this.restart_draw){
    this.current_draw=[];
    this.restart_draw=false;
  }
  var geocoord = this.convertXYToGeo(x,y);
  this.current_draw.push(geocoord);
  this.redraw();
}
DrawMap.prototype.getMouseClickDownStatusFromListener = function(evt){
  if(evt.which == 3){
    this.rightClick();
    return false;
  }
  this.mouse_down=true;
  return false;
}


DrawMap.prototype.getMouseClickUpStatusFromListener = function(evt){
  if(evt.which == 3){

    return false;
  }
  this.mouse_down=false;
  this.restart_draw=true;
  return false;
}


DrawMap.prototype.rightClick = function(){

  document.dispatchEvent(this.drawmapMouseRightClick);
}

DrawMap.prototype.isMouseDown = function(){
  return this.mouse_down;
}
DrawMap.prototype.getMousePosition = function(){
  return this.mouse_position;
}
DrawMap.prototype.debugMouseMovement = function(enable){
  this.showMouseMovement = enable;
}

DrawMap.prototype.drawImageFromURL = function(url){
  var img = new Image();
  var that = this;
  img.addEventListener("load", function(){
    var ctx = that.canvas.getContext('2d');
    ctx.drawImage(this, this.sx, this.sy, this.dw, this.dh,this.canvasX, this.canvasY, this.canvasW,this.canvasH);
  },false);
  img.src=url;
}
DrawMap.prototype.setBackgroundImageFromURL = function(url){
  this.bg_img = new Image();
  var that = this;
  this.bg_img.addEventListener("load", function(){
    var ctx = that.canvas.getContext('2d');
    ctx.drawImage(this,this.sx, this.sy, this.dw, this.dh,this.canvasX, this.canvasY, this.canvasW,this.canvasH);
  },false);
  this.bg_img.src=url;
}
DrawMap.prototype.refreshBackgroundImage = function(){
  if(this.bg_img){
    var ctx = this.canvas.getContext('2d');

    ctx.drawImage(this.bg_img, this.sx, this.sy, this.dw, this.dh,this.canvasX, this.canvasY, this.canvasW,this.canvasH);
  }
}
DrawMap.prototype.fitToWindow = function(){
  this.canvas.height = window.innerHeight;
  this.canvas.width = window.innerWidth;
}
DrawMap.prototype.putMarkerAtLatLng = function(lat,lng){

}
DrawMap.prototype.setCanvas = function(domObj){

}
DrawMap.prototype.createGrid = function(fillColor,perlat, perlng,aligned){
  /*
  * Create a grid of color fillColor with a line every perlat and every perlng
  */
  var ctx = this.canvas.getContext('2d');
  var bounds = this.getGeoBounds();
  //console.log(bounds);
  var lng_start = bounds.ll.lng;
  var lng_end = bounds.lr.lng;
  var lat_start = bounds.ul.lat;
  var lat_end = bounds.ll.lat;
  if(aligned){
    //snap to degree
    lng_start = Math.floor(bounds.ll.lng);
    lng_end = Math.ceil(bounds.lr.lng);
    lat_start = Math.ceil(bounds.ul.lat);
    lat_end = Math.floor(bounds.ll.lat);
  }
  while(lng_start < lng_end){
    this.drawLineLatLng(lat_start,lng_start,lat_end,lng_start,fillColor);
    lng_start+=perlng;
  }
  lng_start = bounds.ll.lng;
  while(lat_start > lat_end){
    this.drawLineLatLng(lat_start,lng_start,lat_start,lng_end,fillColor);
    lat_start-=perlat;
  }
}
DrawMap.prototype.cacheImage = function(imageURL){
  var that = this;
  var img = new Image();
  img.addEventListener('load',function(){
    that.cimg[imageURL]=this;
  });
  img.src = imageURL;
}
DrawMap.prototype.insertImageAtLatLng = function(low_lat,low_lng,up_lat,up_lng,imageURL){
  var that = this;


  var ll = that.convertLatLngToXY(low_lat,low_lng);
  var lr = that.convertLatLngToXY(low_lat,up_lng);
  var ul = that.convertLatLngToXY(up_lat,low_lng);
  var ur = that.convertLatLngToXY(up_lat,up_lng);
  var fill_size_x = -1*(ll.x-lr.x);
  var fill_size_y = (ll.y - ul.y);
  if(that.cimg[imageURL]){
    var ctx = that.canvas.getContext('2d')
    ctx.drawImage(that.cimg[imageURL],ul.x,ul.y,fill_size_x,fill_size_y);

    return;
  }
  var img = new Image();
  img.addEventListener('load',function(){

    var ctx = that.canvas.getContext('2d')
    ctx.drawImage(img,ul.x,ul.y,fill_size_x,fill_size_y);
    that.cacheImage(imageURL)
  });

  img.src=imageURL;
}
DrawMap.prototype.clearRectangleLatLng = function(low_lat,low_lng,up_lat,up_lng){
  var ctx = this.canvas.getContext('2d');
  var ll = this.convertLatLngToXY(low_lat,low_lng);
  var lr = this.convertLatLngToXY(low_lat,up_lng);
  var ul = this.convertLatLngToXY(up_lat,low_lng);
  var ur = this.convertLatLngToXY(up_lat,up_lng);
  var fill_size_x = -1*(ll.x-lr.x);
  var fill_size_y = (ll.y - ul.y);
  ctx.clearRect(ul.x,ul.y,fill_size_x,fill_size_y);
}
DrawMap.prototype.drawRectangeLatLng = function(low_lat,low_lng,up_lat,up_lng,fillColor){
  var ctx = this.canvas.getContext('2d');
  ctx.fillStyle=fillColor;
  var ll = this.convertLatLngToXY(low_lat,low_lng);
  var lr = this.convertLatLngToXY(low_lat,up_lng);
  var ul = this.convertLatLngToXY(up_lat,low_lng);
  var ur = this.convertLatLngToXY(up_lat,up_lng);
  var fill_size_x = -1*(ll.x-lr.x);
  var fill_size_y = (ll.y - ul.y);
  ctx.fillRect(ul.x,ul.y,fill_size_x,fill_size_y);
}
DrawMap.prototype.drawBorderLatLng = function(low_lat,low_lng,up_lat,up_lng,fillColor){
  var ctx = this.canvas.getContext('2d');
  ctx.strokeStyle=fillColor;
  ctx.lineWidth = 5;
  var ll = this.convertLatLngToXY(low_lat,low_lng);
  var lr = this.convertLatLngToXY(low_lat,up_lng);
  var ul = this.convertLatLngToXY(up_lat,low_lng);
  var ur = this.convertLatLngToXY(up_lat,up_lng);
  var fill_size_x = -1*(ll.x-lr.x);
  var fill_size_y = (ll.y - ul.y);
  ctx.strokeRect(ul.x,ul.y,fill_size_x,fill_size_y);
  ctx.lineWidth = 1;
}
DrawMap.prototype.drawRectangeXY = function(low_x,low_y,up_x,up_y,fillColor){
  var ctx = this.canvas.getContext('2d');
  ctx.fillStyle=fillColor;
  var ll = {x:low_x,y:low_y};
  var lr = {x:up_x,y:low_y};
  var ul = {x:low_x,y:up_y};
  var ur = {x:up_x,y:up_y};
  var fill_size_x = -1*(ll.x-lr.x);
  var fill_size_y = (ll.y - ul.y);
  ctx.fillRect(ul.x,ul.y,fill_size_x,fill_size_y);
}
DrawMap.prototype.drawPointFromLatLng = function(lat,lng,color,size){
  var ctx = this.canvas.getContext('2d');
  ctx.fillStyle = color;
  var point = this.convertLatLngToXY(lat,lng);
  ctx.fillRect(point.x,point.y,size,size);
}
DrawMap.prototype.drawLineLatLng = function(lat1,lng1,lat2,lng2,color){
  if(window.DRAWMAP_DEBUG){
    console.log("drawing line from "+lng1+", "+lat1+" to "+lng2+", "+lat2);
  }
  var ctx = this.canvas.getContext('2d');
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  var point1 = this.convertLatLngToXY(lat1,lng1);
  var point2 = this.convertLatLngToXY(lat2,lng2);
  ctx.beginPath();
  ctx.moveTo(point1.x,point1.y);
  ctx.lineTo(point2.x,point2.y);
  ctx.stroke();
  ctx.closePath();
  if(window.DRAWMAP_DEBUG){
    ctx.fillRect(point1.x,point1.y-3,5,5);
    ctx.fillRect(point2.x,point2.y-3,5,5);
  }

}
DrawMap.prototype.drawPointFromXY = function(x,y,color,size){
  var ctx = this.canvas.getContext('2d');
  ctx.fillStyle = color;
  ctx.fillRect(x,y,size,size);
}
DrawMap.prototype.getGeoBounds = function(){
  var ll = this.convertXYToGeo(0,this.canvas.height);
  var ul = this.convertXYToGeo(0,0);
  var lr = this.convertXYToGeo(this.canvas.width,this.canvas.height);
  var ur = this.convertXYToGeo(this.canvas.width,0);
  return {
    ll:ll,
    ul:ul,
    lr:lr,
    ur:ur
  };
}
DrawMap.prototype.getDrawnBoundsXY = function(){
  if(this.current_draw){

    //get max x, min x, max y, min y
    var llbb = this.getDrawnBoundsLatLng();
    var ll = this.convertLatLngToXY(llbb.ll.lat,llbb.ll.lng);
    var ul = this.convertLatLngToXY(llbb.ul.lat,llbb.ul.lng);
    var lr = this.convertLatLngToXY(llbb.lr.lat,llbb.lr.lng);
    var ur = this.convertLatLngToXY(llbb.lr.lat,llbb.lr.lng);
    return {
      ll:ll,
      ul:ul,
      lr:lr,
      ur:ur
    };
  }
}
DrawMap.prototype.intersectLatLng = function(minlat1,minlng1,maxlat1,maxlng1,minlat2,minlng2,maxlat2,maxlng2){

  return !(minlng2 > maxlng1 || maxlng2 < minlng1 || maxlat2 < minlat1 || minlat2 > maxlat1);
  //return (minlng2 > maxlng1 || maxlng2 < minlng1 || maxlat2 > minlat1 || minlat2 < maxlat1);
}
DrawMap.prototype.getDrawnBoundsLatLng = function(){
  if(this.current_draw){

    //get max x, min x, max y, min y
    var minx = 181.0;
    var miny = 91.0
    var maxx = -181.0;
    var maxy = -91.0;
    for(var i=0;i<this.current_draw.length;i++){
      if(this.current_draw[i].lng>maxx){
        maxx = this.current_draw[i].lng;
      }
      if(this.current_draw[i].lng<minx){
        minx = this.current_draw[i].lng;
      }
      if(this.current_draw[i].lat>maxy){
        maxy = this.current_draw[i].lat;
        //console.log("lat max: "+maxy);
      }
      if(this.current_draw[i].lat<miny){
        miny = this.current_draw[i].lat;
        //console.log("lat min: "+miny);
      }
    }
    if(miny==91.0 || minx==181.0 || maxy == -91.0 || maxx == -181.0){
      return;
    }
    var ur = {lat:maxy,lng:maxx};
    var lr = {lat:miny,lng:maxx};
    var ll = {lat:miny,lng:minx};
    var ul = {lat:maxy,lng:minx};
    return {
      ll:ll,
      ul:ul,
      lr:lr,
      ur:ur
    };
  }
}
DrawMap.prototype.geoCenterXY = function(){

  var lat = this.lat;
  var lng = this.lng;
  var width = this.canvas.width;
  var height = this.canvas.height;
  var x = width/2;
  var y = height/2;
  var zoom = 7;
   var s = Math.min(Math.max(Math.sin(1.5 * (Math.PI / 180)), -.9999), .9999),
       tiles = 1 << zoom,
       centerPoint={
                    x: 128 + 38 * (256/ 360),
                    y: 128 + 0.5 * Math.log((1 + s) / (1 - s))
                       *-(256 / (2 * Math.PI))
                   },
       mousePoint={
                    x:(centerPoint.x*tiles),
                    y:(centerPoint.y*tiles)
                  },
       mouseLatLng={
                    lat:(2 * Math.atan(Math.exp(((mousePoint.y/tiles) - 128)
                                        / -(256/ (2 * Math.PI)))) -
                            Math.PI / 2)/ (Math.PI / 180),
                    lng:(((mousePoint.x/tiles) - 128) / (256 / 360))
                   };

      if(window.DRAWMAP_DEBUG){
        console.log("x: "+x+"  y: "+y);
        this.drawPointFromLatLng(mouseLatLng.lat,mouseLatLng.lng,"#FF0000",10);
        this.drawPointFromXY(width/2,height/2,"#00FF00",10);
      }
      return mouseLatLng;

    }
DrawMap.prototype.convertLatLngToXY = function(lat,lng){
  //determine pixels per degree
  var bottom_point = this.convertXYToGeo(this.canvas.width,this.canvas.height);
  var top_point = this.convertXYToGeo(0,0);
  if(window.DRAWMAP_DEBUG&&window.DRAWMAP_DEBUG_VERBOSE){
    console.log("bottom lat,lng: "+bottom_point.lat+", "+bottom_point.lng);
    console.log("top lat,lng: "+top_point.lat+", "+top_point.lng);

  }
  var xperdeg = parseFloat(this.canvas.width)/(parseFloat(bottom_point.lng)-parseFloat(top_point.lng));
  var yperdeg = parseFloat(this.canvas.height)/(parseFloat(bottom_point.lat)-parseFloat(top_point.lat));
  if(window.DRAWMAP_DEBUG && window.DRAWMAP_DEBUG_VERBOSE){
    console.log("x pixels per degree: "+xperdeg+", y pixels per degree: "+yperdeg);
  }

  var coord = {
    x: Math.floor((parseFloat(lng) - parseFloat(top_point.lng))*xperdeg),
    y: Math.ceil((parseFloat(lat) - parseFloat(top_point.lat))*yperdeg)
  };
  return coord;
}
DrawMap.prototype.convertXYToGeo = function(mouseX,//x-coordinate of the mouseevent inside the element
            mouseY//y-coordinate of the mouseevent inside the element
            ){

              var lat = this.lat;
              var lng = this.lng;
              var width = this.canvas.width;
              var height = this.canvas.height;
              var zoom = 7;
	      var x = ((this.dw/this.canvasW)*mouseX)+this.sx-(this.canvasW/2);
	      var y = ((this.dh/this.canvasH)*mouseY)+this.sy-(this.canvasH/2);
       var s = Math.min(Math.max(Math.sin(lat * (Math.PI / 180)), -.9999), .9999),
       tiles = 1 << zoom,
       centerPoint={
                    x: 128 + lng * (256/ 360),
                    y: 128 + 0.5 * Math.log((1 + s) / (1 - s))
                       *-(256 / (2 * Math.PI))
                   },
       mousePoint={
                    x:(centerPoint.x*tiles)+x,
                    y:(centerPoint.y*tiles)+y
                  },
       mouseLatLng={
                    lat:(2 * Math.atan(Math.exp(((mousePoint.y/tiles) - 128)
                                        / -(256/ (2 * Math.PI)))) -
                            Math.PI / 2)/ (Math.PI / 180),
                    lng:(((mousePoint.x/tiles) - 128) / (256 / 360))
                   };

      return mouseLatLng;

    }
