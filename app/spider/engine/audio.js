// Audio.js
function Audio() {
	this.sounds = [];
	this.muted = false;
}
Audio.prototype.addSound = function(sound) {
	this.sounds.push(sound);
}
Audio.prototype.playSound = function(id) {
	try {
		if(!this.muted) {
			if(id==6) {
				this.sounds[id].player.play();
			} else {
				this.sounds[id].player.currentTime = 0;
				this.sounds[id].player.play();
			}
		}
	} catch(err) {
		console.log(err);
	}
}
Audio.prototype.toggleMute = function() {
	if(!this.muted) {
		this.muted = true;
		for(var a = 0; a < this.sounds.length; a++) {
			this.sounds[a].player.pause();
			//this.sounds[a].player.currentTime = 0;
		}
	} else {
		this.muted = false;
	}
}
function Sound(src) {
	this.src = src;
	this.player = document.createElement('audio');
	this.player.src = this.src;
}