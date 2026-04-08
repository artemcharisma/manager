// assets/js/utils.js

const StorageDB = {
    name: 'ProtocolOS_DB',
    store: 'store',
    dbPromise: null,

    init() {
        if (!this.dbPromise) {
            this.dbPromise = new Promise((resolve, reject) => {
                if (!window.indexedDB) return reject(new Error("No IDB"));
                
                let isResolved = false;
                const timeout = setTimeout(() => {
                    if (!isResolved) {
                        isResolved = true;
                        reject(new Error("IDB Timeout"));
                    }
                }, 1000); // 1 секунда і падаємо в localStorage

                try {
                    const req = indexedDB.open(this.name, 1);
                    
                    req.onupgradeneeded = (e) => {
                        const db = e.target.result;
                        if (!db.objectStoreNames.contains(this.store)) {
                            db.createObjectStore(this.store);
                        }
                    };
                    
                    req.onsuccess = (e) => {
                        if (isResolved) return;
                        isResolved = true;
                        clearTimeout(timeout);
                        resolve(e.target.result);
                    };
                    
                    req.onerror = (e) => {
                        if (isResolved) return;
                        isResolved = true;
                        clearTimeout(timeout);
                        reject(e.target.error);
                    };
                    
                    req.onblocked = () => {
                        if (isResolved) return;
                        isResolved = true;
                        clearTimeout(timeout);
                        reject(new Error("IDB Blocked"));
                    };
                } catch(e) {
                    if (!isResolved) {
                        isResolved = true;
                        clearTimeout(timeout);
                        reject(e);
                    }
                }
            });
        }
        return this.dbPromise;
    },

    async get(key) {
        try {
            const db = await this.init();
            return new Promise((resolve, reject) => {
                try {
                    const tx = db.transaction(this.store, 'readonly');
                    const req = tx.objectStore(this.store).get(key);
                    req.onsuccess = () => resolve(req.result);
                    req.onerror = () => reject(req.error);
                } catch(e) { reject(e); }
            });
        } catch (e) {
            return Promise.reject(e);
        }
    },

    async set(key, value) {
        try {
            const db = await this.init();
            return new Promise((resolve, reject) => {
                try {
                    const tx = db.transaction(this.store, 'readwrite');
                    const req = tx.objectStore(this.store).put(value, key);
                    req.onsuccess = () => resolve();
                    req.onerror = () => reject(req.error);
                } catch(e) { reject(e); }
            });
        } catch(e) {
            return Promise.reject(e);
        }
    }
};

const Utils = {
    loadSync(key, defaultData) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultData;
        } catch (e) { return defaultData; }
    },
    saveSync(key, data) {
        try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) { }
    },

    async load(key, defaultData) {
        let data = null;
        try {
            data = await StorageDB.get(key);
        } catch (e) {
            console.warn(`[Utils] IDB read error for ${key}`);
        }
        
        if (!data) {
            try {
                const lsData = localStorage.getItem(key);
                if (lsData) {
                    data = JSON.parse(lsData);
                    try { await StorageDB.set(key, data); } catch(e) {} 
                }
            } catch (e) {}
        }
        return data ? data : defaultData;
    },

    async save(key, data) {
        // 1. ЖОРСТКА ГАРАНТІЯ: Синхронно пишемо в localStorage ПЕРЕД усім іншим.
        // Навіть якщо юзер натисне F5 через мілісекунду, дані вже збережені.
        try { localStorage.setItem(key, JSON.stringify(data)); } catch(e){}
        
        // 2. Фонове збереження у важку базу
        try { await StorageDB.set(key, data); } catch (e) { console.warn('IDB save error', e); }
    },

    id() { return Date.now(); },
    date(d = new Date()) { return d.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' }); }
};

const GlobalVitals = {
    key: 'protocol_global_vitals',
    
    formatDate(dateObj) {
        const d = new Date(dateObj);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    },

    async getAll() {
        return await Utils.load(this.key, {});
    },

    async get(dateString) {
        const all = await this.getAll();
        return all[dateString] || { w: '', bp: '', hr: '', chest: '', waist: '', arm: '', leg: '', calf: '' };
    },

    async save(dateString, field, value) {
        const all = await this.getAll();
        if (!all[dateString]) {
            all[dateString] = { w: '', bp: '', hr: '', chest: '', waist: '', arm: '', leg: '', calf: '' };
        }
        all[dateString][field] = value;
        await Utils.save(this.key, all);
    },

    async getLatestWeight() {
        const all = await this.getAll();
        const dates = Object.keys(all).sort((a, b) => new Date(b) - new Date(a));
        for (let d of dates) {
            if (all[d].w) return parseFloat(all[d].w);
        }
        return null;
    }
};

class StateManager {
    constructor(storageKey, defaultData, maxHistory = 10) {
        this.key = storageKey;
        this.defaultData = defaultData;
        this.maxHistory = maxHistory;
        this.history = []; 
    }

    async init() {
        try {
            return await Utils.load(this.key, this.defaultData);
        } catch (e) {
            return JSON.parse(JSON.stringify(this.defaultData));
        }
    }

    push(data) {
        this.history.push(JSON.stringify(data));
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        }
    }

    undo(currentData) {
        if (this.history.length > 0) {
            const prev = this.history.pop();
            const prevObj = JSON.parse(prev);
            this.save(prevObj); 
            return prevObj;
        }
        return null;
    }

    save(data) {
        Utils.save(this.key, data);
    }

    export(data, filename) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }
}
