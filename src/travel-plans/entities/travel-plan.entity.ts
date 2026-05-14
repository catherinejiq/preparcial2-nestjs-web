import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('travel_plan')
export class TravelPlan {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 3 })
  countryCode: string;

  @Column({ length: 200 })
  title: string;

  @Column({ type: 'date' })
  startDate: string;

  @Column({ type: 'date' })
  endDate: string;

  @Column({ length: 1000, nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;
}