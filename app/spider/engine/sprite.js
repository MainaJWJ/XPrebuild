// Sprite.js
function Sprite(imageid, x, y, w, h, sx, sy, sw, sh) {
	this.imageid = imageid;
	this.x = x || 0;
	this.y = y || 0;
	this.width = w || 0;
	this.height = h || 0;
	this.sx = sx || 0;
	this.sy = sy || 0;
	this.sw = sw || 0;
	this.sh = sh || 0;
	this.frame = 0;
	this.z = 0;
	this.visible = true;
}
Sprite.prototype.setPosition = function(x,y) {
	this.x = x;
	this.y = y;
}
Sprite.prototype.setSize = function(w,h) {
	this.width = w;
	this.height = h;
}
Sprite.prototype.setSource = function(sx, sy, sw, sh) {
	this.sx = sx;
	this.sy = sy;
	this.sw = sw;
	this.sh = sh;
}
Sprite.prototype.setZ = function(z) {
	this.z = z;
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// CardSprite class which will link to the cards in game and allow for animation of them
CardSprite.prototype = new Sprite();
CardSprite.prototype.constructor = CardSprite;
function CardSprite(card,game) {
	var cm = game.card_manager;

	if(card.pool == -2) card.pool = 12;
	if(card.pool == -1) card.pool = 11;

	var pool = game.card_manager.pools[card.pool];

	this.imageid = game.draw_manager.images['cards'];

	try {
		this.x = pool.x + card.x;
		this.y = pool.y + card.y;
	} catch(err) {
		this.x = 0;
		this.y = 0;
	}

	this.width = cm.card_width;
	this.height = cm.card_height;

	this.dx = this.x;
	this.dy = this.y;

	this.vx = 0;
	this.vy = 0;

	this.ticks = 0;
	this.end_time = 0;

	this.flipping = false;

	this.card_id = card.id;

	this.setSource(game);

	this.effect = null;
	this.effect_start = null;
	this.effect_end = null;

	this.state = 0; // 0 idle, 1 overridden, 2 animating
}

CardSprite.prototype.findDestination = function(game) { 
	var cm = game.card_manager;
	var card = cm.cards[this.card_id];
	var pool = cm.pools[card.pool];

	if(typeof(pool)=='undefined') {
		cm.dx = 204;
		cm.dy = 70;
	} else {
		this.dx = pool.x + card.x;
		this.dy = pool.y + card.y;
	}
}

CardSprite.prototype.setDestination = function(x,y) {
	this.dx = x;
	this.dy = y;
}

CardSprite.prototype.setSource = function(game) {
	var cm = game.card_manager;
	var card = cm.cards[this.card_id];

	this.sx = (cm.ranks.indexOf(card.rank))*(cm.card_sprite_width+cm.card_sprite_x_offset)+cm.card_sprite_x_offset;
	this.sy = (cm.suites.indexOf(card.suite))*(cm.card_sprite_height+cm.card_sprite_y_offset)+cm.card_sprite_y_offset;
	this.sw = cm.card_sprite_width;
	this.sh = cm.card_sprite_height;
}

CardSprite.prototype.setVelocity = function(vx,vy) {
	this.vx = vx;
	this.vy=  vy;
}

CardSprite.prototype.setVelocityAccordingToTime = function(time) {
	this.vx = (this.dx - this.x)/time;
	this.vy = (this.dy - this.y)/time;
	this.end_time = time;
	this.ticks = 0;
}

CardSprite.prototype.flip = function(time,direction) {
	this.flipping = true;
	this.end_time = time;
}

CardSprite.prototype.draw = function(game) {
	var gfx = game.graphics;
	var cm = game.card_manager;
	var rules = cm.rules;
	var card = cm.cards[this.card_id];

	var tick = game.tick;

	var selected_cards = rules.last_selected_pool.card_ids;
	/*var effect = this.effect;
	for(var a = 0; a < selected_cards.length; a++) {
		if(card.id == selected_cards[a]) effect = 'invert';
	}*/

	var effect = null;
	if(tick>this.effect_start&&tick<this.effect_end) {
		effect = this.effect;
	}

	if(this.visible) {
		if(card.open) {
			gfx.addImageToQueue(game.draw_manager.images['cards'],
								this.x,
								this.y,
								this.z,
								this.width,
								this.height,
								this.sx,
								this.sy,
								this.sw,
								this.sh,
								effect);
		} else {
			gfx.addImageToQueue(game.draw_manager.images['cards'],
								this.x,
								this.y,
								this.z,
								this.width,
								this.height,
								cm.card_sprite_x_offset,
								4*(cm.card_sprite_height+cm.card_sprite_y_offset)+cm.card_sprite_y_offset,
								this.sw,
								this.sh);
		}
	}
}
CardSprite.prototype.setEffect = function(effect, start, end) {
	this.effect = effect;
	this.effect_start = start;
	this.effect_end = end;
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Class to handle the cardsprites and animate them if required
function CardAnimationManager() {
	this.card_sprites = [];

	this.is_animating = false;
	this.animation_speed = 10;

	this.animation_queue = [];

	this.game = null;

	this.sync_z = false;
}

CardAnimationManager.prototype.setGame = function(game) {
	this.game = game;
}

CardAnimationManager.prototype.toggleAnimationMode = function() {
	var game = this.game;
	if(!this.is_animating) {
		game.pause();
		game.enabled = false;
		this.is_animating = true;
	} else {
		game.resume();
		game.enabled = true;
		this.is_animating = false;
		this.syncZ();
		game.rules.hasWon();
	}
}

CardAnimationManager.prototype.addLinkedCardSprite = function(card,x,y) {
	var cs = new CardSprite(card,this.game);
	//cs.setSource(this.game);
	card.card_sprite_id = this.card_sprites.length;
	cs.z = this.card_sprites.length;
	cs.x = x;
	cs.y = y;
	this.card_sprites.push(cs);

	return cs;
}

CardAnimationManager.prototype.addNonLinkedCardSprite = function(card) {
	var cs = new CardSprite(card,this.game);
	cs.card_id = null;
	this.card_sprites.push(cs);

	return cs;
}

CardAnimationManager.prototype.removeCardSprite = function(variable) {
	if(typeof(variable)=='object') {
		var card = variable;
		var id = card.card_sprite_id;
		
		this.removeFromAnimationQueue(id);

		for(var a = id; a < this.card_sprites.length; a++) {
			var card_sprite = this.card_sprites[a];
			var ccard = this.game.card_manager.cards[card_sprite.card_id];
			ccard.card_sprite_id--;
		}

		for(var a = 0; a < this.animation_queue.length; a++) {
			this.animation_queue[a][0]--;
		}

		this.card_sprites.splice(id,1);
	} else if(typeof(variable)=='number') {
		var id = variable;

		for(var a = id; a < this.card_sprites.length; a++) {
			var card_sprite = this.card_sprites[a];
			var ccard = this.game.card_manager.cards[card_sprite.card_id];
			ccard.card_sprite_id--;
		}

		for(var a = 0; a < this.animation_queue.length; a++) {
			this.animation_queue[a][0]--;
		}

		this.card_sprites.splice(id,1);		
	}
}

CardAnimationManager.prototype.clearAnimationQueue = function() {
	this.animation_queue = [];
}

CardAnimationManager.prototype.addToAnimationQueue = function(id,cycle,sound) {
	for(var a = 0; a < this.animation_queue.length; a++) {
		if(this.animation_queue[a][0] == id) return false;
	}
	var sound = (sound!=null)?sound:false;
	this.animation_queue.push([id,cycle,sound]);
}

CardAnimationManager.prototype.removeFromAnimationQueue = function(id) {
	for(var a = 0; a < this.animation_queue.length; a++) {
		if(this.animation_queue[a][0] == id) {
			//alert('Found animation order for id! ' + a + ' ' + id);
			this.animation_queue.splice(a,1);
		}
	}
}

CardAnimationManager.prototype.syncCardSprites = function() {
	var game = this.game;
	var cm = game.card_manager;

	//this.animation_queue = [];

	for(var a = 0; a < this.card_sprites.length; a++) {
		var card_sprite = this.card_sprites[a];

		if(card_sprite.card_id!=null) {
			card_sprite.findDestination(game);
			if(!card_sprite.flipping) card_sprite.setVelocityAccordingToTime(this.animation_speed/2);

			//var card = game.card_manager.cards[card_sprite.card_id];
			
			if(card_sprite.vx != 0 || card_sprite.vy != 0) {
				this.addToAnimationQueue(a,0);
			}
		}
	}

	if(this.animation_queue.length > 0) {
		this.syncZ();
		this.move();
	}
}

CardAnimationManager.prototype.syncCardSprite = function(card,cycle,speed) {
	var game = this.game;
	var cm = game.card_manager;

	var card_sprite = this.card_sprites[card.card_sprite_id];

	var animation_speed = this.animation_speed;
	if(speed!=null) animation_speed = speed;

	card_sprite.findDestination(game);
	card_sprite.setVelocityAccordingToTime(animation_speed);
	card_sprite.z = 300;

	if(card_sprite.vx != 0 || card_sprite.vy != 0) {
		this.addToAnimationQueue(card.card_sprite_id,cycle);
		//this.move();
	}
}

CardAnimationManager.prototype.syncZ = function() {
	var game = this.game;
	var cm = game.card_manager;

	for(var a = 0; a < cm.pools.length; a++) {
		var pool = cm.pools[a];
		for(var b = 0; b < pool.card_ids.length; b++) {
			var card = pool.getCard(b);
			var card_sprite = this.card_sprites[card.card_sprite_id];
			if(typeof(card_sprite)!='undefined') {
				if(card.card_sprite_id!=-1) card_sprite.z = game.draw_manager.layer[1] + b;
				if(a==11) card_sprite.z = game.draw_manager.layer[1] + 100 + b;
				if(a==0) card_sprite.z = game.draw_manager.layer[2] + b;
			} 
		}
	}
}

CardAnimationManager.prototype.animate = function(sync_z) {
	if(!this.is_animating) this.toggleAnimationMode();
	this.sync_z = sync_z;
}

CardAnimationManager.prototype.move = function() {
	for(var a = 0; a < this.animation_queue.length; a++) {
		var card_sprite = this.card_sprites[this.animation_queue[a][0]];
		if(card_sprite!=null) {
			var card = this.game.card_manager.cards[card_sprite.card_id];

			if(card_sprite.dy != 444) {
				card_sprite.x = card_sprite.dx;
				card_sprite.y = card_sprite.dy;			
			}
		}
	}

	//this.stopAnimating();
}

CardAnimationManager.prototype.tick = function() {
	if(this.is_animating) {
		var new_animation_queue = [];
		var cm = this.game.card_manager;

		for(var a = 0; a < this.animation_queue.length; a++) {
			if(this.animation_queue[a][1]==0) {
				var card_sprite = this.card_sprites[this.animation_queue[a][0]];

				if(typeof(card_sprite)!='undefined') {
					card_sprite.x += card_sprite.vx;
					card_sprite.y += card_sprite.vy;

					var card = cm.cards[card_sprite.card_id];
					var pool = cm.pools[card.pool];

					//if(this.sync_z) 
					if(card_sprite.vx != 0) card_sprite.z = this.game.draw_manager.layer[4]+pool.card_ids.indexOf(card.id);
				
					card_sprite.ticks++;

					// flipping cards
					if(card_sprite.flipping) {
						var x = card_sprite.ticks/card_sprite.end_time;

						var width = 4*Math.pow(x-0.5,2)*cm.card_width;
						var dx = -8*(x-0.5)*cm.card_width/2*(1/card_sprite.end_time);

						if(width<1) width=1;

						card_sprite.width = width;
						card_sprite.x += dx;

						var card = cm.getCard(card_sprite.card_id);

						if(x>0.5&&!card.open) {
							card.open = true;
						}
					}

					if(card_sprite.ticks >= card_sprite.end_time) {
						card_sprite.x = card_sprite.dx;
						card_sprite.y = card_sprite.dy;
						if(card_sprite.flipping) {
							card_sprite.flipping = false;
							card_sprite.width = cm.card_width;
						}

						var sound = this.animation_queue[a][2];
						if(sound!=false&&typeof(sound)!='undefined') {
							this.game.audio.playSound(sound);
						}
					} else {
						new_animation_queue.push([this.animation_queue[a][0],0,this.animation_queue[a][2]]);
					}
				}	
			} else {
				new_animation_queue.push([this.animation_queue[a][0],this.animation_queue[a][1],this.animation_queue[a][2]]);
			}
		}

		this.animation_queue = new_animation_queue;

		var has_animations_in_cycle = false;
		for(var a = 0; a < this.animation_queue.length; a++) {
			if(this.animation_queue[a][1]==0) {
				has_animations_in_cycle = true;
				break;
			}
		}

		if(!has_animations_in_cycle) {
			for(var a = 0; a < this.animation_queue.length; a++) {
				this.animation_queue[a][1]--;
			}
			if(this.sync_z) this.syncZ();
		}

		if(this.animation_queue.length == 0) {
			this.stopAnimating();
		}
	}
}

CardAnimationManager.prototype.flipCard = function(card) {
	var cm = this.game.card_manager;

	var card_sprite = this.card_sprites[card.card_sprite_id];
	var card = cm.getCard(card_sprite.card_id);
	card.open = true;
}

CardAnimationManager.prototype.stopAnimating = function() {
	this.animation_queue = [];
	if(this.is_animating) this.toggleAnimationMode();
	
	this.sync_z = false;

	this.syncZ();
}

CardAnimationManager.prototype.introAnimation = function() {
	animation_speed = 5;
	for(var a = 0; a <= 10; a++) {
		var pool = this.game.card_manager.pools[1+a%10];
		var card = pool.getFirstCard();

		var card_sprite = this.card_sprites[card.card_sprite_id];
		card_sprite.x = 792;
		card_sprite.y = 444;

		card_sprite.findDestination(this.game);
		card_sprite.setVelocityAccordingToTime(animation_speed);
		card_sprite.z = 500-a;

		if(card_sprite.vx != 0 || card_sprite.vy != 0) {
			this.addToAnimationQueue(card.card_sprite_id,a,7);
		}
	}
	for(var a = 54; a <= (54+4); a++) {
		var card_sprite = this.card_sprites[a];

		card_sprite.findDestination(this.game);
		card_sprite.setVelocityAccordingToTime(animation_speed);
		card_sprite.z = 500;

		if(card_sprite.vx != 0 || card_sprite.vy != 0) {
			this.addToAnimationQueue(a,11);
		}
	}
	this.animate(true);
}

CardAnimationManager.prototype.printAnimationQueue = function() {
	var text = 'ID - Order - Sound - Is object\n';
	for(var a = 0; a < this.animation_queue.length; a++) {
		var is_object = (typeof(this.card_sprites[this.animation_queue[a][0]])=='undefined')?false:true;
		text += '' + this.animation_queue[a][0] + '    ' + this.animation_queue[a][1] + '          ' + this.animation_queue[a][2] + '          ' + is_object + ' \n';
	}
	alert(text);
}