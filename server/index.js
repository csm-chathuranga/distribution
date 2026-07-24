require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { sequelize } = require('./models');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const socket = require('./socket');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
const ALLOWED_ORIGINS = [
  process.env.CLIENT_URL || 'http://localhost:5173',
  'capacitor://localhost',  // Capacitor Android/iOS webview
  'https://localhost',      // Capacitor Android (some versions)
  'http://localhost',
];
app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (curl, mobile apps hitting directly)
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(null, true); // open for now — tighten by removing this line in prod
  },
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', routes);

app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

app.use(errorHandler);

async function start() {
  try {
    await sequelize.authenticate();
    console.log('Database connected.');
    await sequelize.sync({ alter: false });
    const server = http.createServer(app);
    socket.init(server);
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (err) {
    console.error('Startup failed:', err);
    process.exit(1);
  }
}

start();
