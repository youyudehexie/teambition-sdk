'use strict'
/**
 * 这里的代码用来处理坏掉的后端 API
 * 做一些很脏的事情
 */
import { Observable } from 'rxjs/Observable'
import { Database } from 'reactivedb'
import { TaskData } from '../schemas/Task'
import { LikeData } from '../schemas/Like'
import { forEach } from './index'

export class Dirty {

  constructor(private database: Database) { }

  /**
   * 处理任务列表中坏掉的 subtaskCount 字段
   */
  handlerMytasksApi (tasks: TaskData[]): TaskData[] {
    forEach(tasks, task => {
      delete task.subtaskCount
    })
    return tasks
  }

  handlerSocketMessage(id: string, type: string, data: any): Observable<any> | null {
    const methods = [ '_handlerLikeMessage', '_handlerTaskUpdateFromSocket' ]
    let signal: Observable<any> | null
    forEach(methods, method => {
      const result = this[method](id, type, data)
      if (result) {
        signal = result
        return false
      }
      return null
    })
    return signal
  }

  /**
   * 处理 socket 推送点赞数据变动的场景下
   * 后端认为这种数据应该被 patch 到它的实体上
   * 而前端需要将点赞数据分开存储
   */
  _handlerLikeMessage(id: string, type: string, data: LikeData | any) {
    if (data.likesGroup && data.likesGroup instanceof Array) {
      data._boundToObjectId = id
      data._boundToObjectType = type
      data._id = `${id}:like`
      return this.database.update('Like', {
        where: { _id: data._id }
      }, data)
    }
    return null
  }

  _handlerTaskUpdateFromSocket(_id: string, _type: string, data: any): void {
    if (data &&
        !data._executorId &&
        typeof data.executor !== 'undefined') {
      delete data.executor
    }
  }
}
