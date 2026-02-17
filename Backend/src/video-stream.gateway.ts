import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class VideoStreamGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private producers = new Set<string>();

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
    client.emit('stream-status', { active: this.producers.size > 0 });
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    if (this.producers.has(client.id)) {
      this.producers.delete(client.id);
      if (this.producers.size === 0) {
        this.server.emit('stream-status', { active: false });
      }
    }
  }

  @SubscribeMessage('video-frame')
  handleVideoFrame(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: any,
  ) {
    console.log('VideoStreamGateway handler invoked - DEBUG');
    if (!client || !client.id) {
      console.error('handleVideoFrame: client missing or invalid', client);
      return;
    }
    if (!this.producers.has(client.id)) {
      this.producers.add(client.id);
      this.server.emit('stream-status', { active: true });
    }
    if (
      !data ||
      typeof data !== 'object' ||
      !('id' in data) ||
      !('frame' in data)
    ) {
      console.error('Received invalid payload:', data);
      return;
    }
    const { id, frame } = data;
    // Broadcast the video frame to all other connected clients
    this.server.emit('stream', data);
  }
}
