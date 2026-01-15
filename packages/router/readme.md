# TypeScript Package Template (tsdown)

A simple, zero-config TypeScript package template using tsdown for bundling. Perfect for creating libraries and packages with modern tooling.

## Features

- **TypeScript** - Write your code in TypeScript for type safety and better developer experience
- **tsdown** - Zero-config bundler powered by esbuild for blazing fast builds
- **ESLint** - Integrated code linting with modern ESLint configuration
- **Prettier** - Code formatting that maintains consistent style
- **Publint** - Package validation before publishing to npm
- **Dual Package Support** - Outputs both ESM and CommonJS formats

## Getting Started

1. Clone this template
2. Install dependencies with your preferred package manager
3. Start developing with `npm run dev`

## Scripts

- `npm run dev` - Start development mode with watch
- `npm run build` - Build the package for production
- `npm run clean` - Remove the dist directory
- `npm run prepublish` - Prepare the package for publishing

## Output

The build process generates:
- CommonJS output (`*.cjs`)
- ES Modules output (`*.js`)
- TypeScript declarations (`*.d.ts`)

## License

MIT