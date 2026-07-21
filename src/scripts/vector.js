// Vector helper class
// Self-hosted copy of https://codepen.io/Tibixx/pen/rRBKBm (author: Tibix / @Tiibiix)
// Vendored locally so it loads same-origin (avoids ERR_BLOCKED_BY_RESPONSE.NotSameOrigin).
"use strict";

class Vector {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  add(v) {
    return new Vector(
      this.x + v.x,
      this.y + v.y);
  }

  addTo(v) {
    this.x += v.x;
    this.y += v.y;
  }

  sub(v) {
    return new Vector(
      this.x - v.x,
      this.y - v.y);
  }

  subFrom(v) {
    this.x -= v.x;
    this.y -= v.y;
  }

  mult(n) {
    return new Vector(this.x * n, this.y * n);
  }

  multTo(n) {
    this.x *= n;
    this.y *= n;
  }

  div(n) {
    return new Vector(this.x / n, this.y / n);
  }

  setAngle(angle) {
    var length = this.getLength();
    this.x = Math.cos(angle) * length;
    this.y = Math.sin(angle) * length;
  }

  setLength(length) {
    var angle = this.getAngle();
    this.x = Math.cos(angle) * length;
    this.y = Math.sin(angle) * length;
  }

  getAngle() {
    return Math.atan2(this.y, this.x);
  }

  getLength() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  getLengthSq() {
    return this.x * this.x + this.y * this.y;
  }

  distanceTo(v) {
    return this.sub(v).getLength();
  }

  copy() {
    return new Vector(this.x, this.y);
  }
}

// Expose globally so scripts/index.js can use new Vector(...)
// (matches how the original CodePen-hosted script behaved).
window.Vector = Vector;
