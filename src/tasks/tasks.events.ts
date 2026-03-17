/* eslint-disable prettier/prettier */
export class TaskCreatedEvent {
  constructor(public readonly task: any, public readonly actorId: string) {}
}
export class TaskMovedEvent {
  constructor(public readonly task: any, public readonly fromBoardId: string, public readonly actorId: string) {}
}
export class TaskAssignedEvent {
  constructor(public readonly task: any, public readonly actorId: string) {}
}
export class TaskCommentedEvent {
  constructor(public readonly task: any, public readonly comment: any, public readonly actorId: string) {}
}