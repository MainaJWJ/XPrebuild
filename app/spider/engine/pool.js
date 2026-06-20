// Pool.js
function Pool(card_manager,locked,size) {
	this.card_ids = [];
	this.x = 0;
	this.y = 0;
	this.width = 0;
	this.height = 0;
	this.size = size || 0;
	this.locked = locked || true;
	this.card_manager = card_manager;
	this.id = card_manager.pools.length;
	card_manager.pools.push(this);
}
Pool.prototype.addCard = function(card) {
	this.card_ids.push(card.id);
	card.pool = this.id;
	if(this.card_ids.length == 1) {
		if((this.x==0&&this.y==0)||this.id<=0) {
			this.x = card.x;
			this.y = card.y;
		} 
		this.width = this.card_manager.card_width;
		this.height = this.card_manager.card_height;
	}
	card.x -= this.x;
	card.y -= this.y;
	if(this.size==0&&this.id!=0) this.calibrateCards(); // fixes card alignment
}
Pool.prototype.removeCard = function(card,do_not_calibrate) {
	this.card_ids.splice(this.card_ids.indexOf(card.id),1);
	this.width = this.card_manager.card_width;
	this.height = this.card_manager.card_height;
	for(var i = 1; i < this.card_ids.length; i++) {
		card = this.card_manager.cards[this.card_ids[i]];
		if(card.x + this.card_manager.card_width > this.width) this.width = card.x + this.card_manager.card_width; 
		if(card.y + this.card_manager.card_height > this.height) this.height = card.y + this.card_manager.card_height; 
	}
	if(this.card_ids.length==0) {
		this.width = this.card_manager.card_width;
		this.height = this.card_manager.card_height;
	}
	//if(this.size==0) this.calibrateCards(); // fixes card alignment
}
Pool.prototype.calibrateCards = function() {
	var closed_card_count = 0;
	var open_offset = this.card_manager.open_card_y_offset;
	for(var a = 0; a < this.card_ids.length; a++) {
		var card = this.card_manager.cards[this.card_ids[a]];
		card.x = 0;
		if(card.open) {
			if(a==closed_card_count) {
				var total_height = closed_card_count*this.card_manager.closed_card_y_offset+(this.card_ids.length-closed_card_count)*this.card_manager.open_card_y_offset+this.card_manager.card_height;
				if(total_height>400) open_offset = (400-(closed_card_count*this.card_manager.closed_card_y_offset+this.card_manager.card_height))/((this.card_ids.length)-closed_card_count);
			}
			card.y = Math.round(closed_card_count*this.card_manager.closed_card_y_offset+(a-closed_card_count)*open_offset);
		} else {
			card.y = Math.round(closed_card_count*this.card_manager.closed_card_y_offset);
			closed_card_count++;
		}
		if(card.y + this.card_manager.card_height > this.height) this.height = card.y+this.card_manager.card_height;
		if(card.y < 0) this.y = this.y+card.y;
	}
}
Pool.prototype.getFirstCard = function() {
	return this.card_manager.cards[this.card_ids[this.card_ids.length-1]];
}
Pool.prototype.getCard = function(index) {
	return this.card_manager.cards[this.card_ids[index]];
}
Pool.prototype.getLastCard = function() {
	return this.card_manager.cards[this.card_ids[0]];
}
Pool.prototype.amountOfCards = function() {
	return this.card_ids.length;
}