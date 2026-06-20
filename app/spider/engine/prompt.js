// Prompt.js
function Prompt(parent,imageid,x,y,enabled) {
	this.imageid = imageid;
	this.x = x;
	this.y = y;
	this.enabled = enabled;
	this.buttons = [];
	this.text = [];
	this.center = 1280/2;
	parent.push(this);
}
Prompt.prototype.addText = function(text, x, y, font, color) {
	this.text.push({text:text,x:x,y:y,font:font,color:color});
}