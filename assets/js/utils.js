// assets/js/utils.js

const Utils = {
    load(key, defaultData) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultData;
        } catch (e) {
            console.error(`Error loading ${key}:`, e);
            return defaultData;
        }
    },
    save(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
            console.error(`Error saving ${key}:`, e);
        }
    },
    loadSync(key, def) { return this.load(key, def); },
    saveSync(key, data) { return this.save(key, data); },
    id() { return Date.now(); },
    date(d = new Date()) { return d.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' }); }
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
    }
};

class StateManager {
    constructor(storageKey, defaultData, maxHistory = 10) {
        this.key = storageKey;
        this.defaultData = defaultData;
        this.maxHistory = maxHistory;
        this.history = []; 
    }
    init() { return Utils.load(this.key, this.defaultData); }
    push(data) {
        this.history.push(JSON.stringify(data));
        if (this.history.length > this.maxHistory) this.history.shift();
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
    save(data) { Utils.save(this.key, data); }
    export(data, filename) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename; a.click();
        URL.revokeObjectURL(url);
    }
}
