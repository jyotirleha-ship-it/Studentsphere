const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/error');

const app = express();
const origins = (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map((s) => s.trim());

app.use(helmet());
app.use(cors({ origin: origins, credentials: false }));
app.use(express.json({ limit: '1mb' }));
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

app.use('/api', routes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
