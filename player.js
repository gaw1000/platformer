
var LEFT = 0;
var RIGHT = 1;

var ANIM_IDLE_LEFT = 0;
var ANIM_JUMP_LEFT = 1;
var ANIM_WALK_LEFT = 2;
var ANIM_SHOOT_LEFT = 3;
var ANIM_CLIMB = 4;
var ANIM_IDLE_RIGHT = 5;
var ANIM_JUMP_RIGHT = 6;
var ANIM_WALK_RIGHT = 7;
var ANIM_SHOOT_RIGHT = 8;
var ANIM_MAX = 9;

var STATE_RUN_JUMP = 0;
var STATE_CLIMB = 1;

var Player = function() {	
	this.sprite = new Sprite("ChuckNorris.png");
	this.sprite.buildAnimation(12, 8, 165, 126, 0.05, [0, 1, 2, 3, 4, 5, 6, 7]);
	this.sprite.buildAnimation(12, 8, 165, 126, 0.05, [8, 9, 10, 11, 12]);
	this.sprite.buildAnimation(12, 8, 165, 126, 0.05, [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26]);
	this.sprite.buildAnimation(12, 8, 165, 126, 0.05, [27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40]);	
	this.sprite.buildAnimation(12, 8, 165, 126, 0.05, [41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51]);
	this.sprite.buildAnimation(12, 8, 165, 126, 0.05, [52, 53, 54, 55, 56, 57, 58, 59]);
	this.sprite.buildAnimation(12, 8, 165, 126, 0.05, [60, 61, 62, 63, 64]);
	this.sprite.buildAnimation(12, 8, 165, 126, 0.05, [65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78]);
	this.sprite.buildAnimation(12, 8, 165, 126, 0.05, [79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92]);	
	for(var i=0; i<ANIM_MAX; i++)
	{
		this.sprite.setAnimationOffset(i, -55, -87);
	}
	
	this.position = new Vector2();
	this.position.set(9*TILE, 0*TILE); 	
	this.width = 159;
	this.height = 163;
	

	this.velocity = new Vector2();
	this.falling = true;
	this.jumping = false;
	this.isAlive = true;
	this.bulletTimer = 0;	
	
	this.direction = LEFT;
	this.state = STATE_RUN_JUMP;
   
};

Player.prototype.respawn = function()
{
	this.position.set(9*TILE, 0*TILE);
	this.falling = true;
	this.jumping = false;
	this.isAlive = true;
}

Player.prototype.updateClimbState = function(dt)
{
	var left = false;
	var right = false;
	var climbUp = false;
	var climbDown = false;
	
	if(keyboard.isKeyDown(keyboard.KEY_UP) == true)
	{
		climbUp = true;
		this.sprite.update(dt);
	}
	if(keyboard.isKeyDown(keyboard.KEY_DOWN) == true)
	{
		climbDown = true;
		this.sprite.update(dt);
	}
	
	var wasleft = this.velocity.x < 0;
	var wasright = this.velocity.x > 0;
	var wasup = this.velocity.y < 0;
	var wasdown = this.velocity.y > 0;
	
	//acceleration
	var ddx = 0;
	var ddy = 0;
	
	if(left)
		ddx = ddx - ACCEL; // wants to go left
	else if (wasleft)
		ddx = ddx + FRICTION; // was going left, not now
	
	if (right)
		ddx = ddx + ACCEL;     // player wants to go right
	else if (wasright)
		ddx = ddx - FRICTION;  // player was going right, but not any more
	
	if(climbUp)
		ddy = ddy - ACCEL; // wants to go up
	else if(wasup)
	{
		this.velocity.y = 0;
		ddx = 0;
	}
	
	if(climbDown)
		ddy = ddy + ACCEL; // wants to go down
	else if(wasdown)
	{
		this.velocity.y = 0;
		ddx = 0;
	}
	
	// And integrate the forces to calculate the new position and velocity:
	this.position.y = Math.floor(this.position.y  + (dt * this.velocity.y));
	this.position.x = Math.floor(this.position.x  + (dt * this.velocity.x));
	this.velocity.x = bound(this.velocity.x + (dt * ddx), -MAXDX, MAXDX);
	this.velocity.y = bound(this.velocity.y + (dt * ddy), -MAXDY, MAXDY);
	
	
	if ((wasleft  && (this.velocity.x > 0)) ||
		(wasright && (this.velocity.x < 0))) 
	{		
		// clamp at zero to prevent friction from making us jiggle side to side
		this.velocity.x = 0; 
	}
	
	// if we go past the end of the ladder (either top or bottom) then 
	// switch back to the RunJump state
	var tx = pixelToTile(this.position.x);
	var ty = pixelToTile(this.position.y);
    var nx = (this.position.x)%TILE;         // true if player overlaps right
    var ny = (this.position.y)%TILE;         // true if player overlaps below
    var cell = cellAtTileCoord(LAYER_LADDERS, tx, ty);
    var cellright = cellAtTileCoord(LAYER_LADDERS, tx + 1, ty);
    var celldown = cellAtTileCoord(LAYER_LADDERS, tx, ty + 1);
    var celldiag = cellAtTileCoord(LAYER_LADDERS, tx + 1, ty + 1);
	
	if (this.velocity.y > 0 || wasdown) 		// moving down
	{
		if ((!celldown && cell) || (!celldiag && cellright && nx)) 
		{
			this.position.y = tileToPixel(ty);      // clamp the y position to avoid falling into platform below
			this.velocity.y = 0;            // stop downward velocity						
			this.state = STATE_RUN_JUMP;
		}
	}
	else if (this.velocity.y < 0 || wasup) 	// moving up
	{
		if ((!cell && !celldown) && ((!cellright && !celldiag && nx) || !nx))
		{
			this.position.y = tileToPixel(ty + 1);  // clamp the y position to avoid jumping into platform above
			this.velocity.y = 0;            // stop upward velocity				
			this.state = STATE_RUN_JUMP;
		}		
	}		
		
};

