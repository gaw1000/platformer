var canvas = document.getElementById("gameCanvas");
var context = canvas.getContext("2d");

var startFrameMillis = Date.now();
var endFrameMillis = Date.now();
// This function will return the time in seconds since the function 
// was last called
// You should only call this function once per frame
function getDeltaTime()
{
	endFrameMillis = startFrameMillis;
	startFrameMillis = Date.now();

		// Find the delta time (dt) - the change in time since the last drawFrame
		// We need to modify the delta time to something we can use.
		// We want 1 to represent 1 second, so if the delta is in milliseconds
		// we divide it by 1000 (or multiply by 0.001). This will make our 
		// animations appear at the right speed, though we may need to use
		// some large values to get objects movement and rotation correct
	var deltaTime = (startFrameMillis - endFrameMillis) * 0.001;
	
		// validate that the delta is within range
	if(deltaTime > 1)
		deltaTime = 1;
		
	return deltaTime;
}

//-------------------- Don't modify anything above here

// some variables to calculate the Frames Per Second (FPS - this tells use
// how fast our game is running, and allows us to make the game run at a 
// constant speed)
var fps = 0;
var fpsCount = 0;
var fpsTime = 0;

var player;
var enemy;
var keyboard = new Keyboard();

var SCREEN_WIDTH = canvas.width;
var SCREEN_HEIGHT = canvas.height;
var LAYER_COUNT = 4;
var LAYER_PLATFORMS = 1;
var LAYER_LADDERS = 2;
var LAYER_BACKGROUND = 0;
var LAYER_ENEMY = 3;
var LAYER_TRIGGERS = 4;

var LAYERS_MAX_DRAW = 3; //only draw the first 3 layers
	// the size of the map (in tiles)
var MAP = { tw: 60, th: 15 };
var worldOffsetX = 0;
	// the size of each tile (in game pixels)
var TILE = 35;
var TILESET_TILE = TILE * 2;
var TILESET_PADDING = 2;
var TILESET_SPACING = 2;
var TILESET_COUNT_X = 14;
var TILESET_COUNT_Y = 14;

// add force variables
var METER = TILE; // arbitary choice for 1 m
var GRAVITY = METER * 9.8 * 6; // exaggerated gravity by 6
var MAXDX = METER * 10; //maximum horz. speed 10 tiles per sec
var MAXDY = METER * 15; // max. vert. speed 15 tiles/sec
var ACCEL = MAXDX * 2; // hor. accel takes 0.5 sec to reach MAXDX.
var FRICTION = MAXDX * 6; //takes 1/6 sec to sto[ from maxdx
var JUMP = METER * 15000; // large instantaneous jump impulse

var STATE_PLAY = 0;
var STATE_GAME_OVER = 1;

var gameState = STATE_PLAY;

//score and lives intial variables
var score = 0;
var lives = 3;

// hear image for lives
var heartImage = document.createElement("img");
heartImage.src ="heart_3.png";

// variables for enemy
var ENEMY_MAXDX = METER * 5;
var ENEMY_ACCEL = ENEMY_MAXDX * 2;

var enemies = [];
var bullets = [];


var cells = []; //array for simplified collision data

	// load the image to use for the level tiles
var tileset = document.createElement("img");
tileset.src = "tileset.png";

//music variables
var musicBackground;
var sfxFire;
var isSfxPlaying = false;

function initialize()
{	
	musicBackground = new Howl(
	{
		urls: ["background.ogg"],
		loop: true,
		buffer: true,
		volue: 0.5
	});
	musicBackground.play();
	
	sfxFire = new Howl(
	{
		urls: ["fireEffect.ogg"],
		buffer: true,
		volume: 1,
		onend: function(){
			isSfxPlaying = false;
		}
	});	
	
	// initialize the collision map
	for(var layerIdx=0; layerIdx<level1.layers.length; layerIdx++)	
	{
		cells[layerIdx] = [];
	
		var idx = 0;	
		for(var y=0; y<level1.layers[layerIdx].height; y++) 
		{
			cells[layerIdx][y] = [];
			for(var x=0; x<level1.layers[layerIdx].width; x++) 
			{				
				if(level1.layers[layerIdx].data[idx] != 0)
				{
						// for each tile we find in the layer data, we need
						// to create 4 collisions (because our collision squares
						// are 35x35 but the tile in the level are 70x70)
					cells[layerIdx][y][x] = 1;	
					cells[layerIdx][y-1][x] = 1;	
					cells[layerIdx][y-1][x+1] = 1;	
					cells[layerIdx][y][x+1] = 1;	
				}				
				else if(cells[layerIdx][y][x] != 1) 
				{
					// if we haven't already set this cell's value (in the above if statement)
					// then set it to 0 now
					cells[layerIdx][y][x] = 0;
				}
				idx++;
			}
		}	
	}
	
	// add enemies

	idx = 0;
	for(var y=0; y<level1.layers[LAYER_ENEMY].height; y++) 
	{
		for(var x=0; x<level1.layers[LAYER_ENEMY].width; x++) 
		{				
			if(level1.layers[LAYER_ENEMY].data[idx] != 0)
			{
				// create a new enemy and place on this tile
				var enemy = new Enemy(x * TILE, y * TILE)
				enemies.push(enemy);
			}
			idx++;
		}

	}	

	player = new Player();
	
	
};

