// CardManager.js
function CardManager() {
	this.graphics = null;
	this.rules = null;
	this.cards = [];
	this.pools = [];
	this.suites = ['c','h','s','d'];
	this.ranks = 		['a','2','3','4','5','6','7','8','9','1','j','q','k'];
	this.rank_score = 	[ 0,  1,  2,  3,  4,  5,  6,  7,  8,  9,  10, 11, 12];
	this.card_width = 71;
	this.card_height = 96;
	this.card_sprite_width = 71;
	this.card_sprite_height = 96;
	this.card_sprite_x_offset = 0;
	this.card_sprite_y_offset = 0;
	this.open_card_y_offset = 28;
	this.closed_card_y_offset = 7;
	// z index
	this.z_index = 0;
}
CardManager.prototype.handleMouseDown = function(x,y,game) {
	for(var i = 0; i < this.pools.length; i++) {
		var pool = this.pools[i];
		if(x>pool.x&&y>pool.y&&x<pool.x+pool.width&&y<pool.y+pool.height) {
			if(!pool.locked) {
				this.rules.poolSelect(pool);
			} else {
				var interaction_cards = [];
				x -= pool.x;
				y -= pool.y;
				for(var j = 0; j < pool.card_ids.length; j++) {
					var card = this.cards[pool.card_ids[j]];
					if(x>card.x&&y>card.y&&x<card.x+this.card_width&&y<card.y+this.card_height) {
						if(!card.locked&&card.open) interaction_cards.push(card);
					}
				}
				if(interaction_cards.length>0) {
					interaction_cards.sort(function(a,b) { return (a.z < b.z) ? 1 : -1; });
					this.rules.cardSelect(interaction_cards[0], pool, i);
				}
			}
			break;
		}
	}
}
CardManager.prototype.handleMouseUp = function(x,y,game) {
	if(game.interacted_pool!=null) {
		var valid_move = false;

		// interacted pool rectangle
		var ip_rect = {x:game.interacted_pool.x,y:game.interacted_pool.y,w:game.interacted_pool.width,h:game.interacted_pool.height};

		// check for collisions with pools
		var collisions = [];

		for(var i = 1; i < 11; i++) {
			if(i==this.rules.old_pool_index) continue;
			var pool = this.pools[i];
			var pool_rect = {x:pool.x,y:pool.y,w:pool.width,h:pool.height};

			var collision = game.checkRectangleCollision(ip_rect,pool_rect);
			if(collision!=false) {
				collisions.push({pool:pool,area:collision});
			}
		}

		// sort collisions by collision area
		collisions.sort(function(a,b) {
			return b.area-a.area;
		});

		// test collisions
		for(var i = 0; i < collisions.length; i++) {
			var pool = collisions[i].pool;
			if(this.rules.deselectOverAnotherPool(pool)) {
				valid_move = true;
				break;
			}
		}

		// if final pool position is not a valid play
		if(!valid_move) {
			this.rules.deselectOverNothing();
		}

		this.rules.clearTempPool();
		game.card_animation_manager.syncCardSprites(this);
		game.interacted_pool = null;
	} else {
		game.rules.last_selected_pool.card_ids = [];
	}
}
CardManager.prototype.handleMouseMove = function(x,y,game) {
	if(x > 0 && y > 0 && x < game.graphics.width && y < game.graphics.height) {
		if(game.mouse_down) {
			var delta_mouse_x = x - game.old_mouse_x;
			var delta_mouse_y = y - game.old_mouse_y;
			if(game.interacted_pool!=null) {
				game.interacted_pool.x += delta_mouse_x;
				game.interacted_pool.y += delta_mouse_y;
				game.interacted_pool.z = this.z_index+1;

				for(var a = 0; a < game.interacted_pool.card_ids.length; a++) {
					var card = game.interacted_pool.getCard(a);
					game.card_animation_manager.syncCardSprite(card);
					game.card_animation_manager.card_sprites[card.card_sprite_id].z = game.draw_manager.layer[2]+a;
				}
				game.card_animation_manager.move();
			}
		}
	}
	game.old_mouse_x = x;
	game.old_mouse_y = y;
}
CardManager.prototype.addPoolToPool = function(from_pool, to_pool) {
	//var closed_card_count = 0;
	for(var i = 0; i < from_pool.card_ids.length; i++) {
		var card = this.cards[from_pool.card_ids[i]];
		to_pool.addCard(card);
	}

	for(var i = 0; i < from_pool.card_ids.length; i++) {
		var card = this.cards[from_pool.card_ids[i]];
		from_pool.removeCard(card);
	}
}
CardManager.prototype.setGraphics = function(graphics) {
	this.graphics = graphics;
}
CardManager.prototype.setRules = function(rules) {
	this.rules = rules;
};
CardManager.prototype.addCard = function(card) {
	this.cards.push(card);
	card.id = this.cards.length-1;
	card.z = this.z_index++;
	card.old_z = card.z;
	return card;
}
CardManager.prototype.removeCard = function(card) {
	this.cards.splice(card.id,1);
}
CardManager.prototype.addPool = function(pool) {
	this.pools.push(pool);
	return pool;
}
CardManager.prototype.removePool = function(pool_id) {
	this.pools.splice(pool_id,1);
}
CardManager.prototype.addCardsToQueue = function() {
	for(var i = 0; i < this.pools.length; i++) {
		this.pools[i].draw(this);
	}
}
CardManager.prototype.getCardScore = function(card, check_suite) {
	if(check_suite) {
		if(card.open)
			return this.rank_score[this.ranks.indexOf(card.rank)]+20*this.suites.indexOf(card.suite);
		else
			return -1;
	} else {
		if(card.open)
			return this.rank_score[this.ranks.indexOf(card.rank)];
		else
			return -1;
	}
}
CardManager.prototype.getPool = function(index) {
	return this.pools[index];
}
CardManager.prototype.getCard = function(index) {
	return this.cards[index];
}