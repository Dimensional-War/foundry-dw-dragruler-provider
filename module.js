Hooks.once("dragRuler.ready", SpeedProvider => {
  class DwDragRuler extends SpeedProvider {
    get colors() {
      return [
        { id: "walk", default: 0x00ff00, name: "Walking" },
        { id: "run", default: 0xff8000, name: "Running" }
      ];
    }
    getSpeedAttribute(token) {
      const burrowingSpeed = Number(token.actor.system.props.burrowingSpeed);
      const acrobaticsSpeed = Number(token.actor.system.props.acrobaticsSpeed);
      const swimmingSpeed = Number(token.actor.system.props.swimmingSpeed);
      const flyingSpeed = Number(token.actor.system.props.flyingSpeed);

      const speedAttributes = {
        burrowingSpeed,
        acrobaticsSpeed,
        swimmingSpeed,
        flyingSpeed
      };

      const states = token.actor.getFlag("dw-dragruler-provider", "states") || {
        burrowingSpeed: false,
        acrobaticsSpeed: false,
        swimmingSpeed: false,
        flyingSpeed: false
      };
      let state = Object.keys(states).find(st => {
        return states[st];
      });
      let attribute = this.getSetting("speedAttribute");
      let attributePopped = attribute.split(".");
      attributePopped.shift();
      attributePopped = attributePopped.join(".");
      let base = Number(getProperty(token, attributePopped));
      if (typeof state !== "undefined") {
        attribute = `actor.system.props.${state}`;
        base = speedAttributes[state];
      }
      return {
        attribute,
        base
      };
    }
    getRanges(token) {
      const baseSpeed = this.getSpeedAttribute(token).base;
      // A character can always walk it's base speed and dash twice it's base speed
      const ranges = [
        { range: baseSpeed, color: "walk" },
        { range: baseSpeed * 2, color: "run" }
      ];
      return ranges;
    }
    get settings() {
      return [
        {
          id: "speedAttribute",
          name: "drag-ruler.genericSpeedProvider.settings.speedAttribute.name",
          hint: "drag-ruler.genericSpeedProvider.settings.speedAttribute.hint",
          scope: "world",
          config: true,
          type: String,
          default: "token.actor.system.props.walkingSpeed"
        }
      ];
    }
  }
  dragRuler.registerModule("dw-dragruler-provider", DwDragRuler);
});

Hooks.on("renderTokenHUD", (app, html, data) => {
  const movements = [
    { key: "burrowingSpeed", icon: "fa-shovel" },
    { key: "acrobaticsSpeed", icon: "fa-person-running-fast" },
    { key: "swimmingSpeed", icon: "fa-dove" },
    { key: "flyingSpeed", icon: "fa-person-swimming" }
  ];

  html
    .find(".col.middle")
    .after(`<div class="col state-actions"><div class="above"></div></div>`);

  for (const movement of movements) {
    const movementActive =
      app.object.actor.getFlag(
        "dw-dragruler-provider",
        `states.${movement.key}`
      ) || false;
    const movementActiveClass = movementActive ? "active" : "";

    const aboveActions = html.find(".col.state-actions .above");
    const iconHtml = `
        <div class="control-icon ${movementActiveClass}" data-action="${movement.key}" data-button-type="movement-toggle" title="${movement.key}">
          <i class="fas ${movement.icon}"></i>
        </div>
      `;
    const lastIcon = aboveActions.find(".control-icon").last();

    if (aboveActions.has(".control-icon").length === 0) {
      aboveActions.append(iconHtml);
    } else {
      lastIcon.after(iconHtml);
    }
  }

  html.find(`[data-button-type="movement-toggle"]`).click(function () {
    const $this = html.find(this);
    const newStates = app.object.actor.getFlag(
      "dw-dragruler-provider",
      "states"
    ) || {
      burrowingSpeed: false,
      acrobaticsSpeed: false,
      swimmingSpeed: false,
      flyingSpeed: false
    };
    for (const movement of movements) {
      if ($this.data("action") !== movement.key) {
        newStates[movement.key] = false;
      }
    }
    html.find(`[data-action="movement-toggle"]`).removeClass("active");
    $this.toggleClass("active");
    newStates[$this.data("action")] = !newStates[$this.data("action")];
    app.object.actor.setFlag("dw-dragruler-provider", "states", newStates);
  });
});
