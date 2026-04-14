// js/objects.js
//--- The base sprite object
const spriteObject = {
  sourceX:      0,
  sourceY:      0,
  sourceWidth:  32,
  sourceHeight: 32,
  width:        32,
  height:       32,
  x:            0,
  y:            0,
  vx:           0,
  vy:           0,
  visible:      true,

  centerX()    { return this.x + this.width/2; },
  centerY()    { return this.y + this.height/2; },
  halfWidth()  { return this.width/2; },
  halfHeight() { return this.height/2; },
  left()       { return this.x; },
  right()      { return this.x + this.width; },
  top()         { return this.y; },
  bottom()      { return this.y + this.height; }
};

//--- The alien object (inherits spriteObject)
const alienObject = Object.create(spriteObject);
alienObject.NORMAL   = 1;
alienObject.EXPLODED = 2;
alienObject.state    = alienObject.NORMAL;
alienObject.update = function() {
  this.sourceX = this.state * this.width;
};

//--- The on‑screen message object
const messageObject = {
  x:            0,
  y:            0,
  visible:      true,
  text:         "",
  font:         "normal bold 20px Helvetica",
  fillStyle:    "#fff",
  textBaseline: "top"
};
