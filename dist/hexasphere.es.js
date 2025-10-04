import * as h from "three";
class C {
  constructor(t = 0, e = 0, n = 0) {
    this.faces = [], this.x = parseFloat(t.toFixed(3)), this.y = parseFloat(e.toFixed(3)), this.z = parseFloat(n.toFixed(3));
  }
  subdivide(t, e, n) {
    const i = [];
    i.push(this);
    for (let o = 1; o < e; o++) {
      const s = new C(
        this.x * (1 - o / e) + t.x * (o / e),
        this.y * (1 - o / e) + t.y * (o / e),
        this.z * (1 - o / e) + t.z * (o / e)
      );
      i.push(n(s));
    }
    return i.push(t), i;
  }
  segment(t, e) {
    e = Math.max(0.01, Math.min(1, e));
    const n = t.x * (1 - e) + this.x * e, i = t.y * (1 - e) + this.y * e, o = t.z * (1 - e) + this.z * e;
    return new C(n, i, o);
  }
  project(t) {
    const e = Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2) + Math.pow(this.z, 2)), n = t / e;
    return this.x = this.x * n, this.y = this.y * n, this.z = this.z * n, this;
  }
  registerFace(t) {
    this.faces.find((e) => e.id === t.id) || this.faces.push(t);
  }
  getOrderedFaces() {
    const t = this.faces.slice(), e = [];
    let n = 0;
    for (; n < this.faces.length && t.length > 0; ) {
      if (n === 0)
        e.push(t[0]), t.splice(0, 1);
      else {
        let i = !1;
        for (let o = 0; o < t.length; o++)
          if (t[o].isAdjacentTo(e[n - 1])) {
            e.push(t[o]), t.splice(o, 1), i = !0;
            break;
          }
        if (!i) break;
      }
      n++;
    }
    return e;
  }
  toString() {
    return `${this.x},${this.y},${this.z}`;
  }
}
const L = class L {
  constructor(t, e, n, i = !0) {
    this.id = L.idCounter++, this.points = [t, e, n], i && (t.registerFace(this), e.registerFace(this), n.registerFace(this));
  }
  getOtherPoints(t) {
    return this.points.filter((e) => e.toString() !== t.toString());
  }
  isAdjacentTo(t) {
    if (!(t != null && t.points)) return !1;
    let e = 0;
    for (const n of this.points)
      for (const i of t.points)
        n.toString() === i.toString() && e++;
    return e === 2;
  }
  getCentroid() {
    if (this.centroid) return this.centroid;
    const t = (this.points[0].x + this.points[1].x + this.points[2].x) / 3, e = (this.points[0].y + this.points[1].y + this.points[2].y) / 3, n = (this.points[0].z + this.points[1].z + this.points[2].z) / 3;
    return this.centroid = new C(t, e, n), this.centroid;
  }
};
L.idCounter = 0;
let w = L;
class U {
  constructor(t, e = 1) {
    this.neighbors = [], e = Math.max(0.01, Math.min(1, e)), this.centerPoint = t, this.faces = t.getOrderedFaces(), this.boundary = [], this.neighborIds = [];
    const n = {};
    for (let i = 0; i < this.faces.length; i++) {
      this.boundary.push(this.faces[i].getCentroid().segment(this.centerPoint, e));
      const o = this.faces[i].getOtherPoints(this.centerPoint);
      for (let s = 0; s < Math.min(2, o.length); s++)
        n[o[s].toString()] = 1;
    }
    if (this.neighborIds = Object.keys(n), this.boundary.length >= 4) {
      const i = {
        x: this.boundary[2].x - this.boundary[1].x,
        y: this.boundary[2].y - this.boundary[1].y,
        z: this.boundary[2].z - this.boundary[1].z
      }, o = {
        x: this.boundary[3].x - this.boundary[1].x,
        y: this.boundary[3].y - this.boundary[1].y,
        z: this.boundary[3].z - this.boundary[1].z
      }, s = {
        x: i.y * o.z - i.z * o.y,
        y: i.z * o.x - i.x * o.z,
        z: i.x * o.y - i.y * o.x
      };
      this.centerPoint.x * s.x + this.centerPoint.y * s.y + this.centerPoint.z * s.z < 0 && this.boundary.reverse();
    }
  }
  getLatLon(t) {
    const e = Math.acos(this.centerPoint.y / t), n = (Math.atan2(this.centerPoint.x, this.centerPoint.z) + Math.PI + Math.PI / 2) % (Math.PI * 2) - Math.PI;
    return {
      lat: 180 * e / Math.PI - 90,
      lon: 180 * n / Math.PI
    };
  }
  toString() {
    return this.centerPoint.toString();
  }
}
class k {
  constructor(t, e, n, i, o) {
    this.tiles = [], this.tileLookup = {}, this.pathLines = [], this.tileLabels = [], this.instanceDummy = new h.Object3D(), this.radius = t, this.scene = i, this.viewMode = o, this.loadProjectionMap().then(() => {
      this.generateHexasphere(t, e, n, this.viewMode);
    });
  }
  async loadProjectionMap() {
    return new Promise((t) => {
      const e = document.getElementById("projection");
      if (!e) {
        t();
        return;
      }
      const n = () => {
        this.projectionCanvas = document.createElement("canvas");
        const i = this.projectionCanvas.getContext("2d");
        this.projectionCanvas.width = e.naturalWidth || e.width, this.projectionCanvas.height = e.naturalHeight || e.height, i.drawImage(e, 0, 0), this.projectionData = i.getImageData(0, 0, this.projectionCanvas.width, this.projectionCanvas.height);
      };
      e.complete && e.naturalWidth > 0 ? n() : e.onload = n, t();
    });
  }
  generateHexasphere(t, e, n, i) {
    const o = 1.61803399, s = [
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
    ], c = {};
    for (const r of s)
      c[r.toString()] = r;
    const a = [
      new w(s[0], s[1], s[4], !1),
      new w(s[1], s[9], s[4], !1),
      new w(s[4], s[9], s[5], !1),
      new w(s[5], s[9], s[3], !1),
      new w(s[2], s[3], s[7], !1),
      new w(s[3], s[2], s[5], !1),
      new w(s[7], s[10], s[2], !1),
      new w(s[0], s[8], s[10], !1),
      new w(s[0], s[4], s[8], !1),
      new w(s[8], s[2], s[10], !1),
      new w(s[8], s[4], s[5], !1),
      new w(s[8], s[5], s[2], !1),
      new w(s[1], s[0], s[6], !1),
      new w(s[11], s[1], s[6], !1),
      new w(s[3], s[9], s[11], !1),
      new w(s[6], s[10], s[7], !1),
      new w(s[3], s[11], s[7], !1),
      new w(s[11], s[6], s[7], !1),
      new w(s[6], s[0], s[10], !1),
      new w(s[9], s[1], s[11], !1)
    ], p = (r) => {
      const d = r.toString();
      return c[d] ? c[d] : (c[d] = r, r);
    };
    let m = [];
    for (let r = 0; r < a.length; r++) {
      let d = [];
      const M = [a[r].points[0]], l = a[r].points[0].subdivide(a[r].points[1], e, p), y = a[r].points[0].subdivide(a[r].points[2], e, p);
      for (let f = 1; f <= e; f++) {
        d = M.slice(), M.length = 0, M.push(...l[f].subdivide(y[f], f, p));
        for (let u = 0; u < f; u++)
          m.push(new w(d[u], M[u], M[u + 1])), u > 0 && m.push(new w(d[u - 1], d[u], M[u]));
      }
    }
    const g = {};
    for (const r in c) {
      const d = c[r].project(t);
      g[d.toString()] = d;
    }
    this.tiles = [], this.tileLookup = {};
    for (const r in g) {
      const d = new U(g[r], n);
      this.tiles.push(d), this.tileLookup[g[r].toString()] = d;
    }
    for (const r of this.tiles)
      for (const d of r.neighborIds) {
        const M = this.tileLookup[d];
        M && M !== r && r.neighbors.push(M);
      }
    console.log(`🔗 Neighbor resolution complete. Tiles: ${this.tiles.length}`);
    const b = this.tiles.filter((r) => r.neighbors.length > 0).length;
    if (console.log(`🔗 Tiles with neighbors: ${b}/${this.tiles.length}`), this.tiles.length > 0) {
      const r = this.tiles.reduce((d, M) => d + M.neighbors.length, 0) / this.tiles.length;
      console.log(`🔗 Average neighbors per tile: ${r.toFixed(1)}`);
    }
    console.log(this.viewMode), (this.viewMode === "tile" || this.viewMode === "both") && this.createMeshes(), (this.viewMode === "planet" || this.viewMode === "both") && (console.log("🌍 Creating planet and atmosphere meshes..."), this.createPlanetMesh(), this.createAtmosphereMesh());
  }
  isLand(t, e) {
    if (!this.projectionData || !this.projectionCanvas)
      return Math.random() > 0.3;
    const n = Math.floor(this.projectionCanvas.width * (e + 180) / 360), i = Math.floor(this.projectionCanvas.height * (t + 90) / 180), o = Math.max(0, Math.min(this.projectionCanvas.width - 1, n)), c = (Math.max(0, Math.min(this.projectionCanvas.height - 1, i)) * this.projectionCanvas.width + o) * 4;
    return this.projectionData.data[c] === 0;
  }
  // Public method for tile clicking functionality
  isLandPublic(t, e) {
    return this.isLand(t, e);
  }
  // Helper method to get basic terrain type from coordinates
  getBasicTerrainType(t, e) {
    if (!this.projectionData || !this.projectionCanvas)
      return "ocean";
    const n = Math.floor(this.projectionCanvas.width * (e + 180) / 360), i = Math.floor(this.projectionCanvas.height * (t + 90) / 180), o = Math.max(0, Math.min(this.projectionCanvas.width - 1, n)), c = (Math.max(0, Math.min(this.projectionCanvas.height - 1, i)) * this.projectionCanvas.width + o) * 4, a = this.projectionData.data[c], p = this.projectionData.data[c + 2];
    if (!(a === 0)) return "ocean";
    const g = p;
    return g === 255 ? "arctic" : g === 50 ? "desert" : g === 100 ? "mountain" : g === 180 ? "forest" : g === 200 ? "city" : "forest";
  }
  // Calculate mountain density in surrounding area
  getMountainDensity(t, e, n = 5) {
    let i = 0, o = 0;
    for (let s = -n; s <= n; s += 2)
      for (let c = -n; c <= n; c += 2) {
        const a = t + s, p = e + c;
        a >= -90 && a <= 90 && p >= -180 && p <= 180 && (this.getBasicTerrainType(a, p) === "mountain" && i++, o++);
      }
    return o > 0 ? i / o : 0;
  }
  // Public method to get terrain information
  getTerrainInfo(t, e) {
    if (!this.projectionData || !this.projectionCanvas)
      return { type: "ocean", elevation: 0, temperature: 15, color: 992066 };
    const n = Math.floor(this.projectionCanvas.width * (e + 180) / 360), i = Math.floor(this.projectionCanvas.height * (t + 90) / 180), o = Math.max(0, Math.min(this.projectionCanvas.width - 1, n)), c = (Math.max(0, Math.min(this.projectionCanvas.height - 1, i)) * this.projectionCanvas.width + o) * 4, a = this.projectionData.data[c], p = this.projectionData.data[c + 1], m = this.projectionData.data[c + 2];
    if (!(a === 0)) {
      const l = Math.min(255 - m, 200), y = [992066, 1981066, 2450411, 3900150];
      return {
        type: "ocean",
        elevation: -l,
        temperature: Math.max(0, 25 - Math.abs(t) * 0.3),
        color: y[Math.min(3, Math.floor(l / 50))]
      };
    }
    const r = 35 - Math.abs(t) * 0.7, d = p, M = m;
    if (M === 255)
      return {
        type: "arctic",
        elevation: d,
        temperature: Math.min(r, -5),
        color: 16317180
      };
    if (M === 240)
      return {
        type: "arctic",
        elevation: d,
        temperature: Math.min(r, 0),
        color: 14412542
      };
    if (M === 50) {
      const l = [16498468, 16096779, 14251782, 11817737];
      return {
        type: "desert",
        elevation: d,
        temperature: Math.max(r, 25),
        color: l[Math.min(3, Math.floor(d / 64))]
      };
    } else if (M === 100) {
      const l = [7893356, 5722958, 4472892, 2696484], y = this.getMountainDensity(t, e, 3), f = d, u = 0.3 + y * 0.7, v = f * u, P = 0.9 + Math.random() * 0.2, x = Math.floor(v * P);
      return Math.random() < 5e-3 && console.log(`Mountain at lat:${t.toFixed(1)}, lon:${e.toFixed(1)} - density:${y.toFixed(2)}, base:${f}, final:${x}`), {
        type: "mountain",
        elevation: x,
        temperature: r - x * 0.1,
        color: l[Math.min(3, Math.floor(x / 64))]
      };
    } else return M === 180 ? {
      type: "forest",
      elevation: d,
      temperature: r,
      color: [1467700, 1409085, 1483594, 2278750][Math.min(3, Math.floor(d / 64))]
    } : M === 200 ? {
      type: "city",
      // Using city type for alien terrain
      elevation: d,
      temperature: r + 5,
      color: 16711935
    } : {
      type: "forest",
      elevation: d,
      temperature: r,
      color: [8190976, 3767554, 7859712, 6402857, 8647980][Math.min(4, Math.floor(d / 51))]
    };
  }
  // A* pathfinding between two tiles
  findPath(t, e) {
    const n = [t], i = /* @__PURE__ */ new Set(), o = /* @__PURE__ */ new Map(), s = /* @__PURE__ */ new Map(), c = /* @__PURE__ */ new Map();
    for (const a of this.tiles)
      s.set(a, 1 / 0), c.set(a, 1 / 0);
    for (s.set(t, 0), c.set(t, this.heuristic(t, e)); n.length > 0; ) {
      let a = n[0];
      for (const p of n)
        c.get(p) < c.get(a) && (a = p);
      if (a === e) {
        const p = [];
        let m = a;
        for (; m; )
          p.unshift(m), m = o.get(m);
        return p;
      }
      n.splice(n.indexOf(a), 1), i.add(a);
      for (const p of a.neighbors) {
        if (i.has(p)) continue;
        const m = s.get(a) + 1;
        if (!n.includes(p))
          n.push(p);
        else if (m >= s.get(p))
          continue;
        o.set(p, a), s.set(p, m), c.set(p, m + this.heuristic(p, e));
      }
    }
    return [];
  }
  // Heuristic function for A* (Euclidean distance between tile centers)
  heuristic(t, e) {
    const n = t.centerPoint.x - e.centerPoint.x, i = t.centerPoint.y - e.centerPoint.y, o = t.centerPoint.z - e.centerPoint.z;
    return Math.sqrt(n * n + i * i + o * o);
  }
  // Add a 3D text label above a tile
  addTileLabel(t, e, n = 16777215, i = 5) {
    if (!this.tiles[t]) return new h.Object3D();
    this.tileLabelCounts || (this.tileLabelCounts = /* @__PURE__ */ new Map());
    const s = this.tileLabelCounts.get(t) || 0;
    this.tileLabelCounts.set(t, s + 1);
    const c = document.createElement("canvas"), a = c.getContext("2d");
    c.width = 256, c.height = 64, a.fillStyle = `#${n.toString(16).padStart(6, "0")}`, a.font = "Bold 24px Arial", a.textAlign = "center", a.fillText(e, 128, 40);
    const p = new h.CanvasTexture(c), m = new h.SpriteMaterial({ map: p }), g = new h.Sprite(m), b = s * 2, r = this.getTilePosition(t, i + b);
    g.position.copy(r), g.scale.set(8, 2, 1);
    const d = new h.BufferGeometry(), M = this.getTilePosition(t, 0.5);
    d.setFromPoints([M, r]);
    const l = new h.LineBasicMaterial({
      color: n,
      transparent: !0,
      opacity: 0.7
    }), y = new h.Line(d, l), f = new h.Group();
    return f.add(g), f.add(y), this.scene.add(f), this.tileLabels.push(f), f;
  }
  // Get 3D position above a tile
  getTilePosition(t, e) {
    const n = this.tiles[t];
    if (!n) return new h.Vector3();
    const i = n.centerPoint, o = Math.sqrt(i.x * i.x + i.y * i.y + i.z * i.z);
    return new h.Vector3(i.x / o, i.y / o, i.z / o).multiplyScalar(this.radius + e);
  }
  // Create curved line between two tiles following sphere surface with elevated arc
  createCurvedLine(t, e, n = 65535, i = 20) {
    const o = this.tiles[t], s = this.tiles[e];
    if (!o || !s)
      return new h.Mesh();
    const c = this.getTilePosition(t, 0.5), a = this.getTilePosition(e, 0.5), p = c.distanceTo(a), m = Math.min(p * 0.3, this.radius * 0.25), g = [];
    for (let l = 0; l <= i; l++) {
      const y = l / i, f = c.clone().normalize().dot(a.clone().normalize()), u = Math.acos(Math.max(-1, Math.min(1, f)));
      let v;
      if (u < 1e-3)
        v = c.clone().lerp(a, y);
      else {
        const S = Math.sin(u), z = Math.sin((1 - y) * u) / S, T = Math.sin(y * u) / S;
        v = c.clone().multiplyScalar(z).add(a.clone().multiplyScalar(T)), v.normalize();
      }
      const P = 1 - Math.pow(2 * y - 1, 2), x = 0.5 + m * P;
      v.multiplyScalar(this.radius + x), g.push(v);
    }
    const b = new h.CatmullRomCurve3(g), r = new h.TubeGeometry(b, i, 0.08, 6, !1), d = new h.MeshBasicMaterial({
      color: n,
      transparent: !0,
      opacity: 0.9
    }), M = new h.Mesh(r, d);
    return this.scene.add(M), this.pathLines.push(M), M;
  }
  // Clear all path lines
  clearPathLines() {
    for (const t of this.pathLines)
      this.scene.remove(t), t.geometry.dispose(), t.material.dispose();
    this.pathLines = [];
  }
  // Clear all tile labels
  clearTileLabels() {
    for (const t of this.tileLabels)
      this.scene.remove(t), t.traverse((e) => {
        e instanceof h.Mesh || e instanceof h.Line ? (e.geometry.dispose(), Array.isArray(e.material) ? e.material.forEach((n) => n.dispose()) : e.material.dispose()) : e instanceof h.Sprite && e.material.dispose();
      });
    this.tileLabels = [], this.tileLabelCounts = /* @__PURE__ */ new Map();
  }
  createMeshes() {
    if (this.tileInstancedMesh && (this.scene.remove(this.tileInstancedMesh), this.tileInstancedMesh.geometry.dispose(), this.tileInstancedMesh.material.dispose(), this.tileInstancedMesh = void 0), !this.tiles || this.tiles.length === 0) return;
    const t = 6, e = 1, n = [], i = [];
    n.push(0, 0, 0);
    for (let l = 0; l < t; l++) {
      const y = l / t * Math.PI * 2, f = Math.cos(y) * e, u = Math.sin(y) * e;
      n.push(f, 0, u);
    }
    for (let l = 1; l <= t; l++) {
      const f = l, u = l === t ? 1 : l + 1;
      i.push(0, f, u);
    }
    const o = new h.BufferGeometry();
    o.setAttribute("position", new h.Float32BufferAttribute(n, 3)), o.setIndex(i), o.computeVertexNormals();
    const s = new h.MeshStandardMaterial({
      // We'll tint instance colors, so keep map optional
      // If you want the marble texture applied, you'd need a single texture and proper UVs.
      metalness: 0.1,
      roughness: 0.8,
      flatShading: !1
    }), c = this.tiles.length, a = new h.InstancedMesh(o, s, c);
    a.instanceMatrix.setUsage(h.DynamicDrawUsage);
    const p = typeof a.setColorAt == "function";
    if (!p) {
      const l = new Float32Array(c * 3);
      a.instanceColor = new h.InstancedBufferAttribute(l, 3), a.instanceColor.setUsage(h.DynamicDrawUsage);
    }
    const m = new h.Vector3(0, 1, 0), g = this.instanceDummy, b = new h.Quaternion(), r = new h.Vector3();
    let d = 1;
    for (let l = 0; l < this.tiles.length; l++) {
      const y = this.tiles[l].boundary;
      if (y && y.length > 0) {
        const f = this.tiles[l].centerPoint, u = y[0], v = u.x - f.x, P = u.y - f.y, x = u.z - f.z;
        d = Math.sqrt(v * v + P * P + x * x);
        break;
      }
    }
    const M = d || 1;
    for (let l = 0; l < this.tiles.length; l++) {
      const y = this.tiles[l], f = y.getLatLon(this.radius);
      this.getBasicTerrainType ? this.getBasicTerrainType(f.lat, f.lon) : this.getTerrainInfo(f.lat, f.lon);
      const u = this.getTerrainInfo(f.lat, f.lon);
      let v = 0;
      u.type === "mountain" ? v = 0.08 : u.type === "arctic" && u.elevation > 150 ? v = 0.06 : u.type === "desert" ? v = 0.03 : u.type === "forest" ? v = 0.02 : u.type === "city" && (v = 0.12);
      const P = u.elevation / 255 * v * this.radius, x = y.centerPoint, S = Math.sqrt(x.x * x.x + x.y * x.y + x.z * x.z), z = x.x / S, T = x.y / S, F = x.z / S, I = new h.Vector3(z, T, F);
      r.copy(I).multiplyScalar(this.radius + P), b.setFromUnitVectors(m, I), g.position.copy(r), g.quaternion.copy(b);
      const D = M;
      g.scale.set(D, 1, D), g.updateMatrix(), a.setMatrixAt(l, g.matrix);
      const j = new h.Color(u.color);
      p ? a.setColorAt(l, j) : a.instanceColor.setXYZ(l, j.r, j.g, j.b), y.mesh = a;
    }
    a.instanceMatrix.needsUpdate = !0, p ? a.instanceColor && (a.instanceColor.needsUpdate = !0) : a.instanceColor.needsUpdate = !0, this.tileInstancedMesh = a, this.scene.add(a), console.log(`✅ InstancedMesh created with ${c} tiles.`);
  }
  async createPlanetMesh() {
    const t = new h.SphereGeometry(this.radius, 256, 256), e = new h.TextureLoader(), [n, i] = await Promise.all([
      e.loadAsync("map.png"),
      e.loadAsync("equirectangle_projection.png")
    ]);
    n.wrapS = h.RepeatWrapping, n.wrapT = h.RepeatWrapping, n.colorSpace = h.SRGBColorSpace, n.center.set(0.5, 0), i.wrapS = h.RepeatWrapping, i.wrapT = h.RepeatWrapping, i.colorSpace = h.LinearSRGBColorSpace, ((a) => {
      const p = a.image, m = document.createElement("canvas");
      m.width = p.width, m.height = p.height;
      const g = m.getContext("2d");
      g.drawImage(p, 0, 0);
      const b = g.getImageData(0, 0, m.width, m.height);
      for (let r = 0; r < b.data.length; r += 4)
        b.data[r] = 255 - b.data[r], b.data[r + 1] = 255 - b.data[r + 1], b.data[r + 2] = 255 - b.data[r + 2];
      g.putImageData(b, 0, 0), a.image = m, a.needsUpdate = !0;
    })(i);
    const s = new h.MeshStandardMaterial({
      map: n,
      displacementMap: i,
      displacementScale: this.radius * 0.05
    }), c = t.attributes.uv;
    for (let a = 0; a < c.count; a++)
      c.setX(a, (c.getX(a) + 0.49) % 1);
    c.needsUpdate = !0, this.planetMesh = new h.Mesh(t, s), this.planetMesh.renderOrder = 0, this.scene.add(this.planetMesh);
  }
  createAtmosphereMesh() {
    const e = new h.TextureLoader().load("clouds.png", () => {
      console.log("☁️ Cloud texture loaded successfully");
    }), n = new h.SphereGeometry(this.radius * 1.1, 64, 64), i = new h.MeshStandardMaterial({
      map: e,
      transparent: !0,
      opacity: 0.6,
      side: h.DoubleSide,
      depthWrite: !1
    });
    this.atmosphereMesh = new h.Mesh(n, i), this.atmosphereMesh.renderOrder = 999, this.scene.add(this.atmosphereMesh);
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
  animateAtmosphere(t) {
    this.atmosphereMesh;
  }
  setTileColor(t, e) {
    if (this.tileInstancedMesh) {
      const n = this.tileInstancedMesh, i = typeof n.setColorAt == "function", o = new h.Color(e);
      i ? n.setColorAt(t, o) : n.instanceColor ? (n.instanceColor.setXYZ(t, o.r, o.g, o.b), n.instanceColor.needsUpdate = !0) : n.material.color.setHex(e), n.instanceColor && n.instanceColor.needsUpdate && n.instanceColor.needsUpdate, n.instanceMatrix && n.instanceMatrix.needsUpdate && n.instanceMatrix.needsUpdate;
      return;
    }
    t >= 0 && t < this.tiles.length && this.tiles[t].mesh && this.tiles[t].mesh.material.color.setHex(e);
  }
  // Optional getter so external code can directly access the instanced mesh (if needed)
  getTileInstancedMesh() {
    return this.tileInstancedMesh;
  }
  // Clear existing tiles and regenerate
  regenerate(t, e, n) {
    this.tileInstancedMesh && (this.scene.remove(this.tileInstancedMesh), this.tileInstancedMesh.geometry.dispose(), this.tileInstancedMesh.material.dispose(), this.tileInstancedMesh = void 0), this.clearPathLines(), this.clearTileLabels(), this.planetMesh && (this.scene.remove(this.planetMesh), this.planetMesh.geometry.dispose(), this.planetMesh.material.dispose(), this.planetMesh = void 0), this.atmosphereMesh && (this.scene.remove(this.atmosphereMesh), this.atmosphereMesh.geometry.dispose(), this.atmosphereMesh.material.dispose(), this.atmosphereMesh = void 0), this.tiles = [], this.tileLookup = {}, w.idCounter = 0, this.radius = t, this.generateHexasphere(t, e, n, this.viewMode);
  }
}
export {
  k as HexaSphere
};