function cellAtPixelCoord(layer, x, y)
{
	if(x<0 || x >SCREEN_WIDTH || y<0)
		return 1;
	// if player drops off bottom of screen then player dies
	if(y>SCREEN_HEIGHT)
		return 0;
	;return cellAtTileCoord(layer, p2t(x), p2t(y));
}

function tileToPixel(tile) 
{
	return tile * TILE;
};

function pixelToTile(pixel) 
{
	return Math.floor(pixel/TILE); 
};

function cellAtTileCoord(layer, tx, ty) 
{ 
	if(tx<0 || tx>=MAP.tw || ty<0)
		return 1;
	// let the player drop of the bottom of the screen (this means death)
	if(ty>=MAP.th)
		return 0;		
	return cells[layer][ty][tx]; 
};

function bound(value, min, max)
{
	if(value < min)
		return min;
	if(value > max)
		return max;
	return value;
}

function intersects(x1, y1, w1, h1, x2, y2, w2, h2)
{
	if(y2 + h2 < y1 ||
	x2 + w2 < x1 ||
	x2 > x1 + w1 ||
	y2 > y1 + h1)
	{
		return false;
	}
	return true;
}


function drawMap()
{
	var startX = -1;
	var maxTiles = (SCREEN_WIDTH / TILE) + 2;	
	var tileX = pixelToTile(player.position.x);
	var offsetX = TILE + (player.position.x - tileToPixel(tileX));
	
	startX = tileX - ((SCREEN_WIDTH / TILE) / 2);
	
	if(startX < -1) 
	{
		startX = -1;
		offsetX = TILE;
	}
	if(startX > MAP.tw - maxTiles)
	{
		startX = MAP.tw - maxTiles + 1;
		offsetX = TILE;
	}		
	
	worldOffsetX = startX * TILE + offsetX;

	for(var layerIdx=0; layerIdx<LAYERS_MAX_DRAW; layerIdx++)
	{		
		for(var y=0; y<level1.layers[layerIdx].height; y++) 
		{	
			var idx = y * level1.layers[layerIdx].width + startX;
				
			for(var x = startX; x < startX+maxTiles; x++) 
			{		
				if(level1.layers[layerIdx].data[idx] != 0)
				{
						// the tiles in the Tiled map are base 1 (meaning a value of 0
						// means no tile), so subtract one from the tileset id to get the
						// correct tile
					var tileIndex = level1.layers[layerIdx].data[idx] - 1;
					var sx = TILESET_PADDING + (tileIndex % TILESET_COUNT_X) * (TILESET_TILE + TILESET_SPACING);
					var sy = TILESET_PADDING + (Math.floor(tileIndex / TILESET_COUNT_Y)) * (TILESET_TILE + TILESET_SPACING);
					
					context.drawImage(tileset, sx, sy, TILESET_TILE, TILESET_TILE, (x-startX)*TILE - offsetX, (y-1)*TILE, TILESET_TILE, TILESET_TILE);
				}
				
				idx++;
			}
		}		
	}
}

