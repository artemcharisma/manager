const Groups = ["Груди", "Спина", "Ноги", "Плечі", "Руки", "Прес", "Кардіо", "Інше"];
const ResolveGroup = (n) => {
    if(!n) return "Інше";
    n = n.toLowerCase();
    if(n.includes("жим")||n.includes("розводка")||n.includes("пек-дек")) return "Груди";
    if(n.includes("підтягування")||n.includes("тяга")||n.includes("блок")||n.includes("пуловер")) return "Спина";
    if(n.includes("присідання")||n.includes("ніг")||n.includes("ікри")||n.includes("румунська")) return "Ноги";
    if(n.includes("мах")||n.includes("дельта")) return "Плечі";
    if(n.includes("біцепс")||n.includes("трицепс")||n.includes("французький")||n.includes("молотки")||n.includes("згинання")||n.includes("розгинання")) return "Руки";
    if(n.includes("прес")||n.includes("планка")) return "Прес";
    if(n.includes("кардіо")||n.includes("біг")||n.includes("ходьба")) return "Кардіо";
    return "Інше";
};

const Templates = {
    balanced: {
        mass: [
            { day: "Понеділок", group: "Upper", exercises: [{n:"Жим штанги лежачи", g:"Груди", m:"wr", sets:[{},{},{}]}, {n:"Підтягування", g:"Спина", m:"wr", sets:[{},{},{}]}, {n:"Жим гантелей під кутом", g:"Груди", m:"wr", sets:[{},{}]}, {n:"Тяга штанги в нахилі", g:"Спина", m:"wr", sets:[{},{}]}, {n:"Махи на середню дельту", g:"Плечі", m:"wr", sets:[{},{},{}]}, {n:"Розводка гантелями/пек-дек", g:"Груди", m:"wr", sets:[{},{}]}, {n:"Згинання штанги стоячи", g:"Руки", m:"wr", sets:[{},{}]}, {n:"Розгинання трицепса в кросі", g:"Руки", m:"wr", sets:[{},{}]}] },
            { day: "Вівторок", group: "Lower", exercises: [{n:"Присідання", g:"Ноги", m:"wr", sets:[{},{},{},{}]}, {n:"Жим ногами", g:"Ноги", m:"wr", sets:[{},{},{}]}, {n:"Румунська тяга", g:"Ноги", m:"wr", sets:[{},{},{}]}, {n:"Згинання ніг", g:"Ноги", m:"wr", sets:[{},{},{}]}, {n:"Ікри", g:"Ноги", m:"wr", sets:[{},{},{},{}]}, {n:"Прес", g:"Прес", m:"wr", sets:[{},{},{}]}] },
            { day: "Середа", group: "Відновлення", exercises: [{n:"Легке кардіо (ходьба/вело)", g:"Кардіо", m:"cardio", sets:[{}]}, {n:"Мобільність/розтяжка", g:"Інше", m:"t", sets:[{r:"15 хв"}]}] },
            { day: "Четвер", group: "Push", exercises: [{n:"Жим гантелей під кутом", g:"Груди", m:"wr", sets:[{},{},{}]}, {n:"Жим у тренажері", g:"Груди", m:"wr", sets:[{},{}]}, {n:"Розводка в кросі/пек-дек", g:"Груди", m:"wr", sets:[{},{}]}, {n:"Жим гантелей сидячи", g:"Плечі", m:"wr", sets:[{},{}]}, {n:"Махи на середню дельту", g:"Плечі", m:"wr", sets:[{},{}]}, {n:"Задня дельта", g:"Плечі", m:"wr", sets:[{},{}]}, {n:"Французький жим", g:"Руки", m:"wr", sets:[{},{}]}, {n:"Розгинання трицепса в кросі", g:"Руки", m:"wr", sets:[{},{}]}] },
            { day: "П'ятниця", group: "Pull", exercises: [{n:"Підтягування", g:"Спина", m:"wr", sets:[{},{},{}]}, {n:"Тяга T-bar", g:"Спина", m:"wr", sets:[{},{},{}]}, {n:"Горизонтальна тяга", g:"Спина", m:"wr", sets:[{},{}]}, {n:"Пуловер/верхній блок", g:"Спина", m:"wr", sets:[{},{}]}, {n:"Задня дельта", g:"Плечі", m:"wr", sets:[{},{}]}, {n:"Згинання штанги з EZ-грифом", g:"Руки", m:"wr", sets:[{},{},{}]}, {n:"Молотки", g:"Руки", m:"wr", sets:[{},{}]}, {n:"Згинання зап'ястка", g:"Руки", m:"wr", sets:[{},{},{}]}, {n:"Розгинання зап'ястка", g:"Руки", m:"wr", sets:[{},{},{}]}] },
            { day: "Субота", group: "Legs + Core", exercises: [{n:"Фронтальні присіди/хакк", g:"Ноги", m:"wr", sets:[{},{},{}]}, {n:"Жим ногами", g:"Ноги", m:"wr", sets:[{},{},{}]}, {n:"Згинання ніг", g:"Ноги", m:"wr", sets:[{},{},{}]}, {n:"Ікри", g:"Ноги", m:"wr", sets:[{},{},{}]}, {n:"Прес/планка", g:"Прес", m:"t", sets:[{},{},{}]}] },
            { day: "Неділя", group: "Відпочинок", exercises: [] }
        ],
        cut: [
            { day: "Понеділок", group: "Upper", exercises: [{n:"Жим штанги лежачи", g:"Груди", m:"wr", sets:[{},{},{}]}, {n:"Підтягування", g:"Спина", m:"wr", sets:[{},{},{}]}, {n:"Жим гантелей під кутом", g:"Груди", m:"wr", sets:[{},{}]}, {n:"Тяга штанги в нахилі", g:"Спина", m:"wr", sets:[{},{}]}, {n:"Махи на середню дельту", g:"Плечі", m:"wr", sets:[{},{}]}, {n:"Розводка гантелями/пек-дек", g:"Груди", m:"wr", sets:[{},{}]}, {n:"Згинання штанги стоячи", g:"Руки", m:"wr", sets:[{},{}]}, {n:"Розгинання трицепса в кросі", g:"Руки", m:"wr", sets:[{},{}]}] },
            { day: "Вівторок", group: "Lower", exercises: [{n:"Присідання", g:"Ноги", m:"wr", sets:[{},{},{}]}, {n:"Жим ногами", g:"Ноги", m:"wr", sets:[{},{},{}]}, {n:"Румунська тяга", g:"Ноги", m:"wr", sets:[{},{},{}]}, {n:"Згинання ніг", g:"Ноги", m:"wr", sets:[{},{}]}, {n:"Ікри", g:"Ноги", m:"wr", sets:[{},{},{}]}, {n:"Прес", g:"Прес", m:"wr", sets:[{},{}]}] },
            { day: "Середа", group: "LISS", exercises: [{n:"Кардіо LISS", g:"Кардіо", m:"cardio", sets:[{}]}, {n:"Мобільність", g:"Інше", m:"t", sets:[{r:"15 хв"}]}] },
            { day: "Четвер", group: "Push", exercises: [{n:"Жим гантелей під кутом", g:"Груди", m:"wr", sets:[{},{},{}]}, {n:"Жим у тренажері", g:"Груди", m:"wr", sets:[{},{}]}, {n:"Розводка в кросі/пек-дек", g:"Груди", m:"wr", sets:[{},{}]}, {n:"Жим гантелей сидячи", g:"Плечі", m:"wr", sets:[{},{}]}, {n:"Махи на середню дельту", g:"Плечі", m:"wr", sets:[{},{}]}, {n:"Задня дельта", g:"Плечі", m:"wr", sets:[{},{}]}, {n:"Французький жим", g:"Руки", m:"wr", sets:[{},{}]}, {n:"Розгинання трицепса в кросі", g:"Руки", m:"wr", sets:[{},{}]}] },
            { day: "П'ятниця", group: "Pull", exercises: [{n:"Підтягування", g:"Спина", m:"wr", sets:[{},{},{}]}, {n:"Тяга T-bar", g:"Спина", m:"wr", sets:[{},{},{}]}, {n:"Горизонтальна тяга", g:"Спина", m:"wr", sets:[{},{}]}, {n:"Задня дельта", g:"Плечі", m:"wr", sets:[{},{}]}, {n:"Згинання штанги з EZ-грифом", g:"Руки", m:"wr", sets:[{},{}]}, {n:"Молотки", g:"Руки", m:"wr", sets:[{},{}]}, {n:"Згинання зап'ястка", g:"Руки", m:"wr", sets:[{},{}]}, {n:"Розгинання зап'ястка", g:"Руки", m:"wr", sets:[{},{}]}] },
            { day: "Субота", group: "Legs + Core", exercises: [{n:"Фронтальні присіди/хакк", g:"Ноги", m:"wr", sets:[{},{},{}]}, {n:"Жим ногами", g:"Ноги", m:"wr", sets:[{},{}]}, {n:"Згинання ніг", g:"Ноги", m:"wr", sets:[{},{}]}, {n:"Ікри", g:"Ноги", m:"wr", sets:[{},{},{}]}, {n:"Прес/планка", g:"Прес", m:"t", sets:[{},{}]}] },
            { day: "Неділя", group: "Відпочинок", exercises: [] }
        ]
    },
    arms: {
        mass: [
            { day: "Понеділок", group: "Upper + Arms", exercises: [{n:"Жим штанги лежачи", g:"Груди", m:"wr", sets:[{},{},{}]}, {n:"Підтягування", g:"Спина", m:"wr", sets:[{},{},{}]}, {n:"Жим гантелей під кутом", g:"Груди", m:"wr", sets:[{},{}]}, {n:"Тяга штанги в нахилі", g:"Спина", m:"wr", sets:[{},{}]}, {n:"Махи на середню дельту", g:"Плечі", m:"wr", sets:[{},{},{}]}, {n:"Згинання штанги стоячи", g:"Руки", m:"wr", sets:[{},{},{}]}, {n:"Згинання гантелей сидячи (інклайн)", g:"Руки", m:"wr", sets:[{},{},{}]}, {n:"Французький жим лежачи", g:"Руки", m:"wr", sets:[{},{},{}]}, {n:"Розгинання з-за голови", g:"Руки", m:"wr", sets:[{},{},{}]}] },
            { day: "Вівторок", group: "Lower", exercises: [{n:"Присідання", g:"Ноги", m:"wr", sets:[{},{},{},{}]}, {n:"Жим ногами", g:"Ноги", m:"wr", sets:[{},{},{}]}, {n:"Румунська тяга", g:"Ноги", m:"wr", sets:[{},{},{}]}, {n:"Згинання ніг", g:"Ноги", m:"wr", sets:[{},{},{}]}, {n:"Ікри", g:"Ноги", m:"wr", sets:[{},{},{},{}]}, {n:"Прес", g:"Прес", m:"wr", sets:[{},{},{}]}] },
            { day: "Середа", group: "Відновлення", exercises: [{n:"Кардіо", g:"Кардіо", m:"cardio", sets:[{}]}, {n:"Мобільність", g:"Інше", m:"t", sets:[{r:"15 хв"}]}] },
            { day: "Четвер", group: "Push + Triceps", exercises: [{n:"Жим гантелей під кутом", g:"Груди", m:"wr", sets:[{},{},{}]}, {n:"Жим у тренажері", g:"Груди", m:"wr", sets:[{},{}]}, {n:"Розводка в кросі", g:"Груди", m:"wr", sets:[{},{}]}, {n:"Жим гантелей сидячи", g:"Плечі", m:"wr", sets:[{},{}]}, {n:"Махи на середню дельту", g:"Плечі", m:"wr", sets:[{},{}]}, {n:"Задня дельта", g:"Плечі", m:"wr", sets:[{},{}]}, {n:"Французький жим сидячи", g:"Руки", m:"wr", sets:[{},{},{}]}, {n:"Розгинання трицепса (канат)", g:"Руки", m:"wr", sets:[{},{},{}]}] },
            { day: "П'ятниця", group: "Pull + Biceps", exercises: [{n:"Підтягування", g:"Спина", m:"wr", sets:[{},{},{}]}, {n:"Тяга T-bar", g:"Спина", m:"wr", sets:[{},{},{}]}, {n:"Горизонтальна тяга", g:"Спина", m:"wr", sets:[{},{}]}, {n:"Пуловер", g:"Спина", m:"wr", sets:[{},{}]}, {n:"Задня дельта", g:"Плечі", m:"wr", sets:[{},{}]}, {n:"Згинання штанги з EZ-грифом", g:"Руки", m:"wr", sets:[{},{},{}]}, {n:"Молотки", g:"Руки", m:"wr", sets:[{},{},{}]}, {n:"Згинання зап'ястка", g:"Руки", m:"wr", sets:[{},{},{}]}, {n:"Розгинання зап'ястка", g:"Руки", m:"wr", sets:[{},{},{}]}] },
            { day: "Субота", group: "Legs + Core", exercises: [{n:"Фронтальні присіди", g:"Ноги", m:"wr", sets:[{},{},{}]}, {n:"Жим ногами", g:"Ноги", m:"wr", sets:[{},{},{}]}, {n:"Згинання ніг", g:"Ноги", m:"wr", sets:[{},{},{}]}, {n:"Ікри", g:"Ноги", m:"wr", sets:[{},{},{}]}, {n:"Прес/планка", g:"Прес", m:"t", sets:[{},{},{}]}] },
            { day: "Неділя", group: "Відпочинок", exercises: [] }
        ],
        cut: [
            { day: "Понеділок", group: "Upper + Arms", exercises: [{n:"Жим штанги лежачи", g:"Груди", m:"wr", sets:[{},{},{}]}, {n:"Підтягування", g:"Спина", m:"wr", sets:[{},{},{}]}, {n:"Жим гантелей під кутом", g:"Груди", m:"wr", sets:[{},{}]}, {n:"Тяга штанги в нахилі", g:"Спина", m:"wr", sets:[{},{}]}, {n:"Махи", g:"Плечі", m:"wr", sets:[{},{}]}, {n:"Згинання штанги", g:"Руки", m:"wr", sets:[{},{}]}, {n:"Згинання гантелей (інклайн)", g:"Руки", m:"wr", sets:[{},{}]}, {n:"Французький жим лежачи", g:"Руки", m:"wr", sets:[{},{}]}, {n:"Розгинання з-за голови", g:"Руки", m:"wr", sets:[{},{}]}] },
            { day: "Вівторок", group: "Lower", exercises: [{n:"Присідання", g:"Ноги", m:"wr", sets:[{},{},{}]}, {n:"Жим ногами", g:"Ноги", m:"wr", sets:[{},{},{}]}, {n:"Румунська тяга", g:"Ноги", m:"wr", sets:[{},{},{}]}, {n:"Згинання ніг", g:"Ноги", m:"wr", sets:[{},{}]}, {n:"Ікри", g:"Ноги", m:"wr", sets:[{},{},{}]}, {n:"Прес", g:"Прес", m:"wr", sets:[{},{}]}] },
            { day: "Середа", group: "LISS", exercises: [{n:"Кардіо LISS", g:"Кардіо", m:"cardio", sets:[{}]}, {n:"Мобільність", g:"Інше", m:"t", sets:[{r:"15 хв"}]}] },
            { day: "Четвер", group: "Push + Triceps", exercises: [{n:"Жим гантелей під кутом", g:"Груди", m:"wr", sets:[{},{},{}]}, {n:"Жим у тренажері", g:"Груди", m:"wr", sets:[{},{}]}, {n:"Розводка в кросі", g:"Груди", m:"wr", sets:[{},{}]}, {n:"Жим гантелей сидячи", g:"Плечі", m:"wr", sets:[{},{}]}, {n:"Махи", g:"Плечі", m:"wr", sets:[{},{}]}, {n:"Задня дельта", g:"Плечі", m:"wr", sets:[{},{}]}, {n:"Французький жим сидячи", g:"Руки", m:"wr", sets:[{},{}]}, {n:"Розгинання трицепса", g:"Руки", m:"wr", sets:[{},{}]}] },
            { day: "П'ятниця", group: "Pull + Biceps", exercises: [{n:"Підтягування", g:"Спина", m:"wr", sets:[{},{},{}]}, {n:"Тяга T-bar", g:"Спина", m:"wr", sets:[{},{},{}]}, {n:"Горизонтальна тяга", g:"Спина", m:"wr", sets:[{},{}]}, {n:"Задня дельта", g:"Плечі", m:"wr", sets:[{},{}]}, {n:"Згинання EZ", g:"Руки", m:"wr", sets:[{},{}]}, {n:"Молотки", g:"Руки", m:"wr", sets:[{},{}]}, {n:"Згинання зап'ястка", g:"Руки", m:"wr", sets:[{},{}]}, {n:"Розгинання зап'ястка", g:"Руки", m:"wr", sets:[{},{}]}] },
            { day: "Субота", group: "Legs", exercises: [{n:"Фронтальні присіди", g:"Ноги", m:"wr", sets:[{},{},{}]}, {n:"Жим ногами", g:"Ноги", m:"wr", sets:[{},{}]}, {n:"Згинання ніг", g:"Ноги", m:"wr", sets:[{},{}]}, {n:"Ікри", g:"Ноги", m:"wr", sets:[{},{},{}]}, {n:"Прес/планка", g:"Прес", m:"t", sets:[{},{}]}] },
            { day: "Неділя", group: "Відпочинок", exercises: [] }
        ]
    }
};

