class Event {
    constructor(system) {
        this.#system = system;
    }

    #system;
    #events;

    initial({events}) {
    
    this.#events = events;
    for(const id in events) {
        const event = events[id];
        if(!event.branch) continue;
        event.branch = event.branch.map(b=>{
            b = b.split(':');
            b[1] = Number(b[1]);
            return b;
        });
    }
    return this.count;
}

    get count() {
        return Object.keys(this.#events).length;
    }

    check(eventId) {
        try {
            const { include, exclude, NoRandom } = this.get(eventId);
            if(NoRandom) return false;
            if(exclude && this.#system.check(exclude)) return false;
            if(include) return this.#system.check(include);
            return true;
        } catch (error) {
            console.warn(`Error checking event ${eventId}:`, error);
            return false;
        }
    }

get(eventId) {
    const event = this.#events[eventId];
    if(!event) {
        console.warn(`[WARNING] No Event[${eventId}], using default event`);
        return {
            event: `政务工作推进 `,
            effect: "",
            age: 0,
            postEvent: "",
            include: "",
            exclude: "",
            NoRandom: false,
            branch: null,
            grade: 0,
            choice1: "", choice2: "", choice3: "",
            effect1: "", effect2: "", effect3: "",
            postEvent1: "", postEvent2: "", postEvent3: "",
            result1: "", result2: "", result3: "",
            image: ""
        };
    }
    
    return this.#system.clone(event);
}

    information(eventId) {
        const { event: description } = this.get(eventId)
        return { description };
    }

   do(eventId) {
    const eventData = this.get(eventId);
    
    if (!eventData) {
        console.error(`❌ 事件 ${eventId} 数据不存在`);
        return { description: `事件 ${eventId} 数据错误`, grade: 0 };
    }
    
    console.log('🔍 Event.do() effect对象数据:', {
        effect1: eventData.effect1,
        effect2: eventData.effect2,
        effect3: eventData.effect3
    });
    
    const { 
        effect, branch, event: description, postEvent, grade,
        choice1, choice2, choice3,
        effect1, effect2, effect3,  // 这些是对象
        image,
        result1, result2, result3
    } = eventData;
    
    const hasChoices = choice1 || choice2 || choice3;
    
    if (hasChoices) {
        // 将effect对象转换为字符串
        const effect1Str = this.effectObjectToString(effect1);
        const effect2Str = this.effectObjectToString(effect2);
        const effect3Str = this.effectObjectToString(effect3);
        
        console.log('🔍 转换后的effect字符串:', {
            effect1: effect1Str,
            effect2: effect2Str,
            effect3: effect3Str
        });
        
        const result = {
            effect,
            description, 
            grade,
            isChoice: true,
            choices: [
                { 
                    text: choice1, 
                    effect: effect1Str,
                    postEvent: "",
                    result: result1
                },
                { 
                    text: choice2, 
                    effect: effect2Str,
                    postEvent: "",
                    result: result2
                },
                { 
                    text: choice3, 
                    effect: effect3Str,
                    postEvent: "",
                    result: result3
                }
            ].filter(choice => choice.text),
            image: image,
            eventId: eventId
        };
        
        return result;
    }
    
    if(branch)
        for(const [cond, next] of branch)
            if(this.#system.check(cond))
                return { effect, next, description, grade };
                
    return { effect, postEvent, description, grade };
}

// 新增方法：将effect对象转换为字符串
// 修改方法：将effect对象转换为字符串，为正数添加加号
effectObjectToString(effectObj) {
    if (!effectObj) return "";
    
    const effects = [];
    
    // 检查每个属性是否存在
    if (effectObj.CHR !== undefined && effectObj.CHR !== null && effectObj.CHR !== 0) {
        const sign = effectObj.CHR > 0 ? '+' : '';
        effects.push(`CHR${sign}${effectObj.CHR}`);
    }
    if (effectObj.INT !== undefined && effectObj.INT !== null && effectObj.INT !== 0) {
        const sign = effectObj.INT > 0 ? '+' : '';
        effects.push(`INT${sign}${effectObj.INT}`);
    }
    if (effectObj.STR !== undefined && effectObj.STR !== null && effectObj.STR !== 0) {
        const sign = effectObj.STR > 0 ? '+' : '';
        effects.push(`STR${sign}${effectObj.STR}`);
    }
    if (effectObj.MNY !== undefined && effectObj.MNY !== null && effectObj.MNY !== 0) {
        const sign = effectObj.MNY > 0 ? '+' : '';
        effects.push(`MNY${sign}${effectObj.MNY}`);
    }
    if (effectObj.SPR !== undefined && effectObj.SPR !== null && effectObj.SPR !== 0) {
        const sign = effectObj.SPR > 0 ? '+' : '';
        effects.push(`SPR${sign}${effectObj.SPR}`);
    }
    
    return effects.join(',');
}
}

export default Event;