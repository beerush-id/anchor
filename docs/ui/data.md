---
title: 'Data Components'
description: 'Build data components in the AIR Stack that fetch, stream, and react autonomously without side-effect fetch cycles or manual loading states.'
---

# Data Components

A data component **owns its data**. It calls a remote function directly, binds to the returned reactive state, and updates as data arrives — including live streams. The component declares what it needs, and the reactive network layer delivers it.

No side-effect fetch cycles, no cache key management, no manual loading states. The component is the data boundary.
