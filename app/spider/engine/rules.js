// Rules.js
function Rules(game, card_manager) {
	this.game = game;
	this.card_manager = card_manager;
	this.old_pool_index = null;
	this.temp_pool = new Pool(this.card_manager);
	// game specific rules
	this.cards = [];
	this.original_cards = [];
	this.shuffles = 5;
	this.score = 500;
	this.history = [];
	this.move = 0;
	this.total_moves = 0;
	this.has_played_a_move = false;
	this.playing = false;
	this.suite_count = 1;
	this.has_won = false;

	this.last_selected_pool = new Pool(card_manager,false,0);

	this.extended_card = false; 

	this.hint_moves = [];
	this.hint_cycle_index = -1;
	this.hint_last_signature = null;
}
Rules.prototype.setup = function(suite_count,reset) {
	// pause system reset
	this.game.total_paused_time = 0;
	this.game.pause_start_time = 0;
	this.game.paused = false;
	this.game.enabled = true;
	// define suite
	this.shuffles = 5;
	this.score = 500;
	this.cards = [];
	this.history = [];
	this.move = 0;
	this.total_moves = 0;
	this.card_manager.cards = [];
	this.card_manager.pools = [];
	this.old_pool_index = null;
	this.temp_pool = new Pool(this.card_manager);
	this.has_played_a_move = false;
	this.playing = true;
	this.game.card_animation_manager.stopAnimating();
	this.game.card_animation_manager.card_sprites = [];
	this.game.tick = -1;
	this.suite_count = suite_count;
	this.has_won = false;

	this.last_selected_pool.card_ids = [];

	this.hint_moves = [];
	this.hint_cycle_index = -1;
	this.hint_last_signature = null;

	var cards = [];
	if(!reset) {
		this.card_manager.z_index++;
		this.original_cards = [];
		var suites = [];
		switch(suite_count) {
			case 1:
				suites = ['s'];
				break;
			case 2:
				suites = ['s','h'];
				break;
			case 4:
				suites = ['s','h','c','d'];
				break;
		}
		// 2 decks of cards
		for(var i = 0; i < this.card_manager.ranks.length; i++) {
			var rank = this.card_manager.ranks[i];
			for(var j = 0; j < 8; j++) {
				cards.push(suites[j%suite_count]+rank);
			}
		}
		// shuffle the cards
		for(var a = 0; a < 1000; a++) {
			first = Math.floor(Math.random()*cards.length);
			second = Math.floor(Math.random()*cards.length);
			var temp = cards[first];
			cards[first] = cards[second];
			cards[second] = temp;
		}
		for(var a = 0; a < cards.length; a++)
			this.original_cards.push(cards[a]);
	} else {
		for(var a = 0; a < this.original_cards.length; a++)
			cards.push(this.original_cards[a]);
	}

	// game cards
	for(var x = 0; x < 4; x++) {
		var pool = new Pool(this.card_manager);
		for(var y = 0; y < 6; y++) {
			var v = (y>4)?true:false; // 4
			var suite = cards[0][0];
			var rank = cards[0][1]; 
			var card = this.card_manager.addCard(new Card(suite,rank,v,17+x*86,37+y*this.card_manager.closed_card_y_offset,!v));
			cards.splice(0,1);
			pool.addCard(card);

			if(v) this.game.card_animation_manager.addLinkedCardSprite(card,792,444);
			else this.game.card_animation_manager.addLinkedCardSprite(card,17+x*86,37+y*this.card_manager.closed_card_y_offset);
		}
	}
	for(var x = 4; x < 10; x++) {
		var pool = new Pool(this.card_manager);
		for(var y = 0; y < 5; y++) {
			var v = (y>3)?true:false; // 3
			var suite = cards[0][0];
			var rank = cards[0][1]; 
			var card = this.card_manager.addCard(new Card(suite,rank,v,17+x*86,37+y*this.card_manager.closed_card_y_offset,!v));
			cards.splice(0,1);
			pool.addCard(card);

			if(v) this.game.card_animation_manager.addLinkedCardSprite(card,792,444);
			else this.game.card_animation_manager.addLinkedCardSprite(card,17+x*86,37+y*this.card_manager.closed_card_y_offset);
		}
	}
	this.cards = cards;

	// shuffle cards
	var shuffle_pool = new Pool(this.card_manager);
	shuffle_pool.size = 1;
	for(var x = 0; x < 5; x++) {
		var card = this.card_manager.addCard(new Card('s','a',false,792-x*9,444,true));
		shuffle_pool.addCard(card);
		this.game.card_animation_manager.addLinkedCardSprite(card,792,444);
	}
	shuffle_pool.id = -1; // used for tracking
	shuffle_pool.locked = false;
	shuffle_pool.width = this.card_manager.card_width+(shuffle_pool.amountOfCards()-1)*9;

	var dx = 792-756;
	shuffle_pool.x -= dx;
	for(var a = 0; a < shuffle_pool.card_ids.length; a++) {
		var card = this.game.card_manager.cards[shuffle_pool.card_ids[a]];
		card.x += dx;
	}
	
	// full stack pool
	this.stack_pool = new Pool(this.card_manager);
	this.stack_pool.id = -2; // used for tracking
	this.stack_pool.locked = true;
	this.stack_pool.size = 1;	
	this.stack_pool.x = 17;
	this.stack_pool.y = 444;

	this.game.card_animation_manager.introAnimation();
}
// function that is called whenever a pool is selected
Rules.prototype.poolSelect = function(pool) {
	if(pool.id==-1&&this.playing) { // shuffle card
		if(this.shuffles>0) {
			this.last_selected_pool.card_ids = [];

			for(var q = 1; q < 11; q++) {
				var current_pool = this.card_manager.pools[q];
				if(current_pool.card_ids.length<1) {
					var game = this.game;
					//game.enabled = false;
					game.paused = true;
					game.active_prompt = 3;
					game.prompt_mode = true;
					return;
				}
			}
			
			var card = this.card_manager.cards[pool.card_ids[pool.card_ids.length-1]]
			this.game.card_animation_manager.removeCardSprite(card);
			pool.removeCard(card);

			pool.width = this.card_manager.card_width+(5-1)*9;

			for(var q = 1; q < 11; q++) {
				var current_pool = this.card_manager.pools[q];
				var suite = this.cards[0][0];
				var rank = this.cards[0][1]; 
				var card = this.card_manager.addCard(new Card(suite,rank,true,50+current_pool.x,current_pool.y+current_pool.card_ids.length*30,false));
				this.cards.splice(0,1);
				card.x = current_pool.x;
				card.y = current_pool.y+current_pool.card_ids.length*30;
				current_pool.addCard(card);
			}

			this.game.card_animation_manager.syncCardSprites();

			for(var q = 1; q < 11; q++) {
				var current_pool = this.card_manager.pools[q];
				var card = current_pool.getFirstCard();

				this.game.card_animation_manager.addLinkedCardSprite(card,pool.x+(4-pool.card_ids.length)*9,pool.y);

				var card_sprite = this.game.card_animation_manager.card_sprites[card.card_sprite_id];

				card_sprite.findDestination(this.game);
				card_sprite.setVelocityAccordingToTime(this.game.card_animation_manager.animation_speed/2);
				card_sprite.z = 500-q;

				if(card_sprite.vx != 0 && card_sprite.vy != 0) {
					this.game.card_animation_manager.addToAnimationQueue(card.card_sprite_id,q-1,7);
				}
			}

			//this.game.audio.playSound(0); 
			this.shuffles--;
			//this.score--;

			this.history.push((this.move++)+'-s');
			this.total_moves++;

			this.checkRows();

			this.history = [];
			this.move = 0;				

			if(!this.has_played_a_move) this.game.startClock();

			this.game.card_animation_manager.animate();
		}
	}	
	else {
		this.game.interacted_pool = pool; // found a movable pool
	}
}
// Triggered when clicking on a card
Rules.prototype.cardSelect = function(card, pool, poolid) {
	// case 2 (cards will be dragged)
	if(pool.id==0||!this.playing) return;
	var interacted_card_index = pool.card_ids.indexOf(card.id);
	var ids = [];
	for(var k = 0; k < pool.card_ids.length; k++) ids.push(pool.card_ids[k]);
	for(var l = interacted_card_index; l < pool.card_ids.length-1; l++) {
		var current_card = this.card_manager.cards[ids[l]];
		var next_card = this.card_manager.cards[ids[l+1]];
		if(this.card_manager.getCardScore(current_card,true)!=this.card_manager.getCardScore(next_card,true)+1) {
			// open card if it is invisible
			if(!this.extended_card) {
				var current_card_sprite = this.game.card_animation_manager.card_sprites[this.card_manager.cards[ids[interacted_card_index]].card_sprite_id];

				var next_card_sprite = this.game.card_animation_manager.card_sprites[this.card_manager.cards[ids[interacted_card_index+1]].card_sprite_id];

				var dy = next_card_sprite.y - current_card_sprite.y;

				if(dy < this.card_manager.open_card_y_offset) {
					for(var u = (interacted_card_index+1); u < pool.card_ids.length; u++) {
						var current_card = this.card_manager.cards[ids[u]];

						var card_sprite = this.game.card_animation_manager.card_sprites[current_card.card_sprite_id];
						card_sprite.y += Math.floor(this.card_manager.open_card_y_offset-dy);
					}
				}
				this.extended_card = true;
			}
			return false;
		}
	}

	// save old pool state and clear temp
	this.old_pool_index = poolid;
	this.temp_pool.card_ids = [];
	// move card stack to the temp poll
	var interacted_card_index = pool.card_ids.indexOf(card.id);
	var length = pool.card_ids.length;

	var dy = this.card_manager.open_card_y_offset;
	if((length-interacted_card_index)>1) {
		var dy = this.card_manager.cards[ids[interacted_card_index+1]].y-this.card_manager.cards[ids[interacted_card_index]].y;
	} 

	var offset_y = 0;
	if(dy < (this.card_manager.open_card_y_offset-8)) {
		offset_y = Math.floor(this.card_manager.open_card_y_offset-8-dy);
	}

	for(var k = interacted_card_index; k < length; k++) {
		var current_card = this.card_manager.cards[ids[k]];
		current_card.x += pool.x; 
		current_card.y += (pool.y + (k-interacted_card_index)*offset_y);
		current_card.z = this.card_manager.z_index++;
		this.temp_pool.addCard(current_card);
		pool.removeCard(current_card);
	}

	this.last_selected_pool.card_ids = [];
	for(var k = interacted_card_index; k < length; k++) {
		var current_card = this.card_manager.cards[ids[k]];
		this.last_selected_pool.card_ids.push(current_card.id);
	}
	this.game.card_animation_manager.sync_z = false;
	pool.calibrateCards();
	this.temp_pool.x -= 1;
	this.temp_pool.y -= 1;
	this.game.interacted_pool = this.temp_pool;

	this.game.card_animation_manager.syncCardSprites();
	for(var a = 0; a < this.game.interacted_pool.card_ids.length; a++) {
		var card = this.game.interacted_pool.getCard(a);
		
		this.game.card_animation_manager.card_sprites[card.card_sprite_id].z = this.game.draw_manager.layer[2]+a;
	}

	this.game.audio.playSound(1); // grab sound

	this.last_selected_card = card;
}
// Is triggered when a empty pool is selected 
Rules.prototype.emptyPoolSelect = function(pool) {
	if(pool.id!=-1) {
		if(this.last_selected_pool.amountOfCards()>0&&this.old_pool_index!=pool.id) {
			if(!this.has_played_a_move) this.game.startClock();

			// get last pool ids			
			var ids = [];
			for(var a = 0; a < this.last_selected_pool.amountOfCards(); a++) {
				ids.push(this.last_selected_pool.card_ids[a]);
				this.card_manager.pools[this.old_pool_index].removeCard(this.card_manager.getCard(ids[a]));
			}

			// add to history
			var tranfered_ids = '';
			for(var a = 0; a < this.last_selected_pool.amountOfCards(); a++)
				tranfered_ids += this.card_manager.cards[this.last_selected_pool.card_ids[a]].id + ',';
			this.history.push((this.move++)+'-'+this.card_manager.pools[this.old_pool_index].id+'-'+pool.id+'-'+tranfered_ids);
			this.total_moves++;
			
			// add to new pool
			this.card_manager.addPoolToPool(this.last_selected_pool,pool);

			// flip card
			if(this.card_manager.pools[this.old_pool_index].card_ids.length!=0) {
				var top_card = this.card_manager.cards[this.card_manager.pools[this.old_pool_index].card_ids[this.card_manager.pools[this.old_pool_index].card_ids.length-1]];
				if(!top_card.open) {
					top_card.locked = false;
					this.game.card_animation_manager.flipCard(top_card);
					this.history.push((this.move-1)+'-o'+top_card.id);
				}
			}

			// calibrate pools
			pool.calibrateCards();
			this.card_manager.pools[this.old_pool_index].calibrateCards();

			this.score--;
			this.last_selected_pool.card_ids = [];

			this.game.card_animation_manager.syncCardSprites();
			return true;		
		}
	}
	return false;
}
// Is triggered when the temp pool is released hovering over another pool
Rules.prototype.deselectOverAnotherPool = function(pool) {
	if(this.card_manager.pools.indexOf(pool)==this.old_pool_index||!this.playing) return;
	if(pool.size!=0) return;
	if(pool.card_ids.length>0) {
		var top_card = this.card_manager.cards[pool.card_ids[pool.card_ids.length-1]];
		var interactive_bottom_card = this.card_manager.cards[this.game.interacted_pool.card_ids[0]];
		if(this.card_manager.getCardScore(top_card,false)==this.card_manager.getCardScore(interactive_bottom_card,false)+1) {
			if(!this.has_played_a_move) this.game.startClock();
			// add to history
			var tranfered_ids = '';
			for(var a = 0; a < this.temp_pool.card_ids.length; a++)
				tranfered_ids += this.card_manager.cards[this.temp_pool.card_ids[a]].id + ',';
			this.history.push((this.move++)+'-'+this.card_manager.pools[this.old_pool_index].id+'-'+pool.id+'-'+tranfered_ids);
			this.total_moves++;
			this.card_manager.addPoolToPool(this.temp_pool,pool);
			this.card_manager.pools[this.old_pool_index].calibrateCards();
			// check if we have a row
			var succession = 0;
			var start_index = 0;
			var suite = '';
			for(var i = 0; i<pool.card_ids.length-1; i++) {
				current_card = this.card_manager.cards[pool.card_ids[i]];
				next_card = this.card_manager.cards[pool.card_ids[i+1]];
				if(this.card_manager.getCardScore(current_card,true)==this.card_manager.getCardScore(next_card,true)+1) {
					succession++;
					if(suite == '') suite = current_card.suite;
				}
				else {
					succession = 0;
					start_index = i+1;
					suite = '';
				}
			}
			if(succession==12) {
				this.score+=101;
				// remove cards from current pool
				var ids = [];
				var tranfered_ids = '';

				var first_y = 0;
				
				for(var k = 0; k < pool.card_ids.length; k++) {
					ids.push(pool.card_ids[k]);
					if(k >= start_index) tranfered_ids += this.card_manager.cards[pool.card_ids[k]].id + ',';
					if(k == start_index) first_y = pool.getCard(k).y;
				}

				this.history.push((this.move-1)+'-'+pool.id+'-'+tranfered_ids); // add to history
				for(var i = 0; i < 13; i++) {
					pool.removeCard(this.card_manager.cards[ids[i+start_index]]);
					this.game.card_animation_manager.removeCardSprite(this.card_manager.cards[ids[i+start_index]]);
				}

				// add stack to stackpool
				var stack_card = this.card_manager.addCard(new Card(suite,'k',true,17+this.stack_pool.card_ids.length*12,444,true)); // needs offsets for graphics
				this.stack_pool.addCard(stack_card);

				this.game.card_animation_manager.addLinkedCardSprite(stack_card,pool.x,pool.y+first_y);
				var card_sprite = stack_card.getCardSprite(this.game.card_animation_manager);

				card_sprite.findDestination(this.game);
				card_sprite.setVelocityAccordingToTime(this.game.card_animation_manager.animation_speed*10);
				card_sprite.z = 500;

				if(card_sprite.vx != 0 && card_sprite.vy != 0) {
					this.game.card_animation_manager.addToAnimationQueue(stack_card.card_sprite_id,0,7);
				}

				this.game.card_animation_manager.animate(true);

				// flip card
				if(pool.card_ids.length>0) {
					var top_card = this.card_manager.cards[pool.card_ids[pool.card_ids.length-1]];
					if(!top_card.open) {
						top_card.locked = false;
						this.game.card_animation_manager.flipCard(top_card);
					}
				}
				this.hasWon();
			} else {
				this.game.audio.playSound(3);
			}
			
			if(this.card_manager.pools[this.old_pool_index].card_ids.length!=0) {
				var top_card = this.card_manager.cards[this.card_manager.pools[this.old_pool_index].card_ids[this.card_manager.pools[this.old_pool_index].card_ids.length-1]];
				if(!top_card.open) {
					top_card.locked = false;
					this.game.card_animation_manager.flipCard(top_card);
					this.history.push((this.move-1)+'-o'+top_card.id);
				}
			}
			this.score--;
			pool.calibrateCards();
			this.last_selected_pool.card_ids = [];
			if(succession==12) {
				// clear history
				this.history = [];
				this.move = 0;
				return 'row'; 
			}
			else return true;
		}
	} else {
		// add to history
		var tranfered_ids = '';
		for(var a = 0; a < this.temp_pool.card_ids.length; a++)
			tranfered_ids += this.card_manager.cards[this.temp_pool.card_ids[a]].id + ',';
		this.history.push((this.move++)+'-'+this.card_manager.pools[this.old_pool_index].id+'-'+pool.id+'-'+tranfered_ids);
		
		this.total_moves++;
		this.card_manager.addPoolToPool(this.temp_pool,pool);
		if(this.card_manager.pools[this.old_pool_index].card_ids.length!=0) {
			var top_card = this.card_manager.cards[this.card_manager.pools[this.old_pool_index].card_ids[this.card_manager.pools[this.old_pool_index].card_ids.length-1]];
			if(!top_card.open) {
				//top_card.open = true;
				top_card.locked = false;
				this.game.card_animation_manager.flipCard(top_card);
				this.history.push((this.move-1)+'-o'+top_card.id);
			}
		}
		this.game.audio.playSound(3);
		this.score--;
		this.last_selected_pool.card_ids = [];
		return true;
	}
}
// Is triggered when temp pool is released without hovering over another pool
Rules.prototype.deselectOverNothing = function() {
	// run fly back animation
	var old_pool = this.card_manager.pools[this.old_pool_index];

	dx = Math.abs(this.temp_pool.x - old_pool.x);
	if(dx>50) {
		for(var a = 0; a < this.temp_pool.card_ids.length; a++) {
			var card = this.temp_pool.getCard(a);

			var pool_y = old_pool.y;
			if(old_pool.amountOfCards()>0) {
				if(old_pool.getFirstCard().open) pool_y += this.card_manager.open_card_y_offset; else pool_y += this.card_manager.closed_card_y_offset;
				pool_y += old_pool.getFirstCard().y+a*this.card_manager.open_card_y_offset;
			}

			card.visible = false;
		}
	}

	this.card_manager.addPoolToPool(this.temp_pool,this.card_manager.pools[this.old_pool_index]);
	//this.game.audio.playSound(4);
}
// Clears temp pool
Rules.prototype.clearTempPool = function() {
	for(var j = 0; j < this.temp_pool.card_ids.length; j++) {
		var card = this.card_manager.cards[this.temp_pool.card_ids[j]];
		this.temp_pool.removeCard(card);	
	}
	this.temp_pool.x = -200;
	this.temp_pool.card_ids = [];
}
// history system
Rules.prototype.undo = function() {
	if(this.history.length > 0) {
		var node = this.history[this.history.length-1].split('-');;
		var move = Number(node[0]);
		var original_move = move;
		var i = this.history.length-1;
		while(move == original_move) {
			switch(node.length) {
				case 2:
					if(node[1][0]=='o') { // card opening
						id = node[1].replace('o','');
						this.card_manager.cards[id].open = false;
						this.card_manager.cards[id].locked = true;
					}
					if(node[1][0]=='s') { // shuffle
						this.shuffles++;
						for(var q = 10; q > 0; q--) {
							var current_pool = this.card_manager.pools[q];
							var current_card = this.card_manager.cards[current_pool.card_ids[current_pool.card_ids.length-1]];
							
							this.cards.unshift(current_card.suite+''+current_card.rank);
							current_pool.removeCard(current_card);
							this.game.card_animation_manager.removeCardSprite(current_card);
							current_pool.calibrateCards();
						}
						for(var a = 0; a < this.card_manager.pools.length; a++) {
							var pool = this.card_manager.pools[a];
							if(pool.id == -1) {
								if(pool.amountOfCards()!=0) {
									var card = this.card_manager.addCard(new Card('s','a',false,pool.x+(4-pool.card_ids.length)*9,444,true));
									pool.addCard(card);
									this.game.card_animation_manager.addLinkedCardSprite(card,792,444);
								} else {
									var card = this.card_manager.addCard(new Card('s','a',false,792,444,true));
									pool.addCard(card);
									this.game.card_animation_manager.addLinkedCardSprite(card,792,444);
									pool.x = 756;
									card.x = 792-pool.x;
								}
								break;
							}
						}

						pool.width = this.card_manager.card_width+(pool.amountOfCards()-1)*9;	
						this.score--;
					}
					break;
				case 3:
					from_pool = node[1];
					ids = node[2].split(',');
					for(var a = 0; a < (ids.length-1); a++) {
						var card = this.card_manager.cards[ids[a]];
						card.x = this.card_manager.pools[from_pool].x;
						card.y = this.card_manager.pools[from_pool].y+this.card_manager.pools[from_pool].card_ids.length*30;
						card.z = this.card_manager.z_index++;
						this.card_manager.pools[from_pool].addCard(card);
						this.game.card_animation_manager.addLinkedCardSprite(card,17,444);
					}
					// remove stack from stack pool
					var card = this.card_manager.cards[this.stack_pool.card_ids[this.stack_pool.card_ids.length-1]];
					this.stack_pool.removeCard(card);
					this.game.card_animation_manager.removeCardSprite(card);
					this.score-=100;
					break;
				case 4:
					to_pool = node[2];
					from_pool = node[1];
					ids = node[3].split(',');
					for(var a = 0; a < (ids.length-1); a++) {
						var card = this.card_manager.cards[ids[a]];
						card.z = this.card_manager.z_index++;

						var pool = this.card_manager.getPool(from_pool);
						var pool_y = pool.y;
						if(pool.amountOfCards()>0) { 
							if(pool.getFirstCard().open) pool_y += this.card_manager.open_card_y_offset; else pool_y += this.card_manager.closed_card_y_offset;
							pool_y+=pool.getFirstCard().y;
						}

						card.visible = false;

						this.card_manager.pools[from_pool].addCard(card);
						this.card_manager.pools[to_pool].removeCard(card);
					}
					this.card_manager.pools[to_pool].calibrateCards();
					this.score--;
					
					break;
			}
			this.game.card_animation_manager.syncCardSprites();
			this.history.splice(i,1);
			i--;
			if(i>=0) {
				node = this.history[i].split('-');
				move = Number(node[0]);
			} else {
				move = -1;
			}
		}
	}
}
// Check if we have a row after shuffling
Rules.prototype.checkRows = function() {
	// check if we have a row
	for(var j = 1; j < 11; j++) {
		pool = this.card_manager.pools[j];
		var succession = 0;
		var start_index = 0;
		var suite = '';
		for(var i = 0; i<pool.card_ids.length-1; i++) {
			current_card = this.card_manager.cards[pool.card_ids[i]];
			next_card = this.card_manager.cards[pool.card_ids[i+1]];
			if(this.card_manager.getCardScore(current_card,true)==this.card_manager.getCardScore(next_card,true)+1) {
				succession++;
				if(suite == '') suite = current_card.suite;
			}
			else {
				succession = 0;
				start_index = i+1;
				suite = '';
			}
		}
		if(succession==12) {
			this.score+=101;

			// remove cards from current pool
			var ids = [];
			var tranfered_ids = '';
			for(var k = 0; k < pool.card_ids.length; k++) {
				ids.push(pool.card_ids[k]);
				if(k >= start_index) tranfered_ids += this.card_manager.cards[pool.card_ids[k]].id + ',';
			}

			// add to history
			this.history.push((this.move-1)+'-'+pool.id+'-'+tranfered_ids); 
			
			// remove cards and initialize animation
			for(var i = 0; i < 13; i++) {
				var card_id = ids[i+start_index];
				var card = this.card_manager.cards[card_id];

				pool.removeCard(card);
				this.game.card_animation_manager.removeCardSprite(card);
			}

			// add stack to stackpool
			var stack_card = this.card_manager.addCard(new Card(suite,'k',true,17+this.stack_pool.card_ids.length*12,444,true)); // needs offsets for graphics
			this.stack_pool.addCard(stack_card);
			this.game.card_animation_manager.addLinkedCardSprite(stack_card,17,444);

			if(pool.card_ids.length>0) {
				var top_card = this.card_manager.cards[pool.card_ids[pool.card_ids.length-1]];
				if(!top_card.open) {
					top_card.locked = false;
					this.game.card_animation_manager.flipCard(top_card);
					this.history.push((this.move-1)+'-o'+top_card.id);
				}
			}
			this.game.card_animation_manager.syncCardSprites();

			this.history = [];
			this.move = 0;
		}
	}
}
// Function which checks if we have won and if so it will also run the winning 
Rules.prototype.hasWon = function() {
	// go through the pools and check if they are empty
	for(var a = 1; a < 11; a++) {
		if(this.card_manager.pools[a].amountOfCards()>0) return false;
	}

	//this.game.card_animation_manager.stopAnimating();

	this.has_won = true;

	this.game.enabled = false;
	this.game.pause();

	this.game.audio.playSound(6);

	return true;
}
// Check if a stack is movable
Rules.prototype.checkIfMovable = function(card, pool) {
	var card_index = pool.card_ids.indexOf(card.id);

	for(var a = card_index; a < (pool.amountOfCards()-1); a++) {
		var current_card = pool.getCard(a);
		var next_card = pool.getCard(a+1);
		if(this.card_manager.getCardScore(current_card,true)!=(this.card_manager.getCardScore(next_card,true)+1)) return false;
	}

	return true;
}
Rules.prototype.getHintSignature = function() {
	var parts = [];
	var card_manager = this.card_manager;

	for(var i = 1; i <= 10; i++) {
		var pool = card_manager.pools[i];
		if(!pool) {
			parts.push('');
			continue;
		}

		var pool_signature = [];
		for(var j = 0; j < pool.card_ids.length; j++) {
			var card = card_manager.cards[pool.card_ids[j]];
			var state = (card&&card.open)?'o':'c';
			pool_signature.push(pool.card_ids[j]+state);
		}
		parts.push(pool_signature.join('.'));
	}

	return parts.join('|');
}
Rules.prototype.collectHintMoves = function() {
	var moves = [];
	var card_manager = this.card_manager;

	for(var i = 1; i <= 10; i++) {
		var pool = card_manager.pools[i];
		if(!pool||pool.amountOfCards()==0) continue;

		for(var j = 0; j < pool.amountOfCards(); j++) {
			var card = pool.getCard(j);
			if(!card||!card.open) continue;
			if(!this.checkIfMovable(card,pool)) continue;

			var previous_card = null;
			if(j!=0) {
				var candidate = pool.getCard(j-1);
				if(candidate&&candidate.open) previous_card = candidate;
			}

			for(var k = 1; k <= 10; k++) {
				if(i==k) continue;
				var target_pool = card_manager.pools[k];
				if(!target_pool) continue;

				if(target_pool.amountOfCards()>0) {
					var target_card = target_pool.getFirstCard();
					if(!target_card||!target_card.open) continue;
					if(card_manager.getCardScore(card,false)==card_manager.getCardScore(target_card,false)-1) {
						if(previous_card==null||target_card.suite!=previous_card.suite||target_card.rank!=previous_card.rank) {
							moves.push({fromPoolIndex:i,fromCardIndex:j,toPoolIndex:k,toCardId:target_card.id});
						}
					}
				} else if(target_pool.size==0) {
					moves.push({fromPoolIndex:i,fromCardIndex:j,toPoolIndex:k,toCardId:null});
				}
			}
		}
	}

	return moves;
}
// Temporarily show hint
Rules.prototype.hint = function() {
	var game = this.game;
	var card_manager = game.card_manager;
	var card_animation_manager = game.card_animation_manager;
	var tick = game.tick;

	if(!this.has_played_a_move) this.game.startClock();

	var signature = this.getHintSignature();
	var hint_moves = this.collectHintMoves();

	if(hint_moves.length==0) {
		this.hint_moves = [];
		this.hint_last_signature = signature;
		this.hint_cycle_index = -1;
		game.audio.playSound(5);
		return false;
	}

	if(signature!=this.hint_last_signature) this.hint_cycle_index = 0;
	else this.hint_cycle_index = (this.hint_cycle_index+1)%hint_moves.length;

	this.hint_last_signature = signature;
	this.hint_moves = hint_moves;

	var move = hint_moves[this.hint_cycle_index];
	var pool = card_manager.pools[move.fromPoolIndex];
	var j = move.fromCardIndex;
	var second_pool = card_manager.pools[move.toPoolIndex];
	var second_card = (move.toCardId!==null)?card_manager.cards[move.toCardId]:null;

	var animation_speed = card_animation_manager.animation_speed*2;

	for(var i = j; i < pool.amountOfCards(); i++) {
		var card_sprite = pool.getCard(i).getCardSprite(card_animation_manager);
		card_sprite.setEffect('invert',tick,tick+animation_speed);
	}

	if(second_card!=null) {
		var second_card_sprite = second_card.getCardSprite(card_animation_manager);
		second_card_sprite.setEffect('invert',tick+animation_speed,tick+animation_speed*2);
	} else if(second_pool) {
		game.draw_manager.setEffect('invert',tick+animation_speed,tick+animation_speed*2,second_pool.x,second_pool.y,card_manager.card_width,card_manager.card_height);
	}

	game.audio.playSound(4);

	return true;
}
