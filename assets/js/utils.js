pushHistory() {
        if(this.history.length > 3) this.history.shift();
        // Використовуємо новий швидкий метод з utils.js
        this.history.push(Utils.deepClone(this.data));
        const undoFloat = document.getElementById('undoFloat');
        if(undoFloat) undoFloat.classList.add('visible');
    },
    
    undo() {
        if(!this.history.length) return;
        // Відновлюємо безпечно клонований стейт
        this.data = Utils.deepClone(this.history.pop());
        
        if(!this.history.length) {
            const undoFloat = document.getElementById('undoFloat');
            if(undoFloat) undoFloat.classList.remove('visible');
        }
        
        if(!this.data.days.find(d => d.id === this.state.currentDayId)) {
            this.state.currentDayId = this.data.days.length > 0 ? this.data.days[0].id : null;
        }
        
        this.save(); 
        this.renderDaysBar(); 
        this.render(false);   
        
        if(window.Haptics) window.Haptics.light();
    },
