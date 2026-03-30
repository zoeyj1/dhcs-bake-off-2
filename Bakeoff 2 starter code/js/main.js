// This constant sets the number of tasks per trial. You can change it while you are experimenting,
// but it should be set back to 10 for the actual Bakeoff.
const tasksLength = 10;

window.addEventListener("load", () => {
    const trial = new Trial(tasksLength, "teamName", true);

    const applicationArea = document.getElementById("applicationArea");
    const applicationControls = document.createElement("aside");
    applicationControls.id = "applicationControls";
    applicationArea.appendChild(applicationControls);

    const submitButton = document.createElement("button");
    submitButton.innerText = "yes, that looks good";
    submitButton.className = "submit-button";
    submitButton.addEventListener("click", () => {
        trial.submitPosition();
    });
    applicationControls.appendChild(submitButton);

    const strategyPanel = document.createElement("section");
    strategyPanel.id = "strategyPanel";
    applicationControls.appendChild(strategyPanel);

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

    const summaryPanel = document.createElement("section");
    summaryPanel.id = "summaryPanel";
    summaryPanel.className = "hidden";
    applicationControls.appendChild(summaryPanel);

    const summaryHeading = document.createElement("h3");
    summaryHeading.innerText = "Trial Summary";
    summaryPanel.appendChild(summaryHeading);

    const summaryBody = document.createElement("p");
    summaryBody.id = "summaryBody";
    summaryPanel.appendChild(summaryBody);

    const applicationElements = trial.getElements();
    const svg = applicationElements.svg;
    const box = applicationElements.box;
    const boxGroup = box.parent();

    // START: Grid Marking Feature

    // Draw bolder lines on top of the existing grid
    // Thickest lines
    [150, 300, 450].forEach(pos => {
        svg.line(0, pos, 600, pos).stroke({ width: 2, color: "#666" });
        svg.line(pos, 0, pos, 600).stroke({ width: 2, color: "#666" });
    });

    // 2-square boundaries
    [75, 225, 375, 525].forEach(pos => {
        svg.line(0, pos, 600, pos).stroke({ width: 0.7, color: "#666" });
        svg.line(pos, 0, pos, 600).stroke({ width: 0.7, color: "#666" });
    });

    box.fill("#11eaea");
    box.stroke({ width: 2, color: "#0a7c7c" });
    boxGroup.front();


    // Add the mark button
    const markButton = document.createElement("button");
    markButton.innerText = "Mark Lines";
    markButton.className = "submit-button";
    applicationControls.appendChild(markButton);

    const gridPositions = [];
    for (let i = 1; i < 32; i++) {
        gridPositions.push(Math.round(600 / 32 * i));
    }

    const closestPosition = (value) => {
        return gridPositions.reduce((a, b) => Math.abs(b - value) < Math.abs(a - value) ? b : a);
    };

    let drawLinesContent = {
      markingMode: null, // null, "vertical", "horizontal", "complete"
      verticalLine: null,
      horizontalLine: null
    }

    const previewLine = svg.line(0, 0, 0, 0)
        .stroke({ width: 1.5, color: "red", dasharray: "6,4" })
        .opacity(0);

    const placedLines = svg.group();
    boxGroup.front();

    markButton.addEventListener("click", () => {
        if (drawLinesContent.markingMode !== null) {
            drawLinesContent.markingMode = null;
            previewLine.opacity(0);
            markButton.innerText = "Mark Lines";
            return;
        }
        drawLinesContent.verticalLine?.remove();
        drawLinesContent.verticalLines = null;
        drawLinesContent.horizontalLine?.remove();
        drawLinesContent.horizontalLines = null;
        drawLinesContent.markingMode = "vertical";
        markButton.innerText = "Cancel Marking";
    });

    svg.on("mousemove", (event) => {
        if (!drawLinesContent.markingMode) return;
        const point = svg.point(event.clientX, event.clientY);

        if (drawLinesContent.markingMode === "vertical") {
            const x = closestPosition(point.x);
            previewLine.plot(x, 0, x, 600).stroke({ color: "red", dasharray: "6,4" }).opacity(1);
        } else if (drawLinesContent.markingMode === "horizontal") {
            const y = closestPosition(point.y);
            previewLine.plot(0, y, 600, y).stroke({ color: "#2255ff", dasharray: "6,4" }).opacity(1);
        }
    });


    svg.on("click", (event) => {
        if (!drawLinesContent.markingMode) return;
        const point = svg.point(event.clientX, event.clientY);

        if (drawLinesContent.markingMode === "vertical") {
            const x = closestPosition(point.x);
            drawLinesContent.verticalLine = svg.line(x, 0, x, 600).stroke({ width: 1.5, color: "red" });
            drawLinesContent.markingMode = "horizontal";
            previewLine.stroke({ color: "#2255ff", dasharray: "6,4" });
        } else if (drawLinesContent.markingMode === "horizontal") {
            const y = closestPosition(point.y);
            drawLinesContent.horizontalLine = svg.line(0, y, 600, y).stroke({ width: 1.5, color: "#2255ff" });
            drawLinesContent.markingMode = null;
            previewLine.opacity(0);
            markButton.innerText = "Mark Lines";
        // } else if (drawLinesContent.markingMode === "complete") {
        //   drawLinesContent.markingMode = "vertical";
        //   drawLinesContent.verticalLine.remove();
        //   drawLinesContent.verticalLine = null;
        //   drawLinesContent.horizontalLine.remove();
        //   drawLinesContent.horizontalLine = null;
        }

        boxGroup.front();
    });

    // END: Grid Marking Feature





    const copyTransform = (transform) => ({
        cx: transform.cx,
        cy: transform.cy,
        size: transform.size,
        rotation: transform.rotation,
    });
    const clampMin = (value, min) => Math.max(value, min);
    const degreesToRadians = (degrees) => degrees * Math.PI / 180;
    const radiansToDegrees = (radians) => radians * 180 / Math.PI;
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
    const eventToSvgPoint = (event) => {
        const svgPoint = svg.point(event.clientX, event.clientY);
        return { x: svgPoint.x, y: svgPoint.y };
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
    let completedTrialSummaryVisible = false;

    function applyTransform(nextTransform) {
        transformState = copyTransform(nextTransform);
        box.untransform();
        box.size(transformState.size, transformState.size);
        box.center(0, 0);
        box.rotate(transformState.rotation, 0, 0);
        boxGroup.cx(transformState.cx).cy(transformState.cy);

        if (activeStrategy && typeof activeStrategy.refresh === "function") {
            activeStrategy.refresh();
        }
    }

    function syncTransformFromBox() {
        applyTransform(readTransformFromBox());
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

    function hideTrialSummary() {
        completedTrialSummaryVisible = false;
        summaryPanel.classList.add("hidden");
    }

    function showTrialSummary() {
        const entries = trial.trialData || [];
        if (!entries.length) {
            summaryBody.innerText = "No task data was recorded.";
            summaryPanel.classList.remove("hidden");
            completedTrialSummaryVisible = true;
            return;
        }

        const totals = entries.reduce((running, entry) => {
            running.time += entry.time;
            running.distance += entry.score.distanceFactor;
            running.scale += entry.score.scaleFactor;
            running.rotation += entry.score.rotationFactor;
            return running;
        }, { time: 0, distance: 0, scale: 0, rotation: 0 });

        const count = entries.length;
        const averageTimeMs = totals.time / count;
        const averageDistance = totals.distance / count;
        const averageScale = totals.scale / count;
        const averageRotation = totals.rotation / count;

        summaryBody.innerText =
            `Tasks completed: ${count}\n` +
            `Average time: ${(averageTimeMs / 1000).toFixed(2)} s\n` +
            `Average distance factor: ${averageDistance.toFixed(3)}\n` +
            `Average scale factor: ${averageScale.toFixed(3)}\n` +
            `Average rotation factor: ${averageRotation.toFixed(3)}`;
        summaryPanel.classList.remove("hidden");
        completedTrialSummaryVisible = true;
        console.log("Trial summary:", {
            tasksCompleted: count,
            averageTimeMs,
            averageDistanceFactor: averageDistance,
            averageScaleFactor: averageScale,
            averageRotationFactor: averageRotation,
        });
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


    // i tried so hard to modify my code to your patterns but i am not that good of a programmer man.
    // we're (i'm) cooked
    function createThreeClickStrategy() {
      // copied from 2 clicks, idrk whats happening here
      const panel = document.createElement("div");
      panel.className = "strategy-help hidden";
      panel.innerText = "Three-Click: 1. Click first corner. 2. Click adjacent corner. 3. Move mouse to flip side 4. click to finish.";
      strategyControlsHost.appendChild(panel);

      // state machine
      const state = {
          active: false,
          phase: "idle", // idle | first-point | second-point
          p1: null,
          p2: null,
          line: null,
          dot: [],
      };

      // basically, if no dots exist, draw one
      // if one dot exist, draw a line from said dot to mouse
      // if a line exists, draw the box
      function onMouseDown(event) {
        if (!state.active || event.button !== 0) return;
        
        const point = svg.point(event.clientX, event.clientY)

        if (state.phase === "idle") {
            state.p1 = point;
            state.phase = "first-point";
            let dot = svg.circle(4).center(state.p1.x, state.p1.y).fill('#ff0000');
            state.dot.push(dot);
            box.opacity(0.3).size(0, 0);
            return;
        }
        
        if (state.phase === "first-point") {
            state.p2 = point;
            let dot = svg.circle(4).center(state.p2.x, state.p2.y).fill('#ff0000');
            state.line.remove();
            state.line = svg.line(state.p1.x, state.p1.y, state.p2.x, state.p2.y).stroke({ width: 2, color: '#3300ff' });
            state.phase = "second-point";
            state.dot.push(dot);
            return;
        }

        if (state.phase === "second-point") {
            console.log("????");
            state.phase = "idle";
            state.p1 = null;
            state.p2 = null;
            state.line.remove();
            state.dot.forEach(d => d.remove());
            state.dot = [];
            box.fill("#00ff59").opacity(1);
            // box.draggable(true); // causeing problems i thinks, so i turn it off, dont really think users will want to use anyways
        }
    }

    // if there exdists a first point, draw a line from said point to cursor
    // if a line exists then figure out which side the user wants the box via mouse hover
    function onMouseMove(event) {
        if (!state.active || state.phase === "idle") return;

        const pointer = eventToSvgPoint(event);

        if (state.phase === "first-point") {
            const dx = pointer.x - state.p1.x;
            const dy = pointer.y - state.p1.y;
            const angle = Math.atan2(dy, dx) * (180 / Math.PI);
            const sideLength = Math.sqrt(dx * dx + dy * dy);
            state.line?.remove();
            state.line = svg.line(state.p1.x, state.p1.y, pointer.x, pointer.y).stroke({ width: 2, color: '#9000ff' }).opacity(0.5);
        }

        if (state.phase === "second-point") {
            const dx = state.p2.x - state.p1.x;
            const dy = state.p2.y - state.p1.y;
            const angle = Math.atan2(dy, dx) * (180 / Math.PI);
            const sideLength = Math.sqrt(dx * dx + dy * dy);

            // using cross product outside of physics and calc 3 goes hard
            // core memeory made right here lmao
            // right hand rule but opposite because the canvas y direction is weird as it typically is
            const val = (state.p2.x - state.p1.x) * (pointer.y - state.p1.y) - 
                        (pointer.x - state.p1.x) * (state.p2.y - state.p1.y);

            if (val > 0) {
                box.size(sideLength, sideLength)
               .move(state.p1.x, state.p1.y)
               .transform({ rotate: angle, 
                            origin: [state.p1.x, state.p1.y] });
            } else {
                            box.size(sideLength, sideLength)
               .move(state.p1.x, state.p1.y)
               .transform({ rotate: angle + 180 + 90, 
                            origin: [state.p1.x, state.p1.y]});
            }
        }
    }

    // copied from above
    // hands in the air, i don't know enough about the design of this file or js
    return {
        activate() {
            hideStrategyControls();
            panel.classList.remove("hidden");
            state.active = true;
            state.phase = "idle";
            svg.on("mousedown.threeclick", onMouseDown);
            window.addEventListener("mousemove", onMouseMove);
        },
        deactivate() {
            state.active = false;
            panel.classList.add("hidden");
            svg.off("mousedown.threeclick");
            window.removeEventListener("mousemove", onMouseMove);
        },
        refresh() {}
    };
    
  }


    const strategies = {
        twoClick: createTwoClickStrategy(),
        threeClick: createThreeClickStrategy(),
    };

    const strategyList = [
        { id: "twoClick", label: "Two-Click Placement" },
        { id: "threeClick", label: "Three-Click Placement" },
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
        hideTrialSummary();
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

    trial.addEventListener("start", () => {
        hideTrialSummary();
    });

    trial.addEventListener("newTask", () => {
        resetTaskSelectionState();
    });

    trial.addEventListener("testOver", () => {
        setStatus("Trial complete. Review the summary below.");
        showTrialSummary();
    });

    trial.addEventListener("stop", () => {
        const statusMessage = completedTrialSummaryVisible
            ? "Trial complete. Start another trial to run again."
            : "Start a trial to choose a strategy.";
        disableStrategySelection(statusMessage);
    });
});
