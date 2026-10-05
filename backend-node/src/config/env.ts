import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const env = {
  PORT: process.env.PORT || '8080',
  DB_PATH: process.env.DB_PATH || 'uconnect.db',
  JWT_SECRET: process.env.JWT_SECRET || 'fc493c634beced56219fc01e5a0d153336ffb24f1951eca5ab9955604f76509d',
  JWT_EXPIRATION_HOURS: parseInt(process.env.JWT_EXPIRATION_HOURS || '24', 10),
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
    : ['http://localhost:3000', 'http://localhost:8080', 'http://127.0.0.1:8080'],
  NODE_ENV: process.env.NODE_ENV || 'development',
  BCRYPT_COST: parseInt(process.env.BCRYPT_COST || '10', 10),
};
