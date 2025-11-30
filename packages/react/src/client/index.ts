'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { setEffectHook, setMemoHook, setRefHook, setStateHook } from '../hooks.js';

setRefHook(useRef);
setMemoHook(useMemo);
setStateHook(useState);
setEffectHook(useEffect);
