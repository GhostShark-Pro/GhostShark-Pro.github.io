// source/js/star.js (究极自然版：六角飞雪 + 真实垂直光幔极光)
(function () {
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

    const METEOR_COUNT = 15;
    const SNOW_COUNT = 80;

    // 1. 监听昼夜切换
    function getTheme() {
        return document.documentElement.getAttribute('data-user-color-scheme') || 'light';
    }
    let currentTheme = getTheme();
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            currentTheme = getTheme();
        });
    });
    observer.observe(document.documentElement, { attributes: true });

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
            grad.addColorStop(0, `rgba(255, 255, 255, 1)`);
            grad.addColorStop(1, `rgba(255, 255, 255, 0)`);
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
        }
        draw() {
            ctx.save();
            ctx.translate(this.x + Math.sin(this.swing) * (this.radius * 1.5), this.y);
            ctx.rotate(this.swing);

            if (this.radius > 3.2) {
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
            } else {
                let grad = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius);
                grad.addColorStop(0, `rgba(255, 255, 255, ${this.alpha})`);
                grad.addColorStop(1, `rgba(255, 255, 255, 0)`);
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
                ctx.fill();
            }
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
    function drawAuroraLayer(baseY, freq, speed, maxRayHeight, alphaMult) {
        const rayWidth = 4; // 垂直射线的宽度
        // 遍历整个屏幕宽度，画出无数条紧密相连的垂直射线，构成极光的光幔
        for (let x = 0; x < width; x += rayWidth) {
            // 基础波浪路径（大波浪 + 小波浪混合产生自然形态）
            let y = baseY 
                  + Math.sin(x * freq + time * speed) * 80 
                  + Math.sin(x * freq * 2.5 - time * speed * 1.2) * 40;
            
            // 极光的明暗褶皱感（局部高亮射线）
            let fold = Math.sin(x * freq * 8 + time * speed * 2) * 0.5 + 0.5;
            let rayHeight = maxRayHeight * 0.6 + maxRayHeight * fold * 0.4;
            
            // 自然极光的垂直渐变色彩
            let grad = ctx.createLinearGradient(x, y - rayHeight, x, y + rayHeight * 0.2);
            
            // 顶部：消散的紫色/深蓝
            grad.addColorStop(0, `rgba(100, 0, 255, 0)`);
            // 中上部：青蓝色过渡
            grad.addColorStop(0.4, `rgba(0, 150, 255, ${(0.02 + fold * 0.02) * alphaMult})`);
            // 底部边缘：高亮的荧光绿（极光最经典的特征）
            grad.addColorStop(0.8, `rgba(0, 255, 150, ${(0.05 + fold * 0.05) * alphaMult})`);
            // 极底：迅速透明消散
            grad.addColorStop(1, `rgba(0, 255, 150, 0)`);
            
            ctx.fillStyle = grad;
            // 向上绘制极光射线
            ctx.fillRect(x, y - rayHeight, rayWidth + 0.5, rayHeight * 1.2);
        }
    }

    function drawAurora() {
        ctx.save();
        ctx.globalCompositeOperation = 'screen'; // 滤色发光混合
        
        // 渲染远景极光 (位置靠上，波浪平缓，颜色稍淡)
        drawAuroraLayer(height * 0.35, 0.0015, 0.4, 300, 0.7);
        // 渲染近景极光 (位置靠下，褶皱分明，颜色高亮)
        drawAuroraLayer(height * 0.5, 0.002, 0.6, 250, 1.2);
        
        ctx.restore();
    }

    // 5. 核心渲染循环
    function initCanvas() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
        meteors = []; snows = [];
        for (let i = 0; i < METEOR_COUNT; i++) meteors.push(new Meteor());
        for (let i = 0; i < SNOW_COUNT; i++) snows.push(new Snow());
    }

    function animate() {
        if (currentTheme === 'dark') {
            // 深夜背景
            let bgGrad = ctx.createLinearGradient(0, 0, 0, height);
            bgGrad.addColorStop(0, '#050914'); 
            bgGrad.addColorStop(1, '#111827');
            ctx.fillStyle = bgGrad;
            ctx.fillRect(0, 0, width, height);

            drawAurora(); // 画自然极光
            meteors.forEach(m => { m.update(); m.draw(); }); 

        } else {
            // 晴空背景
            let skyGrad = ctx.createLinearGradient(0, 0, 0, height);
            skyGrad.addColorStop(0, '#8CB1D3'); 
            skyGrad.addColorStop(1, '#DCE7F0'); 
            ctx.fillStyle = skyGrad;
            ctx.fillRect(0, 0, width, height);

            snows.forEach(s => { s.update(); s.draw(); }); 
        }
        
        time += 0.01; 
        requestAnimationFrame(animate);
    }

    window.addEventListener('resize', initCanvas);
    initCanvas();
    animate();
})();
