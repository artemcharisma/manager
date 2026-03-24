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
            {n:"Згинання гантелей сидячи (інклайн)", p:"65-75%", s:"3x10-15", w:"легка вага 1×12", i:"roztyag bitsepsa"},
            {n:"Французький жим лежачи", p:"70-75%", s:"3x8-12", w:"гриф 1x15, 50% 1x10", i:"likti do steli"},
            {n:"Розгинання з-за голови", p:"65-70%", s:"3x10-15", w:"легка вага 1x15", i:"aktsent na dovhu golivku"}
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

    init() {
        this.data = this.state.init();

        if(!this.data.targets) this.data.targets = JSON.parse(JSON.stringify(InitialData.targets));
        if(!this.data.guidelines) this.data.guidelines = JSON.parse(JSON.stringify(InitialData.guidelines));
        if(!this.data.exBank) this.data.exBank = [];
        if(!this.data.opened) this.data.opened = {}; 
        
        window.addEventListener('scroll', () => {
            const btn = document.getElementById('scrollTopBtn');
            if(btn) {
                if (window.scrollY > 300) btn.classList.add('visible');
                else btn.classList.remove('visible');
            }
        });

        // НОВЕ: Закриваємо випадаючі списки при кліку в пусте місце екрану
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
            if(await Modal.confirm("⚠ HARD RESET?<br>Це знищить усі дані тренувань.", "УВАГА", "red")) {
                localStorage.removeItem('training_protocol');
                location.reload();
            }
        };


        if(!this.data.currentProgram) this.data.currentProgram = 'balanced';
        this.setTheme(this.data.currentProgram);
        this.updateBank();
        this.render();
        this.save();
        this.initTimer();
    },

    // --- ЛОГІКА КАСТОМНИХ СПИСКІВ ---
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
    },
    
    selectEx(val, w, d, e) {
        const inp = document.getElementById(`ex-${w}-${d}-${e}`);
        if (inp) {
            inp.value = val;
            this.updateEx(w, d, e, 'n', val); 
        }
        document.getElementById(`list-${w}-${d}-${e}`).style.display = 'none';
    },

    // --- РОЗГОРТАННЯ БЕЗ ПЕРЕМАЛЬОВКИ ---
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

    getGhostData(exerciseName, currentWNum, currentDIdx) {
        if (!exerciseName || !this.data.weeks) return null;
        
        // Знаходимо реальний індекс поточного тижня в масиві
        const currentWeekIndex = this.data.weeks.findIndex(w => w.num === currentWNum && w.prog === this.data.currentProgram);
        if (currentWeekIndex === -1) return null;

        // Йдемо назад від поточного тижня до найпершого
        for (let wIdx = currentWeekIndex; wIdx >= 0; wIdx--) {
            const week = this.data.weeks[wIdx];
            
            // Якщо це поточний тиждень, шукаємо тільки до вчорашнього дня (currentDIdx - 1)
            // Якщо це минулий тиждень, перевіряємо всі дні з кінця (6, 5, 4...)
            let startDayIdx = (wIdx === currentWeekIndex) ? currentDIdx - 1 : week.days.length - 1;
            
            for (let dIdx = startDayIdx; dIdx >= 0; dIdx--) {
                const day = week.days[dIdx];
                if (day && day.exercises) {
                    // Шукаємо вправу з такою ж назвою
                    const pastEx = day.exercises.find(
                        e => e.n && e.n.trim().toLowerCase() === exerciseName.trim().toLowerCase()
                    );
                    
                    if (pastEx && pastEx.sets && pastEx.sets.length > 0) {
                        return pastEx.sets; // Повертаємо підходи
                    }
                }
            }
        }
        return null;
    },
    getEstimated1RM(exerciseName, currentWNum, currentDIdx) {
        if (!exerciseName || !this.data.weeks) return 0;
        let max1RM = 0;
        const currentProg = this.data.currentProgram;

        this.data.weeks.forEach(week => {
            // Шукаємо тільки в поточній програмі і тільки в минулому
            if (week.prog !== currentProg) return;
            if (week.num > currentWNum) return;

            week.days.forEach((day, dIdx) => {
                // Не дивимось у майбутні дні поточного тижня
                if (week.num === currentWNum && dIdx >= currentDIdx) return;
                
                if (day.exercises) {
                    const pastEx = day.exercises.find(e => e.n && e.n.trim().toLowerCase() === exerciseName.trim().toLowerCase());
                    if (pastEx && pastEx.sets) {
                        pastEx.sets.forEach(set => {
                            const w = parseFloat(set.w) || 0;
                            const r = parseFloat(set.r) || 0;
                            if (w > 0 && r > 0) {
                                // Формула Еплі для 1RM
                                const oneRm = w * (1 + r / 30);
                                if (oneRm > max1RM) max1RM = oneRm;
                            }
                        });
                    }
                }
            });
        });
        return Math.round(max1RM);
    },
    
    render() {
        const c = document.getElementById('scheduleList');
        const nav = document.getElementById('weekNav');
        const isEd = document.body.classList.contains('editing');
        const prog = this.data.currentProgram;

        document.querySelectorAll('.prog-opt').forEach(el => el.classList.remove('active'));
        const progBtn = document.getElementById(`prog-${prog}`);
        if(progBtn) progBtn.classList.add('active');

        const filteredWeeks = this.data.weeks.filter(w => w.prog === prog);

        // КНОПКИ ЗАВЖДИ НА ВИДНОТІ
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

                        // --- GHOST DATA (ПІДКАЗКИ) ---
                        // Отримуємо історію для цієї вправи, передаючи поточний тиждень та день
                        const ghostSets = App.getGhostData(ex.n, week.num, dIdx);

                        const setsHtml = ex.sets.map((s, sIdx) => {
                            if (m === 't') {
                                return `<div class="set-row"><div class="set-num">${sIdx+1}</div><div class="set-part"><input class="set-input" type="number" inputmode="decimal" style="width:50px; text-align:center" value="${s.r||''}" onblur="App.updateSet(${realWIdx},${dIdx},${eIdx},${sIdx},'r',this.value)"><span class="set-unit">час</span></div></div>`;
                            }

                            // Шукаємо дані минулого разу для цього конкретного підходу
                            let ghostW = (ghostSets && ghostSets[sIdx] && ghostSets[sIdx].w) ? ghostSets[sIdx].w : '';
                            let ghostR = (ghostSets && ghostSets[sIdx] && ghostSets[sIdx].r) ? ghostSets[sIdx].r : '';

                            // Формуємо плейсхолдери (або старі дані, або просто кг/раз)
                            let placeholderW = ghostW ? `placeholder="${ghostW}"` : ``;
                            let placeholderR = ghostR ? `placeholder="${ghostR}"` : ``;

                            return `<div class="set-row">
                                <div class="set-num">${sIdx+1}</div>
                                <div class="set-part">
                                    <input class="set-input w-val" type="text" inputmode="text" ${placeholderW} value="${s.w||''}" onblur="App.updateSet(${realWIdx},${dIdx},${eIdx},${sIdx},'w',this.value)">
                                    <span class="set-unit">кг</span>
                                </div>
                                <div class="set-part">
                                    <input class="set-input" type="number" inputmode="decimal" ${placeholderR} value="${s.r||''}" onblur="App.updateSet(${realWIdx},${dIdx},${eIdx},${sIdx},'r',this.value)">
                                    <span class="set-unit">x</span>
                                </div>
                            </div>`;
                        }).join('');

                        const groupSelect = isEd ? `<select class="group-select" onchange="App.updateEx(${realWIdx},${dIdx},${eIdx},'g',this.value)">${Groups.map(g => `<option value="${g}" ${ex.g===g?'selected':''}>${g}</option>`).join('')}</select>` : `<span class="ex-badge group">${ex.g || ResolveGroup(ex.n)}</span>`;
                        
                        return `<div class="exercise">
                            ${isEd ? `<div class="ex-del" onclick="App.delEx(${realWIdx},${dIdx},${eIdx})">✕</div>` : ''}
                            <div class="ex-info">
                                <div class="ex-name-row">
                                    ${isEd ? `
                                    <div style="position:relative; flex:1; margin-right:10px;">
                                        <input class="ex-name-input" id="ex-${realWIdx}-${dIdx}-${eIdx}" autocomplete="off" value="${ex.n}" 
                                               onfocus="App.openExList(${realWIdx}, ${dIdx}, ${eIdx})" 
                                               oninput="App.filterExList(this.value, ${realWIdx}, ${dIdx}, ${eIdx})" 
                                               onblur="setTimeout(() => App.updateEx(${realWIdx},${dIdx},${eIdx},'n',document.getElementById('ex-${realWIdx}-${dIdx}-${eIdx}').value), 200)">
                                        <div id="list-${realWIdx}-${dIdx}-${eIdx}" class="custom-dropdown" style="display:none; position:absolute; top:calc(100% + 4px); left:0; width:100%; background:#1a1a1a; border:1px solid #444; border-radius:8px; max-height:200px; overflow-y:auto; z-index:9999; box-shadow:0 10px 30px rgba(0,0,0,0.9);"></div>
                                    </div>
                                    ` : 
                                    // Якщо назви немає - відображається "Вправа" сірим
                                    `<span class="ex-name">${ex.n || '<span style="color:#555;font-size:0.8rem">Вправа</span>'}</span>`}
                                    ${groupSelect}
                                </div>
                                <div class="edit-ui">
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

                return `<div id="week-${week.id}" class="${theme}">
                    <div style="padding:10px 0; display:flex; justify-content:space-between; align-items:center">
                        <div><h3 style="margin:0; color:#fff">ТИЖДЕНЬ ${week.num} <span style="font-size:0.8rem; color:var(--${week.type})">// ${week.type.toUpperCase()}</span></h3></div>
                        <span class="edit-ui" style="color:var(--danger); cursor:pointer" onclick="App.delWeek(${week.id})">Видалити</span>
                    </div>
                    <div class="days-list">${daysHtml}</div>
                </div><hr style="border:0; border-top:1px dashed #333; margin:30px 0">`;
            }).join('');
        }
        
        this.renderGuide();

    },

    save() { this.state.save(this.data); },
    
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
        // datalist прибрано, тепер він не потрібен
    },

    openBank() {
        this.toggleFab(false);
        const list = document.getElementById('bankList');
        list.innerHTML = this.data.exBank.map(n => `<div class="bank-item"><span>${n}</span><span class="bank-del" onclick="App.deleteFromBank('${n}')">✕</span></div>`).join('');
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

    // --- REST TIMER (ТАЙМЕР ВІДПОЧИНКУ) ---
    initTimer() {
        const t = document.createElement('div');
        t.id = 'rest-timer';
        // Стилізуємо як плаваючу пігулку
        t.style.cssText = `
            position: fixed; bottom: 85px; left: 50%; transform: translateX(-50%);
            background: rgba(26, 26, 26, 0.85); border: 1px solid var(--theme, #d4af37);
            color: var(--theme, #d4af37); padding: 8px 20px; border-radius: 30px;
            font-family: monospace; font-size: 1.4rem; font-weight: bold;
            box-shadow: 0 4px 15px rgba(0,0,0,0.6); cursor: pointer; z-index: 999;
            transition: all 0.3s ease; display: flex; align-items: center; justify-content: center;
            backdrop-filter: blur(8px); user-select: none; touch-action: manipulation; min-width: 120px;
        `;
        
        // Надійний кастомний "подвійний клік", який працює на iOS
        let lastTap = 0;
        t.onclick = (e) => {
            e.preventDefault();
            const now = Date.now();
            if (now - lastTap < 400) {
                // Подвійний тап (менше 400 мілісекунд між кліками)
                this.setTimerDefault();
                lastTap = 0; 
            } else {
                // Одинарний тап
                this.toggleTimer();
                lastTap = now;
            }
        };

        document.body.appendChild(t);
        this.timerState.el = t;
        
        // Відновлюємо збережений час (якщо є)
        const savedTime = localStorage.getItem('rest_timer_default');
        if (savedTime) this.timerState.default = parseInt(savedTime);
        
        this.updateTimerUI();
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
        
        // ЗАПАМ'ЯТОВУЄМО ТОЧНИЙ ЧАС ЗАВЕРШЕННЯ
        this.timerState.endTime = Date.now() + (seconds * 1000);
        
        // Запитуємо дозвіл на системні сповіщення
        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission();
        }
        
        // Дизайн (активний)
        this.timerState.el.style.background = 'var(--theme, #d4af37)';
        this.timerState.el.style.color = '#000';
        this.timerState.el.style.boxShadow = '0 0 20px var(--theme, #d4af37)';
        
        this.updateTimerUI();
        if (window.Haptics) window.Haptics.light();

        // Перевіряємо час кожні 250мс
        this.timerState.interval = setInterval(() => {
            const now = Date.now();
            this.timerState.left = Math.ceil((this.timerState.endTime - now) / 1000);
            
            this.updateTimerUI();

            if (this.timerState.left <= 0) {
                this.stopTimer();
                this.timerState.el.innerHTML = "🔥 ГОТОВИЙ!";
                
                // --- СИСТЕМНЕ СПОВІЩЕННЯ ---
                if ("Notification" in window && Notification.permission === "granted") {
                    new Notification("Час вийшов!", {
                        body: "Пора робити наступний підхід",
                        icon: "icon.png", 
                        vibrate: [200, 100, 200]
                    });
                }
                
                // Тільки вібрація
                if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 400]);
                if (window.Haptics) window.Haptics.heavy();
                
                setTimeout(() => this.updateTimerUI(), 4000);
            }
        }, 250); 
    },

    stopTimer() {
        clearInterval(this.timerState.interval);
        this.timerState.interval = null;
        this.timerState.endTime = null; // Очищаємо час
        
        this.timerState.el.style.background = 'rgba(26, 26, 26, 0.85)';
        this.timerState.el.style.color = 'var(--theme, #d4af37)';
        this.timerState.el.style.boxShadow = '0 4px 15px rgba(0,0,0,0.6)';
        
        this.timerState.left = this.timerState.default;
        this.updateTimerUI();
    },

    updateTimerUI() {
        if (!this.timerState.el) return;
        const timeToFormat = this.timerState.interval ? this.timerState.left : this.timerState.default;
        
        const m = Math.floor(timeToFormat / 60).toString().padStart(2, '0');
        const s = (timeToFormat % 60).toString().padStart(2, '0');
        
        if (this.timerState.interval) {
            this.timerState.el.innerHTML = `⏳ ${m}:${s}`;
        } else {
            this.timerState.el.innerHTML = `⏱ ${m}:${s}`;
        }
    },

    async setTimerDefault() {
        this.stopTimer();
        const val = await Modal.prompt("Введіть час відпочинку (в секундах):<br>Наприклад: 90 (1.5 хв) або 120 (2 хв)", "НАЛАШТУВАННЯ ТАЙМЕРА", this.timerState.default);
        if (val && !isNaN(val)) {
            const newTime = parseInt(val);
            this.timerState.default = newTime;
            localStorage.setItem('rest_timer_default', newTime); 
            this.updateTimerUI();
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


    addWeek(type, init=false) {
        if (!init) this.pushHistory(); 
        
        const prog = this.data.currentProgram || 'balanced';
        let newData;
        
        const lastWeek = [...this.data.weeks].reverse().find(w => w.type === type && w.prog === prog);
        if(lastWeek && !init) {
            newData = JSON.parse(JSON.stringify(lastWeek.days));
            newData.forEach(d => {
                d.note = "";
                d.exercises.forEach(ex => { ex.sets.forEach(s => { s.w=""; s.r=""; s.d=""; }); });
            });
        } else {
            newData = JSON.parse(JSON.stringify(Templates[prog][type]));
        }
        const w = { id: Date.now(), type, prog, num: this.data.weeks.length + 1, days: newData };
        this.data.weeks.push(w);
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

    updateSet(w, d, e, s, f, val) {
        let finalVal = val;
        let needRender = false;

        // --- АВТОРОЗРАХУНОК ВІДСОТКІВ ВІД 1RM ---
        if (f === 'w' && typeof val === 'string' && (val.includes('%') || val.toLowerCase().includes('p'))) {
            const percent = parseFloat(val);
            if (!isNaN(percent) && percent > 0) {
                const exName = this.data.weeks[w].days[d].exercises[e].n;
                const wNum = this.data.weeks[w].num;
                const e1RM = this.getEstimated1RM(exName, wNum, d);
                
                if (e1RM > 0) {
                    const calcWeight = e1RM * (percent / 100);
                    // Округлення до стандартного кроку 2.5 кг (млинці по 1.25кг)
                    finalVal = (Math.round(calcWeight / 2.5) * 2.5).toString();
                    
                    const toast = document.createElement('div');
                    toast.innerText = `🎯 1RM: ${e1RM}кг. ${percent}% = ${finalVal}кг`;
                    toast.style.cssText = "position:fixed; bottom:90px; left:50%; transform:translateX(-50%); background:var(--success); color:#fff; padding:10px 20px; border-radius:20px; z-index:9999; font-weight:bold; box-shadow: 0 4px 15px rgba(0,0,0,0.5);";
                    document.body.appendChild(toast);
                    setTimeout(() => toast.remove(), 4000);
                    
                    needRender = true;
                } else {
                    const toast = document.createElement('div');
                    toast.innerText = `⚠️ Немає історії підходів для "${exName}"`;
                    toast.style.cssText = "position:fixed; bottom:90px; left:50%; transform:translateX(-50%); background:var(--danger); color:#fff; padding:10px 20px; border-radius:20px; z-index:9999; font-weight:bold;";
                    document.body.appendChild(toast);
                    setTimeout(() => toast.remove(), 3000);
                    finalVal = ""; // Очищаємо, якщо не вийшло порахувати
                    needRender = true;
                }
            }
        }

        // Стандартне збереження
        if(this.data.weeks[w].days[d].exercises[e].sets[s][f] !== finalVal) {
            this.pushHistory();
            this.data.weeks[w].days[d].exercises[e].sets[s][f] = finalVal;
            this.save();
            // Перемальовуємо UI тільки якщо ми змінили значення на відсотки
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
        document.body.classList.toggle('editing');
        document.getElementById('editBtn').classList.toggle('active');
        this.render(); this.renderGuide();
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
        
        c.innerHTML = `
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

   renderStats() {
        const sel = document.getElementById('statsWeekSelect');
        const allWeeks = this.data.weeks.map((w, idx) => ({ ...w, realIndex: idx }));

        if (sel.innerHTML === "" || sel.options.length !== allWeeks.length) {
            sel.innerHTML = allWeeks.map(w => {
                const progLabel = w.prog === 'arms' ? '[ARMS]' : '[BALANCED]';
                return `<option value="${w.realIndex}">Тиждень ${w.num} (${w.type.toUpperCase()}) ${progLabel}</option>`;
            }).join('');
            
            if (allWeeks.length > 0) {
                sel.value = allWeeks[allWeeks.length - 1].realIndex;
            }
        }

        const wIdx = sel.value; 
        const currentWeek = this.data.weeks[wIdx];
        
        if (!currentWeek) { 
            document.getElementById('statsContent').innerHTML = '<div style="text-align:center;color:#666;padding:20px;">Немає даних</div>'; 
            return; 
        }
        
        const stats = {}; 
        Groups.forEach(g => stats[g] = 0);
        
        currentWeek.days.forEach(d => {
            d.exercises.forEach(ex => {
                const g = ex.g || ResolveGroup(ex.n);
                if (stats[g] !== undefined) stats[g] += ex.sets.length;
            });
        });

        let html = '';
        for(const [k,v] of Object.entries(stats)) {
            if(k === "Інше") continue;
            const target = this.data.targets[k] || 10; 
            const pct = Math.min(100, (v / target) * 100);
            
            let color = 'var(--mass)';
            if (v >= target) color = 'var(--success)';
            if (v > target * 1.5) color = 'var(--danger)';

            html += `<div class="stat-box">
                <div class="stat-header-row">
                    <span class="stat-label">${k}</span>
                    <input class="stat-target-input" value="${target}" onchange="App.updateTarget('${k}', this.value)">
                </div>
                <span class="stat-val">${v} <span style="font-size:0.8rem; color:#666">/ ${target}</span></span>
                <div class="stat-bar-bg"><div class="stat-bar-fill" style="width:${pct}%; background:${color}"></div></div>
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

document.addEventListener('DOMContentLoaded', () => App.init());
