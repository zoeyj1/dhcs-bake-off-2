// This constant sets the number of tasks per trial. You can change it while you are experimenting,
// but it should be set back to 10 for the actual Bakeoff.
const tasksLength = 10;

window.addEventListener("load", () => {
    const trial = new Trial(tasksLength, "teamHCZ", true);

    // We retrieve the application area element, the whole left side to manipulate.
    const applicationArea = document.getElementById("applicationArea");
    const applicationControls = document.createElement("aside");
    applicationControls.id = "applicationControls";
    applicationArea.appendChild(applicationControls);

    const strategyPanel = document.createElement("section");// We create a section element to allow the user to select strategies.
    strategyPanel.id = "strategyPanel"; // We set its id and add it to the application area element.
    applicationControls.appendChild(strategyPanel);

    // The following blocks of code create various text elements that label the strategy panel.
    const strategyHeading = document.createElement("h3");
    strategyHeading.innerText = "Choose Strategy";
    strategyPanel.appendChild(strategyHeading);

    const strategyStatus = document.createElement("p");
    strategyStatus.id = "strategyStatus";
    strategyPanel.appendChild(strategyStatus);

    // We create a div to act as a group for all the strategy selection buttons.
    const strategyButtons = document.createElement("div"); 
    strategyButtons.id = "strategyButtons";
    strategyPanel.appendChild(strategyButtons);

    // We create a div to group the strategy controls.
    const strategyControlsHost = document.createElement("div");
    strategyControlsHost.id = "strategyControlsHost";
    strategyPanel.appendChild(strategyControlsHost);  

    const summaryPanel = document.createElement("section"); // We create a summary panel section and add it to the hidden class.
    summaryPanel.id = "summaryPanel"; // come back and explain what summary panel actually is
    summaryPanel.className = "hidden";
    applicationControls.appendChild(summaryPanel);

    // The following blocks of code create various text elements to label the summary section.
    const summaryHeading = document.createElement("h3");
    summaryHeading.innerText = "Trial Summary";
    summaryPanel.appendChild(summaryHeading);

    const summaryBody = document.createElement("p");
    summaryBody.id = "summaryBody";
    summaryPanel.appendChild(summaryBody);

    const applicationElements = trial.getElements(); // We retrieve the elements that allow us to manipulate the left square
    const svg = applicationElements.svg; 
    const box = applicationElements.box;
    const boxGroup = box.parent();
    

    // Grid marking feature: we iterate through various coordinates to draw lines of varying weights
    // This allows us to increase the contrast between different grid lines, allowing the user
    // to track where to click more easily.
    // Draws the thickest, 4-square boundaries
    [150, 300, 450].forEach(pos => {
        svg.line(0, pos, 600, pos).stroke({ width: 2, color: "#666" });
        svg.line(pos, 0, pos, 600).stroke({ width: 2, color: "#666" });
    });

    // Draws the medium-weight, 2-square boundaries
    [75, 225, 375, 525].forEach(pos => {
        svg.line(0, pos, 600, pos).stroke({ width: 0.7, color: "#666" });
        svg.line(pos, 0, pos, 600).stroke({ width: 0.7, color: "#666" });
    });

    // We set the color and border of the square to manipulate.
    box.fill("#11eaea");
    box.stroke({ width: 2, color: "#0a7c7c" });
    boxGroup.front(); // This changes the order such that the grid lines are drawn behind the square.


    // Create a button to allow the user to mark lines.
    const markButton = document.createElement("button");
    markButton.innerText = "Mark Lines";
    markButton.className = "mark-button"; // Set its class to mark button
    applicationControls.appendChild(markButton);

    const gridPositions = []; // We create an array to store the positions of the grid lines
    for (let i = 1; i < 32; i++) {
        gridPositions.push(Math.round(600 / 32 * i)); 
    }

    // This is a helper function that finds the closest grid line the user's cursor.
    const closestPosition = (value) => {
        return gridPositions.reduce((a, b) => Math.abs(b - value) < Math.abs(a - value) ? b : a);
    };

    let drawLinesContent = {
      markingMode: null, // null, "vertical", "horizontal", "complete"
      verticalLine: null,
      horizontalLine: null
    }

    // displays a preview line based on the closest line the user is hovering over
    const previewLine = svg.line(0, 0, 0, 0)
        .stroke({ width: 1.5, color: "red", dasharray: "6,4" })
        .opacity(0);

    boxGroup.front(); // moves the square to the front as to not be covered

    // when the mark button is clicked, depending on whether or not grid marking is activated,
    // update the button, displayed lines.. etc.
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

    // when the mouse hovers, draw the preview lines for either vertical or horizontal lines.
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


    // when the user clicks, set a line in place from a dashed line to a solid line, for each of the
    // horizontal and vertical cases
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
        }

        boxGroup.front();
    });

    
    const submitButton = document.createElement("button"); // make a submit button element, setting its contents
    submitButton.innerText = "Submit"; 
    submitButton.className = "submit-button"; // we assign it to the class, submit-button
    submitButton.addEventListener("click", () => { 
        trial.submitPosition(); // We add an event listener such that when the submit button is clicked, we call a function that advances to the next trial
    });
    applicationControls.appendChild(submitButton); // Add the submit button as a child to the application area



    /* This creates a copy of a transform so that we don't modify the original. */
    const copyTransform = (transform) => ({
        cx: transform.cx,
        cy: transform.cy,
        size: transform.size,
        rotation: transform.rotation,
    });

    // This prevents the square from getting too small by setting a value to the min if it gets too small.
    const clampMin = (value, min) => Math.max(value, min);

    // This converts between different units of measurement for angles
    const degreesToRadians = (degrees) => degrees * Math.PI / 180;
    const radiansToDegrees = (radians) => radians * 180 / Math.PI;
    
    // Based on angleDegrees, this rotates a 2D vector, returning the new coordinates after rotation.
    const rotateVector = (vector, angleDegrees) => {
        const angleRadians = degreesToRadians(angleDegrees);
        const cosine = Math.cos(angleRadians);
        const sine = Math.sin(angleRadians);
        return {
            x: (vector.x * cosine) - (vector.y * sine),
            y: (vector.x * sine) + (vector.y * cosine),
        };
    };

    // Rotates a vector in the opposite direction
    const inverseRotateVector = (vector, angleDegrees) => rotateVector(vector, -angleDegrees);
    
    // Converts between a mouse event's coordinates to SVG coordinates.
    const eventToSvgPoint = (event) => {
        const svgPoint = svg.point(event.clientX, event.clientY);
        return { x: svgPoint.x, y: svgPoint.y };
    };

    // checks if a point is inside a square
    const isPointInsideSquare = (point, transform) => {
        const vectorFromCenter = {
            x: point.x - transform.cx,
            y: point.y - transform.cy,
        };
        const localPoint = inverseRotateVector(vectorFromCenter, transform.rotation);
        const halfSize = transform.size / 2;
        return Math.abs(localPoint.x) <= halfSize && Math.abs(localPoint.y) <= halfSize;
    };

    // reads the square's current position, size, and rotation from the DOM
    function readTransformFromBox() {
        const transformedBounds = box.rbox(svg); // this gets the x/y position of the square
        const localBounds = box.bbox(); // gets the box's size before any transformations
        const screenMatrix = box.node.getScreenCTM();
        const rotation = radiansToDegrees(Math.atan2(0 - screenMatrix.c, screenMatrix.d));

        return {
            cx: transformedBounds.cx,
            cy: transformedBounds.cy,
            size: localBounds.width,
            rotation,
        };
    }

    // These variables keep track of the square's current state
    let transformState = readTransformFromBox();
    let activeStrategy = null; // the strategy the user selects
    let activeStrategyId = null; 
    let taskReadyForSelection = false; // whether or not the user can currently select a strategy
    let taskStrategyLocked = false; // whether or not they picked a strategy for a task
    let completedTrialSummaryVisible = false; 

    // Applies a transformation (moving, resizing and rotating the square)
    // Note, we clear the old transform first
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

    // syncs the transformState to match the box from the DOM, updating the current state of the square
    function syncTransformFromBox() {
        applyTransform(readTransformFromBox());
    }

    // We call the copyTransform function to modify a copy of the current transform, and not the original
    function getTransform() {
        return copyTransform(transformState);
    }

    // We update the status message that gives the user instructions
    function setStatus(message) {
        strategyStatus.innerText = message;
    }

    // This creates buttons for selecting strategies (Two-Clicks and Three-Clicks)
    function createStrategyButton(id, label) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "strategy-button";
        button.innerText = label;
        button.addEventListener("click", () => {
            if (!taskReadyForSelection || taskStrategyLocked) {
                return; // If we're currently not selecting a strategy or if we already picked a strategy, do nothing
            }

            syncTransformFromBox();
            if (activeStrategy) {
                activeStrategy.deactivate(); // reset by deactivating the old strategy
            }

            // update relevant variables and activate the selected strategy
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

    // This updates the appearance of strategy buttons based on the current state
    function updateStrategyButtons() {
        strategyList.forEach((strategy) => {
            const isActive = strategy.id === activeStrategyId;
            strategy.button.disabled = !taskReadyForSelection || taskStrategyLocked;
            strategy.button.classList.toggle("active", isActive);
            strategy.button.setAttribute("aria-pressed", isActive ? "true" : "false");
        });
    }

    // This function hides strategy-specific information
    function hideStrategyControls() {
        Array.from(strategyControlsHost.children).forEach((child) => {
            child.classList.add("hidden");
        });
    }

    // This function hides the summary panel at the end of a trial.
    function hideTrialSummary() {
        completedTrialSummaryVisible = false;
        summaryPanel.classList.add("hidden");
    }

    // Displays the summary panel with scores after a trial.
    function showTrialSummary() {
        const entries = trial.trialData || [];
        if (!entries.length) {
            summaryBody.innerText = "No task data was recorded.";
            summaryPanel.classList.remove("hidden");
            completedTrialSummaryVisible = true;
            return;
        }

        // Update the scores from all the tasks
        const totals = entries.reduce((running, entry) => {
            running.time += entry.time;
            running.distance += entry.score.distanceFactor;
            running.scale += entry.score.scaleFactor;
            running.rotation += entry.score.rotationFactor;
            return running;
        }, { time: 0, distance: 0, scale: 0, rotation: 0 });

        // These calculate the average metrics so that we can display them in the summary.
        const count = entries.length;
        const averageTimeMs = totals.time / count;
        const averageDistance = totals.distance / count;
        const averageScale = totals.scale / count;
        const averageRotation = totals.rotation / count;

        // This displays the text displaying the summary metrics.
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

    // This function encompasses all the code for our 2-clicks strategy.
    function createTwoClickStrategy() {
        // Create the help text panel that tells the user what to do
        const panel = document.createElement("div");
        panel.className = "strategy-help hidden";
        panel.innerText = "Two-Click Placement: click once to set a corner, move the mouse to size and rotate, click again to place, then drag to reposition.";
        strategyControlsHost.appendChild(panel);

        // Reset button so the user can start over if their clicks are off
        const resetButton = document.createElement("button");
        resetButton.innerText = "Reset";
        resetButton.className = "reset-button hidden";
        strategyControlsHost.appendChild(resetButton);

        // When reset is clicked, set the phase to idle and hide the square
        resetButton.addEventListener("click", () => {
            state.phase = "idle";
            state.center = null;
            state.dragStart = null;
            box.opacity(0);
            resetButton.classList.add("hidden");
        });

        // Tracks what phase we're in within the 2-clicks strateg 
        const state = {
            active: false,
            phase: "idle", // These are the phases: idle | choosing-corner | placed | dragging
            center: null,  // where the user first clicked, which would be the pinned corner
            dragStart: null, // stores info needed to drag the placed square
        };

        // Given the pinned corner and current mouse position, figures out where
        // the center should be and how big/rotated the square should be
        function computePreviewTransform(corner, pointer) {
            const dx = pointer.x - corner.x;
            const dy = pointer.y - corner.y;
            const rotation = radiansToDegrees(Math.atan2(dy, dx)) - 45;
            return {
                cx: corner.x + dx / 2, 
                cy: corner.y + dy / 2,
                size: clampMin(Math.hypot(dx, dy) / Math.SQRT2, squareSizeMin), 
                rotation,
            };
        }

        // This details what happens when the user clicks
        function onMouseDown(event) {
            if (!state.active || event.button !== 0) return;
            if (drawLinesContent.markingMode !== null) return; // so that it doesn't interfere with mark lines mode

            event.preventDefault();
            const pointer = eventToSvgPoint(event);

            // On the first click, pin the corner and wait for mouse movement to display the translucent preview square
            if (state.phase === "idle") {
                box.opacity(0); 
                state.center = pointer;
                state.phase = "choosing-corner";
                return;
            }

            // Second click: set in place the current preview as the final placement
            if (state.phase === "choosing-corner") {
                applyTransform(computePreviewTransform(state.center, pointer)); 
                state.center = null;
                state.phase = "placed";
                box.opacity(1);
                resetButton.classList.remove("hidden"); // display reset button
                return;
            }

            // If the square is placed and the user clicks inside it, start dragging
            if (state.phase === "placed" && isPointInsideSquare(pointer, getTransform())) {
                state.phase = "dragging";
                state.dragStart = {
                    startMouse: pointer,
                    transform: getTransform(),
                };
            }
        }

        function onMouseMove(event) {
            if (!state.active) return;

            const pointer = eventToSvgPoint(event);

            // This updates the preview square to update as your cursor moves, when choosing a second point.
            if (state.phase === "choosing-corner" && state.center) {
                box.opacity(0.55); // show a translucent preview
                applyTransform(computePreviewTransform(state.center, pointer));
                return;
            }

            // While dragging, move the square by however much the mouse has moved
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

        // When mouse is released, stop dragging and go back to placed
        function onMouseUp(event) {
            if (!state.active || event.button !== 0) return;

            if (state.phase === "dragging") {
                state.phase = "placed";
                state.dragStart = null;
            }
        }

        return {
            // Called when the user selects this strategy, reset everything up fresh
            activate() {
                hideStrategyControls();
                panel.classList.remove("hidden");
                state.active = true;
                state.phase = "idle";
                state.center = null;
                state.dragStart = null;
                box.opacity(0); 
                resetButton.classList.remove("hidden");
                svg.on("mousedown.twoclick", onMouseDown);
                window.addEventListener("mousemove", onMouseMove);
                window.addEventListener("mouseup", onMouseUp);
            },
            // When we switch to the other strategy, this is called to clean everything up and reset everything
            deactivate() {
                state.active = false;
                state.phase = "idle";
                state.center = null;
                state.dragStart = null;
                panel.classList.add("hidden");
                box.opacity(1);
                resetButton.classList.add("hidden");
                svg.off("mousedown.twoclick");
                window.removeEventListener("mousemove", onMouseMove);
                window.removeEventListener("mouseup", onMouseUp);
            },
            refresh() {
            },
        };
    }


    // i tried so hard to modify my code to your patterns but i am not that good of a programmer man.
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
        if (drawLinesContent.markingMode !== null) return;  
        
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

    // if there exists a first point, draw a line from said point to cursor
    // if a line exists then figure out which side the user wants the box via mouse hover
    function onMouseMove(event) {
        if (!state.active || state.phase === "idle") return;

        const pointer = eventToSvgPoint(event);

        if (state.phase === "first-point") {
            const dx = pointer.x - state.p1.x;
            const dy = pointer.y - state.p1.y;
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
            state.phase = "idle";
            state.p1 = null;
            state.p2 = null;
            state.line?.remove(); state.line = null;
            state.dot.forEach(d => d.remove()); state.dot = [];
            box.fill("#11eaea").opacity(0);  // restore original color and hide
            panel.classList.add("hidden");
            svg.off("mousedown.threeclick");
            window.removeEventListener("mousemove", onMouseMove);
        },
        refresh() {}
    };
    
  }


    // Create both strategy objects and store them
    const strategies = {
        twoClick: createTwoClickStrategy(),
        threeClick: createThreeClickStrategy(),
    };

    // Create a list of strategies with their labels, which helps in creating the buttons
    const strategyList = [
        { id: "twoClick", label: "Two-Click Placement" },
        { id: "threeClick", label: "Three-Click Placement" },
    ];

    // Create a button for each strategy
    strategyList.forEach((strategy) => {
        strategy.button = createStrategyButton(strategy.id, strategy.label);
    });

    // Deactivates the current strategy and clears any active strategy
    function deactivateActiveStrategy() {
        if (activeStrategy) {
            activeStrategy.deactivate();
        }
        activeStrategy = null;
        activeStrategyId = null;
    }

    // resets everything so the user can pick a fresh strategy
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

    // Deactivates functionality to select strategy and shows a message 
    function disableStrategySelection(message) {
        deactivateActiveStrategy();
        hideStrategyControls();
        taskReadyForSelection = false;
        taskStrategyLocked = false;
        setStatus(message);
        updateStrategyButtons();
    }

    // Apply the initial transform so the square shows up on load
    applyTransform(transformState);
    disableStrategySelection("Start a trial to choose a strategy.");

    // Hide the summary whenever a new trial starts
    trial.addEventListener("start", () => {
        hideTrialSummary();
    });

    // Reset the UI for each new task
    trial.addEventListener("newTask", () => {
        resetTaskSelectionState();
    });

    // When all tasks are done, show the summary
    trial.addEventListener("testOver", () => {
        setStatus("Trial complete. Review the summary below.");
        showTrialSummary();
    });

    // When the trial stops, disable strategy selection and show a message
    trial.addEventListener("stop", () => {
        const statusMessage = completedTrialSummaryVisible
            ? "Trial complete. Start another trial to run again."
            : "Start a trial to choose a strategy.";
        disableStrategySelection(statusMessage);
    });
});
