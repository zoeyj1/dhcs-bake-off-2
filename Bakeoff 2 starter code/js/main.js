// This constant sets the number of tasks per trial. You can change it while you are experimenting,
// but it should be set back to 10 for the actual Bakeoff.
const tasksLength = 10;

window.addEventListener("load", () => {
    const trial = new Trial(tasksLength, "teamName", true);
    const applicationArea = document.getElementById("applicationArea");
    const sidebar = document.getElementById("sidebar");

    const submitButton = document.createElement("button");
    submitButton.innerText = "yes, that looks good";
    submitButton.className = "submit-button";
    submitButton.addEventListener("click", () => {
        trial.submitPosition();
    });
    applicationArea.appendChild(submitButton);

    const strategyPanel = document.createElement("section");
    strategyPanel.id = "strategyPanel";
    sidebar.appendChild(strategyPanel);

    const strategyHeading = document.createElement("h3");
    strategyHeading.innerText = "Choose Strategy";
    strategyPanel.appendChild(strategyHeading);

    const strategyStatus = document.createElement("p");
    strategyStatus.id = "strategyStatus";
    strategyPanel.appendChild(strategyStatus);

    const strategyButtons = document.createElement("div");
    strategyButtons.id = "strategyButtons";
    strategyPanel.appendChild(strategyButtons);

    const strategyControlsHost = document.createElement("div");
    strategyControlsHost.id = "strategyControlsHost";
    strategyPanel.appendChild(strategyControlsHost);

    const applicationElements = trial.getElements();
    const svg = applicationElements.svg;
    const box = applicationElements.box;

    box.fill("#11eaea");
    box.stroke({ width: 2, color: "#0a7c7c" });

    const copyTransform = (transform) => ({
        cx: transform.cx,
        cy: transform.cy,
        size: transform.size,
        rotation: transform.rotation,
    });
    const clampMin = (value, min) => Math.max(value, min);
    const degreesToRadians = (degrees) => degrees * Math.PI / 180;
    const radiansToDegrees = (radians) => radians * 180 / Math.PI;
    const normalizeDegrees = (degrees) => {
        let normalized = degrees;
        while (normalized <= -180) {
            normalized += 360;
        }
        while (normalized > 180) {
            normalized -= 360;
        }
        return normalized;
    };
    const rotateVector = (vector, angleDegrees) => {
        const angleRadians = degreesToRadians(angleDegrees);
        const cosine = Math.cos(angleRadians);
        const sine = Math.sin(angleRadians);
        return {
            x: (vector.x * cosine) - (vector.y * sine),
            y: (vector.x * sine) + (vector.y * cosine),
        };
    };
    const inverseRotateVector = (vector, angleDegrees) => rotateVector(vector, -angleDegrees);
    const distanceBetween = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    const midpoint = (a, b) => ({
        x: (a.x + b.x) / 2,
        y: (a.y + b.y) / 2,
    });
    const subtractPoints = (a, b) => ({
        x: a.x - b.x,
        y: a.y - b.y,
    });
    const addPoints = (a, b) => ({
        x: a.x + b.x,
        y: a.y + b.y,
    });
    const dotProduct = (a, b) => (a.x * b.x) + (a.y * b.y);
    const eventToSvgPoint = (event) => {
        const svgPoint = svg.point(event.clientX, event.clientY);
        return { x: svgPoint.x, y: svgPoint.y };
    };
    const angleFromTopDegrees = (point, center) => {
        return radiansToDegrees(Math.atan2(point.y - center.y, point.x - center.x)) + 90;
    };
    const isPointInsideSquare = (point, transform) => {
        const vectorFromCenter = {
            x: point.x - transform.cx,
            y: point.y - transform.cy,
        };
        const localPoint = inverseRotateVector(vectorFromCenter, transform.rotation);
        const halfSize = transform.size / 2;
        return Math.abs(localPoint.x) <= halfSize && Math.abs(localPoint.y) <= halfSize;
    };

    function readTransformFromBox() {
        const transformedBounds = box.rbox(svg);
        const localBounds = box.bbox();
        const screenMatrix = box.node.getScreenCTM();
        const rotation = radiansToDegrees(Math.atan2(0 - screenMatrix.c, screenMatrix.d));

        return {
            cx: transformedBounds.cx,
            cy: transformedBounds.cy,
            size: localBounds.width,
            rotation,
        };
    }

    let transformState = readTransformFromBox();
    let activeStrategy = null;
    let activeStrategyId = null;
    let taskReadyForSelection = false;
    let taskStrategyLocked = false;

    function applyTransform(nextTransform) {
        transformState = copyTransform(nextTransform);

        const topLeftX = transformState.cx - (transformState.size / 2);
        const topLeftY = transformState.cy - (transformState.size / 2);

        box.size(transformState.size, transformState.size);
        box.move(topLeftX, topLeftY);
        box.transform({
            rotate: transformState.rotation,
            ox: transformState.cx,
            oy: transformState.cy,
        });

        if (activeStrategy && typeof activeStrategy.refresh === "function") {
            activeStrategy.refresh();
        }
    }

    function syncTransformFromBox() {
        transformState = readTransformFromBox();
        if (activeStrategy && typeof activeStrategy.refresh === "function") {
            activeStrategy.refresh();
        }
    }

    function getTransform() {
        return copyTransform(transformState);
    }

    function setStatus(message) {
        strategyStatus.innerText = message;
    }

    function createStrategyButton(id, label) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "strategy-button";
        button.innerText = label;
        button.addEventListener("click", () => {
            if (!taskReadyForSelection || taskStrategyLocked) {
                return;
            }

            syncTransformFromBox();
            if (activeStrategy) {
                activeStrategy.deactivate();
            }

            activeStrategyId = id;
            taskStrategyLocked = true;
            activeStrategy = strategies[id];
            updateStrategyButtons();
            setStatus(`Active strategy: ${label}`);
            activeStrategy.activate();
        });
        strategyButtons.appendChild(button);
        return button;
    }

    function updateStrategyButtons() {
        strategyList.forEach((strategy) => {
            const isActive = strategy.id === activeStrategyId;
            strategy.button.disabled = !taskReadyForSelection || taskStrategyLocked;
            strategy.button.classList.toggle("active", isActive);
            strategy.button.setAttribute("aria-pressed", isActive ? "true" : "false");
        });
    }

    function hideStrategyControls() {
        Array.from(strategyControlsHost.children).forEach((child) => {
            child.classList.add("hidden");
        });
    }

    function createDirectManipulationStrategy() {
        const cornerSigns = [
            { x: -1, y: -1 },
            { x: 1, y: -1 },
            { x: 1, y: 1 },
            { x: -1, y: 1 },
        ];
        const config = {
            minSize: squareSizeMin,
            cornerHandleRadius: 8,
            rotationHandleRadius: 9,
            rotationHandleOffset: 28,
            bodyHitSlop: 2,
            handleHitSlop: 4,
        };

        const panel = document.createElement("div");
        panel.className = "strategy-help hidden";
        panel.innerText = "Direct Manipulation: follow the cursor, click once to drop, then drag the square, corner handles, or rotation handle.";
        strategyControlsHost.appendChild(panel);

        const overlay = svg.group().attr({ "pointer-events": "none" });
        const outlineEdges = [
            overlay.line(0, 0, 0, 0).stroke({ width: 1.5, color: "#136f63" }),
            overlay.line(0, 0, 0, 0).stroke({ width: 1.5, color: "#136f63" }),
            overlay.line(0, 0, 0, 0).stroke({ width: 1.5, color: "#136f63" }),
            overlay.line(0, 0, 0, 0).stroke({ width: 1.5, color: "#136f63" }),
        ];
        const cornerHandles = cornerSigns.map(() => {
            return overlay.circle(config.cornerHandleRadius * 2)
                .fill("#ffffff")
                .stroke({ width: 2, color: "#136f63" });
        });
        const rotationStem = overlay.line(0, 0, 0, 0).stroke({ width: 1.5, color: "#136f63" });
        const rotationHandle = overlay.circle(config.rotationHandleRadius * 2)
            .fill("#136f63")
            .stroke({ width: 2, color: "#ffffff" });

        const state = {
            active: false,
            mode: "idle",
            pointer: { x: canvasSize / 2, y: canvasSize / 2 },
            activeHandle: null,
            dragStart: null,
        };

        function getCornerPositions(transform = getTransform()) {
            const halfSize = transform.size / 2;
            return cornerSigns.map((sign) => {
                const localCorner = {
                    x: sign.x * halfSize,
                    y: sign.y * halfSize,
                };
                const rotatedCorner = rotateVector(localCorner, transform.rotation);
                return {
                    x: transform.cx + rotatedCorner.x,
                    y: transform.cy + rotatedCorner.y,
                };
            });
        }

        function getTopMidpoint(transform = getTransform()) {
            const rotatedTop = rotateVector({ x: 0, y: -(transform.size / 2) }, transform.rotation);
            return {
                x: transform.cx + rotatedTop.x,
                y: transform.cy + rotatedTop.y,
            };
        }

        function getRotationHandlePosition(transform = getTransform()) {
            const rotatedOffset = rotateVector(
                { x: 0, y: -((transform.size / 2) + config.rotationHandleOffset) },
                transform.rotation
            );
            return {
                x: transform.cx + rotatedOffset.x,
                y: transform.cy + rotatedOffset.y,
            };
        }

        function hitTest(point, transform = getTransform()) {
            const corners = getCornerPositions(transform);
            for (let index = 0; index < corners.length; index += 1) {
                const hitRadius = config.cornerHandleRadius + config.handleHitSlop;
                if (distanceBetween(point, corners[index]) <= hitRadius) {
                    return { type: "corner", index };
                }
            }

            const rotateHandlePoint = getRotationHandlePosition(transform);
            if (distanceBetween(point, rotateHandlePoint) <= (config.rotationHandleRadius + config.handleHitSlop)) {
                return { type: "rotate" };
            }

            const halfSize = transform.size / 2;
            const vectorFromCenter = {
                x: point.x - transform.cx,
                y: point.y - transform.cy,
            };
            const localPoint = inverseRotateVector(vectorFromCenter, transform.rotation);
            if (Math.abs(localPoint.x) <= (halfSize + config.bodyHitSlop)
                && Math.abs(localPoint.y) <= (halfSize + config.bodyHitSlop)) {
                return { type: "body" };
            }

            return null;
        }

        function renderCursor() {
            let cursor = "default";

            if (!state.active) {
                cursor = "default";
            }
            else if (state.mode === "follow") {
                cursor = "crosshair";
            }
            else if (state.mode === "translate") {
                cursor = "grabbing";
            }
            else if (state.mode === "rotate") {
                cursor = "crosshair";
            }
            else if (state.mode === "scale") {
                const isForwardDiagonal = state.activeHandle === 0 || state.activeHandle === 2;
                cursor = isForwardDiagonal ? "nwse-resize" : "nesw-resize";
            }
            else {
                const hit = hitTest(state.pointer);
                if (hit?.type === "body") {
                    cursor = "grab";
                }
                else if (hit?.type === "corner") {
                    const isForwardDiagonal = hit.index === 0 || hit.index === 2;
                    cursor = isForwardDiagonal ? "nwse-resize" : "nesw-resize";
                }
                else if (hit?.type === "rotate") {
                    cursor = "crosshair";
                }
            }

            svg.node.style.cursor = cursor;
        }

        function refresh() {
            if (!state.active) {
                overlay.opacity(0);
                return;
            }

            const transform = getTransform();
            const showOverlay = state.mode !== "follow";
            overlay.opacity(showOverlay ? 1 : 0);

            const corners = getCornerPositions(transform);
            for (let index = 0; index < corners.length; index += 1) {
                const start = corners[index];
                const end = corners[(index + 1) % corners.length];
                outlineEdges[index].plot(start.x, start.y, end.x, end.y);
                cornerHandles[index].center(start.x, start.y);
            }

            const topMidpoint = getTopMidpoint(transform);
            const rotateHandlePoint = getRotationHandlePosition(transform);
            rotationStem.plot(topMidpoint.x, topMidpoint.y, rotateHandlePoint.x, rotateHandlePoint.y);
            rotationHandle.center(rotateHandlePoint.x, rotateHandlePoint.y);
            renderCursor();
        }

        function onMouseDown(event) {
            if (!state.active || event.button !== 0) {
                return;
            }

            event.preventDefault();
            state.pointer = eventToSvgPoint(event);
            const transform = getTransform();

            if (state.mode === "follow") {
                applyTransform({
                    ...transform,
                    cx: state.pointer.x,
                    cy: state.pointer.y,
                });
                state.mode = "idle";
                refresh();
                return;
            }

            if (state.mode !== "idle") {
                return;
            }

            const hit = hitTest(state.pointer, transform);
            if (!hit) {
                return;
            }

            if (hit.type === "body") {
                state.mode = "translate";
                state.dragStart = {
                    startMouse: state.pointer,
                    transform,
                };
            }
            else if (hit.type === "corner") {
                const corners = getCornerPositions(transform);
                const anchorIndex = (hit.index + 2) % 4;
                state.mode = "scale";
                state.activeHandle = hit.index;
                state.dragStart = {
                    cornerIndex: hit.index,
                    anchorCorner: corners[anchorIndex],
                    diagonalDirection: {
                        x: cornerSigns[hit.index].x / Math.SQRT2,
                        y: cornerSigns[hit.index].y / Math.SQRT2,
                    },
                    transform,
                };
            }
            else if (hit.type === "rotate") {
                state.mode = "rotate";
                state.dragStart = {
                    transform,
                    startPointerAngleDegrees: angleFromTopDegrees(state.pointer, {
                        x: transform.cx,
                        y: transform.cy,
                    }),
                };
            }

            refresh();
        }

        function onMouseMove(event) {
            if (!state.active) {
                return;
            }

            state.pointer = eventToSvgPoint(event);

            if (state.mode === "follow") {
                const transform = getTransform();
                applyTransform({
                    ...transform,
                    cx: state.pointer.x,
                    cy: state.pointer.y,
                });
                return;
            }

            if (state.mode === "translate") {
                event.preventDefault();
                const dx = state.pointer.x - state.dragStart.startMouse.x;
                const dy = state.pointer.y - state.dragStart.startMouse.y;
                applyTransform({
                    ...state.dragStart.transform,
                    cx: state.dragStart.transform.cx + dx,
                    cy: state.dragStart.transform.cy + dy,
                });
                return;
            }

            if (state.mode === "rotate") {
                event.preventDefault();
                const centerAtStart = {
                    x: state.dragStart.transform.cx,
                    y: state.dragStart.transform.cy,
                };
                const currentPointerAngleDegrees = angleFromTopDegrees(state.pointer, centerAtStart);
                const deltaDegrees = normalizeDegrees(
                    currentPointerAngleDegrees - state.dragStart.startPointerAngleDegrees
                );
                applyTransform({
                    ...state.dragStart.transform,
                    rotation: state.dragStart.transform.rotation + deltaDegrees,
                });
                return;
            }

            if (state.mode === "scale") {
                event.preventDefault();
                const cornerIndex = state.dragStart.cornerIndex;
                const anchorCorner = state.dragStart.anchorCorner;
                const startTransform = state.dragStart.transform;
                const anchorToMouse = subtractPoints(state.pointer, anchorCorner);
                const localAnchorToMouse = inverseRotateVector(anchorToMouse, startTransform.rotation);
                const diagonalDistance = dotProduct(localAnchorToMouse, state.dragStart.diagonalDirection);
                const newSize = clampMin(diagonalDistance / Math.SQRT2, config.minSize);
                const localAnchorToDraggedCorner = {
                    x: cornerSigns[cornerIndex].x * newSize,
                    y: cornerSigns[cornerIndex].y * newSize,
                };
                const worldAnchorToDraggedCorner = rotateVector(localAnchorToDraggedCorner, startTransform.rotation);
                const draggedCorner = addPoints(anchorCorner, worldAnchorToDraggedCorner);
                const newCenter = midpoint(anchorCorner, draggedCorner);

                applyTransform({
                    cx: newCenter.x,
                    cy: newCenter.y,
                    size: newSize,
                    rotation: startTransform.rotation,
                });
                return;
            }

            refresh();
        }

        function onMouseUp(event) {
            if (!state.active || event.button !== 0) {
                return;
            }

            if (state.mode === "translate" || state.mode === "rotate" || state.mode === "scale") {
                state.mode = "idle";
                state.activeHandle = null;
                state.dragStart = null;
                refresh();
            }
        }

        return {
            activate() {
                hideStrategyControls();
                panel.classList.remove("hidden");
                state.active = true;
                state.mode = "follow";
                state.activeHandle = null;
                state.dragStart = null;
                svg.on("mousedown.direct", onMouseDown);
                window.addEventListener("mousemove", onMouseMove);
                window.addEventListener("mouseup", onMouseUp);
                refresh();
            },
            deactivate() {
                state.active = false;
                state.mode = "idle";
                state.activeHandle = null;
                state.dragStart = null;
                panel.classList.add("hidden");
                overlay.opacity(0);
                svg.node.style.cursor = "default";
                svg.off("mousedown.direct");
                window.removeEventListener("mousemove", onMouseMove);
                window.removeEventListener("mouseup", onMouseUp);
            },
            refresh,
        };
    }

    function createSliderStrategy() {
        const panel = document.createElement("div");
        panel.className = "strategy-controls hidden";
        strategyControlsHost.appendChild(panel);

        const help = document.createElement("p");
        help.className = "strategy-help";
        help.innerText = "Sliders: adjust X, Y, rotation, and size directly.";
        panel.appendChild(help);

        function createSlider(labelText, min, max, step) {
            const wrapper = document.createElement("label");
            wrapper.className = "slider-group";

            const label = document.createElement("span");
            label.innerText = labelText;
            wrapper.appendChild(label);

            const input = document.createElement("input");
            input.type = "range";
            input.min = String(min);
            input.max = String(max);
            input.step = String(step);
            wrapper.appendChild(input);

            panel.appendChild(wrapper);
            return input;
        }

        const sliderX = createSlider("X Position", 0, canvasSize, 1);
        const sliderY = createSlider("Y Position", 0, canvasSize, 1);
        const sliderRotation = createSlider("Rotation", 0, 360, 1);
        const sliderSize = createSlider("Scale", squareSizeMin, squareSizeMax, 1);

        let active = false;

        function syncInputs() {
            if (!active) {
                return;
            }

            const transform = getTransform();
            sliderX.value = String(Math.round(transform.cx));
            sliderY.value = String(Math.round(transform.cy));
            sliderRotation.value = String(Math.round((transform.rotation % 360 + 360) % 360));
            sliderSize.value = String(Math.round(transform.size));
        }

        function onInput() {
            if (!active) {
                return;
            }

            applyTransform({
                cx: Number(sliderX.value),
                cy: Number(sliderY.value),
                size: Number(sliderSize.value),
                rotation: Number(sliderRotation.value),
            });
        }

        sliderX.addEventListener("input", onInput);
        sliderY.addEventListener("input", onInput);
        sliderRotation.addEventListener("input", onInput);
        sliderSize.addEventListener("input", onInput);

        return {
            activate() {
                hideStrategyControls();
                active = true;
                panel.classList.remove("hidden");
                syncInputs();
            },
            deactivate() {
                active = false;
                panel.classList.add("hidden");
            },
            refresh() {
                syncInputs();
            },
        };
    }

    function createTwoClickStrategy() {
        const panel = document.createElement("div");
        panel.className = "strategy-help hidden";
        panel.innerText = "Two-Click Placement: click once for the square center, move the mouse to preview size and angle, click again to place, then drag the placed square to translate it.";
        strategyControlsHost.appendChild(panel);

        const state = {
            active: false,
            phase: "idle", // idle | choosing-corner | placed | dragging
            center: null,
            dragStart: null,
        };

        function computePreviewTransform(center, pointer) {
            const dx = pointer.x - center.x;
            const dy = pointer.y - center.y;
            const diagonal = Math.hypot(dx, dy);
            const size = clampMin(diagonal * Math.SQRT2, squareSizeMin);
            const rotation = radiansToDegrees(Math.atan2(dy, dx)) - 45;
            return {
                cx: center.x,
                cy: center.y,
                size,
                rotation,
            };
        }

        function onMouseDown(event) {
            if (!state.active || event.button !== 0) {
                return;
            }

            event.preventDefault();
            const pointer = eventToSvgPoint(event);

            if (state.phase === "idle") {
                state.center = pointer;
                state.phase = "choosing-corner";
                box.opacity(0.55);
                applyTransform({
                    ...getTransform(),
                    cx: pointer.x,
                    cy: pointer.y,
                });
                return;
            }

            if (state.phase === "choosing-corner") {
                applyTransform(computePreviewTransform(state.center, pointer));
                state.center = null;
                state.phase = "placed";
                box.opacity(1);
                return;
            }

            if (state.phase === "placed" && isPointInsideSquare(pointer, getTransform())) {
                state.phase = "dragging";
                state.dragStart = {
                    startMouse: pointer,
                    transform: getTransform(),
                };
            }
        }

        function onMouseMove(event) {
            if (!state.active) {
                return;
            }

            const pointer = eventToSvgPoint(event);

            if (state.phase === "choosing-corner" && state.center) {
                applyTransform(computePreviewTransform(state.center, pointer));
                return;
            }

            if (state.phase === "dragging") {
                event.preventDefault();
                const dx = pointer.x - state.dragStart.startMouse.x;
                const dy = pointer.y - state.dragStart.startMouse.y;
                applyTransform({
                    ...state.dragStart.transform,
                    cx: state.dragStart.transform.cx + dx,
                    cy: state.dragStart.transform.cy + dy,
                });
            }
        }

        function onMouseUp(event) {
            if (!state.active || event.button !== 0) {
                return;
            }

            if (state.phase === "dragging") {
                state.phase = "placed";
                state.dragStart = null;
            }
        }

        return {
            activate() {
                hideStrategyControls();
                panel.classList.remove("hidden");
                state.active = true;
                state.phase = "idle";
                state.center = null;
                state.dragStart = null;
                box.opacity(1);
                svg.on("mousedown.twoclick", onMouseDown);
                window.addEventListener("mousemove", onMouseMove);
                window.addEventListener("mouseup", onMouseUp);
            },
            deactivate() {
                state.active = false;
                state.phase = "idle";
                state.center = null;
                state.dragStart = null;
                panel.classList.add("hidden");
                box.opacity(1);
                svg.off("mousedown.twoclick");
                window.removeEventListener("mousemove", onMouseMove);
                window.removeEventListener("mouseup", onMouseUp);
            },
            refresh() {
                // No extra UI to sync beyond the shared square render.
            },
        };
    }

    const strategies = {
        direct: createDirectManipulationStrategy(),
        sliders: createSliderStrategy(),
        twoClick: createTwoClickStrategy(),
    };

    const strategyList = [
        { id: "direct", label: "Direct Manipulation" },
        { id: "sliders", label: "Sliders" },
        { id: "twoClick", label: "Two-Click Placement" },
    ];

    strategyList.forEach((strategy) => {
        strategy.button = createStrategyButton(strategy.id, strategy.label);
    });

    function deactivateActiveStrategy() {
        if (activeStrategy) {
            activeStrategy.deactivate();
        }
        activeStrategy = null;
        activeStrategyId = null;
    }

    function resetTaskSelectionState() {
        deactivateActiveStrategy();
        hideStrategyControls();
        syncTransformFromBox();
        taskReadyForSelection = true;
        taskStrategyLocked = false;
        setStatus("Select a strategy for this task.");
        updateStrategyButtons();
    }

    function disableStrategySelection(message) {
        deactivateActiveStrategy();
        hideStrategyControls();
        taskReadyForSelection = false;
        taskStrategyLocked = false;
        setStatus(message);
        updateStrategyButtons();
    }

    applyTransform(transformState);
    disableStrategySelection("Start a trial to choose a strategy.");

    trial.addEventListener("newTask", () => {
        resetTaskSelectionState();
    });

    trial.addEventListener("stop", () => {
        disableStrategySelection("Start a trial to choose a strategy.");
    });
});
