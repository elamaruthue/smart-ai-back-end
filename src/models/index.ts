import mongoose, { Schema, Document, Types } from 'mongoose';

// ─── User ─────────────────────────────────────────────────────────────────────
export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  selected_path?: string;
  selected_skill?: string;
  current_day: number;
  dark_mode: boolean;
  notifications: boolean;
  role: 'user' | 'admin' | 'superuser';
}

const UserSchema = new Schema<IUser>(
  {
    username:       { type: String, required: true },
    email:          { type: String, required: true, unique: true, lowercase: true, trim: true },
    password:       { type: String, required: true },
    selected_path:  { type: String, default: null },
    selected_skill: { type: String, default: null },
    current_day:    { type: Number, default: 1 },
    dark_mode:      { type: Boolean, default: false },
    notifications:  { type: Boolean, default: true },
    role:           { type: String, enum: ['user', 'admin', 'superuser'], default: 'user' },
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>('User', UserSchema);

// ─── DayProgress ──────────────────────────────────────────────────────────────
export interface IDayProgress extends Document {
  user_id: Types.ObjectId;
  skill: string;
  day: number;
  completed_at: Date;
}

const DayProgressSchema = new Schema<IDayProgress>({
  user_id:      { type: Schema.Types.ObjectId, ref: 'User', required: true },
  skill:        { type: String, required: true },
  day:          { type: Number, required: true },
  completed_at: { type: Date, default: Date.now },
});

DayProgressSchema.index({ user_id: 1, skill: 1, day: 1 }, { unique: true });

export const DayProgress = mongoose.model<IDayProgress>('DayProgress', DayProgressSchema);

// ─── QuizResult ───────────────────────────────────────────────────────────────
export interface IQuizResult extends Document {
  user_id: Types.ObjectId;
  skill: string;
  day: number;
  score: number;
  total: number;
  passed: boolean;
  taken_at: Date;
}

const QuizResultSchema = new Schema<IQuizResult>({
  user_id:  { type: Schema.Types.ObjectId, ref: 'User', required: true },
  skill:    { type: String, required: true },
  day:      { type: Number, required: true },
  score:    { type: Number, required: true },
  total:    { type: Number, required: true },
  passed:   { type: Boolean, required: true },
  taken_at: { type: Date, default: Date.now },
});

export const QuizResult = mongoose.model<IQuizResult>('QuizResult', QuizResultSchema);

// ─── MockTestResult ───────────────────────────────────────────────────────────
export interface IMockTestResult extends Document {
  user_id: Types.ObjectId;
  score: number;
  total: number;
  accuracy: number;
  time_taken: number;
  weak_areas: string[];
  taken_at: Date;
}

const MockTestResultSchema = new Schema<IMockTestResult>({
  user_id:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
  score:      { type: Number, required: true },
  total:      { type: Number, required: true },
  accuracy:   { type: Number, required: true },
  time_taken: { type: Number, required: true },
  weak_areas: [{ type: String }],
  taken_at:   { type: Date, default: Date.now },
});

export const MockTestResult = mongoose.model<IMockTestResult>('MockTestResult', MockTestResultSchema);

// ─── CourseContent ────────────────────────────────────────────────────────────
export interface ICourseContent extends Document {
  section: string;
  data: unknown;
  updated_by?: Types.ObjectId;
  updated_at: Date;
}

const CourseContentSchema = new Schema<ICourseContent>({
  section:    { type: String, required: true, unique: true },
  data:       { type: Schema.Types.Mixed, required: true },
  updated_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  updated_at: { type: Date, default: Date.now },
});

export const CourseContent = mongoose.model<ICourseContent>('CourseContent', CourseContentSchema);

// ─── Question ─────────────────────────────────────────────────────────────────
export interface IQuestion extends Document {
  skill: string;
  day: number;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  answer: 'A' | 'B' | 'C' | 'D';
  explanation?: string;
  created_by: Types.ObjectId;
}

const QuestionSchema = new Schema<IQuestion>(
  {
    skill:       { type: String, required: true },
    day:         { type: Number, required: true },
    question:    { type: String, required: true },
    option_a:    { type: String, required: true },
    option_b:    { type: String, required: true },
    option_c:    { type: String, required: true },
    option_d:    { type: String, required: true },
    answer:      { type: String, enum: ['A', 'B', 'C', 'D'], required: true },
    explanation: { type: String, default: null },
    created_by:  { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export const Question = mongoose.model<IQuestion>('Question', QuestionSchema);
