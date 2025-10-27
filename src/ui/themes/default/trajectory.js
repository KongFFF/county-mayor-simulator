export default class Trajectory extends ui.view.DefaultTheme.TrajectoryUI {
    constructor() {
        super();
        let pos1 = [0, 0];
        this.panelTrajectory.on(Laya.Event.MOUSE_DOWN, this, e => pos1 = [e.stageX, e.stageY]);
        this.panelTrajectory.on(Laya.Event.MOUSE_UP, this, e => {
            const distanceX = e.stageX - pos1[0];
            const distanceY = e.stageY - pos1[1];
            if(Math.sqrt(Math.abs(distanceX) + Math.abs(distanceY)) > 10) {
                return;
            }
            this.onNext();
        });
        this.btnSummary.on(Laya.Event.CLICK, this, this.onSummary);

        this.panelTrajectory.vScrollBar.elasticDistance = 150;
        
        // 隐藏速度控制相关组件
        this.boxSpeed.visible = false;
        this.scbSpeed.visible = false;
        this.scbSpeed.mouseEnabled = false;
        this.prgSpeed.visible = false;
        
        // 新增：选择事件状态
        this.#pendingChoice = null;
    }

    #speed;
    #auto;
    #isEnd;
    #trajectoryItems;
    #talents;
    #enableExtend;
    #pendingChoice = null;

    static load() {
        return [
            "images/atlas/images/progress.atlas",
            'images/atlas/images/slider.atlas',
        ];
    }

    static #createComponent = Laya.plugin.extractComponents(Trajectory.uiView, ['boxTrajectoryItem']);
    #createTrajectoryItem() {
        const item = Trajectory.#createComponent('boxTrajectoryItem');
        item.labContent = item.getChildByName('labContent');
        item.labAge = item.getChildByName('hboxAge').getChildByName('labAge');
        const config = $ui.common.trajectoryItem;
        $_.deepMapSet(item, config.box);
        item.grade = grade => {
            $_.deepMapSet(item, config.grade[grade || 0]);
        }
        item.getChildByName('hboxAge')._childs.forEach(child => child.color = config.ageColor);
        item.labContent.color = config.contentColor;
        return item;
    }

    checkEventData() {
        console.log('🔍 === 检查原始事件数据 ===');
        
        if (window.core && core.events) {
            console.log('核心事件数据:', core.events);
        }
        
        if (window.core && core.getEvent) {
            const event20037 = core.getEvent(20037);
            console.log('事件20037原始数据:', event20037);
        }
        
        if (window.gameData) {
            console.log('游戏数据:', gameData);
        }
        
        console.log('🔍 === 检查结束 ===');
    }

    init({propertyAllocate, talents, enableExtend}) {
        this.#enableExtend = enableExtend;
        this.boxParticle.visible = false;
        this.btnSummary.visible = false;
        this.#trajectoryItems = [];
        this.#isEnd = false;
        this.#talents = talents;
        this.#pendingChoice = null;
        core.start(propertyAllocate);
        this.updateProperty();
        
        this.onNext();
    }

    close() {
        this.#trajectoryItems.forEach(item => {
            item.removeSelf();
            item.destroy();
        });
        this.#trajectoryItems = null;
        this.#pendingChoice = null;
    }

    updateProperty() {
        const types = core.PropertyTypes;
        const propertys = core.propertys;

        this.labCharm.text = propertys[types.CHR];
        this.labIntelligence.text = propertys[types.INT];
        this.labStrength.text = propertys[types.STR];
        this.labMoney.text = propertys[types.MNY];
        this.labSpirit.text = propertys[types.SPR];
    }

    onNext() {
        if (this.#pendingChoice) return;
        if(this.#isEnd) return;

        try {
            const result = core.next();
            
            if (!result) {
                console.error('❌ core.next() 返回 undefined');
                this.#isEnd = true;
                this.boxSpeed.visible = false;
                this.btnSummary.visible = true;
                return;
            }
            
            const { age, content, isEnd } = result;
            this.#isEnd = isEnd;

            if(isEnd) {
                this.boxSpeed.visible = false;
                this.btnSummary.visible = true;
                Laya.timer.frameOnce(1,this,()=>{
                    this.panelTrajectory.scrollTo(0, this.panelTrajectory.contentHeight);
                });
            }
            
            this.panelTrajectory.scrollTo(0, this.panelTrajectory.contentHeight);
            this.renderTrajectory(age, content);

            if(age >= 48) {
                this.boxSpeed.visible = false;
                this.boxParticle.visible = true;
            }
            this.updateProperty();
            
        } catch (error) {
            console.error('❌ onNext 执行出错:', error);
            this.#isEnd = true;
            this.boxSpeed.visible = false;
            this.btnSummary.visible = true;
        }
    }

    renderTrajectory(age, content) {
        const item = this.#createTrajectoryItem();
        item.labAge.text = ''+age;
        
        const choiceEvent = content.find(c => c.isChoice);
        if (choiceEvent) {
            console.log('=== 选择事件完整数据 ===');
            console.log('choiceEvent:', JSON.stringify(choiceEvent, null, 2));
            
            const allPossibleImageFields = [
                'image', 'img', 'picture', 'pic', 'icon', 
                'avatar', 'photo', 'illustration', 'eventImage'
            ];
            
            let foundImageField = null;
            let foundImageData = null;
            
            allPossibleImageFields.forEach(field => {
                if (choiceEvent[field] && typeof choiceEvent[field] === 'string') {
                    foundImageField = field;
                    foundImageData = choiceEvent[field];
                    console.log(`✅ 找到图片字段 "${field}":`, choiceEvent[field].substring(0, 100) + '...');
                }
            });
            
            if (foundImageField && foundImageField !== 'image') {
                console.log(`🔄 将字段 "${foundImageField}" 复制到 "image" 字段`);
                choiceEvent.image = foundImageData;
            }
            
            this.#pendingChoice = choiceEvent;

            item.labContent.text = content.map(
                ({type, description, grade, name, postEvent}) => {
                    switch(type) {
                        case 'TLT':
                            return `天赋【${name}】发动：${description}`;
                        case 'EVT':
                            return description;
                    }
                }
            ).join('\n');
            
            Laya.timer.frameOnce(5, this, () => {
                this.showChoicePopup(choiceEvent);
            });
        } else {
            item.labContent.text = content.map(
                ({type, description, grade, name, postEvent}) => {
                    switch(type) {
                        case 'TLT':
                            return `天赋【${name}】发动：${description}`;
                        case 'EVT':
                            return description + (postEvent?`\n${postEvent}`:'');
                    }
                }
            ).join('\n');
        }
        
        item.grade(content[content.length - 1].grade);
        this.vboxTrajectory.addChild(item);
        this.#trajectoryItems.push(item);
        item.y = this.vboxTrajectory.height;
        
        Laya.timer.frameOnce(1, this, () => {
            this.panelTrajectory.scrollTo(0, this.panelTrajectory.contentHeight);
        });
    }

    showChoicePopup(choiceEvent) {
        console.log('显示选择弹窗，选项数量:', choiceEvent.choices.length);
        
        const popupBg = new Laya.Box();
        popupBg.name = 'choicePopup';
        popupBg.width = Laya.stage.width;
        popupBg.height = Laya.stage.height;
        popupBg.x = 0;
        popupBg.y = 0;
        
        const mask = new Laya.Box();
        mask.width = Laya.stage.width;
        mask.height = Laya.stage.height;
        mask.alpha = 0.7;
        mask.graphics.drawRect(0, 0, mask.width, mask.height, "#000000");
        popupBg.addChild(mask);
        
        this.addChild(popupBg);
        
        const mainPopup = new Laya.Box();
        mainPopup.name = 'mainPopup';
        mainPopup.width = 1000;
        mainPopup.height = 720;
        mainPopup.x = (Laya.stage.width - mainPopup.width) / 2;
        mainPopup.y = (Laya.stage.height - mainPopup.height) / 2;
        
        const popupBackground = new Laya.runtime.ColorfulBox();
        popupBackground.width = mainPopup.width;
        popupBackground.height = mainPopup.height;
        popupBackground.defaultColor = "#1a1a1a";
        popupBackground.hoverColor = "#333333";
        popupBackground.defaultStroke = "#ffffff";
        popupBackground.lineWidth = 2;
        popupBackground.radius = 5;
        popupBackground.mouseEnabled = true;
        mainPopup.addChild(popupBackground);
        
        popupBg.addChild(mainPopup);
        
        if (choiceEvent.image) {
            console.log('加载事件图片:', choiceEvent.image);
            
            try {
                const eventImage = new Laya.Image();
                const imagePath = `images/events/${choiceEvent.image}`;
                console.log('图片完整路径:', imagePath);
                
                eventImage.skin = imagePath;
                eventImage.width = 450;
                eventImage.height = 450;
                eventImage.x = mainPopup.x + 20;
                eventImage.y = mainPopup.y - eventImage.height - 20;
                
                eventImage.on(Laya.Event.LOADED, this, () => {
                    console.log('✅ 事件图片加载成功！');
                });
                
                eventImage.on(Laya.Event.ERROR, this, (error) => {
                    console.log('❌ 事件图片加载失败:', error);
                });
                
                popupBg.addChild(eventImage);
                
            } catch (error) {
                console.error('❌ 图片创建异常:', error);
            }
        }
        
        const titleLabel = new Laya.Label();
        titleLabel.text = "政务决策";
        titleLabel.width = mainPopup.width;
        titleLabel.height = 96;
        titleLabel.y = 30;
        titleLabel.fontSize = 64;
        titleLabel.color = "#ffffff";
        titleLabel.font = "SimHei";
        titleLabel.align = "center";
        titleLabel.valign = "middle";
        titleLabel.bold = true;
        mainPopup.addChild(titleLabel);
        
        const descLabel = new Laya.Label();
        descLabel.text = choiceEvent.description;
        descLabel.width = mainPopup.width - 120;
        descLabel.height = 220;
        descLabel.x = 60;
        descLabel.y = 120;
        descLabel.fontSize = 56;
        descLabel.color = "#e1e1e1";
        descLabel.font = "SimHei";
        descLabel.align = "center";
        descLabel.valign = "middle";
        descLabel.wordWrap = true;
        descLabel.leading = 10;
        mainPopup.addChild(descLabel);
        
        const optionsBox = new Laya.Box();
        optionsBox.name = 'optionsBox';
        optionsBox.width = mainPopup.width - 120;
        optionsBox.height = 360;
        optionsBox.x = 60;
        optionsBox.y = 360;
        optionsBox.mouseEnabled = true;
        optionsBox.mouseThrough = false;
        mainPopup.addChild(optionsBox);
        
        choiceEvent.choices.forEach((choice, index) => {
            const btnContainer = new Laya.runtime.ColorfulBox();
            btnContainer.name = `choiceBtn${index}`;
            btnContainer.width = optionsBox.width - 80;
            btnContainer.height = 100;
            btnContainer.x = 40;
            btnContainer.y = index * 120;
            btnContainer.mouseEnabled = true;
            
            btnContainer.defaultColor = "#2a2a2a";
            btnContainer.hoverColor = "#3a3a3a";
            btnContainer.defaultStroke = "#ffffff";
            btnContainer.hoverStroke = "#ffffff";
            btnContainer.lineWidth = 1;
            btnContainer.radius = 5;
            
            const btnLabel = new Laya.Label();
            btnLabel.name = 'label';
            btnLabel.text = `${String.fromCharCode(65 + index)}. ${choice.text}`;
            btnLabel.width = btnContainer.width;
            btnLabel.height = btnContainer.height;
            btnLabel.fontSize = 52;
            btnLabel.color = "#ffffff";
            btnLabel.font = "SimHei";
            btnLabel.align = "center";
            btnLabel.valign = "middle";
            btnContainer.addChild(btnLabel);
            
            btnContainer.defaultLabel = "#ffffff";
            btnContainer.hoverLabel = "#ffffff";
            
            btnContainer.on(Laya.Event.CLICK, this, () => {
                this.onChoiceSelected(choiceEvent.eventId, index, popupBg, choiceEvent);
            });
            
            optionsBox.addChild(btnContainer);
        });
        
        mainPopup.on(Laya.Event.MOUSE_DOWN, this, (e) => {
            e.stopPropagation();
        });
        
        mainPopup.on(Laya.Event.MOUSE_UP, this, (e) => {
            e.stopPropagation();
        });
    }

    onChoiceSelected(eventId, choiceIndex, popupBg, choiceEvent) {
    console.log(`玩家选择了选项 ${choiceIndex}`);
    
    if (popupBg) {
        popupBg.removeSelf();
        popupBg.destroy();
    }
    
    const choiceResults = core.processChoice(eventId, choiceIndex);
    
    const selectedChoice = choiceEvent.choices[choiceIndex];
    console.log('🔍 选择的选项数据:', {
        hasResult: !!selectedChoice.result,
        hasEffect: !!selectedChoice.effect,
        effectString: selectedChoice.effect,
        allChoiceFields: Object.keys(selectedChoice)
    });
    
    if (selectedChoice && selectedChoice.result) {
        // 从Event.js中获取已经组装好的effect字符串
        const effectString = selectedChoice.effect;
        console.log('🔍 effect字符串:', effectString);
        this.showChoiceResult(selectedChoice.result, effectString);
    } else {
        this.#pendingChoice = null;
        Laya.timer.frameOnce(30, this, () => {
            this.onNext();
        });
    }
}

showChoiceResult(resultText, effectString) {
    console.log('显示选择结果:', resultText);
    console.log('🔍 原始effect字符串:', effectString);
    
    // 将effect字符串转换为中文描述
    let effectDescription = "";
    if (effectString && effectString.trim() !== "") {
        const effects = effectString.split(',');
        console.log('🔍 分割后的effects:', effects);
        
        const effectMap = [];
        
        // 映射属性名称
        const propertyNames = {
            'CHR': "民意",
            'INT': "环境", 
            'STR': "人口",
            'MNY': "财政",
            'SPR': "稳定度"
        };
        
        effects.forEach(effect => {
            if (effect && effect.trim() !== "") {
                console.log('🔍 处理单个effect:', effect);
                // 解析效果字符串，如 "CHR-5" -> "民意-5"
                const match = effect.match(/(CHR|INT|STR|MNY|SPR)([-+]?\d+)/);
                if (match) {
                    const propertyCode = match[1];
                    const value = match[2];
                    const propertyName = propertyNames[propertyCode];
                    effectMap.push(`${propertyName}${value}`);
                    console.log(`🔍 解析成功: ${propertyCode}${value} -> ${propertyName}${value}`);
                } else {
                    console.log('🔍 解析失败，effect格式:', effect);
                }
            }
        });
        
        effectDescription = effectMap.join('，');
        console.log('🔍 最终effect描述:', effectDescription);
    } else {
        console.log('🔍 effect字符串为空或无效');
    }
        
        const resultPopupBg = new Laya.Box();
        resultPopupBg.name = 'choiceResultPopup';
        resultPopupBg.width = Laya.stage.width;
        resultPopupBg.height = Laya.stage.height;
        resultPopupBg.x = 0;
        resultPopupBg.y = 0;
        
        const mask = new Laya.Box();
        mask.width = Laya.stage.width;
        mask.height = Laya.stage.height;
        mask.alpha = 0.7;
        mask.graphics.drawRect(0, 0, mask.width, mask.height, "#000000");
        resultPopupBg.addChild(mask);
        
        this.addChild(resultPopupBg);
        
        const resultPopup = new Laya.Box();
        resultPopup.name = 'resultPopup';
        resultPopup.width = 1000;
        resultPopup.height = 720;
        resultPopup.x = (Laya.stage.width - resultPopup.width) / 2;
        resultPopup.y = (Laya.stage.height - resultPopup.height) / 2;
        
        const popupBackground = new Laya.runtime.ColorfulBox();
        popupBackground.width = resultPopup.width;
        popupBackground.height = resultPopup.height;
        popupBackground.defaultColor = "#1a1a1a";
        popupBackground.hoverColor = "#333333";
        popupBackground.defaultStroke = "#ffffff";
        popupBackground.lineWidth = 2;
        popupBackground.radius = 5;
        popupBackground.mouseEnabled = true;
        resultPopup.addChild(popupBackground);
        
        resultPopupBg.addChild(resultPopup);
        
        const titleLabel = new Laya.Label();
        titleLabel.text = "结果";
        titleLabel.width = resultPopup.width;
        titleLabel.height = 96;
        titleLabel.y = 30;
        titleLabel.fontSize = 84;
        titleLabel.color = "#ffffff";
        titleLabel.font = "SimHei";
        titleLabel.align = "center";
        titleLabel.valign = "middle";
        titleLabel.bold = true;
        resultPopup.addChild(titleLabel);
        
        const resultLabel = new Laya.Label();
        resultLabel.text = resultText;
        resultLabel.width = resultPopup.width - 120;
        resultLabel.height = 400;
        resultLabel.x = 60;
        resultLabel.y = 140;
        resultLabel.fontSize = 56;
        resultLabel.color = "#e1e1e1";
        resultLabel.font = "SimHei";
        resultLabel.align = "center";
        resultLabel.valign = "middle";
        resultLabel.wordWrap = true;
        resultLabel.leading = 10;
        resultPopup.addChild(resultLabel);
        
        // 效果提示 - 显示具体的属性变化
        const effectLabel = new Laya.Label();
        effectLabel.text = effectDescription || "无属性变化";
        effectLabel.width = resultPopup.width;
        effectLabel.height = 50;
        effectLabel.y = 500;
        effectLabel.fontSize = 38;
        effectLabel.color = "#aaaaaa";
        effectLabel.font = "SimHei";
        effectLabel.align = "center";
        effectLabel.valign = "middle";
        effectLabel.bold = true;
        resultPopup.addChild(effectLabel);
        
        const confirmBtn = new Laya.runtime.ColorfulBox();
        confirmBtn.name = 'confirmBtn';
        confirmBtn.width = 200;
        confirmBtn.height = 80;
        confirmBtn.x = (resultPopup.width - 200) / 2;
        confirmBtn.y = 600;
        confirmBtn.mouseEnabled = true;
        
        confirmBtn.defaultColor = "#2a2a2a";
        confirmBtn.hoverColor = "#3a3a3a";
        confirmBtn.defaultStroke = "#ffffff";
        confirmBtn.hoverStroke = "#ffffff";
        confirmBtn.lineWidth = 1;
        confirmBtn.radius = 5;
        
        const btnLabel = new Laya.Label();
        btnLabel.text = "确定";
        btnLabel.width = 200;
        btnLabel.height = 80;
        btnLabel.fontSize = 42;
        btnLabel.color = "#ffffff";
        btnLabel.font = "SimHei";
        btnLabel.align = "center";
        btnLabel.valign = "middle";
        confirmBtn.addChild(btnLabel);
        
        confirmBtn.on(Laya.Event.CLICK, this, () => {
            resultPopupBg.removeSelf();
            resultPopupBg.destroy();
            
            this.#pendingChoice = null;
            Laya.timer.frameOnce(30, this, () => {
                this.onNext();
            });
        });
        
        resultPopup.addChild(confirmBtn);
        
        resultPopup.on(Laya.Event.MOUSE_DOWN, this, (e) => {
            e.stopPropagation();
        });
        
        resultPopup.on(Laya.Event.MOUSE_UP, this, (e) => {
            e.stopPropagation();
        });
    }

    createImagePlaceholder(parent, x, y, reason = '无数据') {
        const placeholder = new Laya.Box();
        placeholder.name = 'imagePlaceholder';
        placeholder.width = 200;
        placeholder.height = 200;
        placeholder.x = x;
        placeholder.y = y;
        
        const bg = new Laya.Sprite();
        bg.graphics.drawRect(0, 0, 200, 200, "#444444");
        placeholder.addChild(bg);
        
        const border = new Laya.Sprite();
        border.graphics.drawRect(0, 0, 200, 200, null, "#ff0000", 2);
        placeholder.addChild(border);
        
        const reasonText = new Laya.Label();
        reasonText.text = reason;
        reasonText.color = "#ffffff";
        reasonText.fontSize =40;
        reasonText.width = 200;
        reasonText.height = 40;
        reasonText.y = 70;
        reasonText.align = "center";
        reasonText.valign = "middle";
        reasonText.bold = true;
        placeholder.addChild(reasonText);
        
        const hintText = new Laya.Label();
        hintText.text = "图片加载失败";
        hintText.color = "#cccccc";
        hintText.fontSize = 36;
        hintText.width = 200;
        hintText.height = 30;
        hintText.y = 110;
        hintText.align = "center";
        hintText.valign = "middle";
        placeholder.addChild(hintText);
        
        parent.addChild(placeholder);
        return placeholder;
    }

    onSummary() {
        const talents = this.#talents;
        $ui.switchView(UI.pages.SUMMARY, {talents, enableExtend: this.#enableExtend});
    }
}