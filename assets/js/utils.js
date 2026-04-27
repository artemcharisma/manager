// assets/js/utils.js

// НОВИЙ МОДУЛЬ: Асинхронна робота з IndexedDB для важких об'єктів
const CoreDB = {
    db: null,
    init() {
        return new Promise((resolve) => {
            if (!window.indexedDB) {
                console.warn("IndexedDB не підтримується. Fallback на LocalStorage.");
                resolve(false);
                return;
            }
            const req = indexedDB.open("ProtocolCoreDB", 1);
            
            req.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains("app_state")) {
                    db.createObjectStore("app_state");
                }
            };
            
            req.onsuccess = (e) => {
                this.db = e.target.result;
                resolve(true);
            };
            
            req.onerror = (e) => {
                console.error("IndexedDB init error:", e.target.error);
                resolve(false);
            };
        });
    },
    
    get(key) {
        return new Promise((resolve) => {
            if (!this.db) return resolve(null);
            const tx = this.db.transaction(["app_state"], "readonly");
            const store = tx.objectStore("app_state");
            const req = store.get(key);
            req.onsuccess = () => resolve(req.result !== undefined ? req.result : null);
            req.onerror = () => resolve(null);
        });
    },
    
    set(key, value) {
        return new Promise((resolve) => {
            if (!this.db) return resolve();
            const tx = this.db.transaction(["app_state"], "readwrite");
            const store = tx.objectStore("app_state");
            const req = store.put(value, key);
            req.onsuccess = () => resolve();
            req.onerror = () => resolve();
        });
    }
};

const Utils = {
    // Ініціалізація бази при старті
    // Ініціалізація бази при старті + ЕКСТРЕНЕ ВІДНОВЛЕННЯ
    async initDB() { 
        const ready = await CoreDB.init(); 
        if (ready && CoreDB.db) {
            try {
                // РЯТУЄМО ДАНІ: Витягуємо вітали з IndexedDB назад у LocalStorage
                const lostVitals = await CoreDB.get('protocol_global_vitals');
                if (lostVitals && Object.keys(lostVitals).length > 0) {
                    const currentStr = localStorage.getItem('protocol_global_vitals');
                    let currentCount = 0;
                    if (currentStr) {
                        try { currentCount = Object.keys(JSON.parse(currentStr)).length; } catch(e){}
                    }
                    // Якщо кеш пустий або там менше днів, ніж у збереженій базі
                    if (!currentStr || currentCount < Object.keys(lostVitals).length) {
                        localStorage.setItem('protocol_global_vitals', JSON.stringify(lostVitals));
                        console.log("🔥 ВІТАЛИ УСПІШНО ВІДНОВЛЕНО З БАЗИ!");
                    }
                }
            } catch(e) { console.error("Recovery err:", e); }
        }
        return ready; 
    },

    // Асинхронне читання з міграцією
    async loadAsync(key, defaultData) {
        // ЖОРСТКЕ ПРАВИЛО: Вітали живуть ТІЛЬКИ в LocalStorage
        if (key === 'protocol_global_vitals') {
            return this.load(key, defaultData);
        }
        
        if (CoreDB.db) {
            let data = await CoreDB.get(key);
            if (!data) {
                const localData = this.load(key, null);
                if (localData) {
                    console.log(`[CoreDB] Migrating ${key}...`);
                    await CoreDB.set(key, localData);
                    localStorage.removeItem(key); 
                    return localData;
                }
                return defaultData;
            }
            return data;
        }
        return this.load(key, defaultData);
    },

    // Асинхронний запис
    async saveAsync(key, data) {
        // ЖОРСТКЕ ПРАВИЛО: Вітали пишемо ТІЛЬКИ в LocalStorage
        if (key === 'protocol_global_vitals') {
            this.save(key, data);
            return;
        }
        
        if (CoreDB.db) {
            await CoreDB.set(key, data);
        } else {
            this.save(key, data);
        }
    },

    loadSync(key, def) { return this.load(key, def); },
    saveSync(key, data) { return this.save(key, data); },
    id() { return Date.now(); },
    date(d = new Date()) { return d.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' }); },
    
    deepClone(obj) {
        if (typeof structuredClone === 'function') {
            try { return structuredClone(obj); } catch(e) { /* fallback */ }
        }
        return JSON.parse(JSON.stringify(obj));
    }
};

const GlobalVitals = {
    key: 'protocol_global_vitals',
    formatDate(dateObj) {
        const d = new Date(dateObj);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    },
    getAll() { return Utils.load(this.key, {}); },
    get(dateString) {
        const all = this.getAll();
        return all[dateString] || { w: '', bp: '', hr: '', chest: '', waist: '', arm: '', leg: '', calf: '' };
    },
    save(dateString, field, value) {
        const all = this.getAll();
        if (!all[dateString]) all[dateString] = { w: '', bp: '', hr: '', chest: '', waist: '', arm: '', leg: '', calf: '' };
        all[dateString][field] = value;
        Utils.save(this.key, all);
    },
    getLatestWeight() {
        const all = this.getAll();
        const dates = Object.keys(all).sort((a, b) => new Date(b) - new Date(a));
        for (let d of dates) { if (all[d].w) return parseFloat(all[d].w); }
        return null;
    },
    exportAll() {
        try {
            return JSON.parse(localStorage.getItem('protocol_global_vitals') || '{}');
        } catch(e) { return {}; }
    },
    importAll(dataObj) {
        if (!dataObj || typeof dataObj !== 'object') return;
        localStorage.setItem('protocol_global_vitals', JSON.stringify(dataObj));
    },
    getWeightTrend() {
        const all = this.getAll();
        const today = new Date();
        today.setHours(0,0,0,0);

        let currentSum = 0, currentCount = 0;
        let prevSum = 0, prevCount = 0;

        for(let i=0; i<7; i++) {
            let d1 = new Date(today); d1.setDate(d1.getDate() - i);
            let v1 = all[this.formatDate(d1)];
            if (v1 && v1.w) { currentSum += parseFloat(v1.w); currentCount++; }

            let d2 = new Date(today); d2.setDate(d2.getDate() - (i + 7));
            let v2 = all[this.formatDate(d2)];
            if (v2 && v2.w) { prevSum += parseFloat(v2.w); prevCount++; }
        }

        const currentAvg = currentCount > 0 ? (currentSum / currentCount) : null;
        const prevAvg = prevCount > 0 ? (prevSum / prevCount) : null;
        const delta = (currentAvg !== null && prevAvg !== null) ? (currentAvg - prevAvg) : null;

        return { currentAvg, prevAvg, delta };
    }
};

class StateManager {
    constructor(storageKey, defaultData, maxHistory = 3) {
        this.key = storageKey;
        this.defaultData = defaultData;
        this.maxHistory = maxHistory;
        this.history = []; 
    }
    
    // Тепер ініціалізація чекає підняття IndexedDB і завантажує дані з неї
    async init() { 
        await Utils.initDB();
        return await Utils.loadAsync(this.key, this.defaultData); 
    }
    
    push(data) {
        this.history.push(Utils.deepClone(data));
        if (this.history.length > this.maxHistory) this.history.shift();
    }
    
    undo(currentData) {
        if (this.history.length > 0) {
            const prevObj = this.history.pop();
            this.save(prevObj); 
            return Utils.deepClone(prevObj);
        }
        return null;
    }
    
    // Асинхронне збереження (не блокує UI)
    save(data) { 
        Utils.saveAsync(this.key, data); 
    }
    
    export(data, filename) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename; a.click();
        URL.revokeObjectURL(url);
    }
}
