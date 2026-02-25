import app from './app.js';
import { testConnection } from './shared/infrastructure/db.js';
const PORT = process.env.PORT || 3000;
async function bootstrap() {
    console.log('Starting Server Initialization...');
    // Ensure DB Connection is alive before accepting requests
    const isDbConnected = await testConnection();
    if (!isDbConnected) {
        console.error('Failed to connect to the database. Process gracefully exiting.');
        process.exit(1);
    }
    const server = app.listen(PORT, () => {
        console.log(`🚀 Server is running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode.`);
    });
    // Graceful Shutdown
    const gracefulShutdown = () => {
        console.log('Received kill signal, shutting down gracefully.');
        server.close(() => {
            console.log('Closed out remaining connections.');
            process.exit(0);
        });
        setTimeout(() => {
            console.error('Could not close connections in time, forcefully shutting down');
            process.exit(1);
        }, 10000);
    };
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
}
bootstrap().catch((err) => {
    console.error('Unhandled Rejection during bootstrap:', err);
    process.exit(1);
});
