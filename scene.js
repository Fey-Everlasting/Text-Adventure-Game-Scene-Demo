document.addEventListener('DOMContentLoaded', function() {
    const dialogueCanvas = document.getElementById('dialogueCanvas');
    const dialogueCtx = dialogueCanvas.getContext('2d');

    const npcCanvas = document.getElementById('npcCanvas');
    const npcCtx = npcCanvas.getContext('2d');

    const sceneCanvas = document.getElementById('sceneCanvas');
    let gl = sceneCanvas.getContext('webgl', {
        antialias: false
    }); // 禁用抗锯齿

    if (!gl) {
        console.log('WebGL not supported, falling back on experimental-webgl');
        gl = sceneCanvas.getContext('experimental-webgl', {
            antialias: false
        });
    }

    if (!gl) {
        alert('Your browser does not support WebGL');
        return;
    }

    const scanlineCanvas = document.getElementById('scanlineCanvas');
    const scanlineCtx = scanlineCanvas.getContext('2d');

    dialogueCtx.imageSmoothingEnabled = false;
    npcCtx.imageSmoothingEnabled = false;

    const devicePixelRatio = window.devicePixelRatio || 1;
    const npcCanvasWidth = 190;
    const npcCanvasHeight = 250;
    const dialogueCanvasWidth = dialogueCanvas.clientWidth;
    const dialogueCanvasHeight = dialogueCanvas.clientHeight - 48;
    const sceneCanvasWidth = sceneCanvas.clientWidth;
    const sceneCanvasHeight = 380;

    npcCanvas.width = npcCanvasWidth * devicePixelRatio;
    npcCanvas.height = npcCanvasHeight * devicePixelRatio;
    dialogueCanvas.width = dialogueCanvasWidth * devicePixelRatio;
    dialogueCanvas.height = (dialogueCanvasHeight + 48) * devicePixelRatio;
    sceneCanvas.width = sceneCanvasWidth * devicePixelRatio;
    sceneCanvas.height = sceneCanvasHeight * devicePixelRatio;
    scanlineCanvas.width = 1024 * devicePixelRatio;
    scanlineCanvas.height = 768 * devicePixelRatio;

    npcCanvas.style.width = `${npcCanvasWidth}px`;
    npcCanvas.style.height = `${npcCanvasHeight}px`;
    dialogueCanvas.style.width = `${dialogueCanvasWidth}px`;
    dialogueCanvas.style.height = `${dialogueCanvasHeight + 48}px`;
    sceneCanvas.style.width = `${sceneCanvasWidth}px`;
    sceneCanvas.style.height = `${sceneCanvasHeight}px`;
    scanlineCanvas.style.width = '1024px';
    scanlineCanvas.style.height = '768px';

    npcCtx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    dialogueCtx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);

    const FRAME_WIDTH = 180;
    const FRAME_HEIGHT = 240;
    const FPS = 24; // 统一帧率设置为24 FPS

    const talkingFrames = [1, 2, 3];
    const blinkingFrame = 4;
    const closingFrame = 5;

    const talkingDelay = 1000 / FPS; // 说话动画帧间隔
    const typingSpeed = 24; // 打字速度
    const blinkingIntervalMin = 1500; // 眨眼的最小间隔时间（毫秒）
    const blinkingIntervalMax = 3000; // 眨眼的最大间隔时间（毫秒）
    const blinkHoldTime = 6; // 眨眼帧的持续时间（毫秒）
    const closingDurationMin = 3000; // 闭眼的最小持续时间（毫秒）
    const closingDurationMax = 5000; // 闭眼的最大持续时间（毫秒）
    const closingCooldownMin = 10000; // 闭眼冷却的最小时间（毫秒）
    const closingCooldownMax = 15000; // 闭眼冷却的最大时间（毫秒）
    const closingProbability = 0.30; // 闭眼触发概率

    let talkingIndex = 0;
    let talkingTimer;
    let blinkingTimer;
    let closingTimer;
    let closingCooldownTimer; // 闭眼冷却计时器
    let isTyping = false; // 添加一个标志来跟踪是否正在打字
    let isClosing = false; // 添加一个标志来跟踪是否正在闭眼
    let isBlinking = false; // 添加一个标志来跟踪是否正在眨眼
    let isCoolingDown = false; // 新增冷却标志
    let initialCooldown = true; // 初始冷却标志
    let consecutiveBlinks = 0;

    // 初始化后的10秒内禁用闭眼动画
    setTimeout(() => {
        initialCooldown = false;
    }, 10000);

    const spriteSheet = new Image();
    spriteSheet.src = 'assets/npcSprite.png';

    let scanlinesEnabled = true; // 默认启用扫描线

    function drawFrame(baseFrameX, overlayFrameX = null, extraOverlayFrameX = null) {
        npcCtx.clearRect(5, 5, FRAME_WIDTH, FRAME_HEIGHT); // 清除之前的帧
        npcCtx.drawImage(spriteSheet, baseFrameX * FRAME_WIDTH, 0, FRAME_WIDTH, FRAME_HEIGHT, 5, 5, FRAME_WIDTH, FRAME_HEIGHT);
        if (overlayFrameX !== null) {
            npcCtx.drawImage(spriteSheet, overlayFrameX * FRAME_WIDTH, 0, FRAME_WIDTH, FRAME_HEIGHT, 5, 5, FRAME_WIDTH, FRAME_HEIGHT);
        }
        if (extraOverlayFrameX !== null) {
            npcCtx.drawImage(spriteSheet, extraOverlayFrameX * FRAME_WIDTH, 0, FRAME_WIDTH, FRAME_HEIGHT, 5, 5, FRAME_WIDTH, FRAME_HEIGHT);
        }
    }

    function startTalkingAnimation() {
        clearTimeout(talkingTimer);
        talkingIndex = 0;
        animateTalking();
    }

    function animateTalking() {
        if (!isTyping) return; // 如果没有在打字，则不继续说话动画

        let overlayFrame = talkingFrames[talkingIndex];
        let extraOverlayFrame = null;

        if (isBlinking) {
            extraOverlayFrame = blinkingFrame;
        } else if (isClosing) {
            extraOverlayFrame = closingFrame;
        }

        drawFrame(0, overlayFrame, extraOverlayFrame);

        talkingIndex = (talkingIndex + 1) % talkingFrames.length;

        const randomDelay = talkingDelay;
        talkingTimer = setTimeout(() => {
            animateTalking();
        }, randomDelay);

        if (isTyping && !isClosing && Math.random() < closingProbability) { // 增加闭眼概率，限制在打字过程中
            startClosingAnimation();
        }
    }

    function animateBlinking() {
        isBlinking = true;
        drawFrame(0, blinkingFrame);
        setTimeout(() => {
            isBlinking = false;
            drawFrame(0);
            consecutiveBlinks++;
            if (consecutiveBlinks < 5 && Math.random() < 0.5) {
                animateBlinking(); // 连续眨眼
            } else {
                consecutiveBlinks = 0; // 重置连续眨眼计数
            }
        }, blinkHoldTime);
    }

    function startBlinkingAnimation() {
        clearTimeout(blinkingTimer);
        animateBlinking();
        blinkingTimer = setTimeout(startBlinkingAnimation, blinkingIntervalMin + Math.random() * (blinkingIntervalMax - blinkingIntervalMin));
    }

    function animateClosing() {
        isClosing = true;
        drawFrame(0, closingFrame);
        const randomHoldTime = closingDurationMin + Math.random() * (closingDurationMax - closingDurationMin);
        closingTimer = setTimeout(() => {
            isClosing = false;
            drawFrame(0);
            startClosingCooldown();
        }, randomHoldTime);
    }

    function startClosingAnimation() {
        if (isCoolingDown || initialCooldown) return; // 如果在冷却期间或初始冷却期间，则不触发闭眼动画
        clearTimeout(closingTimer);
        animateClosing();
    }

    function startClosingCooldown() {
        isCoolingDown = true; // 开始冷却
        clearTimeout(closingCooldownTimer);
        closingCooldownTimer = setTimeout(() => {
            isCoolingDown = false; // 冷却结束
            if (isTyping && Math.random() < closingProbability) {
                startClosingAnimation();
            }
        }, closingCooldownMin + Math.random() * (closingCooldownMax - closingCooldownMin));
    }

    function drawNPC() {
        npcCtx.fillStyle = 'black';
        npcCtx.fillRect(0, 0, npcCanvasWidth, npcCanvasHeight);

        npcCtx.strokeStyle = 'white';
        npcCtx.lineWidth = 3;
        npcCtx.beginPath();
        npcCtx.rect(1.5, 1.5, 187, 247);
        npcCtx.stroke();

        npcCtx.clearRect(5, 5, FRAME_WIDTH, FRAME_HEIGHT);
        drawFrame(0);
    }

    function drawDialogueBox() {
        dialogueCtx.clearRect(0, 0, dialogueCanvasWidth, 48);

        dialogueCtx.strokeStyle = 'white';
        dialogueCtx.lineWidth = 3;
        dialogueCtx.beginPath();
        dialogueCtx.rect(1.5, 48.5, dialogueCanvasWidth - 3, dialogueCanvasHeight - 3);
        dialogueCtx.stroke();

        dialogueCtx.fillStyle = 'white';
        dialogueCtx.font = '44px "Pixica Mono"';
        dialogueCtx.fontWeight = 'bold';
        dialogueCtx.textBaseline = 'top';
        const text = 'Female Debuger'; // 更名为 Female Debuger
        dialogueCtx.fillText(text, 20, -8);
    }

    function drawScanlines() {
        scanlineCtx.clearRect(0, 0, scanlineCanvas.width, scanlineCanvas.height);

        for (let y = 0; y < scanlineCanvas.height; y += 2) {
            scanlineCtx.fillStyle = (y % 4 === 0) ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.1)';
            scanlineCtx.fillRect(0, y, scanlineCanvas.width, 1);
        }
    }

    function initWebGL() {
        const vertexShaderSource = document.getElementById('vertex-shader').text;
        const fragmentShaderSource = document.getElementById('fragment-shader').text;

        const vertexShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vertexShader, vertexShaderSource);
        gl.compileShader(vertexShader);

        if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
            console.error('An error occurred compiling the vertex shader: ' + gl.getShaderInfoLog(vertexShader));
            return;
        }

        const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fragmentShader, fragmentShaderSource);
        gl.compileShader(fragmentShader);

        if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
            console.error('An error occurred compiling the fragment shader: ' + gl.getShaderInfoLog(fragmentShader));
            return;
        }

        const shaderProgram = gl.createProgram();
        gl.attachShader(shaderProgram, vertexShader);
        gl.attachShader(shaderProgram, fragmentShader);
        gl.linkProgram(shaderProgram);
        gl.useProgram(shaderProgram);

        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
            console.error('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
            return;
        }

        const vertices = new Float32Array([
            -1.0, -1.0, 0.0, 0.0, 0.0,
            1.0, -1.0, 0.0, 1.0, 0.0,
            -1.0, 1.0, 0.0, 0.0, 1.0,
            1.0, 1.0, 0.0, 1.0, 1.0,
        ]);

        const indices = new Uint16Array([
            0, 1, 2,
            2, 1, 3,
        ]);

        const vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

        const indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

        const positionAttribLocation = gl.getAttribLocation(shaderProgram, 'aVertexPosition');
        const texCoordAttribLocation = gl.getAttribLocation(shaderProgram, 'aTextureCoord');

        gl.vertexAttribPointer(
            positionAttribLocation,
            3,
            gl.FLOAT,
            false,
            5 * Float32Array.BYTES_PER_ELEMENT,
            0
        );
        gl.vertexAttribPointer(
            texCoordAttribLocation,
            2,
            gl.FLOAT,
            false,
            5 * Float32Array.BYTES_PER_ELEMENT,
            3 * Float32Array.BYTES_PER_ELEMENT
        );

        gl.enableVertexAttribArray(positionAttribLocation);
        gl.enableVertexAttribArray(texCoordAttribLocation);

        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);

        const image = new Image();
        image.onload = function() {
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

            // 设置非二次幂纹理的参数
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

            console.log('Image loaded and texture bound');
            render();
        };
        image.src = 'assets/scene.png'; // 使用URL

        const normalMap = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, normalMap);

        const normalImage = new Image();
        normalImage.onload = function() {
            gl.bindTexture(gl.TEXTURE_2D, normalMap);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, normalImage);

            // 设置非二次幂纹理的参数
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

            console.log('Normal map loaded and texture bound');
        };
        normalImage.src = 'assets/sceneNormalMap.png'; // 使用法线贴图URL

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.uniform1i(gl.getUniformLocation(shaderProgram, 'uSampler'), 0);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, normalMap);
        gl.uniform1i(gl.getUniformLocation(shaderProgram, 'uNormalMap'), 1);

        // 设置开关变量
        const greenChannelJitterLocation = gl.getUniformLocation(shaderProgram, 'uGreenChannelJitter');
        gl.uniform1i(greenChannelJitterLocation, false); // true表示开启绿色通道抖动，false表示关闭

        let time = 0;

        function render() {
            time += 0.01;
            gl.uniform1f(gl.getUniformLocation(shaderProgram, 'uTime'), time);

            gl.clearColor(0.0, 0.0, 0.0, 1.0);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

            gl.viewport(0, 0, sceneCanvasWidth, sceneCanvasHeight); // 设置视口

            gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);

            if (scanlinesEnabled) {
                drawScanlines();
            }

            requestAnimationFrame(render);
        }

        render();
    }

    const dialogueTextPages = [
        "Welcome to our adventure game! This is a test to see how \nthe text wraps within the dialogue box. Let's add more \ntext to see the effect and ensure it works properly. \nHave fun exploring!",
        "The second page of text appears now. This is to check \nhow multiple pages of text are handled. We hope you \nenjoy this sample dialogue as you journey through the \ngame world.",
        "Congratulations on completing this section! Remember, \npractice makes perfect. Keep honing your skills and \nyou'll become a legendary adventurer in no time. \nGood luck!",
        "Thank you for reaching the end of this game demo! This \nproject was developed by Fey using GPT Model-4, aims to \nexplore the boundaries of personal capabilities. We have \nadded keyframe animations to the NPC and used canvas to",
        "create a simple WebGL shader combined with normal maps \nto simulate lighting changes in the scene, bringing it \nto life. We appreciate your time and thank you for \nwatching.",
    ];

    let dialoguePageIndex = 0;
    let dialogueIndex = 0;

    // 初始化音频上下文
    let audioContext;
    let typingOscillator;
    let bgmAudio;

    function initAudio() {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            bgmAudio = new Audio('assets/tavern.m4a');
            bgmAudio.loop = true;
            bgmAudio.volume = 0.5; // 设置背景音乐音量
            const bgmSource = audioContext.createMediaElementSource(bgmAudio);
            bgmSource.connect(audioContext.destination);
            bgmAudio.play().catch(() => {
                document.addEventListener('click', () => {
                    audioContext.resume();
                    bgmAudio.play();
                }, { once: true });
            });
        }
    }

    function playTypingSound() {
        if (!audioContext) return;
        const oscillator = audioContext.createOscillator();
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(1000, audioContext.currentTime); // 频率可调整
        const gainNode = audioContext.createGain();
        gainNode.gain.setValueAtTime(0.03, audioContext.currentTime); // 设置音量
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.start();
        setTimeout(() => oscillator.stop(), typingSpeed - 10); // 确保每次音效播放时长略短于打字速度
    }

    function stopTypingSound() {
        if (typingOscillator) {
            typingOscillator.stop();
            typingOscillator = null;
        }
    }

    function typeCharacter() {
        if (dialogueIndex < dialogueTextPages[dialoguePageIndex].length) {
            isTyping = true; // 开始打字时标记为true
            dialogueCtx.clearRect(14, 62, dialogueCanvasWidth - 34, dialogueCanvasHeight - 28);
            drawDialogueBox();
            dialogueCtx.fillStyle = "white";
            dialogueCtx.font = "32px 'Pixica Mono', monospace";
            dialogueCtx.fontWeight = 'normal';
            wrapText(dialogueCtx, dialogueTextPages[dialoguePageIndex].substring(0, dialogueIndex + 1), 24, 76, dialogueCanvasWidth - 34, 32);
            dialogueIndex++;

            if (dialogueIndex === 1) { // 在文本开始时启动说话动画
                startTalkingAnimation();
            }

            playTypingSound(); // 播放打字音效

            setTimeout(typeCharacter, typingSpeed);
        } else {
            isTyping = false; // 打字结束时标记为false
            clearTimeout(talkingTimer); // 停止说话动画
            drawFrame(0); // 停止说话时显示第一帧
            stopTypingSound(); // 停止打字音效

            if (dialoguePageIndex === 3) { // 如果是倒数第二段，自动跳转到最后一段
                setTimeout(triggerNextPage, 1000);
            }
        }
    }

    function wrapText(context, text, x, y, maxWidth, lineHeight) {
        const paragraphs = text.split('\n');
        paragraphs.forEach((paragraph) => {
            let words = paragraph.split(' ');
            let line = '';
            for (let n = 0; n < words.length; n++) {
                const word = words[n] + ' ';
                const metrics = context.measureText(line + word);
                const testWidth = metrics.width;
                if (testWidth > maxWidth && line !== '') {
                    if (line.endsWith(' ') && line.trim().length + word.trim().length <= maxWidth) {
                        line = line.trim();
                    } else {
                        context.fillText(line, x, y);
                        line = word;
                        y += lineHeight;
                    }
                } else {
                    line += word;
                }
            }
            context.fillText(line, x, y);
            y += lineHeight;
        });
    }

    function triggerNextPage() {
        if (dialoguePageIndex < dialogueTextPages.length - 1) {
            dialoguePageIndex++;
            dialogueIndex = 0;
            typeCharacter();
            startTalkingAnimation(); // 重新同步动画与打字过程
        }
    }

    document.addEventListener('click', function() {
        if (dialoguePageIndex === 3 && dialogueIndex === dialogueTextPages[dialoguePageIndex].length) {
            // 如果已经在倒数第二段文本并且文本显示完毕，则不进行任何操作
            return;
        } else if (dialoguePageIndex < dialogueTextPages.length - 1 && dialogueIndex === dialogueTextPages[dialoguePageIndex].length) {
            // 如果当前段落已经显示完毕且还未到最后一段，则触发下一段文本显示
            triggerNextPage();
        }
    });

    drawNPC();
    drawDialogueBox();
    initWebGL();
    typeCharacter();
    startBlinkingAnimation(); // 启动眨眼动画

    // 在页面加载时初始化音频
    initAudio();
});
