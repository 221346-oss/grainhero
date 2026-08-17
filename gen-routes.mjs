import { Generator, getConfig } from '@tanstack/router-generator'
const config = await getConfig({ routesDirectory: 'src/routes', generatedRouteTree: 'src/routeTree.gen.ts' }, '/dev-server')
const g = new Generator({ config, root: '/dev-server' })
await g.run()
console.log('done')
