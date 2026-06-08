import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import mongoose from 'mongoose';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/test';

export async function connectDB(): Promise<void> {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB1');
}

export default mongoose;
