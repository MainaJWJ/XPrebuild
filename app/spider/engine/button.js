// Button.js
function Button(collector,x,y,enabled,imageid,hover_imageid,game,game_state,w,h) {
	this.x = x;
	this.y = y;

	this.enabled = enabled;
	this.visible = true;

	this.imageid = imageid || 3;
	this.hover_imageid = hover_imageid || 4;

	if(imageid!=null&&hover_imageid!=null) {
		this.width = game.graphics.images[imageid].width || w;
		this.height = game.graphics.images[imageid].height || h;
	} else {
		this.width = w;
		this.height = h;
	}

	/*if(w!=null&&h!=null) {
		this.width = w;
		this.height = h;
	}*/

	this.hover_over = false;

	this.game_state = game_state || null;
	this.game = game;

	collector.push(this);
}
Button.prototype.checkIfClicked = function(x, y, game) {
	if(x > this.x && y > this.y && x < this.x+this.width && y < this.y+this.height&&this.enabled&&this.game.game_state==this.game_state) {
		this.click(x, y, game);
		return true;
	}
	return false;
}
Button.prototype.checkIfHovered = function(x,y,game) {
	if(x > this.x && y > this.y && x < this.x+this.width && y < this.y+this.height&&this.enabled&&this.game.game_state==this.game_state) {
		this.hover(x, y, game);
		this.hover_over = true;
		return true;
	}
	this.hover_over = false;
	return false;
}
Button.prototype.click = function(x, y, game) {
	alert('clicked'); // to be replaced with actual button functionality
}
Button.prototype.hover = function(x, y, game) {
	game.graphics.canvas.style.cursor = 'pointer'; 
}
