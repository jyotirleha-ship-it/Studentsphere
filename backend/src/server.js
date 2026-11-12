require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5000;

(async () => {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not set. Copy .env.example to .env first.');
  await connectDB();
  app.listen(PORT, () => console.log(`StudentSphere API running on http://localhost:${PORT}/api`));
})().catch((err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
