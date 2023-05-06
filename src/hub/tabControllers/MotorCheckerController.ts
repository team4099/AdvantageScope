import { TableState, TabState } from "../../shared/HubState";
import LogFieldTree from "../../shared/log/LogFieldTree";
import LoggableType from "../../shared/log/LoggableType";
import TabType from "../../shared/TabType";
import TabController from "../TabController";
import TableController from "./TableController";
import TimelineVizController from "./TimelineVizController";

export default class MotorCheckerController implements TabController {
  private NO_DATA_ALERT: HTMLElement;
  private MOTOR_CONTAINER: HTMLElement;

  private lastDataString: string = "";

  private uiTree: any = {};

  constructor(content: HTMLElement) {
    this.NO_DATA_ALERT = content.getElementsByClassName("tab-prompt")[0] as HTMLElement;
    this.MOTOR_CONTAINER = content.getElementsByClassName("motor-checker-table-container")[0] as HTMLElement;
    this.refresh();
  }

  saveState(): TabState {
    return { type: TabType.MotorChecker };
  }

  restoreState(state: TabState) {}

  getActiveFields(): string[] {
    return ["/RealOutputs", "/AdvantageKit/RealOutputs"];
  }

  periodic() {
    let ntKeys = Object.keys(this.uiTree);
    for (const key of ntKeys) {
      let keyType = window.log.getType(key);
      if (keyType == LoggableType.Number) {
        let ntValue = (window.log.getNumber(key, Infinity, Infinity)?.values.at(-1) || 0.0).toFixed(2) as string;
        this.uiTree[key](ntValue);
      } else if (keyType == LoggableType.String) {
        let ntValue = (window.log.getString(key, Infinity, Infinity)?.values.at(-1) || "") as string;
        console.log(ntValue);
        this.uiTree[key](ntValue);
      } else if (keyType == LoggableType.StringArray) {
        let ntValue = window.log.getStringArray(key, Infinity, Infinity)?.values.at(-1) || [];
        this.uiTree[key](ntValue);
      }
    }
    console.log("_________");
  }

