import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import walletRoutes from './routes/wallet.routes.js'


const app = new Hono()

app.get('/', (c) => {
  return c.text('Hello Hono!')
})



app.route("/upiVerification",walletRoutes);

serve({
  fetch: app.fetch,
  port: 3003,
  hostname:'0.0.0.0'
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})


