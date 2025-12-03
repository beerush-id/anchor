'use client';

import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { setEffectHook, setMemoHOC, setMemoHook, setRefHook, setStateHook } from '../hooks.js';

setRefHook(useRef);
setMemoHook(useMemo);
setStateHook(useState);
setEffectHook(useEffect);
setMemoHOC(memo);
