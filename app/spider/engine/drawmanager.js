// Drawmanager.js

function DrawManager() {
	this.images = {};
	this.layer = [0,250,500,750,1000];
	this.game = null;

	// effect
	this.effect = null;
	this.effect_start = null;
	this.effect_end = null;
	this.effect_x = null;
	this.effect_y = null;
	this.effect_w = null;
	this.effect_h = null;
}

DrawManager.prototype.setGame = function(game) {
	this.game = game;
}

// Load images into graphics
DrawManager.prototype.loadImages = function() {
	root = 'engine';

	// game
	this.loadImage('splash',root+'/img/GAME/splash.png'); 
	this.loadImage('cards',root+'/img/CARDS/CARDS.png');
	this.loadImage('background',root+'/img/GAME/bg.png');
	this.loadImage('bar',root+'/img/GAME/bar.png');

	// buttons
	this.loadImage('button_close',root+'/img/GAME/BUTTON_CLOSE.png');
	this.loadImage('button_close_over',root+'/img/GAME/BUTTON_CLOSE_OVER.png');
	this.loadImage('button_xp',root+'/img/GAME/BUTTON_XP.gif');
	this.loadImage('button_xp_over',root+'/img/GAME/BUTTON_XP_OVER.gif');

	this.loadImage('button_new_game',root+'/img/GAME/newgame.gif');
	this.loadImage('button_new_game_under',root+'/img/GAME/newgame_under.gif');
	this.loadImage('button_restart',root+'/img/GAME/restartthisgame.gif');
	this.loadImage('button_restart_under',root+'/img/GAME/restartthisgame_under.gif');
	this.loadImage('button_undomove',root+'/img/GAME/undomove.gif');
	this.loadImage('button_undomove_under',root+'/img/GAME/undomove_under.gif');
	this.loadImage('button_hint',root+'/img/GAME/hint.gif');
	this.loadImage('button_hint_under',root+'/img/GAME/hint_under.gif');
	this.loadImage('button_soundoff',root+'/img/GAME/soundoff.gif');
	this.loadImage('button_soundoff_under',root+'/img/GAME/soundoff_under.gif');
	this.loadImage('button_soundon',root+'/img/GAME/sound_on.png');
	this.loadImage('button_soundon_under',root+'/img/GAME/sound_on_over.png');
	this.loadImage('button_difficulty',root+'/img/GAME/difficulty.gif');
	this.loadImage('button_difficulty_under',root+'/img/GAME/difficulty_over.gif');

	this.loadImage('button_score',root+'/img/GAME/scoreknop.png');

	// prompts
	this.loadImage('prompt_difficulty',root+'/img/PROMPTS/PROMPT_DIFFICULTY.png');
	this.loadImage('prompt_new',root+'/img/PROMPTS/PROMPT_NEW.png');
	this.loadImage('prompt_restart',root+'/img/PROMPTS/PROMPT_RESTARTTHISGAME.png');
	this.loadImage('prompt',root+'/img/PROMPTS/PROMPT.png');

	this.loadImage('prompt_yes',root+'/img/PROMPTS/BUTTON_YES.gif');
	this.loadImage('prompt_yes_over',root+'/img/PROMPTS/BUTTON_YES_OVER.gif');
	this.loadImage('prompt_no',root+'/img/PROMPTS/BUTTON_NO.gif');
	this.loadImage('prompt_no_over',root+'/img/PROMPTS/BUTTON_NO_OVER.gif');

	this.loadImage('prompt_easy',root+'/img/PROMPTS/easy.gif');
	this.loadImage('prompt_easy_over',root+'/img/PROMPTS/easy_over.gif');
	this.loadImage('prompt_medium',root+'/img/PROMPTS/medium.gif');
	this.loadImage('prompt_medium_over',root+'/img/PROMPTS/medium_over.gif');
	this.loadImage('prompt_difficult',root+'/img/PROMPTS/difficult.gif');
	this.loadImage('prompt_difficult_over',root+'/img/PROMPTS/difficult_over.gif');
}

// Load one individual image and add name to image database
DrawManager.prototype.loadImage = function(name,src) {
	var game = this.game;
	game.graphics.loadImage(src);
	this.images[name] = game.graphics.images.length-1;
}

// Draw using the game state
DrawManager.prototype.draw = function() {
	var game = this.game;
	var game_state = game.game_state;

	var gfx = game.graphics;
	
	this.clearScreen();
	this.drawBackground();
	this.drawInGameUI();

	switch(game_state) {
		case 0:
			//gfx.addStringToQueue('Loading',880/2-80,500,1,'32pt Arial','#000000');
			break;

		case 1:

			break;

		case 2:
			this.drawOverlay();
			this.drawSpriteCards(game.card_animation_manager);
			break;
	}

	this.drawEffect();
	this.drawBuffer();
}