  refresh() {
    let fieldList = window.log.getFieldKeys();
    let tree = window.log.getFieldTree();
    let data: any = {};

    if ("RealOutputs" in tree) {
      let realOutputTable = tree["RealOutputs"].children;
      if ("MotorChecker" in realOutputTable) {
        data = realOutputTable["MotorChecker"];
      }
    }
    if ("NT" in tree) {
      let ntTable = tree["NT"].children;
      if ("AdvantageKit" in ntTable) {
        let akitTable = ntTable["AdvantageKit"].children;
        if ("RealOutputs" in akitTable) {
          let realOutputTable = akitTable["RealOutputs"].children;
          if ("MotorChecker" in realOutputTable) {
            data = realOutputTable["MotorChecker"];
          }
        }
      }
    }
    if ("AdvantageKit" in tree) {
      let akitTable = tree["AdvantageKit"].children;
      if ("RealOutputs" in akitTable) {
        let realOutputTable = akitTable["RealOutputs"].children;
        if ("MotorChecker" in realOutputTable) {
          data = realOutputTable["MotorChecker"];
        }
      }
    }

    let dataString = JSON.stringify(data);

    if (dataString === this.lastDataString || Object.keys(data).length == 0) {
      return;
    }
    this.lastDataString = dataString;

    while (this.MOTOR_CONTAINER.childElementCount > 1) {
      this.MOTOR_CONTAINER.removeChild(this.MOTOR_CONTAINER.lastChild as HTMLElement);
    }

    data = data["children"];

    this.uiTree = {};

    if ("subsystemNames" in data) {
      let subsystems = window.log.getStringArray(data["subsystemNames"]["fullKey"], 0, Object.keys(data).length - 2);
      console.log(subsystems);
      for (const subsystemID of subsystems?.values[0] || []) {
        let subsystem = document.createElement("div");
        subsystem.classList.add("rounded-lg", "bg-black", "h-58", "mr-10", "p-4");

        let subsystemTitle = document.createElement("h1");
        subsystemTitle.classList.add("text-white", "mb-4", "text-xl", "font-semibold");
        subsystemTitle.innerText = subsystemID;
        subsystem.appendChild(subsystemTitle);

        let subsystemMotorCards = document.createElement("div");
        subsystemMotorCards.classList.add("flex", "flex-row", "gap-4", "overflow-x-scroll", "flex-wrap");
        subsystem.appendChild(subsystemMotorCards);

        let subsystemMotors = window.log.getStringArray(
          data[subsystemID]["children"]["motorNames"]["fullKey"],
          0,
          Object.keys(data[subsystemID]["children"]["motorNames"]).length - 2
        );

        for (const motor of subsystemMotors?.values[0] || []) {
          console.log(motor);
          let motorTree = data[subsystemID]["children"][motor]["children"];
          let motorCard = document.createElement("div");
          motorCard.classList.add("text-white", "w-72", "h-40", "rounded-lg", "border-2", "p-4");

          let motorStage = (window.log.getString(motorTree["CurrentLimitStage"]["fullKey"], 0, 255)?.values[0] ||
            "") as string;

          let motorErrors = window.log.getStringArray(motorTree["Errors"]["fullKey"], 0, 255)?.values[0] || [];

          this.uiTree[motorTree["Errors"]["fullKey"]] = function (motorErrors: string[]) {
            if (motorErrors.length != 0) {
              motorCard.classList.remove("border-[#30363D]", "bg-[#0f1317]");
              motorCard.classList.add("border-[#c21919]", "bg-[#170f0f]");
            } else {
              motorCard.classList.remove("border-[#c21919]", "bg-[#170f0f]");
              motorCard.classList.add("border-[#30363D]", "bg-[#0f1317]");
            }
          };

          this.uiTree[motorTree["CurrentLimitStage"]["fullKey"]] = function (motorStage: string) {
            if (motorStage != "BASE") {
              motorCard.classList.remove("border-[#30363D]", "bg-[#0f1317]");
              motorCard.classList.add("border-[#c21919]", "bg-[#170f0f]");
            } else {
              motorCard.classList.remove("border-[#c21919]", "bg-[#170f0f]");
              motorCard.classList.add("border-[#30363D]", "bg-[#0f1317]");
            }
          };

          this.uiTree[motorTree["Errors"]["fullKey"]](motorErrors);
          this.uiTree[motorTree["CurrentLimitStage"]["fullKey"]](motorStage);

          subsystemMotorCards.appendChild(motorCard);

          let motorCardTitle = document.createElement("h1");
          motorCardTitle.classList.add("text-lg", "font-semibold", "mb-2");
          motorCardTitle.innerText = motor;
          motorCard.appendChild(motorCardTitle);

          let motorIDBox = document.createElement("span");
          motorIDBox.classList.add("ml-2", "rounded-md", "border-[#ffffff]", "border-2", "px-1");
          console.log(window.log.getNumber(motorTree["MotorID"]["fullKey"], 0, 2));
          motorIDBox.innerText = (window.log.getNumber(motorTree["MotorID"]["fullKey"], 0, 2)?.values[0] ||
            "4") as string;
          motorCardTitle.appendChild(motorIDBox);

          let motorCardTemp = document.createElement("h1");
          let motorTemp = window.log
            .getNumber(motorTree["TemperatureCelsius"]["fullKey"], 0, 255)
            ?.values[0].toFixed(2) as string;
          motorCardTemp.classList.add("text-md", "font-semibold", "mb-1");
          this.uiTree[motorTree["TemperatureCelsius"]["fullKey"]] = function (temperature: string) {
            motorCardTemp.innerText = "Temperature: " + temperature;
          };

          this.uiTree[motorTree["TemperatureCelsius"]["fullKey"]](motorTemp as string);

          motorCard.appendChild(motorCardTemp);

          let motorCardStator = document.createElement("h1");
          motorCardStator.classList.add("text-md", "font-semibold");
          this.uiTree[motorTree["StatorCurrentAmps"]["fullKey"]] = function (amps: string) {
            motorCardStator.innerText = "Stator: " + amps;
          };
          motorCard.appendChild(motorCardStator);

          this.uiTree[motorTree["StatorCurrentAmps"]["fullKey"]](
            window.log.getNumber(motorTree["StatorCurrentAmps"]["fullKey"], 0, 255)?.values[0].toFixed(2) as string
          );
        }

        this.MOTOR_CONTAINER.appendChild(subsystem);
        console.log(subsystem);
      }
    }

    let showMotorChecker = Object.keys(data).length > 0; // Change to children in container prolly

    this.MOTOR_CONTAINER.hidden = !showMotorChecker;
    this.NO_DATA_ALERT.hidden = showMotorChecker;
  }
}
