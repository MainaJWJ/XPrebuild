// Graphics.js
function Graphics(canvasid) {
	// Variable declaration
	this.queue = []; // draw queue (contains all draw orders)
	this.images = [];
	this.images_loaded = [];
	this.width = 880;
	this.height = 550;
	this.ratio = this.height/this.width;
	this.actual_width = 880;
	this.actual_height = 550;
	// Constructor
	this.canvasid = canvasid;
	this.canvas = document.getElementById(canvasid);
	this.ctx = this.canvas.getContext('2d');
	this.buffer_canvas = document.createElement('canvas');
	this.buffer_ctx = this.buffer_canvas.getContext('2d');
	$('#'+canvasid).width(this.actual_width);
	$('#'+canvasid).height(this.actual_height);
	this.ctx.canvas.width = this.width;
	this.ctx.canvas.height = this.height;
	this.buffer_ctx.canvas.width = this.width;
	this.buffer_ctx.canvas.height = this.height;
	this.fullscreen = false;
}
// Load functions
Graphics.prototype.loadImage = function(src) {
	var image = new Image();
	image.src = src;
	var id = this.images.length;
	this.images_loaded.push(false);
	var graphics = this;
	image.onload = function() {
		graphics.images_loaded[id] = true;
	}
	this.images.push(image);
	return id; // return image id
}
Graphics.prototype.areImagesLoaded = function() {
	for(var i = 0; i < this.images_loaded.length; i++) {
		if(!this.images_loaded[i]) return false;
	}
	return true;
}
// Main drawing functions
Graphics.prototype.clear = function() {
	this.buffer_ctx.fillStyle = '#000000';
	this.buffer_ctx.fillRect(0,0,this.width,this.height);
}
Graphics.prototype.addImageToQueue = function(imageid, x, y, z, w, h, sx, sy, sw, sh, effect) {
	imageid = imageid || 0;	x = x || 0;	y = y || 0;	w = w || this.images[imageid].width; h = h || this.images[imageid].height; sx = sx || 0; sy = sy || 0; sw = sw || this.images[imageid].width; sh = sh || this.images[imageid].height; z = z || 0;
	this.queue.push({type: 0, imageid: imageid, x: x, y: y, w: w, h: h, sx: sx, sy: sy, sw: sw, sh: sh, z: z, effect: effect});
}
Graphics.prototype.addStringToQueue = function(text, x, y, z, font, color) {
	this.queue.push({type: 1, text: text, x: x, y: y, z: z, font: font, color: color});
}
Graphics.prototype.addEffectToQueue = function(effect, x, y, w, h) {
	this.queue.push({type: 2, effect: effect, x: x, y: y, z: 1000, w: w, h: h});
}
Graphics.prototype.drawQueueToBuffer = function() {
	this.queue.sort(function(a,b) { return (a.z > b.z) ? 1 : -1; });
	for(var a = 0; a < this.queue.length; a++) {
		var item = this.queue[a];
		try {
			switch(item.type) {
				case 0:
					this.buffer_ctx.drawImage(this.images[item.imageid],item.sx,item.sy,item.sw,item.sh,item.x,item.y,item.w,item.h);
					
					// highlight
					if(item.effect!=null) {
						switch(item.effect) {
							case 'invert':
								var image_data = this.buffer_ctx.getImageData(item.x,item.y,item.w,item.h);
								var data = image_data.data;
								for(var i = 0; i < data.length; i += 4) {
									data[i] = 255 - data[i];
									data[i+1] = 255 - data[i+1];
									data[i+2] = 255 - data[i+2];
								}
								this.buffer_ctx.putImageData(image_data, item.x, item.y);
								break;
						}
					}
					break;
				case 1:
					this.buffer_ctx.font = item.font;
					this.buffer_ctx.fillStyle = item.color;
					this.buffer_ctx.fillText(item.text,item.x,item.y);
					break;
				case 2:
					switch(item.effect) {
						case 'invert':
							var image_data = this.buffer_ctx.getImageData(item.x,item.y,item.w,item.h);
							var data = image_data.data;
							for(var i = 0; i < data.length; i += 4) {
								data[i] = 255 - data[i];
								data[i+1] = 255 - data[i+1];
								data[i+2] = 255 - data[i+2];
							}
							this.buffer_ctx.putImageData(image_data, item.x, item.y);
							break;
					}
					break;
			}

		} catch(error) {
		}
	}
	this.queue = [];
}
// Draw buffer onto actual canvas (double buffering)
Graphics.prototype.buffer = function() {
	this.drawQueueToBuffer();
	this.ctx.drawImage(this.buffer_canvas,0,0);
}

// Change screen size
Graphics.prototype.setSize = function(w,h) {
	this.actual_width = w;
	this.actual_height = h;

	$('#'+this.canvasid).width(this.actual_width);
	$('#'+this.canvasid).height(this.actual_height);
}

// Fullscreen mode
Graphics.prototype.setFullscreen = function() {
	var screen_width = (window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth);
	var screen_height = (window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight) - 24; // Subtract menu bar height

	screen_width = Math.floor(screen_width/2)*2;
	screen_height = Math.floor(screen_height/2)*2;

	if(screen_height<screen_width*(this.height/this.width)) this.setSize(screen_height*(this.width/this.height),screen_height);
	else this.setSize(screen_width,screen_width*(this.height/this.width));

	if(screen_width>880&&screen_height>550) this.setSize(880,550);

	$('#'+this.canvasid).css({position:'absolute',marginLeft:0,marginTop:0,top:0,left:((screen_width-this.actual_width)/2)});
}