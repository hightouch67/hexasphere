import * as c from "three";
class C {
  constructor(e = 0, t = 0, s = 0) {
    this.faces = [], this.x = parseFloat(e.toFixed(3)), this.y = parseFloat(t.toFixed(3)), this.z = parseFloat(s.toFixed(3));
  }
  subdivide(e, t, s) {
    const i = [];
    i.push(this);
    for (let o = 1; o < t; o++) {
      const n = new C(
        this.x * (1 - o / t) + e.x * (o / t),
        this.y * (1 - o / t) + e.y * (o / t),
        this.z * (1 - o / t) + e.z * (o / t)
      );
      i.push(s(n));
    }
    return i.push(e), i;
  }
  segment(e, t) {
    t = Math.max(0.01, Math.min(1, t));
    const s = e.x * (1 - t) + this.x * t, i = e.y * (1 - t) + this.y * t, o = e.z * (1 - t) + this.z * t;
    return new C(s, i, o);
  }
  project(e) {
    const t = Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2) + Math.pow(this.z, 2)), s = e / t;
    return this.x = this.x * s, this.y = this.y * s, this.z = this.z * s, this;
  }
  registerFace(e) {
    this.faces.find((t) => t.id === e.id) || this.faces.push(e);
  }
  getOrderedFaces() {
    const e = this.faces.slice(), t = [];
    let s = 0;
    for (; s < this.faces.length && e.length > 0; ) {
      if (s === 0)
        t.push(e[0]), e.splice(0, 1);
      else {
        let i = !1;
        for (let o = 0; o < e.length; o++)
          if (e[o].isAdjacentTo(t[s - 1])) {
            t.push(e[o]), e.splice(o, 1), i = !0;
            break;
          }
        if (!i) break;
      }
      s++;
    }
    return t;
  }
  toString() {
    return `${this.x},${this.y},${this.z}`;
  }
}
const j = class j {
  constructor(e, t, s, i = !0) {
    this.id = j.idCounter++, this.points = [e, t, s], i && (e.registerFace(this), t.registerFace(this), s.registerFace(this));
  }
  getOtherPoints(e) {
    return this.points.filter((t) => t.toString() !== e.toString());
  }
  isAdjacentTo(e) {
    if (!(e != null && e.points)) return !1;
    let t = 0;
    for (const s of this.points)
      for (const i of e.points)
        s.toString() === i.toString() && t++;
    return t === 2;
  }
  getCentroid() {
    if (this.centroid) return this.centroid;
    const e = (this.points[0].x + this.points[1].x + this.points[2].x) / 3, t = (this.points[0].y + this.points[1].y + this.points[2].y) / 3, s = (this.points[0].z + this.points[1].z + this.points[2].z) / 3;
    return this.centroid = new C(e, t, s), this.centroid;
  }
};
j.idCounter = 0;
let w = j;
class B {
  constructor(e, t = 1) {
    this.neighbors = [], t = Math.max(0.01, Math.min(1, t)), this.centerPoint = e, this.faces = e.getOrderedFaces(), this.boundary = [], this.neighborIds = [];
    const s = {};
    for (let i = 0; i < this.faces.length; i++) {
      this.boundary.push(this.faces[i].getCentroid().segment(this.centerPoint, t));
      const o = this.faces[i].getOtherPoints(this.centerPoint);
      for (let n = 0; n < Math.min(2, o.length); n++)
        s[o[n].toString()] = 1;
    }
    if (this.neighborIds = Object.keys(s), this.boundary.length >= 4) {
      const i = {
        x: this.boundary[2].x - this.boundary[1].x,
        y: this.boundary[2].y - this.boundary[1].y,
        z: this.boundary[2].z - this.boundary[1].z
      }, o = {
        x: this.boundary[3].x - this.boundary[1].x,
        y: this.boundary[3].y - this.boundary[1].y,
        z: this.boundary[3].z - this.boundary[1].z
      }, n = {
        x: i.y * o.z - i.z * o.y,
        y: i.z * o.x - i.x * o.z,
        z: i.x * o.y - i.y * o.x
      };
      this.centerPoint.x * n.x + this.centerPoint.y * n.y + this.centerPoint.z * n.z < 0 && this.boundary.reverse();
    }
  }
  getLatLon(e) {
    const t = Math.acos(this.centerPoint.y / e), s = (Math.atan2(this.centerPoint.x, this.centerPoint.z) + Math.PI + Math.PI / 2) % (Math.PI * 2) - Math.PI;
    return {
      lat: 180 * t / Math.PI - 90,
      lon: 180 * s / Math.PI
    };
  }
  toString() {
    return this.centerPoint.toString();
  }
}
class H {
  constructor(e, t, s, i, o) {
    this.tiles = [], this.tileLookup = {}, this.pathLines = [], this.tileLabels = [], this.tileOriginalPositions = [], this.instanceDummy = new c.Object3D(), this.radius = e, this.scene = i, this.viewMode = o, this.loadProjectionMap().then(() => {
      this.generateHexasphere(e, t, s, this.viewMode);
    });
  }
  async loadProjectionMap() {
    return new Promise((e) => {
      const t = document.getElementById("projection");
      if (!t) {
        e();
        return;
      }
      const s = () => {
        this.projectionCanvas = document.createElement("canvas");
        const i = this.projectionCanvas.getContext("2d");
        this.projectionCanvas.width = t.naturalWidth || t.width, this.projectionCanvas.height = t.naturalHeight || t.height, i.drawImage(t, 0, 0), this.projectionData = i.getImageData(0, 0, this.projectionCanvas.width, this.projectionCanvas.height);
      };
      t.complete && t.naturalWidth > 0 ? s() : t.onload = s, e();
    });
  }
  generateHexasphere(e, t, s, i) {
    const o = 1.61803399, n = [
      new C(1e3, o * 1e3, 0),
      new C(-1e3, o * 1e3, 0),
      new C(1e3, -o * 1e3, 0),
      new C(-1e3, -o * 1e3, 0),
      new C(0, 1e3, o * 1e3),
      new C(0, -1e3, o * 1e3),
      new C(0, 1e3, -o * 1e3),
      new C(0, -1e3, -o * 1e3),
      new C(o * 1e3, 0, 1e3),
      new C(-o * 1e3, 0, 1e3),
      new C(o * 1e3, 0, -1e3),
      new C(-o * 1e3, 0, -1e3)
    ], h = {};
    for (const r of n)
      h[r.toString()] = r;
    const a = [
      new w(n[0], n[1], n[4], !1),
      new w(n[1], n[9], n[4], !1),
      new w(n[4], n[9], n[5], !1),
      new w(n[5], n[9], n[3], !1),
      new w(n[2], n[3], n[7], !1),
      new w(n[3], n[2], n[5], !1),
      new w(n[7], n[10], n[2], !1),
      new w(n[0], n[8], n[10], !1),
      new w(n[0], n[4], n[8], !1),
      new w(n[8], n[2], n[10], !1),
      new w(n[8], n[4], n[5], !1),
      new w(n[8], n[5], n[2], !1),
      new w(n[1], n[0], n[6], !1),
      new w(n[11], n[1], n[6], !1),
      new w(n[3], n[9], n[11], !1),
      new w(n[6], n[10], n[7], !1),
      new w(n[3], n[11], n[7], !1),
      new w(n[11], n[6], n[7], !1),
      new w(n[6], n[0], n[10], !1),
      new w(n[9], n[1], n[11], !1)
    ], d = (r) => {
      const p = r.toString();
      return h[p] ? h[p] : (h[p] = r, r);
    };
    let M = [];
    for (let r = 0; r < a.length; r++) {
      let p = [];
      const y = [a[r].points[0]], l = a[r].points[0].subdivide(a[r].points[1], t, d), f = a[r].points[0].subdivide(a[r].points[2], t, d);
      for (let u = 1; u <= t; u++) {
        p = y.slice(), y.length = 0, y.push(...l[u].subdivide(f[u], u, d));
        for (let m = 0; m < u; m++)
          M.push(new w(p[m], y[m], y[m + 1])), m > 0 && M.push(new w(p[m - 1], p[m], y[m]));
      }
    }
    const g = {};
    for (const r in h) {
      const p = h[r].project(e);
      g[p.toString()] = p;
    }
    this.tiles = [], this.tileLookup = {};
    for (const r in g) {
      const p = new B(g[r], s);
      this.tiles.push(p), this.tileLookup[g[r].toString()] = p;
    }
    for (const r of this.tiles)
      for (const p of r.neighborIds) {
        const y = this.tileLookup[p];
        y && y !== r && r.neighbors.push(y);
      }
    console.log(`🔗 Neighbor resolution complete. Tiles: ${this.tiles.length}`);
    const x = this.tiles.filter((r) => r.neighbors.length > 0).length;
    if (console.log(`🔗 Tiles with neighbors: ${x}/${this.tiles.length}`), this.tiles.length > 0) {
      const r = this.tiles.reduce((p, y) => p + y.neighbors.length, 0) / this.tiles.length;
      console.log(`🔗 Average neighbors per tile: ${r.toFixed(1)}`);
    }
    console.log(this.viewMode), (this.viewMode === "tile" || this.viewMode === "both") && this.createMeshes(), (this.viewMode === "planet" || this.viewMode === "both") && (console.log("🌍 Creating planet and atmosphere meshes..."), this.createPlanetMesh(), this.createAtmosphereMesh());
  }
  isLand(e, t) {
    if (!this.projectionData || !this.projectionCanvas)
      return Math.random() > 0.3;
    const s = Math.floor(this.projectionCanvas.width * (t + 180) / 360), i = Math.floor(this.projectionCanvas.height * (e + 90) / 180), o = Math.max(0, Math.min(this.projectionCanvas.width - 1, s)), h = (Math.max(0, Math.min(this.projectionCanvas.height - 1, i)) * this.projectionCanvas.width + o) * 4;
    return this.projectionData.data[h] === 0;
  }
  // Public method for tile clicking functionality
  isLandPublic(e, t) {
    return this.isLand(e, t);
  }
  // Helper method to get basic terrain type from coordinates
  getBasicTerrainType(e, t) {
    if (!this.projectionData || !this.projectionCanvas)
      return "ocean";
    const s = Math.floor(this.projectionCanvas.width * (t + 180) / 360), i = Math.floor(this.projectionCanvas.height * (e + 90) / 180), o = Math.max(0, Math.min(this.projectionCanvas.width - 1, s)), h = (Math.max(0, Math.min(this.projectionCanvas.height - 1, i)) * this.projectionCanvas.width + o) * 4, a = this.projectionData.data[h], d = this.projectionData.data[h + 2];
    if (!(a === 0)) return "ocean";
    const g = d;
    return g === 255 ? "arctic" : g === 50 ? "desert" : g === 100 ? "mountain" : g === 180 ? "forest" : g === 200 ? "city" : "forest";
  }
  // Calculate mountain density in surrounding area
  getMountainDensity(e, t, s = 5) {
    let i = 0, o = 0;
    for (let n = -s; n <= s; n += 2)
      for (let h = -s; h <= s; h += 2) {
        const a = e + n, d = t + h;
        a >= -90 && a <= 90 && d >= -180 && d <= 180 && (this.getBasicTerrainType(a, d) === "mountain" && i++, o++);
      }
    return o > 0 ? i / o : 0;
  }
  // Public method to get terrain information
  getTerrainInfo(e, t) {
    if (!this.projectionData || !this.projectionCanvas)
      return { type: "ocean", elevation: 0, temperature: 15, color: 992066 };
    const s = Math.floor(this.projectionCanvas.width * (t + 180) / 360), i = Math.floor(this.projectionCanvas.height * (e + 90) / 180), o = Math.max(0, Math.min(this.projectionCanvas.width - 1, s)), h = (Math.max(0, Math.min(this.projectionCanvas.height - 1, i)) * this.projectionCanvas.width + o) * 4, a = this.projectionData.data[h], d = this.projectionData.data[h + 1], M = this.projectionData.data[h + 2];
    if (!(a === 0)) {
      const l = Math.min(255 - M, 200), f = [992066, 1981066, 2450411, 3900150];
      return {
        type: "ocean",
        elevation: -l,
        temperature: Math.max(0, 25 - Math.abs(e) * 0.3),
        color: f[Math.min(3, Math.floor(l / 50))]
      };
    }
    const r = 35 - Math.abs(e) * 0.7, p = d, y = M;
    if (y === 255)
      return {
        type: "arctic",
        elevation: p,
        temperature: Math.min(r, -5),
        color: 16317180
      };
    if (y === 240)
      return {
        type: "arctic",
        elevation: p,
        temperature: Math.min(r, 0),
        color: 14412542
      };
    if (y === 50) {
      const l = [16498468, 16096779, 14251782, 11817737];
      return {
        type: "desert",
        elevation: p,
        temperature: Math.max(r, 25),
        color: l[Math.min(3, Math.floor(p / 64))]
      };
    } else if (y === 100) {
      const l = [7893356, 5722958, 4472892, 2696484], f = this.getMountainDensity(e, t, 3), u = p, m = 0.3 + f * 0.7, v = u * m, P = 0.9 + Math.random() * 0.2, b = Math.floor(v * P);
      return Math.random() < 5e-3 && console.log(`Mountain at lat:${e.toFixed(1)}, lon:${t.toFixed(1)} - density:${f.toFixed(2)}, base:${u}, final:${b}`), {
        type: "mountain",
        elevation: b,
        temperature: r - b * 0.1,
        color: l[Math.min(3, Math.floor(b / 64))]
      };
    } else return y === 180 ? {
      type: "forest",
      elevation: p,
      temperature: r,
      color: [1467700, 1409085, 1483594, 2278750][Math.min(3, Math.floor(p / 64))]
    } : y === 200 ? {
      type: "city",
      // Using city type for alien terrain
      elevation: p,
      temperature: r + 5,
      color: 16711935
    } : {
      type: "forest",
      elevation: p,
      temperature: r,
      color: [8190976, 3767554, 7859712, 6402857, 8647980][Math.min(4, Math.floor(p / 51))]
    };
  }
  // A* pathfinding between two tiles
  findPath(e, t) {
    const s = [e], i = /* @__PURE__ */ new Set(), o = /* @__PURE__ */ new Map(), n = /* @__PURE__ */ new Map(), h = /* @__PURE__ */ new Map();
    for (const a of this.tiles)
      n.set(a, 1 / 0), h.set(a, 1 / 0);
    for (n.set(e, 0), h.set(e, this.heuristic(e, t)); s.length > 0; ) {
      let a = s[0];
      for (const d of s)
        h.get(d) < h.get(a) && (a = d);
      if (a === t) {
        const d = [];
        let M = a;
        for (; M; )
          d.unshift(M), M = o.get(M);
        return d;
      }
      s.splice(s.indexOf(a), 1), i.add(a);
      for (const d of a.neighbors) {
        if (i.has(d)) continue;
        const M = n.get(a) + 1;
        if (!s.includes(d))
          s.push(d);
        else if (M >= n.get(d))
          continue;
        o.set(d, a), n.set(d, M), h.set(d, M + this.heuristic(d, t));
      }
    }
    return [];
  }
  // Heuristic function for A* (Euclidean distance between tile centers)
  heuristic(e, t) {
    const s = e.centerPoint.x - t.centerPoint.x, i = e.centerPoint.y - t.centerPoint.y, o = e.centerPoint.z - t.centerPoint.z;
    return Math.sqrt(s * s + i * i + o * o);
  }
  // Add a 3D text label above a tile
  addTileLabel(e, t, s = 16777215, i = 5) {
    if (!this.tiles[e]) return new c.Object3D();
    this.tileLabelCounts || (this.tileLabelCounts = /* @__PURE__ */ new Map());
    const n = this.tileLabelCounts.get(e) || 0;
    this.tileLabelCounts.set(e, n + 1);
    const h = document.createElement("canvas"), a = h.getContext("2d");
    h.width = 256, h.height = 64, a.fillStyle = `#${s.toString(16).padStart(6, "0")}`, a.font = "Bold 24px Arial", a.textAlign = "center", a.fillText(t, 128, 40);
    const d = new c.CanvasTexture(h), M = new c.SpriteMaterial({ map: d }), g = new c.Sprite(M), x = n * 2, r = this.getTilePosition(e, i + x);
    g.position.copy(r), g.scale.set(8, 2, 1);
    const p = new c.BufferGeometry(), y = this.getTilePosition(e, 0.5);
    p.setFromPoints([y, r]);
    const l = new c.LineBasicMaterial({
      color: s,
      transparent: !0,
      opacity: 0.7
    }), f = new c.Line(p, l), u = new c.Group();
    return u.add(g), u.add(f), this.scene.add(u), this.tileLabels.push(u), u;
  }
  // Get 3D position above a tile
  getTilePosition(e, t) {
    const s = this.tiles[e];
    if (!s) return new c.Vector3();
    const i = s.centerPoint, o = Math.sqrt(i.x * i.x + i.y * i.y + i.z * i.z);
    return new c.Vector3(i.x / o, i.y / o, i.z / o).multiplyScalar(this.radius + t);
  }
  // Create curved line between two tiles following sphere surface with elevated arc
  createCurvedLine(e, t, s = 65535, i = 20) {
    const o = this.tiles[e], n = this.tiles[t];
    if (!o || !n)
      return new c.Mesh();
    const h = this.getTilePosition(e, 0.5), a = this.getTilePosition(t, 0.5), d = h.distanceTo(a), M = Math.min(d * 0.3, this.radius * 0.25), g = [];
    for (let l = 0; l <= i; l++) {
      const f = l / i, u = h.clone().normalize().dot(a.clone().normalize()), m = Math.acos(Math.max(-1, Math.min(1, u)));
      let v;
      if (m < 1e-3)
        v = h.clone().lerp(a, f);
      else {
        const S = Math.sin(m), L = Math.sin((1 - f) * m) / S, T = Math.sin(f * m) / S;
        v = h.clone().multiplyScalar(L).add(a.clone().multiplyScalar(T)), v.normalize();
      }
      const P = 1 - Math.pow(2 * f - 1, 2), b = 0.5 + M * P;
      v.multiplyScalar(this.radius + b), g.push(v);
    }
    const x = new c.CatmullRomCurve3(g), r = new c.TubeGeometry(x, i, 0.08, 6, !1), p = new c.MeshBasicMaterial({
      color: s,
      transparent: !0,
      opacity: 0.9
    }), y = new c.Mesh(r, p);
    return this.scene.add(y), this.pathLines.push(y), y;
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
        t instanceof c.Mesh || t instanceof c.Line ? (t.geometry.dispose(), Array.isArray(t.material) ? t.material.forEach((s) => s.dispose()) : t.material.dispose()) : t instanceof c.Sprite && t.material.dispose();
      });
    this.tileLabels = [], this.tileLabelCounts = /* @__PURE__ */ new Map();
  }
  createMeshes() {
    if (this.tileInstancedMesh && (this.scene.remove(this.tileInstancedMesh), this.tileInstancedMesh.geometry.dispose(), this.tileInstancedMesh.material.dispose(), this.tileInstancedMesh = void 0), !this.tiles || this.tiles.length === 0) return;
    const e = 6, t = 1, s = [], i = [];
    s.push(0, 0, 0);
    for (let l = 0; l < e; l++) {
      const f = l / e * Math.PI * 2, u = Math.cos(f) * t, m = Math.sin(f) * t;
      s.push(u, 0, m);
    }
    for (let l = 1; l <= e; l++) {
      const u = l === e ? 1 : l + 1, m = l;
      i.push(0, u, m);
    }
    const o = new c.BufferGeometry();
    o.setAttribute("position", new c.Float32BufferAttribute(s, 3)), o.setIndex(i), o.computeVertexNormals();
    const n = new c.MeshStandardMaterial({
      // We'll tint instance colors, so keep map optional
      // If you want the marble texture applied, you'd need a single texture and proper UVs.
      metalness: 0.1,
      roughness: 0.8,
      flatShading: !1
      // side: THREE.DoubleSide, // Remove double side to allow culling
    }), h = this.tiles.length, a = new c.InstancedMesh(o, n, h);
    a.instanceMatrix.setUsage(c.DynamicDrawUsage), this.tileOriginalPositions = new Array(h);
    const d = typeof a.setColorAt == "function";
    if (!d) {
      const l = new Float32Array(h * 3);
      a.instanceColor = new c.InstancedBufferAttribute(l, 3), a.instanceColor.setUsage(c.DynamicDrawUsage);
    }
    const M = new c.Vector3(0, 1, 0), g = this.instanceDummy, x = new c.Quaternion(), r = new c.Vector3();
    let p = 1;
    for (let l = 0; l < this.tiles.length; l++) {
      const f = this.tiles[l].boundary;
      if (f && f.length > 0) {
        const u = this.tiles[l].centerPoint, m = f[0], v = m.x - u.x, P = m.y - u.y, b = m.z - u.z;
        p = Math.sqrt(v * v + P * P + b * b);
        break;
      }
    }
    const y = p || 1;
    for (let l = 0; l < this.tiles.length; l++) {
      const f = this.tiles[l], u = f.getLatLon(this.radius);
      this.getBasicTerrainType ? this.getBasicTerrainType(u.lat, u.lon) : this.getTerrainInfo(u.lat, u.lon);
      const m = this.getTerrainInfo(u.lat, u.lon);
      let v = 0;
      m.type === "mountain" ? v = 0.08 : m.type === "arctic" && m.elevation > 150 ? v = 0.06 : m.type === "desert" ? v = 0.03 : m.type === "forest" ? v = 0.02 : m.type === "city" && (v = 0.12);
      const P = m.elevation / 255 * v * this.radius, b = f.centerPoint, S = Math.sqrt(b.x * b.x + b.y * b.y + b.z * b.z), L = b.x / S, T = b.y / S, $ = b.z / S, F = new c.Vector3(L, T, $);
      r.copy(F).multiplyScalar(this.radius + P), x.setFromUnitVectors(M, F), g.position.copy(r), g.quaternion.copy(x);
      const O = new c.Quaternion();
      O.setFromAxisAngle(new c.Vector3(0, 1, 0), Math.PI), g.quaternion.multiply(O);
      let I = y;
      if (f.boundary && f.boundary.length > 0) {
        const A = f.centerPoint, D = f.boundary[0], U = D.x - A.x, V = D.y - A.y, k = D.z - A.z;
        I = Math.sqrt(U * U + V * V + k * k) * 0.98;
      }
      g.scale.set(I, 1, I), g.updateMatrix(), a.setMatrixAt(l, g.matrix), this.tileOriginalPositions[l] = r.clone();
      const z = new c.Color(m.color);
      d ? a.setColorAt(l, z) : a.instanceColor.setXYZ(l, z.r, z.g, z.b), f.mesh = a;
    }
    a.instanceMatrix.needsUpdate = !0, d ? a.instanceColor && (a.instanceColor.needsUpdate = !0) : a.instanceColor.needsUpdate = !0, this.tileInstancedMesh = a, this.scene.add(a), console.log(`✅ InstancedMesh created with ${h} tiles.`);
  }
  async createPlanetMesh() {
    const e = new c.SphereGeometry(this.radius, 256, 256), t = new c.TextureLoader(), [s, i] = await Promise.all([
      t.loadAsync("map.png"),
      t.loadAsync("equirectangle_projection.png")
    ]);
    s.wrapS = c.RepeatWrapping, s.wrapT = c.RepeatWrapping, s.colorSpace = c.SRGBColorSpace, s.center.set(0.5, 0), i.wrapS = c.RepeatWrapping, i.wrapT = c.RepeatWrapping, i.colorSpace = c.LinearSRGBColorSpace, ((a) => {
      const d = a.image, M = document.createElement("canvas");
      M.width = d.width, M.height = d.height;
      const g = M.getContext("2d");
      g.drawImage(d, 0, 0);
      const x = g.getImageData(0, 0, M.width, M.height);
      for (let r = 0; r < x.data.length; r += 4)
        x.data[r] = 255 - x.data[r], x.data[r + 1] = 255 - x.data[r + 1], x.data[r + 2] = 255 - x.data[r + 2];
      g.putImageData(x, 0, 0), a.image = M, a.needsUpdate = !0;
    })(i);
    const n = new c.MeshStandardMaterial({
      map: s,
      displacementMap: i,
      displacementScale: this.radius * 0.05
    }), h = e.attributes.uv;
    for (let a = 0; a < h.count; a++)
      h.setX(a, (h.getX(a) + 0.49) % 1);
    h.needsUpdate = !0, this.planetMesh = new c.Mesh(e, n), this.planetMesh.renderOrder = 0, this.scene.add(this.planetMesh);
  }
  createAtmosphereMesh() {
    const t = new c.TextureLoader().load("clouds.png", () => {
      console.log("☁️ Cloud texture loaded successfully");
    }), s = new c.SphereGeometry(this.radius * 1.1, 64, 64), i = new c.MeshStandardMaterial({
      map: t,
      transparent: !0,
      opacity: 0.6,
      side: c.DoubleSide,
      depthWrite: !1
    });
    this.atmosphereMesh = new c.Mesh(s, i), this.atmosphereMesh.renderOrder = 999, this.scene.add(this.atmosphereMesh);
  }
  getTiles() {
    return this.tiles;
  }
  getPlanetMesh() {
    return this.planetMesh;
  }
  getAtmosphereMesh() {
    return this.atmosphereMesh;
  }
  // Animate the atmosphere clouds
  animateAtmosphere(e) {
    this.atmosphereMesh;
  }
  setTileColor(e, t) {
    if (this.tileInstancedMesh) {
      const s = this.tileInstancedMesh, i = typeof s.setColorAt == "function", o = new c.Color(t);
      i ? s.setColorAt(e, o) : s.instanceColor ? (s.instanceColor.setXYZ(e, o.r, o.g, o.b), s.instanceColor.needsUpdate = !0) : s.material.color.setHex(t), s.instanceColor && s.instanceColor.needsUpdate && s.instanceColor.needsUpdate, s.instanceMatrix && s.instanceMatrix.needsUpdate && s.instanceMatrix.needsUpdate;
      return;
    }
    e >= 0 && e < this.tiles.length && this.tiles[e].mesh && this.tiles[e].mesh.material.color.setHex(t);
  }
  // Optional getter so external code can directly access the instanced mesh (if needed)
  getTileInstancedMesh() {
    return this.tileInstancedMesh;
  }
  // Update tile visibility based on camera position - hide tiles on the back of the planet
  updateTileVisibility(e) {
    if (!this.tileInstancedMesh || !this.tiles) return;
    this.scene.updateMatrixWorld();
    const t = this.tileInstancedMesh, s = e.position.clone(), i = new c.Matrix4().copy(this.scene.matrixWorld).invert();
    s.applyMatrix4(i);
    const n = new c.Vector3(0, 0, 0).clone().sub(s).normalize();
    for (let h = 0; h < this.tiles.length; h++) {
      const a = this.tiles[h], g = new c.Vector3(a.centerPoint.x, a.centerPoint.y, a.centerPoint.z).clone().sub(s).dot(n), x = new c.Matrix4();
      t.getMatrixAt(h, x);
      const r = new c.Vector3(), p = new c.Vector3(), y = new c.Quaternion();
      x.decompose(p, y, r);
      let l = this.tileOriginalPositions[h] ? this.tileOriginalPositions[h].clone() : p.clone(), f = r.clone();
      if (g > 0) {
        const u = this.calculateTileScale(a);
        f.set(u, 1, u);
      } else
        l.set(1e4, 1e4, 1e4), f.set(0.01, 0.01, 0.01);
      if (!p.equals(l) || !r.equals(f)) {
        const u = new c.Matrix4();
        u.compose(l, y, f), t.setMatrixAt(h, u);
      }
    }
    t.instanceMatrix.needsUpdate = !0;
  }
  // Helper method to calculate the original scale for a tile
  calculateTileScale(e) {
    if (e.boundary && e.boundary.length > 0) {
      const t = e.centerPoint, s = e.boundary[0], i = s.x - t.x, o = s.y - t.y, n = s.z - t.z;
      return Math.sqrt(i * i + o * o + n * n) * 0.98;
    }
    return 1;
  }
  // Clear existing tiles and regenerate
  regenerate(e, t, s) {
    this.tileInstancedMesh && (this.scene.remove(this.tileInstancedMesh), this.tileInstancedMesh.geometry.dispose(), this.tileInstancedMesh.material.dispose(), this.tileInstancedMesh = void 0), this.tileOriginalPositions = [], this.clearPathLines(), this.clearTileLabels(), this.planetMesh && (this.scene.remove(this.planetMesh), this.planetMesh.geometry.dispose(), this.planetMesh.material.dispose(), this.planetMesh = void 0), this.atmosphereMesh && (this.scene.remove(this.atmosphereMesh), this.atmosphereMesh.geometry.dispose(), this.atmosphereMesh.material.dispose(), this.atmosphereMesh = void 0), this.tiles = [], this.tileLookup = {}, w.idCounter = 0, this.radius = e, this.generateHexasphere(e, t, s, this.viewMode);
  }
}
export {
  H as HexaSphere
};