const InitialData = {
    weeks: [],
    guideMode: 'mass',
    currentProgram: 'balanced', 
    exBank: [],
    targets: { "Груди": 12, "Спина": 14, "Ноги": 16, "Плечі": 10, "Руки": 10, "Прес": 6, "Кардіо": 3 },
    guidelines: {
        mass: [
            {n:"Жим штанги лежачи", p:"70-80%", s:"3x6-8", w:"порожній гриф 1×10-15, 40% ×8, 60% ×5, 75% ×3", i:"тримати вагу, 1-2 повт в запасі"},
            {n:"Підтягування (з/без ваги)", p:"RIR 1-2", s:"3x6-10", w:"1-2 легкі сети вага тіла", i:"якщо з вагою: розминка без диска"},
            {n:"Жим гантелей під кутом", p:"70-75%", s:"2x8-10", w:"легка вага 1×10, 50% ×8", i:"зупинитись 1-2 повт до відказу"},
            {n:"Тяга штанги в нахилі", p:"70-80%", s:"2x8-10", w:"40% ×8, 60% ×5, 75% ×3", i:"контроль корпусу, спина рівна"},
            {n:"Махи на середню дельту", p:"60-70%", s:"3x12-15", w:"легка вага 1×15", i:"контроль, без ривків"},
            {n:"Розводка гантелями/пек-дек", p:"60-70%", s:"2x12-15", w:"легка вага 1×15", i:"макс. розтяг"},
            {n:"Згинання штанги стоячи", p:"65-75%", s:"2x8-12", w:"легка штанга 1×10", i:"без розкачки корпусом"},
            {n:"Розгинання трицепса в кросі", p:"65-75%", s:"2x10-15", w:"легка вага 1×15", i:"контрольний темп"},
            {n:"Присідання (штанга)", p:"70-80%", s:"3-4x6-8", w:"порожній гриф 1×10, 40% ×8, 60% ×5, 75% ×3", i:"глибина контрольована"},
            {n:"Жим ногами", p:"70-80%", s:"3x8-10", w:"легка вага 1×10, 50% ×8, 70% ×5", i:"не відривати таз"},
            {n:"Румунська/мертва тяга", p:"70-80%", s:"3x6-10", w:"40% ×8, 60% ×5, 75% ×3", i:"тримати спину"},
            {n:"Згинання ніг", p:"65-75%", s:"3x10-15", w:"легка вага 1×15", i:"затримка в піку"},
            {n:"Ікри стоячи/сидячи", p:"65-75%", s:"3-4x10-15", w:"легка вага 1×15", i:"повний ROM, пауза вгорі"},
            {n:"Прес", p:"-", s:"3x15-20", w:"легкий сет 1×15", i:"контроль без ривків"},
            {n:"Жим штанги/гантелей під кутом", p:"70-80%", s:"3x8-10", w:"порожній гриф, 40% ×8, 60% ×5, 75% ×3", i:"1-2 повт в запасі"},
            {n:"Жим у тренажері", p:"70-80%", s:"2x10-12", w:"легка вага 1×10, 50% ×8", i:"повний контроль"},
            {n:"Розводка в кросі", p:"60-70%", s:"2x12-15", w:"легка вага 1×15", i:"відчути розтяг"},
            {n:"Жим гантелей сидячи", p:"70-75%", s:"2x8-10", w:"легкі гантелі 1×10, 50% ×8", i:"не кидати лікті"},
            {n:"Задня дельта", p:"60-70%", s:"2x12-15", w:"легка вага 1×15", i:"не читінгувати"},
            {n:"Французький жим", p:"65-75%", s:"2x8-12", w:"легка штанга 1×10", i:"лікоть фіксований"},
            {n:"Тяга T-bar/штанги", p:"70-80%", s:"3x8-10", w:"40% ×8, 60% ×5, 75% ×3", i:"контроль корпусу"},
            {n:"Горизонтальна тяга", p:"70-75%", s:"2x10-12", w:"легка вага 1×10, 50% ×8", i:"повний ROM"},
            {n:"Пуловер/верхній блок", p:"60-70%", s:"2x10-12", w:"легка вага 1×12", i:"фокус на латах"},
            {n:"Згинання з EZ-грифом", p:"65-75%", s:"2-3x8-12", w:"легка штанга 1×10", i:"повний контроль"},
            {n:"Молотки", p:"65-75%", s:"2x10-15", w:"легкі гантелі 1×12", i:"не гойдати корпус"},
            {n:"Згинання/Розгинання зап'ястка", p:"60-70%", s:"2-3x12-20", w:"легка вага 1×15", i:"повний ROM"},
            {n:"Фронтальні присіди", p:"70-80%", s:"3x8-10", w:"гриф, 40%, 60%, 75%", i:"глибина без втрати техніки"},
            {n:"Згинання гантелей сидячи (інклайн)", p:"65-75%", s:"3x10-15", w:"легка вага 1×12", i:"розтяг біцепса"},
            {n:"Французький жим лежачи", p:"70-75%", s:"3x8-12", w:"гриф 1x15, 50% 1x10", i:"лікті до стелі"},
            {n:"Розгинання з-за голови", p:"65-70%", s:"3x10-15", w:"легка вага 1x15", i:"акцент на довгу голівку"}
        ],
        cut: [
            {n:"Жим штанги лежачи", p:"70-80%", s:"3x6-8", w:"гриф 1×15, 40%, 60%, 75%", i:"тримати вагу, 1-2 RIR"},
            {n:"Підтягування", p:"RIR 1-2", s:"3x6-10", w:"1-2 легкі сети", i:"розминка без диска"},
            {n:"Жим гантелей під кутом", p:"70-75%", s:"2x8-10", w:"легка вага 1×10, 50% ×8", i:"не гнатися за рекордом"},
            {n:"Тяга штанги в нахилі", p:"70-80%", s:"2x8-10", w:"40%, 60%, 75%", i:"контроль корпусу"},
            {n:"Махи на середню дельту", p:"60-70%", s:"2x12-15", w:"легка вага 1×15", i:"без ривків"},
            {n:"Розводка гантелями/пек-дек", p:"60-70%", s:"2x12-15", w:"легка вага 1×15", i:"контроль, розтяг"},
            {n:"Згинання штанги стоячи", p:"65-75%", s:"2x8-12", w:"легка штанга 1×10", i:"RIR 1-2"},
            {n:"Розгинання трицепса", p:"65-75%", s:"2x10-15", w:"легка вага 1×15", i:"без різких рухів"},
            {n:"Присідання", p:"70-80%", s:"3x6-8", w:"гриф, 40%, 60%, 75%", i:"фокус на техніці"},
            {n:"Жим ногами", p:"70-80%", s:"2-3x8-10", w:"легка, 50%, 70%", i:"не відривати таз"},
            {n:"Румунська тяга", p:"70-80%", s:"2-3x6-10", w:"40%, 60%, 75%", i:"не округляти спину"},
            {n:"Згинання ніг", p:"65-75%", s:"2x10-15", w:"легка вага 1×15", i:"з паузою"},
            {n:"Ікри", p:"65-75%", s:"3x10-15", w:"легка вага 1×15", i:"повний ROM"},
            {n:"Прес", p:"-", s:"2x15-20", w:"легкий сет", i:"контроль"},
            {n:"Жим під кутом", p:"70-80%", s:"3x8-10", w:"гриф, 40%, 60%, 75%", i:"зберегти вагу"},
            {n:"Жим у тренажері", p:"70-80%", s:"2x10-12", w:"легка, 50%", i:"контроль, без відказу"},
            {n:"Розводка в кросі", p:"60-70%", s:"2x12-15", w:"легка вага", i:"акцент на відчутті"},
            {n:"Жим гантелей сидячи", p:"70-75%", s:"2x8-10", w:"легкі гантелі, 50%", i:"не кидати лікті"},
            {n:"Задня дельта", p:"60-70%", s:"2x12-15", w:"легка вага", i:"без читінгу"},
            {n:"Французький жим", p:"65-75%", s:"2x8-12", w:"легка штанга", i:"RIR 1-2"},
            {n:"Тяга T-bar/штанги", p:"70-80%", s:"3x8-10", w:"40%, 60%, 75%", i:"стабільний корпус"},
            {n:"Горизонтальна тяга", p:"70-75%", s:"2x10-12", w:"легка, 50%", i:"контроль лопаток"},
            {n:"Згинання з EZ", p:"65-75%", s:"2x8-12", w:"легка штанга", i:"без розкачки"},
            {n:"Молотки", p:"65-75%", s:"2x10-15", w:"легкі гантелі", i:"RIR 1-2"},
            {n:"Згинання зап'ястка", p:"60-70%", s:"2x12-20", w:"легка вага", i:"повний ROM"},
            {n:"Фронтальні присіди", p:"70-80%", s:"3x8-10", w:"гриф, 40%, 60%, 75%", i:"контроль глибини"}
        ]
    }
};

