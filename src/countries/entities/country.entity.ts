import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('country')
@Index('IDX_country_code', ['code'])
@Index('IDX_country_code_updated', ['code', 'updatedAt'])
export class Country {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 3 })
  code: string; 

  @Column({ length: 100 })
  name: string;

  @Column({ length: 50 })
  region: string;

  @Column({ length: 50 })
  subregion: string;

  @Column({ length: 100 })
  capital: string;

  @Column({ type: 'int', unsigned: true })
  population: number;

  @Column({ type: 'text' })
  flagUrl: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}