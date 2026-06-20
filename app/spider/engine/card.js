// Card.js
function Card(suite,rank,open,x,y,locked) {
	suite = suite || 's'; rank = rank || '2'; open = open || false; x = x || 0; y = y || 0;
	this.id = -1;
	this.pool = -1;
	this.suite = suite; // s = spades, h = hearts, d = diamonds, c = clubs (all chars)
	this.rank = rank; // 2, 3, 4, 5, 6, 7, 8, 9, 10, j, q, k, a (all chars)
	this.open = open; // is the card open (turned up) or closed (turned down)	
	this.visible = true;
	this.x = x;
	this.y = y;
	this.z = 0;
	this.card_sprite_id = -1;
	this.locked = locked; // card cant be moved unless not locked
}

Card.prototype.getCardSprite = function(cam) {
	if(this.card_sprite_id!=-1) {
		return cam.card_sprites[this.card_sprite_id];
	}
}