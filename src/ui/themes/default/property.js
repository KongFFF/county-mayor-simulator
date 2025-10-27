export default class Property extends ui.view.DefaultTheme.PropertyUI {
    constructor() {
        super();

        const types =
        this.#types = core.PropertyTypes;

        this.btnCharmIncrease.on(Laya.Event.CLICK, this, this.onPropertyAllocate, [types.CHR, 1]);
        this.btnCharmReduce.on(Laya.Event.CLICK, this, this.onPropertyAllocate, [types.CHR, -1]);

        this.btnIntelligenceIncrease.on(Laya.Event.CLICK, this, this.onPropertyAllocate, [types.INT, 1]);
        this.btnIntelligenceReduce.on(Laya.Event.CLICK, this, this.onPropertyAllocate, [types.INT, -1]);

        this.btnStrengthIncrease.on(Laya.Event.CLICK, this, this.onPropertyAllocate, [types.STR, 1]);
        this.btnStrengthReduce.on(Laya.Event.CLICK, this, this.onPropertyAllocate, [types.STR, -1]);

        this.btnMoneyIncrease.on(Laya.Event.CLICK, this, this.onPropertyAllocate, [types.MNY, 1]);
        this.btnMoneyReduce.on(Laya.Event.CLICK, this, this.onPropertyAllocate, [types.MNY, -1]);

        this.inputCharm.on(Laya.Event.INPUT, this, this.onPropertyAllocateInput, [types.CHR]);
        this.inputIntelligence.on(Laya.Event.INPUT, this, this.onPropertyAllocateInput, [types.INT]);
        this.inputStrength.on(Laya.Event.INPUT, this, this.onPropertyAllocateInput, [types.STR]);
        this.inputMoney.on(Laya.Event.INPUT, this, this.onPropertyAllocateInput, [types.MNY]);

        const selectAll = ({currentTarget: item}) => { item.text=''; };
        this.inputCharm.on(Laya.Event.MOUSE_DOWN, this, selectAll);
        this.inputIntelligence.on(Laya.Event.MOUSE_DOWN, this, selectAll);
        this.inputStrength.on(Laya.Event.MOUSE_DOWN, this, selectAll);
        this.inputMoney.on(Laya.Event.MOUSE_DOWN, this, selectAll);

        this.btnRandomAllocate.on(Laya.Event.CLICK, this, this.random);
        this.btnNext.on(Laya.Event.CLICK, this, this.next);

        this.listSelectedTalents.renderHandler = Laya.Handler.create(this, this.renderTalent, null, false);
    }

    #types;
    #propertyPoints;
    #propertyAllocate;
    #propertyAllocateLimit;

    init({talents}) {
        this.listSelectedTalents.array = talents;
        const replace = core.remake(talents.map(talent => talent.id));
        if(replace.length > 0) {
            $$event('message', [replace.map(v => ['F_TalentReplace', v])]);
        }
        this.#propertyPoints = core.getPropertyPoints();
        this.#propertyAllocateLimit = core.propertyAllocateLimit;
        this.labLeftPropertyPoint.text = this.#propertyPoints;
        this.#propertyAllocate = {
            [this.#types.CHR]: 0,
            [this.#types.INT]: 0,
            [this.#types.STR]: 0,
            [this.#types.MNY]: 0,
        }
        this.updateAllocate();
    }

    next() {
        const left = this.#propertyPoints - this.total;
        if (left > 0) {
            return $$event('message', ['F_PropertyPointLeft', left]);
        }
        $ui.switchView(
            UI.pages.TRAJECTORY,
            {
                propertyAllocate: this.#propertyAllocate,
                talents: this.listSelectedTalents.array,
                enableExtend: true,
            }
        );
    }

    get total() {
        return this.#propertyAllocate[this.#types.CHR]
            +  this.#propertyAllocate[this.#types.INT]
            +  this.#propertyAllocate[this.#types.STR]
            +  this.#propertyAllocate[this.#types.MNY];
    }

    updateAllocate() {
        const charm = this.#propertyAllocate[this.#types.CHR];
        const intelligence = this.#propertyAllocate[this.#types.INT];
        const strength = this.#propertyAllocate[this.#types.STR];
        const money = this.#propertyAllocate[this.#types.MNY];

        this.inputCharm.text = ''+charm;
        this.inputIntelligence.text = ''+intelligence;
        this.inputStrength.text = ''+strength;
        this.inputMoney.text = ''+money;

        this.labLeftPropertyPoint.text = this.#propertyPoints - this.total;

        this.btnCharmIncrease.disabled = this.btnCharmIncrease.gray = false;
        this.btnCharmReduce.disabled = this.btnCharmReduce.gray = false;
        this.btnIntelligenceIncrease.disabled = this.btnIntelligenceIncrease.gray = false;
        this.btnIntelligenceReduce.disabled = this.btnIntelligenceReduce.gray = false;
        this.btnStrengthIncrease.disabled = this.btnStrengthIncrease.gray = false;
        this.btnStrengthReduce.disabled = this.btnStrengthReduce.gray = false;
        this.btnMoneyIncrease.disabled = this.btnMoneyIncrease.gray = false;
        this.btnMoneyReduce.disabled = this.btnMoneyReduce.gray = false;
    }

    check(left, right, value) {
        if (value < left) return false;
        if (value > right) return false;
        return true;
    }

    random() {
        let t = this.#propertyPoints;
        const arr = new Array(4).fill(this.#propertyAllocateLimit[1]);

        while (t > 0) {
            const sub = Math.round(Math.random() * (Math.min(t, this.#propertyAllocateLimit[1]) - 1)) + 1;
            while(true) {
                const select = Math.floor(Math.random() * 4) % 4;
                if(arr[select] - sub <0) continue;
                arr[select] -= sub;
                t -= sub;
                break;
            }
        }
        this.#propertyAllocate[this.#types.CHR] = this.#propertyAllocateLimit[1] - arr[0];
        this.#propertyAllocate[this.#types.INT] = this.#propertyAllocateLimit[1] - arr[1];
        this.#propertyAllocate[this.#types.STR] = this.#propertyAllocateLimit[1] - arr[2];
        this.#propertyAllocate[this.#types.MNY] = this.#propertyAllocateLimit[1] - arr[3];

        this.updateAllocate();
    }

    onPropertyAllocate(type, value) {
        if (!this.check(
                this.#propertyAllocateLimit[0],
                this.#propertyAllocateLimit[1],
                this.#propertyAllocate[type] + value
        )) {
            return;
        }
        if (!this.check(
            0,
            this.#propertyPoints,
            this.total + value
        )) {
            return;
        }
        this.#propertyAllocate[type] += value;
        this.updateAllocate();
    }

    onPropertyAllocateInput(type, inputItem) {
        let value = parseInt(inputItem.text) || 0;
        const total = this.total;
        if (total + value < 0) {
            value = this.#propertyAllocateLimit[0] * 4 - total;
        } else if (total + value > this.#propertyPoints) {
            value = this.#propertyPoints - total;
        }

        if (value < this.#propertyAllocateLimit[0]) {
            value = this.#propertyAllocateLimit[0];
        } else if (value > this.#propertyAllocateLimit[1]) {
            value = this.#propertyAllocateLimit[1];
        }


        const alter = value - this.#propertyAllocate[type];
        if (alter) {
            this.onPropertyAllocate(type, alter);
        } else {
            this.updateAllocate();
        }
    }

    renderTalent(box) {
    const dataSource = box.dataSource;

    console.log('=== 属性页面渲染天赋 ===');
    console.log('政策:', dataSource.name);
    console.log('描述:', dataSource.description);
    
    // 清空原有内容
    box.removeChildren();
    
    // 调整box高度以适应新样式
    box.height = 80; // 根据实际空间调整
    
    // 动态创建名称Label - 使用与talent.js一致的样式
    const labName = new Laya.Label();
    labName.name = 'labName';
    labName.width = box.width;
    labName.height = 35;
    labName.y = 10;
    labName.align = 'center';
    labName.valign = 'middle';
    labName.font = 'SimHei';
    labName.fontSize = 62; // 与talent页面保持一致或稍小
    labName.color = '#ffffff';
    labName.text = dataSource.name;
    box.addChild(labName);
    
    // 动态创建描述Label - 使用与talent.js一致的样式
    const labDesc = new Laya.Label();
    labDesc.name = 'labDesc';
    labDesc.width = box.width;
    labDesc.height = 25;
    labDesc.y = 45;
    labDesc.align = 'center';
    labDesc.valign = 'middle';
    labDesc.font = 'SimHei';
    labDesc.fontSize = 0; // 与talent页面保持一致或稍小
    labDesc.color = '#ffffff';
    labDesc.text = `（${dataSource.description}）`;
    box.addChild(labDesc);
    
    // 居中计算 - 与talent.js保持一致
    Laya.timer.frameOnce(2, this, () => {
        const containerWidth = box.width;
        const nameWidth = labName.contextWidth || labName.width;
        const descWidth = labDesc.contextWidth || labDesc.width;
        
        labName.x = Math.max(0, (containerWidth - nameWidth) / 2);
        labDesc.x = Math.max(0, (containerWidth - descWidth) / 2);
        
        console.log('属性页面居中完成:', {
            nameX: labName.x,
            descX: labDesc.x
        });
    });

    // 保持原有的样式设置
    const style = $ui.common.card[dataSource.grade].normal;
    $_.deepMapSet(box, style);
}
}