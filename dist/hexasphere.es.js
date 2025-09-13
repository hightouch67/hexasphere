import * as f from "three";
class w {
  constructor(e = 0, t = 0, i = 0) {
    this.faces = [], this.x = parseFloat(e.toFixed(3)), this.y = parseFloat(t.toFixed(3)), this.z = parseFloat(i.toFixed(3));
  }
  subdivide(e, t, i) {
    const n = [];
    n.push(this);
    for (let o = 1; o < t; o++) {
      const s = new w(
        this.x * (1 - o / t) + e.x * (o / t),
        this.y * (1 - o / t) + e.y * (o / t),
        this.z * (1 - o / t) + e.z * (o / t)
      );
      n.push(i(s));
    }
    return n.push(e), n;
  }
  segment(e, t) {
    t = Math.max(0.01, Math.min(1, t));
    const i = e.x * (1 - t) + this.x * t, n = e.y * (1 - t) + this.y * t, o = e.z * (1 - t) + this.z * t;
    return new w(i, n, o);
  }
  project(e) {
    const t = Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2) + Math.pow(this.z, 2)), i = e / t;
    return this.x = this.x * i, this.y = this.y * i, this.z = this.z * i, this;
  }
  registerFace(e) {
    this.faces.find((t) => t.id === e.id) || this.faces.push(e);
  }
  getOrderedFaces() {
    const e = this.faces.slice(), t = [];
    let i = 0;
    for (; i < this.faces.length && e.length > 0; ) {
      if (i === 0)
        t.push(e[0]), e.splice(0, 1);
      else {
        let n = !1;
        for (let o = 0; o < e.length; o++)
          if (e[o].isAdjacentTo(t[i - 1])) {
            t.push(e[o]), e.splice(o, 1), n = !0;
            break;
          }
        if (!n) break;
      }
      i++;
    }
    return t;
  }
  toString() {
    return `${this.x},${this.y},${this.z}`;
  }
}
const j = class j {
  constructor(e, t, i, n = !0) {
    this.id = j.idCounter++, this.points = [e, t, i], n && (e.registerFace(this), t.registerFace(this), i.registerFace(this));
  }
  getOtherPoints(e) {
    return this.points.filter((t) => t.toString() !== e.toString());
  }
  isAdjacentTo(e) {
    if (!(e != null && e.points)) return !1;
    let t = 0;
    for (const i of this.points)
      for (const n of e.points)
        i.toString() === n.toString() && t++;
    return t === 2;
  }
  getCentroid() {
    if (this.centroid) return this.centroid;
    const e = (this.points[0].x + this.points[1].x + this.points[2].x) / 3, t = (this.points[0].y + this.points[1].y + this.points[2].y) / 3, i = (this.points[0].z + this.points[1].z + this.points[2].z) / 3;
    return this.centroid = new w(e, t, i), this.centroid;
  }
};
j.idCounter = 0;
let g = j;
class F {
  constructor(e, t = 1) {
    this.neighbors = [], t = Math.max(0.01, Math.min(1, t)), this.centerPoint = e, this.faces = e.getOrderedFaces(), this.boundary = [], this.neighborIds = [];
    const i = {};
    for (let n = 0; n < this.faces.length; n++) {
      this.boundary.push(this.faces[n].getCentroid().segment(this.centerPoint, t));
      const o = this.faces[n].getOtherPoints(this.centerPoint);
      for (let s = 0; s < Math.min(2, o.length); s++)
        i[o[s].toString()] = 1;
    }
    if (this.neighborIds = Object.keys(i), this.boundary.length >= 4) {
      const n = {
        x: this.boundary[2].x - this.boundary[1].x,
        y: this.boundary[2].y - this.boundary[1].y,
        z: this.boundary[2].z - this.boundary[1].z
      }, o = {
        x: this.boundary[3].x - this.boundary[1].x,
        y: this.boundary[3].y - this.boundary[1].y,
        z: this.boundary[3].z - this.boundary[1].z
      }, s = {
        x: n.y * o.z - n.z * o.y,
        y: n.z * o.x - n.x * o.z,
        z: n.x * o.y - n.y * o.x
      };
      this.centerPoint.x * s.x + this.centerPoint.y * s.y + this.centerPoint.z * s.z < 0 && this.boundary.reverse();
    }
  }
  getLatLon(e) {
    const t = Math.acos(this.centerPoint.y / e), i = (Math.atan2(this.centerPoint.x, this.centerPoint.z) + Math.PI + Math.PI / 2) % (Math.PI * 2) - Math.PI;
    return {
      lat: 180 * t / Math.PI - 90,
      lon: 180 * i / Math.PI
    };
  }
  toString() {
    return this.centerPoint.toString();
  }
}
class I {
  constructor(e, t, i, n, o) {
    this.tiles = [], this.tileLookup = {}, this.pathLines = [], this.tileLabels = [], this.radius = e, this.scene = n, this.viewMode = o, this.loadProjectionMap().then(() => {
      this.generateHexasphere(e, t, i, this.viewMode);
    });
  }
  async loadProjectionMap() {
    return new Promise((e) => {
      const t = document.getElementById("projection");
      if (!t) {
        e();
        return;
      }
      const i = () => {
        this.projectionCanvas = document.createElement("canvas");
        const n = this.projectionCanvas.getContext("2d");
        this.projectionCanvas.width = t.naturalWidth || t.width, this.projectionCanvas.height = t.naturalHeight || t.height, n.drawImage(t, 0, 0), this.projectionData = n.getImageData(0, 0, this.projectionCanvas.width, this.projectionCanvas.height);
      };
      t.complete && t.naturalWidth > 0 ? i() : t.onload = i, e();
    });
  }
  generateHexasphere(e, t, i, n) {
    const o = 1.61803399, s = [
      new w(1e3, o * 1e3, 0),
      new w(-1e3, o * 1e3, 0),
      new w(1e3, -o * 1e3, 0),
      new w(-1e3, -o * 1e3, 0),
      new w(0, 1e3, o * 1e3),
      new w(0, -1e3, o * 1e3),
      new w(0, 1e3, -o * 1e3),
      new w(0, -1e3, -o * 1e3),
      new w(o * 1e3, 0, 1e3),
      new w(-o * 1e3, 0, 1e3),
      new w(o * 1e3, 0, -1e3),
      new w(-o * 1e3, 0, -1e3)
    ], r = {};
    for (const c of s)
      r[c.toString()] = c;
    const l = [
      new g(s[0], s[1], s[4], !1),
      new g(s[1], s[9], s[4], !1),
      new g(s[4], s[9], s[5], !1),
      new g(s[5], s[9], s[3], !1),
      new g(s[2], s[3], s[7], !1),
      new g(s[3], s[2], s[5], !1),
      new g(s[7], s[10], s[2], !1),
      new g(s[0], s[8], s[10], !1),
      new g(s[0], s[4], s[8], !1),
      new g(s[8], s[2], s[10], !1),
      new g(s[8], s[4], s[5], !1),
      new g(s[8], s[5], s[2], !1),
      new g(s[1], s[0], s[6], !1),
      new g(s[11], s[1], s[6], !1),
      new g(s[3], s[9], s[11], !1),
      new g(s[6], s[10], s[7], !1),
      new g(s[3], s[11], s[7], !1),
      new g(s[11], s[6], s[7], !1),
      new g(s[6], s[0], s[10], !1),
      new g(s[9], s[1], s[11], !1)
    ], u = (c) => {
      const h = c.toString();
      return r[h] ? r[h] : (r[h] = c, c);
    };
    let d = [];
    for (let c = 0; c < l.length; c++) {
      let h = [];
      const a = [l[c].points[0]], m = l[c].points[0].subdivide(l[c].points[1], t, u), b = l[c].points[0].subdivide(l[c].points[2], t, u);
      for (let y = 1; y <= t; y++) {
        h = a.slice(), a.length = 0, a.push(...m[y].subdivide(b[y], y, u));
        for (let M = 0; M < y; M++)
          d.push(new g(h[M], a[M], a[M + 1])), M > 0 && d.push(new g(h[M - 1], h[M], a[M]));
      }
    }
    const p = {};
    for (const c in r) {
      const h = r[c].project(e);
      p[h.toString()] = h;
    }
    this.tiles = [], this.tileLookup = {};
    for (const c in p) {
      const h = new F(p[c], i);
      this.tiles.push(h), this.tileLookup[p[c].toString()] = h;
    }
    for (const c of this.tiles)
      for (const h of c.neighborIds) {
        const a = this.tileLookup[h];
        a && a !== c && c.neighbors.push(a);
      }
    console.log(`🔗 Neighbor resolution complete. Tiles: ${this.tiles.length}`);
    const x = this.tiles.filter((c) => c.neighbors.length > 0).length;
    if (console.log(`🔗 Tiles with neighbors: ${x}/${this.tiles.length}`), this.tiles.length > 0) {
      const c = this.tiles.reduce((h, a) => h + a.neighbors.length, 0) / this.tiles.length;
      console.log(`🔗 Average neighbors per tile: ${c.toFixed(1)}`);
    }
    console.log(this.viewMode), (this.viewMode === "tile" || this.viewMode === "both") && this.createMeshes(), (this.viewMode === "planet" || this.viewMode === "both") && this.createPlanetMesh();
  }
  isLand(e, t) {
    if (!this.projectionData || !this.projectionCanvas)
      return Math.random() > 0.3;
    const i = Math.floor(this.projectionCanvas.width * (t + 180) / 360), n = Math.floor(this.projectionCanvas.height * (e + 90) / 180), o = Math.max(0, Math.min(this.projectionCanvas.width - 1, i)), r = (Math.max(0, Math.min(this.projectionCanvas.height - 1, n)) * this.projectionCanvas.width + o) * 4;
    return this.projectionData.data[r] === 0;
  }
  // Public method for tile clicking functionality
  isLandPublic(e, t) {
    return this.isLand(e, t);
  }
  // Helper method to get basic terrain type from coordinates
  getBasicTerrainType(e, t) {
    if (!this.projectionData || !this.projectionCanvas)
      return "ocean";
    const i = Math.floor(this.projectionCanvas.width * (t + 180) / 360), n = Math.floor(this.projectionCanvas.height * (e + 90) / 180), o = Math.max(0, Math.min(this.projectionCanvas.width - 1, i)), r = (Math.max(0, Math.min(this.projectionCanvas.height - 1, n)) * this.projectionCanvas.width + o) * 4, l = this.projectionData.data[r], u = this.projectionData.data[r + 2];
    if (!(l === 0)) return "ocean";
    const p = u;
    return p === 255 ? "arctic" : p === 50 ? "desert" : p === 100 ? "mountain" : p === 180 ? "forest" : p === 200 ? "city" : "forest";
  }
  // Calculate mountain density in surrounding area
  getMountainDensity(e, t, i = 5) {
    let n = 0, o = 0;
    for (let s = -i; s <= i; s += 2)
      for (let r = -i; r <= i; r += 2) {
        const l = e + s, u = t + r;
        l >= -90 && l <= 90 && u >= -180 && u <= 180 && (this.getBasicTerrainType(l, u) === "mountain" && n++, o++);
      }
    return o > 0 ? n / o : 0;
  }
  // Public method to get terrain information
  getTerrainInfo(e, t) {
    if (!this.projectionData || !this.projectionCanvas)
      return { type: "ocean", elevation: 0, temperature: 15, color: 992066 };
    const i = Math.floor(this.projectionCanvas.width * (t + 180) / 360), n = Math.floor(this.projectionCanvas.height * (e + 90) / 180), o = Math.max(0, Math.min(this.projectionCanvas.width - 1, i)), r = (Math.max(0, Math.min(this.projectionCanvas.height - 1, n)) * this.projectionCanvas.width + o) * 4, l = this.projectionData.data[r], u = this.projectionData.data[r + 1], d = this.projectionData.data[r + 2];
    if (!(l === 0)) {
      const m = Math.min(255 - d, 200), b = [992066, 1981066, 2450411, 3900150];
      return {
        type: "ocean",
        elevation: -m,
        temperature: Math.max(0, 25 - Math.abs(e) * 0.3),
        color: b[Math.min(3, Math.floor(m / 50))]
      };
    }
    const c = 35 - Math.abs(e) * 0.7, h = u, a = d;
    if (a === 255)
      return {
        type: "arctic",
        elevation: h,
        temperature: Math.min(c, -5),
        color: 16317180
      };
    if (a === 240)
      return {
        type: "arctic",
        elevation: h,
        temperature: Math.min(c, 0),
        color: 14412542
      };
    if (a === 50) {
      const m = [16498468, 16096779, 14251782, 11817737];
      return {
        type: "desert",
        elevation: h,
        temperature: Math.max(c, 25),
        color: m[Math.min(3, Math.floor(h / 64))]
      };
    } else if (a === 100) {
      const m = [7893356, 5722958, 4472892, 2696484], b = this.getMountainDensity(e, t, 3), y = h, M = 0.3 + b * 0.7, v = y * M, C = 0.9 + Math.random() * 0.2, P = Math.floor(v * C);
      return Math.random() < 5e-3 && console.log(`Mountain at lat:${e.toFixed(1)}, lon:${t.toFixed(1)} - density:${b.toFixed(2)}, base:${y}, final:${P}`), {
        type: "mountain",
        elevation: P,
        temperature: c - P * 0.1,
        color: m[Math.min(3, Math.floor(P / 64))]
      };
    } else return a === 180 ? {
      type: "forest",
      elevation: h,
      temperature: c,
      color: [1467700, 1409085, 1483594, 2278750][Math.min(3, Math.floor(h / 64))]
    } : a === 200 ? {
      type: "city",
      // Using city type for alien terrain
      elevation: h,
      temperature: c + 5,
      color: 16711935
    } : {
      type: "forest",
      elevation: h,
      temperature: c,
      color: [8190976, 3767554, 7859712, 6402857, 8647980][Math.min(4, Math.floor(h / 51))]
    };
  }
  // A* pathfinding between two tiles
  findPath(e, t) {
    const i = [e], n = /* @__PURE__ */ new Set(), o = /* @__PURE__ */ new Map(), s = /* @__PURE__ */ new Map(), r = /* @__PURE__ */ new Map();
    for (const l of this.tiles)
      s.set(l, 1 / 0), r.set(l, 1 / 0);
    for (s.set(e, 0), r.set(e, this.heuristic(e, t)); i.length > 0; ) {
      let l = i[0];
      for (const u of i)
        r.get(u) < r.get(l) && (l = u);
      if (l === t) {
        const u = [];
        let d = l;
        for (; d; )
          u.unshift(d), d = o.get(d);
        return u;
      }
      i.splice(i.indexOf(l), 1), n.add(l);
      for (const u of l.neighbors) {
        if (n.has(u)) continue;
        const d = s.get(l) + 1;
        if (!i.includes(u))
          i.push(u);
        else if (d >= s.get(u))
          continue;
        o.set(u, l), s.set(u, d), r.set(u, d + this.heuristic(u, t));
      }
    }
    return [];
  }
  // Heuristic function for A* (Euclidean distance between tile centers)
  heuristic(e, t) {
    const i = e.centerPoint.x - t.centerPoint.x, n = e.centerPoint.y - t.centerPoint.y, o = e.centerPoint.z - t.centerPoint.z;
    return Math.sqrt(i * i + n * n + o * o);
  }
  // Add a 3D text label above a tile
  addTileLabel(e, t, i = 16777215, n = 5) {
    if (!this.tiles[e]) return new f.Object3D();
    this.tileLabelCounts || (this.tileLabelCounts = /* @__PURE__ */ new Map());
    const s = this.tileLabelCounts.get(e) || 0;
    this.tileLabelCounts.set(e, s + 1);
    const r = document.createElement("canvas"), l = r.getContext("2d");
    r.width = 256, r.height = 64, l.fillStyle = `#${i.toString(16).padStart(6, "0")}`, l.font = "Bold 24px Arial", l.textAlign = "center", l.fillText(t, 128, 40);
    const u = new f.CanvasTexture(r), d = new f.SpriteMaterial({ map: u }), p = new f.Sprite(d), x = s * 2, c = this.getTilePosition(e, n + x);
    p.position.copy(c), p.scale.set(8, 2, 1);
    const h = new f.BufferGeometry(), a = this.getTilePosition(e, 0.5);
    h.setFromPoints([a, c]);
    const m = new f.LineBasicMaterial({
      color: i,
      transparent: !0,
      opacity: 0.7
    }), b = new f.Line(h, m), y = new f.Group();
    return y.add(p), y.add(b), this.scene.add(y), this.tileLabels.push(y), y;
  }
  // Get 3D position above a tile
  getTilePosition(e, t) {
    const i = this.tiles[e];
    if (!i) return new f.Vector3();
    const n = i.centerPoint, o = Math.sqrt(n.x * n.x + n.y * n.y + n.z * n.z);
    return new f.Vector3(n.x / o, n.y / o, n.z / o).multiplyScalar(this.radius + t);
  }
  // Create curved line between two tiles following sphere surface with elevated arc
  createCurvedLine(e, t, i = 65535, n = 20) {
    const o = this.tiles[e], s = this.tiles[t];
    if (!o || !s)
      return new f.Mesh();
    const r = this.getTilePosition(e, 0.5), l = this.getTilePosition(t, 0.5), u = r.distanceTo(l), d = Math.min(u * 0.3, this.radius * 0.25), p = [];
    for (let m = 0; m <= n; m++) {
      const b = m / n, y = r.clone().normalize().dot(l.clone().normalize()), M = Math.acos(Math.max(-1, Math.min(1, y)));
      let v;
      if (M < 1e-3)
        v = r.clone().lerp(l, b);
      else {
        const z = Math.sin(M), T = Math.sin((1 - b) * M) / z, S = Math.sin(b * M) / z;
        v = r.clone().multiplyScalar(T).add(l.clone().multiplyScalar(S)), v.normalize();
      }
      const C = 1 - Math.pow(2 * b - 1, 2), P = 0.5 + d * C;
      v.multiplyScalar(this.radius + P), p.push(v);
    }
    const x = new f.CatmullRomCurve3(p), c = new f.TubeGeometry(x, n, 0.08, 6, !1), h = new f.MeshBasicMaterial({
      color: i,
      transparent: !0,
      opacity: 0.9
    }), a = new f.Mesh(c, h);
    return this.scene.add(a), this.pathLines.push(a), a;
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
      this.scene.remove(e), e.traverse((t) => {
        t instanceof f.Mesh || t instanceof f.Line ? (t.geometry.dispose(), Array.isArray(t.material) ? t.material.forEach((i) => i.dispose()) : t.material.dispose()) : t instanceof f.Sprite && t.material.dispose();
      });
    this.tileLabels = [], this.tileLabelCounts = /* @__PURE__ */ new Map();
  }
  createMeshes() {
    for (const e of this.tiles) {
      if (e.boundary.length < 3) continue;
      const t = e.getLatLon(this.radius), i = this.getTerrainInfo(t.lat, t.lon);
      let n = 0;
      i.type === "mountain" ? n = 0.08 : i.type === "arctic" && i.elevation > 150 ? n = 0.06 : i.type === "desert" ? n = 0.03 : i.type === "forest" ? n = 0.02 : i.type === "city" && (n = 0.12);
      const o = new f.BufferGeometry(), s = [], r = [];
      if (n > 0) {
        const p = i.elevation / 255 * n * this.radius, x = [], c = [];
        for (const a of e.boundary) {
          x.push(a.x, a.y, a.z);
          const m = Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z), b = a.x / m, y = a.y / m, M = a.z / m, v = a.x + b * p, C = a.y + y * p, P = a.z + M * p;
          c.push(v, C, P);
        }
        s.push(...x, ...c);
        const h = e.boundary.length;
        for (let a = 1; a < h - 1; a++)
          r.push(
            h,
            // first top vertex (acts as center)
            h + a,
            // top vertex j
            h + a + 1
            // top vertex j+1
          );
        h > 2 && r.push(
          h,
          // first top vertex
          h + h - 1,
          // last top vertex
          h + 1
          // second top vertex
        );
        for (let a = 0; a < h; a++) {
          const m = (a + 1) % h;
          r.push(
            a,
            // base vertex j
            m,
            // base vertex j+1
            h + a
            // top vertex j
          ), r.push(
            m,
            // base vertex j+1
            h + m,
            // top vertex j+1
            h + a
            // top vertex j
          );
        }
        for (let a = 1; a < h - 1; a++)
          r.push(
            0,
            // first base vertex (acts as center)
            a + 1,
            // base vertex j+1 (reversed winding)
            a
            // base vertex j
          );
        h > 2 && r.push(
          0,
          // first base vertex
          1,
          // second base vertex (reversed)
          h - 1
          // last base vertex
        );
      } else {
        for (const p of e.boundary)
          s.push(p.x, p.y, p.z);
        for (let p = 1; p < e.boundary.length - 1; p++)
          r.push(0, p, p + 1);
        e.boundary.length > 2 && r.push(0, e.boundary.length - 1, 1);
      }
      o.setAttribute("position", new f.Float32BufferAttribute(s, 3)), o.setIndex(r), o.computeVertexNormals();
      const l = i.color, u = new f.MeshLambertMaterial({
        color: l,
        transparent: !0,
        opacity: 0.9
      }), d = new f.Mesh(o, u);
      e.mesh = d, this.scene.add(d);
    }
    console.log(`✅ Created ${this.tiles.length} tiles`);
  }
  createPlanetMesh() {
    const e = new f.SphereGeometry(this.radius, 128, 128), t = e.attributes.position, i = [];
    for (let s = 0; s < t.count; s++) {
      const r = new f.Vector3(
        t.getX(s),
        t.getY(s),
        t.getZ(s)
      ), l = Math.asin(r.y / this.radius) * 180 / Math.PI, d = (Math.atan2(r.z, r.x) * 180 / Math.PI + 180) / 360, p = (l + 90) / 180;
      i.push(d, p);
    }
    e.setAttribute("uv", new f.Float32BufferAttribute(i, 2));
    for (let s = 0; s < t.count; s++) {
      const r = new f.Vector3(
        t.getX(s),
        t.getY(s),
        t.getZ(s)
      );
      let l = this.tiles[0], u = r.distanceTo(new f.Vector3(
        l.centerPoint.x,
        l.centerPoint.y,
        l.centerPoint.z
      ));
      for (const c of this.tiles) {
        const h = r.distanceTo(new f.Vector3(
          c.centerPoint.x,
          c.centerPoint.y,
          c.centerPoint.z
        ));
        h < u && (u = h, l = c);
      }
      const d = l.getLatLon(this.radius), p = this.getTerrainInfo(d.lat, d.lon);
      let x = 0;
      p && p.elevation && (x = p.elevation / 255 * this.radius * 0.08), r.normalize().multiplyScalar(this.radius + x), t.setXYZ(s, r.x, r.y, r.z);
    }
    t.needsUpdate = !0, e.computeVertexNormals();
    let n;
    this.projectionCanvas && (n = new f.CanvasTexture(this.projectionCanvas), n.wrapS = f.RepeatWrapping, n.wrapT = f.RepeatWrapping);
    const o = new f.MeshPhongMaterial({
      map: n,
      transparent: !1,
      flatShading: !1
    });
    this.planetMesh = new f.Mesh(e, o), this.scene.add(this.planetMesh), console.log("🌍 Created planet mesh with elevations and texture");
  }
  getTiles() {
    return this.tiles;
  }
  getPlanetMesh() {
    return this.planetMesh;
  }
  setTileColor(e, t) {
    e >= 0 && e < this.tiles.length && this.tiles[e].mesh && this.tiles[e].mesh.material.color.setHex(t);
  }
  // Clear existing tiles and regenerate
  regenerate(e, t, i) {
    for (const n of this.tiles)
      n.mesh && (this.scene.remove(n.mesh), n.mesh.geometry.dispose(), n.mesh.material.dispose());
    this.clearPathLines(), this.clearTileLabels(), this.tiles = [], this.tileLookup = {}, g.idCounter = 0, this.radius = e, this.generateHexasphere(e, t, i, this.viewMode);
  }
}
export {
  I as HexaSphere
};