DrawManager.prototype.drawBackground = function() {
	var gfx = this.game.graphics;
	switch(game.game_state) {
		case 0:
			break;
		case 1:
			gfx.addImageToQueue(this.images['menu_bg'],0,0,0);
			break;
		case 2:
			gfx.addImageToQueue(this.images['background'],0,0,0);
			/*gfx.addImageToQueue(this.images['bar'],0,0,this.layer[3]);*/
			break;
	}
}

DrawManager.prototype.drawEffect = function() {
	var game = this.game;
	var tick = game.tick;

	var gfx = game.graphics;

	if(this.effect_start<tick&&this.effect_end>tick) {
		gfx.addEffectToQueue(this.effect,this.effect_x,this.effect_y,this.effect_w,this.effect_h);
	}
}

DrawManager.prototype.drawInGameUI = function() {
	var game = this.game;
	var buttons = game.buttons;
	var gfx = game.graphics;
	var game_state = game.game_state;

	for(var a = 0; a < buttons.length; a++) {
		var button = buttons[a];
		var z = (button.imageid != this.images['button_score']) ? this.layer[3]+1 : this.layer[1];
		if(button.game_state == game_state&&button.visible&&button.imageid!=null&&button.hover_imageid!=null) {
			if(game.mouseInRectangle(button.x,button.y,button.width,button.height)) {
				gfx.addImageToQueue(button.hover_imageid,button.x,button.y,z);
			} else {
				gfx.addImageToQueue(button.imageid,button.x,button.y,z);
			}
		}
	}

	var font = '400 12pt Arial';
	var color = '#000000';

	var y_menu = 19;

	switch(game_state) {
		case 0:
			break;
		case 2:
			// win message
			if(game.rules.has_won) {
				var colors = [
					[0,167,33],
					[21,86,165],
					[143,29,165],
					[255,0,0],
					[255,255,0]
				];
				var color_speed = 100;

				var t = game.tick%(colors.length*color_speed);

				var next = (Math.ceil(t/color_speed)<colors.length)?Math.ceil(t/color_speed):0;
				var previous = Math.floor(t/color_speed);

				var dr = (colors[next][0]-colors[previous][0])/color_speed;
				var dg = (colors[next][1]-colors[previous][1])/color_speed;
				var db = (colors[next][2]-colors[previous][2])/color_speed;

				var r = Math.floor(colors[previous][0]+dr*(t%color_speed));
				var g = Math.floor(colors[previous][1]+dg*(t%color_speed));
				var b = Math.floor(colors[previous][2]+db*(t%color_speed));

				var color = 'rgb('+r+','+g+','+b+')';
				gfx.addStringToQueue('You Won!',880/2-157,550/2+36,this.layer[4],'600 52pt Arial',color);

				//if(t%10==0) console.log('r: ' + r + ' g: ' + g + ' b: ' + b + ' dr: ' + dr + ' dg: ' + dg + ' db: ' + db);
			};

			gfx.addStringToQueue('Moves: ' + game.rules.total_moves,396,510,this.layer[1]+1,'500 12pt Arial','#FFFFFF');
			gfx.addStringToQueue('Score: ' + game.rules.score,400,484,this.layer[1]+2,'500 12pt Arial','#FFFFFF');		
			break;
	}
}

DrawManager.prototype.drawOverlay = function() {
	var game = this.game;
	var prompts = game.prompts;
	var gfx = game.graphics;
	
	if(game.prompt_mode) {
		var prompt = prompts[game.active_prompt];
		var buttons = prompt.buttons;

		// prompt background
		gfx.addImageToQueue(prompt.imageid,0,0,this.layer[4]);

		// prompt related buttons
		for(var a = 0; a < buttons.length; a++) {
			var button = buttons[a];
			if(button.visible) {
				if(game.mouseInRectangle(button.x,button.y,button.width,button.height)) {
					gfx.addImageToQueue(button.hover_imageid,button.x,button.y,this.layer[4]+1);
				} else {
					gfx.addImageToQueue(button.imageid,button.x,button.y,this.layer[4]+1);
				}
			}
		}

		// prompt text
		for(var b = 0; b < prompt.text.length; b++) {
			var text = prompt.text[b];
			gfx.addStringToQueue(text.text,text.x,text.y,this.layer[4]+1,text.font,text.color);
		}
	}
}

DrawManager.prototype.drawSpriteCards = function(cam) {
	for(var a = 0; a < cam.card_sprites.length; a++) {
		var card_sprite = cam.card_sprites[a];
		if(card_sprite != null)	{
			card_sprite.draw(this.game);
		}
	}
}

DrawManager.prototype.clearScreen = function() {
	var game = this.game;
	game.graphics.clear();
}

DrawManager.prototype.drawBuffer = function() {
	var game = this.game;
	game.graphics.buffer();
}

DrawManager.prototype.setEffect = function(effect, effect_start, effect_end, x, y, w, h) {
	this.effect = effect;
	this.effect_start = effect_start;
	this.effect_end = effect_end;
	this.effect_x = x;
	this.effect_y = y;
	this.effect_w = w;
	this.effect_h = h;
}