// This constant sets the number of tasks per trial. You can change it while you are experimenting,
// but it should be set back to 10 for the actual Bakeoff.
const tasksLength = 10;

window.addEventListener("load", () => {
    // =========== This part is required: ===========
    const trial = new Trial(tasksLength, "teamName", true);

    let submitButton = document.createElement("button");
    document.getElementById("applicationArea").appendChild(submitButton);
    submitButton.innerText = "yes, that looks good";
    submitButton.addEventListener("click", () => {
        trial.submitPosition();
    });
    // =========== /end required ===========

    const applicationElements = trial.getElements();
    const svg = applicationElements.svg;
    const box = applicationElements.box;

    box.fill("#11eaea");
    box.stroke({ width: 2, color: "#0a7c7c" });

    /**
     * All interaction state lives in one controller so that the mouse routing
     * is explicit and there is exactly one source of truth for x/y/scale/rotation.
     */
    function createSquareController(svgRoot, square) {
        const degreesToRadians = (degrees) => degrees * Math.PI / 180;
        const radiansToDegrees = (radians) => radians * 180 / Math.PI;
        const clampMin = (value, min) => Math.max(value, min);
        const copyTransform = (transform) => ({
            cx: transform.cx,
            cy: transform.cy,
            size: transform.size,
            rotation: transform.rotation,
        });
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
        const rotateVector = (vector, angleDegrees) => {
            const angleRadians = degreesToRadians(angleDegrees);
            const cosine = Math.cos(angleRadians);
            const sine = Math.sin(angleRadians);
            return {
                x: (vector.x * cosine) - (vector.y * sine),
                y: (vector.x * sine) + (vector.y * cosine),
            };
        };
        const inverseRotateVector = (vector, angleDegrees) => {
            return rotateVector(vector, -angleDegrees);
        };
        const eventToSvgPoint = (event) => {
            const svgPoint = svgRoot.point(event.clientX, event.clientY);
            return { x: svgPoint.x, y: svgPoint.y };
        };
        const eventToClientPoint = (event) => ({
            x: event.clientX,
            y: event.clientY,
        });
        const normalizedDegrees = (degrees) => {
            let normalized = degrees;
            while (normalized <= -180) {
                normalized += 360;
            }
            while (normalized > 180) {
                normalized -= 360;
            }
            return normalized;
        };
        const angleFromTopDegrees = (point, center) => {
            // atan2 treats the positive X axis (3 o'clock) as 0 degrees.
            // The rotation handle lives at 12 o'clock, so shift by +90 degrees.
            return radiansToDegrees(Math.atan2(point.y - center.y, point.x - center.x)) + 90;
        };

        // Corner order stays consistent across math, hit-testing, and handle rendering.
        const cornerSigns = [
            { x: -1, y: -1 }, // top-left
            { x: 1, y: -1 },  // top-right
            { x: 1, y: 1 },   // bottom-right
            { x: -1, y: 1 },  // bottom-left
        ];

        const config = {
            minSize: squareSizeMin,
            cornerHandleRadius: 8,
            rotationHandleRadius: 9,
            rotationHandleOffset: 28,
            bodyHitSlop: 2,
            handleHitSlop: 4,
        };

        // These overlay elements are purely visual. Hit-testing is math-based so
        // that rotated shapes behave correctly even if the handles are small.
        const overlay = svgRoot.group().attr({ "pointer-events": "none" });
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
            mode: "idle", // "follow" | "idle" | "translate" | "scale" | "rotate"
            transform: {
                cx: canvasSize / 2,
                cy: canvasSize / 2,
                size: defaultSquareSize,
                rotation: 0,
            },
            pointer: { x: canvasSize / 2, y: canvasSize / 2 },
            activeHandle: null,
            dragStart: null,
        };

        function readTransformFromSquare() {
            const transformedBounds = square.rbox(svgRoot);
            const localBounds = square.bbox();
            const screenMatrix = square.node.getScreenCTM();
            const rotation = radiansToDegrees(Math.atan2(0 - screenMatrix.c, screenMatrix.d));

            return {
                cx: transformedBounds.cx,
                cy: transformedBounds.cy,
                size: localBounds.width,
                rotation,
            };
        }

        function getCornerPositions(transform = state.transform) {
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

        function getTopMidpoint(transform = state.transform) {
            const rotatedTop = rotateVector({ x: 0, y: -(transform.size / 2) }, transform.rotation);
            return {
                x: transform.cx + rotatedTop.x,
                y: transform.cy + rotatedTop.y,
            };
        }

        function getRotationHandlePosition(transform = state.transform) {
            const rotatedOffset = rotateVector(
                { x: 0, y: -((transform.size / 2) + config.rotationHandleOffset) },
                transform.rotation
            );
            return {
                x: transform.cx + rotatedOffset.x,
                y: transform.cy + rotatedOffset.y,
            };
        }

        function isPointInsideBody(point, transform = state.transform) {
            const vectorFromCenter = {
                x: point.x - transform.cx,
                y: point.y - transform.cy,
            };
            const localPoint = inverseRotateVector(vectorFromCenter, transform.rotation);
            const halfSize = transform.size / 2;
            return Math.abs(localPoint.x) <= (halfSize + config.bodyHitSlop)
                && Math.abs(localPoint.y) <= (halfSize + config.bodyHitSlop);
        }

        function hitTest(point, transform = state.transform) {
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

            if (isPointInsideBody(point, transform)) {
                return { type: "body" };
            }

            return null;
        }

        function renderOverlay() {
            const shouldShowOverlay = state.mode !== "follow";
            overlay.opacity(shouldShowOverlay ? 1 : 0);

            const corners = getCornerPositions();
            for (let index = 0; index < corners.length; index += 1) {
                const start = corners[index];
                const end = corners[(index + 1) % corners.length];
                outlineEdges[index].plot(start.x, start.y, end.x, end.y);
                cornerHandles[index].center(start.x, start.y);
            }

            const topMidpoint = getTopMidpoint();
            const rotateHandlePoint = getRotationHandlePosition();
            rotationStem.plot(topMidpoint.x, topMidpoint.y, rotateHandlePoint.x, rotateHandlePoint.y);
            rotationHandle.center(rotateHandlePoint.x, rotateHandlePoint.y);
        }

        function renderSquare() {
            // Render from the canonical state directly. This avoids reading back any live
            // transformed bbox values during interaction, which prevents feedback loops.
            const topLeftX = state.transform.cx - (state.transform.size / 2);
            const topLeftY = state.transform.cy - (state.transform.size / 2);
            square.size(state.transform.size, state.transform.size);
            square.move(topLeftX, topLeftY);
            square.transform({
                rotate: state.transform.rotation,
                ox: state.transform.cx,
                oy: state.transform.cy,
            });
            renderOverlay();
            updateCursor();
        }

        function updateCursor() {
            let cursor = "default";

            if (state.mode === "follow") {
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

            svgRoot.node.style.cursor = cursor;
        }

        function setPointerFromEvent(event) {
            state.pointer = eventToSvgPoint(event);
        }

        function startFollowMode() {
            state.mode = "follow";
            state.activeHandle = null;
            state.dragStart = null;
            renderSquare();
        }

        function syncFromSquareAndFollow() {
            state.transform = readTransformFromSquare();
            startFollowMode();
        }

        function cancelInteraction() {
            state.mode = "idle";
            state.activeHandle = null;
            state.dragStart = null;
            renderSquare();
        }

        function beginTranslation(pointer) {
            state.mode = "translate";
            state.dragStart = {
                startMouseClient: eventToClientPoint(pointer.event),
                transform: copyTransform(state.transform),
            };
            renderSquare();
        }

        function beginRotation(pointer) {
            state.mode = "rotate";
            state.dragStart = {
                startMouseClient: eventToClientPoint(pointer.event),
                transform: copyTransform(state.transform),
                startPointerAngleDegrees: angleFromTopDegrees(pointer.svg, {
                    x: state.transform.cx,
                    y: state.transform.cy,
                }),
            };
            renderSquare();
        }

        function beginScaling(pointer, cornerIndex) {
            const corners = getCornerPositions(state.transform);
            const anchorIndex = (cornerIndex + 2) % 4;

            state.mode = "scale";
            state.activeHandle = cornerIndex;
            state.dragStart = {
                startMouseClient: eventToClientPoint(pointer.event),
                transform: copyTransform(state.transform),
                cornerIndex,
                anchorCorner: corners[anchorIndex],
                diagonalDirection: {
                    x: cornerSigns[cornerIndex].x / Math.SQRT2,
                    y: cornerSigns[cornerIndex].y / Math.SQRT2,
                },
            };
            renderSquare();
        }

        function updateFollow(pointer) {
            state.transform.cx = pointer.x;
            state.transform.cy = pointer.y;
            renderSquare();
        }

        function updateTranslation(pointer) {
            const startMouseSvg = eventToSvgPoint({
                clientX: state.dragStart.startMouseClient.x,
                clientY: state.dragStart.startMouseClient.y,
            });
            const dx = pointer.svg.x - startMouseSvg.x;
            const dy = pointer.svg.y - startMouseSvg.y;

            state.transform.cx = state.dragStart.transform.cx + dx;
            state.transform.cy = state.dragStart.transform.cy + dy;
            renderSquare();
        }

        function updateRotation(pointer) {
            const centerAtStart = {
                x: state.dragStart.transform.cx,
                y: state.dragStart.transform.cy,
            };
            const currentPointerAngleDegrees = angleFromTopDegrees(pointer.svg, centerAtStart);
            const angleDeltaDegrees = normalizedDegrees(
                currentPointerAngleDegrees - state.dragStart.startPointerAngleDegrees
            );

            state.transform.rotation = state.dragStart.transform.rotation + angleDeltaDegrees;
            renderSquare();
        }

        function updateScaling(pointer) {
            const cornerIndex = state.dragStart.cornerIndex;
            const anchorCorner = state.dragStart.anchorCorner;
            const startTransform = state.dragStart.transform;
            const anchorToMouse = subtractPoints(pointer.svg, anchorCorner);
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

            state.transform.rotation = startTransform.rotation;
            state.transform.size = newSize;
            state.transform.cx = newCenter.x;
            state.transform.cy = newCenter.y;
            renderSquare();
        }

        function onMouseDown(event) {
            if (event.button !== 0) {
                return;
            }

            event.preventDefault();
            setPointerFromEvent(event);

            if (state.mode === "follow") {
                state.transform.cx = state.pointer.x;
                state.transform.cy = state.pointer.y;
                state.mode = "idle";
                renderSquare();
                return;
            }

            if (state.mode !== "idle") {
                return;
            }

            const hit = hitTest(state.pointer);
            if (!hit) {
                return;
            }

            if (hit.type === "body") {
                beginTranslation({ event, svg: state.pointer });
            }
            else if (hit.type === "corner") {
                beginScaling({ event, svg: state.pointer }, hit.index);
            }
            else if (hit.type === "rotate") {
                beginRotation({ event, svg: state.pointer });
            }
        }

        function onMouseMove(event) {
            const pointer = {
                client: eventToClientPoint(event),
                svg: eventToSvgPoint(event),
            };
            state.pointer = pointer.svg;

            if (state.mode === "follow") {
                updateFollow(pointer.svg);
                return;
            }

            if (state.mode === "translate") {
                event.preventDefault();
                updateTranslation(pointer);
                return;
            }

            if (state.mode === "rotate") {
                event.preventDefault();
                updateRotation(pointer);
                return;
            }

            if (state.mode === "scale") {
                event.preventDefault();
                updateScaling(pointer);
                return;
            }

            updateCursor();
        }

        function onMouseUp(event) {
            if (event.button !== 0) {
                return;
            }

            if (state.mode === "translate" || state.mode === "rotate" || state.mode === "scale") {
                state.mode = "idle";
                state.activeHandle = null;
                state.dragStart = null;
                renderSquare();
            }
        }

        svgRoot.on("mousedown", onMouseDown);
        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);

        state.transform = readTransformFromSquare();
        renderSquare();

        return {
            enterFollowMode: syncFromSquareAndFollow,
            cancelInteraction,
            getTransform: () => copyTransform(state.transform),
        };
    }

    const controller = createSquareController(svg, box);

    // Each trial task starts with the engine's random size/rotation, then phase 1
    // takes over and binds that square to the cursor until the first drop click.
    trial.addEventListener("newTask", () => {
        controller.enterFollowMode();
    });

    trial.addEventListener("stop", () => {
        controller.cancelInteraction();
    });
});
