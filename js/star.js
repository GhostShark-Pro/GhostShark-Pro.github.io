// source/js/star.js (究极自然版：六角飞雪 + 真实垂直光幔极光)
(function () {
    if (document.getElementById('stellaris-canvas')) return;

    const canvas = document.createElement('canvas');
    canvas.id = 'stellaris-canvas';
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.zIndex = '-1';
    canvas.style.pointerEvents = 'none';
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    let width, height;
    let meteors = [];
    let snows = [];
    let time = 0; 
    let dayBackground;
    let nightBackground;
    let auroraRayTexture;
    let animationFrameId = 0;
    let resizeFrameId = 0;
    let auroraPhaseCaches = [];

    const METEOR_COUNT = 15;
    const SNOW_COUNT = 80;
    const AURORA_RAY_WIDTH = 4;

    // 1. 监听昼夜切换
    function getTheme() {
        return document.documentElement.getAttribute('data-user-color-scheme') || 'light';
    }
    let currentTheme = getTheme();
    const observer = new MutationObserver(() => {
        currentTheme = getTheme();
    });
    observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-user-color-scheme']
    });

    // 2. 流星系统
    class Meteor {
        constructor() { this.init(); }
        init() {
            this.x = Math.random() * width * 1.5;
            this.y = Math.random() * height * -1;
            this.length = Math.random() * 150 + 50; 
            this.thickness = Math.random() * 2 + 0.5; 
            let speed = (Math.random() * 5 + 5) * 0.8;
            this.vx = -speed; 
            this.vy = speed;  
        }
        draw() {
            let endX = this.x - this.length;
            let endY = this.y + this.length;
            let grad = ctx.createLinearGradient(this.x, this.y, endX, endY);
            grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
            grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(endX, endY);
            ctx.strokeStyle = grad;
            ctx.lineWidth = this.thickness;
            ctx.lineCap = 'round';
            ctx.stroke();
        }
        update() {
            this.x += this.vx;
            this.y += this.vy;
            if (this.x < -this.length || this.y > height + this.length) this.init();
        }
    }

    // 3. 细节拉满的冰晶飘雪
    class Snow {
        constructor() { this.init(); }
        init() {
            this.x = Math.random() * width;
            this.y = Math.random() * height * -1;
            this.radius = Math.random() * 3.5 + 1.0; 
            this.vy = (this.radius * 0.4) + Math.random() * 0.5;   
            this.vx = (Math.random() - 0.5) * 0.8; 
            this.swing = Math.random() * Math.PI * 2; 
            this.swingSpeed = Math.random() * 0.03 + 0.01;
            this.alpha = Math.random() * 0.6 + 0.4; 
            this.sprite = this.radius <= 3.2 ? this.createSprite() : null;
        }
        createSprite() {
            const padding = 1;
            const size = Math.ceil(this.radius * 2) + padding * 2;
            const center = size / 2;
            const sprite = document.createElement('canvas');
            sprite.width = size;
            sprite.height = size;

            const spriteCtx = sprite.getContext('2d');
            const grad = spriteCtx.createRadialGradient(center, center, 0, center, center, this.radius);
            grad.addColorStop(0, `rgba(255, 255, 255, ${this.alpha})`);
            grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
            spriteCtx.fillStyle = grad;
            spriteCtx.beginPath();
            spriteCtx.arc(center, center, this.radius, 0, Math.PI * 2);
            spriteCtx.fill();
            return sprite;
        }
        draw() {
            const drawX = this.x + Math.sin(this.swing) * (this.radius * 1.5);

            if (this.sprite) {
                ctx.drawImage(
                    this.sprite,
                    drawX - this.sprite.width / 2,
                    this.y - this.sprite.height / 2
                );
                return;
            }

            ctx.save();
            ctx.translate(drawX, this.y);
            ctx.rotate(this.swing);

            ctx.strokeStyle = `rgba(255, 255, 255, ${this.alpha})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                ctx.moveTo(0, 0);
                ctx.lineTo(0, -this.radius * 2);
                ctx.moveTo(0, -this.radius);
                ctx.lineTo(this.radius * 0.5, -this.radius * 1.5);
                ctx.moveTo(0, -this.radius);
                ctx.lineTo(-this.radius * 0.5, -this.radius * 1.5);
                ctx.rotate(Math.PI / 3); 
            }
            ctx.stroke();
            ctx.restore();
        }
        update() {
            this.y += this.vy;
            this.x += this.vx;
            this.swing += this.swingSpeed; 
            if (this.y > height + this.radius * 2 || this.x < -20 || this.x > width + 20) {
                this.init();
                this.y = -this.radius * 2; 
            }
        }
    }

    // 4. 自然极光渲染器 (基于垂直射线混合的正弦波幕帘)
    function createAuroraRayTexture() {
        const texture = document.createElement('canvas');
        texture.width = 1;
        texture.height = 1200;

        const textureCtx = texture.getContext('2d');
        const grad = textureCtx.createLinearGradient(0, 0, 0, texture.height);
        grad.addColorStop(0, 'rgba(100, 0, 255, 0)');
        // 按最大透明度倍数 2.4 归一化，绘制时的 globalAlpha 始终落在 0~1。
        grad.addColorStop(0.4, 'rgba(0, 150, 255, 0.048)');
        grad.addColorStop(0.8, 'rgba(0, 255, 150, 0.12)');
        grad.addColorStop(1, 'rgba(0, 255, 150, 0)');
        textureCtx.fillStyle = grad;
        textureCtx.fillRect(0, 0, texture.width, texture.height);
        return texture;
    }

    function createAuroraPhaseCache(freq) {
        const count = Math.ceil(width / AURORA_RAY_WIDTH);
        const wave1Sin = new Float64Array(count);
        const wave1Cos = new Float64Array(count);
        const wave2Sin = new Float64Array(count);
        const wave2Cos = new Float64Array(count);
        const foldSin = new Float64Array(count);
        const foldCos = new Float64Array(count);

        for (let i = 0; i < count; i++) {
            const x = i * AURORA_RAY_WIDTH;
            const wave1Phase = x * freq;
            const wave2Phase = wave1Phase * 2.5;
            const foldPhase = wave1Phase * 8;
            wave1Sin[i] = Math.sin(wave1Phase);
            wave1Cos[i] = Math.cos(wave1Phase);
            wave2Sin[i] = Math.sin(wave2Phase);
            wave2Cos[i] = Math.cos(wave2Phase);
            foldSin[i] = Math.sin(foldPhase);
            foldCos[i] = Math.cos(foldPhase);
        }

        return { count, wave1Sin, wave1Cos, wave2Sin, wave2Cos, foldSin, foldCos };
    }

    function drawAuroraLayer(baseY, speed, maxRayHeight, alphaMult, phaseCache) {
        const wave1Time = time * speed;
        const wave2Time = wave1Time * 1.2;
        const foldTime = wave1Time * 2;
        const wave1TimeSin = Math.sin(wave1Time);
        const wave1TimeCos = Math.cos(wave1Time);
        const wave2TimeSin = Math.sin(wave2Time);
        const wave2TimeCos = Math.cos(wave2Time);
        const foldTimeSin = Math.sin(foldTime);
        const foldTimeCos = Math.cos(foldTime);

        // 遍历整个屏幕宽度，画出无数条紧密相连的垂直射线，构成极光的光幔
        for (let i = 0; i < phaseCache.count; i++) {
            const x = i * AURORA_RAY_WIDTH;
            // 基础波浪路径（大波浪 + 小波浪混合产生自然形态）
            let y = baseY 
                  + (phaseCache.wave1Sin[i] * wave1TimeCos + phaseCache.wave1Cos[i] * wave1TimeSin) * 80
                  + (phaseCache.wave2Sin[i] * wave2TimeCos - phaseCache.wave2Cos[i] * wave2TimeSin) * 40;
            
            // 极光的明暗褶皱感（局部高亮射线）
            let fold = (phaseCache.foldSin[i] * foldTimeCos + phaseCache.foldCos[i] * foldTimeSin) * 0.5 + 0.5;
            fold = Math.max(0, Math.min(1, fold));
            let rayHeight = maxRayHeight * 0.6 + maxRayHeight * fold * 0.4;
            
            // 渐变色带只生成一次；每条射线只调整高度和透明度。
            // 原本两个非零色标的透明度具有相同倍数，因此视觉结果保持一致。
            ctx.globalAlpha = ((1 + fold) * alphaMult) / 2.4;
            ctx.drawImage(auroraRayTexture, x, y - rayHeight, AURORA_RAY_WIDTH + 0.5, rayHeight * 1.2);
        }
        ctx.globalAlpha = 1;
    }

    function drawAurora() {
        ctx.save();
        ctx.globalCompositeOperation = 'screen'; // 滤色发光混合
        
        // 渲染远景极光 (位置靠上，波浪平缓，颜色稍淡)
        drawAuroraLayer(height * 0.35, 0.4, 300, 0.7, auroraPhaseCaches[0]);
        // 渲染近景极光 (位置靠下，褶皱分明，颜色高亮)
        drawAuroraLayer(height * 0.5, 0.6, 250, 1.2, auroraPhaseCaches[1]);
        
        ctx.restore();
    }

    // 5. 核心渲染循环
    function initCanvas() {
        const nextWidth = window.innerWidth;
        const nextHeight = window.innerHeight;
        if (nextWidth === width && nextHeight === height) {
            resizeFrameId = 0;
            return;
        }

        const previousWidth = width;
        const previousHeight = height;
        const widthChanged = nextWidth !== width;
        width = canvas.width = nextWidth;
        height = canvas.height = nextHeight;

        nightBackground = ctx.createLinearGradient(0, 0, 0, height);
        nightBackground.addColorStop(0, '#050914');
        nightBackground.addColorStop(1, '#111827');

        dayBackground = ctx.createLinearGradient(0, 0, 0, height);
        dayBackground.addColorStop(0, '#8CB1D3');
        dayBackground.addColorStop(1, '#DCE7F0');

        auroraRayTexture = auroraRayTexture || createAuroraRayTexture();
        if (widthChanged || auroraPhaseCaches.length === 0) {
            auroraPhaseCaches = [
                createAuroraPhaseCache(0.0015),
                createAuroraPhaseCache(0.002)
            ];
        }

        if (meteors.length === 0 && snows.length === 0) {
            for (let i = 0; i < METEOR_COUNT; i++) meteors.push(new Meteor());
            for (let i = 0; i < SNOW_COUNT; i++) snows.push(new Snow());
        } else {
            const scaleX = previousWidth ? width / previousWidth : 1;
            const scaleY = previousHeight ? height / previousHeight : 1;
            for (let i = 0; i < meteors.length; i++) {
                meteors[i].x *= scaleX;
                meteors[i].y *= scaleY;
            }
            for (let i = 0; i < snows.length; i++) {
                snows[i].x *= scaleX;
                snows[i].y *= scaleY;
            }
        }
        resizeFrameId = 0;
    }

    function animate() {
        if (currentTheme === 'dark') {
            // 深夜背景
            ctx.fillStyle = nightBackground;
            ctx.fillRect(0, 0, width, height);

            drawAurora(); // 画自然极光
            for (let i = 0; i < meteors.length; i++) {
                meteors[i].update();
                meteors[i].draw();
            }

        } else {
            // 晴空背景
            ctx.fillStyle = dayBackground;
            ctx.fillRect(0, 0, width, height);

            for (let i = 0; i < snows.length; i++) {
                snows[i].update();
                snows[i].draw();
            }
        }
        
        time += 0.01; 
        animationFrameId = requestAnimationFrame(animate);
    }

    function startAnimation() {
        if (!animationFrameId) {
            animationFrameId = requestAnimationFrame(animate);
        }
    }

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = 0;
            cancelAnimationFrame(resizeFrameId);
            resizeFrameId = 0;
        } else {
            initCanvas();
            startAnimation();
        }
    });

    window.addEventListener('resize', () => {
        cancelAnimationFrame(resizeFrameId);
        resizeFrameId = requestAnimationFrame(initCanvas);
    });
    initCanvas();
    if (!document.hidden) startAnimation();
})();
