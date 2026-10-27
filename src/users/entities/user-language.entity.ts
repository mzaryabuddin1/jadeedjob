import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

/** How well the person speaks it, lowest to highest */
export const LANGUAGE_LEVELS = [
  'basic',
  'conversational',
  'fluent',
  'native',
] as const;
export type LanguageLevel = (typeof LANGUAGE_LEVELS)[number];

/**
 * A language the person speaks, shown on their profile ("Urdu - Native").
 * Not the app/UI language (`users.language`): this is a free list on the
 * profile, one row per language per person.
 */
@Entity('user_languages')
@Unique('UQ_user_language', ['userId', 'languageKey'])
@Index('IDX_user_language_user', ['userId'])
export class UserLanguage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  /** as the person typed it, e.g. "Urdu" */
  @Column({ type: 'varchar', length: 60 })
  language_name: string;

  /** lower-cased `language_name`: makes "urdu" and "Urdu" the same language */
  @Column({ type: 'varchar', length: 60 })
  languageKey: string;

  @Column({ type: 'varchar', length: 16 })
  proficiency: LanguageLevel;

  @CreateDateColumn()
  createdAt: Date;
}
