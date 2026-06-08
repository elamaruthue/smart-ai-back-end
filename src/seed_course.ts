/**
 * Generates backend/data/courseDataSeed.json and upserts course_content into MongoDB.
 * Run once: npx tsx src/seed_course.ts
 */
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { writeFileSync, mkdirSync } from 'fs';
import mongoose from 'mongoose';
import { CourseContent } from './models/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env') });

// @ts-nocheck
// eslint-disable-next-line
import {
  paths,
  skills,
  quizBank,
  interviewQuestions,
  mockTestQuestions,
} from '../../src/data/courseData.js';

const seed = { paths, skills, quizBank, interviewQuestions, mockTestQuestions };

// Write JSON file
const outDir  = resolve(__dirname, '../data');
const outFile = resolve(outDir, 'courseDataSeed.json');
mkdirSync(outDir, { recursive: true });
writeFileSync(outFile, JSON.stringify(seed, null, 2), 'utf8');
console.log('\u2713 Written', outFile);

// Connect and upsert into MongoDB
const MONGODB_URI = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/smartprep_db';
await mongoose.connect(MONGODB_URI);
console.log('Connected to MongoDB');

for (const [section, data] of Object.entries(seed)) {
  await CourseContent.findOneAndUpdate(
    { section },
    { section, data },
    { upsert: true, new: true }
  );
  console.log('\u2713 Seeded section:', section);
}

await mongoose.disconnect();
console.log('\nSeed complete. Course data is ready in MongoDB.');
