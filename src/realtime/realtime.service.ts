import { Server } from 'socket.io'
import { Injectable } from '@nestjs/common'

@Injectable()
export class RealtimeService {
    private server: Server

    setServer(server: Server) {
        this.server = server
    }

    getServer(): Server {
        return this.server
    }
}
