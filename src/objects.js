// Base sprite object
const spriteObject = {
  sourceX: 0,
  sourceY: 0,
  sourceWidth: 32,
  sourceHeight: 32,
  width: 32,
  height: 32,
  x: 0,
  y: 0,
  vx: 0,
  vy: 0,
  visible: true,

  centerX: function() {
    return this.x + this.width / 2;
  },

  centerY: function() {
    return this.y + this.height / 2;
  },

  halfWidth: function() {
    return this.width / 2;
  },

  halfHeight: function() {
    return this.height / 2;
  },

  left: function() {
    return this.x;
  },

  right: function() {
    return this.x + this.width;
  },

  top: function() {
    return this.y;
  },

  bottom: function() {
    return this.y + this.height;
  }
};

// Regular alien sprite object
const alienObject = Object.create(spriteObject);
alienObject.NORMAL = 1;
alienObject.EXPLODED = 2;
alienObject.state = alienObject.NORMAL;
alienObject.update = function() {
  this.sourceX = this.state === this.EXPLODED ? 64 : 32;
};

// Message object
const messageObject = {
  x: 0,
  y: 0,
  visible: true,
  text: "",
  font: "normal bold 20px Helvetica",
  fillStyle: "#ffffff",
  textBaseline: "top"
};

// Small helper factory for quick sprite creation
function makeSprite(overrides) {
  return Object.assign(Object.create(spriteObject), overrides || {});
}