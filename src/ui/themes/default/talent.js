export default class Talent extends ui.view.DefaultTheme.TalentUI {
    constructor() {
        super();
        this.btnDrawCard.on(Laya.Event.CLICK, this, this.onClickDrawCard);
        this.btnNext.on(Laya.Event.CLICK, this, this.onClickNext);
        this.listTalents.renderHandler = Laya.Handler.create(this, this.renderTalent, null, false);
        this.listTalents.scrollBar.elasticDistance = 150;

        this.listTalents.spaceY = 80;  // 调整这个值来控制间距
    }

    #selected = new Set();
    init() {
        this.pageDrawCard.visible = true;
        this.pageResult.visible = false;
        this.btnNext.label = 'UI_Talent_Select_Uncomplete';
        this.#selected.clear();
    }

    close() {}

    onClickDrawCard() {
        this.pageDrawCard.visible = false;
        this.pageResult.visible = true;
        this.listTalents.array = core.talentRandom();
    }

    onClickNext() {
        if(this.#selected.size < core.talentSelectLimit) {
            return $$event('message', ['F_TalentSelectNotComplect', core.talentSelectLimit]);
        }

        const talents = [...this.#selected].map(index => this.listTalents.array[index]);
        $ui.switchView(UI.pages.PROPERTY, { talents, enableExtend: true });
    }

renderTalent(box, index) {
    const dataSource = box.dataSource;
    
    console.log('=== 彻底解决文字重叠问题 ===');
    
    // 方法1：完全清空box内容，然后重新创建
    this.cleanAndRenderTalent(box, index, dataSource);
}

// 新增方法：完全清理并重新渲染
// 修改 cleanAndRenderTalent 方法
cleanAndRenderTalent(box, index, dataSource) {
    // 第一步：记录需要保留的组件（如blank）和当前高度
    const blank = box.getChildByName('blank');
    const originalHeight = box.height; // 保存原始高度
    
    // 第二步：移除所有子组件（除了blank）
    const childrenToKeep = [];
    if (blank) {
        childrenToKeep.push(blank);
    }
    
    // 清空所有其他子组件
    box.removeChildren();
    
    // 第三步：重新设置box高度（重要！）
    box.height = 140; // 确保使用我们之前调整的高度
    
    // 第四步：重新添加需要保留的组件
    childrenToKeep.forEach(child => {
        box.addChild(child);
    });
    
    // 第五步：重新创建文本组件
    this.createTalentLabels(box, dataSource);
    
    // 第六步：设置样式和事件
    this.setupTalentStyleAndEvents(box, index, dataSource, blank);
    
    console.log('✅ 清理完成，box高度:', box.height);
}

// 新增方法：创建文本组件
createTalentLabels(box, dataSource) {
    // 创建名称Label - 使用之前调整好的大字体
    const labName = new Laya.Label();
    labName.name = 'labName';
    labName.width = box.width;
    labName.height = 50;
    labName.y = 25;
    labName.align = 'center';
    labName.valign = 'middle';
    labName.font = 'SimHei';
    labName.fontSize = 56; // 增大字体
    labName.color = '#ffffff';
    labName.text = dataSource.name;
    box.addChild(labName);
    
    // 创建描述Label - 使用之前调整好的大字体
    const labDesc = new Laya.Label();
    labDesc.name = 'labDesc';
    labDesc.width = box.width;
    labDesc.height = 40;
    labDesc.y = 85;
    labDesc.align = 'center';
    labDesc.valign = 'middle';
    labDesc.font = 'SimHei';
    labDesc.fontSize = 38; // 增大字体
    labDesc.color = '#ffffff';
    labDesc.text = `（${dataSource.description}）`;
    box.addChild(labDesc);
    
    console.log('✅ 文本组件创建完成，字体大小:', {名称: labName.fontSize, 描述: labDesc.fontSize});
    
    // 居中计算
    Laya.timer.frameOnce(2, this, () => {
        const containerWidth = box.width;
        const nameWidth = labName.contextWidth || labName.width;
        const descWidth = labDesc.contextWidth || labDesc.width;
        
        labName.x = Math.max(0, (containerWidth - nameWidth) / 2);
        labDesc.x = Math.max(0, (containerWidth - descWidth) / 2);
    });
}

// 新增方法：设置样式和事件
setupTalentStyleAndEvents(box, index, dataSource, blank) {
    const style = $ui.common.card[dataSource.grade];
    const changeStyle = () => {
        const selected = this.#selected.has(index);
        if(blank) blank.pause = !selected;
        $_.deepMapSet(box, selected? style.selected: style.normal);
    }
    changeStyle();

    box.offAll(Laya.Event.CLICK);
    box.on(Laya.Event.CLICK, this, () => {
        if(this.#selected.has(index)) {
            this.#selected.delete(index);
        } else {
            if(this.#selected.size >= core.talentSelectLimit) {
                return $$event('message', ['F_TalentSelectLimit', core.talentSelectLimit]);
            }
            const exclusive = core.exclude(
                [...this.#selected].map(index => this.listTalents.array[index].id),
                this.listTalents.array[index].id
            );
            if(exclusive != null) {
                for(const {name, id} of this.listTalents.array)
                    if(exclusive == id)
                        return $$event('message', ['F_TalentConflict', name]);
                return;
            }
            this.#selected.add(index);
        }

        this.btnNext.label = this.#selected.size === core.talentSelectLimit
            ? 'UI_Next'
            : 'UI_Talent_Select_Uncomplete';

        changeStyle();
    });
}

// 新增辅助方法：设置政策文本
setupTalentText(labName, labDesc, dataSource, box) {
    console.log('🎉 成功找到组件，设置文本');
    
    labName.text = dataSource.name;
    labDesc.text = `（${dataSource.description}）`;
    
    // 使用UI文件中定义的位置
    labName.y = 35;
    labDesc.y = 85;
    
    // 由于UI中已设置align="center"，这里主要确保水平居中
    Laya.timer.frameOnce(2, this, () => {
        const containerWidth = box.width;
        const nameWidth = labName.contextWidth || labName.width;
        const descWidth = labDesc.contextWidth || labDesc.width;
        
        labName.x = (containerWidth - nameWidth) / 2;
        labDesc.x = (containerWidth - descWidth) / 2;
        
        console.log('居中完成:', {
            name: dataSource.name,
            nameX: labName.x,
            descX: labDesc.x
        });
    });
}

// 新增辅助方法：回退到旧渲染
fallbackToOldRender(box, dataSource) {
    console.log('❌ 找不到新组件，使用旧渲染');
    const oldLabel = box.getChildByName('label');
    if(oldLabel) {
        oldLabel.text = $_.format($lang.F_TalentSelection, dataSource);
    } else {
        console.error('所有组件都找不到！');
    }
}
}