import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { LIVE_DND } from '../../src/browser/drag.js';
import { acceptInteractions } from '../../src/browser/index.js';

class MockDataTransfer {
  data: Record<string, string> = {};
  items: Set<any> = new Set();
  files: any[] = [];
  types: string[] = [];

  setData(format: string, data: string) {
    this.data[format] = data;
  }
  getData(format: string) {
    return this.data[format] || '';
  }
  clearData() {
    this.data = {};
  }
  setDragImage() {}
}

function createDragEvent(type: string, props: any = {}) {
  const event = new Event(type, { bubbles: true, cancelable: true }) as any;
  Object.assign(event, {
    clientX: 0,
    clientY: 0,
    dataTransfer: new MockDataTransfer(),
  });
  if (props.target) {
    Object.defineProperty(event, 'target', { value: props.target });
  }
  for (const key in props) {
    if (key !== 'target') {
      (event as any)[key] = props[key];
    }
  }
  return event;
}

describe('browser/drag', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeAll(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    errorSpy?.mockRestore();
  });
  beforeAll(async () => {
    LIVE_DND.isDragging; // trigger watchDnd
    await acceptInteractions(false);
  });

  afterEach(() => {
    document.dispatchEvent(createDragEvent('dragend'));
  });

  it('should initialize empty state', async () => {
    expect(LIVE_DND.isDragging).toBe(false);
    expect(LIVE_DND.data.type).toBe('');
  });

  it('should register and unregister draggable elements without state', async () => {
    const div = document.createElement('div');
    const off = LIVE_DND.draggable(div); // No state
    expect(div.getAttribute('draggable')).toBeNull();
    off();
  });

  it('should handle draggable with null element', () => {
    const off = LIVE_DND.draggable(null);
    expect(typeof off).toBe('function');
  });

  it('should subscribe and unsubscribe from drag state changes', () => {
    const handler = vi.fn();
    const off = LIVE_DND.subscribe(handler);
    expect(typeof off).toBe('function');
    off();
  });

  it('should register and unregister draggable elements', async () => {
    const div = document.createElement('div');
    const cleanup = LIVE_DND.draggable(div, { type: 'test' });

    expect(div.getAttribute('draggable')).toBe('true');

    cleanup();
    expect(div.hasAttribute('draggable')).toBe(false);
  });

  it('should track dragging state and internal drag payload', async () => {
    const div = document.createElement('div');
    document.body.appendChild(div);
    LIVE_DND.draggable(div, { type: 'custom-type', text: 'hello' });

    const dragStart = createDragEvent('dragstart', { target: div });
    document.dispatchEvent(dragStart);

    expect(LIVE_DND.isDragging).toBe(true);
    expect(LIVE_DND.isInternal).toBe(true);
    expect(LIVE_DND.payload.type).toBe('custom-type');
    expect(LIVE_DND.payload.text).toBe('hello');

    // The data transfer should have been updated
    const dndData = dragStart.dataTransfer.getData('application/x-anchor-dnd');
    expect(dndData).toBeDefined();

    document.body.removeChild(div);
  });

  it('should track drag over coordinates', async () => {
    const div = document.createElement('div');
    document.body.appendChild(div);
    div.getBoundingClientRect = () => ({ x: 0, y: 0, width: 100, height: 100 }) as DOMRect;
    div.dispatchEvent(createDragEvent('dragstart', { clientX: 10, clientY: 10 }));

    // Simulate drag over
    document.dispatchEvent(createDragEvent('dragover', { clientX: 20, clientY: 30 }));

    expect(LIVE_DND.x).toBe(20);
    expect(LIVE_DND.y).toBe(30);
    expect(LIVE_DND.deltaX).toBe(10);
    expect(LIVE_DND.deltaY).toBe(20);
  });

  it('should parse external drag enter events', async () => {
    const dragEnter = createDragEvent('dragenter');
    dragEnter.dataTransfer.setData('text/plain', 'external text');

    document.dispatchEvent(dragEnter);

    expect(LIVE_DND.isDragging).toBe(true);
    expect(LIVE_DND.payload.type).toBe('text');
    expect(LIVE_DND.payload.text).toBe('external text');
  });

  it('should handle droppable zones and dragover preventDefault', () => {
    const div = document.createElement('div');

    const off = LIVE_DND.droppable(div);
    expect(typeof off).toBe('function');

    const dropEvent = createDragEvent('dragenter', { target: div });
    document.dispatchEvent(dropEvent); // should hit dragEnterHandler

    const overEvent = createDragEvent('dragover', { target: div });
    overEvent.preventDefault = vi.fn();
    document.dispatchEvent(overEvent);
    expect(overEvent.preventDefault).toHaveBeenCalled();

    off();
  });

  it('should handle droppable zones', async () => {
    const zone = document.createElement('div');
    document.body.appendChild(zone);
    LIVE_DND.droppable(zone);

    const dropEvent = createDragEvent('drop', { target: zone });
    dropEvent.dataTransfer.setData('application/json', JSON.stringify({ success: true }));

    zone.dispatchEvent(dropEvent);

    expect(dropEvent.defaultPrevented).toBe(true);
    expect(LIVE_DND.data.type).toBe('json');
    expect(LIVE_DND.data.data).toEqual({ success: true });
    expect(LIVE_DND.zone).toBe(zone);
  });

  describe('Coverage', () => {
    it('should parse drag event with Files', () => {
      const dropEvent = createDragEvent('drop');
      Object.defineProperty(dropEvent.dataTransfer, 'types', { value: ['Files'] });
      Object.defineProperty(dropEvent.dataTransfer, 'items', { value: [{ kind: 'file' }] });

      const file = new File([], 'test.png', { type: 'image/png' });
      Object.defineProperty(dropEvent.dataTransfer, 'files', { value: [file] });

      LIVE_DND.drop(dropEvent);

      expect(LIVE_DND.data.type).toBe('image');
      expect(LIVE_DND.data.count).toBe(1);
    });

    it('should parse internal x-anchor-dnd drag payload', () => {
      const dropEvent = createDragEvent('drop');
      Object.defineProperty(dropEvent.dataTransfer, 'getData', {
        value: (format: string) => {
          if (format === 'application/x-anchor-dnd') return JSON.stringify({ type: 'custom', count: 1, data: 'foo' });
          return '';
        },
      });
      LIVE_DND.drop(dropEvent);
      expect(LIVE_DND.data.type).toBe('custom');
      expect(LIVE_DND.data.data).toBe('foo');
    });

    it('should return false from isDropZone if target is not in DROP_ZONES', () => {
      const externalDiv = document.createElement('div');
      const dropEvent = createDragEvent('dragover');
      Object.defineProperty(dropEvent, 'target', { value: externalDiv });
      document.dispatchEvent(dropEvent);
      // Just verifying it doesn't crash and hits the false branch
    });

    it('should handle dragleave event', () => {
      document.dispatchEvent(new Event('dragleave'));
      expect(LIVE_DND.isDragging).toBe(false);
    });

    it('should gracefully handle drop event without a target', () => {
      const dropEvent = createDragEvent('drop');
      Object.defineProperty(dropEvent, 'target', { value: null });
      LIVE_DND.drop(dropEvent);
      // We just need to ensure it doesn't crash
    });

    it('should fallback empty files safely on drop', () => {
      // manually inject undefined files via payload proxy to trigger ?? []
      (LIVE_DND.payload as any).files = undefined;
      LIVE_DND.drop(createDragEvent('drop'));
      expect(LIVE_DND.data.files).toEqual([]);
    });

    it('should handle subscribe when not in browser', async () => {
      vi.resetModules();
      vi.stubGlobal('window', undefined);
      const { LIVE_DND: NEW_DND } = await import('../../src/browser/drag.js');
      const off = NEW_DND.subscribe(() => {});
      expect(typeof off).toBe('function');
      off();
      vi.unstubAllGlobals();
    });

    it('should safely parse null dataTransfer', () => {
      const drop = createDragEvent('drop');
      Object.defineProperty(drop, 'dataTransfer', { value: null });
      LIVE_DND.drop(drop);
      expect(LIVE_DND.data.type).toBe('');
    });

    it('should ignore JSON parse errors in parseDataTransfer', () => {
      const drop = createDragEvent('drop');
      drop.dataTransfer = {
        getData: (type: string) => {
          if (type === 'application/x-anchor-dnd') return 'invalid-json';
          return '';
        },
        types: [],
        files: [],
        clearData: vi.fn(),
      } as any;

      LIVE_DND.drop(drop);
      expect(LIVE_DND.data.type).toBe('');
    });
  });

  it('should clear state on drag end', async () => {
    const div = document.createElement('div');
    document.body.appendChild(div);
    div.getBoundingClientRect = () => ({ x: 0, y: 0, width: 100, height: 100 }) as DOMRect;

    // Simulate setting a payload with files before dragging
    LIVE_DND.draggable(div, { type: 'test', count: 1, files: [new File([''], 'test.txt')] });

    const dragStartEvent = createDragEvent('dragstart');
    dragStartEvent.dataTransfer = {
      getData: vi.fn(),
      setData: vi.fn(),
      clearData: vi.fn(),
      setDragImage: vi.fn(),
      items: { add: vi.fn() },
      types: [],
      files: [],
    } as any;

    div.dispatchEvent(dragStartEvent);
    expect(LIVE_DND.isDragging).toBe(true);
    expect(dragStartEvent.dataTransfer.items.add).toHaveBeenCalled();

    document.dispatchEvent(createDragEvent('dragend'));
    expect(LIVE_DND.isDragging).toBe(false);
    expect(LIVE_DND.isInternal).toBe(false);
  });

  describe('Coverage', () => {
    it('should remove event listeners on dispose', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.resetModules();
      const { LIVE_DND } = await import('../../src/browser/drag.js');
      const { acceptInteractions } = await import('../../src/browser/interactive.js');

      LIVE_DND.x; // Trigger watcher
      await acceptInteractions(true);
      await acceptInteractions(false); // Trigger disposer

      const prevX = LIVE_DND.x;
      document.dispatchEvent(createDragEvent('dragover', { clientX: 999 }));
      expect(LIVE_DND.x).toBe(prevX);
      consoleError.mockRestore();
    });
  });
});
