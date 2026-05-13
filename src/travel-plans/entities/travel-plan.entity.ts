import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity()
export class TravelPlan {
  @PrimaryGeneratedColumn()
  id: number; 

  @Column()
  countryCode: string; 

  @Column()
  title: string; 

  @Column()
  startDate: Date; 

  @Column()
  endDate: Date; 

  @Column({ nullable: true })
  notes: string; 

  @CreateDateColumn()
  createdAt: Date; 
}