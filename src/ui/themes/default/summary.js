export default class Summary extends ui.view.DefaultTheme.SummaryUI {
    constructor() {
        super();
        this.listSummary.renderHandler = Laya.Handler.create(this, this.renderSummary, null, false);
        this.listSelectedTalents.renderHandler = Laya.Handler.create(this, this.renderTalent, null, false);
        this.btnAgain.on(Laya.Event.CLICK, this, this.onAgain);
    }

    #selectedTalent;
    #enableExtend;

    onAgain() {
        core.talentExtend(this.#selectedTalent);
        core.times ++;
        $ui.switchView(UI.pages.MAIN);
    }

    init({talents, enableExtend}) {
        const {summary, lastExtendTalent} = core;
        this.#enableExtend = enableExtend;

        this.listSummary.array = [
            [core.PropertyTypes.HINT, $lang.UI_Property_Intelligence],
            [core.PropertyTypes.HSTR, $lang.UI_Property_Strength],
            [core.PropertyTypes.HMNY, $lang.UI_Property_Money],
            [core.PropertyTypes.HSPR, $lang.UI_Property_Spirit],
            [core.PropertyTypes.HAGE, $lang.UI_Final_Age],
            [core.PropertyTypes.SUM, $lang.UI_Total_Judge],
        ].map(([type, key]) => {
            const data = summary[type];
            return {
                label: `${key}${$lang.UI_Colon} ${data.value} ${$lang[data.judge]}`,
                grade: data.grade,
            }
        });

        talents.sort(({id:a, grade:ag}, {id:b, grade:bg},)=>{
            if(a == lastExtendTalent) return -1;
            if(b == lastExtendTalent) return 1;
            return bg - ag;
        });
        if(this.#enableExtend) {
            this.#selectedTalent = null;
        } else {
            this.#selectedTalent = lastExtendTalent;
        }
        this.listSelectedTalents.array = talents;
    }
    renderSummary(box) {
        const {label, grade} = box.dataSource;
        box.label = label;
        $_.deepMapSet(box, $ui.common.summary[grade]);
    }
    renderTalent(box) {
    const dataSource = box.dataSource;
    
    // 清空原有内容
    box.removeChildren();
    
    // 调整box高度以匹配天赋选择页面
    box.height = 140;
    
    // 动态创建名称Label - 与talent.js保持一致
    const labName = new Laya.Label();
    labName.name = 'labName';
    labName.width = box.width;
    labName.height = 50;
    labName.y = 25;
    labName.align = 'center';
    labName.valign = 'middle';
    labName.font = 'SimHei';
    labName.fontSize = 46;
    labName.color = '#ffffff';
    labName.text = dataSource.name;
    box.addChild(labName);
    
    // 动态创建描述Label - 与talent.js保持一致
    const labDesc = new Laya.Label();
    labDesc.name = 'labDesc';
    labDesc.width = box.width;
    labDesc.height = 40;
    labDesc.y = 80;
    labDesc.align = 'center';
    labDesc.valign = 'middle';
    labDesc.font = 'SimHei';
    labDesc.fontSize = 38;
    labDesc.color = '#ffffff';
    labDesc.text = `（${dataSource.description}）`;
    box.addChild(labDesc);
    
    // 居中计算
    Laya.timer.frameOnce(2, this, () => {
        const containerWidth = box.width;
        const nameWidth = labName.contextWidth || labName.width;
        const descWidth = labDesc.contextWidth || labDesc.width;
        
        labName.x = Math.max(0, (containerWidth - nameWidth) / 2);
        labDesc.x = Math.max(0, (containerWidth - descWidth) / 2);
    });
    
    // 设置样式（保持原有的样式逻辑）
    const style = $ui.common.card[dataSource.grade];
    $_.deepMapSet(box, dataSource.id == this.#selectedTalent? style.selected: style.normal);
    
    // 设置blank的选中状态
    const blank = box.getChildByName('blank');
    if (blank) {
        blank.pause = dataSource.id != this.#selectedTalent;
    }
    
    // 设置点击事件
    box.off(Laya.Event.CLICK, this, this.onSelectTalent);
    box.on(Laya.Event.CLICK, this, this.onSelectTalent, [dataSource.id]);
    
    console.log('✅ 总结页面天赋样式统一完成');
}

    onSelectTalent(talentId) {
        if(!this.#enableExtend) {
            return $$event('message', ['M_DisableExtendTalent']);
        }
        if(talentId == this.#selectedTalent) {
            this.#selectedTalent = null;
        } else {
            this.#selectedTalent = talentId;
        }

        this.listSelectedTalents.refresh();
    }
}