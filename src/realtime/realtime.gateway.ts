import {
  SubscribeMessage, ConnectedSocket,
  WebSocketGateway, WebSocketServer,
  OnGatewayConnection, OnGatewayInit,
} from '@nestjs/websockets'
import { JwtService } from '@nestjs/jwt'
import { Server, Socket } from 'socket.io'
import { StatusCodes } from 'enums/statusCodes'
import { RealtimeService } from './realtime.service'
import { PrismaService } from 'prisma/prisma.service'

@WebSocketGateway({
  transports: ['polling', 'websocket'],
  cors: {
    origin: [
      `http://localhost:3000`,
      `http://localhost:3001`,
      'https://quidate.finance',
      'https://quidate-server-v2.up.railway.app'
    ],
  }
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayInit {
  @WebSocketServer() server: Server

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly realtimeService: RealtimeService,
  ) { }

  private clients: Map<Socket, { sub: string, role: Roles }> = new Map()

  afterInit() {
    this.realtimeService.setServer(this.server)
  }

  async handleConnection(client: Socket) {
    const token = client.handshake.headers['authorization']?.split('Bearer ')[1]
    if (!token) {
      client.emit('authorization_error', {
        status: StatusCodes.Unauthorized,
        message: 'Token does not exist'
      })
      return
    }

    try {
      const { sub, role } = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET,
      })

      this.clients.set(client, { sub, role })
    } catch (err) {
      client.emit('error', {
        status: StatusCodes.InternalServerError,
        message: err.message
      })
      client.disconnect()
    }
  }

  handleDisconnect(client: Socket) {
    this.clients.delete(client)
  }

  @SubscribeMessage('wallet')
  async sendMessage(@ConnectedSocket() client: Socket) {
    try {
      const clientData = this.clients.get(client)
      if (!clientData) return

      const { sub: userId, role } = clientData

      if (role !== "user") {
        client.emit('authorization_error', {
          status: StatusCodes.Forbidden,
          message: 'Forbidden',
        })
        return
      }

      const wallet = await this.prisma.wallet.findUnique({
        where: { userId }
      })

      if (!wallet) {
        client.emit('error', {
          status: StatusCodes.NotFound,
          message: 'Wallet not found',
        })
        return
      }

      client.emit('balance', wallet)
    } catch (err) {
      console.error(err)
      client.emit('error', {
        status: StatusCodes.InternalServerError,
        message: "Something went wrong"
      })
    }
  }

  @SubscribeMessage('new_notification')
  async newNotificaion(@ConnectedSocket() client: Socket) {
    const clientData = this.clients.get(client)
    if (!clientData) return

    const { sub: userId, role } = clientData

    if (role !== "user") {
      client.emit('authorization_error', {
        status: StatusCodes.Forbidden,
        message: 'Forbidden',
      })
      return
    }

    const allUnreadNotifications = await this.prisma.notification.count({
      where: {
        userId,
        read: false,
      }
    })

    client.emit('unread_notification_count', {
      data: {
        count: allUnreadNotifications,
        hasUnreadNotification: allUnreadNotifications > 0
      }
    })
  }
}
