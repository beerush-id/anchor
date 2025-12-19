/**
 * Interface for initializing a SwitchGroup instance.
 */
export interface SwitchGroupInit {
  /**
   * Whether the switch group is disabled.
   * @default false
   */
  disabled?: boolean;

  /**
   * Whether multiple switches can be selected at once.
   * @default false
   */
  multiple?: boolean;
}

/**
 * A group of switches that can be managed collectively.
 *
 * This class allows managing a collection of related switches,
 * handling selection logic and state synchronization between them.
 */
export class SwitchGroup {
  /**
   * Whether the entire group is disabled.
   */
  public disabled = false;

  /**
   * Whether multiple switches in the group can be checked simultaneously.
   */
  public multiple = false;

  /**
   * The list of switches belonging to this group.
   */
  public switches: Switch[] = [];

  /**
   * The current value of the group.
   */
  public value = '';
  public values: Switch['name'][] = [];
  public checked = false;
  public indeterminate = false;

  /**
   * Returns the appropriate ARIA checked state for the group.
   * - 'true' if all switches are checked
   * - 'mixed' if some but not all switches are checked
   * - 'false' if no switches are checked
   */
  public get ariaChecked() {
    return this.checked ? 'true' : this.indeterminate ? 'mixed' : 'false';
  }

  /**
   * Creates a new SwitchGroup instance.
   * @param options - Initialization options for the switch group
   */
  constructor(options?: SwitchGroupInit) {
    Object.assign(this, { ...options });
  }

  /**
   * Adds a switch to the group.
   * If a switch with the same name already exists, it will be removed first.
   * @param item - The switch to add to the group
   * @returns The current SwitchGroup instance for method chaining
   */
  public insert(item: Switch) {
    if (this.switches.includes(item)) return this;

    const conflict = this.switches.find((s) => s.name === item.name);
    if (conflict) {
      this.switches.splice(this.switches.indexOf(conflict), 1);
    }

    item.group = this;
    this.switches.push(item);

    return this;
  }

  /**
   * Removes a switch from the group by name.
   * @param name - The name of the switch to remove
   * @returns The current SwitchGroup instance for method chaining
   */
  public remove(name: Switch['name']) {
    const index = this.switches.findIndex((s) => s.name === name);
    const item = this.switches[index];

    if (item) {
      delete item.group;
      this.switches.splice(index, 1);
    }

    return this;
  }
}

/**
 * Interface for initializing a Switch instance.
 */
export interface SwitchInit {
  /**
   * The name of the switch.
   */
  name?: string;

  /**
   * Whether the switch is initially checked.
   * @default false
   */
  checked?: boolean;

  /**
   * Whether the switch is disabled.
   * @default false
   */
  disabled?: boolean;

  /**
   * Whether the switch is in an indeterminate state.
   * @default false
   */
  indeterminate?: boolean;
}

/**
 * Represents a single switch that can be part of a SwitchGroup.
 *
 * A switch has two states: checked and unchecked. It can also be
 * in an indeterminate state for display purposes. When part of a group,
 * the switch's behavior may be affected by the group's settings.
 */
export class Switch {
  /**
   * The name of the switch.
   */
  public name: string = '';

  /**
   * Reference to the group this switch belongs to, if any.
   */
  public group?: SwitchGroup;

  /**
   * Whether the switch is visible.
   */
  public visible = true;

  /**
   * Whether the switch is disabled.
   */
  public disabled = false;

  /**
   * Internal checked state of the switch.
   */
  public checkedState = false;

  /*
   * Whether the switch is checked.
   */
  public checked = false;

  /**
   * Whether the switch is in an indeterminate state (visually appears as mixed).
   */
  public indeterminate = false;

  /**
   * Returns the appropriate ARIA checked state for the switch.
   * - 'true' if the switch is checked
   * - 'mixed' if the switch is indeterminate
   * - 'false' if the switch is unchecked
   */
  public get ariaChecked() {
    return this.checked ? 'true' : this.indeterminate ? 'mixed' : 'false';
  }

  /**
   * Creates a new Switch instance.
   * @param options - Initialization options for the switch
   */
  constructor(options?: SwitchInit) {
    Object.assign(this, { ...options });
  }

  /**
   * Toggles the checked state of the switch.
   * @param checked - Optional explicit checked state to set. If not provided, toggles the current state.
   */
  public toggle(checked?: boolean) {
    this.checked = checked ?? !this.checked;

    if (!this.group) return;

    if (this.group.multiple) {
      this.group.values = this.group.switches.filter((s) => s.checked).map((s) => s.name);
      this.group.checked = this.group.switches.every((s) => s.checked);
      this.group.indeterminate = this.group.switches.some((s) => s.indeterminate) && !this.group.checked;
    } else {
      if (this.checked) {
        this.group.value = this.name;
        this.group.switches.forEach((s) => {
          if (s.name !== this.name) s.checked = false;
        });
      } else {
        this.group.value = '';
      }
    }
  }
}
