// Game.js
function Game() {
	this.graphics = null;

	this.draw_manager = new DrawManager();
	this.draw_manager.setGame(this);

	this.card_animation_manager = new CardAnimationManager();
	this.card_animation_manager.setGame(this);
	
	this.game_state = 2;
	this.time = Date.now();
	this.old_time = null;
	this.start_time = null;
	this.tick = 0;
	// cards
	this.card_manager = new CardManager();
	this.rules = new Rules(this,this.card_manager);
	this.card_manager.setRules(this.rules);
	this.audio = new Audio();
	// buttons
	this.buttons = [];
	// mouse event handler
	this.mouse_down = false;
	this.mouse_up = true;
	this.mouse_click = false;
	this.mouse_out = true;
	this.old_mouse_x = 0;
	this.old_mouse_y = 0;
	this.interacted_pool = null;

	this.keys = [];
	// game events
	this.total_paused_time = 0;
	this.pause_start_time = 0;
	this.paused = true;
	this.enabled = false;
	// prompts
	this.prompts = [];
	this.prompt_mode = true;
	this.active_prompt = 0;
	// mobile check
	this.is_mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
	this.is_android = /Android/i.test(navigator.userAgent);
	this.is_tablet = /iPad/i.test(navigator.userAgent);
	// check size
	this.old_width = 0;
	this.old_height = 0;
	this.has_checked_size = false;
	this.pause_mode = false;
}
// Manipulation functions
Game.prototype.setGraphics = function(graphics) {
	this.graphics = graphics;
	this.card_manager.graphics = this.graphics;
}
// Load function
Game.prototype.load = function() {
	// things to load
	root = 'engine';

	this.draw_manager.loadImages(game);

	// audio
	this.audio.addSound(new Sound(root+'/audio/dealpercard.mp3')); // 0
	this.audio.addSound(new Sound(root+'/audio/card_grab.mp3')); // 1
	this.audio.addSound(new Sound(root+'/audio/click.mp3')); // 2
	this.audio.addSound(new Sound(root+'/audio/card_place.mp3')); // 3
	this.audio.addSound(new Sound(root+'/audio/hint.mp3')); // 4
	this.audio.addSound(new Sound(root+'/audio/nohints.mp3')); // 5
	this.audio.addSound(new Sound(root+'/audio/won.mp3')); // 6
	this.audio.addSound(new Sound(root+'/audio/dealpercard.mp3')); // 7
}
// Initialize game
Game.prototype.initialize = function() {
	var game  = this;
	if (this.is_android) {
		this.audio.muted = true;
	}

	if($('body').width()>=700&&this.is_mobile) {
		this.is_tablet=true;
	}
	
	this.initializeInGameUI();
	this.initializePrompts();

	this.handleInput();
}
Game.prototype.initializeInGameUI = function() {
	var game = this;

	// ingame
	var menu_y = 5;

	/*
	new_button = new Button(this.buttons,19,menu_y,true,this.draw_manager.images['button_new_game'],this.draw_manager.images['button_new_game_under'],this,2,81,18);
	new_button.click = function(x,y,game) { game.active_prompt = 1; game.pause(); game.prompt_mode = true; game.audio.playSound(2); };
	restart_button = new Button(this.buttons,134,menu_y,true,this.draw_manager.images['button_restart'],this.draw_manager.images['button_restart_under'],this,2,132,18);
	restart_button.click = function(x,y,game) { game.active_prompt = 2; game.pause(); game.prompt_mode = true; game.audio.playSound(2); };
	difficulty_button = new Button(this.buttons,300,menu_y,true,this.draw_manager.images['button_difficulty'],this.draw_manager.images['button_difficulty_under'],this,2,66,18);
	difficulty_button.click = function(x,y,game) { game.active_prompt = 0; game.pause(); game.prompt_mode = true; game.audio.playSound(2); };
	mute_button = new Button(this.buttons,398,menu_y,true,this.draw_manager.images['button_soundoff'],this.draw_manager.images['button_soundoff_under'],this,2,76,18);
	mute_button.click = function(x,y,game) { if(game.audio.muted) { game.audio.toggleMute(); game.audio.playSound(2); this.imageid = game.draw_manager.images['button_soundoff']; this.hover_imageid = game.draw_manager.images['button_soundoff_under']; } else { game.audio.playSound(2); game.audio.toggleMute(); this.imageid = game.draw_manager.images['button_soundon']; this.hover_imageid = game.draw_manager.images['button_soundon_under']; } };
	hint_button = new Button(this.buttons,507,menu_y,true,this.draw_manager.images['button_hint'],this.draw_manager.images['button_hint_under'],this,2,36,18);
	hint_button.click = function(x,y,game) { game.rules.hint(); game.audio.playSound(2); };
	undo_button = new Button(this.buttons,575,menu_y,true,this.draw_manager.images['button_undomove'],this.draw_manager.images['button_undomove_under'],this,2,139,18);
	undo_button.click = function(x,y,game) { game.rules.undo(); game.audio.playSound(2); };
	*/

	score_button = new Button(this.buttons,340,444,true,this.draw_manager.images['button_score'],this.draw_manager.images['button_score'],this,2,200,96);
	score_button.click = function(x,y,game) { game.rules.hint(); game.audio.playSound(2); };
	
	// in  case muted  from start
	/*if(game.audio.muted) { mute_button.imageid = game.draw_manager.images['sound_off']; mute_button.hover_imageid = game.draw_manager.images['sound_off']; }*/
}
Game.prototype.initializePrompts = function() {
	var game = this;
	
	font = '12pt Arial';
	color = '#000000';

	// difficulty (0)
	var x = 398;
	difficulty_prompt = new Prompt(this.prompts,this.draw_manager.images.prompt_difficulty,0,0,true);
	easy_button = new Button(difficulty_prompt.buttons,x,264,true,this.draw_manager.images['prompt_easy'],this.draw_manager.images['prompt_easy_over'],this,2,106,19);
	easy_button.click = function(x,y,game) { var close_button = game.prompts[0].buttons[3]; close_button.visible = true; close_button.enabled = true; game.rules.setup(1); game.start_time = Date.now(); game.audio.playSound(2); game.resume(); game.prompt_mode = false; game.game_state = 2; };
	medium_button = new Button(difficulty_prompt.buttons,x,296,true,this.draw_manager.images['prompt_medium'],this.draw_manager.images['prompt_medium_over'],this,2,133,19);
	medium_button.click = function(x,y,game) { var close_button = game.prompts[0].buttons[3]; close_button.visible = true; close_button.enabled = true;  game.rules.setup(2); game.start_time = Date.now(); game.audio.playSound(2); game.resume(); game.prompt_mode = false; game.game_state = 2; };
	hard_button = new Button(difficulty_prompt.buttons,x,328,true,this.draw_manager.images['prompt_difficult'],this.draw_manager.images['prompt_difficult_over'],this,2,134,19);
	hard_button.click = function(x,y,game) { var close_button = game.prompts[0].buttons[3]; close_button.visible = true; close_button.enabled = true;  game.rules.setup(4); game.start_time = Date.now(); game.audio.playSound(2); game.resume(); game.prompt_mode = false; game.game_state = 2; };
	difficulty_prompt.addText('Select the game difficulty you want:',319,240,font,color);
	close_button = new Button(difficulty_prompt.buttons,577,189,false,this.draw_manager.images['button_close'],this.draw_manager.images['button_close_over'],this,2,21,21);
	close_button.click = function(x,y,game) { game.audio.playSound(2); game.resume(); game.prompt_mode = false; };
	close_button.visible = false;

	// new_game (1)
	new_game = new Prompt(this.prompts,this.draw_manager.images.prompt_new,0,0,true);
	yes_button = new Button(new_game.buttons,348,313,true,this.draw_manager.images['prompt_yes'],this.draw_manager.images['prompt_yes_over'],this,2,86,24);
	yes_button.click = function(x,y,game) { game.rules.setup(game.rules.suite_count,false); game.start_time = Date.now(); game.audio.playSound(2); game.resume(); game.prompt_mode = false; };
	no_button = new Button(new_game.buttons,444,313,true,this.draw_manager.images['prompt_no'],this.draw_manager.images['prompt_no_over'],this,2,86,24);
	no_button.click = function(x,y,game) { game.audio.playSound(2); game.resume(); game.prompt_mode = false; };
	close_button = new Button(new_game.buttons,577,189,true,this.draw_manager.images['button_close'],this.draw_manager.images['button_close_over'],this,2,21,21);
	close_button.click = function(x,y,game) { game.audio.playSound(2); game.resume(); game.prompt_mode = false; };
	new_game.addText('Are you sure you want a new game?',314,268,font,color);

	// restart (2)
	restart_prompt = new Prompt(this.prompts,this.draw_manager.images.prompt_restart,0,0,true);
	yes_button = new Button(restart_prompt.buttons,348,313,true,this.draw_manager.images['prompt_yes'],this.draw_manager.images['prompt_yes_over'],this,2,86,24);
	yes_button.click = function(x,y,game) { game.rules.setup(game.rules.suite_count,true); game.start_time = Date.now(); game.audio.playSound(2); game.resume(); game.prompt_mode = false; };
	no_button = new Button(restart_prompt.buttons,444,313,true,this.draw_manager.images['prompt_no'],this.draw_manager.images['prompt_no_over'],this,2,86,24);
	no_button.click = function(x,y,game) { game.audio.playSound(2); game.resume(); game.prompt_mode = false; };
	close_button = new Button(restart_prompt.buttons,577,189,true,this.draw_manager.images['button_close'],this.draw_manager.images['button_close_over'],this,2,21,21);
	close_button.click = function(x,y,game) { game.audio.playSound(2); game.resume(); game.prompt_mode = false; };
	restart_prompt.addText('Are you sure you want to restart this',313,260,font,color);
	restart_prompt.addText('game from the beginning?',351,278,font,color);

	// shuffle (3)
	shuffle_prompt = new Prompt(this.prompts,this.draw_manager.images.prompt,0,0,true);
	ok_button = new Button(shuffle_prompt.buttons,396,313,true,this.draw_manager.images['button_xp'],this.draw_manager.images['button_xp_over'],this,2,86,24);
	ok_button.click = function(x,y,game) { game.audio.playSound(2); game.resume(); game.prompt_mode = false; };
	close_button = new Button(shuffle_prompt.buttons,577,189,true,this.draw_manager.images['button_close'],this.draw_manager.images['button_close_over'],this,2,21,21);
	close_button.click = function(x,y,game) { game.audio.playSound(2); game.resume(); game.prompt_mode = false; };
	shuffle_prompt.addText('You are not allowed to deal a new row',313-5,261,font,color);
	shuffle_prompt.addText('while there are any empty slots',333-5,279,font,color);
}
Game.prototype.handleInput = function() {
	var game = this;

	// mouse handling
	this.graphics.canvas.addEventListener('mousemove',function(e) {
		(e.preventDefault) ? e.preventDefault() : e.returnValue = false; 

		var rect = game.graphics.canvas.getBoundingClientRect();
		x = (e.clientX - rect.left) * (game.graphics.width / game.graphics.actual_width);
		y = (e.clientY - rect.top) * (game.graphics.height / game.graphics.actual_height);

		if(game.mouse_out) {
			this.old_mouse_x = x;
			this.old_mouse_y = y;
			game.mouse_out = false;
		}
		game.card_manager.handleMouseMove(x,y,game);
		// check if we are hovering over a link
		game.graphics.canvas.style.cursor = 'default';
		if(game.rules.temp_pool.amountOfCards()<1) {
			for(var a = 0; a < game.buttons.length; a++) {
				game.buttons[a].checkIfHovered(x,y,game);
			}
		}
		if(game.prompt_mode) {
			var prompt = game.prompts[game.active_prompt];
			for(var a = 0; a < prompt.buttons.length; a++) {
				prompt.buttons[a].checkIfHovered(x,y,game);
			}
		}

		if(e.buttons!=1&&game.rules.temp_pool.card_ids.length>0&&e.buttons!=null) {
			game.returnTempPool();
		}
	},false);

	this.graphics.canvas.addEventListener('mousedown',function(e) {
		(e.preventDefault) ? e.preventDefault() : e.returnValue = false; 

		if(e.button==0) {
			if(!game.paused&&game.enabled) {
				game.mouse_down = true;
				var rect = game.graphics.canvas.getBoundingClientRect();
				x = (e.clientX - rect.left) * (game.graphics.width / game.graphics.actual_width);
				y = (e.clientY - rect.top) * (game.graphics.height / game.graphics.actual_height);
				game.card_manager.handleMouseDown(x,y,game);
				game.mouse_up = false;
			}
			if(game.pause_mode) game.pauseMode();
		}
	},false);

	this.graphics.canvas.addEventListener('mouseup',function(e) {
		//(e.preventDefault) ? e.preventDefault() : e.returnValue = false; 

		if(e.button==0) {
			game.mouse_down = false;
			game.mouse_up = true;
			var rect = game.graphics.canvas.getBoundingClientRect();
			x = (e.clientX - rect.left) * (game.graphics.width / game.graphics.actual_width);
			y = (e.clientY - rect.top) * (game.graphics.height / game.graphics.actual_height);
			
			if(game.rules.extended_card) {
				game.card_animation_manager.syncCardSprites();
				game.rules.extended_card = false;
			}

			if(game.rules.temp_pool.amountOfCards()<1) {
				if(!game.paused&&game.enabled) {
					for(var a = 0; a < game.buttons.length; a++) {
						game.buttons[a].checkIfClicked(x,y,game);
					}
				} else {
					if(game.prompt_mode) {
						var prompt = game.prompts[game.active_prompt];
						var button_pressed = false;
						for(var a = 0; a < prompt.buttons.length; a++) {
							if(prompt.buttons[a].checkIfClicked(x,y,game)) {
								button_pressed = true;
								break;
							}
						}
					}
					if(game.rules.has_won) {
						game.resume(); 
						game.prompt_mode = false; 
						game.audio.playSound(2);
						game.rules.setup(game.rules.suite_count);
					}
				}
			}
			game.card_manager.handleMouseUp(x,y,game);
		}
	},false);

	this.graphics.canvas.addEventListener('mouseout',function(e) {
		game.mouse_out = true;
	},false);
	
	// key handling
	for(var i = 0; i < 256; i++) 
		this.keys[i] = false;

	document.addEventListener('keydown',function(e) {
		key_code = e.keyCode;
		game.keys[key_code] = true;
	},false);

	document.addEventListener('keyup',function(e) {
		key_code = e.keyCode;

		if(game.keys[17] && game.keys[90] && (key_code==17||key_code==90))
			game.rules.undo();

		if(game.keys[77] && key_code==77)
			game.rules.hint();
		
		if(game.keys[68] && key_code==68)
			game.rules.poolSelect(game.card_manager.pools[11]);

		game.keys[key_code] = false;
	},false);

	// hotkey for shuffle and hint
	/**/

	// touch handling
	this.graphics.canvas.addEventListener('touchmove',function(e) {	
		(e.preventDefault) ? e.preventDefault() : e.returnValue = false; 

		var touch = e.targetTouches[0];
		x = (touch.pageX-game.graphics.canvas.offsetLeft)*(game.graphics.width/game.graphics.actual_width);
		y = (touch.pageY-(game.graphics.canvas.offsetTop-document.documentElement.scrollTop))*(game.graphics.height/game.graphics.actual_height);
		game.card_manager.handleMouseMove(x,y,game);
	});
	this.graphics.canvas.addEventListener('touchstart',function(e) {
		(e.preventDefault) ? e.preventDefault() : e.returnValue = false; 

		var touch = e.targetTouches[0];
		x = (touch.pageX-game.graphics.canvas.offsetLeft)*(game.graphics.width/game.graphics.actual_width);
		y = (touch.pageY-(game.graphics.canvas.offsetTop-document.documentElement.scrollTop))*(game.graphics.height/game.graphics.actual_height);
		
		if(game.pause_mode) game.pauseMode();

		if(!game.paused&&game.enabled) {
			game.old_mouse_x = x;
			game.old_mouse_y = y;
			game.mouse_down = true;
			game.card_manager.handleMouseDown(x,y,game);
			game.mouse_up = false;
			for(var a = 0; a < game.buttons.length; a++) {
				game.buttons[a].checkIfClicked(x,y,game);
			}
		} else {
			if(game.prompt_mode) {
				prompt = game.prompts[game.active_prompt];
				for(var a = 0; a < prompt.buttons.length; a++) {
					var button_pressed = false;
					if(prompt.buttons[a].checkIfClicked(x,y,game)) {
						button_pressed = true;
						break;
					}
				}
			}
			if(game.rules.has_won) {
				game.resume(); 
				game.prompt_mode = false; 
				game.audio.playSound(2);
				game.rules.setup(game.rules.suite_count);
			}
		}
	});
	this.graphics.canvas.addEventListener('touchend',function(e) {
		(e.preventDefault) ? e.preventDefault() : e.returnValue = false; 

		game.mouse_down = false;
		game.mouse_up = true;
		game.card_manager.handleMouseUp(game.old_mouse_x, game.old_mouse_y, game);

		if(game.rules.extended_card) {
			game.card_animation_manager.syncCardSprites();
			game.rules.extended_card = false;
		}
	});

	// bug handling
	document.addEventListener('mouseup',function(e) {
		(e.preventDefault) ? e.preventDefault() : e.returnValue = false; 
		game.returnTempPool();
	});
}
// Game loop
Game.prototype.gameLoop = function() {
	// count fps
	this.time = Date.now();
	var delta_time = this.time - this.old_time;
	this.old_time = this.time;

	var fps = Math.round(1000/delta_time);
	$('#fps').html(fps);	

	// update tick
	this.tick++;

	switch(this.game_state) {
	case 0:
		break;
	case 1:

		break;
	case 2: // game
		this.card_animation_manager.tick();
		break;
	}

	this.draw_manager.draw();
	
	this.checkSize();
}
Game.prototype.pause = function() {
	if(!this.paused) {
		this.paused = true;
		this.pause_start_time = Date.now();
	}
}
Game.prototype.resume = function() {
	if(this.paused) {
		this.paused = false;
		this.total_paused_time += Date.now() - this.pause_start_time;
	}
}
Game.prototype.startClock = function() {
	this.start_time = Date.now();
	this.total_paused_time = 0;
	this.rules.has_played_a_move = true;
	this.paused = false;	
}
Game.prototype.checkSize = function() {
	width = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
	height = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;

	if(this.old_width!=width||this.old_height!=height) {
		this.graphics.setFullscreen();
	}
	this.old_width = width;
	this.old_height = height;
}
Game.prototype.pauseMode = function() {
	if(!this.pause_mode) {
		this.pause_mode = true;
		this.pause();
	} else {
		this.resume();
		this.pause_mode = false;
	}
}
Game.prototype.mouseInRectangle = function(x,y,w,h) {
	if(this.old_mouse_x>x&&this.old_mouse_y>y&&this.old_mouse_x<(x+w)&&this.old_mouse_y<(y+h)) return true;
	else return false;
}
Game.prototype.returnTempPool = function() {
	if(this.rules.temp_pool.card_ids.length!=0) {
		this.mouse_down = false;
		this.mouse_up = true;
		this.card_manager.handleMouseUp(this.old_mouse_x, this.old_mouse_y, this);

		if(this.rules.extended_card) {
			this.card_animation_manager.move();
			this.rules.extended_card = false;
		}
	}
}
// Check if there is a collision between a rectangle and point
Game.prototype.checkPointAreaCollision = function(point, x,y,w,h) {
	var px = point.x;
	var py = point.y;

	if(x<px&&y<py&&px<(x+w)&&py<(y+h)) {
		return true;
	} 
	return false;
}
// Check if there is a collision between two rectangles and return the overlapping area
Game.prototype.checkRectangleCollision = function(rect1, rect2) {
	if(rect1.x<(rect2.x+rect2.w)&&(rect1.x+rect1.w)>rect2.x&&rect1.y<(rect2.y+rect2.h)&&(rect1.y+rect1.h)>rect2.y) {
		dx = Math.min(rect1.x+rect1.w,rect2.x+rect2.w) - Math.max(rect1.x,rect2.x);	
		dy = Math.min(rect1.y+rect1.h,rect2.y+rect2.h) - Math.max(rect1.y,rect2.y);	
		if(dx>=0&&dy>=0) {
			return dx*dy;
		}
	}
	return false;
}