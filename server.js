import 'dotenv/config';
import { createApp } from './app.js';

const port = Number(process.env.PORT ?? 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be between 1 and 65535.');
const host = process.env.HOST ?? '127.0.0.1';
const app = createApp();
/** Announce the actual local documentation address after listening. */
function started() { console.log(`Degrid listening on http://${host}:${port}; docs: /api-docs`); }
const server = app.listen(port, host, started);
/** Apply automatic transitions even if no clients are polling. */
function tick() { app.locals.service.tick(); }
const timer = setInterval(tick, 1000);
timer.unref();
/** Release the application's periodic timer. */
app.locals.stop = function stop() { clearInterval(timer); };
/** Report startup/listener failures without leaving a hidden process running. */
function failed(error) { console.error(error.message); process.exitCode = 1; }
server.on('error', failed);
/** Stop accepting requests and release timer resources. */
function shutdown() { server.close(); app.locals.stop?.(); }
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
