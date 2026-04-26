Hooks.once("dragRuler.ready", SpeedProvider => {
  class DwDragRuler extends SpeedProvider {
    get colors() {
      return [
        { id: "walk", default: 0x00ff00, name: "Walking" },
        { id: "dash", default: 0xffff00, name: "Dashing" }
      ];
    }

    /**
     * Get the current movement mode and corresponding speed
     * Speed calculations are delegated to the actor (system)
     * Terrain costs are handled by Foundry v13 Regions + system wrapper
     * Movement mode is read from token.document.movementAction (Foundry v13 native)
     */
    getActiveMovementSpeed(token) {
      const actor = token.actor;
      if (!actor?.system) return { mode: "walk", speed: 30 };

      const flags = actor.system.movementFlags || {};

      // Priority 1: Check permanent movement abilities (flags)
      if (flags.hasFlight) {
        return { mode: "fly", speed: actor.flyingSpeed };
      }

      if (flags.hasTeleport) {
        return { mode: "blink", speed: actor.walkingSpeed };
      }

      if (flags.hasParkour) {
        return { mode: "walk", speed: actor.acrobaticsSpeed };
      }

      // Priority 2: Check token.document.movementAction (set by HUD buttons)
      // Standard values: walk, fly, swim, burrow, crawl, climb, jump, blink
      const movementAction = token.document?.movementAction || "walk";

      switch (movementAction) {
        case "swim":
          return { mode: "swim", speed: actor.swimmingSpeed };

        case "burrow":
          return { mode: "burrow", speed: actor.burrowingSpeed };

        case "climb":
          // Use acrobatics speed for climbing
          return { mode: "climb", speed: actor.acrobaticsSpeed };

        case "crawl":
          // Crawling uses acrobatics at reduced speed
          return {
            mode: "crawl",
            speed: Math.floor(actor.acrobaticsSpeed / 2)
          };

        case "walk":
        default:
          // Walking uses Athletics skill speed
          // Note: Cross-country running terrain ignoring is handled by the system's
          // canvas.grid.measureDistances wrapper, not by the drag ruler provider
          return { mode: "walk", speed: actor.walkingSpeed };
      }
    }

    getRanges(token) {
      const { speed } = this.getActiveMovementSpeed(token);

      // Walking range and dashing range (2x speed)
      return [
        { range: speed, color: "walk" },
        { range: speed * 2, color: "dash" }
      ];
    }
  }

  dragRuler.registerModule("dw-dragruler-provider", DwDragRuler);
  console.log("[DW Drag Ruler] Provider registered for Dimensional War system");
});

/**
 * Add movement mode toggle buttons to Token HUD
 * Uses Foundry v13's native token.document.movementAction property
 */
Hooks.on("renderTokenHUD", (app, html, data) => {
  const token = app.object;
  const actor = token?.actor;
  if (!actor?.system) return;

  // Movement modes that can be toggled (not permanent flags like flight/parkour/teleport)
  const movementModes = [];

  // Add climb if character has acrobatics
  if (actor.acrobaticsSpeed > 0) {
    movementModes.push({
      action: "climb",
      icon: "fa-person-climbing",
      tooltip: `Climb (${actor.acrobaticsSpeed} ft)`
    });
  }

  // Add crawl if character has acrobatics
  if (actor.acrobaticsSpeed > 0) {
    movementModes.push({
      action: "crawl",
      icon: "fa-person-crawling",
      tooltip: `Crawl (${Math.floor(actor.acrobaticsSpeed / 2)} ft)`
    });
  }

  // Add swimming if the character has the skill and speed > 0
  if (actor.swimmingSpeed > 0) {
    movementModes.push({
      action: "swim",
      icon: "fa-person-swimming",
      tooltip: `Swim (${actor.swimmingSpeed} ft)`
    });
  }

  // Add burrowing if the character has the ability and speed > 0
  if (actor.burrowingSpeed > 0) {
    movementModes.push({
      action: "burrow",
      icon: "fa-mountain",
      tooltip: `Burrow (${actor.burrowingSpeed} ft)`
    });
  }

  // Don't add HUD buttons if there are no alternative movement modes
  if (movementModes.length === 0) return;

  // Check if movement column already exists (avoid duplicates)
  if (html.querySelector(`[data-palette="movementActions"]`)) return;

  // Create the movement column
  const middleCol = html.querySelector(".col.middle");
  if (middleCol) {
    const movementCol = document.createElement("div");
    movementCol.className = "col movement-modes";
    const aboveDiv = document.createElement("div");
    aboveDiv.className = "above";
    movementCol.appendChild(aboveDiv);
    middleCol.after(movementCol);
  }

  const aboveContainer = html.querySelector(".col.movement-modes .above");
  if (!aboveContainer) return;

  // Get current movement action from token document (Foundry v13 native)
  const currentAction = token.document?.movementAction || "walk";

  // Add walking mode (always available)
  const walkButton = document.createElement("div");
  walkButton.className = `control-icon ${currentAction === "walk" ? "active" : ""}`;
  walkButton.dataset.action = "walk";
  walkButton.dataset.buttonType = "movement-toggle";
  walkButton.title = `Walk (${actor.walkingSpeed} ft)`;
  walkButton.innerHTML = `<i class="fas fa-person-walking"></i>`;
  aboveContainer.appendChild(walkButton);

  // Add other movement mode buttons
  for (const mode of movementModes) {
    const modeButton = document.createElement("div");
    modeButton.className = `control-icon ${currentAction === mode.action ? "active" : ""}`;
    modeButton.dataset.action = mode.action;
    modeButton.dataset.buttonType = "movement-toggle";
    modeButton.title = mode.tooltip;
    modeButton.innerHTML = `<i class="fas ${mode.icon}"></i>`;
    aboveContainer.appendChild(modeButton);
  }

  // Handle button clicks
  const buttons = html.querySelectorAll(`[data-button-type="movement-toggle"]`);
  buttons.forEach(button => {
    button.addEventListener("click", async function () {
      const clickedAction = this.dataset.action;

      // Remove active class from all buttons
      buttons.forEach(btn => btn.classList.remove("active"));

      // Add active class to clicked button
      this.classList.add("active");

      // Set the movement action on the token document (Foundry v13 native property)
      await token.document.update({ movementAction: clickedAction });

      console.log(`[DW Drag Ruler] Movement action set to: ${clickedAction}`);
    });
  });
});
