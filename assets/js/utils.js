// assets/js/utils.js

// 1. ЛЕГКА НАТИВНА ОБГОРТКА INDEXEDDB (Ліміт > 500MB)
const StorageDB = {
    name: 'ProtocolOS_DB',
    store: 'store',
    dbPromise: null,

    init() {
        if (!this.dbPromise) {
            this.dbPromise = new Promise((resolve, reject) => {
                const req = indexedDB.open(this.name, 1);
                req.onupgradeneeded = (e) => e.target.result.createObjectStore(this.store);
                req.onsuccess = (e) => resolve(e.target.result);
                req.onerror = (e) => reject(e.target.error);
            });
        }
        return this.dbPromise;
    },

    async get(key) {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const req = db.transaction(this.store, 'readonly').objectStore(this.store).get(key);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    },

    async set(key, value) {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const req = db.transaction(this.store, 'readwrite').objectStore(this.store).put(value, key);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    }
};

const Utils = {
    // ЗАЛИШАЄМО ДЛЯ СУМІСНОСТІ СТАРИХ ЛЕГКИХ ДАНИХ
    loadSync(key, defaultData) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultData;
        } catch (e) { return defaultData; }
    },
    saveSync(key, data) {
        try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) { }
    },

    // НОВІ АСИНХРОННІ МЕТОДИ (IndexedDB) + МІГРАЦІЯ
    async load(key, defaultData) {
        try {
            let data = await StorageDB.get(key);
            
            // РОЗУМНА МІГРАЦІЯ: Якщо в IDB пусто, але є дані в localStorage
            if (!data) {
                const lsData = localStorage.getItem(key);
                if (lsData) {
                    data = JSON.parse(lsData);
                    await StorageDB.set(key, data); // Зберігаємо в нову базу
                    console.log(`Міграція "${key}" в IndexedDB успішна!`);
                }
            }
            return data ? data : defaultData;
        } catch (e) {
            console.warn(`Помилка завантаження (IDB) для ключа "${key}":`, e);
            return defaultData;
        }
    },

    async save(key, data) {
        try {
            await StorageDB.set(key, data);
        } catch (e) {
            console.error(`Помилка збереження (IDB) для ключа "${key}":`, e);
            if (window.Modal) window.Modal.alert("Помилка запису в базу даних. Очистіть кеш.", "КРИТИЧНА ПОМИЛКА", "red");
        }
    },

    id() { return Date.now(); },
    date(d = new Date()) { return d.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' }); }
};

// ГЛОБАЛЬНИЙ СЕРВІС ЖИТТЄВИХ ПОКАЗНИКІВ (Тепер працює асинхронно)
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

/* =========================================
   PROTOCOL OS - STATE MANAGER (INDEXED DB)
   ========================================= */

class StateManager {
    constructor(storageKey, defaultData, maxHistory = 10) {
        this.key = storageKey;
        this.defaultData = defaultData;
        this.maxHistory = maxHistory;
        this.history = []; // Історія змін живе в RAM для швидкого Undo
    }

    // ТЕПЕР ASYNC
    async init() {
        try {
            return await Utils.load(this.key, this.defaultData);
        } catch (e) {
            console.error("Помилка ініціалізації бази (IDB):", e);
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
            this.save(prevObj); // Запускаємо фонове збереження
            return prevObj;
        }
        return null;
    }

    // Fire-and-forget (Асинхронне збереження, яке не блокує інтерфейс під час вводу)
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
