import { LogLevel, setLogLevel } from '../src/logger.js';
// Registers the chokidar stub for every test file before any module imports
// chokidar — watcher events are driven deterministically via chokidarState.
import './chokidar.js';

setLogLevel(LogLevel.OFF);
