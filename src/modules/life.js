import * as util from '../functions/util.js';
import * as fCondition from '../functions/condition.js';

import Property from './property.js';
import Event from './event.js';
import Talent from './talent.js';
import Achievement from './achievement.js';
import Character from './character.js';

class Life {
    constructor() {
        this.#property = new Property(this);
        this.#event = new Event(this);
        this.#talent = new Talent(this);
        this.#achievement = new Achievement(this);
        this.#character = new Character(this);
        
    }

    Module = {
        PROPERTY: 'PROPERTY',
        TALENT: 'TALENT',
        EVENT: 'EVENT',
        ACHIEVEMENT: 'ACHIEVEMENT',
        CHARACTER: 'CHARACTER',
    }

    Function = {
        CONDITION: 'CONDITION',
        UTIL: 'UTIL',
    }

    #property;
    #event;
    #talent;
    #achievement;
    #character;
    #triggerTalents;
    #defaultPropertyPoints;
    #talentSelectLimit;
    #propertyAllocateLimit;
    #defaultPropertys;
    #specialThanks;
    #initialData;

    async initial(i18nLoad, commonLoad) {
        const [age, talents, events, achievements, characters, specialThanks] = await Promise.all([
            i18nLoad('age'),
            i18nLoad('talents'),
            i18nLoad('events'),
            i18nLoad('achievement'),
            i18nLoad('character'),
            commonLoad('specialthanks'),
        ]);
        this.#specialThanks = specialThanks;

        const total = {
            [this.PropertyTypes.TACHV]: this.#achievement.initial({achievements}),
            [this.PropertyTypes.TEVT]: this.#event.initial({events}),
            [this.PropertyTypes.TTLT]: this.#talent.initial({talents}),
        };
        this.#property.initial({age, total});
        this.#character.initial({characters});
    }

    config({
        defaultPropertyPoints = 20, // default number of points for a property
        talentSelectLimit = 3, // max number of talents that can be selected
        propertyAllocateLimit = [0, 10], // scoop of properties that can be allocated
        defaultPropertys = {}, // default propertys
        talentConfig, // config for talent
        propertyConfig, // config for property
        characterConfig, // config for character
    } = {}) {
        this.#defaultPropertyPoints = defaultPropertyPoints;
        this.#talentSelectLimit = talentSelectLimit;
        this.#propertyAllocateLimit = propertyAllocateLimit;
        this.#defaultPropertys = defaultPropertys;
        this.#talent.config(talentConfig);
        this.#property.config(propertyConfig);
        this.#character.config(characterConfig);
    }

    request(module) {
        switch (module) {
            case this.Module.ACHIEVEMENT: return this.#achievement;
            case this.Module.CHARACTER: return this.#character;
            case this.Module.EVENT: return this.#event;
            case this.Module.PROPERTY: return this.#property;
            case this.Module.TALENT: return this.#talent;
            default: return null;
        }
    }

    function(type) {
        switch (type) {
            case this.Function.CONDITION: return fCondition;
            case this.Function.UTIL: return util;
        }
    }

