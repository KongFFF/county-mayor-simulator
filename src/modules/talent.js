class Talent {
    constructor(system) {
        this.#system = system;
    }

    #system;
    #talents;
    #talentPullCount;
    #talentRate;
    #additions;

    initial({talents}) {
        this.#talents = talents;
        const emt = this.#system.function(this.#system.Function.CONDITION).extractMaxTriggers;
        for(const id in talents) {
            const talent = talents[id];
            talent.id= Number(id);
            talent.grade = Number(talent.grade);
            talent.max_triggers = emt(talent.condition);
            if(talent.replacement) {
                for(let key in talent.replacement) {
                    const obj = {};
                    for(let value of talent.replacement[key]) {
                        value = `${value}`.split('*');
                        obj[value[0]||0] = Number(value[1]) || 1;
                    }
                    talent.replacement[key] = obj;
                }
            }
        }
        return this.count;
    }

    get count() {
        return Object.keys(this.#talents).length;
    }

    get #prop() {
        return this.#system.request(this.#system.Module.PROPERTY);
    }

    config({
        talentPullCount = 10, // number of talents to pull from the talent pool
        talentRate = { 1:100, 2:10, 3:1, total: 1000 }, // rate of talent pull
        additions = {}, // additional additions
    } = {}) {
        this.#talentPullCount = talentPullCount;
        this.#talentRate = talentRate;
        this.#additions = additions;
    }


    check(talentId) {
        const { condition } = this.get(talentId);
        return this.#system.check(this.#prop, condition);
    }

    get(talentId) {
        const talent = this.#talents[talentId];
        if(!talent) throw new Error(`[ERROR] No Talent[${talentId}]`);
        return this.#system.clone(talent);
    }

    information(talentId) {
        const { grade, name, description } = this.get(talentId)
        return { grade, name, description };
    }

    exclude(talents, excludeId) {
        const { exclude } = this.get(excludeId);
        for(const talent of talents) {
            if(exclude) {
                for(const e of exclude) {
                    if(talent == e) return talent;
                }
            }
            const excludeReverse = this.get(talent).exclude;
            if(excludeReverse) {
                for (const e of excludeReverse) {
                    if (excludeId == e) return talent
                }
            }
        }
        return null;
    }

    getAddition(type, value) {
        if(!this.#additions[type]) return {};
        for(const [min, addition] of this.#additions[type]) {
            if(value >= min) return addition;
        }
        return {};
    }

    getRate(additionValues = {}) {
        const rate = this.#system.clone(this.#talentRate);
        const addition = { 1:1, 2:1, 3:1, };

        Object.keys(additionValues).forEach(key => {
            const addi = this.getAddition(key, additionValues[key])
            for(const grade in addi)
                addition[grade] += addi[grade];
        });

        for(const grade in addition)
            rate[grade] *= addition[grade];

        return rate;
    }

    talentRandom(include, additionValues) {
    const rate = this.getRate(additionValues);

    const randomGrade = () => {
        let randomNumber = Math.floor(Math.random() * rate.total);
        if((randomNumber -= rate[3]) < 0) return 3;
        if((randomNumber -= rate[2]) < 0) return 2;
        if((randomNumber -  rate[1]) < 0) return 1;
        return 0;
    }

    const talentList = {};
    
    // 先初始化所有可能的等级
    for(let i = 0; i <= 3; i++) {
        talentList[i] = [];
    }
    
    // 填充天赋数据
    for(const talentId in this.#talents) {
        const talent = this.#talents[talentId];
        // 确保必需的字段存在
        if(!talent || talent.exclusive) continue;
        
        const { id, grade, name, description } = talent;
        // 确保grade在有效范围内
        const validGrade = (grade >= 0 && grade <= 3) ? grade : 0;
        
        if(id == include) {
            include = { grade: validGrade, name, description, id };
            continue;
        }
        
        // 安全地添加到对应等级列表
        talentList[validGrade].push({ grade: validGrade, name, description, id });
    }

    return new Array(this.#talentPullCount)
        .fill(1).map((v, i)=>{
            if(!i && include) return include;
            
            let grade = randomGrade();
            // 安全地查找可用的等级
            let attempts = 0;
            while(attempts < 10) { // 防止无限循环
                if(talentList[grade] && talentList[grade].length > 0) {
                    break;
                }
                grade--;
                if(grade < 0) grade = 3; // 循环回最高等级
                attempts++;
            }
            
            // 如果还是找不到可用的天赋，返回默认值
            if(!talentList[grade] || talentList[grade].length === 0) {
                console.warn('No talents available for grade:', grade);
                return { 
                    grade: 0, 
                    name: "基础政策", 
                    description: "基本的政策执行能力", 
                    id: 9999 
                };
            }
            
            const length = talentList[grade].length;
            const random = Math.floor(Math.random() * length) % length;
            return talentList[grade].splice(random, 1)[0];
        });
    }

    random(count) {
        const talents = Object
            .keys(this.#talents)
            .filter(id=>!this.#talents[id].exclusive);
        return new Array(count)
            .fill(1)
            .map(()=>talents.splice(
                    Math.floor(Math.random()*talents.length)%talents.length,
                    1
                )[0]
            );
    }

    allocationAddition(talents) {
        if(Array.isArray(talents)) {
            let addition = 0;
            for(const talent of talents)
                addition += this.allocationAddition(talent);
            return addition;
        }
        return Number(this.get(talents).status) || 0;
    }

    do(talentId) {
        const { effect, condition, grade, name, description } = this.get(talentId);
        if(condition && !this.#system.check(condition))
            return null;
        return { effect, grade, name, description };
    }

    replace(talents) {
        const getReplaceList = (talent, talents) => {
            const { replacement } = this.get(talent);
            if(!replacement) return null;
            const list = [];
            if(replacement.grade) {
                this.forEach(({id, grade, exclusive})=>{
                    if(exclusive) return;
                    if(!replacement.grade[grade]) return;
                    if(this.exclude(talents, id)) return;
                    list.push([id, replacement.grade[grade]]);
                })
            }
            if(replacement.talent) {
                for(let id in replacement.talent) {
                    id = Number(id);
                    if(this.exclude(talents, id)) continue;
                    list.push([id, replacement.talent[id]]);
                }
            }
            return list;
        }

        const wr = this.#system.function(this.#system.Function.UTIL).weightRandom;
        const replace = (talent, talents) => {
            const replaceList = getReplaceList(talent, talents);
            if(!replaceList) return talent;
            const rand = wr(replaceList);
            return replace(
                rand, talents.concat(rand)
            );
        }

        const newTalents = this.#system.clone(talents);
        const result = {};
        for(const talent of talents) {
            const replaceId = replace(talent, newTalents);
            if(replaceId != talent) {
                result[talent] = replaceId;
                newTalents.push(replaceId);
            }
        }
        return result;
    }

    forEach(callback) {
        if(typeof callback != 'function') return;
        for(const id in this.#talents)
            callback(this.#system.clone(this.#talents[id]), id);
    }

}

export default Talent;