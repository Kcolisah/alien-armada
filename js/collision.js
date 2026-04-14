// js/collision.js
// Five collision functions require sprite objects with centerX/centerY/halfWidth/halfHeight/etc.

export function hitTestPoint(px, py, sprite) {
  return (
    px > sprite.left() &&
    px < sprite.right() &&
    py > sprite.top() &&
    py < sprite.bottom()
  );
}

export function hitTestCircle(c1, c2) {
  const dx = c1.centerX() - c2.centerX();
  const dy = c1.centerY() - c2.centerY();
  const distance = Math.hypot(dx, dy);
  return distance < (c1.halfWidth() + c2.halfWidth());
}

export function blockCircle(c1, c2) {
  const dx = c1.centerX() - c2.centerX();
  const dy = c1.centerY() - c2.centerY();
  const distance = Math.hypot(dx, dy);
  const minDist = c1.halfWidth() + c2.halfWidth();

  if (distance < minDist) {
    const overlap = minDist - distance;
    const nx = dx / distance;
    const ny = dy / distance;
    c1.x += overlap * nx;
    c1.y += overlap * ny;
  }
}

export function hitTestRectangle(r1, r2) {
  const vx = r1.centerX() - r2.centerX();
  const vy = r1.centerY() - r2.centerY();
  return (
    Math.abs(vx) < (r1.halfWidth() + r2.halfWidth()) &&
    Math.abs(vy) < (r1.halfHeight() + r2.halfHeight())
  );
}

export function blockRectangle(r1, r2) {
  let collisionSide = "none";
  const vx = r1.centerX() - r2.centerX();
  const vy = r1.centerY() - r2.centerY();
  const hW = r1.halfWidth()  + r2.halfWidth();
  const hH = r1.halfHeight() + r2.halfHeight();

  if (Math.abs(vx) < hW && Math.abs(vy) < hH) {
    const overlapX = hW - Math.abs(vx);
    const overlapY = hH - Math.abs(vy);

    if (overlapX >= overlapY) {
      if (vy > 0) {
        collisionSide = "top";
        r1.y += overlapY;
      } else {
        collisionSide = "bottom";
        r1.y -= overlapY;
      }
    } else {
      if (vx > 0) {
        collisionSide = "left";
        r1.x += overlapX;
      } else {
        collisionSide = "right";
        r1.x -= overlapX;
      }
    }
  }

  return collisionSide;
}