function updateStatePlay(deltaTime)
{
	player.update(deltaTime);
	
	
	//update enemy
	for(var i =0; i<enemies.length; i++)
	{
		enemies[i].update(deltaTime);
		// check if enemy hits player remove one life
		
		if(player.isAlive == true)
		{
			if( intersects( player.position.x, player.position.y, TILE, TILE,
						enemies[i].position.x, enemies[i].position.y, TILE, TILE) == true)
			{
				player.isAlive = false;
				lives = lives -1;
				if(lives > 0)
				{
					player.respawn();
					gameState = STATE_PLAY;
				}
				else
				{
					gameState = STATE_GAME_OVER;
				}
				break;
			}
			// Check if player has fallen off the screen
			if(player.position.y > SCREEN_HEIGHT) // fell off screen
			{
				player.isAlive = false;
				lives = lives -1;
				if(lives > 0)
				{
					player.respawn();
					gameState = STATE_PLAY;
				}
				else
				{
					gameState = STATE_GAME_OVER;
				}
				break;
			}
			// Check if it has reached the end
			
			var tx = pixelToTile(player.position.x);
			var ty = pixelToTile(player.position.y);
			if(cellAtTileCoord(LAYER_TRIGGERS, tx, ty) !=0)
			{
				gameState = STATE_GAME_OVER;
			}
			
		}		
		
	}
	
	// update bullets
	var hit = false;
	for(var i=0; i<bullets.length; i++)
	{
		bullets[i].update(deltaTime);
		// check if bullet has gone off the screen
		if(bullets[i].position.x - worldOffsetX < 0 || bullets[i].position.x - worldOffsetX > SCREEN_WIDTH)
		{
			hit = true;
		}
		// check if bullet has hit the enemy
		for(var j=0; j<enemies.length; j++)
		{
			if(intersects(bullets[i].position.x, bullets[i].position.y, TILE, TILE,
			    enemies[j].position.x, enemies[j].position.y, TILE, TILE))
			{
				    // remove the bullet and the enemy
				    enemies.splice(j, 1);
				    hit = true;
				    // increase score
				    score += 1
				    break;
			}
			    
		}
		
		
		if(hit==true)
		{
			bullets.splice(i, 1);
			break;
		}			
	}		
}


function drawStatePlay()
{
	drawMap();
	player.draw();
	
	//draw enemies
	for(var i =0; i<enemies.length; i++)
	{
		enemies[i].draw();
	}
	
	// draw bullets
	for(var i=0; i<bullets.length; i++)
	{
		bullets[i].draw();
	}
		
	//draw the HUD elements
	
	//score
	context.fillStyle = "yellow";
	context.font = "32px Arial";
	var scoreText = "Score: " + score;
	context.fillText(scoreText, SCREEN_WIDTH - 170, 35);
	
	// lives counter
	for(var i=0; i<lives; i++)
	{
		context.drawImage(heartImage, 20 + (heartImage.width+2)*i, 10);
	}	
}

function updateStateGameOver(deltaTime)
{
	player.update(deltaTime);
	
	for(var i=0; i<enemies.length; i++)
	{
		enemies[i].update(deltaTime);
	}
	
	for(var i=0; i<bullets.length; i++)
	{
		bullets[i].update(deltaTime);
	}
}

function drawStateGameOver()
{
	drawMap();
	
	player.draw();

	for(var i=0; i<enemies.length; i++)
	{
		enemies[i].draw();
	}
	
	for(var i=0; i<bullets.length; i++)
	{
		bullets[i].draw();
	}
	
	// draw score and Game Over
	context.font = "24px Verdana";
	context.fillStyle = "#FF0";
	context.fillText("Score: " + score, 20, 40);
	
	context.font = "72px Verdana";
	context.fillStyle = "#FF0";
	var width = context.measureText("GAME OVER").width;
	context.fillText("GAME OVER", SCREEN_WIDTH/2 - width/2, SCREEN_HEIGHT/2)	
	
}


function run()
{
	context.fillStyle = "#ccc";		
	context.fillRect(0, 0, canvas.width, canvas.height);
	
	var deltaTime = getDeltaTime();
	
	switch(gameState)
	{
		case STATE_PLAY:
			updateStatePlay(deltaTime);
			drawStatePlay();
			break;
		case STATE_GAME_OVER:
			updateStateGameOver(deltaTime);
			drawStateGameOver();
			break;
	}
				
		
		// update the frame counter 
	fpsTime += deltaTime;
	fpsCount++;
	if(fpsTime >= 1)
	{
		fpsTime -= 1;
		fps = fpsCount;
		fpsCount = 0;
	}		
		
	// draw the FPS
	context.fillStyle = "#f00";
	context.font="14px Arial";
	context.fillText("FPS: " + fps, 5, 20, 100);
}

initialize();


//-------------------- Don't modify anything below here


// This code will set up the framework so that the 'run' function is called 60 times per second.
// We have a some options to fall back on in case the browser doesn't support our preferred method.
(function() {
  var onEachFrame;
  if (window.requestAnimationFrame) {
    onEachFrame = function(cb) {
      var _cb = function() { cb(); window.requestAnimationFrame(_cb); }
      _cb();
    };
  } else if (window.mozRequestAnimationFrame) {
    onEachFrame = function(cb) {
      var _cb = function() { cb(); window.mozRequestAnimationFrame(_cb); }
      _cb();
    };
  } else {
    onEachFrame = function(cb) {
      setInterval(cb, 1000 / 60);
    }
  }
  
  window.onEachFrame = onEachFrame;
})();

window.onEachFrame(run);
