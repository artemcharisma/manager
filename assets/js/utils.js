// assets/js/utils.js

const Utils = {
    // Безпечне завантаження даних (повертає defaultData, якщо нічого немає або помилка)
    load(key, defaultData) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultData;
        } catch (e) {
            console.warn(`Помилка завантаження даних для ключа "${key}":`, e);
            return defaultData;
        }
    },

    // Збереження даних
    save(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
            console.error(`Помилка збереження даних для ключа "${key}":`, e);
            alert("Увага! Пам'ять переповнена, дані не збережено.");
        }
    },

    // Генерація унікального ID (для нових записів)
    id() {
        return Date.now();
    },

    // Форматування дати (український формат)
    date(d = new Date()) {
        return d.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' });
    }
};
