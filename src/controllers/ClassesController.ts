import { Request, Response } from 'express'

import {  } from 'knex'

import db from '../database/connection'
import convertHourToMinutes from '../utils/convertHourToMinutes'

interface ScheduleItem {
    week_day: number
    from: string,
    to: string
}


    export default class ClassesController{
        async create(request: Request, response: Response): Promise<Response>{
            const {
                name,
                avatar,
                whatsapp,
                bio,
                subject,
                cost, 
                schedule
            } = request.body
        
            const trx= await db.transaction()
        
            try{
                const users = await trx('users').insert({
                    name,
                    avatar,
                    whatsapp
                })
            
                const user_id = users[0]
            
                const classes = await trx('classes').insert({
                    subject,
                    cost,
                    user_id
                })
            
                const class_id = classes[0]
            
                const classSchedule = schedule.map((scheduleItem: ScheduleItem) => {
                    return {
                        class_id,
                        week_day: scheduleItem.week_day,
                        from: convertHourToMinutes(scheduleItem.from),
                        to: convertHourToMinutes(scheduleItem.to)
                    }
                })
            
                await trx('class_schedule').insert(classSchedule)
            
                await trx.commit()
        
                return response.status(201).send()
            }catch(err){
                await trx.rollback()
        
                return response.status(400).json({
                    message: 'Unexpected error while creating new class'
                })
            }
        
            return response.send()
        }
        

        async index(request: Request, response: Response): Promise<Response>{
            const filters = request.query

            const page = Number(filters.page)
            const subject = filters.subject as string
            const week_day = filters.week_day as string
            const time = filters.time as string

            const timeInMinutes = !!time 
                ? convertHourToMinutes(time)
                : null

            const classes = await db('classes')
                .whereExists(function() {
                    this.select('class_schedule.*')
                        .from('class_schedule')
                        .whereRaw('`class_schedule`.`class_id` = `classes`.`id`')
                        .modify(function(queryBuilder) {
                            if (week_day) {
                                queryBuilder.whereRaw('`class_schedule`.`week_day` = ??', [Number(week_day)])
                            }
                            if (timeInMinutes) {
                                queryBuilder.whereRaw('`class_schedule`.`from` <= ??', [timeInMinutes])
                                queryBuilder.whereRaw('`class_schedule`.`to` > ??', [timeInMinutes])
                            }
                        }) 
                })
                .modify(function(queryBuilder) {
                    if(subject){
                        queryBuilder.where('classes.subject', '=', subject)
                    }
                })
                .join('users', 'classes.user_id', '=', 'users.id')
                .select(['classes.*', 'users.*'])
                .limit(5)
                .offset((page-1) * 5)
                

            /* const classes = await db('classes')
                .select('*')
                .join('users', 'classes.user_id', '=', 'users.id') */
            
            const organizedClasses = []

            for(let i=0; i<classes.length; i++){
                const schedule = await db('class_schedule') 
                    .select('*')
                    .where('class_id', '=', classes[i].id)
                    

                console.log(schedule)

                organizedClasses.push({
                    ...classes[i],
                    schedule
                })
            }

            console.log(organizedClasses)

            return response.json(organizedClasses)
        }
    }

    