const App = {
    data: null, 
    state: new StateManager('training_protocol', InitialData), 
    timerState: { interval: null, left: 0, default: 90, el: null, endTime: null },
    historyIndex: {}, // ДОДАНО: Кеш для швидкого пошуку 1RM та Ghost Data

    // ДОДАНО: Метод, який один раз будує індекс усієї історії для миттєвого доступу
    buildIndex() {
        this.historyIndex = {};
        if (!this.data || !this.data.weeks) return;
        
        const sortedWeeks = [...this.data.weeks].sort((a, b) => a.num - b.num);

        sortedWeeks.forEach(week => {
            week.days.forEach((day, dIdx) => {
                day.exercises.forEach(ex => {
                    if (!ex.n) return;
                    const name = ex.n.trim().toLowerCase();
                    if (!this.historyIndex[name]) this.historyIndex[name] = [];

                    let sessionMax1RM = 0;
                    let hasValidSets = false;

                    if (ex.sets) {
                        ex.sets.forEach(s => {
                            if (s.w || s.r) hasValidSets = true;
                            
                            // ІГНОРУЄМО РОЗМИНКУ для Ghost Data та 1RM
                            if (s.t === 'WU') return;
                            const w = parseFloat(s.w) || 0;
                            const r = parseFloat(s.r) || 0;
                            if (w > 0 && r > 0) {
                                const rm = w * (1 + r / 30);
                                if (rm > sessionMax1RM) sessionMax1RM = rm;
                            }
                        });
                    }
                    this.historyIndex[name].push({
                        wNum: week.num,
                        prog: week.prog,
                        dIdx: dIdx,
                        sets: ex.sets,
                        maxRM: sessionMax1RM,
                        hasData: hasValidSets
                    });
                });
            });
        });
    },

    async init() {
        this.data = await this.state.init();

        if(!this.data.targets) this.data.targets = JSON.parse(JSON.stringify(InitialData.targets));
        if(!this.data.guidelines) this.data.guidelines = JSON.parse(JSON.stringify(InitialData.guidelines));
        if(!this.data.exBank) this.data.exBank = [];
        if(!this.data.opened) this.data.opened = {}; 
        
        // --- ДОДАНО --- Ініціалізація назв вкладок (якщо їх ще немає)
        if(!this.data.customNames) this.data.customNames = { balanced: "ЗБАЛАНСОВАНА", arms: "РУКИ" };
        if(!this.data.globalRules) this.data.globalRules = { mass: "", cut: "" };
        
        // CSS для анімації та підсвічування ghost data
        const extraStyles = document.createElement('style');
        extraStyles.innerHTML = `
            @keyframes fadeInDown {
                from { opacity: 0; transform: translateY(-5px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .ghost-active::placeholder { 
                color: rgba(212, 175, 55, 0.6) !important; 
                font-weight: 700; 
                text-shadow: 0 0 5px rgba(212, 175, 55, 0.3);
            }
        `;
        document.head.appendChild(extraStyles);

        window.addEventListener('scroll', () => {
            const btn = document.getElementById('scrollTopBtn');
            if(btn) {
                if (window.scrollY > 300) btn.classList.add('visible');
                else btn.classList.remove('visible');
            }
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.ex-name-input') && !e.target.closest('.custom-dropdown')) {
                document.querySelectorAll('.custom-dropdown').forEach(el => el.style.display = 'none');
            }
        });

        const brandBlock = document.getElementById('brandBlock');
        const brandIcon = brandBlock.querySelector('.brand-icon');

        brandIcon.onclick = (e) => {
            e.stopPropagation(); 
            brandIcon.classList.remove('hint-active');
            void brandIcon.offsetWidth; 
            brandIcon.classList.add('hint-active');
        };

        brandBlock.ondblclick = async () => {
            if(await Modal.confirm("⚠ HARD RESET?<br><br>Це незворотно видалить усі дані тренувань.", "КРИТИЧНО", "red")) {
                localStorage.removeItem('training_protocol');
                // ДОДАНО: Знищуємо нову базу даних IndexedDB
                try { indexedDB.deleteDatabase('ProtocolOS_DB'); } catch(e) {}
                location.reload();
            }
        };

        if(!this.data.currentProgram) this.data.currentProgram = 'balanced';
        this.setTheme(this.data.currentProgram);
        this.updateBank();
        this.buildIndex();
        this.render();
        this.save();
        this.initTimer();
    },

    openExList(w, d, e) {
        const inp = document.getElementById(`ex-${w}-${d}-${e}`);
        if(inp) this.filterExList(inp.value, w, d, e);
    },
    
    filterExList(q, w, d, e) {
        document.querySelectorAll('.custom-dropdown').forEach(el => el.style.display = 'none');
        
        const list = document.getElementById(`list-${w}-${d}-${e}`);
        if (!list) return;
        
        const matches = this.data.exBank.filter(x => x.toLowerCase().includes(q.toLowerCase()));
        
        if (matches.length === 0) {
            list.innerHTML = `<div style="padding:10px; color:#666; font-size:0.8rem; text-align:center;">Немає збігів</div>`;
        } else {
            list.innerHTML = matches.map(m => `
                <div style="padding: 12px 15px; border-bottom: 1px solid #222; color: #fff; font-size: 0.85rem; cursor: pointer; transition: 0.2s;" 
                     onclick="App.selectEx('${m.replace(/'/g, "\\'")}', ${w}, ${d}, ${e})"
                     onmouseover="this.style.background='#333'" onmouseout="this.style.background='transparent'">
                    ${m}
                </div>
            `).join('');
        }
        list.style.display = 'block';
        list.style.animation = 'fadeInDown 0.2s ease forwards';
    },
    
    selectEx(val, w, d, e) {
        const inp = document.getElementById(`ex-${w}-${d}-${e}`);
        if (inp) {
            inp.value = val;
            this.updateEx(w, d, e, 'n', val); 
        }
        document.getElementById(`list-${w}-${d}-${e}`).style.display = 'none';
    },

    toggleDay(uid, el) {
        if(!this.data.opened) this.data.opened = {};
        
        if(this.data.opened[uid]) {
            delete this.data.opened[uid];
        } else {
            this.data.opened[uid] = true;
        }
        
        this.save();
        
        if (el) {
            const card = el.closest('.day-card');
            if(card) card.classList.toggle('collapsed');
        }
    },

    getGhostData(exerciseName, currentWNum, currentDIdx, prog) {
        if (!exerciseName || !this.historyIndex) return null;
        const name = exerciseName.trim().toLowerCase();
        const history = this.historyIndex[name];
        if (!history) return null;

        // Шукаємо з кінця історії (найсвіжіші дані)
        for (let i = history.length - 1; i >= 0; i--) {
            const entry = history[i];
            if (entry.prog !== prog) continue;
            
            // Шукаємо перший запис, який був ДО поточного дня
            if (entry.wNum < currentWNum || (entry.wNum === currentWNum && entry.dIdx < currentDIdx)) {
                if (entry.hasData) return entry.sets;
            }
        }
        return null;
    },

    getEstimated1RM(exerciseName, currentWNum, currentDIdx, prog) {
        if (!exerciseName || !this.historyIndex) return 0;
        const name = exerciseName.trim().toLowerCase();
        const history = this.historyIndex[name];
        if (!history) return 0;

        let maxRM = 0;
        for (let i = 0; i < history.length; i++) {
            const entry = history[i];
            if (entry.prog !== prog) continue;
            
            // Враховуємо тільки ті рекорди, що були ДО поточного дня
            if (entry.wNum > currentWNum || (entry.wNum === currentWNum && entry.dIdx >= currentDIdx)) continue;
            
            if (entry.maxRM > maxRM) maxRM = entry.maxRM;
        }
        return Math.round(maxRM);
    },
    cycleSetType(w, d, e, s) {
        const setObj = this.data.weeks[w].days[d].exercises[e].sets[s];
        let msg = "";
        let color = "";

        if (!setObj.t) {
            setObj.t = 'WU';
            msg = "🟡 WU: Підвідний / Розминка (Не йде в рекорди)";
            color = "var(--theme)";
        }
        else if (setObj.t === 'WU') {
            setObj.t = 'TS';
            msg = "🔴 TS: Top Set (Максимальна відмова)";
            color = "var(--danger)";
        }
        else if (setObj.t === 'TS') {
            setObj.t = 'BO';
            msg = "🔵 BO: Back-off (-20% ваги)";
            color = "#3b82f6";
        }
        else if (setObj.t === 'BO') {
            setObj.t = 'DS';
            msg = "🟣 DS: Drop-set (Інтенсифікація)";
            color = "#8b5cf6";
        }
        else {
            delete setObj.t;
            msg = "⚪ Робочий / Filler підхід";
            color = "#444";
        }
        
        this.save();
        this.render();
        this.showToast(msg, color);
    },

    showToast(msg, color="var(--success)") {
        document.querySelectorAll('.sys-toast').forEach(t => t.remove());
        const toast = document.createElement('div');
        toast.className = 'sys-toast';
        toast.innerText = msg;
        toast.style.cssText = `position:fixed; bottom:90px; left:50%; transform:translateX(-50%); background:${color}; color:#fff; padding:10px 20px; border-radius:20px; z-index:9999; font-weight:bold; box-shadow: 0 4px 15px rgba(0,0,0,0.5); font-size: 0.8rem; white-space: nowrap; animation: fadeInDown 0.2s ease forwards;`;
        document.body.appendChild(toast);
        setTimeout(() => { if(toast) toast.remove(); }, 2500);
    },

    moveEx(w, d, e, direction) {
        const arr = this.data.weeks[w].days[d].exercises;
        if (direction === -1 && e > 0) {
            [arr[e-1], arr[e]] = [arr[e], arr[e-1]];
            this.pushHistory();
            this.save();
            this.render();
        } else if (direction === 1 && e < arr.length - 1) {
            [arr[e+1], arr[e]] = [arr[e], arr[e+1]];
            this.pushHistory();
            this.save();
            this.render();
        }
    },

    toggleSuperset(w, d, e) {
        this.pushHistory();
        const ex = this.data.weeks[w].days[d].exercises[e];
        ex.linkNext = !ex.linkNext;
        this.save();
        this.render();
    },
    render() {
        const c = document.getElementById('scheduleList');
        const nav = document.getElementById('weekNav');
        const isEd = document.body.classList.contains('editing');
        const prog = this.data.currentProgram;

        // --- ДИНАМІЧНІ НАЗВИ ВКЛАДОК (Редагуються подвійним тапом) ---
        const nameBal = this.data.customNames ? this.data.customNames.balanced : "ЗБАЛАНСОВАНА";
        const nameArms = this.data.customNames ? this.data.customNames.arms : "РУКИ";

        const progSel = document.querySelector('.program-selector');
        if (progSel) {
            progSel.innerHTML = `
                <div class="prog-opt ${prog === 'balanced' ? 'active' : ''}" 
                     onclick="App.setProgram('balanced')" 
                     ondblclick="App.renameProgram('balanced'); event.stopPropagation();">
                    ⚖️ ${nameBal}
                </div>
                <div class="prog-opt ${prog === 'arms' ? 'active' : ''}" 
                     onclick="App.setProgram('arms')" 
                     ondblclick="App.renameProgram('arms'); event.stopPropagation();">
                    💪 ${nameArms}
                </div>
            `;
        }

        const filteredWeeks = this.data.weeks.filter(w => w.prog === prog);

        nav.innerHTML = filteredWeeks.map((w) => {
            const specialClass = w.prog === 'arms' ? 'is-arms' : '';
            return `<div class="week-btn ${w.type} ${specialClass}" onclick="document.getElementById('week-${w.id}').scrollIntoView({behavior:'smooth'})">
                <span>${w.num}</span>
                <small>${w.type}</small>
            </div>`;
        }).join('') + `<div class="week-btn" onclick="App.addWeek('mass')" style="border:1px dashed #444; opacity:0.5; font-size:0.7rem">+ MASS</div><div class="week-btn" onclick="App.addWeek('cut')" style="border:1px dashed #444; opacity:0.5; font-size:0.7rem">+ CUT</div>`;

        if (filteredWeeks.length === 0) {
            c.innerHTML = `<div style="text-align:center; padding:40px; color:#666">Програма порожня. Натисніть + MASS або + CUT зверху.</div>`;
        } else {
            c.innerHTML = filteredWeeks.map((week) => {
                const theme = week.type === 'mass' ? 'mass-theme' : 'cut-theme';
                const realWIdx = this.getRealIndex(week);
                
                const daysHtml = week.days.map((day, dIdx) => {
                    const uid = week.id + '-' + dIdx;
                    const isOpen = this.data.opened && this.data.opened[uid];

                    const exsHtml = day.exercises.map((ex, eIdx) => {
                        const m = ex.m || 'wr';
                        
                        if(m === 'cardio') {
                            const s = ex.sets[0] || {};
                            return `<div class="exercise cardio-block">
                                ${isEd ? `<div class="ex-del" onclick="App.delEx(${realWIdx},${dIdx},${eIdx})">✕</div>` : ''}
                                <div class="cardio-header">🏃 ${ex.n}</div>
                                <div class="cardio-grid">
                                    <div class="c-input-box"><span class="c-label">ХВ</span><input class="c-input" type="number" inputmode="decimal" value="${s.r||''}" onblur="App.updateSet(${realWIdx},${dIdx},${eIdx},0,'r',this.value)"></div>
                                    <div class="c-input-box"><span class="c-label">КМ</span><input class="c-input" type="number" inputmode="decimal" value="${s.w||''}" onblur="App.updateSet(${realWIdx},${dIdx},${eIdx},0,'w',this.value)"></div>
                                    <div class="c-input-box"><span class="c-label">ККАЛ</span><input class="c-input" type="number" inputmode="decimal" value="${s.d||''}" onblur="App.updateSet(${realWIdx},${dIdx},${eIdx},0,'d',this.value)"></div>
                                    <div class="c-input-box"><span class="c-label">BPM</span><input class="c-input" type="number" inputmode="decimal" value="${s.h||''}" placeholder="❤️" style="color:var(--danger) !important" onblur="App.updateSet(${realWIdx},${dIdx},${eIdx},0,'h',this.value)"></div>
                                </div>
                            </div>`;
                        }

                        const groupSelect = isEd ? `<select class="group-select" onchange="App.updateEx(${realWIdx},${dIdx},${eIdx},'g',this.value)">${Groups.map(g => `<option value="${g}" ${ex.g===g?'selected':''}>${g}</option>`).join('')}</select>` : `<span class="ex-badge group">${ex.g || ResolveGroup(ex.n)}</span>`;
                        
                        // --- SMART GUIDE (Підказки) ---
                        const guideInfo = this.data.guidelines[week.type]?.find(g => g.n.trim().toLowerCase() === ex.n.trim().toLowerCase());
                        let smartGuideHtml = '';
                        if (guideInfo && !isEd) {
                            smartGuideHtml = `
                            <div style="margin-top: 4px; font-family: 'JetBrains Mono', monospace; line-height: 1.3;">
                                <div style="font-size: 0.65rem; color: var(--theme); font-weight: 700; opacity: 0.9;">
                                    ⚡ ${guideInfo.p} | ${guideInfo.s} | ${guideInfo.w}
                                </div>
                                ${guideInfo.i ? `<div style="font-size: 0.65rem; color: #777; font-style: italic; margin-top: 2px;">"${guideInfo.i}"</div>` : ''}
                            </div>`;
                        }

                        let exNameHtml = '';
                        if (isEd) {
                            exNameHtml = `
                            <div style="position:relative; flex:1; margin-right:10px;">
                                <input class="ex-name-input" id="ex-${realWIdx}-${dIdx}-${eIdx}" autocomplete="off" value="${ex.n}" 
                                       onfocus="App.openExList(${realWIdx}, ${dIdx}, ${eIdx})" 
                                       oninput="App.filterExList(this.value, ${realWIdx}, ${dIdx}, ${eIdx})" 
                                       onblur="setTimeout(() => App.updateEx(${realWIdx},${dIdx},${eIdx},'n',document.getElementById('ex-${realWIdx}-${dIdx}-${eIdx}').value), 200)">
                                <div id="list-${realWIdx}-${dIdx}-${eIdx}" class="custom-dropdown" style="display:none; position:absolute; top:calc(100% + 4px); left:0; width:100%; background:#1a1a1a; border:1px solid #444; border-radius:8px; max-height:200px; overflow-y:auto; z-index:9999; box-shadow:0 10px 30px rgba(0,0,0,0.9);"></div>
                            </div>`;
                        } else {
                            exNameHtml = `<div style="display:flex; flex-direction:column;"><span class="ex-name">${ex.n || '<span style="color:#555;font-size:0.8rem">Вправа</span>'}</span>${smartGuideHtml}</div>`;
                        }

                        const isLinked = ex.linkNext === true;
                        const isChild = eIdx > 0 && day.exercises[eIdx-1].linkNext === true;

                        let timerHtml = '';
                        if (!isEd && m !== 'cardio' && !isLinked) {
                            const exTime = ex.t || App.timerState.default;
                            timerHtml = `
                            <div class="ex-timer-btn" id="timer-btn-${realWIdx}-${dIdx}-${eIdx}" style="touch-action: manipulation; user-select: none;"
                                 onclick="App.handleTimerClick(${realWIdx}, ${dIdx}, ${eIdx}, ${exTime})">
                                <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none" style="margin-right:4px"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                ${exTime}s
                            </div>`;
                        }

                        const ghostSets = App.getGhostData(ex.n, week.num, dIdx, prog);

                        const setsHtml = ex.sets.map((s, sIdx) => {
                            if (m === 't') {
                                return `<div class="set-row"><div class="set-num">${sIdx+1}</div><div class="set-part"><input class="set-input" type="number" inputmode="decimal" value="${s.r||''}" onblur="App.updateSet(${realWIdx},${dIdx},${eIdx},${sIdx},'r',this.value, this)"><span class="set-unit">час</span></div></div>`;
                            }

                            let ghostW = (ghostSets && ghostSets[sIdx] && ghostSets[sIdx].w) ? ghostSets[sIdx].w : '';
                            let ghostR = (ghostSets && ghostSets[sIdx] && ghostSets[sIdx].r) ? ghostSets[sIdx].r : '';

                            let sType = s.t || '';
                            let typeLabel = sIdx + 1;
                            let typeClass = '';
                            if (sType === 'WU') { typeLabel = 'WU'; typeClass = 'type-WU'; }
                            else if (sType === 'TS') { typeLabel = 'TS'; typeClass = 'type-TS'; }
                            else if (sType === 'BO') { typeLabel = 'BO'; typeClass = 'type-BO'; }
                            else if (sType === 'DS') { typeLabel = 'DS'; typeClass = 'type-DS'; }

                            // --- BEAT THE LOGBOOK HUD ---
                            let progressHtml = '&nbsp;';
                            if (ghostW && ghostR) {
                                let prev1RM = parseFloat(ghostW) * (1 + parseFloat(ghostR) / 30);
                                let curW = parseFloat(s.w) || 0;
                                let curR = parseFloat(s.r) || 0;
                                let cur1RM = (curW > 0 && curR > 0) ? curW * (1 + curR / 30) : 0;
                                
                                let icon = '<span style="color:#555">➖</span>';
                                if (cur1RM > prev1RM) icon = '<span style="color:var(--success); text-shadow: 0 0 5px var(--success);">🔥</span>';
                                else if (cur1RM > 0 && cur1RM < prev1RM) icon = '<span style="color:var(--danger)">🔻</span>';

                                progressHtml = `<span style="color:#777; font-weight:600;">Минуло: ${ghostW}x${ghostR}</span> <span style="margin-left:3px">${icon}</span>`;
                            }

                            return `
                            <div style="display:flex; flex-direction:column; gap:2px; position:relative;">
                                <div style="font-size:0.55rem; text-align:right; padding-right:4px; font-family:'JetBrains Mono'; height:12px; letter-spacing:0.5px; width:100%; white-space:nowrap;">
                                    ${progressHtml}
                                </div>
                                <div class="set-row ${typeClass}">
                                    <div class="set-num ${typeClass}" title="Клікніть, щоб змінити тип" onclick="App.cycleSetType(${realWIdx},${dIdx},${eIdx},${sIdx})">${typeLabel}</div>
                                    <div class="set-part">
                                        <input type="text" inputmode="text" class="set-input w-val" value="${s.w||''}" 
                                               onkeydown="if(event.key===' '){ event.preventDefault(); this.closest('.set-row').querySelector('.r-val').focus(); }" 
                                               onblur="App.updateSet(${realWIdx},${dIdx},${eIdx},${sIdx},'w',this.value, this)">
                                        <span class="set-unit">кг</span>
                                    </div>
                                    <div class="set-part">
                                        <input type="number" inputmode="decimal" class="set-input r-val" value="${s.r||''}" 
                                               onblur="App.updateSet(${realWIdx},${dIdx},${eIdx},${sIdx},'r',this.value, this)">
                                        <span class="set-unit">x</span>
                                    </div>
                                </div>
                            </div>`;
                        }).join('');

                        return `<div class="exercise ${isLinked ? 'superset-link' : ''} ${isChild ? 'superset-child' : ''}">
                            ${isEd ? `<div class="ex-del" onclick="App.delEx(${realWIdx},${dIdx},${eIdx})">✕</div>` : ''}
                            <div class="ex-info">
                                <div class="ex-name-row">
                                    ${exNameHtml}
                                    <div style="display: flex; gap: 10px; align-items: center; margin-top: 6px;">
                                        ${groupSelect}
                                        ${timerHtml}
                                    </div>
                                </div>
                                <div class="edit-ui" style="gap:5px; align-items:center;">
                                    <div class="set-btn" onclick="App.moveEx(${realWIdx},${dIdx},${eIdx},-1)" style="font-size:1.2rem; line-height:1" title="Вгору">↑</div>
                                    <div class="set-btn" onclick="App.moveEx(${realWIdx},${dIdx},${eIdx},1)" style="font-size:1.2rem; line-height:1" title="Вниз">↓</div>
                                    <div class="btn-link ${isLinked ? 'active' : ''}" title="Зв'язати в суперсет" onclick="App.toggleSuperset(${realWIdx},${dIdx},${eIdx})">🔗</div>
                                    <div class="set-btn" onclick="App.changeSets(${realWIdx},${dIdx},${eIdx},-1)">-</div>
                                    <div class="set-btn" onclick="App.changeSets(${realWIdx},${dIdx},${eIdx},1)">+</div>
                                </div>
                            </div>
                            <div class="sets-wrapper">${setsHtml}</div>
                        </div>`;
                        }).join('');

                    const dayGroup = isEd ? `<span class="day-group" contenteditable="true" onblur="App.updateDay(${realWIdx},${dIdx},'group',this.innerText)" onclick="event.stopPropagation()">${day.group}</span>` : `<span class="day-group">${day.group}</span>`;

                    return `
                    <div class="day-card ${isOpen ? '' : 'collapsed'}">
                        <div class="day-header" onclick="App.toggleDay('${uid}', this)">
                            <div style="display:flex; align-items:center">
                                <span class="day-chevron">▼</span>
                                <span class="day-title">${day.day}</span>
                            </div>
                            ${dayGroup}
                        </div>
                        <div class="ex-list">
                            ${exsHtml}
                            <div class="add-controls edit-ui">
                                <div class="btn-add" style="color:var(--success)" onclick="App.addEx(${realWIdx},${dIdx},'wr'); event.stopPropagation()">+ Вправа</div>
                                <div class="btn-add" style="color:var(--cardio)" onclick="App.addEx(${realWIdx},${dIdx},'cardio'); event.stopPropagation()">+ 🏃</div>
                            </div>
                            <textarea class="notes-area" placeholder="Нотатки..." onblur="App.updateEx(${realWIdx},${dIdx},'note',this.value)" onclick="event.stopPropagation()">${day.note||''}</textarea>
                        </div>
                    </div>`;
                }).join('');

                // В режимі редагування номер тижня - це інпут, а не костиль з модалкою
                const weekNumHtml = isEd 
                    ? `<input type="number" inputmode="numeric" value="${week.num}" style="width:40px; background:transparent; border:1px dashed #666; border-radius:4px; color:var(--${week.type}); font-size:1.1rem; text-align:center; padding:0; font-weight:800; font-family:'JetBrains Mono';" onblur="App.updateWeekNum(${week.id}, this.value)" onclick="event.stopPropagation()">`
                    : week.num;

                return `<div id="week-${week.id}" class="${theme}">
                    <div style="padding:10px 0; display:flex; justify-content:space-between; align-items:center">
                        <div><h3 style="margin:0; color:#fff; display:flex; align-items:center; gap:8px;">ТИЖДЕНЬ ${weekNumHtml} <span style="font-size:0.8rem; color:var(--${week.type})">// ${week.type.toUpperCase()}</span></h3></div>
                        <span class="edit-ui" style="color:var(--danger); cursor:pointer" onclick="App.delWeek(${week.id})">Видалити</span>
                    </div>
                    <div class="days-list">${daysHtml}</div>
                </div><hr style="border:0; border-top:1px dashed #333; margin:30px 0">`;
            }).join('');
        }
        
        this.renderGuide();
    },

    // ДОДАНО
    saveTimer: null,

    save() { 
        if (this.saveTimer) clearTimeout(this.saveTimer);
        this.saveTimer = setTimeout(() => {
            this.buildIndex(); // Будуємо індекс максів ТІЛЬКИ перед збереженням
            this.state.save(this.data); 
            this.saveTimer = null;
        }, 800);
    },

    // ДОДАНО: Екстрений запис
    forceSave() {
        this.buildIndex();
        this.state.save(this.data);
    },
    
    undo() {
        const prev = this.state.undo(this.data);
        if (prev) {
            this.data = prev;
            this.render();
            if (this.state.history.length === 0) {
                const btn = document.getElementById('undoBtn');
                if(btn) btn.style.display='none';
            }
        }
    },
    pushHistory() {
        this.state.push(this.data);
        const btn = document.getElementById('undoBtn');
        if(btn) btn.style.display='flex';
    },

    setProgram(prog) {
        this.data.currentProgram = prog;
        this.setTheme(prog);
        this.save();
        this.render();
    },

    setTheme(prog) {
        document.body.className = `prog-${prog}`;
    },
    
    getRealIndex(weekObj) {
        return this.data.weeks.findIndex(w => w.id === weekObj.id);
    },

    updateBank() {
        const allNames = new Set(this.data.exBank);
        this.data.weeks.forEach(w => w.days.forEach(d => d.exercises.forEach(e => {
            if(e.n && e.n.length > 2) allNames.add(e.n);
        })));
        Object.values(this.data.guidelines).forEach(list => list.forEach(r => {
            if(r.n && r.n.length > 2) allNames.add(r.n);
        }));
        
        this.data.exBank = Array.from(allNames).sort();
    },

    openBank() {
        this.toggleFab(false);
        const list = document.getElementById('bankList');
        list.innerHTML = this.data.exBank.map(n => `<div class="bank-item"><span>${n}</span><span class="bank-del" onclick="App.deleteFromBank('${n.replace(/'/g, "\\'")}')">✕</span></div>`).join('');
        document.getElementById('bankModal').style.display = 'flex';
    },
    
    calc1RM() {
        const w = parseFloat(document.getElementById('rm-w').value) || 0;
        const r = parseFloat(document.getElementById('rm-r').value) || 0;
        
        if(w > 0 && r > 0) {
            const oneRm = Math.round(w * (1 + r / 30));
            document.getElementById('rm-result').innerText = oneRm;
            document.getElementById('rm-95').innerText = Math.round(oneRm * 0.95);
            document.getElementById('rm-85').innerText = Math.round(oneRm * 0.85);
            document.getElementById('rm-75').innerText = Math.round(oneRm * 0.75);
            document.getElementById('rm-65').innerText = Math.round(oneRm * 0.65);
        } else {
            document.getElementById('rm-result').innerText = "0";
        }
    },
    
    closeModal() {
        document.querySelectorAll('.modal').forEach(el => el.style.display = 'none');
        this.toggleFab(true);
    },

    // --- РОЗУМНИЙ REST TIMER ---
    initTimer() {
        const t = document.createElement('div');
        t.id = 'rest-timer';
        t.style.cssText = `
            position: fixed; bottom: 85px; left: 50%; transform: translateX(-50%);
            background: rgba(20, 20, 22, 0.95); border: 1px solid var(--theme, #d4af37);
            color: var(--theme, #d4af37); padding: 10px 28px; border-radius: 30px;
            font-family: 'JetBrains Mono', monospace; font-size: 1.2rem; font-weight: 800;
            box-shadow: 0 5px 25px rgba(0,0,0,0.8); cursor: pointer; z-index: 8000;
            transition: all 0.2s ease; display: none; align-items: center; justify-content: center;
            backdrop-filter: blur(10px); user-select: none; touch-action: manipulation;
            min-width: 140px; text-align: center;
        `;
        
        t.onclick = (e) => {
            e.preventDefault();
            this.stopTimer(); // Клік по активному таймеру зупиняє і ховає його
        };

        document.body.appendChild(t);
        this.timerState.el = t;
        
        const savedTime = localStorage.getItem('rest_timer_default');
        if (savedTime) this.timerState.default = parseInt(savedTime);
    },
    toggleTimer() {
        if (this.timerState.interval) {
            this.stopTimer();
        } else {
            this.startTimer(this.timerState.default);
        }
    },

    startTimer(seconds) {
        this.stopTimer();
        this.timerState.left = seconds;
        this.timerState.endTime = Date.now() + (seconds * 1000);
        
        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission();
        }
        
        this.timerState.el.style.display = 'flex';
        this.timerState.el.style.background = 'var(--theme, #d4af37)';
        this.timerState.el.style.color = '#000';
        this.timerState.el.style.boxShadow = '0 0 25px var(--theme, #d4af37)';
        
        this.updateTimerUI();
        if (window.Haptics) window.Haptics.light();

        this.timerState.interval = setInterval(() => {
            const now = Date.now();
            this.timerState.left = Math.ceil((this.timerState.endTime - now) / 1000);
            
            this.updateTimerUI();

            if (this.timerState.left <= 0) {
                clearInterval(this.timerState.interval);
                this.timerState.interval = null;
                this.timerState.endTime = null;
                
                this.timerState.el.style.background = 'var(--success)';
                this.timerState.el.style.color = '#fff';
                this.timerState.el.style.boxShadow = '0 0 25px var(--success)';
                this.timerState.el.innerHTML = "🔥 ГОТОВИЙ!";
                
                if ("Notification" in window && Notification.permission === "granted") {
                    new Notification("Час відпочинку вийшов!", { body: "Пора робити наступний підхід", icon: "icon.png", vibrate: [200, 100, 200] });
                }
                
                if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 400]);
                if (window.Haptics) window.Haptics.heavy();
                
                setTimeout(() => { if(!this.timerState.interval) this.timerState.el.style.display = 'none'; }, 5000);
            }
        }, 250); 
    },

    stopTimer() {
        if(this.timerState.interval) clearInterval(this.timerState.interval);
        this.timerState.interval = null;
        this.timerState.endTime = null; 
        
        this.timerState.el.style.background = 'rgba(20, 20, 22, 0.95)';
        this.timerState.el.style.color = 'var(--theme, #d4af37)';
        this.timerState.el.style.boxShadow = '0 5px 25px rgba(0,0,0,0.8)';
        
        this.timerState.el.style.display = 'none';
        this.timerState.left = this.timerState.default;
    },

    updateTimerUI() {
        if (!this.timerState.el) return;
        const timeToFormat = this.timerState.interval ? this.timerState.left : this.timerState.default;
        
        const m = Math.floor(timeToFormat / 60).toString().padStart(2, '0');
        const s = (timeToFormat % 60).toString().padStart(2, '0');
        
        if (this.timerState.interval) {
            this.timerState.el.innerHTML = `⏳ ${m}:${s}`;
        }
    },

    async setTimerForExercise(w, d, e, currentVal) {
        const val = await Modal.prompt(`Введіть час (сек) для цієї вправи:<br><br><span style='color:#888; font-size:0.8rem'>Наприклад: 90 (1.5 хв) або 120 (2 хв)</span>`, "ТАЙМЕР ВПРАВИ", currentVal.toString());
        
        if (val !== null && val !== "") {
            const newTime = parseInt(val);
            if (!isNaN(newTime) && newTime > 0) {
                this.data.weeks[w].days[d].exercises[e].t = newTime;
                this.save();
                
                const btnId = `timer-btn-${w}-${d}-${e}`;
                const btnEl = document.getElementById(btnId);
                if (btnEl) {
                    btnEl.innerHTML = `<svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none" style="margin-right:4px"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>${newTime}s`;
                    btnEl.setAttribute('onclick', `App.startTimer(${newTime})`);
                    btnEl.setAttribute('oncontextmenu', `App.setTimerForExercise(${w}, ${d}, ${e}, ${newTime}); return false;`);
                }
            }
        }
    },
        
    // --- КАСТОМНИЙ DOUBLE TAP (ЩОБ ТАЙМЕР НЕ СТАРТУВАВ ПРИ РЕДАГУВАННІ) ---
    _timerTaps: {},
    handleTimerClick(w, d, e, time) {
        const key = `${w}-${d}-${e}`;
        if (this._timerTaps[key]) {
            // Подвійний тап: скасовуємо старт таймера і відкриваємо налаштування
            clearTimeout(this._timerTaps[key]);
            this._timerTaps[key] = null;
            this.setTimerForExercise(w, d, e, time);
        } else {
            // Одинарний тап: чекаємо 250мс, якщо другого тапу не було - запускаємо таймер
            this._timerTaps[key] = setTimeout(() => {
                this._timerTaps[key] = null;
                this.startTimer(time);
            }, 250);
        }
    },

    // --- РЕДАГУВАННЯ ТИЖНЯ (БЕЗ МОДАЛОК) ---
    updateWeekNum(id, val) {
        const num = parseInt(val);
        if (!isNaN(num) && num > 0) {
            const w = this.data.weeks.find(x => x.id === id);
            if (w && w.num !== num) {
                this.pushHistory();
                w.num = num;
                this.data.weeks.sort((a, b) => a.num - b.num); // Сортуємо одразу
                this.save();
                this.render();
            }
        }
    },

    async renameProgram(key) {
        const currentName = this.data.customNames[key] || (key === 'balanced' ? "ЗБАЛАНСОВАНА" : "РУКИ");
        const val = await Modal.prompt("Введіть нову назву для цієї вкладки:", "ПЕРЕЙМЕНУВАННЯ", currentName);
        
        if (val !== null && val.trim() !== "") {
            this.pushHistory();
            this.data.customNames[key] = val.trim().toUpperCase();
            this.save();
            this.render();
        }
    },
    addToBank() {
        const val = document.getElementById('newBankItem').value.trim();
        if(val && !this.data.exBank.includes(val)) {
            this.pushHistory();
            this.data.exBank.push(val);
            this.data.exBank.sort();
            this.save();
            this.updateBank(); 
            this.openBank(); 
            document.getElementById('newBankItem').value = '';
        }
    },

    async deleteFromBank(name) {
        if(!(await Modal.confirm(`Видалити "${name}" з бази назавжди?`, "ВИДАЛЕННЯ", "red"))) return;
        this.pushHistory();
        this.data.exBank = this.data.exBank.filter(x => x !== name);
        this.save();
        this.updateBank();
        this.openBank();
    },

    async addWeek(type, init=false) {
        if (!init) this.pushHistory(); 
        
        const prog = this.data.currentProgram || 'balanced';
        let newData;
        
        const currentProgWeeks = this.data.weeks.filter(w => w.prog === prog);
        const maxNum = currentProgWeeks.length > 0 ? Math.max(...currentProgWeeks.map(w => w.num)) : 0;
        const newWeekNum = maxNum + 1; 

        const lastWeek = [...this.data.weeks].reverse().find(w => w.type === type && w.prog === prog);
        
        if(lastWeek && !init) {
            const hardCopy = await Modal.confirm(
                "Скопіювати минулий тиждень <b>разом з вагами і повторами</b>?<br><br><span style='font-size:0.8rem; color:#888'>ОК — повна копія (для прогресії).<br>Скасувати — тільки структура.</span>", 
                "РЕЖИМ КОПІЮВАННЯ", 
                "var(--theme)"
            );

            newData = JSON.parse(JSON.stringify(lastWeek.days));
            newData.forEach(d => {
                // Нотатки не видаляємо!
                d.exercises.forEach(ex => { 
                    ex.sets.forEach(s => { 
                        if (!hardCopy) {
                            s.w = ""; 
                            s.r = ""; 
                        }
                        s.d = ""; 
                    }); 
                });
            });
        } else {
            newData = JSON.parse(JSON.stringify(Templates[prog][type]));
        }
        
        const w = { id: Date.now(), type, prog, num: newWeekNum, days: newData };
        this.data.weeks.push(w);
        this.data.weeks.sort((a, b) => a.num - b.num);
        this.updateBank();
        this.save(); 
        this.render();
    },

    async delWeek(id) {
        if(!(await Modal.confirm("Видалити цей тиждень повністю?", "ВИДАЛЕННЯ ТИЖНЯ", "red"))) return;
        this.pushHistory();
        const idx = this.data.weeks.findIndex(w => w.id === id);
        if (idx !== -1) {
            this.data.weeks.splice(idx, 1);
            this.save(); 
            this.render();
        }
    },

    addEx(w, d, type) {
        this.pushHistory();
        const def = type === 'cardio' ? { n: "Ходьба", g: "Кардіо", m: "cardio", sets: [{}] } : { n: "", g: "Інше", m: "wr", sets: [{},{},{}] };
        this.data.weeks[w].days[d].exercises.push(def);
        this.save(); this.render();
    },
    
    async delEx(w, d, e) {
        if(!(await Modal.confirm("Видалити цю вправу з дня?", "ВИДАЛЕННЯ ВПРАВИ", "red"))) return;
        this.pushHistory();
        this.data.weeks[w].days[d].exercises.splice(e, 1);
        this.save(); this.render();
    },

    updateDay(w, d, f, v) {
        if(this.data.weeks[w].days[d][f] !== v) {
            this.pushHistory();
            this.data.weeks[w].days[d][f] = v;
            this.save();
        }
    },

    updateEx(w, d, e, field, val) {
        if(this.data.weeks[w].days[d].exercises[e][field] !== val) {
            this.pushHistory();
            this.data.weeks[w].days[d].exercises[e][field] = val;
            if(field === 'n') this.updateBank();
            this.save();
        }
    },

    changeSets(w, d, e, delta) {
        this.pushHistory();
        const ex = this.data.weeks[w].days[d].exercises[e];
        if(delta > 0) ex.sets.push({});
        else if(ex.sets.length > 1) ex.sets.pop();
        this.save(); this.render();
    },

    updateSet(w, d, e, s, f, val, inputEl) {
        let finalVal = val;
        let needRender = false;

        if (f === 'w' && typeof val === 'string' && (val.includes('%') || val.toLowerCase().includes('p'))) {
            const percent = parseFloat(val);
            if (!isNaN(percent) && percent > 0) {
                const exName = this.data.weeks[w].days[d].exercises[e].n;
                const wNum = this.data.weeks[w].num;
                const e1RM = this.getEstimated1RM(exName, wNum, d, this.data.currentProgram);
                
                if (e1RM > 0) {
                    const calcWeight = e1RM * (percent / 100);
                    finalVal = (Math.round(calcWeight / 2.5) * 2.5).toString();
                    
                    // БЕЗ МЕРЕХТІННЯ: Оновлюємо DOM безпосередньо!
                    if (inputEl) inputEl.value = finalVal;
                    else needRender = true;
                    
                    this.showToast(`🎯 1RM: ${e1RM}кг. ${percent}% = ${finalVal}кг`, 'var(--success)');
                } else {
                    this.showToast(`⚠️ Немає історії для розрахунку`, 'var(--danger)');
                    finalVal = ""; 
                    if (inputEl) inputEl.value = "";
                    else needRender = true;
                }
            }
        }

        if(this.data.weeks[w].days[d].exercises[e].sets[s][f] !== finalVal) {
            this.data.weeks[w].days[d].exercises[e].sets[s][f] = finalVal;
            this.save();
            if (needRender) this.render();
        }
    },
    setGuideMode(m) { this.data.guideMode = m; this.save(); this.renderGuide(); },
    
    updateTarget(group, val) { 
        const nVal = parseInt(val)||0;
        if(this.data.targets[group] !== nVal) {
            this.pushHistory();
            this.data.targets[group] = nVal; 
            this.save(); 
            this.renderStats(); 
        }
    },
    async promptTarget(group, currentTarget) {
        const val = await Modal.prompt(`Встановіть цільову кількість робочих підходів для групи <b>${group}</b>:`, "ЦІЛЬОВИЙ ОБ'ЄМ", currentTarget.toString());
        if (val !== null && val !== "") {
            const num = parseInt(val);
            if (!isNaN(num) && num > 0) this.updateTarget(group, num);
        }
    },
    
    filterGuide(q) {
        const rows = document.querySelectorAll('.guide-table tbody tr');
        rows.forEach(r => r.style.display = r.innerText.toLowerCase().includes(q.toLowerCase()) ? '' : 'none');
    },

    updateGuide(m, i, f, v) { 
        if(this.data.guidelines[m][i][f] !== v) {
            this.pushHistory();
            this.data.guidelines[m][i][f] = v; 
            if(f==='n') this.updateBank();
            this.save(); 
        }
    },
    
    async delGuideRow(m, i) {
        if(!(await Modal.confirm("Видалити цю вправу з довідника?", "ВИДАЛЕННЯ", "red"))) return;
        this.pushHistory();
        this.data.guidelines[m].splice(i, 1);
        this.save();
        this.renderGuide();
    },

    toggleEdit() {
        const isEditing = document.body.classList.contains('editing');
        const btn = document.getElementById('editBtn');
        
        if (isEditing) {
            document.body.classList.remove('editing');
            if (btn) btn.classList.remove('active');
        } else {
            document.body.classList.add('editing');
            if (btn) btn.classList.add('active');
        }
        
        this.render(); 
        this.renderGuide();
    },

    setView(v) {
        document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
        document.getElementById(`nav-${v}`).classList.add('active');
        
        document.getElementById('viewSchedule').style.display = v==='schedule'?'block':'none';
        document.getElementById('viewStats').style.display = v==='stats'?'block':'none';
        document.getElementById('viewGuide').style.display = v==='guide'?'block':'none';
        
        if(v === 'stats') this.renderStats();
        if(v === 'guide') this.renderGuide();
    },

    updateGlobalRule(m, v) { 
        if(this.data.globalRules[m] !== v) {
            this.pushHistory();
            this.data.globalRules[m] = v; 
            this.save(); 
        }
    },
    renderGuide() {
        const c = document.getElementById('guideContent');
        const m = this.data.guideMode || 'mass';
        
        document.getElementById('btnG-mass').classList.toggle('active', m==='mass');
        document.getElementById('btnG-cut').classList.toggle('active', m==='cut');

        const list = this.data.guidelines[m];
        if(!list || list.length === 0) {
            c.innerHTML = '<div style="padding:20px; text-align:center; color:#666">Список порожній</div>';
            return;
        }

        const isEd = document.body.classList.contains('editing');
        const globalRule = this.data.globalRules ? (this.data.globalRules[m] || "") : "";
        
        c.innerHTML = `
        <div style="margin-bottom: 20px; background: rgba(255,255,255,0.02); border: 1px solid #333; border-radius: 12px; padding: 15px;">
            <div style="font-size: 0.7rem; color: var(--theme); font-weight: 800; text-transform: uppercase; margin-bottom: 8px;">📌 МЕХАНІКА ВАГ ТА ГЛОБАЛЬНІ ПРАВИЛА (${m.toUpperCase()}):</div>
            ${isEd ? 
                `<textarea class="modal-input" style="min-height:80px; padding:8px; font-size:0.8rem;" placeholder="Впишіть правила прогресії, темп тощо..." onblur="App.updateGlobalRule('${m}', this.value)">${globalRule}</textarea>` : 
                `<div style="font-size:0.8rem; color:#aaa; line-height:1.4; white-space: pre-wrap;">${globalRule || '<i style="color:#555">Немає глобальних правил. Натисніть Олівець, щоб додати.</i>'}</div>`
            }
        </div>
        <table class="guide-table">
            <thead>
                <tr>
                    <th style="width:40%">ВПРАВА</th>
                    <th>% / S / W</th>
                    <th>INFO</th>
                    ${isEd ? '<th>X</th>' : ''}
                </tr>
            </thead>
            <tbody>
                ${list.map((r, i) => `
                <tr>
                    <td>
                        ${isEd ? `<input class="modal-input" style="padding:4px" value="${r.n}" onblur="App.updateGuide('${m}',${i},'n',this.value)">` : `<strong style="color:#fff">${r.n}</strong>`}
                    </td>
                    <td>
                        <div style="margin-bottom:4px"><span style="color:var(--theme); font-weight:800">${r.p}</span> <span style="color:#666">|</span> ${r.s}</div>
                        ${isEd ? `<input class="modal-input" style="padding:4px; font-size:0.7rem" value="${r.w}" onblur="App.updateGuide('${m}',${i},'w',this.value)">` : `<div style="font-size:0.75rem; color:#888">${r.w}</div>`}
                    </td>
                    <td>
                        ${isEd ? `<textarea class="modal-input" style="padding:4px; min-height:40px" onblur="App.updateGuide('${m}',${i},'i',this.value)">${r.i}</textarea>` : `<span class="row-note">${r.i}</span>`}
                    </td>
                    ${isEd ? `<td style="vertical-align:middle; text-align:center"><span style="color:var(--danger); cursor:pointer" onclick="App.delGuideRow('${m}',${i})">✕</span></td>` : ''}
                </tr>
                `).join('')}
            </tbody>
        </table>
        ${isEd ? `<div class="btn-add" style="margin-top:10px" onclick="App.addGuideRow('${m}')">+ Додати рядок</div>` : ''}
        `;
    },
    
    addGuideRow(m) {
        this.pushHistory();
        this.data.guidelines[m].push({n:"", p:"", s:"", w:"", i:""});
        this.save(); this.renderGuide();
    },

   renderStats(forceIndex = null) {
        const allWeeks = this.data.weeks.map((w, idx) => ({ ...w, realIndex: idx }));

        if (allWeeks.length === 0) {
            const nav = document.getElementById('statsWeekNav');
            if(nav) nav.innerHTML = '';
            document.getElementById('statsContent').innerHTML = '<div style="text-align:center;color:#666;padding:40px;">Немає даних</div>'; 
            return;
        }

        if (this.currentStatsIdx === undefined) {
            this.currentStatsIdx = allWeeks[allWeeks.length - 1].realIndex;
        }
        if (forceIndex !== null) {
            this.currentStatsIdx = forceIndex;
        }

        const navHtml = allWeeks.map(w => {
            const isActive = w.realIndex === this.currentStatsIdx;
            const specialClass = w.prog === 'arms' ? 'is-arms' : '';
            return `
            <div class="week-btn ${isActive ? 'active' : ''} ${specialClass}" 
                 id="stats-btn-${w.realIndex}"
                 onclick="App.renderStats(${w.realIndex})">
                <span style="font-size:0.85rem; font-weight:800;">W ${w.num}</span>
                <small style="font-size:0.55rem; opacity:0.6; text-transform:uppercase;">${w.type}</small>
            </div>`;
        }).join('');
        
        const navEl = document.getElementById('statsWeekNav');
        if (navEl) {
            navEl.innerHTML = navHtml;
            // Автоматичний скрол до активної кнопки при завантаженні
            const activeBtn = document.getElementById(`stats-btn-${this.currentStatsIdx}`);
            if (activeBtn) activeBtn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }

        const currentWeek = this.data.weeks[this.currentStatsIdx];
        if (!currentWeek) return; 

        // ... далі твій код розрахунку статистики (stats = {} ...)
        // (Він у тебе правильний, не буду дублювати весь метод)
        
        // --- ТУТ МАЄ БУТИ ТВОЯ ЛОГІКА ЦИКЛУ currentWeek.days.forEach ---
        // (Яку ми писали в минулому повідомленні)
        this._executeStatsRender(currentWeek); 
    },

    // Допоміжний метод для чистоти
    _executeStatsRender(currentWeek) {
        const stats = {}; 
        Groups.forEach(g => stats[g] = { total: 0, ts: 0, bo: 0, ds: 0, norm: 0 });
        
        currentWeek.days.forEach(d => {
            d.exercises.forEach(ex => {
                const g = ex.g || ResolveGroup(ex.n);
                if (stats[g]) {
                    ex.sets.forEach(s => {
                        if (s.t !== 'WU') { 
                            stats[g].total++;
                            if (s.t === 'TS') stats[g].ts++;
                            else if (s.t === 'BO') stats[g].bo++;
                            else if (s.t === 'DS') stats[g].ds++;
                            else stats[g].norm++;
                        }
                    });
                }
            });
        });

        let html = '';
        for(const [k, obj] of Object.entries(stats)) {
            if(k === "Інше") continue;
            const target = this.data.targets[k] || 10; 
            const v = obj.total;
            const pct = Math.min(100, (v / target) * 100);
            let color = 'var(--theme)';
            if (v >= target && v <= target + 2) color = 'var(--success)';
            else if (v > target + 2) color = 'var(--danger)';

            let breakdownHtml = v > 0 ? `
                ${obj.ts > 0 ? `<span style="color:var(--danger)">🔥 TS: ${obj.ts}</span>` : ''}
                ${obj.bo > 0 ? `<span style="color:#3b82f6">💧 BO: ${obj.bo}</span>` : ''}
                ${obj.norm > 0 ? `<span style="color:#aaa">⚪ Base: ${obj.norm}</span>` : ''}
            ` : '<span style="color:#444">Відпочинок</span>';

            html += `
            <div class="stat-box-pro">
                <div class="stat-indicator" style="background:${color}"></div>
                <div class="stat-info">
                    <div class="stat-label-pro">${k}</div>
                    <div class="stat-breakdown">${breakdownHtml}</div>
                </div>
                <div class="stat-ring-wrapper" onclick="App.promptTarget('${k}', ${target})">
                    <div class="stat-ring" style="background: conic-gradient(${color} ${pct}%, #222 ${pct}% 100%);">
                        <div class="stat-ring-inner">
                            <span class="stat-val-pro">${v}</span>
                            <span class="stat-target-pro">/${target}</span>
                        </div>
                    </div>
                </div>
            </div>`;
        }
        document.getElementById('statsContent').innerHTML = html;
    },
    
    exportData() {
        this.state.export(this.data, "training_protocol.json");
    },
    
    importData(inp) {
        const r = new FileReader();
        r.onload = e => { 
            this.pushHistory(); this.data = JSON.parse(e.target.result); 
            this.save(); location.reload(); 
        };
        r.readAsText(inp.files[0]);
    },
    
    toggleFab(show) {
        const fab = document.getElementById('sys-fab');
        if(fab) fab.style.display = show ? 'flex' : 'none';
    }
};
// ЗАПОБІЖНИК: Гарантований запис при згортанні/закритті додатку
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && App.saveTimer) {
        clearTimeout(App.saveTimer);
        App.saveTimer = null;
        App.forceSave();
    }
});

window.addEventListener('beforeunload', () => {
    if (App.saveTimer) {
        clearTimeout(App.saveTimer);
        App.saveTimer = null;
        App.forceSave();
    }
});
document.addEventListener('DOMContentLoaded', () => App.init());
