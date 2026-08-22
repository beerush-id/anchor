# create-airlib

The official scaffolding tool for [AirLib](https://airlib.dev), allowing you to bootstrap your next project with a single command. 

AirLib provides a modern, state-driven architecture out of the box with built-in Isomorphic RPC (IRPC) and Real-time WebSocket capabilities, designed for both React and SolidJS.

## Usage

You don't need to install this package globally. You can use it directly via `npx` or `bunx`:

```bash
npx create-airlib@latest
# or
bun create airlib
```

## Options & Prompts

When you run the command, you will be prompted with a beautiful interactive terminal UI that lets you customize your stack:

1. **Project Name**: The directory where your app will be created (defaults to `./air-app`).
2. **Framework**: Choose your preferred rendering engine:
   - React
   - SolidJS
3. **Architecture Variant**: Choose your backend needs:
   - **AirLib Full Stack**: Includes IRPC, Real-time WebSockets, and the Router.
   - **Standard SSR**: Just the Server-Side Rendering Router without IRPC.

Alternatively, you can choose to scaffold a **Backend API** which will provide you with a standalone IRPC Bun Server.

## Templates Included

This CLI intelligently packs and unpacks the following official starter templates:
- `air-react`: React + AirLib (Full Stack)
- `air-solid`: SolidJS + AirLib (Full Stack)
- `react-ssr`: React + Router (SSR only)
- `solid-ssr`: SolidJS + Router (SSR only)
- `irpc-bun-starter`: Backend IRPC API

## License

MIT © [AirLib](https://airlib.dev)
