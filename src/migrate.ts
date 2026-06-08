// Ensures MongoDB indexes for all collections.
// Run once: npx tsx src/migrate.ts
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import mongoose from 'mongoose';
import { User, DayProgress, QuizResult, MockTestResult, CourseContent, Question } from './models/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/smartprep_db';

await mongoose.connect(MONGODB_URI);
console.log('Connected to MongoDB');

await Promise.all([
  User.createIndexes(),
  DayProgress.createIndexes(),
  QuizResult.createIndexes(),
  MockTestResult.createIndexes(),
  CourseContent.createIndexes(),
  Question.createIndexes(),
]);

console.log('\u2713 Indexes ensured for all collections');
await mongoose.disconnect();
console.log('\nDone. Collections are ready.');
