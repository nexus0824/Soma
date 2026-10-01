export default class EntityRegistry {
  constructor() {
    this.map = new Map();
    this.seq = 1;
  }

  register(obj) {
    const id = this.seq++;
    this.map.set(id, obj);
    return id;
  }

  unregister(obj) {
    if (obj.id !== undefined && obj.id !== null) this.map.delete(obj.id);
  }

  byId(id) {
    if (id === undefined || id === null) return null;
    const obj = this.map.get(id);
    return obj && obj.active ? obj : null;
  }

  clear() {
    this.map.clear();
  }

  get size() {
    return this.map.size;
  }
}