Player.prototype.updateRunJumpState = function(deltaTime)
{
	var left = false;
	var right = false;
	var jump = false;
	
	this.sprite.update(deltaTime);

	// check keypress events
	if(keyboard.isKeyDown(keyboard.KEY_LEFT) == true) {
		left = true;
		this.direction = LEFT;
		if(this.sprite.currentAnimation != ANIM_WALK_LEFT && this.jumping == false)
			this.sprite.setAnimation(ANIM_WALK_LEFT);
	}
	else if(keyboard.isKeyDown(keyboard.KEY_RIGHT) == true) {
		right = true;
		this.direction = RIGHT;
		if(this.sprite.currentAnimation != ANIM_WALK_RIGHT && this.jumping == false)
			this.sprite.setAnimation(ANIM_WALK_RIGHT);
	}
	else {
		if(this.jumping == false && this.falling == false)
		{
			if(this.direction == LEFT) 
			{
				if(this.sprite.currentAnimation != ANIM_IDLE_LEFT)
					this.sprite.setAnimation(ANIM_IDLE_LEFT);
			}
			else
			{
				if(this.sprite.currentAnimation != ANIM_IDLE_RIGHT)
					this.sprite.setAnimation(ANIM_IDLE_RIGHT);
			}
		}	
		
	}	
	
	if(keyboard.isKeyDown(keyboard.KEY_UP) == true) {
		jump = true;
		if(left == true){
			this.sprite.setAnimation(ANIM_JUMP_LEFT);
		}
		if(right == true){
			this.sprite.setAnimation(ANIM_JUMP_RIGHT);
		}
	}
	
	if(this.bulletTimer > 0)
	{
		this.bulletTimer -= deltaTime;
	}
	if(keyboard.isKeyDown(keyboard.KEY_SPACE)==true && this.bulletTimer<=0){
		sfxFire.play();
		this.bulletTimer = 0.3;
		// Fire bullet code

		var bullet = new Bullet(this.position.x, this.position.y, (this.direction == RIGHT));
		bullets.push(bullet);
		
	}
	
	
	var wasleft = this.velocity.x < 0;
	var wasright = this.velocity.x > 0;
	var falling = this.falling;
	var ddx = 0;
	var ddy = GRAVITY;	
	
	if(left)
		ddx -= ACCEL; // player wants to go left
	else if(wasleft)
		ddx += FRICTION // player was going, dosen't want to anymore

	if(right)
		ddx += ACCEL; // player wants to go right
	else if(wasright)
		ddx -= FRICTION // player was going, dosen't want to anymore
	
	if(jump && !this.jumping && !falling)
	{
		ddy -= JUMP; // appy instantaneous jump
		this.jumping = true;
		if(this.direction == LEFT)
			this.sprite.setAnimation(ANIM_JUMP_LEFT)
		else
			this.sprite.setAnimation(ANIM_JUMP_RIGHT)	
	}
		

 
	// calculate the new position and velocity:	
	this.position.y = Math.floor(this.position.y  + (deltaTime * this.velocity.y));
	this.position.x = Math.floor(this.position.x  + (deltaTime * this.velocity.x));
	this.velocity.x = bound(this.velocity.x + (deltaTime * ddx), -MAXDX, MAXDX);
	
	this.velocity.y = bound(this.velocity.y + (deltaTime * ddy), -MAXDY, MAXDY);
	
	if((wasleft && (this.velocity.x >0)) ||
		(wasright && (this.velocity.x < 0)))
	{
		// clamp at zero to prevent friction rom making us jiggle from side-side

		this.velocity.x = 0;
	}
	
	// collision detection
	// Our collision detection logic is greatly simplified by the fact that the player is a rectangle 
	// and is exactly the same size as a single tile. So we know that the player can only ever 
	// occupy 1, 2 or 4 cells.
	
	// This means we can short-circuit and avoid building a general purpose collision detection 
	// engine by simply looking at the 1 to 4 cells that the player occupies:
	var tx = pixelToTile(this.position.x);
	var ty = pixelToTile(this.position.y);
    var nx = (this.position.x)%TILE;         // true if player overlaps right
    var ny = (this.position.y)%TILE;         // true if player overlaps below
    var cell = cellAtTileCoord(LAYER_PLATFORMS, tx, ty);
    var cellright = cellAtTileCoord(LAYER_PLATFORMS, tx + 1, ty);
    var celldown = cellAtTileCoord(LAYER_PLATFORMS, tx, ty + 1);
    var celldiag = cellAtTileCoord(LAYER_PLATFORMS, tx + 1, ty + 1);
    
	// If the player has vertical velocity, then check to see if they have hit a platform below 
	// or above, in which case, stop their vertical velocity, and clamp their y position:	
	
	if (this.velocity.y>0)
	{
		if((celldown && !cell) || (celldiag && !cellright && nx))
		{
			this.position.y = tileToPixel(ty); // clamp y position to avoid falling into platform below
			this.velocity.y = 0; // stop downward velocity
			this.falling = false; // no longer falling
			this.jumping = false; // no longer jumping
			ny = 0; //no longer overlaps the cell below
		}
	}    
    else if(this.velocity.y <0)
    {
	    if((cell & !celldown) || (cellright && !celldiag && nx))
	    {
		    this.position.y = tileToPixel(ty+1); // clamp the y position to avoid jumping into platform above
		    this.velocity.y = 0; // stop upward velocity
		    cell = celldown; // player in no longer in that cell so we clamp them to the cell below
		    cellright = celldiag; // as above
		    ny = 0; // player no longer overlapping cells 
	    }
    }
	// Apply similar logic to the horizontal velocity:
	if (this.velocity.x > 0) 
	{
		if ((cellright && !cell) || (celldiag  && !celldown && ny)) 
		{
			this.position.x = tileToPixel(tx); 		// clamp the x position to avoid moving into the platform we just hit
			this.velocity.x = 0;			// stop horizontal velocity
		}
	}
	else if (this.velocity.x < 0) 
	{
		if ((cell && !cellright) || (celldown && !celldiag && ny)) 
		{
			this.position.x = tileToPixel(tx + 1);	// clamp the x position to avoid moving into the platform we just hit
			this.velocity.x = 0;          	// stop horizontal velocity
		}
	}	
	
	// The last calculation for our update() method is to detect if the player is now falling or 
	// not. We can do that by looking to see if there is a platform below them
	this.falling = ! (celldown || (nx && celldiag)); 
	
	/*check if the character is standing near a ladder. If they are and the player presses either up or down (depending on whether they 	are standing at the top or bottom of the ladder) then switch to the CLIMB state The player must be standing still and not falling or 	jumping in order to climb a ladder
	*/
	if(right == false && left == false && this.falling == false) 
	{
		var ladderCell = cellAtTileCoord(LAYER_LADDERS, tx, ty);
		var ladderCellright = cellAtTileCoord(LAYER_LADDERS, tx + 1, ty);	
		var ladderCelldown = cellAtTileCoord(LAYER_LADDERS, tx, ty + 1);
		var ladderCelldiag = cellAtTileCoord(LAYER_LADDERS, tx + 1, ty + 1);
		
		if(ladderCell || (ladderCellright && nx))
		{
			if(keyboard.isKeyDown(keyboard.KEY_UP) == true)
			{
				this.state = STATE_CLIMB;
				this.sprite.setAnimation(ANIM_CLIMB);
				return;
			}
		}
		
		if(ladderCelldown || (ladderCelldiag && nx))
		{
			if(keyboard.isKeyDown(keyboard.KEY_DOWN) == true)
			{
				this.state = STATE_CLIMB;
				this.sprite.setAnimation(ANIM_CLIMB);
				return;
			}
		}
	}
	
}




Player.prototype.update = function(deltaTime)
{		
	if(this.isAlive == false)
		return;
		
	if(gameState == STATE_GAME_OVER)
	{
		if(this.sprite.currentAnimation != ANIM_IDLE_RIGHT)
			this.sprite.setAnimation(ANIM_IDLE_RIGHT);
		this.sprite.update(deltaTime);
		return;
	}
	if(this.state == STATE_RUN_JUMP)
	{
		this.updateRunJumpState(deltaTime);
	}
	else if(this.state == STATE_CLIMB)
	{
		this.updateClimbState(deltaTime);
	}
	/*
	// check to see if player has reached the end of the game	
	var tx = pixelToTile(this.position.x);
	var ty = pixelToTile(this.position.y);
	if(cellAtTileCoord(LAYER_TRIGGERS, tx, ty) !=0)
	{
		gameState = STATE_GAME_OVER;
	}			
	*/      
}

Player.prototype.draw = function()
{

	if(this.isAlive == false)
		return;
	
	var screenX = this.position.x - worldOffsetX;			
	this.sprite.draw(context, screenX, this.position.y);
	
}