    check(condition) {
        return fCondition.checkCondition(this.#property,condition);
    }

    clone(...args) {
        return util.clone(...args);
    }

    remake(talents) {
        this.#initialData = util.clone(this.#defaultPropertys);
        this.#initialData.TLT = util.clone(talents);
        this.#triggerTalents = {};
        return this.talentReplace(this.#initialData.TLT);
    }

    start(allocation) {
        for(const key in allocation) {
            this.#initialData[key] = util.clone(allocation[key]);
        }
        this.#property.restart(this.#initialData);
        this.doTalent()
        this.#property.restartLastStep();
        this.#achievement.achieve(this.AchievementOpportunity.START);
    }

    getPropertyPoints() {
        return this.#defaultPropertyPoints + this.#talent.allocationAddition(this.#initialData.TLT);
    }

    getTalentCurrentTriggerCount(talentId) {
        return this.#triggerTalents[talentId] || 0;
    }

    next() {
        const {age, event, talent} = this.#property.ageNext();

        const talentContent = this.doTalent(talent);
        const eventContent = this.doEvent(this.random(event));

        const isEnd = this.#property.isEnd();

        const content = [talentContent, eventContent].flat();
        this.#achievement.achieve(this.AchievementOpportunity.TRAJECTORY);
        return { age, content, isEnd };
    }

    talentReplace(talents) {
        const result = this.#talent.replace(talents);
        const contents = [];
        for(const id in result) {
            talents.push(result[id]);
            const source = this.#talent.get(id);
            const target = this.#talent.get(result[id]);
            contents.push({
                type: 'talentReplace',
                source, target
            });
        }
        return contents;
    }

    doTalent(talents) {
        if(talents) this.#property.change(this.PropertyTypes.TLT, talents);
        talents = this.#property.get(this.PropertyTypes.TLT)
            .filter(talentId => this.getTalentCurrentTriggerCount(talentId) < this.#talent.get(talentId).max_triggers);

        const contents = [];
        for(const talentId of talents) {
            const result = this.#talent.do(talentId);
            if(!result) continue;
            this.#triggerTalents[talentId] = this.getTalentCurrentTriggerCount(talentId) + 1;
            const { effect, name, description, grade } = result;
            contents.push({
                type: this.PropertyTypes.TLT,
                name,
                grade,
                description,
            })
            if(!effect) continue;
            this.#property.effect(effect);
        }
        return contents;
    }

    doEvent(eventId) {
        const eventResult = this.#event.do(eventId);
        
        // 如果是选择事件，返回特殊结构，等待UI处理
        if (eventResult.isChoice) {
            return [{
                type: this.PropertyTypes.EVT,
                description: eventResult.description,
                grade: eventResult.grade,
                isChoice: true,
                choices: eventResult.choices,
                eventId: eventId,// 记录事件ID用于后续处理
                image: eventResult.image
            }];
        }
        
        // 原有逻辑
        const { effect, next, description, postEvent, grade } = eventResult;
        this.#property.change(this.PropertyTypes.EVT, eventId);
        this.#property.effect(effect);
        const content = {
            type: this.PropertyTypes.EVT,
            description,
            postEvent,
            grade,
        }
        if(next) return [content, this.doEvent(next)].flat();
        return [content];
    }

    // 新增方法：处理玩家选择
  // 新增方法：处理玩家选择
processChoice(eventId, choiceIndex) {
    console.log(`处理选择事件 ${eventId}，选择索引: ${choiceIndex}`);
    
    const eventData = this.#event.get(eventId);
    
    console.log('🔍 processChoice 事件数据:', {
        effect1: eventData.effect1,
        effect2: eventData.effect2,
        effect3: eventData.effect3
    });
    
    // 记录应用前的属性值
    console.log('🔍 应用效果前的属性值:', this.#property.getPropertys());
    
    // 根据选择索引获取对应的效果对象
    const effectObjects = [
        eventData.effect1,
        eventData.effect2, 
        eventData.effect3
    ];
    
    const choiceTexts = [eventData.choice1, eventData.choice2, eventData.choice3].filter(text => text);
    
    if (choiceIndex < 0 || choiceIndex >= choiceTexts.length) {
        console.error(`无效的选择索引: ${choiceIndex}`);
        return [];
    }
    
    const selectedEffect = effectObjects[choiceIndex];
    
    console.log('🔍 选择的效果对象:', selectedEffect);
    
    // === 新增代码开始 ===
    // 将选项事件ID加入事件池（假设选项事件ID为原事件ID+1、+2、+3）
    const optionEventId = Number(eventId) + choiceIndex + 1;
    console.log(`🎯 将选项事件 ${optionEventId} 加入事件池`);
    this.#property.change(this.PropertyTypes.EVT, optionEventId);
    // === 新增代码结束 ===
    
    // 应用选择的效果
    if (selectedEffect) {
        // 构建效果字符串
        let effectString = "";
        const effects = [];
        
        if (selectedEffect.CHR !== undefined && selectedEffect.CHR !== null) {
            const sign = selectedEffect.CHR > 0 ? '+' : '';
            effects.push(`CHR${sign}${selectedEffect.CHR}`);
        }
        if (selectedEffect.INT !== undefined && selectedEffect.INT !== null) {
            const sign = selectedEffect.INT > 0 ? '+' : '';
            effects.push(`INT${sign}${selectedEffect.INT}`);
        }
        if (selectedEffect.STR !== undefined && selectedEffect.STR !== null) {
            const sign = selectedEffect.STR > 0 ? '+' : '';
            effects.push(`STR${sign}${selectedEffect.STR}`);
        }
        if (selectedEffect.MNY !== undefined && selectedEffect.MNY !== null) {
            const sign = selectedEffect.MNY > 0 ? '+' : '';
            effects.push(`MNY${sign}${selectedEffect.MNY}`);
        }
        if (selectedEffect.SPR !== undefined && selectedEffect.SPR !== null) {
            const sign = selectedEffect.SPR > 0 ? '+' : '';
            effects.push(`SPR${sign}${selectedEffect.SPR}`);
        }
        
        effectString = effects.join(',');
        console.log('🔍 构建的效果字符串:', effectString);
        
        // 应用效果
        this.#property.effect(effectString);
        
        // 记录应用后的属性值
        console.log('🔍 应用效果后的属性值:', this.#property.getPropertys());
    } else {
        console.log('❌ 选择的效果对象为空');
    }
    
    // 返回空数组，不在事件流中显示选择结果
    return [];
}
    random(events) {
        return util.weightRandom(
            events.filter(
                ([eventId])=>this.#event.check(eventId, this.#property)
            )
        );
    }

    talentRandom() {
        return this.#talent.talentRandom(
            this.lastExtendTalent,
            this.#getPropertys(
                this.PropertyTypes.TMS,
                this.PropertyTypes.CACHV,
            )
        );
    }

    characterRandom() {
        const characters = this.#character.random();
        const replaceTalent = v=>v.talent=v.talent.map(
            id=>this.#talent.get(id)
        );
        characters.normal.forEach(replaceTalent);
        if(characters.unique && characters.unique.talent)
            replaceTalent(characters.unique);
        return characters;
    }

    talentExtend(talentId) {
        this.#property.set(this.PropertyTypes.EXT, talentId);
    }

    exclude(talents, exclusive) {
        return this.#talent.exclude(talents, exclusive);
    }

    generateUnique() {
        this.#character.generateUnique();
    }

    #getJudges(...types) {
        return util.getListValuesMap(types.flat(), key => this.#property.judge(key));
    }

    #getPropertys(...types) {
        return util.getListValuesMap(types.flat(), key => this.#property.get(key));
    }

    get lastExtendTalent() {
        return this.#property.get(this.PropertyTypes.EXT);
    }

    get summary() {
        this.#achievement.achieve(this.AchievementOpportunity.SUMMARY);

        const pt = this.PropertyTypes;

        return this.#getJudges(pt.SUM,
            pt.HAGE, pt.HCHR, pt.HINT,
            pt.HSTR, pt.HMNY, pt.HSPR,
        );
    }

    get statistics() {
        const pt = this.PropertyTypes;

        return this.#getJudges( pt.TMS,
            pt.CACHV, pt.RTLT, pt.REVT,
        );
    }
    get achievements() {
        const ticks = {};
        this.#property
            .get(this.PropertyTypes.ACHV)
            .forEach(([id, tick]) => ticks[id] = tick);
        return this
            .#achievement
            .list(this.#property)
            .sort((
                {id: a, grade: ag, hide: ah},
                {id: b, grade: bg, hide: bh}
            )=>{
                a = ticks[a];
                b = ticks[b];
                if(a&&b) return b - a;
                if(!a&&!b) {
                    if(ah&&bh) return bg - ag;
                    if(ah) return 1;
                    if(bh) return -1;
                    return bg - ag;
                }
                if(!a) return 1;
                if(!b) return -1;
            });
    }

    get PropertyTypes() { return this.#property.TYPES; }
    get AchievementOpportunity() { return this.#achievement.Opportunity; }
    get talentSelectLimit() { return this.#talentSelectLimit; }
    get propertyAllocateLimit() { return util.clone(this.#propertyAllocateLimit); }

    get propertys() { return this.#property.getPropertys(); }
    get times() { return this.#property.get(this.PropertyTypes.TMS) || 0; }
    set times(v) {
        this.#property.set(this.PropertyTypes.TMS, v);
        this.#achievement.achieve(this.AchievementOpportunity.END);
    }
    get specialThanks() { return this.#specialThanks; }
}

export default Life;