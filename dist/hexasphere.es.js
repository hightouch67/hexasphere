import * as M from "three";
class b {
  constructor(e = 0, s = 0, i = 0) {
    this.faces = [], this.x = parseFloat(e.toFixed(3)), this.y = parseFloat(s.toFixed(3)), this.z = parseFloat(i.toFixed(3));
  }
  subdivide(e, s, i) {
    const n = [];
    n.push(this);
    for (let t = 1; t < s; t++) {
      const h = new b(
        this.x * (1 - t / s) + e.x * (t / s),
        this.y * (1 - t / s) + e.y * (t / s),
        this.z * (1 - t / s) + e.z * (t / s)
      );
      n.push(i(h));
    }
    return n.push(e), n;
  }
  segment(e, s) {
    s = Math.max(0.01, Math.min(1, s));
    const i = e.x * (1 - s) + this.x * s, n = e.y * (1 - s) + this.y * s, t = e.z * (1 - s) + this.z * s;
    return new b(i, n, t);
  }
  project(e) {
    const s = Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2) + Math.pow(this.z, 2)), i = e / s;
    return this.x = this.x * i, this.y = this.y * i, this.z = this.z * i, this;
  }
  registerFace(e) {
    this.faces.find((s) => s.id === e.id) || this.faces.push(e);
  }
  getOrderedFaces() {
    const e = this.faces.slice(), s = [];
    let i = 0;
    for (; i < this.faces.length && e.length > 0; ) {
      if (i === 0)
        s.push(e[0]), e.splice(0, 1);
      else {
        let n = !1;
        for (let t = 0; t < e.length; t++)
          if (e[t].isAdjacentTo(s[i - 1])) {
            s.push(e[t]), e.splice(t, 1), n = !0;
            break;
          }
        if (!n) break;
      }
      i++;
    }
    return s;
  }
  toString() {
    return `${this.x},${this.y},${this.z}`;
  }
}
const P = class P {
  constructor(e, s, i, n = !0) {
    this.id = P.idCounter++, this.points = [e, s, i], n && (e.registerFace(this), s.registerFace(this), i.registerFace(this));
  }
  getOtherPoints(e) {
    return this.points.filter((s) => s.toString() !== e.toString());
  }
  isAdjacentTo(e) {
    if (!(e != null && e.points)) return !1;
    let s = 0;
    for (const i of this.points)
      for (const n of e.points)
        i.toString() === n.toString() && s++;
    return s === 2;
  }
  getCentroid() {
    if (this.centroid) return this.centroid;
    const e = (this.points[0].x + this.points[1].x + this.points[2].x) / 3, s = (this.points[0].y + this.points[1].y + this.points[2].y) / 3, i = (this.points[0].z + this.points[1].z + this.points[2].z) / 3;
    return this.centroid = new b(e, s, i), this.centroid;
  }
};
P.idCounter = 0;
let g = P;
class F {
  constructor(e, s = 1) {
    this.neighbors = [], s = Math.max(0.01, Math.min(1, s)), this.centerPoint = e, this.faces = e.getOrderedFaces(), this.boundary = [], this.neighborIds = [];
    const i = {};
    for (let n = 0; n < this.faces.length; n++) {
      this.boundary.push(this.faces[n].getCentroid().segment(this.centerPoint, s));
      const t = this.faces[n].getOtherPoints(this.centerPoint);
      for (let h = 0; h < Math.min(2, t.length); h++)
        i[t[h].toString()] = 1;
    }
    if (this.neighborIds = Object.keys(i), this.boundary.length >= 4) {
      const n = {
        x: this.boundary[2].x - this.boundary[1].x,
        y: this.boundary[2].y - this.boundary[1].y,
        z: this.boundary[2].z - this.boundary[1].z
      }, t = {
        x: this.boundary[3].x - this.boundary[1].x,
        y: this.boundary[3].y - this.boundary[1].y,
        z: this.boundary[3].z - this.boundary[1].z
      }, h = {
        x: n.y * t.z - n.z * t.y,
        y: n.z * t.x - n.x * t.z,
        z: n.x * t.y - n.y * t.x
      };
      this.centerPoint.x * h.x + this.centerPoint.y * h.y + this.centerPoint.z * h.z < 0 && this.boundary.reverse();
    }
  }
  getLatLon(e) {
    const s = Math.acos(this.centerPoint.y / e), i = (Math.atan2(this.centerPoint.x, this.centerPoint.z) + Math.PI + Math.PI / 2) % (Math.PI * 2) - Math.PI;
    return {
      lat: 180 * s / Math.PI - 90,
      lon: 180 * i / Math.PI
    };
  }
  toString() {
    return this.centerPoint.toString();
  }
}
class I {
  constructor(e, s, i, n) {
    this.tiles = [], this.tileLookup = {}, this.pathLines = [], this.tileLabels = [], this.radius = e, this.scene = n, this.loadProjectionMap().then(() => {
      this.generateHexasphere(e, s, i);
    });
  }
  async loadProjectionMap() {
    return new Promise((e) => {
      const s = document.getElementById("projection");
      if (!s) {
        e();
        return;
      }
      const i = () => {
        this.projectionCanvas = document.createElement("canvas");
        const n = this.projectionCanvas.getContext("2d");
        this.projectionCanvas.width = s.naturalWidth || s.width, this.projectionCanvas.height = s.naturalHeight || s.height, n.drawImage(s, 0, 0), this.projectionData = n.getImageData(0, 0, this.projectionCanvas.width, this.projectionCanvas.height);
      };
      s.complete && s.naturalWidth > 0 ? i() : s.onload = i, e();
    });
  }
  generateHexasphere(e, s, i) {
    const n = 1.61803399, t = [
      new b(1e3, n * 1e3, 0),
      new b(-1e3, n * 1e3, 0),
      new b(1e3, -n * 1e3, 0),
      new b(-1e3, -n * 1e3, 0),
      new b(0, 1e3, n * 1e3),
      new b(0, -1e3, n * 1e3),
      new b(0, 1e3, -n * 1e3),
      new b(0, -1e3, -n * 1e3),
      new b(n * 1e3, 0, 1e3),
      new b(-n * 1e3, 0, 1e3),
      new b(n * 1e3, 0, -1e3),
      new b(-n * 1e3, 0, -1e3)
    ], h = {};
    for (const l of t)
      h[l.toString()] = l;
    const r = [
      new g(t[0], t[1], t[4], !1),
      new g(t[1], t[9], t[4], !1),
      new g(t[4], t[9], t[5], !1),
      new g(t[5], t[9], t[3], !1),
      new g(t[2], t[3], t[7], !1),
      new g(t[3], t[2], t[5], !1),
      new g(t[7], t[10], t[2], !1),
      new g(t[0], t[8], t[10], !1),
      new g(t[0], t[4], t[8], !1),
      new g(t[8], t[2], t[10], !1),
      new g(t[8], t[4], t[5], !1),
      new g(t[8], t[5], t[2], !1),
      new g(t[1], t[0], t[6], !1),
      new g(t[11], t[1], t[6], !1),
      new g(t[3], t[9], t[11], !1),
      new g(t[6], t[10], t[7], !1),
      new g(t[3], t[11], t[7], !1),
      new g(t[11], t[6], t[7], !1),
      new g(t[6], t[0], t[10], !1),
      new g(t[9], t[1], t[11], !1)
    ], c = (l) => {
      const p = l.toString();
      return h[p] ? h[p] : (h[p] = l, l);
    };
    let u = [];
    for (let l = 0; l < r.length; l++) {
      let p = [];
      const a = [r[l].points[0]], o = r[l].points[0].subdivide(r[l].points[1], s, c), m = r[l].points[0].subdivide(r[l].points[2], s, c);
      for (let w = 1; w <= s; w++) {
        p = a.slice(), a.length = 0, a.push(...o[w].subdivide(m[w], w, c));
        for (let y = 0; y < w; y++)
          u.push(new g(p[y], a[y], a[y + 1])), y > 0 && u.push(new g(p[y - 1], p[y], a[y]));
      }
    }
    const d = {};
    for (const l in h) {
      const p = h[l].project(e);
      d[p.toString()] = p;
    }
    this.tiles = [], this.tileLookup = {};
    for (const l in d) {
      const p = new F(d[l], i);
      this.tiles.push(p), this.tileLookup[d[l].toString()] = p;
    }
    for (const l of this.tiles)
      for (const p of l.neighborIds) {
        const a = this.tileLookup[p];
        a && a !== l && l.neighbors.push(a);
      }
    console.log(`🔗 Neighbor resolution complete. Tiles: ${this.tiles.length}`);
    const f = this.tiles.filter((l) => l.neighbors.length > 0).length;
    if (console.log(`🔗 Tiles with neighbors: ${f}/${this.tiles.length}`), this.tiles.length > 0) {
      const l = this.tiles.reduce((p, a) => p + a.neighbors.length, 0) / this.tiles.length;
      console.log(`🔗 Average neighbors per tile: ${l.toFixed(1)}`);
    }
    this.createMeshes();
  }
  isLand(e, s) {
    if (!this.projectionData || !this.projectionCanvas)
      return Math.random() > 0.3;
    const i = Math.floor(this.projectionCanvas.width * (s + 180) / 360), n = Math.floor(this.projectionCanvas.height * (e + 90) / 180), t = Math.max(0, Math.min(this.projectionCanvas.width - 1, i)), r = (Math.max(0, Math.min(this.projectionCanvas.height - 1, n)) * this.projectionCanvas.width + t) * 4;
    return this.projectionData.data[r] === 0;
  }
  // Public method for tile clicking functionality
  isLandPublic(e, s) {
    return this.isLand(e, s);
  }
  // Helper method to get basic terrain type from coordinates
  getBasicTerrainType(e, s) {
    if (!this.projectionData || !this.projectionCanvas)
      return "ocean";
    const i = Math.floor(this.projectionCanvas.width * (s + 180) / 360), n = Math.floor(this.projectionCanvas.height * (e + 90) / 180), t = Math.max(0, Math.min(this.projectionCanvas.width - 1, i)), r = (Math.max(0, Math.min(this.projectionCanvas.height - 1, n)) * this.projectionCanvas.width + t) * 4, c = this.projectionData.data[r], u = this.projectionData.data[r + 2];
    if (!(c === 0)) return "ocean";
    const f = u;
    return f === 255 ? "arctic" : f === 50 ? "desert" : f === 100 ? "mountain" : f === 180 ? "forest" : f === 200 ? "city" : "forest";
  }
  // Calculate mountain density in surrounding area
  getMountainDensity(e, s, i = 5) {
    let n = 0, t = 0;
    for (let h = -i; h <= i; h += 2)
      for (let r = -i; r <= i; r += 2) {
        const c = e + h, u = s + r;
        c >= -90 && c <= 90 && u >= -180 && u <= 180 && (this.getBasicTerrainType(c, u) === "mountain" && n++, t++);
      }
    return t > 0 ? n / t : 0;
  }
  // Public method to get terrain information
  getTerrainInfo(e, s) {
    if (!this.projectionData || !this.projectionCanvas)
      return { type: "ocean", elevation: 0, temperature: 15, color: 992066 };
    const i = Math.floor(this.projectionCanvas.width * (s + 180) / 360), n = Math.floor(this.projectionCanvas.height * (e + 90) / 180), t = Math.max(0, Math.min(this.projectionCanvas.width - 1, i)), r = (Math.max(0, Math.min(this.projectionCanvas.height - 1, n)) * this.projectionCanvas.width + t) * 4, c = this.projectionData.data[r], u = this.projectionData.data[r + 1], d = this.projectionData.data[r + 2];
    if (!(c === 0)) {
      const m = Math.min(255 - d, 200), w = [992066, 1981066, 2450411, 3900150];
      return {
        type: "ocean",
        elevation: -m,
        temperature: Math.max(0, 25 - Math.abs(e) * 0.3),
        color: w[Math.min(3, Math.floor(m / 50))]
      };
    }
    const p = 35 - Math.abs(e) * 0.7, a = u, o = d;
    if (o === 255)
      return {
        type: "arctic",
        elevation: a,
        temperature: Math.min(p, -5),
        color: 16317180
      };
    if (o === 240)
      return {
        type: "arctic",
        elevation: a,
        temperature: Math.min(p, 0),
        color: 14412542
      };
    if (o === 50) {
      const m = [16498468, 16096779, 14251782, 11817737];
      return {
        type: "desert",
        elevation: a,
        temperature: Math.max(p, 25),
        color: m[Math.min(3, Math.floor(a / 64))]
      };
    } else if (o === 100) {
      const m = [7893356, 5722958, 4472892, 2696484], w = this.getMountainDensity(e, s, 3), y = a, v = 0.3 + w * 0.7, x = y * v, C = 0.9 + Math.random() * 0.2, j = Math.floor(x * C);
      return Math.random() < 5e-3 && console.log(`Mountain at lat:${e.toFixed(1)}, lon:${s.toFixed(1)} - density:${w.toFixed(2)}, base:${y}, final:${j}`), {
        type: "mountain",
        elevation: j,
        temperature: p - j * 0.1,
        color: m[Math.min(3, Math.floor(j / 64))]
      };
    } else return o === 180 ? {
      type: "forest",
      elevation: a,
      temperature: p,
      color: [1467700, 1409085, 1483594, 2278750][Math.min(3, Math.floor(a / 64))]
    } : o === 200 ? {
      type: "city",
      // Using city type for alien terrain
      elevation: a,
      temperature: p + 5,
      color: 16711935
    } : {
      type: "forest",
      elevation: a,
      temperature: p,
      color: [8190976, 3767554, 7859712, 6402857, 8647980][Math.min(4, Math.floor(a / 51))]
    };
  }
  // A* pathfinding between two tiles
  findPath(e, s) {
    const i = [e], n = /* @__PURE__ */ new Set(), t = /* @__PURE__ */ new Map(), h = /* @__PURE__ */ new Map(), r = /* @__PURE__ */ new Map();
    for (const c of this.tiles)
      h.set(c, 1 / 0), r.set(c, 1 / 0);
    for (h.set(e, 0), r.set(e, this.heuristic(e, s)); i.length > 0; ) {
      let c = i[0];
      for (const u of i)
        r.get(u) < r.get(c) && (c = u);
      if (c === s) {
        const u = [];
        let d = c;
        for (; d; )
          u.unshift(d), d = t.get(d);
        return u;
      }
      i.splice(i.indexOf(c), 1), n.add(c);
      for (const u of c.neighbors) {
        if (n.has(u)) continue;
        const d = h.get(c) + 1;
        if (!i.includes(u))
          i.push(u);
        else if (d >= h.get(u))
          continue;
        t.set(u, c), h.set(u, d), r.set(u, d + this.heuristic(u, s));
      }
    }
    return [];
  }
  // Heuristic function for A* (Euclidean distance between tile centers)
  heuristic(e, s) {
    const i = e.centerPoint.x - s.centerPoint.x, n = e.centerPoint.y - s.centerPoint.y, t = e.centerPoint.z - s.centerPoint.z;
    return Math.sqrt(i * i + n * n + t * t);
  }
  // Add a 3D text label above a tile
  addTileLabel(e, s, i = 16777215, n = 5) {
    if (!this.tiles[e]) return new M.Object3D();
    this.tileLabelCounts || (this.tileLabelCounts = /* @__PURE__ */ new Map());
    const h = this.tileLabelCounts.get(e) || 0;
    this.tileLabelCounts.set(e, h + 1);
    const r = document.createElement("canvas"), c = r.getContext("2d");
    r.width = 256, r.height = 64, c.fillStyle = `#${i.toString(16).padStart(6, "0")}`, c.font = "Bold 24px Arial", c.textAlign = "center", c.fillText(s, 128, 40);
    const u = new M.CanvasTexture(r), d = new M.SpriteMaterial({ map: u }), f = new M.Sprite(d), l = h * 2, p = this.getTilePosition(e, n + l);
    f.position.copy(p), f.scale.set(8, 2, 1);
    const a = new M.BufferGeometry(), o = this.getTilePosition(e, 0.5);
    a.setFromPoints([o, p]);
    const m = new M.LineBasicMaterial({
      color: i,
      transparent: !0,
      opacity: 0.7
    }), w = new M.Line(a, m), y = new M.Group();
    return y.add(f), y.add(w), this.scene.add(y), this.tileLabels.push(y), y;
  }
  // Get 3D position above a tile
  getTilePosition(e, s) {
    const i = this.tiles[e];
    if (!i) return new M.Vector3();
    const n = i.centerPoint, t = Math.sqrt(n.x * n.x + n.y * n.y + n.z * n.z);
    return new M.Vector3(n.x / t, n.y / t, n.z / t).multiplyScalar(this.radius + s);
  }
  // Create curved line between two tiles following sphere surface with elevated arc
  createCurvedLine(e, s, i = 65535, n = 20) {
    const t = this.tiles[e], h = this.tiles[s];
    if (!t || !h)
      return new M.Mesh();
    const r = this.getTilePosition(e, 0.5), c = this.getTilePosition(s, 0.5), u = r.distanceTo(c), d = Math.min(u * 0.3, this.radius * 0.25), f = [];
    for (let m = 0; m <= n; m++) {
      const w = m / n, y = r.clone().normalize().dot(c.clone().normalize()), v = Math.acos(Math.max(-1, Math.min(1, y)));
      let x;
      if (v < 1e-3)
        x = r.clone().lerp(c, w);
      else {
        const L = Math.sin(v), S = Math.sin((1 - w) * v) / L, T = Math.sin(w * v) / L;
        x = r.clone().multiplyScalar(S).add(c.clone().multiplyScalar(T)), x.normalize();
      }
      const C = 1 - Math.pow(2 * w - 1, 2), j = 0.5 + d * C;
      x.multiplyScalar(this.radius + j), f.push(x);
    }
    const l = new M.CatmullRomCurve3(f), p = new M.TubeGeometry(l, n, 0.08, 6, !1), a = new M.MeshBasicMaterial({
      color: i,
      transparent: !0,
      opacity: 0.9
    }), o = new M.Mesh(p, a);
    return this.scene.add(o), this.pathLines.push(o), o;
  }
  // Clear all path lines
  clearPathLines() {
    for (const e of this.pathLines)
      this.scene.remove(e), e.geometry.dispose(), e.material.dispose();
    this.pathLines = [];
  }
  // Clear all tile labels
  clearTileLabels() {
    for (const e of this.tileLabels)
      this.scene.remove(e), e.traverse((s) => {
        s instanceof M.Mesh || s instanceof M.Line ? (s.geometry.dispose(), Array.isArray(s.material) ? s.material.forEach((i) => i.dispose()) : s.material.dispose()) : s instanceof M.Sprite && s.material.dispose();
      });
    this.tileLabels = [], this.tileLabelCounts = /* @__PURE__ */ new Map();
  }
  createMeshes() {
    for (const e of this.tiles) {
      if (e.boundary.length < 3) continue;
      const s = e.getLatLon(this.radius), i = this.getTerrainInfo(s.lat, s.lon);
      let n = 0;
      i.type === "mountain" ? n = 0.08 : i.type === "arctic" && i.elevation > 150 ? n = 0.06 : i.type === "desert" ? n = 0.03 : i.type === "forest" ? n = 0.02 : i.type === "city" && (n = 0.12);
      const t = new M.BufferGeometry(), h = [], r = [];
      if (n > 0) {
        const f = i.elevation / 255 * n * this.radius, l = [], p = [];
        for (const o of e.boundary) {
          l.push(o.x, o.y, o.z);
          const m = Math.sqrt(o.x * o.x + o.y * o.y + o.z * o.z), w = o.x / m, y = o.y / m, v = o.z / m, x = o.x + w * f, C = o.y + y * f, j = o.z + v * f;
          p.push(x, C, j);
        }
        h.push(...l, ...p);
        const a = e.boundary.length;
        for (let o = 1; o < a - 1; o++)
          r.push(
            a,
            // first top vertex (acts as center)
            a + o,
            // top vertex j
            a + o + 1
            // top vertex j+1
          );
        a > 2 && r.push(
          a,
          // first top vertex
          a + a - 1,
          // last top vertex
          a + 1
          // second top vertex
        );
        for (let o = 0; o < a; o++) {
          const m = (o + 1) % a;
          r.push(
            o,
            // base vertex j
            m,
            // base vertex j+1
            a + o
            // top vertex j
          ), r.push(
            m,
            // base vertex j+1
            a + m,
            // top vertex j+1
            a + o
            // top vertex j
          );
        }
        for (let o = 1; o < a - 1; o++)
          r.push(
            0,
            // first base vertex (acts as center)
            o + 1,
            // base vertex j+1 (reversed winding)
            o
            // base vertex j
          );
        a > 2 && r.push(
          0,
          // first base vertex
          1,
          // second base vertex (reversed)
          a - 1
          // last base vertex
        );
      } else {
        for (const f of e.boundary)
          h.push(f.x, f.y, f.z);
        for (let f = 1; f < e.boundary.length - 1; f++)
          r.push(0, f, f + 1);
        e.boundary.length > 2 && r.push(0, e.boundary.length - 1, 1);
      }
      t.setAttribute("position", new M.Float32BufferAttribute(h, 3)), t.setIndex(r), t.computeVertexNormals();
      const c = i.color, u = new M.MeshLambertMaterial({
        color: c,
        transparent: !0,
        opacity: 0.9
      }), d = new M.Mesh(t, u);
      e.mesh = d, this.scene.add(d);
    }
    console.log(`✅ Created ${this.tiles.length} tiles`);
  }
  getTiles() {
    return this.tiles;
  }
  setTileColor(e, s) {
    e >= 0 && e < this.tiles.length && this.tiles[e].mesh && this.tiles[e].mesh.material.color.setHex(s);
  }
  // Clear existing tiles and regenerate
  regenerate(e, s, i) {
    for (const n of this.tiles)
      n.mesh && (this.scene.remove(n.mesh), n.mesh.geometry.dispose(), n.mesh.material.dispose());
    this.clearPathLines(), this.clearTileLabels(), this.tiles = [], this.tileLookup = {}, g.idCounter = 0, this.radius = e, this.generateHexasphere(e, s, i);
  }
}
export {
  I as HexaSphere
};
